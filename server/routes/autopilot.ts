import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../db/store.js';
import {
  getAutopilotPlan,
  setAutopilotGoal,
  replanAutopilot,
  reviewAutopilotAction,
  proposeTargetRoleChange,
  applyTargetRoleChange,
  getDecisionAudit
} from '../services/autopilotService.js';
import { proposeOpportunityActions } from '../services/opportunityActionService.js';
import { readParam, readTrimmedString } from '../utils/request.js';

export const autopilotRouter = Router();

const MAX_GOAL_LENGTH = 240;
const REVIEW_DECISIONS = ['approve', 'reject', 'start', 'complete'] as const;
type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

// GET the current Career Autopilot plan (created/refreshed from real evidence).
autopilotRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const plan = getAutopilotPlan(req.userId!);
    if (!plan) {
      res.status(404).json({ error: 'Profile not found. Complete onboarding first.' });
      return;
    }
    res.json({ plan, decisions: getDecisionAudit(req.userId!) });
  } catch (err) {
    console.error('Failed to load career autopilot plan:', err);
    res.status(500).json({ error: 'Failed to load your Career Autopilot plan.' });
  }
});

// POST set or change the autopilot goal (reversible, triggers replan).
autopilotRouter.post('/goal', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const goal = readTrimmedString(req.body?.goal);
    if (!goal || goal.length > MAX_GOAL_LENGTH) {
      res.status(400).json({ error: `Provide a goal between 1 and ${MAX_GOAL_LENGTH} characters.` });
      return;
    }
    const plan = setAutopilotGoal(req.userId!, goal);
    if (!plan) {
      res.status(404).json({ error: 'Profile not found. Complete onboarding first.' });
      return;
    }
    res.json({ plan, message: 'Goal saved. Completed work was preserved.' });
  } catch (err) {
    console.error('Failed to set autopilot goal:', err);
    res.status(500).json({ error: 'Failed to update your autopilot goal.' });
  }
});

// POST replan from the latest evidence.
autopilotRouter.post('/replan', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const plan = replanAutopilot(req.userId!);
    if (!plan) {
      res.status(404).json({ error: 'Profile not found. Complete onboarding first.' });
      return;
    }
    res.json({ plan, message: 'Plan refreshed against your latest evidence.' });
  } catch (err) {
    console.error('Failed to replan autopilot:', err);
    res.status(500).json({ error: 'Failed to refresh your plan.' });
  }
});

// POST approve / reject / start / complete an action.
autopilotRouter.post('/actions/:actionId/review', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const actionId = readParam(req, 'actionId');
    const decision = req.body?.decision as ReviewDecision;
    if (!actionId) {
      res.status(400).json({ error: 'Action id is required.' });
      return;
    }
    if (!REVIEW_DECISIONS.includes(decision)) {
      res.status(400).json({ error: `Decision must be one of: ${REVIEW_DECISIONS.join(', ')}.` });
      return;
    }

    const result = reviewAutopilotAction(req.userId!, actionId, decision);
    if (!result) {
      res.status(404).json({ error: 'Action not found.' });
      return;
    }
    res.json({ plan: result.plan, action: result.action, message: `Action set to ${result.action.status}.` });
  } catch (err) {
    console.error('Failed to review autopilot action:', err);
    res.status(500).json({ error: 'Failed to update the action.' });
  }
});

// POST propose switching the active career target (requires approval to apply).
autopilotRouter.post('/target-role', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const roleId = readTrimmedString(req.body?.roleId);
    if (!roleId) {
      res.status(400).json({ error: 'A target role id is required.' });
      return;
    }
    const result = proposeTargetRoleChange(req.userId!, roleId);
    if (!result) {
      res.status(404).json({ error: 'Role or profile not found.' });
      return;
    }
    res.status(201).json({ plan: result.plan, action: result.action, message: 'Target change proposed. Approve it to apply.' });
  } catch (err) {
    console.error('Failed to propose target role change:', err);
    res.status(500).json({ error: 'Failed to propose the target role change.' });
  }
});

// POST apply a previously approved target-role change.
autopilotRouter.post('/target-role/apply', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const actionId = readTrimmedString(req.body?.actionId);
    if (!actionId) {
      res.status(400).json({ error: 'The approved action id is required.' });
      return;
    }
    const result = applyTargetRoleChange(req.userId!, actionId);
    if (!result) {
      res.status(400).json({ error: 'Approve the target change before applying it.' });
      return;
    }
    res.json({ plan: result.plan, roleId: result.roleId, message: 'Career target updated and plan rebuilt.' });
  } catch (err) {
    console.error('Failed to apply target role change:', err);
    res.status(500).json({ error: 'Failed to apply the target role change.' });
  }
});

// GET the recommendation decision audit trail.
autopilotRouter.get('/decisions', authMiddleware, (_req: AuthenticatedRequest, res: Response): void => {
  res.json({ decisions: getDecisionAudit(_req.userId!) });
});

// POST turn an opportunity match (saved analysis or pasted description) into
// approval-gated preparation actions. Proposals only — nothing executes.
autopilotRouter.post('/opportunity/plan', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const analysisId = readTrimmedString(req.body?.analysisId) || undefined;
    const description = readTrimmedString(req.body?.description) || undefined;
    if (!analysisId && !description) {
      const latest = dbHasAnyAnalysis(req.userId!);
      if (!latest) {
        res.status(400).json({ error: 'Provide a job description or analyze a job description first (JD Analyzer).' });
        return;
      }
    }

    const result = proposeOpportunityActions(req.userId!, { analysisId, description });
    if (!result) {
      res.status(404).json({ error: 'No opportunity match could be evaluated. Analyze a job description first.' });
      return;
    }
    res.status(201).json(result);
  } catch (err) {
    console.error('Failed to propose opportunity actions:', err);
    res.status(500).json({ error: 'Failed to turn the opportunity into actions.' });
  }
});

function dbHasAnyAnalysis(userId: string): boolean {
  return db.getJobAnalyses(userId).length > 0;
}
