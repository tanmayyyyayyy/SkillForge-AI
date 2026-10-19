import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { readParam, readTrimmedString } from '../utils/request.js';
import {
  startExperiment,
  getExperiment,
  listExperiments,
  submitChallengeStage,
  submitMilestoneStage,
  prepareInterviewStage,
  submitInterviewStage,
  collectEvidenceStage,
  completeExperiment
} from '../services/experimentService.js';

export const experimentRouter = Router();

// GET all experiments for the user.
experimentRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    res.json({ experiments: listExperiments(req.userId!) });
  } catch (err) {
    console.error('Failed to list experiments:', err);
    res.status(500).json({ error: 'Failed to load your readiness experiments.' });
  }
});

// POST start a new experiment.
experimentRouter.post('/start', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const goal = readTrimmedString(req.body?.goal);
    const record = startExperiment(req.userId!, goal);
    if (!record) {
      res.status(404).json({ error: 'Profile not found. Complete onboarding first.' });
      return;
    }
    res.status(201).json({ experiment: record });
  } catch (err) {
    console.error('Failed to start experiment:', err);
    res.status(500).json({ error: 'Failed to start the readiness experiment.' });
  }
});

// GET a single experiment.
experimentRouter.get('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const id = readParam(req, 'id');
    const record = id ? getExperiment(req.userId!, id) : null;
    if (!record) {
      res.status(404).json({ error: 'Experiment not found.' });
      return;
    }
    res.json({ experiment: record });
  } catch (err) {
    console.error('Failed to load experiment:', err);
    res.status(500).json({ error: 'Failed to load the experiment.' });
  }
});

// POST submit the practical challenge stage.
experimentRouter.post('/:id/challenge', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = readParam(req, 'id');
    const solution = readTrimmedString(req.body?.solution);
    if (!id || !solution) {
      res.status(400).json({ error: 'An experiment id and solution are required.' });
      return;
    }
    const result = await submitChallengeStage(req.userId!, id, solution);
    if (!result) {
      res.status(404).json({ error: 'Experiment not found.' });
      return;
    }
    res.json(result);
  } catch (err) {
    console.error('Failed to submit challenge stage:', err);
    res.status(500).json({ error: 'Failed to evaluate the challenge stage.' });
  }
});

// POST submit the project milestone stage.
experimentRouter.post('/:id/milestone', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = readParam(req, 'id');
    if (!id) {
      res.status(400).json({ error: 'An experiment id is required.' });
      return;
    }
    const evidence = {
      repoUrl: readTrimmedString(req.body?.repoUrl) || undefined,
      artifactUrl: readTrimmedString(req.body?.artifactUrl) || undefined,
      notes: readTrimmedString(req.body?.notes) || undefined
    };
    const result = await submitMilestoneStage(req.userId!, id, evidence);
    if (!result) {
      res.status(404).json({ error: 'Experiment or project not found.' });
      return;
    }
    res.json(result);
  } catch (err) {
    console.error('Failed to submit milestone stage:', err);
    res.status(500).json({ error: 'Failed to record the milestone stage.' });
  }
});

// GET the targeted interview question (prepares a session for reuse).
experimentRouter.get('/:id/interview', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = readParam(req, 'id');
    const result = id ? await prepareInterviewStage(req.userId!, id) : null;
    if (!result) {
      res.status(404).json({ error: 'Experiment not found.' });
      return;
    }
    res.json(result);
  } catch (err) {
    console.error('Failed to prepare interview stage:', err);
    res.status(500).json({ error: 'Failed to prepare the interview stage.' });
  }
});

// POST submit the interview stage.
experimentRouter.post('/:id/interview', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = readParam(req, 'id');
    const answer = readTrimmedString(req.body?.answer);
    if (!id || !answer) {
      res.status(400).json({ error: 'An experiment id and answer are required.' });
      return;
    }
    const result = await submitInterviewStage(req.userId!, id, answer);
    if (!result) {
      res.status(404).json({ error: 'Experiment not found.' });
      return;
    }
    res.json(result);
  } catch (err) {
    console.error('Failed to submit interview stage:', err);
    res.status(500).json({ error: 'Failed to evaluate the interview stage.' });
  }
});

// POST collect evidence produced so far.
experimentRouter.post('/:id/evidence', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const id = readParam(req, 'id');
    const record = id ? collectEvidenceStage(req.userId!, id) : null;
    if (!record) {
      res.status(404).json({ error: 'Experiment not found.' });
      return;
    }
    res.json({ experiment: record });
  } catch (err) {
    console.error('Failed to collect evidence:', err);
    res.status(500).json({ error: 'Failed to collect experiment evidence.' });
  }
});

// POST complete the experiment and produce the report.
experimentRouter.post('/:id/complete', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const id = readParam(req, 'id');
    const record = id ? completeExperiment(req.userId!, id) : null;
    if (!record) {
      res.status(404).json({ error: 'Experiment not found.' });
      return;
    }
    res.json({ experiment: record });
  } catch (err) {
    console.error('Failed to complete experiment:', err);
    res.status(500).json({ error: 'Failed to complete the experiment.' });
  }
});
