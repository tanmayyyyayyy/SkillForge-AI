import { Router, Response } from 'express';
import { db } from '../db/store.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { CAREER_ROLES } from '../data/careers.js';
import { calculateSkillGaps } from '../engine/gapEngine.js';
import { readQuery } from '../utils/request.js';

export const analysisRouter = Router();

// Run gap analysis for current authenticated user
analysisRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const profile = db.getProfile(req.userId!);
    if (!profile) {
      res.status(404).json({ error: 'Profile not found. Please complete profile onboarding.' });
      return;
    }

    // Role can be queried via query param or defaults to profile.targetRole
    const requestedRoleId = readQuery(req, 'roleId') || profile.targetRole || 'aiml';
    const role = CAREER_ROLES.find(r => r.id === requestedRoleId);

    if (!role) {
      res.status(404).json({ error: `Career role '${requestedRoleId}' is not supported.` });
      return;
    }

    const result = calculateSkillGaps(profile, role);
    res.json({ analysis: result });
  } catch (err) {
    console.error('Error calculating skill gaps:', err);
    res.status(500).json({ error: 'Failed to compute skill gap analysis.' });
  }
});
