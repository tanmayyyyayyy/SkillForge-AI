import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { readParam, readTrimmedString } from '../utils/request.js';
import {
  createInterviewSession,
  evaluateInterviewAnswer,
  finishInterviewSession,
  listUserInterviewSessions,
  getUserInterviewSession
} from '../services/interviewArenaService.js';
import type { InterviewMode } from '../../src/types/index.js';

export const interviewArenaRouter = Router();

const VALID_MODES: InterviewMode[] = [
  'technical',
  'project_deep_dive',
  'system_design',
  'behavioral',
  'resume_defense',
  'rapid_fire'
];

// POST create interview session
interviewArenaRouter.post('/sessions', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const rawMode = req.body?.mode;
    const mode: InterviewMode = VALID_MODES.includes(rawMode) ? rawMode : 'technical';
    const targetRole = readTrimmedString(req.body?.targetRole) || undefined;

    const session = await createInterviewSession(req.userId!, mode, targetRole);
    if (!session) {
      res.status(404).json({ error: 'Student profile not found to start interview session.' });
      return;
    }

    res.status(201).json({ session });
  } catch (err) {
    console.error('Failed to create interview session:', err);
    res.status(500).json({ error: 'Failed to initialize interview session.' });
  }
});

// GET user interview sessions
interviewArenaRouter.get('/sessions', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const sessions = listUserInterviewSessions(req.userId!);
    res.json({ sessions });
  } catch (err) {
    console.error('Failed to list interview sessions:', err);
    res.status(500).json({ error: 'Failed to retrieve interview sessions.' });
  }
});

// GET interview session by ID
interviewArenaRouter.get('/sessions/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const id = readParam(req, 'id');
    if (!id) {
      res.status(400).json({ error: 'Session id is required.' });
      return;
    }

    const session = getUserInterviewSession(req.userId!, id);
    if (!session) {
      res.status(404).json({ error: 'Interview session not found.' });
      return;
    }

    res.json({ session });
  } catch (err) {
    console.error('Failed to retrieve interview session:', err);
    res.status(500).json({ error: 'Failed to load interview session.' });
  }
});

// POST submit answer to current question
interviewArenaRouter.post('/sessions/:id/answer', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = readParam(req, 'id');
    if (!id) {
      res.status(400).json({ error: 'Session id is required.' });
      return;
    }

    const questionId = readTrimmedString(req.body?.questionId);
    const userAnswer = readTrimmedString(req.body?.userAnswer);

    if (!questionId || !userAnswer) {
      res.status(400).json({ error: 'Both questionId and userAnswer are required.' });
      return;
    }

    const result = await evaluateInterviewAnswer(req.userId!, id, questionId, userAnswer);
    if (!result) {
      res.status(404).json({ error: 'Active interview session or question not found.' });
      return;
    }

    res.json(result);
  } catch (err) {
    console.error('Failed to evaluate interview answer:', err);
    res.status(500).json({ error: 'Failed to evaluate answer.' });
  }
});

// POST finalize interview session
interviewArenaRouter.post('/sessions/:id/finish', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = readParam(req, 'id');
    if (!id) {
      res.status(400).json({ error: 'Session id is required.' });
      return;
    }

    const session = await finishInterviewSession(req.userId!, id);
    if (!session) {
      res.status(404).json({ error: 'Interview session not found.' });
      return;
    }

    res.json({ session });
  } catch (err) {
    console.error('Failed to finalize interview session:', err);
    res.status(500).json({ error: 'Failed to complete interview session.' });
  }
});
