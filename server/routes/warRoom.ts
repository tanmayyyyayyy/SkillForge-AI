import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { buildWarRoom } from '../services/warRoomService.js';

export const warRoomRouter = Router();

// The prioritised, explained action list derived from existing records.
warRoomRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const warRoom = buildWarRoom(req.userId!);
    if (!warRoom) {
      res.status(404).json({ error: 'Profile not found. Complete onboarding first.' });
      return;
    }
    res.json({ warRoom });
  } catch (err) {
    console.error('Error building war room:', err);
    res.status(500).json({ error: 'Failed to build your war room.' });
  }
});
