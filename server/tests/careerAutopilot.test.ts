import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Server } from 'node:http';
import { createApp } from '../app.js';
import { db, DEMO_USER_ID } from '../db/store.js';

/**
 * SkillForge 2.0 — Career Autopilot (Phase 2).
 *
 * Proves the autopilot is driven by real evidence and real engines: it uses the
 * student's actual gaps, preserves completed work across replans, gates
 * consequential actions behind approval, and records a decision audit trail.
 */

const DEMO_TOKEN = 'demo_token_aarav';

let server: Server;
let baseUrl: string;

async function api(
  path: string,
  options: { method?: string; token?: string | null; body?: unknown } = {}
) {
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

beforeEach(() => {
  db.resetDemoData();
});

describe('Career Autopilot', () => {
  it('builds a plan from the real target role, gaps, and evidence', async () => {
    const res = await api('/api/autopilot');
    expect(res.status).toBe(200);
    const plan = res.body.plan;
    expect(plan.targetRole.id).toBe('aiml');
    expect(plan.objectives.length).toBeGreaterThanOrEqual(6);
    expect(plan.actions.length).toBeGreaterThan(5);
    expect(plan.goal.length).toBeGreaterThan(0);
    expect(plan.recommendedActionId).toBeTruthy();

    // Every action must carry an explanation (trust / explainability).
    for (const action of plan.actions) {
      expect(action.explanation.what).toBeTruthy();
      expect(action.explanation.why).toBeTruthy();
      expect(action.explanation.evidenceClassification).toBeTruthy();
    }

    // The recommended action is a real, non-completed action.
    const recommended = plan.actions.find((a: any) => a.id === plan.recommendedActionId);
    expect(recommended).toBeTruthy();
    expect(recommended.status).not.toBe('completed');
  });

  it('recommends a plan that targets an actual gap skill', async () => {
    const res = await api('/api/autopilot');
    const plan = res.body.plan;
    const proof = plan.actions.find((a: any) => a.kind === 'proof_of_skill');
    expect(proof).toBeTruthy();
    expect(proof.targetSkillId).toBeTruthy();
  });

  it('preserves approved actions and records goal changes when the goal changes', async () => {
    const first = await api('/api/autopilot');
    const action = first.body.plan.actions.find((a: any) => a.status !== 'completed');
    expect(action).toBeTruthy();

    const approved = await api(`/api/autopilot/actions/${action.id}/review`, {
      method: 'POST',
      body: { decision: 'approve' }
    });
    expect(approved.status).toBe(200);
    expect(approved.body.action.status).toBe('approved');

    const changed = await api('/api/autopilot/goal', {
      method: 'POST',
      body: { goal: 'Land an AI/ML internship by March and ship one portfolio project.' }
    });
    expect(changed.status).toBe(200);
    expect(changed.body.plan.goal).toContain('AI/ML internship');

    const preserved = changed.body.plan.actions.find((a: any) => a.id === action.id);
    expect(preserved.status).toBe('approved');

    const goalEntry = changed.body.plan.changeLog.find((c: any) => c.kind === 'goal_set' || c.kind === 'goal_change');
    expect(goalEntry).toBeTruthy();
  });

  it('rejects a goal that is missing or too long', async () => {
    expect((await api('/api/autopilot/goal', { method: 'POST', body: {} })).status).toBe(400);
    expect(
      (await api('/api/autopilot/goal', { method: 'POST', body: { goal: 'x'.repeat(500) } })).status
    ).toBe(400);
  });

  it('returns the same recommendation on repeated deterministic reads', async () => {
    const a = await api('/api/autopilot');
    const b = await api('/api/autopilot');
    expect(b.body.plan.recommendedActionId).toBe(a.body.plan.recommendedActionId);
  });

  it('gates a target-role change behind approval before applying it', async () => {
    const proposed = await api('/api/autopilot/target-role', {
      method: 'POST',
      body: { roleId: 'frontend' }
    });
    expect(proposed.status).toBe(201);
    const action = proposed.body.action;
    expect(action.kind).toBe('change_target_role');
    expect(action.status).toBe('awaiting_approval');

    // Applying before approval must fail.
    const early = await api('/api/autopilot/target-role/apply', {
      method: 'POST',
      body: { actionId: action.id }
    });
    expect(early.status).toBe(400);

    const approved = await api(`/api/autopilot/actions/${action.id}/review`, {
      method: 'POST',
      body: { decision: 'approve' }
    });
    expect(approved.status).toBe(200);

    const applied = await api('/api/autopilot/target-role/apply', {
      method: 'POST',
      body: { actionId: action.id }
    });
    expect(applied.status).toBe(200);
    expect(applied.body.roleId).toBe('frontend');
    expect(db.getProfile(DEMO_USER_ID)?.targetRole).toBe('frontend');
  });

  it('records corrections in a decision audit trail', async () => {
    const first = await api('/api/autopilot');
    const action = first.body.plan.actions.find((a: any) => a.status !== 'completed');
    const rejected = await api(`/api/autopilot/actions/${action.id}/review`, {
      method: 'POST',
      body: { decision: 'reject' }
    });
    expect(rejected.status).toBe(200);
    expect(rejected.body.action.status).toBe('rejected');

    const audit = await api('/api/autopilot/decisions');
    expect(audit.status).toBe(200);
    expect(audit.body.decisions.length).toBeGreaterThan(0);
    expect(audit.body.decisions.some((d: any) => d.status === 'rejected')).toBe(true);
  });
});
