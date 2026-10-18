import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import {
  getMissionControlSummary,
  updateActionState,
  recordCareerDecision
} from '../services/missionControlService.js';
import { readParam, readTrimmedString } from '../utils/request.js';
import type { MissionActionState } from '../../src/types/index.js';

export const missionControlRouter = Router();

const VALID_STATES: MissionActionState[] = [
  'suggested',
  'approved',
  'in_progress',
  'completed',
  'blocked',
  'cancelled'
];

// GET mission control summary
missionControlRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const summary = getMissionControlSummary(req.userId!);
    if (!summary) {
      res.status(404).json({ error: 'Student profile not found.' });
      return;
    }
    res.json({ missionControl: summary });
  } catch (err) {
    console.error('Failed to load mission control:', err);
    res.status(500).json({ error: 'Failed to retrieve mission control summary.' });
  }
});

// PATCH update action state
missionControlRouter.patch('/actions/:actionId/state', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const actionId = readParam(req, 'actionId');
    if (!actionId) {
      res.status(400).json({ error: 'Action id is required.' });
      return;
    }

    const state = req.body?.state as MissionActionState;
    if (!VALID_STATES.includes(state)) {
      res.status(400).json({ error: `Invalid action state. Must be one of: ${VALID_STATES.join(', ')}` });
      return;
    }

    const updated = updateActionState(req.userId!, actionId, state);
    if (!updated) {
      res.status(404).json({ error: 'Action not found.' });
      return;
    }

    res.json({ action: updated, message: `Action state transitioned to ${state}.` });
  } catch (err) {
    console.error('Failed to update action state:', err);
    res.status(500).json({ error: 'Failed to update mission control action.' });
  }
});

// POST record user career decision in audit log
missionControlRouter.post('/decisions', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { decisionType, title, rationale, metadata } = req.body || {};
    if (!title || !rationale) {
      res.status(400).json({ error: 'Title and rationale are required to record a decision.' });
      return;
    }

    const validDecisionTypes = ['goal_change', 'action_approval', 'roadmap_adjustment', 'action_rejection'];
    const type = validDecisionTypes.includes(decisionType) ? decisionType : 'action_approval';

    const decision = recordCareerDecision(req.userId!, {
      decisionType: type,
      title: readTrimmedString(title) || 'Career Decision',
      rationale: readTrimmedString(rationale) || 'Recorded via Mission Control',
      metadata
    });

    res.status(201).json({ decision });
  } catch (err) {
    console.error('Failed to record decision:', err);
    res.status(500).json({ error: 'Failed to record decision audit entry.' });
  }
});
