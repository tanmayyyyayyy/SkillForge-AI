import { Router, Response } from 'express';
import { db } from '../db/store.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { isValidUrl } from '../../src/utils/profileValidation.js';
import { readParam, readTrimmedString } from '../utils/request.js';

export const projectsRouter = Router();

// Get recommended projects for authenticated user
projectsRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const projects = db.getProjects(req.userId!);
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve project recommendations.' });
  }
});

// Toggle milestone completion
projectsRouter.patch('/:id/milestones/:milestoneId', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const id = readParam(req, 'id');
    const milestoneId = readParam(req, 'milestoneId');
    if (!id || !milestoneId) {
      res.status(400).json({ error: 'A valid project id and milestone id are required.' });
      return;
    }
    const { completed } = req.body;

    const projects = db.getProjects(req.userId!);
    const project = projects.find(p => p.id === id);

    if (!project) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }

    const milestone = project.milestones.find(m => m.id === milestoneId);
    if (!milestone) {
      res.status(404).json({ error: 'Milestone not found.' });
      return;
    }

    milestone.completed = typeof completed === 'boolean' ? completed : !milestone.completed;
    project.userStatus = 'in_progress';
    project.isSaved = true;

    db.saveProjects(req.userId!, projects);

    if (milestone.completed) {
      db.logActivity({
        id: `act_${Date.now()}`,
        userId: req.userId!,
        activityType: 'project_milestone',
        title: `Completed Milestone: ${milestone.title}`,
        details: `Project: ${project.title}`,
        hoursSpent: 2.5,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ project, message: 'Milestone updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update milestone.' });
  }
});

// Submit project evidence (GitHub Repo / Live URL) to officially verify skills
projectsRouter.post('/:id/evidence', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const id = readParam(req, 'id');
    if (!id) {
      res.status(400).json({ error: 'A valid project id is required.' });
      return;
    }

    const repoUrl = readTrimmedString(req.body.repoUrl);
    const demoUrl = readTrimmedString(req.body.demoUrl);
    const notes = readTrimmedString(req.body.notes);

    if (!repoUrl && !demoUrl) {
      res.status(400).json({ error: 'Please provide either a GitHub repository link or a live demo URL as evidence.' });
      return;
    }

    if (repoUrl && !isValidUrl(repoUrl)) {
      res.status(400).json({ error: 'The repository URL must be a valid http(s) link.' });
      return;
    }

    if (demoUrl && !isValidUrl(demoUrl)) {
      res.status(400).json({ error: 'The live demo URL must be a valid http(s) link.' });
      return;
    }

    const projects = db.getProjects(req.userId!);
    const project = projects.find(p => p.id === id);

    if (!project) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }

    // Complete all milestones
    project.milestones.forEach(m => { m.completed = true; });
    project.userStatus = 'completed';
    project.isSaved = true;
    project.submittedEvidence = {
      repoUrl,
      demoUrl,
      notes,
      submittedAt: new Date().toISOString()
    };

    db.saveProjects(req.userId!, projects);

    // Upgrade demonstrated skills in user profile to 'verified_project'
    const profile = db.getProfile(req.userId!);
    if (profile) {
      const skills = [...profile.currentSkills];
      for (const skillId of project.skillsDemonstrated) {
        const existingSkill = skills.find(s => s.skillId === skillId);
        if (existingSkill) {
          existingSkill.status = 'verified_project';
          existingSkill.verifiedEvidenceUrl = repoUrl || demoUrl;
          existingSkill.proficiency = Math.min(5, Math.max(existingSkill.proficiency, 3)) as any;
        }
      }
      profile.currentSkills = skills;
      db.saveProfile(profile);
    }

    // Log Activity
    db.logActivity({
      id: `act_${Date.now()}`,
      userId: req.userId!,
      activityType: 'project_submitted',
      title: `Submitted Project Evidence: ${project.title}`,
      details: `Verified URL: ${repoUrl || demoUrl}`,
      hoursSpent: project.estimatedEffortHours,
      timestamp: new Date().toISOString()
    });

    res.json({
      project,
      message: 'Project evidence verified! Associated skills have been upgraded to "verified_project" status.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit project evidence.' });
  }
});
