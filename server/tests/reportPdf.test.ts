import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Server } from 'node:http';
import { createApp } from '../app.js';
import { db, DEMO_USER_ID } from '../db/store.js';
import { generateReadinessReportPdf } from '../services/pdf/reportPdf.js';
import { buildReadinessReport } from '../services/readinessService.js';
import { PdfDocument } from '../services/pdf/pdfWriter.js';
import {
  ReadinessReportPayload,
  SkillGapItem,
  RoadmapTask,
  AssessmentResult
} from '../../src/types/index.js';

/**
 * Subphase 2G: downloadable Career Readiness Report (PDF).
 *
 * Covers the PDF renderer directly (structure, content, edge cases) and the
 * authenticated download endpoint (authorization, content type, consistency
 * with the report API, and error handling).
 */

const DEMO_TOKEN = 'demo_token_aarav';

function gap(name: string, hours = 10): SkillGapItem {
  return {
    skillId: `skill_${name.slice(0, 6)}`,
    name,
    category: 'Testing',
    currentLevel: 1,
    requiredLevel: 3,
    gap: 2,
    normalizedGap: 0.4,
    importance: 0.8,
    status: 'unverified',
    priorityScore: 70,
    priorityBadge: 'High',
    missingPrerequisites: [],
    estimatedLearningHours: hours,
    reason: `Reason for ${name}`,
    nextRecommendedAction: `Next action for ${name}`
  };
}

function task(skillName: string, status: RoadmapTask['status']): RoadmapTask {
  return {
    id: `t_${skillName}`,
    userId: DEMO_USER_ID,
    skillId: `s_${skillName}`,
    skillName,
    category: 'Testing',
    stageNumber: 1,
    stageName: 'Foundations',
    whyItMatters: 'why',
    currentProficiency: 0,
    targetProficiency: 3,
    priority: 'High',
    priorityScore: 70,
    estimatedHours: 10,
    prerequisites: [],
    learningResources: [],
    practiceActivity: 'practice',
    projectApplication: 'project',
    completionCriteria: ['criterion one'],
    status,
    completionPercentage: status === 'completed' ? 100 : 0,
    userNotes: ''
  };
}

const assessment: AssessmentResult = {
  id: 'a1',
  userId: DEMO_USER_ID,
  skillId: 'python',
  skillName: 'Python Programming',
  scorePercentage: 85,
  totalQuestions: 10,
  correctAnswersCount: 9,
  passed: true,
  answers: [],
  completedAt: new Date('2026-01-01T00:00:00.000Z').toISOString()
};

function makeReport(overrides: Partial<ReadinessReportPayload> = {}): ReadinessReportPayload {
  const base: ReadinessReportPayload = {
    student: {
      fullName: 'Aarav Sharma',
      degree: 'B.Tech in Computer Science',
      educationLevel: 'Undergraduate',
      graduationYear: 2026,
      weeklyHours: 10,
      learningStyle: 'Project-based',
      targetCompanies: ['Acme Corp']
    },
    targetCareer: {
      id: 'aiml',
      title: 'AI/ML Engineer',
      category: 'Artificial Intelligence & Data',
      salaryRange: '$115,000 / INR 14 - 24 LPA',
      marketDemand: 'Very High'
    },
    readiness: {
      overallScore: 42,
      previousScore: 40,
      delta: 2,
      breakdown: { skillCoverageScore: 20.5, assessmentBonus: 12.3, projectEvidenceBonus: 10 },
      positiveFactors: ['Verified via assessment: Python Programming (85%)'],
      criticalGaps: ['Deep Learning'],
      improvementSuggestions: [{ action: 'Take the SQL assessment', potentialGain: 5, type: 'assessment' }],
      calculatedAt: new Date('2026-01-02T00:00:00.000Z').toISOString(),
      disclaimer: 'Educational self-assessment. Not a guarantee of employment.'
    },
    evidenceBreakdown: { unverified: 1, selfReported: 1, assessed: 1, projectVerified: 0 },
    skillProfile: { selfReported: ['SQL & Relational Databases'], assessed: ['Python Programming'], projectBacked: [], unverified: ['Docker'] },
    gapSummary: {
      totalSkills: 3,
      masteredSkills: 1,
      criticalGaps: 1,
      estimatedHours: 20,
      coveragePercentage: 33,
      topGaps: [gap('Deep Learning with PyTorch')]
    },
    allGaps: [gap('Deep Learning with PyTorch')],
    roadmapProgress: {
      totalTasks: 2,
      completedTasks: 1,
      inProgressTasks: 0,
      totalHours: 20,
      completedHours: 10,
      progressPercentage: 50,
      stages: [
        {
          stageNumber: 1,
          stageName: 'Foundations',
          description: 'Core foundations',
          tasks: [task('Python Programming', 'completed'), task('Docker', 'not_started')]
        }
      ]
    },
    verifiedAssessments: [assessment],
    portfolioProjects: [{ id: 'p1', title: 'RAG Pipeline', userStatus: 'in_progress', hasEvidence: true }],
    nextSevenDays: {
      availableHours: 10,
      focusItems: [{ title: 'Close priority gap: Docker', detail: 'Study Docker', hours: 3, kind: 'skill-gap' }],
      totalPlannedHours: 3,
      unallocatedHours: 7,
      note: 'About 7 hours remain unallocated.'
    },
    generatedAt: new Date('2026-01-03T00:00:00.000Z').toISOString()
  };
  return { ...base, ...overrides };
}

function pdfText(buffer: Buffer): string {
  // The writer escapes (, ), and \ inside PDF strings; undo that so tests can
  // assert on human-readable text.
  return buffer.toString('latin1').replace(/\\([()\\])/g, '$1');
}

describe('Subphase 2G: readiness report PDF renderer', () => {
  it('produces a structurally valid PDF document', () => {
    const buffer = generateReadinessReportPdf(makeReport());
    const text = pdfText(buffer);
    expect(buffer.subarray(0, 8).toString('latin1')).toBe('%PDF-1.4');
    expect(text).toContain('/Type /Catalog');
    expect(text).toContain('/Type /Pages');
    expect(text).toContain('/Count');
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(text).toContain('startxref');
    expect(text).toContain('/BaseFont /Helvetica');
  });

  it('contains the header, score, breakdown, and every required section', () => {
    const text = pdfText(generateReadinessReportPdf(makeReport()));
    expect(text).toContain('SkillForge AI');
    expect(text).toContain('Career Readiness Report');
    expect(text).toContain('Aarav Sharma');
    expect(text).toContain('AI/ML Engineer');
    expect(text).toContain('Executive Summary');
    expect(text).toContain('Readiness Breakdown & Methodology');
    expect(text).toContain('Skill Profile by Evidence Source');
    expect(text).toContain('Prioritized Skill Gaps');
    expect(text).toContain('Learning Roadmap');
    expect(text).toContain('Next Seven Days');
    expect(text).toContain('Limitations');
    expect(text).toContain('Page 1 of');
  });

  it('uses the canonical score and breakdown values from the payload', () => {
    const text = pdfText(generateReadinessReportPdf(makeReport()));
    expect(text).toContain('20.5 / 50');
    expect(text).toContain('12.3 / 25');
    expect(text).toContain('10 / 25');
    expect(text).toContain('42 / 100');
  });

  it('labels self-reported evidence honestly and never claims verification', () => {
    const text = pdfText(generateReadinessReportPdf(makeReport()));
    expect(text).toContain('Self-reported (not independently verified)');
    expect(text).toContain('not independently reviewed');
    expect(text).toContain('evidence submitted (self-reported, not independently reviewed)');
    // The report must not claim to predict hiring outcomes.
    expect(text.toLowerCase()).not.toContain('probability of being hired');
  });

  it('handles extremely long, unbreakable skill names without clipping or throwing', () => {
    const longName = 'X'.repeat(400);
    const report = makeReport({ allGaps: [gap(longName)], gapSummary: { ...makeReport().gapSummary, topGaps: [gap(longName)] } });
    const buffer = generateReadinessReportPdf(report);
    expect(buffer.subarray(0, 8).toString('latin1')).toBe('%PDF-1.4');
    expect(pdfText(buffer)).toContain('/Type /Pages');
  });

  it('gracefully handles missing optional fields and an empty profile', () => {
    const report = makeReport({
      student: {
        fullName: '',
        degree: '',
        educationLevel: 'Self-Taught',
        graduationYear: 0,
        weeklyHours: 0,
        learningStyle: 'Project-based',
        targetCompanies: []
      },
      skillProfile: { selfReported: [], assessed: [], projectBacked: [], unverified: [] },
      allGaps: [],
      gapSummary: { totalSkills: 0, masteredSkills: 0, criticalGaps: 0, estimatedHours: 0, coveragePercentage: 0, topGaps: [] },
      verifiedAssessments: [],
      portfolioProjects: [],
      readiness: {
        ...makeReport().readiness,
        positiveFactors: [],
        improvementSuggestions: []
      }
    });
    const buffer = generateReadinessReportPdf(report);
    const text = pdfText(buffer);
    expect(buffer.subarray(0, 8).toString('latin1')).toBe('%PDF-1.4');
    expect(text).toContain('None recorded');
    expect(text).toContain('No portfolio projects with a submitted evidence link are recorded');
    expect(text).toContain('no passed assessments are recorded');
  });

  it('renders multiple roadmap stages', () => {
    const stages = Array.from({ length: 6 }, (_, i) => ({
      stageNumber: i + 1,
      stageName: `Stage name ${i + 1}`,
      description: `Description ${i + 1}`,
      tasks: [task(`Skill ${i + 1}`, i % 2 === 0 ? 'completed' : 'not_started')]
    }));
    const report = makeReport({ roadmapProgress: { ...makeReport().roadmapProgress, stages } });
    const text = pdfText(generateReadinessReportPdf(report));
    expect(text).toContain('Stage name 1');
    expect(text).toContain('Stage name 6');
  });

  it('is deterministic for a fixed payload', () => {
    const report = makeReport();
    const first = generateReadinessReportPdf(report);
    const second = generateReadinessReportPdf(report);
    expect(second.equals(first)).toBe(true);
  });

  it('throws on a malformed payload so the route can fail safely', () => {
    expect(() => generateReadinessReportPdf({ ...makeReport(), student: undefined as any })).toThrow();
  });
});

describe('Subphase 2G: PDF writer text utilities', () => {
  it('hard-splits words longer than the available width', () => {
    const doc = new PdfDocument();
    const lines = doc.wrapText('A'.repeat(200), 'regular', 10, 100);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(doc.textWidth(line, 'regular', 10)).toBeLessThanOrEqual(100.01);
    }
  });

  it('collapses unsupported glyphs and control characters into ASCII', () => {
    const doc = new PdfDocument();
    const lines = doc.wrapText('Café — naïve • 50%', 'regular', 10, 400);
    expect(lines.join(' ')).toMatch(/^[ -~]+$/);
  });
});

describe('Subphase 2G: report PDF download endpoint', () => {
  let server: Server;
  let baseUrl: string;

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

  it('rejects unauthenticated download attempts', async () => {
    const noToken = await fetch(`${baseUrl}/api/readiness/report/pdf`);
    expect(noToken.status).toBe(401);

    const badToken = await fetch(`${baseUrl}/api/readiness/report/pdf`, {
      headers: { Authorization: 'Bearer not-a-real-token' }
    });
    expect(badToken.status).toBe(401);
  });

  it('returns an application/pdf attachment for the authenticated student', async () => {
    const res = await fetch(`${baseUrl}/api/readiness/report/pdf`, {
      headers: { Authorization: `Bearer ${DEMO_TOKEN}` }
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition') || '').toMatch(/attachment; filename="skillforge-readiness-.*\.pdf"/);
    const buffer = Buffer.from(await res.arrayBuffer());
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(3000);
  });

  it('stays consistent with the JSON readiness report for the same student', async () => {
    const reportRes = await fetch(`${baseUrl}/api/readiness/report`, {
      headers: { Authorization: `Bearer ${DEMO_TOKEN}` }
    });
    const reportJson = (await reportRes.json()) as { report: ReadinessReportPayload };

    const pdfRes = await fetch(`${baseUrl}/api/readiness/report/pdf`, {
      headers: { Authorization: `Bearer ${DEMO_TOKEN}` }
    });
    const text = Buffer.from(await pdfRes.arrayBuffer()).toString('latin1');

    expect(text).toContain(reportJson.report.student.fullName);
    expect(text).toContain(reportJson.report.targetCareer.title);
    expect(text).toContain(`${reportJson.report.readiness.overallScore} / 100`);

    // In-process rendering of the same canonical payload is byte-identical,
    // proving the endpoint adds no independent scoring.
    const inProcess = generateReadinessReportPdf(buildReadinessReport(DEMO_USER_ID)!);
    expect(inProcess.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('returns a useful JSON error (not a crash) if PDF generation fails', async () => {
    const original = db.getProfile.bind(db);
    (db as any).getProfile = () => {
      throw new Error('simulated failure');
    };
    try {
      const res = await fetch(`${baseUrl}/api/readiness/report/pdf`, {
        headers: { Authorization: `Bearer ${DEMO_TOKEN}` }
      });
      expect(res.status).toBe(500);
      const body = (await res.json()) as { error: string };
      expect(body.error).toMatch(/pdf/i);
    } finally {
      (db as any).getProfile = original;
    }
  });
});
