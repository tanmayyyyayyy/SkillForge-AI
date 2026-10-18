import { db } from '../db/store.js';
import { CAREER_ROLES } from '../data/careers.js';
import { calculateSkillGaps } from '../engine/gapEngine.js';
import { computeReadinessForUser } from './readinessService.js';
import type {
  CareerWarRoom,
  WarRoomTask,
  WarRoomPendingAssessment,
  WarRoomProjectMilestone,
  WarRoomAchievement,
  WarRoomActiveGoal,
  WarRoomCriticalGap,
  WarRoomMilestone,
  WarRoomNextAction,
  PriorityBadge,
  RoadmapTask
} from '../../src/types/index.js';

/**
 * Subphase 3B — Career War Room.
 *
 * The war room turns existing data (gaps, roadmap tasks, projects, assessments,
 * activities) into a single prioritised, explained action list. It never stores
 * a parallel task list: every task references the real entity that carries its
 * progress, and "doing" the task routes the student to that existing surface.
 */

const MAX_PRIORITY_TASKS = 8;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function mapPriority(badge: PriorityBadge): WarRoomTask['priority'] {
  return badge === 'Mastered' ? 'Low' : badge;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function buildLearnTasks(
  gaps: ReturnType<typeof calculateSkillGaps>,
  roadmapBySkillId: Map<string, RoadmapTask>
): WarRoomTask[] {
  return gaps.items
    .filter(item => item.gap > 0)
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .map(item => {
      const roadmapTask = roadmapBySkillId.get(item.skillId);
      const hours = roadmapTask?.estimatedHours ?? item.estimatedLearningHours;
      const status: WarRoomTask['status'] =
        roadmapTask?.status === 'completed'
          ? 'done'
          : roadmapTask?.status === 'in_progress'
            ? 'in_progress'
            : 'todo';
      return {
        id: `learn:${item.skillId}`,
        kind: 'learn' as const,
        title: `Close the ${item.name} gap`,
        explanation: item.reason,
        estimatedMinutes: Math.max(15, Math.round(hours * 60)),
        priority: mapPriority(item.priorityBadge),
        priorityScore: item.priorityScore,
        skillId: item.skillId,
        skillName: item.name,
        completionCriteria: roadmapTask?.completionCriteria?.join('; ') || item.nextRecommendedAction,
        route: '/roadmap',
        actionLabel: 'Open roadmap task',
        status,
        sourceId: roadmapTask?.id
      };
    });
}

function buildAssessmentTasks(userId: string, gaps: ReturnType<typeof calculateSkillGaps>): WarRoomTask[] {
  const attempts = db.getAssessmentAttempts(userId);
  const inProgressSkillIds = new Set(
    attempts.filter(a => a.status === 'in_progress').map(a => a.skillId)
  );

  return gaps.items
    .filter(item => item.status !== 'assessed' && (item.gap > 0 || item.currentLevel > 0))
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 4)
    .map(item => ({
      id: `assess:${item.skillId}`,
      kind: 'assess' as const,
      title: `Verify "${item.name}" with an assessment`,
      explanation:
        item.currentLevel > 0
          ? 'You have claimed this skill but it is not yet independently verified. Passing an assessment turns it into evidence the readiness score can count.'
          : 'An assessment is the fastest way to prove this required skill and unlock evidence-based credit.',
      estimatedMinutes: 20,
      priority: mapPriority(item.priorityBadge),
      priorityScore: item.priorityScore,
      skillId: item.skillId,
      skillName: item.name,
      completionCriteria: 'Score at or above the assessment pass mark.',
      route: '/assessments',
      actionLabel: 'Start assessment',
      status: inProgressSkillIds.has(item.skillId) ? 'in_progress' : 'todo',
      sourceId: item.skillId
    }));
}

function buildProjectTasks(userId: string): WarRoomTask[] {
  const tasks: WarRoomTask[] = [];
  for (const project of db.getProjects(userId)) {
    if (project.userStatus !== 'in_progress') continue;
    const nextMilestone = project.milestones?.find(m => !m.completed);
    if (!nextMilestone) continue;
    tasks.push({
      id: `project:${project.id}:${nextMilestone.id}`,
      kind: 'project',
      title: `Next build step: ${nextMilestone.title}`,
      explanation: `${project.title} is in progress. Completing this milestone moves the project toward a verified-evidence artefact. ${nextMilestone.description}`,
      estimatedMinutes: 90,
      priority: 'Medium',
      priorityScore: 55,
      skillName: project.skillsDemonstrated?.[0],
      completionCriteria: nextMilestone.title,
      route: '/projects',
      actionLabel: 'Open project',
      status: 'in_progress',
      sourceId: project.id
    });
  }
  return tasks;
}

function buildAchievements(userId: string): WarRoomAchievement[] {
  const items: WarRoomAchievement[] = [];

  for (const result of db.getAssessments(userId)) {
    if (!result.passed) continue;
    items.push({
      id: `assess-${result.id}`,
      title: `Verified ${result.skillName}`,
      detail: `Passed the assessment with ${result.scorePercentage}%.`,
      timestamp: result.completedAt
    });
  }

  for (const project of db.getProjects(userId)) {
    if (project.userStatus !== 'completed') continue;
    items.push({
      id: `project-${project.id}`,
      title: `Completed ${project.title}`,
      detail: 'Project marked complete — submitting a link adds project evidence.',
      timestamp: project.submittedEvidence?.submittedAt ?? new Date(0).toISOString()
    });
  }

  for (const task of db.getRoadmapTasks(userId)) {
    if (task.status !== 'completed' || !task.completedAt) continue;
    items.push({
      id: `roadmap-${task.id}`,
      title: `Finished ${task.skillName}`,
      detail: task.stageName ? `Roadmap stage: ${task.stageName}.` : 'Roadmap task completed.',
      timestamp: task.completedAt
    });
  }

  return items
    .filter(a => a.timestamp)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .slice(0, 5);
}

function buildWeeklyProgress(userId: string, readinessScore: number, delta: number) {
  const since = Date.now() - WEEK_MS;
  const recent = db.getActivities(userId).filter(a => Date.parse(a.timestamp) >= since);
  const completedHours = round1(recent.reduce((sum, a) => sum + (a.hoursSpent || 0), 0));
  const scheduledHours = db.getProfile(userId)?.weeklyHours ?? 0;

  return {
    completedThisWeek: recent.length,
    scheduledHours,
    completedHours,
    readinessScore,
    readinessDelta: delta
  };
}

export function buildWarRoom(userId: string): CareerWarRoom | null {
  const profile = db.getProfile(userId);
  if (!profile) return null;

  const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];
  const gaps = calculateSkillGaps(profile, role);
  const roadmapBySkillId = new Map(db.getRoadmapTasks(userId).map(t => [t.skillId, t]));

  const readiness = computeReadinessForUser(userId);

  const learnTasks = buildLearnTasks(gaps, roadmapBySkillId);
  const assessTasks = buildAssessmentTasks(userId, gaps);
  const projectTasks = buildProjectTasks(userId);

  const priorityTasks = [...learnTasks, ...assessTasks, ...projectTasks]
    .sort((a, b) => {
      // Unfinished work first, then by priority score.
      const doneA = a.status === 'done' ? 1 : 0;
      const doneB = b.status === 'done' ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB;
      return b.priorityScore - a.priorityScore;
    })
    .slice(0, MAX_PRIORITY_TASKS);

  // todaysMission will be computed after splitting into unfinished/done blocks.

  const pendingAssessments: WarRoomPendingAssessment[] = gaps.items
    .filter(item => item.status !== 'assessed' && item.requiredLevel > 0)
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 5)
    .map(item => ({
      skillId: item.skillId,
      name: item.name,
      priority: item.priorityBadge
    }));

  const projectMilestones: WarRoomProjectMilestone[] = db
    .getProjects(userId)
    .filter(p => p.userStatus === 'in_progress')
    .flatMap(project => {
      const next = project.milestones?.find(m => !m.completed);
      if (!next) return [];
      return [{
        projectId: project.id,
        projectTitle: project.title,
        milestoneId: next.id,
        milestoneTitle: next.title,
        milestoneDescription: next.description
      }];
    });

  const prioritizationNotes = [
    'Tasks are derived from your gap analysis, roadmap, saved projects, and assessment history — there is no separate task list to maintain.',
    'Priority order weights the gap engine\'s priority score first, then whether a task is unfinished.',
    'Completing a task happens on its source page (Roadmap, Assessments, or Projects), so progress is always recorded exactly once.',
    'Today\'s mission is the highest-priority unfinished item.',
    'The top three priorities are the first three unfinished items in that order; nothing is invented to fill the list.'
  ];

  const unfinished = priorityTasks.filter(t => t.status !== 'done');
  const topPriorities = unfinished.slice(0, 3);
  const todaysMission = unfinished[0] ?? null;

  const criticalGaps: WarRoomCriticalGap[] = gaps.items
    .filter(item => item.gap > 0 && (item.priorityBadge === 'Critical' || item.priorityBadge === 'High'))
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 5)
    .map(item => ({
      skillId: item.skillId,
      name: item.name,
      currentLevel: item.currentLevel,
      requiredLevel: item.requiredLevel,
      gap: item.gap,
      priority: item.priorityBadge
    }));

  const incompleteMilestones: WarRoomMilestone[] = db
    .getRoadmapTasks(userId)
    .filter(task => task.status !== 'completed')
    .sort((a, b) => a.stageNumber - b.stageNumber)
    .slice(0, 8)
    .map(task => ({
      taskId: task.id,
      skillId: task.skillId,
      skillName: task.skillName,
      stageName: task.stageName,
      estimatedHours: task.estimatedHours,
      completionPercentage: task.completionPercentage ?? 0
    }));

  const completedTasks: WarRoomTask[] = db
    .getRoadmapTasks(userId)
    .filter(task => task.status === 'completed')
    .sort((a, b) => Date.parse(b.completedAt ?? '') - Date.parse(a.completedAt ?? ''))
    .slice(0, 6)
    .map(task => ({
      id: `learn:${task.skillId}`,
      kind: 'learn' as const,
      title: `Closed the ${task.skillName} gap`,
      explanation: task.stageName ? `Completed roadmap stage: ${task.stageName}.` : 'Roadmap task completed.',
      estimatedMinutes: Math.max(15, Math.round(task.estimatedHours * 60)),
      priority: 'Low' as const,
      priorityScore: 0,
      skillId: task.skillId,
      skillName: task.skillName,
      completionCriteria: task.completionCriteria?.join('; ') || 'Roadmap task completed.',
      route: '/roadmap',
      actionLabel: 'Review roadmap task',
      status: 'done' as const,
      sourceId: task.id
    }));

  const activeGoal: WarRoomActiveGoal | null = profile.targetRole
    ? {
        roleId: role.id,
        roleTitle: role.title,
        currentReadiness: readiness?.readiness.overallScore ?? 0,
        horizon: profile.targetCompletionPeriod ?? null,
        targetCompanies: profile.targetCompanies ?? [],
        remainingCriticalGaps: criticalGaps.length
      }
    : null;

  const recommendedNextAction: WarRoomNextAction | null = todaysMission
    ? {
        taskId: todaysMission.id,
        title: `Next: ${todaysMission.title}`,
        explanation: todaysMission.explanation,
        route: todaysMission.route,
        actionLabel: todaysMission.actionLabel
      }
    : null;

  return {
    userId,
    targetRole: profile.targetRole ? { id: role.id, title: role.title } : null,
    todaysMission,
    topPriorities,
    activeGoal,
    criticalGaps,
    incompleteMilestones,
    completedTasks,
    recommendedNextAction,
    priorityTasks,
    pendingAssessments,
    projectMilestones,
    achievements: buildAchievements(userId),
    weeklyProgress: buildWeeklyProgress(
      userId,
      readiness?.readiness.overallScore ?? 0,
      readiness?.readiness.delta ?? 0
    ),
    generatedAt: new Date().toISOString(),
    prioritizationNotes
  };
}
