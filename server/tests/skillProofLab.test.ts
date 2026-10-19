import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Server } from 'node:http';
import { createApp } from '../app.js';
import { db } from '../db/store.js';

/**
 * SkillForge 2.0 — Live Skill Proof Lab (Phase 3/7).
 *
 * Proves the gap-driven challenge uses the student's real skill gap, labels its
 * evaluation method honestly, records durable evidence only on a pass, and links
 * that evidence back into the Career Autopilot.
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

describe('Live Skill Proof Lab', () => {
  it('builds a challenge from the highest-priority real gap', async () => {
    const res = await api('/api/proof-of-skill/gap-challenge');
    expect(res.status).toBe(200);
    const challenge = res.body.challenge;
    expect(challenge.skillId).toBeTruthy();
    expect(challenge.skillName).toBeTruthy();
    expect(challenge.evaluationCriteria.length).toBeGreaterThan(0);
    expect(['curated_static', 'ai_reviewed_rubric', 'rule_checked_rubric']).toContain(
      challenge.evaluationMethod
    );
  });

  it('rejects a weak submission and records no evidence', async () => {
    const res = await api('/api/proof-of-skill/gap-challenge/evaluate', {
      method: 'POST',
      body: { solution: 'idk' }
    });
    expect(res.status).toBe(200);
    expect(res.body.result.passed).toBe(false);
    expect(res.body.result.evidenceRecord).toBeFalsy();

    const evidence = await api('/api/proof-of-skill/evidence');
    const gapEvidence = evidence.body.evidence.filter((e: any) => e.challengeId.startsWith('pos_gap_'));
    expect(gapEvidence.length).toBe(0);
  });

  it('passes a strong submission, records evidence, and labels the method', async () => {
    const challengeRes = await api('/api/proof-of-skill/gap-challenge');
    const challenge = challengeRes.body.challenge;

    // Build a submission that clearly addresses every stated objective plus a
    // code block, so the deterministic structural rubric can pass it.
    const solution = [
      challenge.evaluationCriteria.join('. '),
      'I implemented this and verified the behavior against my own test cases.',
      'Trade-offs: I preferred clarity and a smaller surface area over premature optimization.',
      '```',
      'function example(input) { return input; }',
      '```'
    ].join('\n\n');

    const res = await api('/api/proof-of-skill/gap-challenge/evaluate', {
      method: 'POST',
      body: { solution, skillId: challenge.skillId }
    });
    expect(res.status).toBe(200);
    const result = res.body.result;
    expect(result.passed).toBe(true);
    expect(result.evidenceRecord).toBeTruthy();
    expect(['rule-checked', 'ai-reviewed', 'test-verified']).toContain(result.evidenceClassification);
    // The rubric must state its limitations honestly.
    expect(result.limitations.length).toBeGreaterThan(0);

    // Evidence is durable and tied to the real gap skill.
    const evidence = await api('/api/proof-of-skill/evidence');
    const recorded = evidence.body.evidence.find((e: any) => e.challengeId === result.challengeId);
    expect(recorded).toBeTruthy();
    expect(recorded.skillId).toBe(challenge.skillId);
  });

  it('links a passed gap challenge into the Career Autopilot as completed work', async () => {
    const planRes = await api('/api/autopilot');
    const proofAction = planRes.body.plan.actions.find((a: any) => a.kind === 'proof_of_skill');
    expect(proofAction).toBeTruthy();

    const challengeRes = await api(
      `/api/proof-of-skill/gap-challenge?skillId=${encodeURIComponent(proofAction.targetSkillId)}`
    );
    const challenge = challengeRes.body.challenge;

    const solution = [
      challenge.evaluationCriteria.join('. '),
      'I built the artifact, wrote tests, and documented the trade-offs.',
      '```',
      'const artifact = () => true;',
      '```'
    ].join('\n\n');

    await api('/api/proof-of-skill/gap-challenge/evaluate', {
      method: 'POST',
      body: { solution, skillId: challenge.skillId }
    });

    const after = await api('/api/autopilot');
    const updatedProof = after.body.plan.actions.find((a: any) => a.id === proofAction.id);
    expect(updatedProof.status).toBe('completed');
    expect(updatedProof.recordedEvidence.length).toBeGreaterThan(0);
  });

  it('recommends the next skill to prove', async () => {
    const res = await api('/api/proof-of-skill/next-challenge');
    expect(res.status).toBe(200);
    expect(res.body.next.skillId).toBeTruthy();
    expect(res.body.next.reason).toContain('priority gap');
  });
});
