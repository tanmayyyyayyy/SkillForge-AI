import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server } from 'node:http';
import { createApp } from '../app.js';

/**
 * Subphase 3A/3B — Career Twin AI and Career War Room.
 *
 * Both features are derived views over existing records and the canonical
 * readiness engine. These tests assert the derivation contract (structure,
 * provenance labelling, honest scenario projection, validation, and auth)
 * rather than brittle exact scores.
 */

const DEMO_TOKEN = 'demo_token_aarav';

let server: Server;
let baseUrl: string;

interface ApiResponse {
  status: number;
  body: any;
}

async function api(
  path: string,
  options: { method?: string; token?: string | null; body?: unknown } = {}
): Promise<ApiResponse> {
  const { method = 'GET', token = DEMO_TOKEN, body } = options;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
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
  await new Promise<void>(resolve => server.close(() => resolve()));
});

describe('Career Twin', () => {
  it('requires authentication', async () => {
    const res = await api('/api/career-twin', { token: null });
    expect(res.status).toBe(401);
  });

  it('builds an evidence-based twin consistent with the readiness endpoint', async () => {
    const twinRes = await api('/api/career-twin');
    expect(twinRes.status).toBe(200);

    const twin = twinRes.body.twin;
    expect(twin.identity.targetRoleTitle).toBeTruthy();
    expect(Array.isArray(twin.skills)).toBe(true);
    expect(twin.skills.length).toBeGreaterThan(0);
    expect(typeof twin.disclaimer).toBe('string');
    expect(twin.disclaimer.length).toBeGreaterThan(0);

    const readinessRes = await api('/api/readiness');
    expect(twin.readiness.overallScore).toBe(readinessRes.body.readiness.overallScore);

    const allowedEvidence = ['self-reported', 'assessment', 'project', 'none'];
    const allowedConfidence = ['high', 'medium', 'low'];
    for (const skill of twin.skills) {
      expect(allowedEvidence).toContain(skill.evidenceKind);
      expect(allowedConfidence).toContain(skill.confidence);
      expect(Array.isArray(skill.evidence)).toBe(true);
    }

    // Self-reported / unverified skills must never be implied as verified.
    for (const skill of twin.skills) {
      if (skill.evidenceKind === 'self-reported' || skill.evidenceKind === 'none') {
        expect(skill.confidence).toBe('low');
      }
    }
  });

  it('rejects malformed simulation payloads', async () => {
    const empty = await api('/api/career-twin/simulate', { method: 'POST', body: { scenarios: [] } });
    expect(empty.status).toBe(400);

    const noFocus = await api('/api/career-twin/simulate', {
      method: 'POST',
      body: { scenarios: [{ label: 'x', focusSkillIds: [], weeklyHours: 5, horizonWeeks: 4 }] }
    });
    expect(noFocus.status).toBe(400);

    const badHours = await api('/api/career-twin/simulate', {
      method: 'POST',
      body: { scenarios: [{ label: 'x', focusSkillIds: ['python'], weeklyHours: 0, horizonWeeks: 4 }] }
    });
    expect(badHours.status).toBe(400);

    const tooMany = await api('/api/career-twin/simulate', {
      method: 'POST',
      body: { scenarios: Array.from({ length: 5 }, () => ({ label: 'x', focusSkillIds: ['python'], weeklyHours: 5, horizonWeeks: 4 })) }
    });
    expect(tooMany.status).toBe(400);
  });

  it('projects a scenario deterministically without lowering readiness', async () => {
    const twin = (await api('/api/career-twin')).body.twin;

    const focus = (twin.majorGaps.length > 0
      ? twin.majorGaps.map((g: any) => g.skillId)
      : twin.skills.filter((s: any) => s.requiredLevel !== null).map((s: any) => s.skillId)
    ).slice(0, 3);
    expect(focus.length).toBeGreaterThan(0);

    const res = await api('/api/career-twin/simulate', {
      method: 'POST',
      body: { scenarios: [{ label: 'Focus plan', focusSkillIds: focus, weeklyHours: 12, horizonWeeks: 12 }] }
    });
    expect(res.status).toBe(200);

    const comparison = res.body.comparison;
    expect(comparison.baseReadiness).toBe(twin.readiness.overallScore);
    expect(comparison.scenarios).toHaveLength(1);

    const scenario = comparison.scenarios[0];
    expect(scenario.projectedReadiness).toBeGreaterThanOrEqual(0);
    expect(scenario.projectedReadiness).toBeLessThanOrEqual(100);
    // More skill coverage can never reduce the score.
    expect(scenario.projectedReadiness).toBeGreaterThanOrEqual(comparison.baseReadiness);
    expect(scenario.readinessDelta).toBe(scenario.projectedReadiness - comparison.baseReadiness);
    expect(scenario.assumptions.length).toBeGreaterThan(0);
    for (const projection of scenario.skillsTouched) {
      expect(projection.toLevel).toBeGreaterThanOrEqual(projection.fromLevel);
    }
  });
});

describe('Career War Room', () => {
  it('requires authentication', async () => {
    const res = await api('/api/war-room', { token: null });
    expect(res.status).toBe(401);
  });

  it('derives a prioritised, routable action list from existing records', async () => {
    const res = await api('/api/war-room');
    expect(res.status).toBe(200);

    const warRoom = res.body.warRoom;
    expect(Array.isArray(warRoom.priorityTasks)).toBe(true);
    expect(Array.isArray(warRoom.prioritizationNotes)).toBe(true);
    expect(warRoom.prioritizationNotes.length).toBeGreaterThan(0);
    expect(warRoom.weeklyProgress).toBeDefined();

    // The war room must agree with the canonical readiness score.
    const readinessRes = await api('/api/readiness');
    expect(warRoom.weeklyProgress.readinessScore).toBe(readinessRes.body.readiness.overallScore);

    const allowedKinds = ['learn', 'assess', 'project', 'practice'];
    const allowedStatus = ['todo', 'in_progress', 'done'];
    for (const task of warRoom.priorityTasks) {
      expect(allowedKinds).toContain(task.kind);
      expect(allowedStatus).toContain(task.status);
      // Every task must route back to a real in-app surface.
      expect(typeof task.route).toBe('string');
      expect(task.route.startsWith('/')).toBe(true);
    }

    if (warRoom.todaysMission) {
      expect(warRoom.todaysMission.route.startsWith('/')).toBe(true);
      // Today's mission is always unfinished work.
      expect(warRoom.todaysMission.status).not.toBe('done');
    }

    // Phase 2 additions: top priorities, active goal, critical gaps,
    // incomplete milestones, completed tasks, and a recommended next action.
    expect(Array.isArray(warRoom.topPriorities)).toBe(true);
    expect(warRoom.topPriorities.length).toBeLessThanOrEqual(3);
    for (const t of warRoom.topPriorities) {
      expect(t.status).not.toBe('done');
    }

    expect(Array.isArray(warRoom.criticalGaps)).toBe(true);
    expect(Array.isArray(warRoom.incompleteMilestones)).toBe(true);
    expect(Array.isArray(warRoom.completedTasks)).toBe(true);

    if (warRoom.activeGoal) {
      expect(typeof warRoom.activeGoal.roleTitle).toBe('string');
      expect(typeof warRoom.activeGoal.currentReadiness).toBe('number');
    }

    if (warRoom.recommendedNextAction) {
      expect(warRoom.recommendedNextAction.route.startsWith('/')).toBe(true);
    }
  });
});
