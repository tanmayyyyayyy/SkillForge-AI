import { db } from '../db/store.js';
import type { ProficiencyLevel } from '../../src/types/index.js';

export interface TrajectoryPoint {
  timestamp: string;
  overallScore: number;
  criticalGaps: number;
  verifiedSkills: number;
}

export interface TrajectoryScenario {
  label: string;
  focusSkillIds: string[];
  weeklyHours: number;
  horizonWeeks: number;
  projectedScore: number;
  delta: number;
  assumptions: string[];
}

export interface TrajectorySimulation {
  baseScore: number;
  history: number[];
  points: TrajectoryPoint[];
  scenarios: TrajectoryScenario[];
  generatedAt: string;
  disclaimer: string;
}

/**
 * Builds a simple, deterministic readiness trajectory from stored history.
 * The projection is intentionally conservative — it does not fabricate history.
 */
export function buildTrajectory(userId: string): TrajectorySimulation | null {
  const profile = db.getProfile(userId);
  if (!profile) return null;

  const history = db.getReadinessHistory(userId);
  const baseScore = history.length > 0 ? history[history.length - 1] : 0;

  const points: TrajectoryPoint[] = history.map((score, idx) => {
    const ts = new Date(Date.now() - (history.length - 1 - idx) * 86400000).toISOString();
    return {
      timestamp: ts,
      overallScore: score,
      criticalGaps: Math.max(0, Math.round((100 - score) / 20)),
      verifiedSkills: Math.min(40, Math.round(score / 2.5))
    };
  });

  const focusDefaults = profile.currentSkills
    .filter(s => s.proficiency < 3)
    .slice(0, 2)
    .map(s => s.skillId);

  const scenarios: TrajectoryScenario[] = [
    {
      label: 'Steady (5h/week)',
      focusSkillIds: focusDefaults,
      weeklyHours: 5,
      horizonWeeks: 4,
      projectedScore: Math.min(100, baseScore + 4),
      delta: 4,
      assumptions: ['Steady, consistent practice over 4 weeks.']
    },
    {
      label: 'Focused (10h/week)',
      focusSkillIds: focusDefaults,
      weeklyHours: 10,
      horizonWeeks: 6,
      projectedScore: Math.min(100, baseScore + 8),
      delta: 8,
      assumptions: ['Focused practice with verification through assessments/projects.']
    }
  ];

  return {
    baseScore,
    history,
    points,
    scenarios,
    generatedAt: new Date().toISOString(),
    disclaimer: 'Projections are illustrative only and assume consistent effort with verified learning.'
  };
}
