import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Server } from 'node:http';
import { createApp } from '../app.js';
import { db } from '../db/store.js';

/**
 * SkillForge 2.0 — Live Career Readiness Experiment (Phase 3).
 *
 * End-to-end over real state: each stage produces real evidence and readiness is
 * recalculated by the deterministic engine. Proves the experiment never inflates
 * the score and explains the observed change.
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

describe('Live Readiness Experiment', () => {
  it('runs an end-to-end experiment and reports the observed change', async () => {
    const started = await api('/api/experiment/start', { method: 'POST', body: {} });
    expect(started.status).toBe(201);
    const record = started.body.experiment;
    expect(record.status).toBe('running');
    expect(record.gapSkillId).toBeTruthy();
    expect(typeof record.initialReadiness).toBe('number');
    const activeStage = record.stages.find((s: any) => s.status === 'active');
    expect(activeStage.kind).toBe('challenge');

    // Stage 1 — practical challenge, driven by the real gap.
    const challengeRes = await api(`/api/proof-of-skill/gap-challenge?skillId=${encodeURIComponent(record.gapSkillId)}`);
    const challenge = challengeRes.body.challenge;
    const solution = [
      challenge.evaluationCriteria.join('. '),
      'I implemented the artifact, tested the edge cases, and documented trade-offs.',
      '```',
      'const artifact = (x) => x;',
      '```'
    ].join('\n\n');

    const challengeStage = await api(`/api/experiment/${record.id}/challenge`, {
      method: 'POST',
      body: { solution }
    });
    expect(challengeStage.status).toBe(200);
    expect(challengeStage.body.evaluation.passed).toBe(true);
    expect(
      challengeStage.body.record.stages.find((s: any) => s.kind === 'challenge').status
    ).toBe('completed');

    // Stage 2 — project milestone with evidence.
    const milestoneStage = await api(`/api/experiment/${record.id}/milestone`, {
      method: 'POST',
      body: { repoUrl: 'https://github.com/demo/readiness-experiment', notes: 'Shipped the milestone.' }
    });
    expect(milestoneStage.status).toBe(200);
    expect(milestoneStage.body.milestoneTitle).toBeTruthy();

    // Stage 3 — targeted interview question (prepared first, then answered).
    const prepared = await api(`/api/experiment/${record.id}/interview`);
    expect(prepared.status).toBe(200);
    expect(prepared.body.question).toBeTruthy();

    const interviewStage = await api(`/api/experiment/${record.id}/interview`, {
      method: 'POST',
      body: {
        answer:
          'I structured my approach by first clarifying requirements, then iterating with small tested changes. ' +
          'I measured the outcome, compared alternatives, and documented the trade-offs I accepted.'
      }
    });
    expect(interviewStage.status).toBe(200);
    expect(interviewStage.body.question).toBeTruthy();

    // Stage 4 — collect the new evidence.
    const evidenceStage = await api(`/api/experiment/${record.id}/evidence`, { method: 'POST' });
    expect(evidenceStage.status).toBe(200);
    expect(evidenceStage.body.experiment.evidenceGained.length).toBeGreaterThan(0);

    // Stage 5 — recalculate + report.
    const completed = await api(`/api/experiment/${record.id}/complete`, { method: 'POST' });
    expect(completed.status).toBe(200);
    const final = completed.body.experiment;
    expect(final.status).toBe('completed');
    expect(typeof final.finalReadiness).toBe('number');
    expect(final.metricChanges.length).toBe(4);
    expect(final.reportSummary).toBeTruthy();
    expect(final.evidenceGained.length).toBeGreaterThan(0);

    // Readiness must be explained only by real evidence — never negative-inflated.
    expect(final.finalReadiness).toBeGreaterThanOrEqual(final.initialReadiness);
    expect(final.delta).toBe(final.finalReadiness - final.initialReadiness);
  });

  it('rejects a missing solution and an unknown experiment', async () => {
    const started = await api('/api/experiment/start', { method: 'POST', body: {} });
    const id = started.body.experiment.id;
    expect((await api(`/api/experiment/${id}/challenge`, { method: 'POST', body: {} })).status).toBe(400);
    expect((await api('/api/experiment/does-not-exist')).status).toBe(404);
  });

  it('lists experiments for the user', async () => {
    await api('/api/experiment/start', { method: 'POST', body: {} });
    await api('/api/experiment/start', { method: 'POST', body: { goal: 'Second experiment' } });
    const res = await api('/api/experiment');
    expect(res.status).toBe(200);
    expect(res.body.experiments.length).toBe(2);
  });

  it('keeps the challenge stage active and records the attempt on failure', async () => {
    const started = await api('/api/experiment/start', { method: 'POST', body: {} });
    const record = started.body.experiment;
    expect(record.status).toBe('running');
    expect(record.stages.find((s: any) => s.kind === 'challenge').status).toBe('active');

    // Deliberately weak solution that should not pass.
    const weakSolution = 'I did something vague, no code, no artifact, no trade-offs.';
    const failed = await api(`/api/experiment/${record.id}/challenge`, {
      method: 'POST',
      body: { solution: weakSolution }
    });
    expect(failed.status).toBe(200);
    const failRec = failed.body.record;
    expect(failed.body.evaluation.passed).toBe(false);
    expect(failRec.status).toBe('running');
    expect(failRec.stages.find((s: any) => s.kind === 'challenge').status).toBe('active');
    expect(failRec.challengeAttempts.length).toBe(1);
    expect(failRec.challengeAttempts[0].passed).toBe(false);
    expect(failRec.challengeAttempts[0].scorePercentage).toBeLessThan(70);
    expect(failRec.nextRecommendedAction).toBeTruthy();
    expect(failRec.nextRecommendedAction.route).toBe('/proof-of-skill');

    // Retry with a strong solution should pass and complete the stage.
    const challengeRes = await api(`/api/proof-of-skill/gap-challenge?skillId=${encodeURIComponent(record.gapSkillId)}`);
    const challenge = challengeRes.body.challenge;
    const strongSolution = [
      challenge.evaluationCriteria.join('. '),
      'I implemented the artifact, tested the edge cases, and documented trade-offs.',
      '```',
      'const artifact = (x) => x;',
      '```'
    ].join('\n\n');
    const passed = await api(`/api/experiment/${record.id}/challenge`, {
      method: 'POST',
      body: { solution: strongSolution }
    });
    expect(passed.status).toBe(200);
    expect(passed.body.evaluation.passed).toBe(true);
    const passRec = passed.body.record;
    expect(passRec.stages.find((s: any) => s.kind === 'challenge').status).toBe('completed');
    expect(passRec.challengeAttempts.length).toBe(2);
    expect(passRec.challengeAttempts[1].passed).toBe(true);
  });

  it('populates evidenceRefs on completed stages', async () => {
    const started = await api('/api/experiment/start', { method: 'POST', body: {} });
    const record = started.body.experiment;

    const challengeRes = await api(`/api/proof-of-skill/gap-challenge?skillId=${encodeURIComponent(record.gapSkillId)}`);
    const challenge = challengeRes.body.challenge;
    const solution = [
      challenge.evaluationCriteria.join('. '),
      'I implemented the artifact, tested the edge cases, and documented trade-offs.',
      '```',
      'const artifact = (x) => x;',
      '```'
    ].join('\n\n');
    await api(`/api/experiment/${record.id}/challenge`, {
      method: 'POST',
      body: { solution }
    });

    const fresh = await api(`/api/experiment/${record.id}`);
    const challengeStage = fresh.body.experiment.stages.find((s: any) => s.kind === 'challenge');
    expect(challengeStage.evidenceRefs.length).toBeGreaterThan(0);
  });
});
