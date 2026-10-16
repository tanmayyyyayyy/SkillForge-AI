import { Router, Response } from 'express';
import { db } from '../db/store.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { ASSESSMENTS } from '../data/assessments.js';
import { AssessmentResult } from '../../src/types/index.js';
import { readParam, isPlainObject } from '../utils/request.js';

export const assessmentsRouter = Router();

// Get list of available assessments
assessmentsRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const userResults = db.getAssessments(req.userId!);
  const resultsMap = new Map(userResults.map(r => [r.skillId, r]));

  const list = ASSESSMENTS.map(a => {
    const previousResult = resultsMap.get(a.skillId);
    return {
      skillId: a.skillId,
      skillName: a.skillName,
      category: a.category,
      difficulty: a.difficulty,
      questionsCount: a.questions.length,
      passingScorePercentage: a.passingScorePercentage,
      passed: previousResult ? previousResult.passed : false,
      lastScorePercentage: previousResult ? previousResult.scorePercentage : null,
      lastAssessedAt: previousResult ? previousResult.completedAt : null
    };
  });

  res.json({ assessments: list });
});

// Get single assessment questions (omitting correct answer index for integrity)
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

  // Strip correctOptionIndex and explanation from the quiz view
  const secureQuestions = assessment.questions.map(q => ({
    id: q.id,
    question: q.question,
    options: q.options
  }));

  res.json({
    assessment: {
      skillId: assessment.skillId,
      skillName: assessment.skillName,
      category: assessment.category,
      difficulty: assessment.difficulty,
      questionsCount: assessment.questions.length,
      passingScorePercentage: assessment.passingScorePercentage,
      questions: secureQuestions
    }
  });
});

// Submit assessment answers for server-side grading
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

    let correctCount = 0;
    const gradedAnswers = assessment.questions.map(q => {
      const raw = (answers as Record<string, unknown>)[q.id];
      const selectedIndex = typeof raw === 'number' && Number.isInteger(raw) ? raw : -1;
      const isAnswered = selectedIndex >= 0 && selectedIndex < q.options.length;
      const isCorrect = isAnswered && selectedIndex === q.correctOptionIndex;
      if (isCorrect) correctCount++;

      return {
        questionId: q.id,
        question: q.question,
        options: q.options,
        selectedOptionIndex: isAnswered ? selectedIndex : -1,
        correctOptionIndex: q.correctOptionIndex,
        isCorrect,
        explanation: q.explanation
      };
    });

    const scorePercentage = Math.round((correctCount / assessment.questions.length) * 100);
    const passed = scorePercentage >= assessment.passingScorePercentage;

    const result: AssessmentResult = {
      id: `res_${Date.now()}_${skillId}`,
      userId: req.userId!,
      skillId,
      skillName: assessment.skillName,
      scorePercentage,
      totalQuestions: assessment.questions.length,
      correctAnswersCount: correctCount,
      passed,
      answers: gradedAnswers.map(g => ({
        questionId: g.questionId,
        selectedOptionIndex: g.selectedOptionIndex,
        isCorrect: g.isCorrect
      })),
      completedAt: new Date().toISOString()
    };

    db.saveAssessmentResult(result);

    // If passed, upgrade skill status in user profile
    if (passed) {
      const profile = db.getProfile(req.userId!);
      if (profile) {
        const skills = [...profile.currentSkills];
        const index = skills.findIndex(s => s.skillId === skillId);
        if (index !== -1) {
          skills[index] = {
            ...skills[index],
            status: 'assessed',
            assessmentScore: scorePercentage,
            lastAssessedAt: new Date().toISOString()
          };
        } else {
          skills.push({
            skillId,
            name: assessment.skillName,
            category: assessment.category,
            proficiency: 3,
            status: 'assessed',
            assessmentScore: scorePercentage,
            lastAssessedAt: new Date().toISOString()
          });
        }
        profile.currentSkills = skills;
        db.saveProfile(profile);
      }
    }

    // Log Activity
    db.logActivity({
      id: `act_${Date.now()}`,
      userId: req.userId!,
      activityType: 'assessment',
      title: `${passed ? 'Passed' : 'Completed'} ${assessment.skillName} Assessment`,
      details: `Score: ${scorePercentage}% (${correctCount}/${assessment.questions.length} correct). Status: ${passed ? 'Verified' : 'Needs Review'}.`,
      hoursSpent: 1.0,
      timestamp: new Date().toISOString()
    });

    res.json({
      result,
      gradedQuestions: gradedAnswers,
      message: passed
        ? `Congratulations! You passed with ${scorePercentage}% and verified your practical mastery.`
        : `You scored ${scorePercentage}%. Review the explanations below and try again to verify this skill.`
    });
  } catch (err) {
    console.error('Error grading assessment:', err);
    res.status(500).json({ error: 'Failed to grade assessment.' });
  }
});
