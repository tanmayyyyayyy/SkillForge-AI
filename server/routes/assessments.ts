import { Router, Response } from 'express';
import { db } from '../db/store.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { ASSESSMENTS } from '../data/assessments.js';
import {
  AssessmentAttempt,
  AssessmentResult,
  AssessmentAttemptSummary,
  SkillAssessment
} from '../../src/types/index.js';
import { readParam, isPlainObject } from '../utils/request.js';
import {
  gradeAssessment,
  findUnknownQuestionIds,
  applyPassingAssessment
} from '../engine/assessmentEngine.js';

export const assessmentsRouter = Router();

/** Serialises an attempt for the owner without ever leaking the answer key. */
function toAttemptSummary(attempt: AssessmentAttempt): AssessmentAttemptSummary {
  return {
    id: attempt.id,
    skillId: attempt.skillId,
    skillName: attempt.skillName,
    status: attempt.status,
    startedAt: attempt.startedAt,
    gradedAt: attempt.gradedAt,
    scorePercentage: attempt.result ? attempt.result.scorePercentage : null,
    passed: attempt.result ? attempt.result.passed : false
  };
}

/** Client-safe question view: answer key and explanation are never included. */
function secureQuestions(assessment: SkillAssessment) {
  return assessment.questions.map(q => ({
    id: q.id,
    question: q.question,
    options: q.options,
    topic: q.topic
  }));
}

function newAttempt(assessment: SkillAssessment, userId: string): AssessmentAttempt {
  const startedAt = new Date().toISOString();
  return {
    id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    skillId: assessment.skillId,
    skillName: assessment.skillName,
    status: 'in_progress',
    questionIds: assessment.questions.map(q => q.id),
    startedAt
  };
}

/**
 * Grades answers on the server, appends the result to history, awards verified
 * evidence on a pass (never downgrading), and records exactly one activity for
 * this attempt. This is the only place an assessment produces credit.
 */
function gradeAndPersist(
  assessment: SkillAssessment,
  answers: Record<string, unknown>,
  userId: string,
  attemptId?: string
) {
  const outcome = gradeAssessment(assessment, answers);
  const completedAt = new Date().toISOString();

  const result: AssessmentResult = {
    id: `res_${Date.now()}_${assessment.skillId}`,
    userId,
    skillId: assessment.skillId,
    skillName: assessment.skillName,
    scorePercentage: outcome.scorePercentage,
    totalQuestions: outcome.totalQuestions,
    correctAnswersCount: outcome.correctCount,
    passed: outcome.passed,
    answers: outcome.gradedAnswers.map(g => ({
      questionId: g.questionId,
      selectedOptionIndex: g.selectedOptionIndex,
      isCorrect: g.isCorrect
    })),
    completedAt,
    attemptId,
    contentVersion: assessment.contentVersion ?? 1
  };

  db.saveAssessmentResult(result);

  // Passing is the ONLY path that awards assessment evidence. A failed attempt
  // never records status changes, and a lower retake never downgrades a prior pass.
  if (outcome.passed) {
    const profile = db.getProfile(userId);
    if (profile) {
      const skills = [...profile.currentSkills];
      const index = skills.findIndex(s => s.skillId === assessment.skillId);
      const updated = applyPassingAssessment(
        index !== -1 ? skills[index] : undefined,
        assessment,
        outcome.scorePercentage,
        completedAt
      );
      if (index !== -1) skills[index] = updated;
      else skills.push(updated);
      profile.currentSkills = skills;
      db.saveProfile(profile);
    }
  }

  db.logActivity({
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId,
    activityType: 'assessment',
    title: `${outcome.passed ? 'Passed' : 'Completed'} ${assessment.skillName} Assessment`,
    details: `Score: ${outcome.scorePercentage}% (${outcome.correctCount}/${outcome.totalQuestions} correct). Status: ${outcome.passed ? 'Verified' : 'Needs Review'}.`,
    hoursSpent: 1.0,
    timestamp: completedAt
  });

  return { result, gradedAnswers: outcome.gradedAnswers, passed: outcome.passed };
}

function resultMessage(skillName: string, passed: boolean, score: number): string {
  return passed
    ? `You passed with ${score}% — this verifies your assessed knowledge of ${skillName}. (Multiple-choice: it confirms conceptual understanding, not hands-on project experience.)`
    : `You scored ${score}%. Review the explanations below and retake the assessment to verify this skill.`;
}

// Get list of available assessments
assessmentsRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const history = db.getAssessmentHistory(req.userId!);
  const current = new Map(db.getAssessments(req.userId!).map(r => [r.skillId, r]));

  const list = ASSESSMENTS.map(a => {
    const attempts = history.filter(r => r.skillId === a.skillId);
    const latest = attempts[attempts.length - 1];
    const evidence = current.get(a.skillId);

    return {
      skillId: a.skillId,
      skillName: a.skillName,
      category: a.category,
      difficulty: a.difficulty,
      questionsCount: a.questions.length,
      passingScorePercentage: a.passingScorePercentage,
      estimatedMinutes: a.estimatedMinutes ?? null,
      contentVersion: a.contentVersion ?? 1,
      attemptCount: attempts.length,
      passed: evidence ? evidence.passed : false,
      bestScorePercentage: evidence ? evidence.scorePercentage : null,
      lastScorePercentage: latest ? latest.scorePercentage : null,
      lastAssessedAt: latest ? latest.completedAt : null
    };
  });

  res.json({ assessments: list });
});

// List the current user's attempts for a skill
assessmentsRouter.get('/:skillId/attempts', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const skillId = readParam(req, 'skillId');
  if (!skillId) {
    res.status(400).json({ error: 'A valid skill id is required.' });
    return;
  }
  if (!ASSESSMENTS.some(a => a.skillId === skillId)) {
    res.status(404).json({ error: `No assessment found for skill '${skillId}'.` });
    return;
  }

  const attempts = db.getAssessmentAttempts(req.userId!)
    .filter(a => a.skillId === skillId)
    .map(toAttemptSummary);

  res.json({ attempts });
});

// Fetch a single attempt (owner only)
assessmentsRouter.get('/attempts/:attemptId', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const attemptId = readParam(req, 'attemptId');
  const attempt = attemptId ? db.getAssessmentAttempt(req.userId!, attemptId) : undefined;
  if (!attempt) {
    res.status(404).json({ error: 'Attempt not found.' });
    return;
  }

  const assessment = ASSESSMENTS.find(a => a.skillId === attempt.skillId);
  if (!assessment) {
    res.status(404).json({ error: 'Assessment not found.' });
    return;
  }

  // While in progress, only serve the question sheets (no answer key).
  if (attempt.status !== 'graded') {
    res.json({
      attempt: {
        id: attempt.id,
        skillId: attempt.skillId,
        skillName: attempt.skillName,
        status: attempt.status,
        startedAt: attempt.startedAt,
        passingScorePercentage: assessment.passingScorePercentage,
        questions: secureQuestions(assessment)
      }
    });
    return;
  }

  res.json({ attempt: toAttemptSummary(attempt), result: attempt.result });
});

// Start a new attempt
assessmentsRouter.post('/:skillId/attempts', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const skillId = readParam(req, 'skillId');
  const assessment = skillId ? ASSESSMENTS.find(a => a.skillId === skillId) : undefined;
  if (!assessment) {
    res.status(404).json({ error: `No assessment found for skill '${skillId}'.` });
    return;
  }

  const attempt = newAttempt(assessment, req.userId!);
  db.saveAssessmentAttempt(attempt);

  res.status(201).json({
    attempt: {
      id: attempt.id,
      skillId: attempt.skillId,
      skillName: attempt.skillName,
      status: attempt.status,
      startedAt: attempt.startedAt,
      passingScorePercentage: assessment.passingScorePercentage,
      questions: secureQuestions(assessment)
    }
  });
});

// Submit answers for a specific attempt (server-side grading, idempotent)
assessmentsRouter.post('/attempts/:attemptId/submit', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const attemptId = readParam(req, 'attemptId');
  const attempt = attemptId ? db.getAssessmentAttempt(req.userId!, attemptId) : undefined;
  if (!attempt) {
    res.status(404).json({ error: 'Attempt not found.' });
    return;
  }

  const { answers } = req.body as { answers: unknown };
  if (!isPlainObject(answers)) {
    res.status(400).json({ error: 'Answers payload must be an object mapping question ids to option indices.' });
    return;
  }

  // Duplicate submission: never re-grade, never double-award. Return the stored result.
  if (attempt.status === 'graded') {
    res.json({
      result: attempt.result,
      message: resultMessage(attempt.skillName, !!attempt.result?.passed, attempt.result?.scorePercentage ?? 0),
      alreadyGraded: true
    });
    return;
  }

  const assessment = ASSESSMENTS.find(a => a.skillId === attempt.skillId);
  if (!assessment) {
    res.status(404).json({ error: 'Assessment not found.' });
    return;
  }

  // Answers must belong to this attempt's served questions.
  const unknown = findUnknownQuestionIds(assessment, answers).filter(id => !attempt.questionIds.includes(id));
  if (unknown.length > 0) {
    res.status(400).json({ error: `Unknown question id(s) for this attempt: ${unknown.join(', ')}` });
    return;
  }

  // Grade, award evidence, record activity, and mark the attempt graded as one
  // atomic unit: a storage failure rolls all of it back and surfaces as a 5xx, so
  // credit can never be awarded without the attempt transition being persisted.
  const { result, gradedAnswers, passed } = db.transaction(() => {
    const outcome = gradeAndPersist(assessment, answers, req.userId!, attempt.id);

    attempt.status = 'graded';
    attempt.gradedAt = outcome.result.completedAt;
    attempt.result = outcome.result;
    db.saveAssessmentAttempt(attempt);

    return outcome;
  });

  res.json({
    result,
    gradedQuestions: gradedAnswers,
    attempt: toAttemptSummary(attempt),
    message: resultMessage(assessment.skillName, passed, result.scorePercentage)
  });
});

// Get single assessment question sheet (no answer key)
assessmentsRouter.get('/:skillId', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const skillId = readParam(req, 'skillId');
  if (!skillId) {
    res.status(400).json({ error: 'A valid skill id is required.' });
    return;
  }

  const assessment = ASSESSMENTS.find(a => a.skillId === skillId);
  if (!assessment) {
    res.status(404).json({ error: `No assessment found for skill '${skillId}'.` });
    return;
  }

  const attempts = db.getAssessmentAttempts(req.userId!)
    .filter(a => a.skillId === skillId)
    .map(toAttemptSummary);

  res.json({
    assessment: {
      skillId: assessment.skillId,
      skillName: assessment.skillName,
      category: assessment.category,
      difficulty: assessment.difficulty,
      questionsCount: assessment.questions.length,
      passingScorePercentage: assessment.passingScorePercentage,
      estimatedMinutes: assessment.estimatedMinutes ?? null,
      contentVersion: assessment.contentVersion ?? 1,
      questions: secureQuestions(assessment)
    },
    attempts
  });
});

// Legacy one-shot submit: creates and grades an attempt in a single request.
// Kept for backward compatibility; each call is a distinct (retake) attempt.
assessmentsRouter.post('/:skillId/submit', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const skillId = readParam(req, 'skillId');
    if (!skillId) {
      res.status(400).json({ error: 'A valid skill id is required.' });
      return;
    }

    const { answers } = req.body as { answers: unknown };
    if (!isPlainObject(answers)) {
      res.status(400).json({ error: 'Answers payload must be an object mapping question ids to option indices.' });
      return;
    }

    const assessment = ASSESSMENTS.find(a => a.skillId === skillId);
    if (!assessment) {
      res.status(404).json({ error: 'Assessment not found.' });
      return;
    }

    const unknown = findUnknownQuestionIds(assessment, answers);
    if (unknown.length > 0) {
      res.status(400).json({ error: `Unknown question id(s): ${unknown.join(', ')}` });
      return;
    }

    // Grade and persist the whole attempt outcome atomically (see the attempt
    // route above for the rationale).
    const { result, gradedAnswers, passed } = db.transaction(() => {
      const attempt = newAttempt(assessment, req.userId!);
      const outcome = gradeAndPersist(assessment, answers, req.userId!, attempt.id);

      attempt.status = 'graded';
      attempt.gradedAt = outcome.result.completedAt;
      attempt.result = outcome.result;
      db.saveAssessmentAttempt(attempt);

      return outcome;
    });

    res.json({
      result,
      gradedQuestions: gradedAnswers,
      message: resultMessage(assessment.skillName, passed, result.scorePercentage)
    });
  } catch (err) {
    console.error('Error grading assessment:', err);
    res.status(500).json({ error: 'Failed to grade assessment.' });
  }
});
