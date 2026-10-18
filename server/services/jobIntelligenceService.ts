import { db } from '../db/store.js';
import { checkResumeTruth } from './resumeTruthService.js';
import { buildEvidenceIndex, collectSkillEvidence, normalizeSkillKey } from './evidenceIndex.js';
import type {
  JobDescriptionAnalysis,
  JobDescriptionMatch,
  JobDescriptionNextStep,
  JobAnalysis,
  ResumeTruthDraft,
  ResumeAlignment,
  ResumeAlignmentItem,
  ResumeAlignmentClassification,
  JobPreparationPlan,
  JobPreparationStep,
  CareerTwinEvidenceRef
} from '../../src/types/index.js';

/**
 * Subphase 4A — Job Description Intelligence Engine.
 *
 * Wraps the existing JD analyzer in a persistent, per-user layer that adds:
 *   1. Saved analyses (stored once, fetched/updated via the store),
 *   2. A preparation plan derived from the *same* match/next-step data,
 *   3. A resume alignment that combines JD requirements with the Resume Truth
 *      verdicts for each claim (never fabricating verification).
 *
 * It does not re-extract or re-score; that stays in jobDescriptionExtractor /
 * jobMatchEngine.
 */

const DISCLAIMER =
  'All comparisons use your own stored profile and evidence. An alignment or plan is a ' +
  'recommendation, never a guarantee of hiring outcome.';

const MAX_SAVED_ANALYSES = 50;
const MAX_PLAN_STEPS = 40;

export function saveJobAnalysis(userId: string, input: {
  description: string;
  title?: string;
  company?: string;
  location?: string;
  url?: string;
  analysis: JobDescriptionAnalysis;
}): JobAnalysis | null {
  const profile = db.getProfile(userId);
  if (!profile) return null;

  const now = new Date().toISOString();
  const existing = db.getJobAnalyses(userId);

  const record: JobAnalysis = {
    id: `ja_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    title: (input.title || input.analysis.extraction.jobTitle || 'Untitled posting').trim().slice(0, 200),
    company: input.company?.trim().slice(0, 120) || input.analysis.extraction.companyName || undefined,
    location: input.location?.trim().slice(0, 120) || undefined,
    url: input.url?.trim().slice(0, 400) || undefined,
    description: input.description.slice(0, 20000),
    analysis: input.analysis,
    createdAt: now,
    updatedAt: now
  };

  // Enforce a cap by dropping the oldest (never silently overwriting without limit).
  if (existing.length >= MAX_SAVED_ANALYSES) {
    const sorted = [...existing].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    for (const stale of sorted.slice(MAX_SAVED_ANALYSES - 1)) {
      db.deleteJobAnalysis(userId, stale.id);
    }
  }

  db.saveJobAnalysis(record);
  return record;
}

export function listJobAnalyses(userId: string): JobAnalysis[] {
  return db.getJobAnalyses(userId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function getSavedJobAnalysis(userId: string, analysisId: string): JobAnalysis | undefined {
  return db.getJobAnalysis(userId, analysisId);
}

export function deleteSavedJobAnalysis(userId: string, analysisId: string): boolean {
  return db.deleteJobAnalysis(userId, analysisId);
}

/** Preparation plan: converts the JD's missing/partial requirements into concrete steps. */
export function buildPreparationPlan(userId: string, analysis: JobDescriptionAnalysis): JobPreparationPlan | null {
  const profile = db.getProfile(userId);
  if (!profile) return null;

  const steps: JobPreparationStep[] = [];
  const seen = new Set<string>();

  const roadmapBySkill = new Map(
    db.getRoadmapTasks(userId).map(t => [normalizeSkillKey(t.skillId), t])
  );

  const toStep = (match: JobDescriptionMatch, nextStep?: JobDescriptionNextStep): JobPreparationStep | null => {
    if (match.state === 'matched') return null;
    const key = normalizeSkillKey(match.skillId || match.name);
    if (seen.has(key)) return null;
    seen.add(key);

    const roadmap = roadmapBySkill.get(key);
    return {
      skillId: match.skillId || key,
      skillName: match.name,
      kind: match.kind,
      state: match.state,
      reason: match.reason,
      whyItMatters: nextStep
        ? nextStep.action
        : `Required by this posting but ${match.state === 'missing' ? 'not yet present' : 'only partially matched'} in your profile.`,
      priority: nextStep?.priority ?? (match.state === 'missing' ? 'High' : 'Medium'),
      estimatedHours: nextStep?.estimatedHours ?? roadmap?.estimatedHours,
      resource: nextStep?.resource,
      roadmapTaskId: roadmap?.id,
      route: roadmap ? '/roadmap' : match.state === 'missing' ? '/roadmap' : '/assessments'
    };
  };

  const nextStepBySkill = new Map(
    (analysis.nextSteps || []).map(ns => [normalizeSkillKey(ns.skillId), ns])
  );

  for (const match of analysis.matches || []) {
    if (steps.length >= MAX_PLAN_STEPS) break;
    const step = toStep(match, nextStepBySkill.get(normalizeSkillKey(match.skillId || match.name)));
    if (step) steps.push(step);
  }

  steps.sort((a, b) => {
    const order = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;
    return order[a.priority] - order[b.priority];
  });

  const covered = (analysis.matches || []).filter(m => m.state === 'matched').length;
  const total = (analysis.matches || []).length;

  return {
    targetTitle: analysis.extraction.jobTitle || 'Target role',
    targetCompany: analysis.extraction.companyName,
    coverage: total > 0 ? Math.round((covered / total) * 100) : 0,
    coveredSkills: covered,
    steps,
    generatedAt: new Date().toISOString(),
    disclaimer: DISCLAIMER
  };
}

/**
 * Resume alignment: for every skill the JD asks for, classify how the resume
 * draft (or, if none, the profile) aligns using the Resume Truth verdict.
 */
export function buildResumeAlignment(
  userId: string,
  analysis: JobDescriptionAnalysis,
  draft?: ResumeTruthDraft | null
): ResumeAlignment | null {
  const profile = db.getProfile(userId);
  if (!profile) return null;

  const truth = draft ? checkResumeTruth(userId, draft) : null;
  const truthBySkill = new Map((truth?.skills ?? []).map(s => [normalizeSkillKey(s.skillId), s]));
  const evidenceIndex = buildEvidenceIndex(userId);
  const profileSkills = new Map(profile.currentSkills.map(s => [normalizeSkillKey(s.skillId), s]));

  const classify = (match: JobDescriptionMatch): { classification: ResumeAlignmentClassification; note: string } => {
    const key = normalizeSkillKey(match.skillId || match.name);
    const claim = truthBySkill.get(key);
    const profileSkill = profileSkills.get(key);

    if (truth && claim) {
      switch (claim.verdict) {
        case 'verified':
          return { classification: 'evidence-found', note: claim.suggestion };
        case 'project-backed':
          return { classification: 'partial', note: claim.suggestion };
        case 'in-profile':
          return { classification: 'partial', note: claim.suggestion };
        case 'unsupported':
        default:
          return { classification: 'gap', note: claim.suggestion };
      }
    }

    if (!profileSkill && !evidenceIndex.has(key)) {
      return {
        classification: 'not-enough-info',
        note: match.reason || 'This requirement is not represented in your profile or evidence, and no resume claim was supplied.'
      };
    }

    if (match.state === 'missing') {
      return { classification: 'gap', note: match.reason || 'Missing from your profile.' };
    }
    if (match.state === 'partial') {
      return { classification: 'partial', note: match.reason || 'Partially matched.' };
    }
    if (match.state === 'matched') {
      return { classification: 'evidence-found', note: match.reason || 'Matched against your stored evidence.' };
    }
    return { classification: 'not-enough-info', note: match.reason || 'Insufficient information to classify.' };
  };

  const items: ResumeAlignmentItem[] = (analysis.matches || []).map(match => {
    const key = normalizeSkillKey(match.skillId || match.name);
    const evidence: CareerTwinEvidenceRef[] = collectSkillEvidence(evidenceIndex, match.skillId || key, match.name);
    const { classification, note } = classify(match);
    return {
      skillId: match.skillId,
      skillName: match.name,
      kind: match.kind,
      importance: match.weight,
      jdExpectation: match.reason || 'Expected by this posting.',
      classification,
      alignmentNote: note,
      profileEvidence: evidence.map(e => `${e.kind}: ${e.label}`),
      resumeVerdict: truthBySkill.get(key)?.verdict,
      nextAction: classification === 'evidence-found'
        ? 'Mention this verified skill in your resume bullet points.'
        : classification === 'partial'
          ? 'Strengthen the claim with a project or assessment before asserting it strongly.'
          : 'Add this to your profile and back it with an assessment or project before claiming it.'
    };
  });

  const counts = {
    evidenceFound: items.filter(i => i.classification === 'evidence-found').length,
    partial: items.filter(i => i.classification === 'partial').length,
    gap: items.filter(i => i.classification === 'gap').length,
    notEnoughInfo: items.filter(i => i.classification === 'not-enough-info').length
  };

  return {
    targetTitle: analysis.extraction.jobTitle || 'Target role',
    usedResumeDraft: !!truth,
    items,
    summary: counts,
    generatedAt: new Date().toISOString(),
    disclaimer: DISCLAIMER
  };
}
