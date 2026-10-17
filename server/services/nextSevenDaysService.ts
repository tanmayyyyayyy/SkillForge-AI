import { ProjectRecommendation, SkillGapItem, NextSevenDaysPlan, NextSevenDaysFocusItem } from '../../src/types/index.js';

/**
 * Subphase 2G: deterministic "Next Seven Days" planner.
 *
 * Builds a practical weekly focus list strictly from real, already-computed
 * data: the student's declared weekly study availability, their prioritized
 * skill gaps, and their incomplete project milestones. It never invents tasks
 * and never exceeds the hours the student said they have available.
 *
 * If nothing meaningful can be scheduled, it explains why instead of
 * fabricating work.
 */
const MAX_GAP_ACTIONS = 4;
const MAX_MILESTONE_ACTIONS = 2;
const MAX_HOURS_PER_GAP = 3;
const MAX_HOURS_PER_MILESTONE = 2;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function buildNextSevenDaysPlan(
  weeklyHours: number,
  gaps: SkillGapItem[],
  projects: ProjectRecommendation[]
): NextSevenDaysPlan {
  const availableHours = Math.max(0, Math.round(weeklyHours || 0));

  if (availableHours <= 0) {
    return {
      availableHours: 0,
      focusItems: [],
      totalPlannedHours: 0,
      unallocatedHours: 0,
      note:
        'No weekly study availability is set in your profile, so a seven-day plan cannot be scheduled. ' +
        'Add your available hours per week to receive a focused plan.'
    };
  }

  const gapActions: NextSevenDaysFocusItem[] = gaps.slice(0, MAX_GAP_ACTIONS).map(gap => ({
    title: `Close priority gap: ${gap.name}`,
    detail:
      gap.nextRecommendedAction ||
      gap.reason ||
      `Build ${gap.name} toward the required level ${gap.requiredLevel}.`,
    hours: clamp(Math.min(gap.estimatedLearningHours, MAX_HOURS_PER_GAP), 1, MAX_HOURS_PER_GAP),
    skillId: gap.skillId,
    kind: 'skill-gap'
  }));

  const milestoneActions: NextSevenDaysFocusItem[] = [];
  for (const project of projects) {
    if (milestoneActions.length >= MAX_MILESTONE_ACTIONS) break;
    if (project.userStatus === 'completed') continue;
    const nextMilestone = project.milestones?.find(m => !m.completed);
    if (!nextMilestone) continue;
    milestoneActions.push({
      title: `Advance project: ${project.title}`,
      detail: `Complete the next milestone: "${nextMilestone.title}".`,
      hours: MAX_HOURS_PER_MILESTONE,
      kind: 'project-milestone'
    });
  }

  // Interleave gap work with hands-on milestone work so the week balances study
  // and practice, then allocate hours up to the declared weekly budget.
  const candidates: NextSevenDaysFocusItem[] = [];
  const gapQueue = [...gapActions];
  const milestoneQueue = [...milestoneActions];
  while (gapQueue.length > 0 || milestoneQueue.length > 0) {
    const nextGap = gapQueue.shift();
    if (nextGap) candidates.push(nextGap);
    const nextMilestone = milestoneQueue.shift();
    if (nextMilestone) candidates.push(nextMilestone);
  }

  const focusItems: NextSevenDaysFocusItem[] = [];
  let remaining = availableHours;
  for (const candidate of candidates) {
    if (remaining <= 0) break;
    const hours = Math.min(candidate.hours, remaining);
    focusItems.push({ ...candidate, hours });
    remaining -= hours;
  }

  const totalPlannedHours = availableHours - remaining;
  const unallocatedHours = remaining;

  let note: string;
  if (focusItems.length === 0) {
    note =
      'No outstanding priority skill gaps or incomplete project milestones were found for your target role, ' +
      'so no new study tasks are recommended this week.';
  } else if (unallocatedHours > 0) {
    note = `About ${unallocatedHours} hour${unallocatedHours === 1 ? '' : 's'} remain unallocated for review, spaced practice, or rest.`;
  } else {
    note = 'This plan is scoped to the weekly availability you provided.';
  }

  return { availableHours, focusItems, totalPlannedHours, unallocatedHours, note };
}
