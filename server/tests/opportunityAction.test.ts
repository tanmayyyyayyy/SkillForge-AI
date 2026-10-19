import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Server } from 'node:http';
import { createApp } from '../app.js';
import { db, DEMO_USER_ID } from '../db/store.js';

/**
 * SkillForge 2.0 — Opportunity-to-Action workflow.
 *
 * Proves an evaluated opportunity match becomes approval-gated Career Autopilot
 * actions for missing required skills, prioritised by Skill Radar, that nothing
 * executes without explicit approval, and that resubmission cannot duplicate
 * the proposals.
 */

const DEMO_TOKEN = 'demo_token_aarav';

const JOB_DESCRIPTION = `Senior Full-Stack Engineer
We are seeking an experienced Full Stack Engineer with strong expertise in TypeScript, React, and Node.js.
Requirements:
- 3+ years experience with modern JavaScript / TypeScript.
- Strong knowledge of REST API development, PostgreSQL, and database design.
- Hands-on experience with automated testing (Vitest / Jest) and CI/CD pipelines.
- Experience with Docker, Redis, and cloud infrastructure is preferred.
- Familiarity with AI model integration and distributed architectures is a plus.`;

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

describe('Opportunity-to-Action workflow', () => {
  it('turns missing required skills into approval-gated autopilot actions', async () => {
    const res = await api('/api/autopilot/opportunity/plan', {
      method: 'POST',
      body: { description: JOB_DESCRIPTION }
    });
    expect(res.status).toBe(201);
    const result = res.body;

    expect(result.proposedActionIds.length).toBeGreaterThan(0);
    expect(result.matchSummary.overallSkillAlignmentPercentage).toBeGreaterThanOrEqual(0);
    expect(result.message).toContain('awaiting your approval');

    for (const actionId of result.proposedActionIds) {
      const action = result.plan.actions.find((a: any) => a.id === actionId);
      expect(action).toBeTruthy();
      expect(action.requiresApproval).toBe(true);
      expect(action.status).toBe('awaiting_approval');
      expect(action.approvedByUser).toBe(false);
      expect(action.kind).toBe('proof_of_skill');
      expect(action.targetSkillId).toBeTruthy();

      const refs = action.explanation.supportingReferences.map((r: any) => r.source);
      expect(refs).toContain('Opportunity Match');
      expect(refs).toContain('Skill Radar');
      expect(action.explanation.ifAccepted).toContain('approval');
      expect(action.explanation.assumptions.length).toBeGreaterThan(0);
    }
  });

  it('does not duplicate proposals on resubmission', async () => {
    const first = await api('/api/autopilot/opportunity/plan', {
      method: 'POST',
      body: { description: JOB_DESCRIPTION }
    });
    const second = await api('/api/autopilot/opportunity/plan', {
      method: 'POST',
      body: { description: JOB_DESCRIPTION }
    });
    expect(second.status).toBe(201);

    const ids = [...first.body.proposedActionIds, ...second.body.proposedActionIds];
    expect(new Set(ids).size).toBe(second.body.proposedActionIds.length);

    const oppActions = second.body.plan.actions.filter((a: any) => a.id.startsWith('ap_opp_'));
    expect(oppActions.length).toBe(second.body.proposedActionIds.length);
  });

  it('requires explicit approval before an action is approved, and records the decision', async () => {
    const proposed = await api('/api/autopilot/opportunity/plan', {
      method: 'POST',
      body: { description: JOB_DESCRIPTION }
    });
    const actionId = proposed.body.proposedActionIds[0];

    const review = await api(`/api/autopilot/actions/${encodeURIComponent(actionId)}/review`, {
      method: 'POST',
      body: { decision: 'approve' }
    });
    expect(review.status).toBe(200);
    expect(review.body.action.status).toBe('approved');
    expect(review.body.action.approvedByUser).toBe(true);

    const decisions = await api('/api/autopilot/decisions');
    const record = decisions.body.decisions.find((d: any) => d.actionId === actionId);
    expect(record).toBeTruthy();
    expect(record.status).toBe('approved');
    expect(record.approvedByUser).toBe(true);
  });

  it('rejects when there is no description and no saved analysis', async () => {
    const res = await api('/api/autopilot/opportunity/plan', {
      method: 'POST',
      body: {}
    });
    expect(res.status).toBe(400);
  });

  it('survives a replan without losing the proposal state', async () => {
    const proposed = await api('/api/autopilot/opportunity/plan', {
      method: 'POST',
      body: { description: JOB_DESCRIPTION }
    });
    const actionId = proposed.body.proposedActionIds[0];

    const replan = await api('/api/autopilot/replan', { method: 'POST' });
    expect(replan.status).toBe(200);
    const action = replan.body.plan.actions.find((a: any) => a.id === actionId);
    expect(action).toBeTruthy();
    expect(action.status).toBe('awaiting_approval');
  });
});
