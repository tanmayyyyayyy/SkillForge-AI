import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { buildEvidenceGraph } from '../services/evidenceGraphService.js';

export const evidenceGraphRouter = Router();

// The derived skill/assessment/project graph behind the student's readiness.
evidenceGraphRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const graph = buildEvidenceGraph(req.userId!);
    if (!graph) {
      res.status(404).json({ error: 'Profile not found. Complete onboarding first.' });
      return;
    }
    res.json({ graph });
  } catch (err) {
    console.error('Error building evidence graph:', err);
    res.status(500).json({ error: 'Failed to build the evidence graph.' });
  }
});
