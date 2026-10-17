import { Router, Response } from 'express';
import { db } from '../db/store.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const activitiesRouter = Router();

// Get learning activities history
activitiesRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const activities = db.getActivities(req.userId!);
    res.json({ activities });
  } catch (err) {
    console.error('Failed to load activities:', err);
    res.status(500).json({ error: 'Failed to retrieve activities.' });
  }
});
