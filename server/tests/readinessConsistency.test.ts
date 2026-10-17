import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Server } from 'node:http';
import { createApp } from '../app.js';
import { db } from '../db/store.js';
import { ASSESSMENTS } from '../data/assessments.js';

/**
 * Subphase 2F: dynamic readiness, consistency & delta integrity.
 *
 * The dashboard (`GET /api/readiness`) and the official report
 * (`GET /api/readiness/report`) must always agree on the canonical score,
 * breakdown, and delta, and simply opening a page must never invent progress.
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

async function passAssessment(skillId: string): Promise<void> {
  const assessment = ASSESSMENTS.find(a => a.skillId === skillId);
  if (!assessment) throw new Error(`No assessment seed for ${skillId}`);
  const answers: Record<string, number> = {};
  for (const q of assessment.questions) answers[q.id] = q.correctOptionIndex;
  const res = await api(`/api/assessments/${skillId}/submit`, { method: 'POST', body: { answers } });
  if (res.status !== 200 || !res.body.result?.passed) {
    throw new Error(`Failed to pass assessment ${skillId}: ${JSON.stringify(res.body)}`);
  }
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

describe('Subphase 2F: readiness consistency & delta integrity', () => {
  it('opening the dashboard/report repeatedly does not change the score or invent a delta', async () => {
    const readings = [];
    for (let i = 0; i < 4; i += 1) {
      const res = await api('/api/readiness');
      expect(res.status).toBe(200);
      readings.push(res.body.readiness);
    }

    const first = readings[0];
    for (const reading of readings) {
      expect(reading.overallScore).toBe(first.overallScore);
      expect(reading.delta).toBe(0);
      expect(reading.previousScore).toBe(0);
    }
  });

  it('reports a delta against the previous recorded score, not against an older entry', async () => {
    const initial = await api('/api/readiness');
    const score0 = initial.body.readiness.overallScore;

    await passAssessment('sql');

    const afterChange = await api('/api/readiness');
    expect(afterChange.body.readiness.overallScore).toBeGreaterThan(score0);
    expect(afterChange.body.readiness.previousScore).toBe(score0);
    expect(afterChange.body.readiness.delta).toBe(afterChange.body.readiness.overallScore - score0);

    // Re-reading the same unchanged state must not fabricate a new delta.
    const repeat = await api('/api/readiness');
    expect(repeat.body.readiness.delta).toBe(afterChange.body.readiness.delta);
    expect(repeat.body.history).toEqual(afterChange.body.history);
  });

  it('returns an identical score, breakdown, and delta from the dashboard and report endpoints', async () => {
    await api('/api/readiness');
    await passAssessment('sql');

    const dash = await api('/api/readiness');
    const report = await api('/api/readiness/report');

    expect(report.status).toBe(200);
    expect(dash.body.readiness.overallScore).toBe(report.body.report.readiness.overallScore);
    expect(dash.body.readiness.breakdown).toEqual(report.body.report.readiness.breakdown);
    expect(dash.body.readiness.previousScore).toBe(report.body.report.readiness.previousScore);
    expect(dash.body.readiness.delta).toBe(report.body.report.readiness.delta);
  });

  it('agrees regardless of which page is opened first', async () => {
    await passAssessment('sql');

    const reportFirst = await api('/api/readiness/report');
    const dashSecond = await api('/api/readiness');

    expect(dashSecond.body.readiness.overallScore).toBe(reportFirst.body.report.readiness.overallScore);
    expect(dashSecond.body.readiness.delta).toBe(reportFirst.body.report.readiness.delta);
  });

  it('returns a readiness report evidence breakdown that distinguishes provenance', async () => {
    const report = await api('/api/readiness/report');
    expect(report.status).toBe(200);
    const breakdown = report.body.report.evidenceBreakdown;
    expect(breakdown).toBeDefined();
    expect(breakdown.assessed).toBeGreaterThanOrEqual(1);
    expect(breakdown.selfReported).toBeGreaterThanOrEqual(0);
    expect(breakdown.projectVerified).toBeGreaterThanOrEqual(0);
    expect(breakdown.unverified).toBeGreaterThanOrEqual(0);
  });
});
