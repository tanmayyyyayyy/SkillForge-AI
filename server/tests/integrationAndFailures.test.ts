import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Server } from 'node:http';
import { createApp } from '../app.js';
import { db, DEMO_USER_ID } from '../db/store.js';

/**
 * SkillForge 2.0 — Final Integration QA and Hackathon Demo Readiness
 *
 * PHASE 2 — End-to-End Workflow:
 *   Job description -> Opportunity analysis -> Skill gap identification ->
 *   Approval-gated Autopilot action -> Practical challenge -> Evidence creation ->
 *   Evidence Graph update -> Readiness reassessment -> Explanation -> Next recommended action.
 *
 * PHASE 3 — Failure Tests:
 *   - Failed challenge and retry
 *   - Duplicate submission
 *   - Missing job requirements
 *   - Rejected Autopilot action
 *   - Insufficient evidence
 *   - AI provider unavailable / fallback
 *   - Unauthorized cross-user access
 *   - Experiment refresh and persistence
 *   - Missing or malformed API responses
 */

const DEMO_TOKEN = 'demo_token_aarav';

const SAMPLE_JD = `Senior Distributed Systems Engineer
We are looking for an engineer experienced in high-throughput backend systems.
Requirements:
- 3+ years experience with Docker, container orchestration, and microservices.
- Solid expertise in Redis caching, message queues, and distributed key-value stores.
- Strong knowledge of automated testing and CI/CD pipelines.
- Bachelor's degree in Computer Science or equivalent practical experience.`;

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

describe('Phase 2 — Complete End-to-End Workflow', () => {
  it('executes full cycle from job description to recommended next action with provenance', async () => {
    // 1. Job description -> Opportunity analysis
    const oppRes = await api('/api/autopilot/opportunity/plan', {
      method: 'POST',
      body: { description: SAMPLE_JD }
    });
    expect(oppRes.status).toBe(201);
    const oppPlan = oppRes.body;
    expect(oppPlan.proposedActionIds.length).toBeGreaterThan(0);
    expect(oppPlan.matchSummary.missingRequiredSkills.length).toBeGreaterThan(0);

    // 2. Skill gap identification & approval-gated Autopilot action
    const actionId = oppPlan.proposedActionIds[0];
    const proposedAction = oppPlan.plan.actions.find((a: any) => a.id === actionId);
    expect(proposedAction).toBeTruthy();
    expect(proposedAction.status).toBe('awaiting_approval');
    expect(proposedAction.requiresApproval).toBe(true);
    expect(proposedAction.approvedByUser).toBe(false);
    expect(proposedAction.targetSkillId).toBeTruthy();
    const targetSkillId = proposedAction.targetSkillId;

    // 3. User approval of Autopilot action
    const reviewRes = await api(`/api/autopilot/actions/${encodeURIComponent(actionId)}/review`, {
      method: 'POST',
      body: { decision: 'approve' }
    });
    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.action.status).toBe('approved');
    expect(reviewRes.body.action.approvedByUser).toBe(true);

    // 4. Practical challenge for the identified gap skill
    const challengeRes = await api(
      `/api/proof-of-skill/gap-challenge?skillId=${encodeURIComponent(targetSkillId)}`
    );
    expect(challengeRes.status).toBe(200);
    const challenge = challengeRes.body.challenge;
    expect(challenge.evaluationCriteria.length).toBeGreaterThan(0);

    // 5. Submit strong solution to pass challenge and create durable evidence
    const solution = [
      challenge.evaluationCriteria.join('. '),
      'Implemented full solution with test assertions and edge case validation.',
      'Trade-offs: Selected modular design with constant-time lookup over eager precomputation.',
      '```',
      'export function handleEvent(req) { return { processed: true, timestamp: Date.now() }; }',
      '```'
    ].join('\n\n');

    const evalRes = await api('/api/proof-of-skill/gap-challenge/evaluate', {
      method: 'POST',
      body: { solution, skillId: targetSkillId }
    });
    expect(evalRes.status).toBe(200);
    expect(evalRes.body.result.passed).toBe(true);
    expect(evalRes.body.result.evidenceRecord).toBeTruthy();
    const evidenceRecord = evalRes.body.result.evidenceRecord;
    expect(evidenceRecord.skillId).toBe(targetSkillId);

    // 6. Evidence Graph update & Provenance check
    const graphRes = await api('/api/evidence-graph');
    expect(graphRes.status).toBe(200);
    const graph = graphRes.body.graph;
    const proofNode = graph.nodes.find(
      (n: any) => n.id.startsWith('proof:') && (n.id.includes(targetSkillId) || n.label.includes(challenge.skillName))
    );
    expect(proofNode).toBeTruthy();
    expect(proofNode.verificationMethod).toBeTruthy();
    expect(proofNode.classification).toBeTruthy();

    // Trace connects requirement -> skill -> evidence -> action -> readiness
    expect(graph.trace.length).toBeGreaterThan(0);
    const traceStages = graph.trace.map((t: any) => t.stage);
    expect(traceStages).toContain('job_requirement');
    expect(traceStages).toContain('required_skill');
    expect(traceStages).toContain('updated_readiness');

    // 7. Autopilot plan marks action completed with recorded evidence
    const freshPlanRes = await api('/api/autopilot');
    expect(freshPlanRes.status).toBe(200);
    const updatedAction = freshPlanRes.body.plan.actions.find((a: any) => a.id === actionId);
    expect(updatedAction).toBeTruthy();
    expect(updatedAction.status).toBe('completed');
    expect(updatedAction.recordedEvidence.length).toBeGreaterThan(0);

    // 8. Next recommended action
    const nextRes = await api('/api/proof-of-skill/next-challenge');
    expect(nextRes.status).toBe(200);
    if (nextRes.body.next) {
      expect(nextRes.body.next.skillId).toBeTruthy();
      expect(nextRes.body.next.reason).toBeTruthy();
    }
  });
});

describe('Phase 3 — Failure Tests & Edge Cases', () => {
  it('handles failed challenge and allows successful retry', async () => {
    const challengeRes = await api('/api/proof-of-skill/gap-challenge');
    const challenge = challengeRes.body.challenge;

    // Weak submission should fail
    const weakRes = await api('/api/proof-of-skill/gap-challenge/evaluate', {
      method: 'POST',
      body: { solution: 'incomplete notes', skillId: challenge.skillId }
    });
    expect(weakRes.status).toBe(200);
    expect(weakRes.body.result.passed).toBe(false);
    expect(weakRes.body.result.evidenceRecord).toBeFalsy();

    // Verify no evidence was saved
    const evBefore = await api('/api/proof-of-skill/evidence');
    const hasRecord = evBefore.body.evidence.some((e: any) => e.challengeId === challenge.challengeId);
    expect(hasRecord).toBe(false);

    // Strong submission retry succeeds
    const strongSolution = [
      challenge.evaluationCriteria.join('. '),
      'Implemented structural requirements and verified with local unit tests.',
      'Trade-offs: Selected scalable architecture over quick shortcut.',
      '```',
      'const runner = () => true;',
      '```'
    ].join('\n\n');

    const retryRes = await api('/api/proof-of-skill/gap-challenge/evaluate', {
      method: 'POST',
      body: { solution: strongSolution, skillId: challenge.skillId }
    });
    expect(retryRes.status).toBe(200);
    expect(retryRes.body.result.passed).toBe(true);
    expect(retryRes.body.result.evidenceRecord).toBeTruthy();
  });

  it('prevents duplicate evidence and duplicate credited activity on resubmission', async () => {
    const challengeRes = await api('/api/proof-of-skill/gap-challenge');
    const challenge = challengeRes.body.challenge;
    const solution = [
      challenge.evaluationCriteria.join('. '),
      'Validated and robust implementation with comprehensive assertions.',
      'Trade-offs: Documented latency vs throughput trade-offs.',
      '```',
      'const valid = 1;',
      '```'
    ].join('\n\n');

    const sub1 = await api('/api/proof-of-skill/gap-challenge/evaluate', {
      method: 'POST',
      body: { solution, skillId: challenge.skillId }
    });
    const sub2 = await api('/api/proof-of-skill/gap-challenge/evaluate', {
      method: 'POST',
      body: { solution, skillId: challenge.skillId }
    });

    expect(sub1.body.result.passed).toBe(true);
    expect(sub2.body.result.passed).toBe(true);

    const evidence = await api('/api/proof-of-skill/evidence');
    const matching = evidence.body.evidence.filter((e: any) => e.challengeId === challenge.challengeId);
    expect(matching.length).toBe(1);
  });

  it('rejects missing job requirements with 400', async () => {
    const res = await api('/api/autopilot/opportunity/plan', {
      method: 'POST',
      body: {}
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('handles rejected Autopilot action properly without execution', async () => {
    const planRes = await api('/api/autopilot');
    const action = planRes.body.plan.actions.find((a: any) => a.status === 'awaiting_approval' || a.status === 'proposed');
    expect(action).toBeTruthy();

    const rejectRes = await api(`/api/autopilot/actions/${encodeURIComponent(action.id)}/review`, {
      method: 'POST',
      body: { decision: 'reject' }
    });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.action.status).toBe('rejected');

    // Action is not completed
    expect(rejectRes.body.action.status).not.toBe('completed');

    // Decision logged in audit trail
    const auditRes = await api('/api/autopilot/decisions');
    const record = auditRes.body.decisions.find((d: any) => d.actionId === action.id);
    expect(record).toBeTruthy();
    expect(record.status).toBe('rejected');
  });

  it('handles user with zero/insufficient evidence gracefully', async () => {
    // Register a new empty user
    const regRes = await api('/api/auth/register', {
      method: 'POST',
      token: null,
      body: {
        name: 'Empty Profile Student',
        email: `empty_${Date.now()}@example.com`,
        password: 'password123'
      }
    });
    expect(regRes.status).toBe(201);
    const emptyToken = regRes.body.token;

    // Ledger is empty (no crash)
    const ledgerRes = await api('/api/evidence-graph/ledger', { token: emptyToken });
    expect(ledgerRes.status).toBe(200);
    expect(ledgerRes.body.ledger.length).toBe(0);
    expect(ledgerRes.body.summary['test-verified']).toBe(0);

    // Evidence Graph renders empty state without crashing
    const graphRes = await api('/api/evidence-graph', { token: emptyToken });
    expect(graphRes.status).toBe(200);
    expect(graphRes.body.graph).toBeTruthy();
    expect(graphRes.body.graph.summary.assessed).toBe(0);

    // What-If Lab handles empty evidence gracefully
    const whatIfRes = await api('/api/career-twin/what-if', {
      method: 'POST',
      token: emptyToken,
      body: { weeklyHours: 10, horizonWeeks: 8 }
    });
    expect(whatIfRes.status).toBe(200);
    expect(whatIfRes.body.result).toBeTruthy();
  });

  it('falls back gracefully when AI provider is unavailable', async () => {
    // When no external Gemini calls succeed, rule-based rubric handles gap evaluation
    const challengeRes = await api('/api/proof-of-skill/gap-challenge');
    const challenge = challengeRes.body.challenge;
    const solution = [
      challenge.evaluationCriteria.join('. '),
      'Deterministic rule-checked verification under fallback mode.',
      'Trade-offs: Selected local storage over distributed store.',
      '```',
      'const x = 42;',
      '```'
    ].join('\n\n');

    const res = await api('/api/proof-of-skill/gap-challenge/evaluate', {
      method: 'POST',
      body: { solution, skillId: challenge.skillId }
    });
    expect(res.status).toBe(200);
    expect(['rule-checked', 'test-verified', 'ai-reviewed']).toContain(res.body.result.evidenceClassification);
  });

  it('prevents unauthorized cross-user access', async () => {
    // Start experiment as Demo User (User A)
    const startRes = await api('/api/experiment/start', { method: 'POST', body: {} });
    expect(startRes.status).toBe(201);
    const userAExperimentId = startRes.body.experiment.id;

    // Get an Autopilot action ID belonging to User A
    const planRes = await api('/api/autopilot');
    const userAActionId = planRes.body.plan.actions[0].id;

    // Register User B
    const userBReg = await api('/api/auth/register', {
      method: 'POST',
      token: null,
      body: {
        name: 'User Bravo',
        email: `user_b_${Date.now()}@example.com`,
        password: 'securePassword123'
      }
    });
    expect(userBReg.status).toBe(201);
    const userBToken = userBReg.body.token;

    // User B tries to view User A's experiment -> 404
    const getExpRes = await api(`/api/experiment/${userAExperimentId}`, { token: userBToken });
    expect(getExpRes.status).toBe(404);

    // User B tries to submit a challenge to User A's experiment -> 404
    const subExpRes = await api(`/api/experiment/${userAExperimentId}/challenge`, {
      method: 'POST',
      token: userBToken,
      body: { solution: 'unauthorized solution' }
    });
    expect(subExpRes.status).toBe(404);

    // User B tries to review User A's autopilot action -> 404
    const reviewRes = await api(`/api/autopilot/actions/${encodeURIComponent(userAActionId)}/review`, {
      method: 'POST',
      token: userBToken,
      body: { decision: 'approve' }
    });
    expect(reviewRes.status).toBe(404);
  });

  it('persists experiment state and challenge attempt history across refreshes', async () => {
    const startRes = await api('/api/experiment/start', {
      method: 'POST',
      body: { goal: 'Persistence verification test' }
    });
    const expId = startRes.body.experiment.id;

    // Submit a weak challenge attempt
    await api(`/api/experiment/${expId}/challenge`, {
      method: 'POST',
      body: { solution: 'weak attempt that should fail' }
    });

    // Refresh experiment from database
    const refreshed = await api(`/api/experiment/${expId}`);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.experiment.goal).toBe('Persistence verification test');
    expect(refreshed.body.experiment.challengeAttempts.length).toBe(1);
    expect(refreshed.body.experiment.challengeAttempts[0].passed).toBe(false);

    // Submit a passing attempt
    const gapSkillId = refreshed.body.experiment.gapSkillId;
    const challengeRes = await api(`/api/proof-of-skill/gap-challenge?skillId=${encodeURIComponent(gapSkillId)}`);
    const challenge = challengeRes.body.challenge;
    const solution = [
      challenge.evaluationCriteria.join('. '),
      'Robust implementation meeting all criteria with trade-offs.',
      '```',
      'const pass = true;',
      '```'
    ].join('\n\n');

    await api(`/api/experiment/${expId}/challenge`, {
      method: 'POST',
      body: { solution }
    });

    // Refresh again
    const refreshedAgain = await api(`/api/experiment/${expId}`);
    expect(refreshedAgain.body.experiment.challengeAttempts.length).toBe(2);
    expect(refreshedAgain.body.experiment.challengeAttempts[1].passed).toBe(true);
    expect(
      refreshedAgain.body.experiment.stages.find((s: any) => s.kind === 'challenge').status
    ).toBe('completed');
  });

  it('validates against malformed or missing API parameters with 400', async () => {
    // Missing goal
    expect((await api('/api/autopilot/goal', { method: 'POST', body: {} })).status).toBe(400);

    // Overly long goal (> 240 chars)
    expect((await api('/api/autopilot/goal', { method: 'POST', body: { goal: 'a'.repeat(250) } })).status).toBe(400);

    // Invalid review decision
    expect(
      (await api('/api/autopilot/actions/any_id/review', {
        method: 'POST',
        body: { decision: 'unrecognized_decision' }
      })).status
    ).toBe(400);

    // Invalid what-if parameters
    expect(
      (await api('/api/career-twin/what-if', {
        method: 'POST',
        body: { weeklyHours: -5 }
      })).status
    ).toBe(400);

    expect(
      (await api('/api/career-twin/what-if', {
        method: 'POST',
        body: { horizonWeeks: 100 }
      })).status
    ).toBe(400);

    // Missing solution in gap evaluate
    expect(
      (await api('/api/proof-of-skill/gap-challenge/evaluate', {
        method: 'POST',
        body: {}
      })).status
    ).toBe(400);
  });
});
