import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { computeSkillRadar } from '../services/skillRadarService.js';

export const skillRadarRouter = Router();

skillRadarRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const data = computeSkillRadar(req.userId!);
    if (!data) {
      res.status(404).json({ error: 'Profile not found to compute skill radar.' });
      return;
    }
    res.json({ radar: data });
  } catch (err) {
    console.error('Failed to compute skill radar:', err);
    res.status(500).json({ error: 'Failed to compute market skill radar.' });
  }
});
