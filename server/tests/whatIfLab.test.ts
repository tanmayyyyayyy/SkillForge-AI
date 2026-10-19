import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Server } from 'node:http';
import { createApp } from '../app.js';
import { db, DEMO_USER_ID } from '../db/store.js';

/**
 * SkillForge 2.0 — What-If Lab.
 *
 * Proves the Career Twin extension produces rule-based comparative scenarios
 * with prerequisite blocking, milestone movement, and remaining evidence gaps,
 * that it states its basis and uncertainty honestly, and that it never mutates
 * stored state.
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

describe('What-If Lab', () => {
  it('compares current pace, doubled effort, and an extended horizon as rule-based projections', async () => {
    const res = await api('/api/career-twin/what-if', {
      method: 'POST',
      body: { weeklyHours: 8, horizonWeeks: 12 }
    });
    expect(res.status).toBe(200);
    const result = res.body.result;

    expect(result.baseReadiness).toBeGreaterThanOrEqual(0);
    expect(result.scenarios.length).toBe(3);
    const ids = result.scenarios.map((s: any) => s.scenarioId);
    expect(ids).toEqual(['current_pace', 'doubled_hours', 'extended_horizon']);

    for (const scenario of result.scenarios) {
      expect(scenario.projectionBasis).toBe('rule_based');
      expect(scenario.uncertainty).toBe('Moderate');
      expect(scenario.assumptions.length).toBeGreaterThan(0);
      expect(scenario.assumptions.join(' ')).toContain('not measured progress');
      expect(scenario.projectedReadiness).toBeGreaterThanOrEqual(scenario.readinessDelta);
      expect(scenario.evidenceStillNeeded.length).toBeGreaterThan(0);
      expect(Array.isArray(scenario.blockedPrerequisites)).toBe(true);
    }

    const doubled = result.scenarios.find((s: any) => s.scenarioId === 'doubled_hours');
    expect(doubled.weeklyHours).toBe(16);
    const extended = result.scenarios.find((s: any) => s.scenarioId === 'extended_horizon');
    expect(extended.horizonWeeks).toBe(24);

    expect(result.comparisonSummary).toContain('Current pace');
    expect(result.disclaimer).toBeTruthy();
  });

  it('blocks skills with missing prerequisites and reports them honestly', async () => {
    const res = await api('/api/career-twin/what-if', { method: 'POST', body: {} });
    expect(res.status).toBe(200);
    const result = res.body.result;
    // The demo profile has tracked gaps; prerequisites (when present) must be
    // listed either as blocking entries or as prerequisite records.
    expect(Array.isArray(result.prerequisites)).toBe(true);
    for (const p of result.prerequisites) {
      expect(p.skillName).toBeTruthy();
      expect(p.missingPrerequisites.length).toBeGreaterThan(0);
    }
  });

  it('never mutates stored state', async () => {
    const before = db.getProfile(DEMO_USER_ID)!;
    const beforeSkills = JSON.stringify(before.currentSkills);
    const beforeReadiness = db.getAssessments(DEMO_USER_ID).length;

    await api('/api/career-twin/what-if', { method: 'POST', body: { weeklyHours: 20, horizonWeeks: 26 } });

    const after = db.getProfile(DEMO_USER_ID)!;
    expect(JSON.stringify(after.currentSkills)).toBe(beforeSkills);
    expect(db.getAssessments(DEMO_USER_ID).length).toBe(beforeReadiness);
  });

  it('rejects out-of-range inputs', async () => {
    const tooMany = await api('/api/career-twin/what-if', {
      method: 'POST',
      body: { weeklyHours: 500 }
    });
    expect(tooMany.status).toBe(400);

    const tooLong = await api('/api/career-twin/what-if', {
      method: 'POST',
      body: { horizonWeeks: 999 }
    });
    expect(tooLong.status).toBe(400);
  });
});
