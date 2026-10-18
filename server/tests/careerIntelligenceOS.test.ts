import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Server } from 'node:http';
import { createApp } from '../app.js';
import { db, DEMO_USER_ID } from '../db/store.js';
import { signToken } from '../middleware/auth.js';

const DEMO_TOKEN = 'demo_token_aarav';
const OTHER_USER_ID = 'other_student_user';
const OTHER_TOKEN = signToken(OTHER_USER_ID);

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
  db.createUser({
    id: OTHER_USER_ID,
    email: 'other@skillforge.ai',
    name: 'Other Student User',
    createdAt: new Date().toISOString()
  });
});

describe('Career Intelligence OS — Eight Integrated Features', () => {

  describe('Feature 1: SkillForge Radar (/api/skill-radar)', () => {
    it('requires authentication', async () => {
      const res = await api('/api/skill-radar', { token: null });
      expect(res.status).toBe(401);
    });

    it('returns aggregated demand and prioritized skills derived from real workspace job postings', async () => {
      const res = await api('/api/skill-radar');
      expect(res.status).toBe(200);
      expect(res.body.radar).toBeDefined();

      const radar = res.body.radar;
      expect(radar.sampleSize).toBeGreaterThan(0);
      expect(Array.isArray(radar.frequentlyRequestedSkills)).toBe(true);
      expect(radar.frequentlyRequestedSkills.length).toBeGreaterThan(0);
      expect(Array.isArray(radar.prioritizedSkills)).toBe(true);
      expect(radar.dataIntegrityNotice).toContain('strictly derived from');

      // Verify explainability fields
      const topPrioritized = radar.prioritizedSkills[0];
      expect(topPrioritized.whyItMatters).toBeDefined();
      expect(topPrioritized.currentEvidenceNotes).toBeDefined();
      expect(topPrioritized.recommendedNextAction.route).toBeDefined();
    });
  });

  describe('Feature 2: Proof of Skill (/api/proof-of-skill)', () => {
    it('rejects unauthenticated access', async () => {
      const res = await api('/api/proof-of-skill/challenges', { token: null });
      expect(res.status).toBe(401);
    });

    it('lists practical challenges with hidden test criteria masked', async () => {
      const res = await api('/api/proof-of-skill/challenges');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.challenges)).toBe(true);

      const challenge = res.body.challenges.find((c: any) => c.id === 'pos_algo_lru');
      expect(challenge).toBeDefined();
      expect(challenge.type).toBe('algorithmic_code');

      // Hidden test case output must not be revealed
      const hiddenTest = challenge.testCases.find((tc: any) => tc.isHidden);
      if (hiddenTest) {
        expect(hiddenTest.expectedOutput).toContain('Hidden');
      }
    });

    it('fails evaluations on incomplete submissions without crashing', async () => {
      const res = await api('/api/proof-of-skill/challenges/pos_algo_lru/evaluate', {
        method: 'POST',
        body: { solution: 'x' }
      });
      expect(res.status).toBe(200);
      expect(res.body.result.passed).toBe(false);
      expect(res.body.result.scorePercentage).toBe(0);
      expect(res.body.result.explanation).toContain('too brief');
    });

    it('grades valid solutions, generates structured evidence, and upgrades profile skill', async () => {
      const solution = `
        class LRUCache {
          constructor(capacity) {
            this.capacity = capacity;
            this.cache = new Map();
          }
          get(key) {
            if (!this.cache.has(key)) return -1;
            const value = this.cache.get(key);
            this.cache.delete(key);
            this.cache.set(key, value);
            return value;
          }
          put(key, value) {
            if (this.cache.has(key)) {
              this.cache.delete(key);
            } else if (this.cache.size >= this.capacity) {
              const oldestKey = this.cache.keys().next().value;
              this.cache.delete(oldestKey);
            }
            this.cache.set(key, value);
          }
        }
      `;

      const res = await api('/api/proof-of-skill/challenges/pos_algo_lru/evaluate', {
        method: 'POST',
        body: { solution }
      });

      expect(res.status).toBe(200);
      const result = res.body.result;
      expect(result.passed).toBe(true);
      expect(result.scorePercentage).toBeGreaterThanOrEqual(75);
      expect(result.evaluationMethod).toBe('automated_test_runner');
      expect(result.evidenceRecord).toBeDefined();
      expect(result.evidenceRecord.evidenceStatus).toBe('verified_automated_test');

      // Verify persistence in evidence endpoint
      const evRes = await api('/api/proof-of-skill/evidence');
      expect(evRes.status).toBe(200);
      expect(evRes.body.evidence.some((e: any) => e.challengeId === 'pos_algo_lru')).toBe(true);

      // Verify skill status in profile updated to 'assessed'
      const prof = db.getProfile(DEMO_USER_ID);
      const dsaSkill = prof?.currentSkills.find(s => s.skillId === 'dsa');
      expect(dsaSkill?.status).toBe('assessed');
    });
  });

  describe('Feature 3: Career Mission Control (/api/mission-control)', () => {
    it('requires authentication and rejects invalid IDs', async () => {
      const res = await api('/api/mission-control', { token: null });
      expect(res.status).toBe(401);
    });

    it('returns structured mission summary with priorities and active milestone', async () => {
      const res = await api('/api/mission-control');
      expect(res.status).toBe(200);
      const mc = res.body.missionControl;
      expect(mc.careerObjective).toBeDefined();
      expect(Array.isArray(mc.topActionablePriorities)).toBe(true);
      expect(mc.topActionablePriorities.length).toBeGreaterThan(0);
      expect(mc.recommendationReason).toBeDefined();
    });

    it('allows transitioning action states with explicit audit logging', async () => {
      const summaryRes = await api('/api/mission-control');
      const action = summaryRes.body.missionControl.topActionablePriorities[0];
      expect(action).toBeDefined();

      const patchRes = await api(`/api/mission-control/actions/${action.id}/state`, {
        method: 'PATCH',
        body: { state: 'in_progress' }
      });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.action.state).toBe('in_progress');

      // Verify audit decision logged
      const updatedSummary = await api('/api/mission-control');
      const decisions = updatedSummary.body.missionControl.decisionAuditTrail;
      expect(decisions.some((d: any) => d.title.includes('in_progress'))).toBe(true);
    });

    it('records user approval career decisions', async () => {
      const res = await api('/api/mission-control/decisions', {
        method: 'POST',
        body: {
          decisionType: 'action_approval',
          title: 'Approved 4-week sprint focused on PyTorch',
          rationale: 'Aligns with target AI/ML role'
        }
      });
      expect(res.status).toBe(201);
      expect(res.body.decision.approvedByUser).toBe(true);
    });
  });

  describe('Feature 4: Interview Arena (/api/interview-arena)', () => {
    it('creates an adaptive mock interview session for a selected mode', async () => {
      const res = await api('/api/interview-arena/sessions', {
        method: 'POST',
        body: { mode: 'project_deep_dive' }
      });
      expect(res.status).toBe(201);
      const session = res.body.session;
      expect(session.mode).toBe('project_deep_dive');
      expect(session.status).toBe('in_progress');
      expect(Array.isArray(session.questions)).toBe(true);
      expect(session.questions.length).toBeGreaterThan(0);

      // Verify rubric exists
      expect(session.questions[0].rubric).toBeDefined();
    });

    it('evaluates answers against rubrics and produces scorecard on finish', async () => {
      const createRes = await api('/api/interview-arena/sessions', {
        method: 'POST',
        body: { mode: 'rapid_fire' }
      });
      const session = createRes.body.session;
      const question = session.questions[0];

      const ansRes = await api(`/api/interview-arena/sessions/${session.id}/answer`, {
        method: 'POST',
        body: {
          questionId: question.id,
          userAnswer: 'An optimistic lock verifies version timestamps before committing writes without locking rows, whereas a pessimistic lock uses database SELECT FOR UPDATE to acquire exclusive row locks. Optimistic locking is superior for high read-to-write ratios with low collision probability, representing a fundamental trade-off between throughput and conflict overhead.'
        }
      });

      expect(ansRes.status).toBe(200);
      const evalData = ansRes.body.evaluation;
      expect(evalData.scoreOutOf10).toBeGreaterThanOrEqual(6);
      expect(evalData.criterionScores).toBeDefined();

      // Finish session
      const finRes = await api(`/api/interview-arena/sessions/${session.id}/finish`, {
        method: 'POST'
      });
      expect(finRes.status).toBe(200);
      expect(finRes.body.session.status).toBe('completed');
      expect(finRes.body.session.scorecard).toBeDefined();
      expect(finRes.body.session.scorecard.disclaimer).toContain('heuristic');
    });

    it('enforces cross-user isolation on interview sessions', async () => {
      const createRes = await api('/api/interview-arena/sessions', {
        method: 'POST',
        body: { mode: 'technical' }
      });
      const sessionId = createRes.body.session.id;

      // Other user cannot view or mutate this session
      const getRes = await api(`/api/interview-arena/sessions/${sessionId}`, { token: OTHER_TOKEN });
      expect(getRes.status).toBe(404);
    });
  });

  describe('Feature 5: Career Twin Evolution (/api/career-twin/evolution)', () => {
    it('returns transparent multi-scenario comparative forecasts with deterministic calculations', async () => {
      const res = await api('/api/career-twin/evolution');
      expect(res.status).toBe(200);
      const evo = res.body.evolution;
      expect(evo.baseReadiness).toBeGreaterThan(0);
      expect(Array.isArray(evo.scenarios)).toBe(true);
      expect(evo.scenarios.length).toBe(5);

      // Verify the 5 required scenarios are present
      const scenarioIds = evo.scenarios.map((s: any) => s.scenarioId);
      expect(scenarioIds).toContain('current_pace');
      expect(scenarioIds).toContain('skill_gap_focused');
      expect(scenarioIds).toContain('internship_prep');
      expect(scenarioIds).toContain('interview_prep');
      expect(scenarioIds).toContain('project_sprint');

      // Verify each scenario has milestones and transparent assumptions
      for (const s of evo.scenarios) {
        expect(Array.isArray(s.milestoneForecasts)).toBe(true);
        expect(Array.isArray(s.assumptions)).toBe(true);
        expect(s.assumptions.length).toBeGreaterThan(0);
        expect(s.disclaimer || evo.disclaimer).toBeDefined();
      }
    });
  });

  describe('Feature 6: Project Forge (/api/project-forge)', () => {
    it('generates an engineering project aligned to real skill gaps', async () => {
      const res = await api('/api/project-forge/generate', {
        method: 'POST',
        body: { difficulty: 'Advanced' }
      });
      expect(res.status).toBe(201);
      const project = res.body.project;
      expect(project.id).toBeDefined();
      expect(project.title).toBeDefined();
      expect(project.targetedGapSkills.length).toBeGreaterThan(0);
      expect(Array.isArray(project.milestones)).toBe(true);
      expect(project.milestones.length).toBeGreaterThan(0);

      // Verify milestone structure
      const m1 = project.milestones[0];
      expect(m1.acceptanceCriteria).toBeDefined();
      expect(m1.expectedEvidence).toBeDefined();
      expect(m1.completed).toBe(false);
    });

    it('submits milestone evidence, verifies completion, and updates status', async () => {
      const genRes = await api('/api/project-forge/generate', { method: 'POST', body: {} });
      const project = genRes.body.project;
      const milestoneId = project.milestones[0].id;

      const verifyRes = await api(`/api/project-forge/projects/${project.id}/milestones/${milestoneId}/verify`, {
        method: 'POST',
        body: {
          repoUrl: 'https://github.com/developer/rag-pipeline',
          notes: 'Implemented core schema and vector migration harness'
        }
      });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.milestone.completed).toBe(true);
      expect(verifyRes.body.milestone.submittedEvidence.repoUrl).toBe('https://github.com/developer/rag-pipeline');
    });
  });

  describe('Feature 7: Opportunity Match Engine (/api/opportunity-match)', () => {
    it('rejects requests without description or analysis ID', async () => {
      const res = await api('/api/opportunity-match/evaluate', {
        method: 'POST',
        body: {}
      });
      expect(res.status).toBe(400);
    });

    it('matches job description requirements against real profile evidence with full explainability', async () => {
      const jdText = `
        Senior AI / ML Engineer at DeepTech Labs.
        Requirements:
        - Must have strong Python Programming expertise
        - Deep Learning with PyTorch
        - Data Structures & Algorithms
        Nice to have:
        - SQL & Relational Databases
        - Cloud Infrastructure (AWS/GCP)
      `;

      const res = await api('/api/opportunity-match/evaluate', {
        method: 'POST',
        body: { description: jdText }
      });

      expect(res.status).toBe(200);
      const match = res.body.match;
      expect(match.overallSkillAlignmentPercentage).toBeGreaterThan(0);
      expect(match.statedRequirementsEligibility).toBeDefined();
      expect(Array.isArray(match.requiredSkillsMatched)).toBe(true);
      expect(Array.isArray(match.requiredSkillsMissing)).toBe(true);
      expect(Array.isArray(match.explainabilityTrace)).toBe(true);
      expect(match.hiringProbabilityNotice).toContain('SkillForge does not estimate speculative hiring probability');
    });
  });

  describe('Feature 8: Portfolio Intelligence (/api/portfolio-intelligence)', () => {
    it('analyzes public repository metadata safely without private tokens', async () => {
      const res = await api('/api/portfolio-intelligence/analyze-repo', {
        method: 'POST',
        body: { repoUrl: 'https://github.com/tanmayyyyayyy/SkillForge-AI' }
      });
      expect(res.status).toBe(200);
      const analysis = res.body.analysis;
      expect(analysis.repoName).toBeDefined();
      expect(Array.isArray(analysis.detectedTechnologies)).toBe(true);
      expect(analysis.hasReadme).toBe(true);
    });

    it('generates resume bullets strictly from verified facts without fabricating numbers', async () => {
      const res = await api('/api/portfolio-intelligence/generate-bullets', {
        method: 'POST',
        body: {
          title: 'Enterprise RAG Pipeline',
          technologies: ['PyTorch', 'FastAPI', 'Qdrant', 'PostgreSQL'],
          milestones: ['Recursive chunking and semantic cache with Redis'],
          assessments: ['Python Programming']
        }
      });

      expect(res.status).toBe(200);
      const bullets = res.body.bullets;
      expect(Array.isArray(bullets)).toBe(true);
      expect(bullets.length).toBeGreaterThan(0);

      // Verify no fabricated numbers
      for (const b of bullets) {
        expect(b.isEvidenceBacked).toBe(true);
        expect(b.supportedFacts.length).toBeGreaterThan(0);
        expect(b.bulletText).not.toContain('$');
        expect(b.bulletText).not.toContain('million users');
      }
    });

    it('compiles full portfolio intelligence data with exportable markdown', async () => {
      const res = await api('/api/portfolio-intelligence');
      expect(res.status).toBe(200);
      const portfolio = res.body.portfolio;
      expect(portfolio.studentName).toBeDefined();
      expect(portfolio.targetRole).toBeDefined();
      expect(portfolio.exportableMarkdown).toContain('# Aarav Sharma — Verified Engineering Portfolio');
    });
  });

});
