import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Server } from 'node:http';
import { createApp } from '../app.js';
import { db } from '../db/store.js';
import { signToken } from '../middleware/auth.js';
import { ASSESSMENTS } from '../data/assessments.js';
import { CAREER_ROLES } from '../data/careers.js';
import {
  gradeAssessment,
  resolveCurrentEvidence,
  applyPassingAssessment,
  findUnknownQuestionIds
} from '../engine/assessmentEngine.js';
import type { SkillAssessment, AssessmentResult, StudentProfile } from '../../src/types/index.js';

/**
 * Subphase 2J: Assessment Engine & Skill Verification.
 *
 * Verifies that grading is server-authoritative, answer keys never leak before
 * submission, attempts are owned + idempotent + append-only, and that only a
 * passing graded attempt awards assessment evidence consumed by the existing
 * readiness engine.
 */

const DEMO_TOKEN = 'demo_token_aarav';
const DEMO_USER_ID = 'demo_student_aarav';

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

function allCorrect(skillId: string): Record<string, number> {
  const a = ASSESSMENTS.find(x => x.skillId === skillId)!;
  const answers: Record<string, number> = {};
  for (const q of a.questions) answers[q.id] = q.correctOptionIndex;
  return answers;
}

function allWrong(skillId: string): Record<string, number> {
  const a = ASSESSMENTS.find(x => x.skillId === skillId)!;
  const answers: Record<string, number> = {};
  for (const q of a.questions) answers[q.id] = (q.correctOptionIndex + 1) % q.options.length;
  return answers;
}

function makeProfile(over: Partial<StudentProfile> = {}): StudentProfile {
  return {
    userId: 'u1',
    fullName: 'Test Student',
    educationLevel: 'Undergraduate',
    degree: 'CS',
    branch: 'CSE',
    institution: 'Test Institute',
    graduationYear: 2027,
    currentAcademicYear: 'Year 3',
    experienceLevel: 'Intermediate',
    weeklyHours: 14,
    preferredLearningStyle: 'Project-based',
    targetCompanies: [],
    targetRole: 'aiml',
    targetCompletionPeriod: '6 Months',
    preferredDomains: [],
    constraints: [],
    currentSkills: [],
    existingProjects: [],
    experience: [],
    certifications: [],
    interests: [],
    updatedAt: new Date().toISOString(),
    ...over
  };
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

// ---------------------------------------------------------------------------
// Engine unit tests (grading formula + evidence policy)
// ---------------------------------------------------------------------------

describe('Subphase 2J: assessment engine', () => {
  const sample: SkillAssessment = {
    skillId: 'python',
    skillName: 'Python Programming',
    category: 'Programming Languages',
    difficulty: 'Intermediate',
    questionsCount: 2,
    passingScorePercentage: 75,
    questions: [
      { id: 'q1', question: 'A?', options: ['a', 'b'], correctOptionIndex: 0, explanation: 'because a' },
      { id: 'q2', question: 'B?', options: ['a', 'b'], correctOptionIndex: 1, explanation: 'because b' }
    ]
  };

  it('scores a fully correct attempt at 100% and passes it', () => {
    const out = gradeAssessment(sample, { q1: 0, q2: 1 });
    expect(out.correctCount).toBe(2);
    expect(out.scorePercentage).toBe(100);
    expect(out.passed).toBe(true);
  });

  it('scores a fully incorrect attempt at 0% and fails it', () => {
    const out = gradeAssessment(sample, { q1: 1, q2: 0 });
    expect(out.correctCount).toBe(0);
    expect(out.scorePercentage).toBe(0);
    expect(out.passed).toBe(false);
  });

  it('scores a partially correct attempt and applies the threshold', () => {
    const out = gradeAssessment(sample, { q1: 0, q2: 0 });
    expect(out.correctCount).toBe(1);
    expect(out.scorePercentage).toBe(50);
    expect(out.passed).toBe(false); // 50 < 75
  });

  it('treats missing answers as unanswered (index -1) and incorrect', () => {
    const out = gradeAssessment(sample, {});
    expect(out.correctCount).toBe(0);
    expect(out.gradedAnswers.every(g => g.selectedOptionIndex === -1)).toBe(true);
    expect(out.passed).toBe(false);
  });

  it('ignores invalid answer values (non-integer, negative, out-of-range)', () => {
    const out = gradeAssessment(sample, { q1: 'a', q2: 999 } as any);
    expect(out.correctCount).toBe(0);
    expect(out.gradedAnswers[0].selectedOptionIndex).toBe(-1);
    expect(out.gradedAnswers[1].selectedOptionIndex).toBe(-1);
  });

  it('never passes an empty assessment (no divide-by-zero)', () => {
    const empty: SkillAssessment = { ...sample, questions: [], questionsCount: 0 };
    const out = gradeAssessment(empty, {});
    expect(out.totalQuestions).toBe(0);
    expect(out.scorePercentage).toBe(0);
    expect(out.passed).toBe(false);
  });

  it('detects unknown question ids that do not belong to the assessment', () => {
    expect(findUnknownQuestionIds(sample, { q1: 0, bogus: 1 })).toEqual(['bogus']);
  });

  it('resolves current evidence to the highest pass and never double-counts a skill', () => {
    const mk = (id: string, skillId: string, score: number, passed: boolean, at: string): AssessmentResult => ({
      id,
      userId: 'u1',
      skillId,
      skillName: skillId,
      scorePercentage: score,
      totalQuestions: 5,
      correctAnswersCount: 0,
      passed,
      answers: [],
      completedAt: at
    });

    const resolved = resolveCurrentEvidence([
      mk('a', 'python', 100, true, '2026-01-01T00:00:00Z'),
      mk('b', 'python', 80, true, '2026-02-01T00:00:00Z'),
      mk('c', 'sql', 40, false, '2026-01-01T00:00:00Z'),
      mk('d', 'sql', 90, true, '2026-01-05T00:00:00Z')
    ]);

    expect(resolved).toHaveLength(2);
    const python = resolved.find(r => r.skillId === 'python')!;
    const sql = resolved.find(r => r.skillId === 'sql')!;
    // Highest pass wins even if it is the older attempt.
    expect(python.id).toBe('a');
    expect(python.scorePercentage).toBe(100);
    expect(sql.scorePercentage).toBe(90);
    expect(sql.passed).toBe(true);
  });

  it('applies a pass as assessed evidence without inventing a proficiency level', () => {
    const skill = applyPassingAssessment(undefined, sample, 90, '2026-01-01T00:00:00Z');
    expect(skill.status).toBe('assessed');
    expect(skill.assessmentScore).toBe(90);
    expect(skill.proficiency).toBe(0); // knowledge check does not fabricate a level
  });

  it('never downgrades recorded evidence on a lower retake and preserves verified_project', () => {
    const existing = {
      skillId: 'python',
      name: 'Python',
      category: 'Programming Languages',
      proficiency: 4 as const,
      status: 'verified_project' as const,
      source: 'project' as const,
      assessmentScore: 95
    };
    const updated = applyPassingAssessment(existing as any, sample, 60, '2026-03-01T00:00:00Z');
    expect(updated.status).toBe('verified_project');
    expect(updated.assessmentScore).toBe(95); // max(existing, new)
    expect(updated.proficiency).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Question / assessment integrity
// ---------------------------------------------------------------------------

describe('Subphase 2J: assessment content integrity', () => {
  it('ships well-formed questions (unique ids, distinct options, in-range keys)', () => {
    expect(ASSESSMENTS.length).toBeGreaterThan(0);
    for (const a of ASSESSMENTS) {
      expect(a.questions.length).toBeGreaterThanOrEqual(1);
      expect(a.questionsCount).toBe(a.questions.length);
      expect(a.passingScorePercentage).toBeGreaterThan(0);
      expect(a.passingScorePercentage).toBeLessThanOrEqual(100);

      const ids = a.questions.map(q => q.id);
      expect(new Set(ids).size).toBe(ids.length); // no duplicate question ids

      for (const q of a.questions) {
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(new Set(q.options).size).toBe(q.options.length); // distinct options
        expect(q.correctOptionIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctOptionIndex).toBeLessThan(q.options.length);
        expect(q.explanation.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('maps every assessment to a canonical skill in the career registry', () => {
    const canonical = new Set(CAREER_ROLES.flatMap(r => r.requiredSkills.map(s => s.skillId)));
    const orphaned = ASSESSMENTS.filter(a => !canonical.has(a.skillId)).map(a => a.skillId);
    expect(orphaned).toEqual([]);
  });

  it('never exposes the answer key or explanation before submission', async () => {
    const sheet = await api('/api/assessments/python');
    expect(sheet.status).toBe(200);
    for (const q of sheet.body.assessment.questions) {
      expect(q.correctOptionIndex).toBeUndefined();
      expect(q.explanation).toBeUndefined();
    }

    const started = await api('/api/assessments/python/attempts', { method: 'POST' });
    for (const q of started.body.attempt.questions) {
      expect(q.correctOptionIndex).toBeUndefined();
      expect(q.explanation).toBeUndefined();
    }
  });

  it('returns 404 for an unknown assessment', async () => {
    const res = await api('/api/assessments/not_a_skill');
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Attempt lifecycle, ownership, idempotency, history
// ---------------------------------------------------------------------------

describe('Subphase 2J: attempt lifecycle', () => {
  it('requires authentication', async () => {
    expect((await api('/api/assessments', { token: null })).status).toBe(401);
    expect((await api('/api/assessments/python', { token: null })).status).toBe(401);
    expect((await api('/api/assessments/python/attempts', { method: 'POST', token: null })).status).toBe(401);
  });

  it('creates an owned in-progress attempt', async () => {
    const res = await api('/api/assessments/sql/attempts', { method: 'POST' });
    expect(res.status).toBe(201);
    expect(res.body.attempt.status).toBe('in_progress');
    expect(typeof res.body.attempt.id).toBe('string');
    expect(Array.isArray(res.body.attempt.questions)).toBe(true);
  });

  it('grades an attempt server-side and marks it graded', async () => {
    const started = await api('/api/assessments/sql/attempts', { method: 'POST' });
    const attemptId = started.body.attempt.id;

    const submit = await api(`/api/assessments/attempts/${attemptId}/submit`, {
      method: 'POST',
      body: { answers: allCorrect('sql') }
    });
    expect(submit.status).toBe(200);
    expect(submit.body.result.passed).toBe(true);
    expect(submit.body.result.scorePercentage).toBe(100);
    expect(submit.body.attempt.status).toBe('graded');

    const fetched = await api(`/api/assessments/attempts/${attemptId}`);
    expect(fetched.body.attempt.status).toBe('graded');
    expect(fetched.body.result.scorePercentage).toBe(100);
  });

  it('rejects unknown question ids and malformed answer payloads', async () => {
    const started = await api('/api/assessments/sql/attempts', { method: 'POST' });
    const attemptId = started.body.attempt.id;

    const badPayload = await api(`/api/assessments/attempts/${attemptId}/submit`, {
      method: 'POST',
      body: { answers: ['a', 'b'] }
    });
    expect(badPayload.status).toBe(400);

    const unknown = await api(`/api/assessments/attempts/${attemptId}/submit`, {
      method: 'POST',
      body: { answers: { totally_unknown: 0 } }
    });
    expect(unknown.status).toBe(400);
    expect(unknown.body.error).toMatch(/unknown/i);
  });

  it('returns 404 when submitting an unknown attempt', async () => {
    const res = await api('/api/assessments/attempts/att_missing/submit', {
      method: 'POST',
      body: { answers: {} }
    });
    expect(res.status).toBe(404);
  });

  it('is idempotent: a repeated submission returns the stored result without duplicate credit', async () => {
    const started = await api('/api/assessments/sql/attempts', { method: 'POST' });
    const attemptId = started.body.attempt.id;

    const first = await api(`/api/assessments/attempts/${attemptId}/submit`, {
      method: 'POST',
      body: { answers: allCorrect('sql') }
    });
    const activitiesAfterFirst = db.getActivities(DEMO_USER_ID).length;

    const second = await api(`/api/assessments/attempts/${attemptId}/submit`, {
      method: 'POST',
      body: { answers: allCorrect('sql') }
    });

    expect(second.status).toBe(200);
    expect(second.body.alreadyGraded).toBe(true);
    expect(second.body.result.id).toBe(first.body.result.id);
    expect(db.getActivities(DEMO_USER_ID).length).toBe(activitiesAfterFirst);
    expect(db.getAssessmentHistory(DEMO_USER_ID).filter(r => r.skillId === 'sql')).toHaveLength(1);
  });

  it('keeps retakes as separate attempts and preserves history', async () => {
    const a1 = await api('/api/assessments/docker/attempts', { method: 'POST' });
    await api(`/api/assessments/attempts/${a1.body.attempt.id}/submit`, {
      method: 'POST',
      body: { answers: allWrong('docker') }
    });

    const a2 = await api('/api/assessments/docker/attempts', { method: 'POST' });
    await api(`/api/assessments/attempts/${a2.body.attempt.id}/submit`, {
      method: 'POST',
      body: { answers: allCorrect('docker') }
    });

    const history = await api('/api/assessments/docker/attempts');
    expect(history.body.attempts).toHaveLength(2);
    expect(history.body.attempts.every((a: any) => a.status === 'graded')).toBe(true);
    expect(db.getAssessmentHistory(DEMO_USER_ID).filter(r => r.skillId === 'docker')).toHaveLength(2);
  });

  it('isolates attempts across users (ownership enforced)', async () => {
    const otherId = 'demo_student_assess_iso';
    db.createUser({ id: otherId, name: 'Iso User', email: `iso_assess_${Date.now()}@example.com`, createdAt: new Date().toISOString(), isDemo: true });
    db.saveProfile(makeProfile({ userId: otherId }));
    const otherToken = signToken(otherId, true);

    // Demo user starts an attempt.
    const started = await api('/api/assessments/react/attempts', { method: 'POST' });
    const attemptId = started.body.attempt.id;

    // The other user cannot read it or submit to it.
    expect((await api(`/api/assessments/attempts/${attemptId}`, { token: otherToken })).status).toBe(404);
    const hijack = await api(`/api/assessments/attempts/${attemptId}/submit`, {
      method: 'POST',
      token: otherToken,
      body: { answers: allCorrect('react') }
    });
    expect(hijack.status).toBe(404);

    // And the demo user's attempt is still in progress (not graded by the other user).
    const fetched = await api(`/api/assessments/attempts/${attemptId}`);
    expect(fetched.body.attempt.status).toBe('in_progress');
  });
});

// ---------------------------------------------------------------------------
// Verified skill evidence + readiness / gap integration
// ---------------------------------------------------------------------------

describe('Subphase 2J: verified skill evidence & integration', () => {
  it('awarding a pass sets assessed status with the recorded score', async () => {
    const res = await api('/api/assessments/sql/submit', { method: 'POST', body: { answers: allCorrect('sql') } });
    expect(res.body.result.passed).toBe(true);

    const skill = db.getProfile(DEMO_USER_ID)!.currentSkills.find(s => s.skillId === 'sql')!;
    expect(skill.status).toBe('assessed');
    expect(skill.assessmentScore).toBe(100);
  });

  it('a failing attempt awards no evidence and does not touch other skills', async () => {
    const before = db.getProfile(DEMO_USER_ID)!;
    const reactBefore = before.currentSkills.find(s => s.skillId === 'react');
    const dockerBefore = before.currentSkills.find(s => s.skillId === 'docker');

    const res = await api('/api/assessments/sql/submit', { method: 'POST', body: { answers: allWrong('sql') } });
    expect(res.body.result.passed).toBe(false);

    const after = db.getProfile(DEMO_USER_ID)!;
    const sqlAfter = after.currentSkills.find(s => s.skillId === 'sql')!;
    expect(sqlAfter.status).not.toBe('assessed'); // still self-reported
    if (reactBefore) expect(after.currentSkills.find(s => s.skillId === 'react')).toEqual(reactBefore);
    expect(after.currentSkills.find(s => s.skillId === 'docker')).toEqual(dockerBefore);
  });

  it('opening or generating an assessment changes no readiness', async () => {
    const before = (await api('/api/readiness')).body.readiness.overallScore;
    await api('/api/assessments/python');
    await api('/api/assessments/python/attempts', { method: 'POST' });
    const after = (await api('/api/readiness')).body.readiness.overallScore;
    expect(after).toBe(before);
  });

  it('a passing attempt raises readiness, and the report agrees with the dashboard', async () => {
    const before = (await api('/api/readiness')).body.readiness.overallScore;

    await api('/api/assessments/sql/submit', { method: 'POST', body: { answers: allCorrect('sql') } });
    await api('/api/readiness');

    const dash = await api('/api/readiness');
    const report = await api('/api/readiness/report');
    expect(dash.body.readiness.overallScore).toBeGreaterThan(before);
    expect(dash.body.readiness.overallScore).toBe(report.body.report.readiness.overallScore);
    expect(dash.body.readiness.breakdown).toEqual(report.body.report.readiness.breakdown);
  });

  it('repeated submission awards no duplicate readiness credit', async () => {
    await api('/api/assessments/sql/submit', { method: 'POST', body: { answers: allCorrect('sql') } });
    const afterFirst = (await api('/api/readiness')).body.readiness.overallScore;

    await api('/api/assessments/sql/submit', { method: 'POST', body: { answers: allCorrect('sql') } });
    await api('/api/readiness');
    const afterSecond = (await api('/api/readiness')).body.readiness.overallScore;

    expect(afterSecond).toBe(afterFirst);
  });

  it('a lower retake never downgrades the stored evidence', async () => {
    await api('/api/assessments/sql/submit', { method: 'POST', body: { answers: allCorrect('sql') } });

    // One correct out of five = 20% (a fail) — must not erase the prior pass.
    const partial: Record<string, number> = {};
    const sql = ASSESSMENTS.find(a => a.skillId === 'sql')!;
    sql.questions.forEach((q, i) => { if (i === 0) partial[q.id] = q.correctOptionIndex; });

    await api('/api/assessments/sql/submit', { method: 'POST', body: { answers: partial } });

    const evidence = db.getAssessments(DEMO_USER_ID).find(r => r.skillId === 'sql')!;
    expect(evidence.passed).toBe(true);
    expect(evidence.scorePercentage).toBe(100);
  });

  it('records a new canonical skill as assessed without fabricating proficiency', async () => {
    // Demo profile does not track javascript.
    expect(db.getProfile(DEMO_USER_ID)!.currentSkills.some(s => s.skillId === 'javascript')).toBe(false);

    await api('/api/assessments/javascript/submit', { method: 'POST', body: { answers: allCorrect('javascript') } });

    const skill = db.getProfile(DEMO_USER_ID)!.currentSkills.find(s => s.skillId === 'javascript')!;
    expect(skill).toBeDefined();
    expect(skill.status).toBe('assessed');
    expect(skill.proficiency).toBe(0);
  });

  it('does not fabricate gap closure: the gap engine still uses real proficiency', async () => {
    const before = (await api('/api/analysis')).body.analysis;
    await api('/api/assessments/python/submit', { method: 'POST', body: { answers: allCorrect('python') } });
    const after = (await api('/api/analysis')).body.analysis;

    // python is already assessed at proficiency 3 in the demo profile; a passing
    // MCQ must not invent a higher proficiency level.
    const beforePy = before.items.find((g: any) => g.skillId === 'python');
    const afterPy = after.items.find((g: any) => g.skillId === 'python');
    expect(afterPy.currentLevel).toBe(beforePy.currentLevel);
  });

  it('keeps the Job Description Analyzer and weekly planner functional', async () => {
    const jd = await api('/api/jd/analyze', {
      method: 'POST',
      body: {
        description:
          'We are hiring a backend engineer with strong Python and SQL experience to design and build REST APIs, ' +
          'work with relational databases, and collaborate on distributed services in a cloud environment.'
      }
    });
    expect(jd.status).toBe(200);

    const plan = await api('/api/weekly-plan');
    expect(plan.status).toBe(200);
    expect(plan.body.plan).toBeDefined();
  });
});
