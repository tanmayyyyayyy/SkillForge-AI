import { db } from '../db/store.js';
import { CAREER_ROLES } from '../data/careers.js';
import { calculateSkillGaps } from '../engine/gapEngine.js';
import { calculateCareerReadiness } from '../engine/readinessEngine.js';
import { buildEvidenceLedger, evidenceForSkill } from './evidenceLedger.js';
import type {
  CareerRole,
  SkillGapItem,
  StudentProfile,
  WhatIfLabResult,
  WhatIfMilestoneMovement,
  WhatIfPrerequisite,
  WhatIfScenarioResult
} from '../../src/types/index.js';

/**
 * SkillForge 2.0 — What-If Lab.
 *
 * Extends the existing Career Twin scenario simulator with adjustable weekly
 * hours and horizon, explicit prerequisite blocking from the canonical gap
 * engine, milestone movement from the real roadmap, and a hard separation
 * between measured state (readiness, gaps, evidence) and rule-based
 * projections. Nothing here is persisted and no projection is ever presented
 * as measured progress: proficiency gains are simulated in memory and every
 * scenario states its assumptions and uncertainty.
 */

const DISCLAIMER =
  'What-if projections are rule-based planning estimates computed from your own stored data. ' +
  'They are not measured progress, not AI-generated advice, and not a guarantee of employment ' +
  'or of any readiness score.';

/** Transparent rule: one proficiency level on a gap skill costs this many study hours. */
const HOURS_PER_LEVEL = 6;
const MAX_WEEKLY_HOURS = 40;
const MAX_HORIZON_WEEKS = 26;

export interface WhatIfLabInput {
  weeklyHours?: number;
  horizonWeeks?: number;
}

function clampHours(value: number): number {
  return Math.min(MAX_WEEKLY_HOURS, Math.max(1, Math.round(value)));
}

function clampWeeks(value: number): number {
  return Math.min(MAX_HORIZON_WEEKS, Math.max(1, Math.round(value)));
}

interface ScenarioSpec {
  scenarioId: string;
  label: string;
  description: string;
  weeklyHours: number;
  horizonWeeks: number;
}

interface SkillAllocation {
  gap: SkillGapItem;
  levelsGained: number;
  hoursSpent: number;
  hoursBefore: number;
}

/**
 * Allocates study hours to gap skills in priority order. Skills with missing
 * prerequisites stay blocked until a higher-priority gap that satisfies the
 * prerequisite is funded first — the same dependency rule as the gap engine.
 */
function allocateHours(
  gaps: SkillGapItem[],
  capacity: number
): { allocations: SkillAllocation[]; blocked: string[] } {
  const cleared = new Set<string>();
  const allocations: SkillAllocation[] = [];
  const blocked: string[] = [];
  let remaining = capacity;
  let cumulative = 0;

  for (const gap of gaps.filter(g => g.gap > 0)) {
    const unmet = gap.missingPrerequisites.filter(p => !cleared.has(p));
    if (unmet.length > 0) {
      blocked.push(`${gap.name} (needs ${unmet.join(', ')})`);
      continue;
    }
    if (remaining <= 0) continue;

    const levelsToClose = gap.gap;
    const hoursNeeded = levelsToClose * HOURS_PER_LEVEL;
    const hoursSpent = Math.min(hoursNeeded, remaining);
    const levelsGained = Math.min(levelsToClose, Math.floor(hoursSpent / HOURS_PER_LEVEL));
    if (levelsGained <= 0) continue;

    allocations.push({
      gap,
      levelsGained,
      hoursSpent,
      hoursBefore: cumulative
    });
    cumulative += hoursSpent;
    remaining -= hoursSpent;
    cleared.add(gap.name);
    for (const key of [gap.skillId, gap.name]) cleared.add(key);
  }

  return { allocations, blocked };
}

function simulateScenario(
  profile: StudentProfile,
  role: CareerRole,
  baseReadiness: number,
  spec: ScenarioSpec,
  baselineWeeks: Map<string, number>
): WhatIfScenarioResult {
  const gaps = calculateSkillGaps(profile, role);
  const capacity = spec.weeklyHours * spec.horizonWeeks;
  const { allocations, blocked } = allocateHours(gaps.items, capacity);

  const skillsAffected = allocations.map(a => ({
    skillId: a.gap.skillId,
    name: a.gap.name,
    fromLevel: a.gap.currentLevel,
    toLevel: Math.min(5, a.gap.currentLevel + a.levelsGained)
  }));

  // Projected readiness: recompute in memory over the simulated proficiency
  // levels. Assessment and project bonuses are unchanged because no new
  // evidence is produced by studying — only coverage can move.
  const simulatedProfile: StudentProfile = {
    ...profile,
    currentSkills: profile.currentSkills.map(skill => {
      const affected = skillsAffected.find(s => s.skillId === skill.skillId);
      return affected ? { ...skill, proficiency: affected.toLevel as typeof skill.proficiency } : skill;
    })
  };
  const projected = calculateCareerReadiness(
    simulatedProfile,
    role,
    db.getAssessments(profile.userId),
    db.getProjects(profile.userId),
    baseReadiness
  ).overallScore;

  // Milestone movement: incomplete roadmap tasks for funded skills, rescheduled
  // against this scenario's weekly hours and compared with the baseline week.
  const allocationBySkill = new Map(allocations.map(a => [a.gap.skillId, a]));
  const milestones: WhatIfMilestoneMovement[] = db
    .getRoadmapTasks(profile.userId)
    .filter(task => task.status !== 'completed' && allocationBySkill.has(task.skillId))
    .slice(0, 10)
    .map(task => {
      const allocation = allocationBySkill.get(task.skillId)!;
      const fromWeek = Math.floor(allocation.hoursBefore / spec.weeklyHours) + 1;
      const toWeek = Math.ceil((allocation.hoursBefore + task.estimatedHours) / spec.weeklyHours) + 1;
      const baseline = baselineWeeks.get(task.id);
      return {
        milestoneName: task.stageName ? `${task.stageName}: ${task.skillName}` : task.skillName,
        targetSkill: task.skillName,
        fromWeek,
        toWeek: Math.min(toWeek, spec.horizonWeeks + 1),
        moved: baseline !== undefined ? toWeek < baseline : false,
        blockedBy: task.prerequisites
      };
    });

  // Evidence gaps remain evidence gaps: proficiency is self-reported until an
  // assessment, challenge, or project actually records evidence.
  const ledger = buildEvidenceLedger(profile.userId);
  const evidenceStillNeeded = gaps.items
    .filter(g => g.gap > 0 && evidenceForSkill(ledger, g.skillId, g.name).filter(r => r.passed !== false).length === 0)
    .map(g => g.name);

  return {
    scenarioId: spec.scenarioId,
    label: spec.label,
    description: spec.description,
    weeklyHours: spec.weeklyHours,
    horizonWeeks: spec.horizonWeeks,
    projectedReadiness: projected,
    readinessDelta: Math.max(0, projected - baseReadiness),
    skillsAffected,
    milestones,
    blockedPrerequisites: blocked,
    evidenceStillNeeded,
    uncertainty: 'Moderate',
    projectionBasis: 'rule_based',
    assumptions: [
      `Rule-based projection: each proficiency level on a gap skill costs ${HOURS_PER_LEVEL} hours of focused study.`,
      'Only skill-coverage points can move; assessment and project evidence bonuses require real evidence and are held constant.',
      'Proficiency gains are simulated in memory and are not measured progress.',
      'Missing prerequisites block a skill until a higher-priority gap that satisfies them is funded first.'
    ]
  };
}

/** Runs the what-if lab over the student's canonical readiness/gap/roadmap state. */
export function runWhatIfLab(userId: string, input: WhatIfLabInput = {}): WhatIfLabResult | null {
  const profile = db.getProfile(userId);
  if (!profile) return null;

  const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];
  const assessments = db.getAssessments(userId);
  const projects = db.getProjects(userId);
  const baseReadiness = calculateCareerReadiness(profile, role, assessments, projects, 0).overallScore;
  const gaps = calculateSkillGaps(profile, role);

  const weeklyHours = clampHours(input.weeklyHours ?? profile.weeklyHours ?? 8);
  const horizonWeeks = clampWeeks(input.horizonWeeks ?? 12);

  const specs: ScenarioSpec[] = [
    {
      scenarioId: 'current_pace',
      label: 'Current pace',
      description: `Your declared availability of ${weeklyHours} hours per week over ${horizonWeeks} weeks, funded by gap priority.`,
      weeklyHours,
      horizonWeeks
    },
    {
      scenarioId: 'doubled_hours',
      label: 'Doubled effort',
      description: `Double the weekly hours (${clampHours(weeklyHours * 2)} h/week) over the same ${horizonWeeks}-week horizon.`,
      weeklyHours: clampHours(weeklyHours * 2),
      horizonWeeks
    },
    {
      scenarioId: 'extended_horizon',
      label: 'Extended horizon',
      description: `The same ${weeklyHours} hours per week sustained for ${clampWeeks(horizonWeeks * 2)} weeks instead.`,
      weeklyHours,
      horizonWeeks: clampWeeks(horizonWeeks * 2)
    }
  ];

  // Baseline milestone weeks come from the current-pace scenario so "moved"
  // compares against the student's declared availability.
  const baseline = simulateScenario(profile, role, baseReadiness, specs[0], new Map());
  const baselineWeeks = new Map(
    baseline.milestones.map(m => [m.milestoneName, m.toWeek])
  );
  const scenarios = specs.map(spec => simulateScenario(profile, role, baseReadiness, spec, baselineWeeks));

  const prerequisites: WhatIfPrerequisite[] = gaps.items
    .filter(g => g.missingPrerequisites.length > 0)
    .map(g => ({
      skillId: g.skillId,
      skillName: g.name,
      missingPrerequisites: g.missingPrerequisites,
      blocking: g.gap > 0
    }));

  const best = [...scenarios].sort((a, b) => b.readinessDelta - a.readinessDelta)[0];
  const recommendation =
    best.readinessDelta > 0
      ? `"${best.label}" projects the largest gain (+${best.readinessDelta} points to ${best.projectedReadiness}%), assuming ~${best.weeklyHours} hours per week for ${best.horizonWeeks} weeks. Proficiency gains stay self-reported until you record real evidence.`
      : 'No scenario moves readiness within this horizon. Clear prerequisites first, or extend the horizon — and remember that projected proficiency still needs evidence.';

  const comparisonSummary = scenarios
    .map(s => `${s.label}: ${baseReadiness}% → ${s.projectedReadiness}% (+${s.readinessDelta}) at ${s.weeklyHours} h/week over ${s.horizonWeeks} weeks`)
    .join('; ');

  return {
    targetRole: { id: role.id, title: role.title },
    baseReadiness,
    weeklyHours,
    prerequisites,
    scenarios,
    recommendation,
    comparisonSummary,
    disclaimer: DISCLAIMER,
    generatedAt: new Date().toISOString()
  };
}
