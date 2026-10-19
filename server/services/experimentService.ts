import { db } from '../db/store.js';
import { CAREER_ROLES } from '../data/careers.js';
import { calculateCareerReadiness } from '../engine/readinessEngine.js';
import { calculateSkillGaps } from '../engine/gapEngine.js';
import { buildExplanation, reference } from './explanationService.js';
import { getGapChallenge, evaluateGapSubmission, type GapEvaluationResult } from './skillProofLabService.js';
import { generateForgedProject, submitForgedProjectMilestoneEvidence } from './projectForgeService.js';
import { createInterviewSession, evaluateInterviewAnswer, finishInterviewSession } from './interviewArenaService.js';
import { buildEvidenceLedger } from './evidenceLedger.js';
import type {
  CareerReadinessScore,
  ExperimentStage,
  ExplainabilityReference,
  ReadinessExperimentRecord,
  StudentProfile
} from '../../src/types/index.js';

/**
 * SkillForge 2.0 — Live Career Readiness Experiment (Phase 3).
 *
 * Runs a reproducible before/after experiment over real state. Every stage that
 * claims progress is backed by a real evidence record produced by an existing
 * engine (Proof of Skill, Project Forge, Interview Arena). Readiness is measured
 * with the same deterministic formula used everywhere else and is never inflated.
 */

const EXPERIMENT_DISCLAIMER =
  'Readiness is computed by the deterministic readiness engine over your real evidence. ' +
  'This experiment reports the observed change; it does not guarantee hiring outcomes.';

const STAGE_TEMPLATE: Array<{ kind: ExperimentStage['kind']; title: string; detail: string; route?: string }> = [
  { kind: 'objective', title: 'Define the objective', detail: 'State the readiness goal this experiment will test.' },
  { kind: 'snapshot', title: 'Capture an initial readiness snapshot', detail: 'Record the readiness score and its breakdown before any new evidence.' },
  { kind: 'gap_selection', title: 'Select the highest-priority gap', detail: 'Choose the skill gap with the largest weighted impact on the target role.' },
  { kind: 'challenge', title: 'Prove the gap with a practical challenge', detail: 'Submit a gap-driven challenge and record its evidence.', route: '/proof-of-skill' },
  { kind: 'project_milestone', title: 'Complete a project milestone with evidence', detail: 'Ship a milestone tied to the gap and submit its artifact link.', route: '/project-forge' },
  { kind: 'evidence_collection', title: 'Collect the new evidence', detail: 'Gather every evidence record produced during the experiment.' },
  { kind: 'interview', title: 'Answer a targeted interview question', detail: 'Validate the skill verbally against a role-specific prompt.', route: '/interview-arena' },
  { kind: 'recalculation', title: 'Recalculate readiness', detail: 'Re-run the readiness engine over the new evidence.' },
  { kind: 'report', title: 'Report the outcome', detail: 'Explain exactly which metrics changed and which evidence caused it.' }
];

function freshStages(): ExperimentStage[] {
  return STAGE_TEMPLATE.map(s => ({ ...s, status: 'pending' }));
}

function advance(stages: ExperimentStage[]): ExperimentStage[] {
  let activated = false;
  return stages.map(s => {
    if (s.status === 'completed') return s;
    if (!activated) {
      activated = true;
      return { ...s, status: 'active' as const };
    }
    return { ...s, status: s.status === 'active' ? 'pending' : s.status };
  });
}

function markCompleted(
  stages: ExperimentStage[],
  kind: ExperimentStage['kind'],
  detail?: string,
  evidenceRefs?: ExplainabilityReference[]
): ExperimentStage[] {
  const next = stages.map(s =>
    s.kind === kind
      ? {
          ...s,
          status: 'completed' as const,
          detail: detail ?? s.detail,
          evidenceRefs: evidenceRefs ?? s.evidenceRefs
        }
      : s
  );
  return advance(next);
}

function topGap(profile: StudentProfile, roleId: string) {
  const role = CAREER_ROLES.find(r => r.id === roleId) || CAREER_ROLES[0];
  const gaps = calculateSkillGaps(profile, role);
  return gaps.items.find(i => i.gap > 0) ?? gaps.items[0] ?? null;
}

function snapshotReadiness(userId: string, profile: StudentProfile): CareerReadinessScore {
  const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];
  return calculateCareerReadiness(profile, role, db.getAssessments(userId), db.getProjects(userId), 0);
}

function collectEvidenceRefs(userId: string, gapSkillId: string): ExplainabilityReference[] {
  const refs: ExplainabilityReference[] = [];
  const key = gapSkillId.toLowerCase();

  for (const ev of db.getProofOfSkillEvidence(userId)) {
    if (ev.skillId.toLowerCase() === key || (ev.challengeId || '').startsWith('pos_gap_')) {
      refs.push(
        reference(
          `Proof of Skill — ${ev.skillName} (${ev.evaluationMethod})`,
          'Proof of Skill Engine',
          '/proof-of-skill'
        )
      );
    }
  }

  for (const project of db.getForgedProjects(userId)) {
    for (const m of project.milestones) {
      if (m.completed) {
        refs.push(reference(`Project milestone — ${m.title}`, 'Project Forge Engine', '/project-forge'));
      }
    }
  }

  for (const session of db.getInterviewSessions(userId)) {
    if (session.status === 'completed') {
      refs.push(reference('Completed technical interview session', 'Interview Arena', '/interview-arena'));
      break;
    }
  }

  const seen = new Set<string>();
  return refs.filter(r => (seen.has(r.label) ? false : (seen.add(r.label), true)));
}

export function startExperiment(userId: string, goalOverride?: string): ReadinessExperimentRecord | null {
  const profile = db.getProfile(userId);
  if (!profile) return null;
  const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];
  const gap = topGap(profile, role.id);
  const initial = snapshotReadiness(userId, profile);

  const goal = (goalOverride && goalOverride.trim()) || `Raise readiness for ${role.title} by proving my top skill gap.`;

  const stages = freshStages();
  let progressed = markCompleted(stages, 'objective', goal);
  progressed = markCompleted(progressed, 'snapshot', `Initial readiness: ${initial.overallScore}%.`);
  progressed = markCompleted(
    progressed,
    'gap_selection',
    gap ? `Selected gap: ${gap.name} (${gap.priorityBadge} priority, score ${gap.priorityScore}).` : 'No prioritized gap found.'
  );

  const record: ReadinessExperimentRecord = {
    id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    goal,
    targetRole: { id: role.id, title: role.title },
    status: 'running',
    gapSkillId: gap?.skillId ?? '',
    gapSkillName: gap?.name ?? 'Core skills',
    challengeId: getGapChallenge(userId, gap?.skillId)?.challengeId,
    initialReadiness: initial.overallScore,
    initialBreakdown: initial.breakdown,
    stages: progressed,
    evidenceGained: [],
    metricChanges: [],
    reportSummary: '',
    startedAt: new Date().toISOString(),
    disclaimer: EXPERIMENT_DISCLAIMER
  };

  db.saveReadinessExperiment(record);
  return record;
}

export function getExperiment(userId: string, id: string): ReadinessExperimentRecord | null {
  return db.getReadinessExperiment(userId, id) ?? null;
}

export function listExperiments(userId: string): ReadinessExperimentRecord[] {
  return db.getReadinessExperiments(userId);
}

function withStage(
  userId: string,
  id: string,
  kind: ExperimentStage['kind'],
  mutate: (record: ReadinessExperimentRecord) => ReadinessExperimentRecord | null,
  stagePatch?: { detail?: string; evidenceRefs?: ExplainabilityReference[] }
): ReadinessExperimentRecord | null {
  const record = db.getReadinessExperiment(userId, id);
  if (!record) return null;
  const updated = mutate(record);
  if (!updated) return null;
  const next: ReadinessExperimentRecord = {
    ...updated,
    stages: markCompleted(updated.stages, kind, stagePatch?.detail, stagePatch?.evidenceRefs),
    evidenceGained: collectEvidenceRefs(userId, updated.gapSkillId)
  };
  db.saveReadinessExperiment(next);
  return next;
}

export interface ChallengeStageResult {
  record: ReadinessExperimentRecord;
  evaluation: GapEvaluationResult;
}

export async function submitChallengeStage(
  userId: string,
  id: string,
  solution: string
): Promise<ChallengeStageResult | null> {
  const record = db.getReadinessExperiment(userId, id);
  if (!record) return null;
  const evaluation = await evaluateGapSubmission(userId, solution, record.gapSkillId);
  if (!evaluation) return null;

  const attempt = {
    at: new Date().toISOString(),
    scorePercentage: evaluation.scorePercentage,
    passed: evaluation.passed,
    evaluationMethod: evaluation.evaluationMethod,
    evidenceClassification: evaluation.evidenceClassification,
    feedback: evaluation.feedback
  };
  const attempts = [...(record.challengeAttempts ?? []), attempt];

  if (!evaluation.passed) {
    // A failed attempt must NOT complete the challenge stage. The stage stays
    // active with an honest next-step so the learner retries instead of being
    // advanced to the next stage with no real evidence.
    const stages = record.stages.map(s =>
      s.kind === 'challenge'
        ? {
            ...s,
            status: 'active' as const,
            detail: `Attempt ${attempts.length} did not pass (${evaluation.scorePercentage}%). ${evaluation.feedback} Retry with stronger evidence.`
          }
        : s
    );
    const next: ReadinessExperimentRecord = {
      ...record,
      challengeAttempts: attempts,
      stages,
      nextRecommendedAction: {
        label: 'Retry the gap challenge',
        route: '/proof-of-skill',
        detail: `Your last attempt scored ${evaluation.scorePercentage}%. Rewrite and resubmit to complete the challenge stage.`
      }
    };
    db.saveReadinessExperiment(next);
    return { record: next, evaluation };
  }

  const evidenceRefs: ExplainabilityReference[] = evaluation.evidenceRecord
    ? [
        reference(
          `Proof of Skill — ${evaluation.skillName} ${evaluation.scorePercentage}% (${evaluation.evidenceClassification})`,
          'Skill Proof Lab',
          '/proof-of-skill'
        )
      ]
    : [];

  const updated = withStage(
    userId,
    id,
    'challenge',
    current => ({ ...current, challengeAttempts: attempts }),
    {
      detail: `Passed on attempt ${attempts.length}: ${evaluation.scorePercentage}% (${evaluation.evidenceClassification}).`,
      evidenceRefs
    }
  );
  if (!updated) return null;
  return { record: updated, evaluation };
}

export interface MilestoneStageEvaluation {
  record: ReadinessExperimentRecord;
  milestoneTitle: string;
  awarded: boolean;
}

export async function submitMilestoneStage(
  userId: string,
  id: string,
  evidence: { repoUrl?: string; artifactUrl?: string; notes?: string }
): Promise<MilestoneStageEvaluation | null> {
  const record = db.getReadinessExperiment(userId, id);
  if (!record) return null;
  const profile = db.getProfile(userId);
  if (!profile) return null;

  // Reuse an existing forged project when present, otherwise forge one targeting
  // the experiment's gap skill.
  let project = db.getForgedProjects(userId).find(p => p.milestones.some(m => !m.completed));
  if (!project) {
    project = (await generateForgedProject(userId, {
      targetRole: record.targetRole.id,
      targetedGapSkills: [record.gapSkillName],
      difficulty: profile.experienceLevel === 'Advanced' ? 'Industry-Grade' : 'Advanced'
    })) ?? undefined;
  }
  if (!project) return null;

  const milestone = project.milestones.find(m => !m.completed) ?? project.milestones[0];
  const result = submitForgedProjectMilestoneEvidence(userId, project.id, milestone.id, {
    repoUrl: evidence.repoUrl,
    artifactUrl: evidence.artifactUrl,
    notes: evidence.notes || 'Submitted during the Live Readiness Experiment.'
  });
  if (!result) return null;

  const evidenceRefs: ExplainabilityReference[] = [
    reference(`Project milestone — ${milestone.title} (awarded: ${result.awarded ? 'yes' : 'no'})`, 'Project Forge Engine', '/project-forge')
  ];

  const updated = withStage(userId, id, 'project_milestone', current => current, {
    detail: `Milestone "${milestone.title}" — ${result.awarded ? 'evidence awarded' : 'evidence not awarded'}.`,
    evidenceRefs
  });
  if (!updated) return null;
  return { record: updated, milestoneTitle: milestone.title, awarded: result.awarded };
}

export interface InterviewStageResult {
  record: ReadinessExperimentRecord;
  question: string;
  score?: number;
}

/** Prepares the targeted interview question, persisting the session for reuse. */
export async function prepareInterviewStage(
  userId: string,
  id: string
): Promise<{ record: ReadinessExperimentRecord; question: string } | null> {
  const record = db.getReadinessExperiment(userId, id);
  if (!record) return null;

  if (record.interviewSessionId && record.interviewQuestion) {
    return { record, question: record.interviewQuestion };
  }

  const session = await createInterviewSession(userId, 'technical', record.targetRole.id);
  if (!session) return null;
  const question = session.questions[0];
  if (!question) return null;

  const next: ReadinessExperimentRecord = {
    ...record,
    interviewSessionId: session.id,
    interviewQuestion: question.question
  };
  db.saveReadinessExperiment(next);
  return { record: next, question: question.question };
}

export async function submitInterviewStage(
  userId: string,
  id: string,
  answer: string
): Promise<InterviewStageResult | null> {
  const record = db.getReadinessExperiment(userId, id);
  if (!record) return null;

  let sessionId = record.interviewSessionId;
  let question = record.interviewQuestion;

  if (!sessionId || !question) {
    const prepared = await prepareInterviewStage(userId, id);
    if (!prepared) return null;
    sessionId = prepared.record.interviewSessionId;
    question = prepared.question;
  }
  if (!sessionId || !question) return null;

  const current = db.getInterviewSession(userId, sessionId);
  const questionId = current?.questions[0]?.id;
  if (!questionId) return null;

  const evaluated = await evaluateInterviewAnswer(userId, sessionId, questionId, answer);
  await finishInterviewSession(userId, sessionId);

  const updated = withStage(
    userId,
    id,
    'interview',
    currentRecord =>
      currentRecord.interviewSessionId
        ? currentRecord
        : { ...currentRecord, interviewSessionId: sessionId, interviewQuestion: question },
    {
      detail: `Interview answer scored ${evaluated?.evaluation?.scoreOutOf10 ?? 'n/a'}/10.`,
      evidenceRefs: [
        reference(
          `Interview answer — ${question.slice(0, 60)}… (score: ${evaluated?.evaluation?.scoreOutOf10 ?? 'n/a'}/10)`,
          'Interview Arena',
          '/interview-arena'
        )
      ]
    }
  );
  if (!updated) return null;
  return {
    record: updated,
    question,
    score: evaluated?.evaluation?.scoreOutOf10
  };
}

export function collectEvidenceStage(userId: string, id: string): ReadinessExperimentRecord | null {
  const record = db.getReadinessExperiment(userId, id);
  if (!record) return null;
  const refs = collectEvidenceRefs(userId, record.gapSkillId);
  return withStage(
    userId,
    id,
    'evidence_collection',
    current => current,
    {
      detail: `Collected ${refs.length} evidence reference(s) so far.`,
      evidenceRefs: refs
    }
  );
}

export function completeExperiment(userId: string, id: string): ReadinessExperimentRecord | null {
  const record = db.getReadinessExperiment(userId, id);
  if (!record) return null;
  const profile = db.getProfile(userId);
  if (!profile) return null;

  const final = snapshotReadiness(userId, profile);

  // Build the evidence ledger and filter to records created during this experiment window.
  const ledger = buildEvidenceLedger(userId);
  const newRecords = ledger.filter(r => r.observedAt >= record.startedAt);
  const newAssessments = newRecords.filter(r => r.source === 'assessment');
  const newProjectEvidence = newRecords.filter(
    r => r.source === 'project_evidence' || r.source === 'forged_project' || r.source === 'roadmap_task'
  );
  const newProofOrGap = newRecords.filter(r => r.source === 'proof_of_skill' || r.source === 'gap_challenge');

  const evidenceLabels = (list: typeof newRecords) => list.map(r => `${r.skillName} (${r.evaluationResult})`).join('; ') || 'none';

  const metricChanges = [
    {
      metric: 'Skill coverage',
      before: record.initialBreakdown.skillCoverageScore,
      after: final.breakdown.skillCoverageScore,
      changed: record.initialBreakdown.skillCoverageScore !== final.breakdown.skillCoverageScore,
      explanation:
        record.initialBreakdown.skillCoverageScore !== final.breakdown.skillCoverageScore
          ? `Weighted proficiency coverage across role requirements (max 50). Moved because proficiency or evidence changed for: ${evidenceLabels(newProofOrGap)}. New gap-challenge/proof records: ${newProofOrGap.length}.`
          : `Unchanged. Weighted proficiency coverage across role requirements (max 50). Gap challenges record evidence and scores but do not raise proficiency directly, so a challenge pass alone does not move this component. New gap-challenge/proof records this window: ${newProofOrGap.length}.`
    },
    {
      metric: 'Assessment evidence',
      before: record.initialBreakdown.assessmentBonus,
      after: final.breakdown.assessmentBonus,
      changed: record.initialBreakdown.assessmentBonus !== final.breakdown.assessmentBonus,
      explanation:
        record.initialBreakdown.assessmentBonus !== final.breakdown.assessmentBonus
          ? `Bonus from passed assessments on required role skills (max 25). Moved because new passed assessments were recorded: ${evidenceLabels(newAssessments)}.`
          : `Unchanged. Bonus from passed assessments on required role skills (max 25). New assessment records this window: ${newAssessments.length}. Gap-challenge evidence does not count toward this component.`
    },
    {
      metric: 'Project evidence',
      before: record.initialBreakdown.projectEvidenceBonus,
      after: final.breakdown.projectEvidenceBonus,
      changed: record.initialBreakdown.projectEvidenceBonus !== final.breakdown.projectEvidenceBonus,
      explanation:
        record.initialBreakdown.projectEvidenceBonus !== final.breakdown.projectEvidenceBonus
          ? `Bonus from completed milestones/projects with submitted links (max 25). Moved because new project-evidence records were completed: ${evidenceLabels(newProjectEvidence)}.`
          : `Unchanged. Bonus from completed milestones/projects with submitted links (max 25). New project-evidence records this window: ${newProjectEvidence.length}.`
    },
    {
      metric: 'Overall readiness',
      before: record.initialReadiness,
      after: final.overallScore,
      changed: record.initialReadiness !== final.overallScore,
      explanation: `Sum of the three components (50 + 25 + 25), rounded to the nearest whole point. Total new evidence records this experiment window: ${newRecords.length}.`
    }
  ];

  const evidenceGained = collectEvidenceRefs(userId, record.gapSkillId);
  const delta = final.overallScore - record.initialReadiness;
  const movement =
    delta === 0
      ? 'Readiness is unchanged; the experiment evidence did not move a weighted component.'
      : delta > 0
        ? `Readiness improved by ${delta} point${delta === 1 ? '' : 's'}.`
        : `Readiness decreased by ${Math.abs(delta)} point${Math.abs(delta) === 1 ? '' : 's'}.`;

  const stages = markCompleted(
    markCompleted(record.stages, 'recalculation', `Final readiness: ${final.overallScore}%.`),
    'report',
    movement
  );

  // Derive a concrete next step from real state: the gap challenge (retry or
  // keep proving) or a recommended autopilot action, never a fake completion.
  const challengePassed = (record.challengeAttempts ?? []).some(a => a.passed);
  const autopilotPlan = db.getAutopilotPlan(userId);
  const recommended =
    autopilotPlan?.recommendedActionId != null
      ? autopilotPlan.actions.find(a => a.id === autopilotPlan.recommendedActionId) ?? null
      : autopilotPlan?.actions?.find(a => a.status === 'awaiting_approval') ?? null;

  const nextRecommendedAction = !challengePassed && record.gapSkillId
    ? {
        label: 'Retry the gap challenge',
        route: '/proof-of-skill',
        detail: `The challenge for ${record.gapSkillName} was not passed in a recorded attempt. Rewrite and resubmit to move the needle.`
      }
    : recommended
      ? {
          label: `Accept recommended action: ${recommended.title ?? 'Review plan'}`,
          route: '/autopilot',
          detail: `Career Autopilot has a recommended action awaiting your review: ${recommended.explanation?.why ?? 'see plan for details.'}`
        }
      : {
          label: 'Review your Career Autopilot plan',
          route: '/autopilot',
          detail: 'No urgent gap challenge remains; review the plan for the next prioritized action.'
        };

  const updated: ReadinessExperimentRecord = {
    ...record,
    status: 'completed',
    finalReadiness: final.overallScore,
    finalBreakdown: final.breakdown,
    delta,
    stages,
    evidenceGained,
    metricChanges,
    nextRecommendedAction,
    reportSummary: `${movement} ${buildExplanation({
      what: `Readiness moved from ${record.initialReadiness}% to ${final.overallScore}%.`,
      why: 'The change comes only from evidence you actually produced during the experiment.',
      supportingData: evidenceGained.map(r => r.label),
      supportingReferences: evidenceGained,
      assumptions: ['The readiness formula weights skill coverage 50, assessments 25, and project evidence 25.'],
      uncertainties: ['Self-reported project links are not independently verified.'],
      ifAccepted: 'No additional state changes; this is an observed measurement.',
      reversible: true,
      evidenceClassification: 'rule-checked'
    }).why}`,
    completedAt: new Date().toISOString()
  };

  db.saveReadinessExperiment(updated);
  return updated;
}
