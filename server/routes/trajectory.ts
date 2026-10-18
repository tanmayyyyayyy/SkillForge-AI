import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { buildTrajectory } from '../services/trajectoryService.js';

export const trajectoryRouter = Router();

// Deterministic trajectory derived from readiness history.
trajectoryRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const trajectory = buildTrajectory(req.userId!);
    if (!trajectory) {
      res.status(404).json({ error: 'Profile not found. Complete onboarding first.' });
      return;
    }
    res.json({ trajectory });
  } catch (err) {
    console.error('Error building trajectory:', err);
    res.status(500).json({ error: 'Failed to build trajectory.' });
  }
});
