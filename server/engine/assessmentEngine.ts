import {
  SkillAssessment,
  AssessmentResult,
  StudentSkill,
  ProficiencyLevel
} from '../../src/types/index.js';

/**
 * Subphase 2J: server-authoritative assessment grading.
 *
 * This module is the single source of truth for turning a student's submitted
 * answers into a verified result. It is intentionally pure (no I/O, no globals)
 * so both the legacy submit route and the attempt-lifecycle route grade
 * identically, and so the scoring formula is directly testable.
 *
 * Design rules:
 *   - The client sends *answers only*. It can never send a score, pass flag, or
 *     verification status that is trusted.
 *   - Only integer option indices within range count as an answer; anything else
 *     (missing, negative, out-of-range, non-integer) is treated as unanswered and
 *     graded incorrect — never as a crash or an accepted truthy value.
 *   - Answer keys and explanations are never part of the grading *input* -> they
 *     are read from the server-side assessment definition on every call.
 */

export interface GradedAnswer {
  questionId: string;
  question: string;
  options: string[];
  selectedOptionIndex: number;
  correctOptionIndex: number;
  isCorrect: boolean;
  explanation: string;
}

export interface GradingOutcome {
  gradedAnswers: GradedAnswer[];
  correctCount: number;
  totalQuestions: number;
  scorePercentage: number;
  passed: boolean;
}

/** True when the payload maps question ids to option indices. */
export function isAnswerMap(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Grades a submitted answer map against the authoritative assessment.
 *
 * Scoring formula (documented + tested): score = round(correct / total * 100).
 * Passing threshold: score >= assessment.passingScorePercentage.
 * An empty assessment (no questions) never passes and scores 0 (no divide-by-zero).
 */
export function gradeAssessment(
  assessment: SkillAssessment,
  answers: Record<string, unknown>
): GradingOutcome {
  const total = assessment.questions.length;

  const gradedAnswers: GradedAnswer[] = assessment.questions.map(q => {
    const raw = answers[q.id];
    const isInteger = typeof raw === 'number' && Number.isInteger(raw);
    const inRange = isInteger && raw >= 0 && (raw as number) < q.options.length;
    const selectedOptionIndex = inRange ? (raw as number) : -1;
    const isCorrect = inRange && selectedOptionIndex === q.correctOptionIndex;

    return {
      questionId: q.id,
      question: q.question,
      options: q.options,
      selectedOptionIndex,
      correctOptionIndex: q.correctOptionIndex,
      isCorrect,
      explanation: q.explanation
    };
  });

  const correctCount = gradedAnswers.filter(a => a.isCorrect).length;
  const scorePercentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const passed = total > 0 && scorePercentage >= assessment.passingScorePercentage;

  return { gradedAnswers, correctCount, totalQuestions: total, scorePercentage, passed };
}

/** Question ids in the answer map that do not belong to the assessment. */
export function findUnknownQuestionIds(
  assessment: SkillAssessment,
  answers: Record<string, unknown>
): string[] {
  const known = new Set(assessment.questions.map(q => q.id));
  return Object.keys(answers).filter(id => !known.has(id));
}

/**
 * Reduces a full attempt history to the *current verified evidence* per skill.
 *
 * Policy (documented in README):
 *   - If a skill has any passing attempt, the highest-scoring pass is the current
 *     evidence. A later, lower-scoring retake never silently downgrades it.
 *   - If a skill has never been passed, the most recent attempt is returned (so the
 *     UI can still show "last score"), but it never counts as verified evidence.
 *   - Exactly one result per skill id is returned, so readiness/report never
 *     double-count a skill after repeated attempts.
 */
export function resolveCurrentEvidence(results: AssessmentResult[]): AssessmentResult[] {
  const bySkill = new Map<string, AssessmentResult[]>();
  for (const r of results) {
    const list = bySkill.get(r.skillId);
    if (list) list.push(r);
    else bySkill.set(r.skillId, [r]);
  }

  const resolved: AssessmentResult[] = [];
  for (const list of bySkill.values()) {
    const passed = list.filter(r => r.passed);
    if (passed.length > 0) {
      resolved.push(
        passed.reduce((best, r) => (r.scorePercentage > best.scorePercentage ? r : best))
      );
    } else {
      resolved.push(
        list.reduce((latest, r) =>
          new Date(r.completedAt).getTime() >= new Date(latest.completedAt).getTime() ? r : latest
        )
      );
    }
  }
  return resolved;
}

/**
 * Applies a *passing* assessment to a profile skill, following the no-downgrade
 * evidence policy. Returns the resulting skill (existing skills keep their
 * proficiency; a brand-new skill is recorded at proficiency 0 because a single
 * multiple-choice assessment verifies recall of concepts, not a proficiency level).
 *
 * A skill already verified by a completed project keeps `verified_project` status
 * but still records the assessment score.
 */
export function applyPassingAssessment(
  existing: StudentSkill | undefined,
  assessment: SkillAssessment,
  scorePercentage: number,
  gradedAt: string
): StudentSkill {
  const bestScore = existing?.assessmentScore !== undefined
    ? Math.max(existing.assessmentScore, scorePercentage)
    : scorePercentage;

  if (!existing) {
    return {
      skillId: assessment.skillId,
      name: assessment.skillName,
      category: assessment.category,
      // A knowledge check does not establish a proficiency *level*.
      proficiency: 0 as ProficiencyLevel,
      status: 'assessed',
      source: 'assessment',
      assessmentScore: bestScore,
      lastAssessedAt: gradedAt,
      updatedAt: gradedAt
    };
  }

  return {
    ...existing,
    // Preserve a stronger evidence tier (verified project) rather than downgrading it.
    status: existing.status === 'verified_project' ? 'verified_project' : 'assessed',
    source: existing.status === 'verified_project' ? existing.source : 'assessment',
    assessmentScore: bestScore,
    lastAssessedAt: gradedAt,
    updatedAt: gradedAt
  };
}
