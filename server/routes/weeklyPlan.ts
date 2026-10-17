import { Router, Response } from 'express';
import { db } from '../db/store.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { CAREER_ROLES } from '../data/careers.js';
import { calculateSkillGaps } from '../engine/gapEngine.js';
import { generateRoadmap } from '../engine/roadmapEngine.js';
import { generateWeeklyPlan } from '../engine/weeklyPlanEngine.js';
import { isPlainObject, readFiniteNumber } from '../utils/request.js';
import { WeeklyPlan } from '../../src/types/index.js';

export const weeklyPlanRouter = Router();

const MIN_AVAILABILITY = 1;
const MAX_AVAILABILITY = 80;

/**
 * Builds the current week's plan for the authenticated user from canonical
 * sources only — the gap engine, the roadmap engine, the project store and the
 * profile's declared availability. Nothing here mutates readiness or progress.
 */
function buildPlanForUser(userId: string): WeeklyPlan {
  const profile = db.getProfile(userId)!;
  const role = CAREER_ROLES.find(r => r.id === profile.targetRole);

  const gaps = role ? calculateSkillGaps(profile, role) : undefined;
  const roadmapTasks = role
    ? generateRoadmap(profile, role, gaps!, db.getRoadmapTasks(userId)).stages.flatMap(s => s.tasks)
    : [];

  // Persist the generated roadmap so planned sessions reference real, togglable
  // records. This mirrors the roadmap route and preserves existing completion
  // (generateRoadmap carries status/percentage/completedAt forward).
  if (roadmapTasks.length > 0) {
    db.saveRoadmapTasks(userId, roadmapTasks);
  }

  return generateWeeklyPlan({
    profile,
    role,
    gaps: gaps?.items ?? [],
    roadmapTasks,
    projects: db.getProjects(userId)
  });
}

// Get the current weekly learning plan for the authenticated user.
weeklyPlanRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const profile = db.getProfile(req.userId!);
    if (!profile) {
      res.status(404).json({ error: 'Profile not found. Complete onboarding first.' });
      return;
    }
    res.json({ plan: buildPlanForUser(req.userId!) });
  } catch (err) {
    console.error('Error generating weekly plan:', err);
    res.status(500).json({ error: 'Failed to generate weekly learning plan.' });
  }
});

// Regenerate the week's plan. Optionally updates the student's declared weekly
// availability (the only client-settable input) with strict bounds validation.
weeklyPlanRouter.post('/regenerate', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const profile = db.getProfile(req.userId!);
    if (!profile) {
      res.status(404).json({ error: 'Profile not found. Complete onboarding first.' });
      return;
    }

    const body = isPlainObject(req.body) ? req.body : {};

    // Validate the only client-settable input up front, before any write.
    let availabilityHours: number | undefined;
    if (body.availableHours !== undefined) {
      const parsed = readFiniteNumber(body.availableHours);
      if (parsed === undefined || parsed < MIN_AVAILABILITY || parsed > MAX_AVAILABILITY) {
        res.status(400).json({
          error: `Available study hours must be a number between ${MIN_AVAILABILITY} and ${MAX_AVAILABILITY}.`
        });
        return;
      }
      availabilityHours = Math.round(parsed);
    }

    // Persist the availability change and the regenerated roadmap as one atomic
    // unit, so a storage failure cannot leave one applied and the other not.
    const plan = db.transaction(() => {
      if (availabilityHours !== undefined) {
        profile.weeklyHours = availabilityHours;
        profile.updatedAt = new Date().toISOString();
        db.saveProfile(profile);
      }
      return buildPlanForUser(req.userId!);
    });

    res.json({ plan, message: 'Weekly plan regenerated.' });
  } catch (err) {
    console.error('Error regenerating weekly plan:', err);
    res.status(500).json({ error: 'Failed to regenerate weekly learning plan.' });
  }
});
