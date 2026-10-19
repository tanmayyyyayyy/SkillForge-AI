import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Server } from 'node:http';
import { createApp } from '../app.js';
import { db, DEMO_USER_ID } from '../db/store.js';

/**
 * SkillForge 2.0 — Evidence Intelligence.
 *
 * Proves the canonical evidence ledger exists (source, verification method,
 * classification, timestamp, result, limitations), that nothing is overstated
 * as test-verified, that the Evidence Graph surfaces proof records with real
 * provenance and a traceable chain, and that resubmissions cannot award
 * duplicate credited evidence.
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

describe('Evidence Intelligence ledger', () => {
  it('returns records with source, method, classification, timestamp, result, and limitations', async () => {
    const res = await api('/api/evidence-graph/ledger');
    expect(res.status).toBe(200);
    expect(res.body.ledger.length).toBeGreaterThan(0);
    for (const record of res.body.ledger) {
      expect(record.id).toBeTruthy();
      expect(record.source).toBeTruthy();
      expect(record.sourceLabel).toBeTruthy();
      expect(record.verificationMethod).toBeTruthy();
      expect(record.classification).toBeTruthy();
      expect(record.observedAt).toBeTruthy();
      expect(record.evaluationResult).toBeTruthy();
      expect(Array.isArray(record.limitations)).toBe(true);
      expect(record.limitations.length).toBeGreaterThan(0);
    }
  });

  it('never labels a rubric-graded gap record as test-verified', async () => {
    const challengeRes = await api('/api/proof-of-skill/gap-challenge');
    const challenge = challengeRes.body.challenge;
    const solution = [
      challenge.evaluationCriteria.join('. '),
      'I implemented and verified the behavior against my own tests.',
      'Trade-offs: I preferred clarity over premature optimization.',
      '```',
      'function example(input) { return input; }',
      '```'
    ].join('\n\n');

    const evaluated = await api('/api/proof-of-skill/gap-challenge/evaluate', {
      method: 'POST',
      body: { solution, skillId: challenge.skillId }
    });
    expect(evaluated.status).toBe(200);
    expect(evaluated.body.result.passed).toBe(true);
    const method = evaluated.body.result.evaluationMethod;
    const classification = evaluated.body.result.evidenceClassification;
    if (method !== 'automated_test_runner') {
      expect(classification).not.toBe('test-verified');
    }

    const ledgerRes = await api('/api/evidence-graph/ledger');
    const gapRecord = ledgerRes.body.ledger.find((r: any) => r.source === 'gap_challenge');
    expect(gapRecord).toBeTruthy();
    if (method !== 'automated_test_runner') {
      expect(gapRecord.classification).not.toBe('test-verified');
    }
    expect(gapRecord.sourceRecordId).toBeTruthy();
    expect(gapRecord.limitations.length).toBeGreaterThan(0);
  });

  it('does not award duplicate credited activity on a resubmission', async () => {
    const userId = DEMO_USER_ID;
    const challengeRes = await api('/api/proof-of-skill/gap-challenge');
    const challenge = challengeRes.body.challenge;
    const solution = [
      challenge.evaluationCriteria.join('. '),
      'I implemented and verified the behavior against my own tests with trade-offs.',
      '```',
      'const artifact = () => true;',
      '```'
    ].join('\n\n');

    const submit = () =>
      api('/api/proof-of-skill/gap-challenge/evaluate', {
        method: 'POST',
        body: { solution, skillId: challenge.skillId }
      });

    const first = await submit();
    expect(first.body.result.passed).toBe(true);
    const second = await submit();
    expect(second.body.result.passed).toBe(true);

    const evidence = await api('/api/proof-of-skill/evidence');
    const records = evidence.body.evidence.filter(
      (e: any) => e.challengeId === challenge.challengeId
    );
    expect(records.length).toBe(1);

    const passedActivities = db
      .getActivities(userId)
      .filter(a => a.title.startsWith('Passed Gap Challenge'));
    expect(passedActivities.length).toBe(1);
    const retryActivities = db
      .getActivities(userId)
      .filter(a => a.title.startsWith('Resubmitted Gap Challenge'));
    expect(retryActivities.length).toBe(1);
    expect(retryActivities[0].hoursSpent).toBe(0);
  });
});

describe('Evidence Graph provenance and trace', () => {
  it('populates provenance fields and proof nodes after a real pass', async () => {
    const challengeRes = await api('/api/proof-of-skill/gap-challenge');
    const challenge = challengeRes.body.challenge;
    const solution = [
      challenge.evaluationCriteria.join('. '),
      'I implemented and verified the behavior against my own tests with trade-offs.',
      '```',
      'const artifact = () => true;',
      '```'
    ].join('\n\n');
    await api('/api/proof-of-skill/gap-challenge/evaluate', {
      method: 'POST',
      body: { solution, skillId: challenge.skillId }
    });

    const res = await api('/api/evidence-graph');
    expect(res.status).toBe(200);
    const graph = res.body.graph;

    const proofNodes = graph.nodes.filter((n: any) => n.id.startsWith('proof:'));
    expect(proofNodes.length).toBeGreaterThan(0);
    const proofNode = proofNodes[0];
    expect(proofNode.verificationMethod).toBeTruthy();
    expect(proofNode.classification).toBeTruthy();
    expect(proofNode.confidence).toBeTruthy();
    expect(proofNode.timestamp).toBeTruthy();
    expect(proofNode.provenance).toBeTruthy();

    const assessmentNodes = graph.nodes.filter((n: any) => n.kind === 'assessment');
    for (const node of assessmentNodes) {
      expect(node.verificationMethod).toBeTruthy();
    }

    expect(graph.classificationBreakdown).toBeTruthy();
    expect(typeof graph.classificationBreakdown['self-reported']).toBe('number');
  });

  it('produces a traceable recommendation chain from requirement to readiness', async () => {
    const res = await api('/api/evidence-graph');
    const graph = res.body.graph;
    expect(Array.isArray(graph.trace)).toBe(true);
    expect(graph.trace.length).toBeGreaterThan(0);

    const stages = graph.trace.map((s: any) => s.stage);
    expect(stages).toContain('job_requirement');
    expect(stages).toContain('required_skill');
    expect(stages).toContain('updated_readiness');
    expect(stages.some((s: string) => s === 'existing_evidence' || s === 'evidence_gap')).toBe(true);

    for (const step of graph.trace) {
      expect(step.label).toBeTruthy();
      expect(step.detail).toBeTruthy();
      expect(Array.isArray(step.refIds)).toBe(true);
    }
  });
});

describe('Evidence-backed recommendations', () => {
  it('cites concrete stored evidence in autopilot explanations', async () => {
    const challengeRes = await api('/api/proof-of-skill/gap-challenge');
    const challenge = challengeRes.body.challenge;
    const solution = [
      challenge.evaluationCriteria.join('. '),
      'I implemented and verified the behavior against my own tests with trade-offs.',
      '```',
      'const artifact = () => true;',
      '```'
    ].join('\n\n');
    await api('/api/proof-of-skill/gap-challenge/evaluate', {
      method: 'POST',
      body: { solution, skillId: challenge.skillId }
    });

    const planRes = await api('/api/autopilot');
    expect(planRes.status).toBe(200);
    const actions = planRes.body.plan.actions;
    const withRefs = actions.filter(
      (a: any) => a.explanation.supportingReferences.some((r: any) => r.source.includes('Proof') || r.source.includes('Proof of Skill'))
    );
    expect(withRefs.length).toBeGreaterThan(0);
    const proofAction = actions.find((a: any) => a.kind === 'proof_of_skill');
    expect(proofAction.recordedEvidence.join(' ')).toContain('%');
  });
});
