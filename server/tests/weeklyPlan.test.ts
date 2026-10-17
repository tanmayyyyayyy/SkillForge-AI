import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Server } from 'node:http';
import { createApp } from '../app.js';
import { db } from '../db/store.js';
import { signToken } from '../middleware/auth.js';
import { CAREER_ROLES } from '../data/careers.js';
import { generateWeeklyPlan } from '../engine/weeklyPlanEngine.js';
import type {
  StudentProfile,
  RoadmapTask,
  ProjectRecommendation,
  SkillGapItem,
  CareerRole
} from '../../src/types/index.js';

/**
 * Subphase 2I: Intelligent Weekly Learning Planner.
 *
 * The planner derives a deterministic seven-day schedule from canonical data
 * (roadmap tasks + the next incomplete project milestone) within the student's
 * declared availability. It must never invent work, never exceed availability,
 * never lose completed work on regeneration, and never move the readiness score.
 */

const DEMO_TOKEN = 'demo_token_aarav';
const DEMO_USER_ID = 'demo_student_aarav';
const ROLE: CareerRole = CAREER_ROLES[0];

// ---------------------------------------------------------------------------
// Builders for controlled unit tests
// ---------------------------------------------------------------------------

function makeProfile(over: Partial<StudentProfile> = {}): StudentProfile {
  return {
    userId: 'u1',
    fullName: 'Test Student',
    educationLevel: 'Undergraduate',
    degree: 'CS',
    graduationYear: 2027,
    experienceLevel: 'Intermediate',
    weeklyHours: 10,
    preferredLearningStyle: 'Project-based',
    targetCompanies: [],
    targetRole: ROLE.id,
    currentSkills: [],
    existingProjects: [],
    interests: [],
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over
  };
}

function makeGap(over: Partial<SkillGapItem> & { skillId: string }): SkillGapItem {
  return {
    name: over.skillId,
    category: 'General',
    currentLevel: 0,
    requiredLevel: 3,
    gap: 3,
    normalizedGap: 0.6,
    importance: 0.8,
    status: 'unverified',
    priorityScore: 50,
    priorityBadge: 'Medium',
    missingPrerequisites: [],
    estimatedLearningHours: 3,
    reason: '',
    nextRecommendedAction: 'Study the fundamentals.',
    ...over
  };
}

function makeTask(over: Partial<RoadmapTask> & { id: string; skillId: string }): RoadmapTask {
  return {
    userId: 'u1',
    skillName: over.skillId,
    category: 'General',
    stageNumber: 1,
    stageName: 'Foundations',
    whyItMatters: 'Core',
    currentProficiency: 0,
    targetProficiency: 3,
    priority: 'Medium',
    priorityScore: 50,
    estimatedHours: 3,
    prerequisites: [],
    learningResources: [{ title: 'Docs', type: 'doc', url: 'https://example.com', free: true }],
    practiceActivity: 'Practice',
    projectApplication: 'Apply',
    completionCriteria: [],
    status: 'not_started',
    completionPercentage: 0,
    userNotes: '',
    ...over
  };
}

function makeProject(over: Partial<ProjectRecommendation> & { id: string }): ProjectRecommendation {
  return {
    title: 'Test Project',
    difficulty: 'Intermediate',
    skillsDemonstrated: [],
    whyItMatters: 'Practice',
    coreFeatures: [],
    suggestedTechStack: [],
    milestones: [],
    estimatedEffortHours: 20,
    evaluationCriteria: [],
    requiredEvidence: 'A link',
    ...over
  };
}

const NOW = new Date('2026-01-07T10:00:00.000Z'); // Wednesday, week 2026-01-05 … 2026-01-11

function plan(over: {
  profile?: Partial<StudentProfile>;
  role?: CareerRole | undefined;
  gaps?: SkillGapItem[];
  tasks?: RoadmapTask[];
  projects?: ProjectRecommendation[];
}) {
  return generateWeeklyPlan({
    profile: makeProfile(over.profile),
    role: 'role' in over ? over.role : ROLE,
    gaps: over.gaps ?? [],
    roadmapTasks: over.tasks ?? [],
    projects: over.projects ?? [],
    now: NOW
  });
}

// ---------------------------------------------------------------------------
// HTTP harness (integration)
// ---------------------------------------------------------------------------

let server: Server;
let baseUrl: string;
let token = DEMO_TOKEN;

interface ApiResponse {
  status: number;
  body: any;
}

async function api(
  path: string,
  options: { method?: string; token?: string | null; body?: unknown } = {}
): Promise<ApiResponse> {
  const { method = 'GET', token: tk = token, body } = options;
  const headers: Record<string, string> = {};
  if (tk) headers.Authorization = `Bearer ${tk}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

beforeAll(async () => {
  const app = createApp();
  server = app.listen(0);
  await new Promise<void>(resolve => server.once('listening', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Failed to bind test server.');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  db.resetDemoData();
  await new Promise<void>(resolve => server.close(() => resolve()));
});

beforeEach(() => {
  token = DEMO_TOKEN;
  db.resetDemoData();
});

// ---------------------------------------------------------------------------
// Deterministic generation
// ---------------------------------------------------------------------------

describe('Weekly plan engine — deterministic generation', () => {
  it('produces an identical plan for identical inputs', () => {
    const tasks = [
      makeTask({ id: 'task_a_1', skillId: 'python', priorityScore: 80, priority: 'Critical' }),
      makeTask({ id: 'task_b_2', skillId: 'sql', priorityScore: 60, priority: 'High', stageNumber: 2 })
    ];
    const gaps = [makeGap({ skillId: 'python', priorityScore: 80, estimatedLearningHours: 3 }), makeGap({ skillId: 'sql', priorityScore: 60 })];

    const a = plan({ tasks, gaps });
    const b = plan({ tasks, gaps });

    expect(a.tasks).toEqual(b.tasks);
    expect(a.days).toEqual(b.days);
    expect(a.unscheduled).toEqual(b.unscheduled);
    expect(a.message).toBe(b.message);
  });

  it('anchors the week on Monday and returns seven labelled days', () => {
    const p = plan({ tasks: [makeTask({ id: 'task_a_1', skillId: 'python' })] });
    expect(p.weekStart).toBe('2026-01-05');
    expect(p.weekEnd).toBe('2026-01-11');
    expect(p.days.map(d => d.label)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(p.days.every(d => d.date >= p.weekStart && d.date <= p.weekEnd)).toBe(true);
    expect(p.days.reduce((s, d) => s + d.hours, 0)).toBeCloseTo(p.totalScheduledHours, 5);
  });
});

// ---------------------------------------------------------------------------
// Scheduling rules
// ---------------------------------------------------------------------------

describe('Weekly plan engine — scheduling rules', () => {
  it('never exceeds the declared weekly availability and uses 1–3h sessions', () => {
    const tasks = [1, 2, 3, 4].map(i =>
      makeTask({ id: `task_s${i}_1`, skillId: `skill${i}`, priorityScore: 90 - i })
    );
    const p = plan({ profile: { weeklyHours: 5 }, tasks });

    expect(p.totalScheduledHours).toBeLessThanOrEqual(5);
    expect(p.tasks.every(t => t.estimatedHours >= 1 && t.estimatedHours <= 3)).toBe(true);
    expect(p.unscheduled.length).toBeGreaterThan(0);
    expect(p.unscheduled[0].reason).toContain('weekly');
  });

  it('orders gap work by descending priority score', () => {
    const tasks = [
      makeTask({ id: 'task_lo_1', skillId: 'lo', priorityScore: 40 }),
      makeTask({ id: 'task_hi_1', skillId: 'hi', priorityScore: 90 }),
      makeTask({ id: 'task_mid_1', skillId: 'mid', priorityScore: 60 })
    ];
    const p = plan({ profile: { weeklyHours: 12 }, tasks });
    const scores = p.tasks.filter(t => t.kind === 'skill-gap').map(t => t.priorityScore);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(scores[0]).toBe(90);
  });

  it('breaks priority ties by earlier roadmap stage (dependency order)', () => {
    const tasks = [
      makeTask({ id: 'task_late_2', skillId: 'late', priorityScore: 70, stageNumber: 2 }),
      makeTask({ id: 'task_early_1', skillId: 'early', priorityScore: 70, stageNumber: 1 })
    ];
    const p = plan({ profile: { weeklyHours: 6 }, tasks });
    const gapOrder = p.tasks.filter(t => t.kind === 'skill-gap').map(t => t.skillId);
    expect(gapOrder).toEqual(['early', 'late']);
  });

  it('never schedules a completed roadmap task', () => {
    const tasks = [
      makeTask({ id: 'task_done_1', skillId: 'done', status: 'completed', completionPercentage: 100, completedAt: '2026-01-06T09:00:00.000Z' }),
      makeTask({ id: 'task_todo_1', skillId: 'todo' })
    ];
    const p = plan({ profile: { weeklyHours: 10 }, tasks });
    expect(p.tasks.some(t => t.id === 'task_done_1')).toBe(false);
    expect(p.tasks.some(t => t.id === 'task_todo_1')).toBe(true);
  });

  it('credits only tasks the store marks completed within this week', () => {
    const tasks = [
      makeTask({ id: 'task_w_1', skillId: 'w', status: 'completed', completionPercentage: 100, estimatedHours: 4, completedAt: '2026-01-06T09:00:00.000Z' }),
      makeTask({ id: 'task_old_1', skillId: 'old', status: 'completed', completionPercentage: 100, estimatedHours: 9, completedAt: '2025-12-20T09:00:00.000Z' })
    ];
    const p = plan({ profile: { weeklyHours: 10 }, tasks });
    expect(p.completedThisWeek.map(c => c.id)).toEqual(['task_w_1']);
    expect(p.completedHours).toBe(4);
  });

  it('prevents duplicate tasks for the same roadmap entry', () => {
    const dup = makeTask({ id: 'task_dup_1', skillId: 'dup' });
    const p = plan({ profile: { weeklyHours: 10 }, tasks: [dup, { ...dup }] });
    expect(p.tasks.filter(t => t.id === 'task_dup_1')).toHaveLength(1);
  });

  it('schedules the next incomplete milestone of each active project', () => {
    const projects = [
      makeProject({
        id: 'p1',
        userStatus: 'in_progress',
        milestones: [
          { id: 'm1', title: 'Done', description: '', completed: true },
          { id: 'm2', title: 'Next', description: '', completed: false },
          { id: 'm3', title: 'Later', description: '', completed: false }
        ]
      }),
      makeProject({ id: 'p2', userStatus: 'completed', milestones: [{ id: 'm1', title: 'Done', description: '', completed: false }] })
    ];
    const p = plan({ profile: { weeklyHours: 10 }, projects });

    const milestones = p.tasks.filter(t => t.kind === 'project-milestone');
    expect(milestones).toHaveLength(1);
    expect(milestones[0].id).toBe('ms_p1_m2');
    expect(milestones[0].milestoneId).toBe('m2');
    expect(milestones[0].sourceId).toBe('p1');
    expect(milestones[0].estimatedHours).toBe(2);
  });

  it('explains unscheduled work instead of hiding it', () => {
    const tasks = [1, 2, 3].map(i => makeTask({ id: `task_x${i}_1`, skillId: `x${i}`, priorityScore: 90 - i }));
    const p = plan({ profile: { weeklyHours: 4 }, tasks });
    expect(p.totalCandidates).toBe(3);
    expect(p.unscheduled).toHaveLength(p.totalCandidates - p.tasks.length);
    expect(p.unscheduled.every(u => u.reason.length > 10)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Setup states
// ---------------------------------------------------------------------------

describe('Weekly plan engine — setup states', () => {
  it('returns a setup state when no target role is set', () => {
    const p = plan({ role: undefined, profile: { targetRole: '' } });
    expect(p.state).toBe('no-target-role');
    expect(p.tasks).toHaveLength(0);
    expect(p.message).toMatch(/target career/i);
  });

  it('does not invent availability when weekly hours are zero', () => {
    const p = plan({ profile: { weeklyHours: 0 }, tasks: [makeTask({ id: 'task_a_1', skillId: 'a' })] });
    expect(p.state).toBe('no-availability');
    expect(p.availableHours).toBe(0);
    expect(p.tasks).toHaveLength(0);
    expect(p.message).toMatch(/availability/i);
  });

  it('reports no work when there are no gaps or milestones', () => {
    const p = plan({ profile: { weeklyHours: 10 } });
    expect(p.state).toBe('no-work');
    expect(p.totalCandidates).toBe(0);
    expect(p.message).toMatch(/no new study tasks/i);
  });
});

// ---------------------------------------------------------------------------
// API — reading and regenerating
// ---------------------------------------------------------------------------

describe('Weekly planner API', () => {
  it('rejects unauthenticated access', async () => {
    expect((await api('/api/weekly-plan', { token: null })).status).toBe(401);
    expect((await api('/api/weekly-plan/regenerate', { method: 'POST', token: null })).status).toBe(401);
  });

  it('returns a server-generated plan for the authenticated user', async () => {
    const res = await api('/api/weekly-plan');
    expect(res.status).toBe(200);
    const { plan: p } = res.body;
    expect(p.userId).toBe(DEMO_USER_ID);
    expect(p.state).toBe('ready');
    expect(p.availableHours).toBe(14);
    expect(p.totalScheduledHours).toBeLessThanOrEqual(p.availableHours);
    expect(p.tasks.length).toBeGreaterThan(0);
    expect(p.days).toHaveLength(7);
    expect(p.tasks.every((t: any) => t.day >= 1 && t.day <= 7)).toBe(true);
  });

  it('regenerates the same deterministic schedule', async () => {
    const before = (await api('/api/weekly-plan')).body.plan;
    const res = await api('/api/weekly-plan/regenerate', { method: 'POST', body: {} });
    expect(res.status).toBe(200);
    const after = res.body.plan;
    expect(after.tasks.map((t: any) => t.id)).toEqual(before.tasks.map((t: any) => t.id));
    expect(after.days.map((d: any) => d.hours)).toEqual(before.days.map((d: any) => d.hours));
  });

  it('updates and persists weekly availability from a bounded payload', async () => {
    const res = await api('/api/weekly-plan/regenerate', { method: 'POST', body: { availableHours: 6 } });
    expect(res.status).toBe(200);
    expect(res.body.plan.availableHours).toBe(6);
    expect(res.body.plan.totalScheduledHours).toBeLessThanOrEqual(6);
    expect(db.getProfile(DEMO_USER_ID)?.weeklyHours).toBe(6);
  });

  it('rejects invalid or excessive availability values', async () => {
    for (const bad of [0, -3, 81, 1000, 'ten']) {
      const res = await api('/api/weekly-plan/regenerate', { method: 'POST', body: { availableHours: bad } });
      expect(res.status).toBe(400);
    }
    expect(db.getProfile(DEMO_USER_ID)?.weeklyHours).toBe(14);
  });

  it('tolerates malformed bodies without crashing', async () => {
    const arr = await api('/api/weekly-plan/regenerate', { method: 'POST', body: [1, 2, 3] as unknown });
    expect(arr.status).toBe(200);
    const unknown = await api('/api/weekly-plan/regenerate', { method: 'POST', body: { unknown: true } });
    expect(unknown.status).toBe(200);
  });

  it('isolates plans and progress per user (cross-user protection)', async () => {
    // A second, demo-flagged user so the store's reset removes it afterwards.
    const otherId = 'demo_student_iso_test';
    db.createUser({ id: otherId, name: 'Isolation Test', email: 'iso-test@example.com', createdAt: new Date().toISOString(), isDemo: true });
    db.saveProfile({ ...makeProfile({ userId: otherId, targetRole: 'sde', weeklyHours: 10 }) });
    const otherToken = signToken(otherId, true);

    const demoPlan = (await api('/api/weekly-plan')).body.plan;
    const otherPlan = (await api('/api/weekly-plan', { token: otherToken })).body.plan;

    // The server derives the user from the token, never the client.
    expect(otherPlan.userId).toBe(otherId);
    expect(otherPlan.userId).not.toBe(demoPlan.userId);
    expect(otherPlan.targetRole.id).toBe('sde');

    // Completing work for one user must not change the other user's plan.
    const shared = demoPlan.tasks.find((t: any) => t.kind === 'project-milestone');
    expect(shared).toBeDefined();
    const otherBefore = otherPlan.tasks.map((t: any) => t.id);

    await api(`/api/projects/${shared.sourceId}/milestones/${shared.milestoneId}`, {
      method: 'PATCH',
      body: { completed: true }
    });

    const demoAfter = (await api('/api/weekly-plan')).body.plan;
    const otherAfter = (await api('/api/weekly-plan', { token: otherToken })).body.plan;
    expect(demoAfter.tasks.some((t: any) => t.id === shared.id)).toBe(false);
    expect(otherAfter.tasks.map((t: any) => t.id)).toEqual(otherBefore);
  });
});

// ---------------------------------------------------------------------------
// Task completion persistence & integrity
// ---------------------------------------------------------------------------

describe('Weekly planner — task completion', () => {
  it('persists completion through the canonical roadmap endpoint across refreshes', async () => {
    const first = (await api('/api/weekly-plan')).body.plan;
    const target = first.tasks.find((t: any) => t.source === 'roadmap');
    expect(target).toBeDefined();

    const patch = await api(`/api/roadmap/tasks/${target.id}`, { method: 'PATCH', body: { status: 'completed' } });
    expect(patch.status).toBe(200);

    const after = (await api('/api/weekly-plan')).body.plan;
    expect(after.tasks.some((t: any) => t.id === target.id)).toBe(false);
    expect(after.completedThisWeek.some((c: any) => c.id === target.id)).toBe(true);
    expect(after.completedHours).toBeGreaterThanOrEqual(target.estimatedHours);
  });

  it('does not double-count a repeated completion', async () => {
    const first = (await api('/api/weekly-plan')).body.plan;
    const target = first.tasks.find((t: any) => t.source === 'roadmap');

    await api(`/api/roadmap/tasks/${target.id}`, { method: 'PATCH', body: { status: 'completed' } });
    const once = (await api('/api/weekly-plan')).body.plan.completedHours;
    await api(`/api/roadmap/tasks/${target.id}`, { method: 'PATCH', body: { status: 'completed' } });
    const twice = (await api('/api/weekly-plan')).body.plan.completedHours;

    expect(twice).toBe(once);
  });

  it('rejects an unknown task id without corrupting the plan', async () => {
    const res = await api('/api/roadmap/tasks/task_does_not_exist_9', { method: 'PATCH', body: { status: 'completed' } });
    expect(res.status).toBe(404);
    const after = await api('/api/weekly-plan');
    expect(after.status).toBe(200);
  });

  it('reopening a completed task returns it to the plan', async () => {
    const first = (await api('/api/weekly-plan')).body.plan;
    const target = first.tasks.find((t: any) => t.source === 'roadmap');
    await api(`/api/roadmap/tasks/${target.id}`, { method: 'PATCH', body: { status: 'completed' } });
    await api(`/api/roadmap/tasks/${target.id}`, { method: 'PATCH', body: { status: 'not_started', completionPercentage: 0 } });

    const after = (await api('/api/weekly-plan')).body.plan;
    expect(after.tasks.some((t: any) => t.id === target.id)).toBe(true);
    expect(after.completedThisWeek.some((c: any) => c.id === target.id)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Integration integrity
// ---------------------------------------------------------------------------

describe('Weekly planner — integration integrity', () => {
  it('does not change the readiness score when a plan is generated', async () => {
    const before = (await api('/api/readiness')).body.readiness;
    await api('/api/weekly-plan');
    await api('/api/weekly-plan/regenerate', { method: 'POST', body: {} });
    const after = (await api('/api/readiness')).body.readiness;
    expect(after.overallScore).toBe(before.overallScore);
  });

  it('does not change readiness when a roadmap task is completed', async () => {
    const first = (await api('/api/weekly-plan')).body.plan;
    const target = first.tasks.find((t: any) => t.source === 'roadmap');
    const before = (await api('/api/readiness')).body.readiness.overallScore;
    await api(`/api/roadmap/tasks/${target.id}`, { method: 'PATCH', body: { status: 'completed' } });
    const after = (await api('/api/readiness')).body.readiness.overallScore;
    expect(after).toBe(before);
  });

  it('keeps the Job Description Analyzer and readiness report functional', async () => {
    expect((await api('/api/jd/config')).status).toBe(200);
    expect((await api('/api/readiness/report')).status).toBe(200);
    expect((await api('/api/roadmap')).status).toBe(200);
  });
});
