import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { readParam } from '../utils/request.js';
import {
  generateForgedProject,
  listForgedProjects,
  getForgedProject,
  submitForgedProjectMilestoneEvidence
} from '../services/projectForgeService.js';

export const projectForgeRouter = Router();

// POST generate a new tailored project
projectForgeRouter.post('/generate', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const input = req.body || {};
    const project = await generateForgedProject(req.userId!, input);
    if (!project) {
      res.status(404).json({ error: 'Student profile not found to generate forged project.' });
      return;
    }
    res.status(201).json({ project });
  } catch (err) {
    console.error('Failed to generate forged project:', err);
    res.status(500).json({ error: 'Failed to generate project.' });
  }
});

// GET list user's forged projects
projectForgeRouter.get('/projects', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const projects = listForgedProjects(req.userId!);
    res.json({ projects });
  } catch (err) {
    console.error('Failed to list forged projects:', err);
    res.status(500).json({ error: 'Failed to retrieve forged projects.' });
  }
});

// GET forged project by ID
projectForgeRouter.get('/projects/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const id = readParam(req, 'id');
    if (!id) {
      res.status(400).json({ error: 'Project id is required.' });
      return;
    }

    const project = getForgedProject(req.userId!, id);
    if (!project) {
      res.status(404).json({ error: 'Forged project not found.' });
      return;
    }

    res.json({ project });
  } catch (err) {
    console.error('Failed to retrieve forged project:', err);
    res.status(500).json({ error: 'Failed to load project details.' });
  }
});

// POST submit milestone evidence
projectForgeRouter.post('/projects/:id/milestones/:milestoneId/verify', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const id = readParam(req, 'id');
    const milestoneId = readParam(req, 'milestoneId');
    if (!id || !milestoneId) {
      res.status(400).json({ error: 'Both project id and milestone id are required.' });
      return;
    }

    const evidence = req.body || {};
    const outcome = submitForgedProjectMilestoneEvidence(req.userId!, id, milestoneId, evidence);

    if (!outcome) {
      res.status(404).json({ error: 'Project or milestone not found.' });
      return;
    }

    res.json(outcome);
  } catch (err) {
    console.error('Failed to verify project milestone:', err);
    res.status(500).json({ error: 'Failed to verify milestone evidence.' });
  }
});
