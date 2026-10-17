import {
  CareerRole,
  RoadmapTask,
  ProjectRecommendation,
  SkillGapItem,
  StudentProfile,
  WeeklyPlan,
  WeeklyPlanDay,
  WeeklyPlanTask,
  WeeklyPlanUnscheduledItem,
  WeeklyPlanCompletedItem,
  WeeklyTaskKind,
  PriorityBadge
} from '../../src/types/index.js';

/**
 * Subphase 2I: deterministic weekly learning planner.
 *
 * Produces a day-by-day, seven-day schedule strictly from canonical data:
 * the student's prioritized skill gaps (from the gap engine), the
 * dependency-ordered roadmap tasks (from the roadmap engine), the next
 * incomplete milestone of each active project, and their declared weekly
 * availability.
 *
 * It schedules *references* to those canonical records, never new tasks:
 *  - a roadmap task's completion lives in the roadmap store and is toggled
 *    through the existing roadmap endpoint;
 *  - a milestone's completion lives in the project store and is toggled
 *    through the existing project endpoint.
 *
 * Therefore regenerating a plan can never erase completed work, a completed
 * task is only ever reported complete because the store says so, and the
 * readiness formula is never touched.
 */

const DAYS_PER_WEEK = 7;
const MAX_HOURS_PER_GAP = 3;
const MAX_HOURS_PER_MILESTONE = 2;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const DIFFICULTY_PRIORITY: Record<ProjectRecommendation['difficulty'], PriorityBadge> = {
  Advanced: 'High',
  Intermediate: 'Medium',
  Beginner: 'Low'
};

const DIFFICULTY_SCORE: Record<ProjectRecommendation['difficulty'], number> = {
  Advanced: 60,
  Intermediate: 45,
  Beginner: 30
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Monday 00:00 (UTC) of the week containing `now`. */
function startOfWeekUtc(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d;
}

interface Candidate {
  id: string;
  title: string;
  description: string;
  kind: WeeklyTaskKind;
  source: WeeklyPlanTask['source'];
  sourceId: string;
  milestoneId?: string;
  skillId?: string;
  skillName?: string;
  priority: PriorityBadge;
  priorityScore: number;
  hours: number;
  originalEstimatedHours: number;
  prerequisites: string[];
  resource?: WeeklyPlanTask['resource'];
}

function buildGapCandidates(roadmapTasks: RoadmapTask[], gapMap: Map<string, SkillGapItem>): Candidate[] {
  const seen = new Set<string>();
  const candidates: Candidate[] = [];

  // Preserve the roadmap's dependency/stage order as the stable base ordering,
  // then prioritize the most valuable work via priorityScore below.
  const ordered = [...roadmapTasks]
    .filter(t => t.status !== 'completed')
    .sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
      if (a.stageNumber !== b.stageNumber) return a.stageNumber - b.stageNumber;
      return a.skillId.localeCompare(b.skillId);
    });

  for (const task of ordered) {
    if (seen.has(task.id)) continue;
    seen.add(task.id);

    const gap = gapMap.get(task.skillId);
    const rawHours = gap?.estimatedLearningHours || task.estimatedHours;
    const hours = clamp(Math.min(rawHours, MAX_HOURS_PER_GAP), 1, MAX_HOURS_PER_GAP);

    candidates.push({
      id: task.id,
      title: `Close priority gap: ${task.skillName}`,
      description: gap?.nextRecommendedAction || task.whyItMatters,
      kind: 'skill-gap',
      source: 'roadmap',
      sourceId: task.id,
      skillId: task.skillId,
      skillName: task.skillName,
      priority: task.priority,
      priorityScore: task.priorityScore,
      hours,
      originalEstimatedHours: Math.max(hours, Math.round(task.estimatedHours)),
      prerequisites: task.prerequisites ?? [],
      resource: task.learningResources?.[0]
    });
  }

  return candidates;
}

function buildMilestoneCandidates(projects: ProjectRecommendation[]): Candidate[] {
  const candidates: Candidate[] = [];

  for (const project of projects) {
    if (project.userStatus === 'completed') continue;
    const milestone = project.milestones?.find(m => !m.completed);
    if (!milestone) continue;

    candidates.push({
      id: `ms_${project.id}_${milestone.id}`,
      title: `Advance project: ${project.title}`,
      description: `Complete the next milestone: "${milestone.title}".`,
      kind: 'project-milestone',
      source: 'project',
      sourceId: project.id,
      milestoneId: milestone.id,
      priority: DIFFICULTY_PRIORITY[project.difficulty],
      priorityScore: DIFFICULTY_SCORE[project.difficulty],
      hours: MAX_HOURS_PER_MILESTONE,
      originalEstimatedHours: Math.max(MAX_HOURS_PER_MILESTONE, Math.round(project.estimatedEffortHours)),
      prerequisites: []
    });
  }

  return candidates;
}

/**
 * Interleaves prioritized gap work with hands-on milestone work (gap, milestone,
 * gap, milestone, …) so the week balances study and practice, matching the
 * existing next-seven-days convention. Gaps always lead.
 */
function interleave(gaps: Candidate[], milestones: Candidate[]): Candidate[] {
  const ordered: Candidate[] = [];
  const gapQueue = [...gaps];
  const milestoneQueue = [...milestones];
  while (gapQueue.length > 0 || milestoneQueue.length > 0) {
    const nextGap = gapQueue.shift();
    if (nextGap) ordered.push(nextGap);
    const nextMilestone = milestoneQueue.shift();
    if (nextMilestone) ordered.push(nextMilestone);
  }
  return ordered;
}

export interface WeeklyPlanInput {
  profile: StudentProfile;
  role: CareerRole | undefined;
  gaps: SkillGapItem[];
  roadmapTasks: RoadmapTask[];
  projects: ProjectRecommendation[];
  now?: Date;
}

export function generateWeeklyPlan(input: WeeklyPlanInput): WeeklyPlan {
  const { profile, role, gaps, roadmapTasks, projects } = input;
  const now = input.now ?? new Date();

  const weekStartDate = startOfWeekUtc(now);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setUTCDate(weekEndDate.getUTCDate() + (DAYS_PER_WEEK - 1));

  const weekStart = toIsoDate(weekStartDate);
  const weekEnd = toIsoDate(weekEndDate);
  const generatedAt = now.toISOString();

  const availableHours = Math.max(0, Math.round(profile.weeklyHours || 0));

  const days: WeeklyPlanDay[] = Array.from({ length: DAYS_PER_WEEK }, (_, i) => {
    const date = new Date(weekStartDate);
    date.setUTCDate(date.getUTCDate() + i);
    return { day: i + 1, label: DAY_LABELS[i], date: toIsoDate(date), hours: 0, tasks: [] };
  });

  // Hours genuinely credited for tasks the store marks completed within this week.
  const windowStartMs = weekStartDate.getTime();
  const windowEndMs = new Date(weekEndDate.getTime() + 24 * 60 * 60 * 1000 - 1).getTime();
  const completedThisWeek: WeeklyPlanCompletedItem[] = roadmapTasks
    .filter(t => t.status === 'completed' && t.completedAt)
    .filter(t => {
      const ms = Date.parse(t.completedAt as string);
      return Number.isFinite(ms) && ms >= windowStartMs && ms <= windowEndMs;
    })
    .sort((a, b) => (a.completedAt as string).localeCompare(b.completedAt as string))
    .map(t => ({
      id: t.id,
      title: t.skillName,
      skillName: t.skillName,
      hours: Math.max(0, Math.round(t.estimatedHours)),
      completedAt: t.completedAt as string
    }));
  const completedHours = completedThisWeek.reduce((sum, c) => sum + c.hours, 0);

  const roleRef = role ? { id: role.id, title: role.title } : { id: profile.targetRole || 'unknown', title: 'Not selected' };

  const base: Omit<WeeklyPlan, 'days' | 'tasks' | 'unscheduled' | 'totalCandidates' | 'state' | 'message' | 'totalScheduledHours' | 'remainingScheduledHours'> = {
    userId: profile.userId,
    weekStart,
    weekEnd,
    targetRole: roleRef,
    availableHours,
    completedHours,
    completedThisWeek,
    generatedAt
  };

  const emptyState = (state: WeeklyPlan['state'], message: string): WeeklyPlan => ({
    ...base,
    totalScheduledHours: 0,
    remainingScheduledHours: 0,
    days,
    tasks: [],
    unscheduled: [],
    totalCandidates: 0,
    state,
    message
  });

  if (!role) {
    return emptyState(
      'no-target-role',
      'Choose a target career to generate a weekly learning plan tailored to the skills you still need.'
    );
  }

  if (availableHours <= 0) {
    // Never invent study availability. Explain the setup requirement instead.
    return emptyState(
      'no-availability',
      'No weekly study availability is set in your profile, so a seven-day plan cannot be scheduled. ' +
        'Add your available hours per week to receive a focused plan.'
    );
  }

  const gapMap = new Map(gaps.map(g => [g.skillId, g]));
  const gapCandidates = buildGapCandidates(roadmapTasks, gapMap);
  const milestoneCandidates = buildMilestoneCandidates(projects);
  const candidates = interleave(gapCandidates, milestoneCandidates);

  if (candidates.length === 0) {
    return {
      ...base,
      totalScheduledHours: 0,
      remainingScheduledHours: 0,
      days,
      tasks: [],
      unscheduled: [],
      totalCandidates: 0,
      state: 'no-work',
      message:
        'No outstanding priority skill gaps or incomplete project milestones were found for your target role, ' +
        'so no new study tasks are recommended this week.'
    };
  }

  // Select whole sessions in priority order without exceeding the weekly budget.
  const selected: Candidate[] = [];
  const unscheduled: WeeklyPlanUnscheduledItem[] = [];
  let remaining = availableHours;

  for (const candidate of candidates) {
    if (candidate.hours <= remaining) {
      selected.push(candidate);
      remaining -= candidate.hours;
    } else {
      unscheduled.push({
        id: candidate.id,
        title: candidate.title,
        kind: candidate.kind,
        skillId: candidate.skillId,
        priority: candidate.priority,
        priorityScore: candidate.priorityScore,
        estimatedHours: candidate.hours,
        reason:
          `Needs about ${candidate.hours}h, but only ${remaining}h of your ${availableHours}h weekly ` +
          `availability remains after higher-priority work was scheduled.`
      });
    }
  }

  // Spread selected sessions across the seven days as evenly as the load allows.
  const perDay = availableHours / DAYS_PER_WEEK;
  const tasks: WeeklyPlanTask[] = [];

  for (const candidate of selected) {
    let target = days.find(d => d.hours + candidate.hours <= perDay + 1e-9);
    if (!target) {
      // Session larger than a single day's share: place it on the lightest day
      // rather than dropping it, keeping the weekly total within budget.
      target = days[0];
      for (const d of days) {
        if (d.hours < target!.hours) target = d;
      }
    }

    const task: WeeklyPlanTask = {
      id: candidate.id,
      title: candidate.title,
      description: candidate.description,
      kind: candidate.kind,
      source: candidate.source,
      sourceId: candidate.sourceId,
      milestoneId: candidate.milestoneId,
      skillId: candidate.skillId,
      skillName: candidate.skillName,
      priority: candidate.priority,
      priorityScore: candidate.priorityScore,
      estimatedHours: candidate.hours,
      originalEstimatedHours: candidate.originalEstimatedHours,
      day: target.day,
      dayLabel: target.label,
      status: 'scheduled',
      prerequisites: candidate.prerequisites,
      resource: candidate.resource
    };

    target.tasks.push(task);
    target.hours = round1(target.hours + candidate.hours);
    tasks.push(task);
  }

  const totalScheduledHours = round1(tasks.reduce((sum, t) => sum + t.estimatedHours, 0));
  const remainingScheduledHours = round1(Math.max(0, totalScheduledHours - completedHours));

  let message: string;
  if (unscheduled.length > 0) {
    message =
      `Scheduled ${tasks.length} session${tasks.length === 1 ? '' : 's'} (~${totalScheduledHours}h). ` +
      `${unscheduled.length} item${unscheduled.length === 1 ? '' : 's'} could not fit into your ${availableHours}h week — ` +
      'see the unscheduled list for why.';
  } else {
    message = `Scheduled ${tasks.length} session${tasks.length === 1 ? '' : 's'} (~${totalScheduledHours}h) within your ${availableHours}h week.`;
  }

  return {
    ...base,
    totalScheduledHours,
    remainingScheduledHours,
    days: days.map(d => ({ ...d, hours: round1(d.hours) })),
    tasks,
    unscheduled,
    totalCandidates: candidates.length,
    state: 'ready',
    message
  };
}
