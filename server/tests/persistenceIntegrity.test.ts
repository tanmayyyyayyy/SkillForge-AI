import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Server } from 'node:http';
import { createApp } from '../app.js';
import { db, DatabaseStore, StorageError, DEMO_USER_ID } from '../db/store.js';
import { signToken } from '../middleware/auth.js';
import { ASSESSMENTS } from '../data/assessments.js';

/**
 * Subphase 2K: Persistence Integrity, API Security & Data Consistency.
 *
 * These tests lock in the guarantees added in this subphase:
 *   - a failed durable write is reported as a failure and never leaves in-memory
 *     state claiming the mutation succeeded;
 *   - multi-step mutations commit as one atomic unit (no partial awards);
 *   - a corrupt store file fails fast instead of being silently re-seeded;
 *   - the test run never reads or writes the real `server/db/data.json`;
 *   - ownership of attempt/project/roadmap state is enforced end to end.
 *
 * Browser-level e2e / accessibility is still not covered by this repo.
 */

const DEMO_TOKEN = 'demo_token_aarav';
const IS_ROOT = typeof process.getuid === 'function' && process.getuid() === 0;

let server: Server;
let baseUrl: string;

interface ApiResponse {
  status: number;
  body: any;
}

async function api(
  route: string,
  options: { method?: string; token?: string | null; body?: unknown } = {}
): Promise<ApiResponse> {
  const { method = 'GET', token = DEMO_TOKEN, body } = options;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${baseUrl}${route}`, {
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

const tempDirs: string[] = [];

/** Isolated store on a throwaway path (never the real data file). */
function makeIsolatedStore(): { store: DatabaseStore; dir: string; filePath: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-store-'));
  tempDirs.push(dir);
  const filePath = path.join(dir, 'data.json');
  const store = new DatabaseStore({ filePath });
  return { store, dir, filePath };
}

/** Makes every future write to this store fail (parent path becomes a file). */
function sabotagePath(filePath: string): void {
  const dir = path.dirname(filePath);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.writeFileSync(dir, 'not-a-directory', 'utf-8');
}

function cleanupTempDirs(): void {
  for (const dir of tempDirs.splice(0)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best effort */
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
  cleanupTempDirs();
});

beforeEach(() => {
  db.resetDemoData();
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanupTempDirs();
});

describe('Subphase 2K: persistence integrity', () => {
  describe('test isolation from the real store', () => {
    it('runs every test against a throwaway file, never server/db/data.json', () => {
      const productionPath = path.resolve('server/db/data.json');
      expect(db.getStoragePath()).not.toBe(productionPath);
      expect(db.getStoragePath().startsWith(os.tmpdir())).toBe(true);
    });
  });

  describe('failed writes propagate instead of reporting false success', () => {
    it('throws StorageError and does not leave memory claiming the save succeeded', () => {
      const { store, filePath } = makeIsolatedStore();
      const pristine = store.getProfile(DEMO_USER_ID)!;
      expect(pristine.weeklyHours).toBe(14);

      sabotagePath(filePath);

      expect(() => store.saveProfile({ ...pristine, weeklyHours: 99 })).toThrow(StorageError);
      // In-memory state was rolled back, so the failed save is not "successful".
      expect(store.getProfile(DEMO_USER_ID)?.weeklyHours).toBe(14);
    });

    it('rolls the whole transaction back when a step fails', () => {
      const { store, filePath } = makeIsolatedStore();
      const before = fs.readFileSync(filePath, 'utf-8');
      const pristine = store.getProfile(DEMO_USER_ID)!;

      expect(() =>
        store.transaction(() => {
          store.saveProfile({ ...pristine, weeklyHours: 99 });
          store.recordReadinessScore(DEMO_USER_ID, 123);
          throw new Error('simulated step failure');
        })
      ).toThrow('simulated step failure');

      expect(store.getProfile(DEMO_USER_ID)?.weeklyHours).toBe(14);
      expect(store.getReadinessHistory(DEMO_USER_ID)).toEqual([]);
      // Nothing reached disk either, so no partial write exists.
      expect(fs.readFileSync(filePath, 'utf-8')).toBe(before);
    });

    it.skipIf(IS_ROOT)(
      'leaves the persisted file byte-identical when the flush itself fails (disk unwritable)',
      () => {
        const { store, dir, filePath } = makeIsolatedStore();
        const before = fs.readFileSync(filePath, 'utf-8');
        const pristine = store.getProfile(DEMO_USER_ID)!;

        fs.chmodSync(dir, 0o555); // read-only directory: temp file cannot be created
        try {
          expect(() => store.saveProfile({ ...pristine, weeklyHours: 99 })).toThrow(StorageError);
        } finally {
          fs.chmodSync(dir, 0o755);
        }

        expect(store.getProfile(DEMO_USER_ID)?.weeklyHours).toBe(14);
        expect(fs.readFileSync(filePath, 'utf-8')).toBe(before);
      }
    );

    it.skipIf(IS_ROOT)(
      'stays atomic on later transactions after a failed flush (no depth corruption)',
      () => {
        const { store, dir, filePath } = makeIsolatedStore();
        const pristine = store.getProfile(DEMO_USER_ID)!;

        // First, force a flush failure.
        fs.chmodSync(dir, 0o555);
        try {
          expect(() =>
            store.transaction(() => {
              store.saveProfile({ ...pristine, weeklyHours: 99 });
            })
          ).toThrow(StorageError);
        } finally {
          fs.chmodSync(dir, 0o755);
        }

        // A subsequent failing transaction must still be fully atomic: the first
        // step must not leak to disk before the second step fails.
        expect(() =>
          store.transaction(() => {
            store.saveProfile({ ...pristine, weeklyHours: 88 });
            throw new Error('later failure');
          })
        ).toThrow('later failure');

        expect(store.getProfile(DEMO_USER_ID)?.weeklyHours).toBe(pristine.weeklyHours);
        const onDisk = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        expect(onDisk.profiles[DEMO_USER_ID].weeklyHours).toBe(pristine.weeklyHours);
      }
    );

    it('never leaves orphaned temp files behind a successful atomic write', () => {
      const { store, dir, filePath } = makeIsolatedStore();
      const pristine = store.getProfile(DEMO_USER_ID)!;

      store.saveProfile({ ...pristine, weeklyHours: 20 });

      expect(fs.readdirSync(dir)).toEqual(['data.json']);
      expect(() => JSON.parse(fs.readFileSync(filePath, 'utf-8'))).not.toThrow();
      expect(store.getProfile(DEMO_USER_ID)?.weeklyHours).toBe(20);
    });
  });

  describe('multi-step mutations commit as one atomic unit', () => {
    it('does not award assessment credit when a later step of the submission fails', async () => {
      const assessment = ASSESSMENTS.find(a => a.skillId === 'python')!;
      const answers: Record<string, number> = {};
      for (const q of assessment.questions) answers[q.id] = q.correctOptionIndex;

      const historyBefore = db.getAssessmentHistory(DEMO_USER_ID).length;
      const activitiesBefore = db.getActivities(DEMO_USER_ID).length;
      const skillBefore = db.getProfile(DEMO_USER_ID)!.currentSkills.find(s => s.skillId === 'python')!;

      const start = await api('/api/assessments/python/attempts', { method: 'POST' });
      expect(start.status).toBe(201);
      const attemptId = start.body.attempt.id as string;

      const diskPath = db.getStoragePath();
      const diskBefore = fs.readFileSync(diskPath, 'utf-8');

      vi.spyOn(db, 'logActivity').mockImplementation(() => {
        throw new Error('simulated storage failure');
      });

      const res = await api(`/api/assessments/attempts/${attemptId}/submit`, {
        method: 'POST',
        body: { answers }
      });

      expect(res.status).toBe(500);

      // No credit: history, activity log, profile evidence, and the attempt
      // transition were all rolled back together.
      expect(db.getAssessmentHistory(DEMO_USER_ID).length).toBe(historyBefore);
      expect(db.getActivities(DEMO_USER_ID).length).toBe(activitiesBefore);
      const skillAfter = db.getProfile(DEMO_USER_ID)!.currentSkills.find(s => s.skillId === 'python')!;
      expect(skillAfter.assessmentScore).toBe(skillBefore.assessmentScore);
      expect(skillAfter.lastAssessedAt).toBe(skillBefore.lastAssessedAt);
      expect(db.getAssessmentAttempt(DEMO_USER_ID, attemptId)?.status).toBe('in_progress');
      // Disk never received a partial write.
      expect(fs.readFileSync(diskPath, 'utf-8')).toBe(diskBefore);
    });

    it('reports a legacy-submit storage failure as 500 and appends nothing', async () => {
      const assessment = ASSESSMENTS.find(a => a.skillId === 'react')!;
      const answers: Record<string, number> = {};
      for (const q of assessment.questions) answers[q.id] = q.correctOptionIndex;

      const historyBefore = db.getAssessmentHistory(DEMO_USER_ID).length;

      vi.spyOn(db, 'saveAssessmentResult').mockImplementation(() => {
        throw new Error('simulated storage failure');
      });

      const res = await api('/api/assessments/react/submit', {
        method: 'POST',
        body: { answers }
      });

      expect(res.status).toBe(500);
      expect(db.getAssessmentHistory(DEMO_USER_ID).length).toBe(historyBefore);
    });

    it('completes the same submission normally once storage recovers', async () => {
      const assessment = ASSESSMENTS.find(a => a.skillId === 'python')!;
      const answers: Record<string, number> = {};
      for (const q of assessment.questions) answers[q.id] = q.correctOptionIndex;

      const start = await api('/api/assessments/python/attempts', { method: 'POST' });
      const attemptId = start.body.attempt.id as string;
      const historyBefore = db.getAssessmentHistory(DEMO_USER_ID).length;

      const res = await api(`/api/assessments/attempts/${attemptId}/submit`, {
        method: 'POST',
        body: { answers }
      });

      expect(res.status).toBe(200);
      expect(res.body.result.passed).toBe(true);
      expect(db.getAssessmentHistory(DEMO_USER_ID).length).toBe(historyBefore + 1);
      expect(db.getAssessmentAttempt(DEMO_USER_ID, attemptId)?.status).toBe('graded');
    });
  });

  describe('readiness and report consistency', () => {
    it('surfaces a readiness persistence failure as 500 instead of silently succeeding', async () => {
      vi.spyOn(db, 'recordReadinessScore').mockImplementation(() => {
        throw new Error('simulated storage failure');
      });

      const res = await api('/api/readiness');
      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/readiness/i);
    });
  });

  describe('store file integrity & recovery', () => {
    it('fails fast on a corrupt store file without overwriting it', () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-corrupt-'));
      tempDirs.push(dir);
      const filePath = path.join(dir, 'data.json');
      fs.writeFileSync(filePath, '{ this is not valid json', 'utf-8');

      expect(() => new DatabaseStore({ filePath })).toThrow(StorageError);
      // The corrupt file was preserved for the operator to recover manually.
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('{ this is not valid json');
      expect(fs.readdirSync(dir)).toEqual(['data.json']);
    });

    it('seeds a fresh demo store only when the file does not exist yet', () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-seed-'));
      tempDirs.push(dir);
      const filePath = path.join(dir, 'data.json');

      expect(fs.existsSync(filePath)).toBe(false);
      const store = new DatabaseStore({ filePath });

      expect(fs.existsSync(filePath)).toBe(true);
      expect(store.findUserById(DEMO_USER_ID)?.isDemo).toBe(true);
    });

    it('preserves an existing empty users list instead of re-injecting seed users', () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-empty-'));
      tempDirs.push(dir);
      const filePath = path.join(dir, 'data.json');
      fs.writeFileSync(filePath, JSON.stringify({ users: [] }), 'utf-8');

      const store = new DatabaseStore({ filePath });
      expect(store.findUserById(DEMO_USER_ID)).toBeUndefined();
      expect(store.getStoragePath()).toBe(filePath);
      expect(store.getActivities(DEMO_USER_ID)).toEqual([]);
    });

    it('normalizes a legacy file that is missing optional collections', () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-legacy-'));
      tempDirs.push(dir);
      const filePath = path.join(dir, 'data.json');
      fs.writeFileSync(
        filePath,
        JSON.stringify({
          users: [{ id: 'legacy_user', email: 'legacy@example.com', name: 'Legacy', createdAt: '2024-01-01T00:00:00.000Z' }]
        }),
        'utf-8'
      );

      const store = new DatabaseStore({ filePath });
      expect(store.findUserById('legacy_user')?.email).toBe('legacy@example.com');
      expect(store.getProfile('legacy_user')).toBeUndefined();
      expect(store.getRoadmapTasks('legacy_user')).toEqual([]);
      expect(store.getActivities('legacy_user')).toEqual([]);
      expect(store.getAssessmentHistory('legacy_user')).toEqual([]);
    });
  });
});

describe('Subphase 2K: API security & ownership', () => {
  const OTHER_USER_ID = 'demo_student_owner_iso';

  beforeEach(() => {
    // isDemo: true so resetDemoData purges it between tests.
    if (!db.findUserById(OTHER_USER_ID)) {
      db.createUser({
        id: OTHER_USER_ID,
        name: 'Owner Isolation',
        email: `owner_iso_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.com`,
        createdAt: new Date().toISOString(),
        isDemo: true
      });
    }
  });

  it('scopes a project milestone update to the authenticated owner', async () => {
    const otherToken = signToken(OTHER_USER_ID, true);

    // The demo user's own project is visible only to them.
    const mine = await api('/api/projects');
    expect(mine.status).toBe(200);
    const projectId = mine.body.projects[0].id as string;

    // The other user has their own store slice: they see their own projects,
    // and any update they make is confined to their own record.
    const theirs = await api('/api/projects', { token: otherToken });
    expect(theirs.status).toBe(200);
    expect(theirs.body.projects.find((p: any) => p.id === projectId)?.isSaved ?? false).toBe(false);

    const demoSnapshot = JSON.parse(JSON.stringify(db.getProjects(DEMO_USER_ID).find(p => p.id === projectId)));

    const updated = await api(`/api/projects/${projectId}/milestones/m1`, {
      method: 'PATCH',
      token: otherToken,
      body: { completed: true }
    });
    // Either confined to the other user's own slice (200) or unknown for them (404)
    // — but the demo user's record must be byte-for-byte unchanged.
    expect([200, 404]).toContain(updated.status);
    const demoProject = db.getProjects(DEMO_USER_ID).find(p => p.id === projectId);
    expect(JSON.parse(JSON.stringify(demoProject))).toEqual(demoSnapshot);
  });

  it('rejects a cross-user roadmap task update with 404', async () => {
    const roadmap = await api('/api/roadmap');
    expect(roadmap.status).toBe(200);
    const taskId = roadmap.body.roadmap.stages[0].tasks[0].id as string;
    const demoTaskSnapshot = JSON.parse(
      JSON.stringify(db.getRoadmapTasks(DEMO_USER_ID).find(t => t.id === taskId))
    );

    const otherToken = signToken(OTHER_USER_ID, true);
    const res = await api(`/api/roadmap/tasks/${taskId}`, {
      method: 'PATCH',
      token: otherToken,
      body: { status: 'completed' }
    });

    expect(res.status).toBe(404);
    const stored = db.getRoadmapTasks(DEMO_USER_ID).find(t => t.id === taskId)!;
    expect(JSON.parse(JSON.stringify(stored))).toEqual(demoTaskSnapshot);
  });

  it('does not expose another user profile through the profile endpoint', async () => {
    const otherToken = signToken(OTHER_USER_ID, true);
    const res = await api('/api/profile', { token: otherToken });
    // The other account has no onboarding profile, and never receives Aarav's.
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('Aarav');
  });
});
