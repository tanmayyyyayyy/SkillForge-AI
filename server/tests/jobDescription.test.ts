import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Server } from 'node:http';
import { createApp } from '../app.js';
import { db } from '../db/store.js';
import { CAREER_ROLES } from '../data/careers.js';
import { JD_CONFIG } from '../config.js';
import {
  extractJobDescriptionDeterministic,
  canonicalizeMentions,
  resolveJobSkill
} from '../services/jobDescriptionExtractor.js';
import { calculateJobMatch } from '../engine/jobMatchEngine.js';
import { validateJobDescriptionExtraction } from '../../src/utils/jobDescriptionSchema.js';
import type {
  StudentProfile,
  JobDescriptionExtraction,
  JobDescriptionSkillMention,
  JobDescriptionMatch
} from '../../src/types/index.js';

/**
 * Subphase 2H: Job Description Analyzer.
 *
 * The posting is parsed deterministically, matched against the canonical
 * career catalog and the student's own profile, and scored with a documented
 * formula. The engine must never invent skills, never fabricate proficiency,
 * and never feed the readiness score.
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

/** Independent copy of the catalog weight lookup (max importance across roles). */
function catalogWeight(skillId: string): number {
  let max = 0;
  for (const role of CAREER_ROLES) {
    for (const skill of role.requiredSkills) {
      if (skill.skillId === skillId) max = Math.max(max, skill.importance);
    }
  }
  return max > 0 ? Math.round(max * 100) / 100 : 0.6;
}

function makeMention(
  partial: Partial<JobDescriptionSkillMention> & { skillId: string; name: string }
): JobDescriptionSkillMention {
  return {
    category: 'General',
    kind: 'required',
    sections: [],
    evidence: '',
    inferred: false,
    confidence: 'high',
    ...partial
  };
}

function makeExtraction(skills: JobDescriptionSkillMention[]): JobDescriptionExtraction {
  return { skills, qualifications: [], responsibilities: [], warnings: [] };
}

function makeProfile(): StudentProfile {
  return {
    userId: 'test_user_jd',
    fullName: 'Test Student',
    educationLevel: 'Undergraduate',
    degree: 'Computer Science',
    branch: 'Artificial Intelligence',
    institution: 'Test University',
    graduationYear: 2027,
    currentAcademicYear: 'Year 3',
    experienceLevel: 'Intermediate',
    weeklyHours: 12,
    preferredLearningStyle: 'Project-based',
    targetCompanies: [],
    targetRole: 'aiml',
    targetCompletionPeriod: '6 Months',
    constraints: [],
    preferredDomains: [],
    currentSkills: [
      {
        skillId: 'python',
        name: 'Python Programming',
        category: 'Programming Languages',
        proficiency: 4,
        status: 'self-reported',
        source: 'self-reported'
      },
      {
        skillId: 'sql',
        name: 'SQL & Relational Databases',
        category: 'Data Management',
        proficiency: 1,
        status: 'self-reported',
        source: 'self-reported'
      }
    ],
    existingProjects: [],
    experience: [],
    certifications: [],
    interests: [],
    updatedAt: '2026-01-01T00:00:00.000Z'
  };
}

function findMatch(matches: JobDescriptionMatch[], skillId: string): JobDescriptionMatch {
  const match = matches.find(m => m.skillId === skillId);
  if (!match) throw new Error(`Expected a match for '${skillId}'`);
  return match;
}

// ---------------------------------------------------------------------------
// HTTP harness (integration)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Deterministic extraction
// ---------------------------------------------------------------------------

describe('Job description extraction (deterministic)', () => {
  it('classifies skills by the section they appear in', () => {
    const { extraction } = extractJobDescriptionDeterministic(JD_SAMPLE);
    const byId = new Map(extraction.skills.map(s => [s.skillId, s]));

    expect(byId.get('python')?.kind).toBe('required');
    expect(byId.get('docker')?.kind).toBe('required');
    expect(byId.get('cloud_platforms')?.kind).toBe('preferred');
    expect(byId.get('kubernetes')?.kind).toBe('preferred');
    expect(byId.get('rest_apis')?.kind).toBe('responsibility');
    expect(byId.get('git_versioning')?.kind).toBe('required');
  });

  it('extracts the job title and company from the preamble', () => {
    const { extraction } = extractJobDescriptionDeterministic(JD_SAMPLE);
    expect(extraction.jobTitle).toBe('Senior Backend Engineer');
    expect(extraction.companyName).toBe('TechAxis Solutions Pvt Ltd');
  });

  it('captures verbatim responsibilities and qualifications bullets', () => {
    const { extraction } = extractJobDescriptionDeterministic(JD_SAMPLE);
    expect(extraction.responsibilities.length).toBeGreaterThan(0);
    expect(extraction.qualifications.length).toBeGreaterThan(0);
    expect(extraction.responsibilities.some(r => r.includes('REST APIs'))).toBe(true);
    expect(extraction.qualifications.some(q => q.includes('Python'))).toBe(true);
  });

  it('labels skills found without any heading as inferred with lower confidence', () => {
    const { extraction, warnings } = extractJobDescriptionDeterministic(
      'We are hiring a Python developer who also knows SQL for reporting work.'
    );

    const python = extraction.skills.find(s => s.skillId === 'python');
    expect(python).toBeDefined();
    expect(python!.inferred).toBe(true);
    expect(python!.confidence === 'medium' || python!.confidence === 'low').toBe(true);
    expect(extraction.skills.find(s => s.skillId === 'sql')!.inferred).toBe(true);
    expect(warnings.some(w => w.includes('No standard section headings'))).toBe(true);
    expect(warnings.some(w => w.includes('Very little text'))).toBe(true);
  });

  it('is deterministic — identical input produces identical output', () => {
    const a = extractJobDescriptionDeterministic(JD_SAMPLE);
    const b = extractJobDescriptionDeterministic(JD_SAMPLE);
    expect(a.extraction.skills).toEqual(b.extraction.skills);
    expect(a.extraction.jobTitle).toBe(b.extraction.jobTitle);
    expect(a.warnings).toEqual(b.warnings);
  });

  it('never invents skills that are absent from the posting', () => {
    const { extraction } = extractJobDescriptionDeterministic(JD_SAMPLE);
    const ids = extraction.skills.map(s => s.skillId);
    expect(ids).not.toContain('pytorch');
    expect(ids).not.toContain('mlops');
    expect(ids).not.toContain('graphql');
  });
});

// ---------------------------------------------------------------------------
// Skill resolution / schema validation
// ---------------------------------------------------------------------------

describe('Skill resolution and extraction validation', () => {
  it('resolves display names back to canonical career-catalog IDs', () => {
    expect(resolveJobSkill('React.js')?.skillId).toBe('react');
    expect(resolveJobSkill('CI/CD')?.skillId).toBe('cicd_pipelines');
    expect(resolveJobSkill('PostgreSQL')?.skillId).toBe('sql');
    expect(resolveJobSkill('Classical ML (Scikit-Learn)')?.skillId).toBe('scikit_learn');
    expect(resolveJobSkill('') ).toBeNull();
  });

  it('keeps an explicitly supplied canonical skill ID byte-identical', () => {
    const result = validateJobDescriptionExtraction({
      skills: [{ name: 'Classical ML (Scikit-Learn)', skillId: 'scikit_learn', kind: 'required' }]
    });
    expect(result.isValid).toBe(true);
    expect(result.extraction.skills[0].skillId).toBe('scikit_learn');
  });

  it('rejects non-object and missing-skills payloads', () => {
    expect(validateJobDescriptionExtraction('not an object').isValid).toBe(false);
    expect(validateJobDescriptionExtraction({ jobTitle: 'x' }).isValid).toBe(false);
    expect(validateJobDescriptionExtraction({ skills: 'nope' }).isValid).toBe(false);
  });

  it('drops nameless entries and coerces invalid kinds/confidence', () => {
    const result = validateJobDescriptionExtraction({
      skills: [
        { name: '   ' },
        { name: 'Python', kind: 'totally-invalid', confidence: 'sure', sections: [1, 2] }
      ]
    });
    expect(result.isValid).toBe(true);
    expect(result.extraction.skills).toHaveLength(1);
    expect(result.extraction.skills[0].kind).toBe('required');
    expect(result.extraction.skills[0].confidence).toBe('medium');
    expect(result.extraction.skills[0].sections).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('canonicalizes AI-sourced names through the shared lexicon without duplication', () => {
    const canonical = canonicalizeMentions(
      makeExtraction([
        makeMention({ skillId: 'react_js', name: 'React.js', kind: 'required' }),
        makeMention({ skillId: 'react', name: 'React', kind: 'preferred' })
      ])
    );

    expect(canonical.skills).toHaveLength(1);
    expect(canonical.skills[0].skillId).toBe('react');
    // required outranks preferred when the same skill is listed twice.
    expect(canonical.skills[0].kind).toBe('required');
  });
});

// ---------------------------------------------------------------------------
// Match engine
// ---------------------------------------------------------------------------

describe('Job description match engine', () => {
  it('classifies matched / partial / missing against the target track catalog', () => {
    const extraction = makeExtraction([
      makeMention({ skillId: 'python', name: 'Python Programming', category: 'Programming Languages' }),
      makeMention({ skillId: 'sql', name: 'SQL & Relational Databases', category: 'Data Management' }),
      makeMention({ skillId: 'docker', name: 'Docker & Containerization', category: 'DevOps & Deployment' }),
      makeMention({ skillId: 'ui_ux', name: 'UI/UX & Design Tools', category: 'Design', kind: 'preferred' })
    ]);

    const analysis = calculateJobMatch(makeProfile(), extraction, 'deterministic');

    expect(findMatch(analysis.matches, 'python').state).toBe('matched');
    expect(findMatch(analysis.matches, 'python').profileProficiency).toBe(4);
    expect(findMatch(analysis.matches, 'python').roleRequiredLevel).toBe(4);

    expect(findMatch(analysis.matches, 'sql').state).toBe('partial');
    expect(findMatch(analysis.matches, 'sql').roleRequiredLevel).toBe(3);

    expect(findMatch(analysis.matches, 'docker').state).toBe('missing');
    expect(findMatch(analysis.matches, 'docker').profileProficiency).toBeUndefined();

    expect(findMatch(analysis.matches, 'ui_ux').kind).toBe('preferred');
    expect(findMatch(analysis.matches, 'ui_ux').state).toBe('missing');

    expect(analysis.summary.matchedCount).toBe(1);
    expect(analysis.summary.partialCount).toBe(1);
    expect(analysis.summary.missingCount).toBe(2);
    expect(analysis.summary.requiredSkillCount).toBe(3);
    expect(analysis.summary.preferredSkillCount).toBe(1);
  });

  it('scores with the documented weighted-coverage formula', () => {
    const extraction = makeExtraction([
      makeMention({ skillId: 'python', name: 'Python Programming' }),
      makeMention({ skillId: 'sql', name: 'SQL & Relational Databases' }),
      makeMention({ skillId: 'docker', name: 'Docker & Containerization' }),
      makeMention({ skillId: 'ui_ux', name: 'UI/UX & Design Tools', kind: 'preferred' })
    ]);

    const analysis = calculateJobMatch(makeProfile(), extraction, 'deterministic');
    const { summary, matches } = analysis;

    // Weights come from the career catalog (max importance across roles).
    const wp = catalogWeight('python');
    const ws = catalogWeight('sql');
    const wd = catalogWeight('docker');
    const wu = catalogWeight('ui_ux');

    expect(findMatch(matches, 'python').weight).toBe(wp);
    expect(findMatch(matches, 'sql').weight).toBe(ws);
    expect(findMatch(matches, 'docker').weight).toBe(wd);
    expect(findMatch(matches, 'ui_ux').weight).toBe(wu);

    const requiredWeight = wp + ws + wd;
    const creditFor: Record<string, number> = { python: 1, sql: 0.5, docker: 0 };
    const weightFor: Record<string, number> = { python: wp, sql: ws, docker: wd };
    const earned = Object.keys(weightFor).reduce(
      (sum, id) => sum + weightFor[id] * creditFor[id],
      0
    );
    const expectedRequired = Math.round((earned / requiredWeight) * 100);

    expect(summary.requiredCoverage).toBe(expectedRequired);
    expect(summary.preferredCoverage).toBe(0);
    const expectedPreferred = 0;
    expect(summary.matchScore).toBe(Math.round(expectedRequired * 0.75 + expectedPreferred * 0.25));
    expect(summary.methodology).toContain('Coverage =');
    expect(summary.note).toBeUndefined();
  });

  it('falls back to required-coverage alone when no preferred skills are listed', () => {
    const analysis = calculateJobMatch(
      makeProfile(),
      makeExtraction([makeMention({ skillId: 'python', name: 'Python Programming' })]),
      'deterministic'
    );

    expect(analysis.summary.preferredCoverage).toBeNull();
    expect(analysis.summary.requiredCoverage).toBe(100);
    expect(analysis.summary.matchScore).toBe(100);
    expect(analysis.summary.methodology).toContain('no preferred skills');
  });

  it('refuses to produce a score when the posting yields no scorable skills', () => {
    const analysis = calculateJobMatch(makeProfile(), makeExtraction([]), 'deterministic');

    expect(analysis.summary.matchScore).toBeNull();
    expect(analysis.summary.requiredCoverage).toBeNull();
    expect(analysis.summary.note).toBeTruthy();
    expect(analysis.matches).toHaveLength(0);
    expect(analysis.nextSteps).toHaveLength(0);
  });

  it('counts a duplicated skill only once', () => {
    const analysis = calculateJobMatch(
      makeProfile(),
      makeExtraction([
        makeMention({ skillId: 'python', name: 'Python Programming' }),
        makeMention({ skillId: 'python', name: 'Python', kind: 'preferred' })
      ]),
      'deterministic'
    );

    expect(analysis.matches).toHaveLength(1);
    expect(analysis.matches[0].kind).toBe('required');
    expect(analysis.summary.extractedSkillCount).toBe(1);
  });

  it('generates next steps from the canonical gap engine for target-track skills', () => {
    const analysis = calculateJobMatch(
      makeProfile(),
      makeExtraction([
        makeMention({ skillId: 'python', name: 'Python Programming' }),
        makeMention({ skillId: 'sql', name: 'SQL & Relational Databases' }),
        makeMention({ skillId: 'docker', name: 'Docker & Containerization' }),
        makeMention({ skillId: 'ui_ux', name: 'UI/UX & Design Tools', kind: 'preferred' })
      ]),
      'deterministic'
    );

    // Matched skills need no action; only partial/missing ones do.
    const ids = analysis.nextSteps.map(s => s.skillId);
    expect(ids).toHaveLength(3);
    expect(ids).not.toContain('python');
    expect(ids).toEqual(expect.arrayContaining(['sql', 'docker', 'ui_ux']));

    const docker = analysis.nextSteps.find(s => s.skillId === 'docker')!;
    expect(docker.inTargetTrack).toBe(true);
    expect(docker.resource).toBeDefined();
    expect(docker.action.length).toBeGreaterThan(10);
    expect(docker.estimatedHours).toBeGreaterThan(0);

    const offTrack = analysis.nextSteps.find(s => s.skillId === 'ui_ux')!;
    expect(offTrack.inTargetTrack).toBe(false);
    expect(offTrack.action.length).toBeGreaterThan(10);
  });

  it('reports the closest career track without changing the target career', () => {
    const profile = makeProfile();
    const analysis = calculateJobMatch(
      profile,
      makeExtraction([
        makeMention({ skillId: 'python', name: 'Python Programming' }),
        makeMention({ skillId: 'sql', name: 'SQL & Relational Databases' }),
        makeMention({ skillId: 'docker', name: 'Docker & Containerization' })
      ]),
      'deterministic'
    );

    expect(analysis.targetRole).toEqual({ id: 'aiml', title: 'AI/ML Engineer' });
    expect(analysis.closestRole).toBeDefined();
    expect(analysis.closestRole!.overlap).toBeGreaterThan(0);
    expect(profile.targetRole).toBe('aiml');
  });
});

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

describe('Job Description Analyzer API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await api('/api/jd/analyze', {
      method: 'POST',
      token: null,
      body: { description: JD_SAMPLE }
    });
    expect(res.status).toBe(401);
  });

  it('exposes limits and provider state', async () => {
    const res = await api('/api/jd/config');
    expect(res.status).toBe(200);
    expect(res.body.minChars).toBe(JD_CONFIG.minChars);
    expect(res.body.maxChars).toBe(JD_CONFIG.maxChars);
    expect(typeof res.body.aiConfigured).toBe('boolean');
  });

  it('rejects a missing or too-short description', async () => {
    const empty = await api('/api/jd/analyze', { method: 'POST', body: {} });
    expect(empty.status).toBe(400);

    const short = await api('/api/jd/analyze', { method: 'POST', body: { description: 'Need a dev' } });
    expect(short.status).toBe(400);
    expect(String(short.body.error)).toContain('too short');
  });

  it('rejects an oversized description', async () => {
    const res = await api('/api/jd/analyze', {
      method: 'POST',
      body: { description: 'x'.repeat(JD_CONFIG.maxChars + 1) }
    });
    expect(res.status).toBe(413);
  });

  it('returns a server-computed analysis for a pasted posting', async () => {
    const res = await api('/api/jd/analyze', { method: 'POST', body: { description: JD_SAMPLE } });
    expect(res.status).toBe(200);

    const { analysis } = res.body;
    expect(analysis).toBeDefined();
    expect(['deterministic', 'gemini']).toContain(analysis.source);
    expect(analysis.matches.length).toBeGreaterThan(5);
    expect(analysis.summary.methodology).toContain('Coverage =');
    expect(analysis.targetRole.id).toBe('aiml');

    // The server — never the client — decides the verdicts.
    const python = analysis.matches.find((m: any) => m.skillId === 'python');
    expect(python.state).toBe('partial');
    expect(python.profileProficiency).toBe(3);
    expect(python.roleRequiredLevel).toBe(4);

    const docker = analysis.matches.find((m: any) => m.skillId === 'docker');
    expect(docker.state).toBe('missing');

    const cloud = analysis.matches.find((m: any) => m.skillId === 'cloud_platforms');
    expect(cloud.kind).toBe('preferred');

    expect(typeof analysis.summary.matchScore).toBe('number');
    expect(analysis.summary.matchScore).toBeGreaterThanOrEqual(0);
    expect(analysis.summary.matchScore).toBeLessThanOrEqual(100);
    expect(analysis.nextSteps.length).toBeGreaterThan(0);
  });

  it('never trusts a client-supplied score or skill verdict', async () => {
    const res = await api('/api/jd/analyze', {
      method: 'POST',
      body: {
        description: JD_SAMPLE,
        matchScore: 100,
        matches: [{ skillId: 'python', state: 'matched' }],
        source: 'gemini'
      }
    });

    expect(res.status).toBe(200);
    // Server recomputes from the text + canonical profile, ignoring extras.
    expect(res.body.analysis.source).not.toBe('gemini');
    expect(res.body.analysis.matches.find((m: any) => m.skillId === 'python').state).toBe('partial');
    expect(res.body.analysis.summary.matchScore).toBeLessThan(100);
  });
});
