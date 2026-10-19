import { db } from '../db/store.js';
import { normalizeSkillKey } from './evidenceIndex.js';
import type {
  EvidenceClassification,
  EvidenceRecord,
  EvidenceSourceKind,
  ExplainabilityReference,
  ProofOfSkillEvidenceRecord
} from '../../src/types/index.js';

/**
 * SkillForge 2.0 — Evidence Intelligence (canonical evidence ledger).
 *
 * A read-only, deduplicated, skill-attributed view of every stored record that
 * can substantiate a skill claim. It never creates, upgrades, or fabricates
 * evidence: each entry states the source system, the record it came from, the
 * verification method that actually produced the result, its classification,
 * the timestamp, the outcome, and the limitations of that evaluation.
 */

const CLASSIFICATION_ORDER: EvidenceClassification[] = [
  'self-reported',
  'rule-checked',
  'ai-reviewed',
  'human-reviewed',
  'test-verified'
];

const LIMITATIONS: Record<EvidenceClassification, string[]> = {
  'self-reported': ['Submitted by you and not independently reviewed.'],
  'ai-reviewed': ['Evaluated by an AI rubric; not an objective human review.'],
  'rule-checked': [
    'Checked by deterministic rules or a fixed question bank; not a practical runtime test.'
  ],
  'test-verified': [
    'Passed structural invariant checks in the automated test runner; arbitrary student code is never executed in the main process.'
  ],
  'human-reviewed': ['Reviewed by a human reviewer.']
};

function methodLabel(evaluationMethod: string): string {
  switch (evaluationMethod) {
    case 'automated_test_runner':
      return 'Automated test runner';
    case 'ai_rubric':
      return 'AI grading rubric';
    case 'syntax_and_schema_validator':
      return 'Syntax and schema validator';
    case 'static_assertion':
      return 'Deterministic structural rubric';
    default:
      return evaluationMethod;
  }
}

/**
 * How a proof-of-skill record was actually established. `test-verified` is only
 * reachable when the automated test runner verified the submission; rubric and
 * validator methods are never upgraded to it.
 */
export function classificationForProofRecord(record: Pick<ProofOfSkillEvidenceRecord, 'evaluationMethod' | 'evidenceStatus'>): EvidenceClassification {
  if (record.evaluationMethod === 'ai_rubric') return 'ai-reviewed';
  if (record.evaluationMethod === 'automated_test_runner' && record.evidenceStatus === 'verified_automated_test') {
    return 'test-verified';
  }
  return 'rule-checked';
}

export function confidenceForClassification(
  classification: EvidenceClassification
): 'high' | 'medium' | 'low' {
  if (classification === 'test-verified' || classification === 'human-reviewed') return 'high';
  if (classification === 'self-reported') return 'low';
  return 'medium';
}

const SOURCE_ROUTES: Record<EvidenceSourceKind, string> = {
  assessment: '/assessments',
  proof_of_skill: '/proof-of-skill',
  gap_challenge: '/proof-of-skill',
  project_evidence: '/project-forge',
  forged_project: '/project-forge',
  interview: '/interview-arena',
  roadmap_task: '/roadmap'
};

function limitFor(classification: EvidenceClassification, override?: string[]): string[] {
  if (Array.isArray(override) && override.length > 0) return override;
  return LIMITATIONS[classification];
}

/** Stated limitations for a classification, optionally overridden by the evaluator. */
export function limitForClassification(
  classification: EvidenceClassification,
  override?: string | string[]
): string[] {
  if (typeof override === 'string' && override.length > 0) return [override];
  if (Array.isArray(override)) return limitFor(classification, override);
  return LIMITATIONS[classification];
}

/** Builds the canonical ledger of stored, skill-attributed evidence. */
export function buildEvidenceLedger(userId: string): EvidenceRecord[] {
  const ledger: EvidenceRecord[] = [];

  // 1. Graded assessments (rule-checked — fixed question bank, no runtime).
  for (const result of db.getAssessments(userId)) {
    ledger.push({
      id: `assessment:${result.id}`,
      source: 'assessment',
      sourceLabel: 'Assessment',
      sourceRecordId: result.id,
      skillId: result.skillId,
      skillName: result.skillName,
      verificationMethod: `Graded assessment (${result.correctAnswersCount}/${result.totalQuestions} questions correct)`,
      classification: 'rule-checked',
      provenance: `Assessment engine result recorded on ${result.completedAt}`,
      observedAt: result.completedAt,
      evaluationResult: result.passed
        ? `Passed with ${result.scorePercentage}%`
        : `Not passed (${result.scorePercentage}%)`,
      scorePercentage: result.scorePercentage,
      passed: result.passed,
      limitations: limitFor('rule-checked')
    });
  }

  // 2. Proof of Skill + Skill Proof Lab evidence (shared store, deduped per challenge).
  for (const record of db.getProofOfSkillEvidence(userId)) {
    const classification = classificationForProofRecord(record);
    const isGapChallenge = record.challengeId.startsWith('pos_gap_');
    ledger.push({
      id: `proof_of_skill:${record.challengeId}:${normalizeSkillKey(record.skillId)}`,
      source: isGapChallenge ? 'gap_challenge' : 'proof_of_skill',
      sourceLabel: isGapChallenge ? 'Skill Proof Lab (gap challenge)' : 'Proof of Skill',
      sourceRecordId: record.id,
      skillId: record.skillId,
      skillName: record.skillName,
      verificationMethod: methodLabel(record.evaluationMethod),
      classification,
      provenance:
        `${record.challengeTitle} — ${
          record.evidenceStatus === 'verified_automated_test'
            ? 'verified by the automated test runner'
            : 'graded by a labelled rubric (not a runtime test)'
        } on ${record.completedAt}`,
      observedAt: record.completedAt,
      evaluationResult:
        `Scored ${record.scorePercentage}%` +
        (record.totalTests > 0 ? ` (${record.passedTests}/${record.totalTests} checks passed)` : ''),
      scorePercentage: record.scorePercentage,
      passed: true,
      limitations: limitFor(classification, record.limitations)
    });
  }

  // 3. Project evidence — self-submitted repository/demo links.
  for (const project of db.getProjects(userId)) {
    const evidence = project.submittedEvidence;
    if (!evidence) continue;
    for (const skillName of project.skillsDemonstrated) {
      ledger.push({
        id: `project_evidence:${project.id}:${normalizeSkillKey(skillName)}`,
        source: 'project_evidence',
        sourceLabel: 'Project Evidence',
        sourceRecordId: project.id,
        skillId: normalizeSkillKey(skillName),
        skillName,
        verificationMethod: 'Self-submitted repository/demo link',
        classification: 'self-reported',
        provenance: `Submitted with project "${project.title}" on ${evidence.submittedAt}`,
        observedAt: evidence.submittedAt,
        evaluationResult: `Project evidence submitted${evidence.repoUrl ? ` (repo: ${evidence.repoUrl})` : ''}`,
        limitations: limitFor('self-reported')
      });
    }
  }

  // 4. Project Forge milestones completed with submitted artifacts.
  for (const forged of db.getForgedProjects(userId)) {
    for (const milestone of forged.milestones) {
      const evidence = milestone.submittedEvidence;
      if (!milestone.completed || !evidence) continue;
      const skillName =
        milestone.skillsDemonstrated[0] ?? forged.targetedGapSkills[0] ?? forged.title;
      ledger.push({
        id: `forged_project:${forged.id}:${milestone.id}`,
        source: 'forged_project',
        sourceLabel: 'Project Forge',
        sourceRecordId: `${forged.id}#${milestone.id}`,
        skillId: normalizeSkillKey(skillName),
        skillName,
        verificationMethod: 'Self-submitted milestone artifact link',
        classification: 'self-reported',
        provenance: `Milestone of "${forged.title}" completed on ${milestone.completedAt ?? evidence.submittedAt}`,
        observedAt: milestone.completedAt ?? evidence.submittedAt,
        evaluationResult: `Milestone "${milestone.title}" marked complete with submitted evidence`,
        limitations: limitFor('self-reported')
      });
    }
  }

  // 5. Completed interview sessions (AI or deterministic rubric scorecard).
  for (const session of db.getInterviewSessions(userId)) {
    if (session.status !== 'completed' || !session.scorecard) continue;
    ledger.push({
      id: `interview:${session.id}`,
      source: 'interview',
      sourceLabel: 'Interview Arena',
      sourceRecordId: session.id,
      skillId: 'interview_communication',
      skillName: `Interview communication (${session.targetRole})`,
      verificationMethod: 'AI interview rubric over recorded answers',
      classification: 'ai-reviewed',
      provenance: `Interview session scorecard recorded on ${session.updatedAt}`,
      observedAt: session.updatedAt,
      evaluationResult: `Scorecard ${session.scorecard.percentageScore}% over ${session.scorecard.answeredQuestions} answered questions`,
      scorePercentage: session.scorecard.percentageScore,
      passed: session.scorecard.percentageScore >= 60,
      limitations: limitFor('ai-reviewed')
    });
  }

  // 6. Completed roadmap learning tasks (self-reported progress, not verification).
  for (const task of db.getRoadmapTasks(userId)) {
    if (task.status !== 'completed') continue;
    ledger.push({
      id: `roadmap_task:${task.id}`,
      source: 'roadmap_task',
      sourceLabel: 'Roadmap',
      sourceRecordId: task.id,
      skillId: task.skillId,
      skillName: task.skillName,
      verificationMethod: 'Roadmap learning task marked complete by the student',
      classification: 'self-reported',
      provenance: `Roadmap stage ${task.stageNumber} task completed on ${task.completedAt ?? 'unknown date'}`,
      observedAt: task.completedAt ?? new Date(0).toISOString(),
      evaluationResult: `Completed learning task: ${task.stageName}`,
      limitations: [
        'Marking a learning task complete records study progress; it does not verify skill.'
      ]
    });
  }

  ledger.sort((a, b) => (a.observedAt < b.observedAt ? 1 : a.observedAt > b.observedAt ? -1 : 0));
  return ledger;
}

/** Ledger entries attributed to a skill, matched by id or name. */
export function evidenceForSkill(
  ledger: EvidenceRecord[],
  skillId: string,
  skillName?: string
): EvidenceRecord[] {
  const keys = new Set([normalizeSkillKey(skillId)]);
  if (skillName) keys.add(normalizeSkillKey(skillName));
  return ledger.filter(
    r => keys.has(normalizeSkillKey(r.skillId)) || keys.has(normalizeSkillKey(r.skillName))
  );
}

/** The strongest classification present in a set of records (null when empty). */
export function strongestClassification(
  records: EvidenceRecord[]
): EvidenceClassification | null {
  let best = -1;
  for (const record of records) {
    const rank = CLASSIFICATION_ORDER.indexOf(record.classification);
    if (rank > best) best = rank;
  }
  return best === -1 ? null : CLASSIFICATION_ORDER[best];
}

/** Per-classification counts across the ledger. */
export function summarizeLedger(ledger: EvidenceRecord[]): Record<EvidenceClassification, number> {
  const counts: Record<EvidenceClassification, number> = {
    'self-reported': 0,
    'ai-reviewed': 0,
    'rule-checked': 0,
    'test-verified': 0,
    'human-reviewed': 0
  };
  for (const record of ledger) counts[record.classification] += 1;
  return counts;
}

/** Traceable references for recommendation explanations. */
export function ledgerReferences(records: EvidenceRecord[], limit = 3): ExplainabilityReference[] {
  return records.slice(0, limit).map(record => ({
    label: `${record.skillName} — ${record.evaluationResult}`,
    source: record.sourceLabel,
    url: SOURCE_ROUTES[record.source]
  }));
}
