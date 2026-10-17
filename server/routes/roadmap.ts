import { Router, Response } from 'express';
import { db } from '../db/store.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { CAREER_ROLES } from '../data/careers.js';
import { calculateSkillGaps } from '../engine/gapEngine.js';
import { generateRoadmap } from '../engine/roadmapEngine.js';
import { readParam, readFiniteNumber, readTrimmedString } from '../utils/request.js';
import { RoadmapTask } from '../../src/types/index.js';

export const roadmapRouter = Router();

type RoadmapTaskStatus = RoadmapTask['status'];
const VALID_TASK_STATUSES: readonly RoadmapTaskStatus[] = ['not_started', 'in_progress', 'completed'];

function isTaskStatus(value: unknown): value is RoadmapTaskStatus {
  return typeof value === 'string' && (VALID_TASK_STATUSES as readonly string[]).includes(value);
}

// Get personalized roadmap for authenticated user
roadmapRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const profile = db.getProfile(req.userId!);
    if (!profile) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }

    const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];
    const gaps = calculateSkillGaps(profile, role);
    const existingTasks = db.getRoadmapTasks(req.userId!);

    const roadmap = generateRoadmap(profile, role, gaps, existingTasks);

    // Flatten tasks and sync to store
    const allTasks = roadmap.stages.flatMap(s => s.tasks);
    db.saveRoadmapTasks(req.userId!, allTasks);

    res.json({ roadmap });
  } catch (err) {
    console.error('Error generating roadmap:', err);
    res.status(500).json({ error: 'Failed to generate learning roadmap.' });
  }
});

// Update specific roadmap task status, progress %, and notes
roadmapRouter.patch('/tasks/:taskId', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const taskId = readParam(req, 'taskId');
    if (!taskId) {
      res.status(400).json({ error: 'A valid task id is required.' });
      return;
    }

    const { status, completionPercentage, userNotes } = req.body;

    const existingTask = db.getRoadmapTasks(req.userId!).find(t => t.id === taskId);
    if (!existingTask) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }
    const wasCompleted = existingTask.status === 'completed';

    const updates: Partial<RoadmapTask> = {};
    if (isTaskStatus(status)) {
      updates.status = status;
      if (status === 'completed') {
        updates.completionPercentage = 100;
        updates.completedAt = new Date().toISOString();
      }
    }

    const completionValue = readFiniteNumber(completionPercentage);
    if (completionValue !== undefined) {
      const clamped = Math.max(0, Math.min(100, Math.round(completionValue)));
      updates.completionPercentage = clamped;
      if (clamped === 100) {
        updates.status = 'completed';
        updates.completedAt = new Date().toISOString();
      }
    }

    const notes = readTrimmedString(userNotes);
    if (notes !== undefined) {
      updates.userNotes = notes;
    }

    // Save the task and any earned activity credit as one atomic unit.
    const updatedTask = db.transaction(() => {
      const task = db.updateRoadmapTask(req.userId!, taskId, updates);

      // Log learning activity only on a genuine not-completed -> completed
      // transition so re-saving an already-completed task cannot double-count hours.
      if (task && updates.status === 'completed' && !wasCompleted) {
        db.logActivity({
          id: `act_${Date.now()}`,
          userId: req.userId!,
          activityType: 'roadmap_task',
          title: `Completed Roadmap Task: ${task.skillName}`,
          details: `Stage ${task.stageNumber} milestone reached (${task.estimatedHours}h credited).`,
          hoursSpent: task.estimatedHours,
          timestamp: new Date().toISOString()
        });
      }
      return task;
    });

    if (!updatedTask) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    res.json({ task: updatedTask, message: 'Roadmap task updated successfully.' });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Failed to update task.' });
  }
});
