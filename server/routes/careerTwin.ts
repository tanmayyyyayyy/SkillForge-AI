import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { buildCareerTwin, simulateScenarios, evolveCareerTwinScenarios } from '../services/careerTwinService.js';
import type { CareerTwinScenarioInput } from '../../src/types/index.js';

export const careerTwinRouter = Router();

const MAX_SCENARIOS = 4;
const MAX_FOCUS_SKILLS = 6;
const MAX_WEEKS = 52;
const MAX_HOURS = 80;

interface RawScenario {
  label?: unknown;
  focusSkillIds?: unknown;
  weeklyHours?: unknown;
  horizonWeeks?: unknown;
}

/**
 * Validates and normalises untrusted scenario input. The service is defensive
 * too, but rejecting malformed payloads here keeps the API contract explicit.
 */
function parseScenarios(raw: unknown): CareerTwinScenarioInput[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_SCENARIOS) return null;

  const parsed: CareerTwinScenarioInput[] = [];
  for (const entry of raw as RawScenario[]) {
    if (typeof entry !== 'object' || entry === null) return null;

    const focus = entry.focusSkillIds;
    if (!Array.isArray(focus) || focus.length === 0 || focus.length > MAX_FOCUS_SKILLS) return null;
    if (!focus.every(id => typeof id === 'string' && id.length > 0 && id.length <= 64)) return null;

    const weeklyHours = Number(entry.weeklyHours);
    const horizonWeeks = Number(entry.horizonWeeks);
    if (!Number.isFinite(weeklyHours) || weeklyHours < 1 || weeklyHours > MAX_HOURS) return null;
    if (!Number.isFinite(horizonWeeks) || horizonWeeks < 1 || horizonWeeks > MAX_WEEKS) return null;

    parsed.push({
      label: typeof entry.label === 'string' ? entry.label.slice(0, 60) : '',
      focusSkillIds: focus,
      weeklyHours,
      horizonWeeks
    });
  }

  return parsed;
}

// The evidence-based Career Twin built from the student's own records.
careerTwinRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const twin = buildCareerTwin(req.userId!);
    if (!twin) {
      res.status(404).json({ error: 'Profile not found. Complete onboarding first.' });
      return;
    }
    res.json({ twin });
  } catch (err) {
    console.error('Error building career twin:', err);
    res.status(500).json({ error: 'Failed to build your career twin.' });
  }
});

// Career Twin Evolution: Multi-scenario comparative forecasting
careerTwinRouter.get('/evolution', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const evolution = evolveCareerTwinScenarios(req.userId!);
    if (!evolution) {
      res.status(404).json({ error: 'Profile not found to compute career evolution scenarios.' });
      return;
    }
    res.json({ evolution });
  } catch (err) {
    console.error('Error computing career twin evolution:', err);
    res.status(500).json({ error: 'Failed to compute career evolution.' });
  }
});

// Deterministic "what if" comparison of up to 4 learning scenarios.
careerTwinRouter.post('/simulate', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const scenarios = parseScenarios((req.body as { scenarios?: unknown })?.scenarios);
    if (!scenarios) {
      res.status(400).json({
        error: `Provide 1-${MAX_SCENARIOS} scenarios, each with 1-${MAX_FOCUS_SKILLS} focus skills, weeklyHours 1-${MAX_HOURS}, and horizonWeeks 1-${MAX_WEEKS}.`
      });
      return;
    }

    const comparison = simulateScenarios(req.userId!, scenarios);
    if (!comparison) {
      res.status(404).json({ error: 'Profile not found. Complete onboarding first.' });
      return;
    }
    res.json({ comparison });
  } catch (err) {
    console.error('Error simulating career scenarios:', err);
    res.status(500).json({ error: 'Failed to simulate scenarios.' });
  }
});
