import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { evaluateOpportunityMatch } from '../services/opportunityMatchService.js';
import { readTrimmedString } from '../utils/request.js';

export const opportunityMatchRouter = Router();

// POST evaluate alignment with a job description (either pasted or saved ID)
opportunityMatchRouter.post('/evaluate', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const description = readTrimmedString(req.body?.description) || undefined;
    const analysisId = readTrimmedString(req.body?.analysisId) || undefined;

    if (!description && !analysisId) {
      res.status(400).json({ error: 'Please provide either a job description text or a saved analysisId.' });
      return;
    }

    const match = evaluateOpportunityMatch(req.userId!, { description, analysisId });
    if (!match) {
      res.status(404).json({ error: 'Could not extract job requirements or locate student profile.' });
      return;
    }

    res.json({ match });
  } catch (err) {
    console.error('Failed to evaluate opportunity match:', err);
    res.status(500).json({ error: 'Failed to evaluate job opportunity match.' });
  }
});
