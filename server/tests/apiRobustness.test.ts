import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Server } from 'node:http';
import { createApp } from '../app.js';
import { db, DEMO_USER_ID } from '../db/store.js';
import { ASSESSMENTS } from '../data/assessments.js';
import { DEFAULT_PROJECTS } from '../data/defaultProjects.js';

/**
 * Subphase 2D: Server API robustness hardening.
 *
 * These tests exercise the real Express stack over HTTP to prove that malformed
 * input is rejected with clean 4xx JSON responses (never 500s / HTML), that
 * unknown API routes 404 as JSON, and that the profile -> roadmap recalculation
 * no longer corrupts persisted roadmap state.
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

describe('Subphase 2D: API robustness & input hardening', () => {
  describe('Routing & auth boundaries', () => {
    it('serves a JSON health check', async () => {
      const res = await api('/api/health', { token: null });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('returns JSON 404 (not HTML) for unknown API endpoints', async () => {
      const res = await api('/api/does-not-exist', { token: null });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'API endpoint not found.' });
    });

    it('rejects unauthenticated requests with 401 JSON', async () => {
      const res = await api('/api/profile', { token: null });
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Unauthorized/i);
    });
  });

  describe('Login input validation', () => {
    it('rejects non-string credentials with 400 instead of crashing', async () => {
      const res = await api('/api/auth/login', {
        method: 'POST',
        token: null,
        body: { email: 123, password: { nested: true } }
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required/i);
    });

    it('rejects empty credentials with 400', async () => {
      const res = await api('/api/auth/login', {
        method: 'POST',
        token: null,
        body: { email: '   ', password: '' }
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Analysis query coercion', () => {
    it('tolerates repeated query params without a 500', async () => {
      const res = await api('/api/analysis?roleId=aiml&roleId=sde');
      expect(res.status).toBe(200);
      expect(res.body.analysis).toBeDefined();
    });

    it('rejects an unsupported role with 404 JSON', async () => {
      const res = await api('/api/analysis?roleId=not_a_role');
      expect(res.status).toBe(404);
    });
  });

  describe('Roadmap task updates', () => {
    it('ignores non-numeric completion values and clamps out-of-range values', async () => {
      const roadmapRes = await api('/api/roadmap');
      expect(roadmapRes.status).toBe(200);
      const taskId = roadmapRes.body.roadmap.stages[0].tasks[0].id as string;

      const badValue = await api(`/api/roadmap/tasks/${taskId}`, {
        method: 'PATCH',
        body: { completionPercentage: 'not-a-number' }
      });
      expect(badValue.status).toBe(200);
      expect(badValue.body.task.completionPercentage).not.toBeNaN();
      expect(badValue.body.task.status).not.toBe('completed');

      const clamped = await api(`/api/roadmap/tasks/${taskId}`, {
        method: 'PATCH',
        body: { completionPercentage: 150 }
      });
      expect(clamped.status).toBe(200);
      expect(clamped.body.task.completionPercentage).toBe(100);
      expect(clamped.body.task.status).toBe('completed');
    });

    it('returns 404 for an unknown task id', async () => {
      const res = await api('/api/roadmap/tasks/task_does_not_exist', {
        method: 'PATCH',
        body: { status: 'completed' }
      });
      expect(res.status).toBe(404);
    });
  });

  describe('Assessment submission validation', () => {
    it('rejects a non-object answers payload with 400', async () => {
      const res = await api('/api/assessments/python/submit', {
        method: 'POST',
        body: { answers: ['a', 'b', 'c'] }
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/object/i);
    });

    it('returns 404 for an unknown assessment skill', async () => {
      const res = await api('/api/assessments/unknown_skill/submit', {
        method: 'POST',
        body: { answers: {} }
      });
      expect(res.status).toBe(404);
    });

    it('grades a fully-correct submission without trusting the client', async () => {
      const assessment = ASSESSMENTS.find(a => a.skillId === 'python')!;
      const answers: Record<string, number> = {};
      for (const q of assessment.questions) {
        answers[q.id] = q.correctOptionIndex;
      }

      const res = await api('/api/assessments/python/submit', {
        method: 'POST',
        body: { answers }
      });

      expect(res.status).toBe(200);
      expect(res.body.result.passed).toBe(true);
      expect(res.body.result.scorePercentage).toBe(100);
    });

    it('treats out-of-range and missing answers as incorrect (no crash)', async () => {
      const assessment = ASSESSMENTS.find(a => a.skillId === 'sql')!;
      const answers: Record<string, unknown> = {};
      answers[assessment.questions[0].id] = 999;
      answers[assessment.questions[1].id] = -1;

      const res = await api('/api/assessments/sql/submit', {
        method: 'POST',
        body: { answers }
      });

      expect(res.status).toBe(200);
      expect(res.body.result.passed).toBe(false);
      expect(res.body.result.answers[0].selectedOptionIndex).toBe(-1);
    });
  });

  describe('Project evidence validation', () => {
    const projectId = DEFAULT_PROJECTS[0].id;

    it('rejects evidence with no links', async () => {
      const res = await api(`/api/projects/${projectId}/evidence`, {
        method: 'POST',
        body: { notes: 'looks good' }
      });
      expect(res.status).toBe(400);
    });

    it('rejects a malformed repository URL', async () => {
      const res = await api(`/api/projects/${projectId}/evidence`, {
        method: 'POST',
        body: { repoUrl: 'javascript:alert(1)' }
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/valid http/i);
    });

    it('accepts a valid repository URL as self-reported evidence without force-completing the project', async () => {
      const res = await api(`/api/projects/${projectId}/evidence`, {
        method: 'POST',
        body: { repoUrl: 'https://github.com/student/project', notes: 'done' }
      });
      expect(res.status).toBe(200);
      expect(res.body.project.submittedEvidence.repoUrl).toBe('https://github.com/student/project');
      // Subphase 2F: evidence alone must not force-complete milestones or inflate status.
      expect(res.body.awarded).toBe(false);
      expect(res.body.project.userStatus).not.toBe('completed');
    });

    it('rejects non-string evidence fields without crashing', async () => {
      const res = await api(`/api/projects/${projectId}/evidence`, {
        method: 'POST',
        body: { repoUrl: { toString: 'nope' }, demoUrl: 42 }
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Profile skill update validation', () => {
    it('rejects a non-integer proficiency with 400', async () => {
      const res = await api('/api/profile/skills', {
        method: 'PATCH',
        body: { skillId: 'react', name: 'React', proficiency: 2.5 }
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/integer/i);
    });

    it('accepts a valid integer proficiency', async () => {
      const res = await api('/api/profile/skills', {
        method: 'PATCH',
        body: { skillId: 'react', name: 'React', proficiency: 3 }
      });
      expect(res.status).toBe(200);
      const updated = res.body.profile.currentSkills.find((s: any) => s.skillId === 'react');
      expect(updated.proficiency).toBe(3);
    });

    it('never escalates a self-reported skill to verified status', async () => {
      const res = await api('/api/profile/skills', {
        method: 'PATCH',
        body: { skillId: 'react', name: 'React', proficiency: 5, status: 'assessed' }
      });
      expect(res.status).toBe(200);
      const updated = res.body.profile.currentSkills.find((s: any) => s.skillId === 'react');
      expect(updated.status).toBe('self-reported');
    });
  });

  describe('Profile -> roadmap recalculation integrity (regression)', () => {
    it('does not corrupt persisted roadmap tasks after a profile update', async () => {
      const update = await api('/api/profile', {
        method: 'PUT',
        body: { fullName: 'Aarav Sharma', targetRole: 'sde' }
      });
      expect(update.status).toBe(200);

      const stored = db.getRoadmapTasks(DEMO_USER_ID);
      expect(Array.isArray(stored)).toBe(true);
      expect(stored.length).toBeGreaterThan(0);
      expect(stored.every(t => typeof t.skillId === 'string')).toBe(true);

      const roadmapRes = await api('/api/roadmap');
      expect(roadmapRes.status).toBe(200);
      expect(roadmapRes.body.roadmap.totalTasks).toBeGreaterThan(0);

      const reportRes = await api('/api/readiness/report');
      expect(reportRes.status).toBe(200);
      expect(reportRes.body.report).toBeDefined();
    });

    it('rejects an unknown target role at the profile boundary', async () => {
      const res = await api('/api/profile', {
        method: 'PUT',
        body: { fullName: 'Aarav Sharma', targetRole: 'cybersecurity' }
      });
      expect(res.status).toBe(400);
    });
  });
});
