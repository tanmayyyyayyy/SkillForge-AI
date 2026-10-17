import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Server } from 'node:http';
import { createApp } from '../app.js';
import { db } from '../db/store.js';

/**
 * Subphase 2F: evidence integrity & duplicate-credit prevention.
 *
 * Proves that:
 *   - a self-reported URL never force-completes milestones or inflates proficiency;
 *   - project credit is only awarded once the milestone chain is complete;
 *   - completed projects are never downgraded;
 *   - milestone and evidence activities are credited at most once per real transition.
 */

const DEMO_TOKEN = 'demo_token_aarav';
const PROJECT_ID = 'proj_aiml_rag';

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

async function getProject(): Promise<any> {
  const res = await api('/api/projects');
  return res.body.projects.find((p: any) => p.id === PROJECT_ID);
}

async function getProfileSkill(skillId: string): Promise<any> {
  const res = await api('/api/profile');
  return res.body.profile.currentSkills.find((s: any) => s.skillId === skillId);
}

async function getActivitiesCount(): Promise<number> {
  const res = await api('/api/activities');
  return res.body.activities.length;
}

async function submitEvidence(repoUrl: string): Promise<ApiResponse> {
  return api(`/api/projects/${PROJECT_ID}/evidence`, { method: 'POST', body: { repoUrl } });
}

async function completeAllMilestones(): Promise<void> {
  const project = await getProject();
  for (const milestone of project.milestones) {
    if (!milestone.completed) {
      const res = await api(`/api/projects/${PROJECT_ID}/milestones/${milestone.id}`, {
        method: 'PATCH',
        body: { completed: true }
      });
      expect(res.status).toBe(200);
    }
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

describe('Subphase 2F: evidence integrity', () => {
  it('records a self-reported URL without force-completing milestones or inflating skills', async () => {
    const project = await getProject();
    expect(project.milestones.every((m: any) => m.completed)).toBe(false);
    const before = await getProfileSkill('llm_rag');

    const res = await submitEvidence('https://github.com/student/rag-pipeline');

    expect(res.status).toBe(200);
    expect(res.body.awarded).toBe(false);
    expect(res.body.project.submittedEvidence.repoUrl).toBe('https://github.com/student/rag-pipeline');
    expect(res.body.project.userStatus).toBe('in_progress');
    // Milestones must not be silently completed by submitting a link.
    expect(res.body.project.milestones.every((m: any) => m.completed)).toBe(false);

    const after = await getProfileSkill('llm_rag');
    expect(after.status).not.toBe('verified_project');
    expect(after.proficiency).toBe(before.proficiency);
  });

  it('awards project evidence credit only once the milestone chain is complete', async () => {
    const before = await api('/api/readiness');
    const bonusBefore = before.body.readiness.breakdown.projectEvidenceBonus;

    await completeAllMilestones();
    const res = await submitEvidence('https://github.com/student/rag-pipeline');

    expect(res.status).toBe(200);
    expect(res.body.awarded).toBe(true);
    expect(res.body.milestoneChainComplete).toBe(true);
    expect(res.body.project.userStatus).toBe('completed');

    const skill = await getProfileSkill('llm_rag');
    expect(skill.status).toBe('verified_project');
    // Evidence never fabricates a proficiency level.
    expect(skill.proficiency).toBe(0);

    const after = await api('/api/readiness');
    expect(after.body.readiness.breakdown.projectEvidenceBonus).toBeGreaterThan(bonusBefore);
  });

  it('never downgrades an awarded project when a milestone is unchecked', async () => {
    await completeAllMilestones();
    await submitEvidence('https://github.com/student/rag-pipeline');

    const firstMilestone = (await getProject()).milestones[0];
    const res = await api(`/api/projects/${PROJECT_ID}/milestones/${firstMilestone.id}`, {
      method: 'PATCH',
      body: { completed: false }
    });

    expect(res.status).toBe(200);
    expect(res.body.project.userStatus).toBe('completed');
  });

  it('credits a milestone activity only on the completing transition', async () => {
    const milestone = (await getProject()).milestones.find((m: any) => !m.completed);
    const before = await getActivitiesCount();

    await api(`/api/projects/${PROJECT_ID}/milestones/${milestone.id}`, {
      method: 'PATCH',
      body: { completed: true }
    });
    const afterComplete = await getActivitiesCount();
    expect(afterComplete).toBe(before + 1);

    // Re-saving the same completed state must not add another credited activity.
    await api(`/api/projects/${PROJECT_ID}/milestones/${milestone.id}`, {
      method: 'PATCH',
      body: { completed: true }
    });
    expect(await getActivitiesCount()).toBe(afterComplete);
  });

  it('credits an evidence submission activity at most once', async () => {
    const before = await getActivitiesCount();

    await submitEvidence('https://github.com/student/rag');
    const afterFirst = await getActivitiesCount();
    expect(afterFirst).toBe(before + 1);

    await submitEvidence('https://github.com/student/rag-updated');
    expect(await getActivitiesCount()).toBe(afterFirst);
  });
});
