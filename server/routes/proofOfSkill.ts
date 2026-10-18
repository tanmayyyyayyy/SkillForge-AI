import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { readParam, readTrimmedString } from '../utils/request.js';
import {
  listProofOfSkillChallenges,
  getProofOfSkillChallenge,
  evaluateProofOfSkill,
  getUserProofOfSkillEvidence
} from '../services/proofOfSkillService.js';

export const proofOfSkillRouter = Router();

// GET all available challenges (hiding hidden test assertions from candidate)
proofOfSkillRouter.get('/challenges', authMiddleware, (_req: AuthenticatedRequest, res: Response): void => {
  try {
    const rawChallenges = listProofOfSkillChallenges();
    const sanitized = rawChallenges.map(c => ({
      ...c,
      testCases: c.testCases.map(tc => ({
        id: tc.id,
        description: tc.description,
        inputDescription: tc.inputDescription,
        expectedOutput: tc.isHidden ? 'Hidden validation criteria' : tc.expectedOutput,
        isHidden: !!tc.isHidden
      }))
    }));
    res.json({ challenges: sanitized });
  } catch (err) {
    console.error('Failed to load challenges:', err);
    res.status(500).json({ error: 'Failed to retrieve challenges.' });
  }
});

// GET challenge by ID
proofOfSkillRouter.get('/challenges/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const id = readParam(req, 'id');
    if (!id) {
      res.status(400).json({ error: 'Challenge id is required.' });
      return;
    }

    const challenge = getProofOfSkillChallenge(id);
    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found.' });
      return;
    }

    const sanitized = {
      ...challenge,
      testCases: challenge.testCases.map(tc => ({
        id: tc.id,
        description: tc.description,
        inputDescription: tc.inputDescription,
        expectedOutput: tc.isHidden ? 'Hidden validation criteria' : tc.expectedOutput,
        isHidden: !!tc.isHidden
      }))
    };

    res.json({ challenge: sanitized });
  } catch (err) {
    console.error('Failed to retrieve challenge:', err);
    res.status(500).json({ error: 'Failed to retrieve challenge details.' });
  }
});

// POST evaluate submission
proofOfSkillRouter.post('/challenges/:id/evaluate', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = readParam(req, 'id');
    if (!id) {
      res.status(400).json({ error: 'Challenge id is required.' });
      return;
    }

    const solution = readTrimmedString(req.body.solution);
    if (!solution) {
      res.status(400).json({ error: 'A solution payload is required for evaluation.' });
      return;
    }

    const result = await evaluateProofOfSkill(req.userId!, id, solution);
    res.json({ result });
  } catch (err) {
    console.error('Failed to evaluate proof of skill challenge:', err);
    res.status(500).json({ error: 'Failed to evaluate challenge submission.' });
  }
});

// GET user verified evidence records
proofOfSkillRouter.get('/evidence', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const evidence = getUserProofOfSkillEvidence(req.userId!);
    res.json({ evidence });
  } catch (err) {
    console.error('Failed to load proof of skill evidence:', err);
    res.status(500).json({ error: 'Failed to retrieve proof of skill evidence.' });
  }
});
