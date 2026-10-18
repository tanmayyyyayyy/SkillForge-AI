import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server } from 'node:http';
import { createApp } from '../app.js';
import { JD_CONFIG } from '../config.js';

/**
 * Feature 3 — Job Description Intelligence Engine.
 *
 * Saved analyses, preparation plan, and resume alignment all reuse the existing
 * extraction + matching engines and the Resume Truth verdicts. These tests
 * assert the honesty and ownership contract rather than exact scores.
 */

const DEMO_TOKEN = 'demo_token_aarav';

const JD_SAMPLE = `Senior Backend Engineer
TechAxis Solutions Pvt Ltd

About the role:
We are building the data platform behind our payments product and need an engineer who can design reliable services end to end.

Responsibilities:
- Design and build REST APIs consumed by web and mobile clients
- Write production Python services with automated tests
- Model data in PostgreSQL and tune slow queries
- Containerize and ship services through CI/CD

Requirements:
- 2+ years building backend services in Python
- Strong SQL and relational database design
- Experience with Docker and Git-based workflows
- Solid grasp of data structures and algorithms

Nice to have:
- Familiarity with AWS or another cloud platform
- Exposure to Kubernetes
- Experience with system design for scalability`;

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

describe('JD Intelligence Engine — saved analyses', () => {
  it('requires authentication', async () => {
    const res = await api('/api/jd/analyses', { method: 'POST', token: null, body: { description: JD_SAMPLE } });
    expect(res.status).toBe(401);
  });

  it('rejects an empty or oversized description', async () => {
    const empty = await api('/api/jd/analyses', { method: 'POST', body: { description: '' } });
    expect(empty.status).toBe(400);

    const oversized = await api('/api/jd/analyses', {
      method: 'POST',
      body: { description: JD_SAMPLE + 'x'.repeat(JD_CONFIG.maxChars) }
    });
    expect(oversized.status).toBe(413);
  });

  it('analyzes and saves, then lists, fetches, and deletes the analysis', async () => {
    const saved = await api('/api/jd/analyses', {
      method: 'POST',
      body: { description: JD_SAMPLE, title: 'Senior Backend Engineer', company: 'TechAxis' }
    });
    expect(saved.status).toBe(201);
    const record = saved.body.analysis;
    expect(record.id).toBeTruthy();
    expect(record.title).toBe('Senior Backend Engineer');
    expect(record.company).toBe('TechAxis');
    expect(record.analysis.summary).toBeDefined();
    // Source is deterministic when no GEMINI_API_KEY is configured.
    expect(['gemini', 'deterministic']).toContain(record.analysis.source);

    const list = await api('/api/jd/analyses');
    expect(list.status).toBe(200);
    expect(list.body.analyses.some((a: any) => a.id === record.id)).toBe(true);

    const fetched = await api(`/api/jd/analyses/${record.id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.analysis.id).toBe(record.id);

    const del = await api(`/api/jd/analyses/${record.id}`, { method: 'DELETE' });
    expect(del.status).toBe(200);

    const missing = await api(`/api/jd/analyses/${record.id}`);
    expect(missing.status).toBe(404);
  });
});

describe('JD Intelligence Engine — preparation plan', () => {
  it('builds a plan that references only real gaps', async () => {
    const saved = await api('/api/jd/analyses', {
      method: 'POST',
      body: { description: JD_SAMPLE }
    });
    expect(saved.status).toBe(201);
    const record = saved.body.analysis;

    const planRes = await api(`/api/jd/analyses/${record.id}/plan`, { method: 'POST' });
    expect(planRes.status).toBe(200);
    const plan = planRes.body.plan;

    expect(plan.steps.length).toBeGreaterThan(0);
    for (const step of plan.steps) {
      // Only unmet requirements can appear as steps.
      expect(step.state).not.toBe('matched');
      expect(step.route).toMatch(/^\/(roadmap|assessments)$/);
    }
    expect(typeof plan.disclaimer).toBe('string');
    expect(plan.disclaimer.length).toBeGreaterThan(0);
  });
});

describe('JD Intelligence Engine — resume alignment', () => {
  it('classifies requirements without inventing verification', async () => {
    const saved = await api('/api/jd/analyses', { method: 'POST', body: { description: JD_SAMPLE } });
    expect(saved.status).toBe(201);
    const record = saved.body.analysis;

    const aligned = await api(`/api/jd/analyses/${record.id}/alignment`, { method: 'POST' });
    expect(aligned.status).toBe(200);
    const alignment = aligned.body.alignment;

    expect(alignment.items.length).toBeGreaterThan(0);
    for (const item of alignment.items) {
      expect(['evidence-found', 'partial', 'gap', 'not-enough-info']).toContain(item.classification);
      // Every item must carry an actionable next step.
      expect(item.nextAction.length).toBeGreaterThan(0);
    }
    expect(alignment.usedResumeDraft).toBe(false);

    // With a resume draft, verdicts come from the truth engine and never claim
    // verification for a skill that has no evidence.
    const fakeClaim = {
      skills: [{ skillId: 'totally-fake-skill', name: 'Quantum Basket Weaving', category: 'Other', proficiency: 3 }]
    };
    const alignedWithDraft = await api(`/api/jd/analyses/${record.id}/alignment`, {
      method: 'POST',
      body: { resume: fakeClaim }
    });
    expect(alignedWithDraft.status).toBe(200);
    expect(alignedWithDraft.body.alignment.usedResumeDraft).toBe(true);

    const fakeItem = alignedWithDraft.body.alignment.items.find((i: any) => i.skillId === 'totally-fake-skill');
    if (fakeItem) {
      expect(fakeItem.classification).not.toBe('evidence-found');
    }
  });
});
