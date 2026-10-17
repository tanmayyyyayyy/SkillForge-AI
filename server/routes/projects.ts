import { Router, Response } from 'express';
import { db } from '../db/store.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { isValidUrl } from '../../src/utils/profileValidation.js';
import { readParam, readTrimmedString } from '../utils/request.js';
import { applyEvidenceSubmission } from '../services/evidenceService.js';

export const projectsRouter = Router();

// Get recommended projects for authenticated user
projectsRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const projects = db.getProjects(req.userId!);
    res.json({ projects });
  } catch (err) {
    console.error('Failed to load project recommendations:', err);
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

    const wasCompleted = milestone.completed;
    const isNowCompleted = typeof completed === 'boolean' ? completed : !milestone.completed;

    // Build new objects instead of mutating the live store instance, so a failed
    // transaction rolls back cleanly.
    const updatedMilestone = { ...milestone, completed: isNowCompleted };
    const updatedProject = {
      ...project,
      isSaved: true,
      // Never downgrade a project that has already been completed with evidence.
      userStatus: project.userStatus !== 'completed' ? ('in_progress' as const) : project.userStatus,
      milestones: project.milestones.map(m => (m.id === milestoneId ? updatedMilestone : m))
    };
    const nextProjects = projects.map(p => (p.id === id ? updatedProject : p));

    // Persist the milestone change and any earned activity credit atomically.
    db.transaction(() => {
      db.saveProjects(req.userId!, nextProjects);

      // Log credit only on a genuine not-completed -> completed transition so
      // re-saving the same state cannot double-count progress.
      if (isNowCompleted && !wasCompleted) {
        db.logActivity({
          id: `act_${Date.now()}_ms`,
          userId: req.userId!,
          activityType: 'project_milestone',
          title: `Completed Milestone: ${milestone.title}`,
          details: `Project: ${project.title}`,
          hoursSpent: 0,
          timestamp: new Date().toISOString()
        });
      }
    });

    res.json({ project: updatedProject, message: 'Milestone updated.' });
  } catch (err) {
    console.error('Failed to update project milestone:', err);
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

    const profile = db.getProfile(req.userId!);
    const application = applyEvidenceSubmission(
      project,
      profile,
      { repoUrl, demoUrl, notes },
      new Date().toISOString()
    );

    const nextProjects = projects.map(p => (p.id === id ? application.project : p));

    // Skills are upgraded to project-verified only when the milestone chain is
    // complete AND evidence exists. Proficiency is intentionally left untouched.
    // Build a new profile object (never mutate the live one) so rollback is clean.
    const nextProfile =
      profile && application.awarded
        ? { ...profile, currentSkills: application.skills, updatedAt: new Date().toISOString() }
        : undefined;

    // Persist the project, any verified-skill upgrade, and the first-submission
    // credit as one atomic unit so a partial write cannot leave them disagreeing.
    db.transaction(() => {
      db.saveProjects(req.userId!, nextProjects);
      if (nextProfile) {
        db.saveProfile(nextProfile);
      }

      // Credit the submission at most once; updating evidence is not additional work.
      if (application.isFirstEvidence) {
        db.logActivity({
          id: `act_${Date.now()}_ev`,
          userId: req.userId!,
          activityType: 'project_submitted',
          title: `Submitted Project Evidence: ${project.title}`,
          details: `Self-reported link: ${repoUrl || demoUrl}`,
          hoursSpent: 0,
          timestamp: new Date().toISOString()
        });
      }
    });

    res.json({
      project: application.project,
      awarded: application.awarded,
      milestoneChainComplete: application.milestoneChainComplete,
      message: application.awarded
        ? 'Evidence saved. All milestones are complete, so this project now counts toward your practical project evidence score.'
        : 'Evidence saved as self-reported. Complete every project milestone to earn practical project evidence credit.'
    });
  } catch (err) {
    console.error('Failed to submit project evidence:', err);
    res.status(500).json({ error: 'Failed to submit project evidence.' });
  }
});
