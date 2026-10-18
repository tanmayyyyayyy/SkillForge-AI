import { db } from '../db/store.js';
import { CAREER_ROLES } from '../data/careers.js';
import { callGeminiText, isGeminiConfigured, geminiEngineLabel } from './geminiClient.js';
import type {
  InterviewMode,
  InterviewSession,
  InterviewQuestion,
  InterviewAnswerEvaluation,
  InterviewScorecard,
  StudentProfile
} from '../../src/types/index.js';

export async function createInterviewSession(
  userId: string,
  mode: InterviewMode,
  targetRoleId?: string
): Promise<InterviewSession | null> {
  const profile = db.getProfile(userId);
  if (!profile) return null;

  const roleId = targetRoleId || profile.targetRole;
  const role = CAREER_ROLES.find(r => r.id === roleId) || CAREER_ROLES[0];

  const sessionId = `int_sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const questions = generateInitialInterviewQuestions(profile, role, mode);

  const session: InterviewSession = {
    id: sessionId,
    userId,
    targetRole: role.id,
    mode,
    status: 'in_progress',
    questions,
    currentQuestionIndex: 0,
    evaluations: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.saveInterviewSession(session);
  return session;
}

export async function evaluateInterviewAnswer(
  userId: string,
  sessionId: string,
  questionId: string,
  userAnswer: string
): Promise<{ evaluation: InterviewAnswerEvaluation; session: InterviewSession } | null> {
  const session = db.getInterviewSession(userId, sessionId);
  if (!session || session.status !== 'in_progress') return null;

  const question = session.questions.find(q => q.id === questionId);
  if (!question) return null;

  let evaluation: InterviewAnswerEvaluation;

  if (isGeminiConfigured()) {
    evaluation = await evaluateWithGemini(question, userAnswer);
  } else {
    evaluation = evaluateWithDeterministicRubric(question, userAnswer);
  }

  session.evaluations.push(evaluation);
  session.currentQuestionIndex = Math.min(session.questions.length, session.evaluations.length);
  session.updatedAt = new Date().toISOString();

  // If all questions answered, finalize scorecard
  if (session.evaluations.length >= session.questions.length) {
    session.status = 'completed';
    session.scorecard = generateInterviewScorecard(session);
  }

  db.saveInterviewSession(session);
  return { evaluation, session };
}

export async function finishInterviewSession(
  userId: string,
  sessionId: string
): Promise<InterviewSession | null> {
  const session = db.getInterviewSession(userId, sessionId);
  if (!session) return null;

  if (session.status !== 'completed') {
    session.status = 'completed';
    session.scorecard = generateInterviewScorecard(session);
    session.updatedAt = new Date().toISOString();
    db.saveInterviewSession(session);
  }

  return session;
}

export function listUserInterviewSessions(userId: string): InterviewSession[] {
  return db.getInterviewSessions(userId).sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

export function getUserInterviewSession(userId: string, sessionId: string): InterviewSession | undefined {
  return db.getInterviewSession(userId, sessionId);
}

// Internal question generator
function generateInitialInterviewQuestions(
  profile: StudentProfile,
  role: typeof CAREER_ROLES[0],
  mode: InterviewMode
): InterviewQuestion[] {
  const userProjects = db.getProjects(profile.userId);
  const userSkills = profile.currentSkills;

  switch (mode) {
    case 'project_deep_dive': {
      const topProject = userProjects.find(p => p.userStatus !== 'recommended') || userProjects[0];
      const projectTitle = topProject ? topProject.title : 'Full-Stack Application';
      const stack = topProject ? (topProject.suggestedTechStack || []).join(', ') : 'Node.js, React, SQL';

      return [
        {
          id: 'q_pdd_1',
          order: 1,
          category: 'Architecture & System Decisions',
          question: `In your project "${projectTitle}", what architectural trade-offs guided your choice of ${stack}? If you had to redesign it for 10x traffic, what would change?`,
          context: `Target project: ${projectTitle}. Technologies: ${stack}`,
          difficulty: 'Intermediate',
          rubric: {
            correctnessWeight: 0.2,
            reasoningWeight: 0.3,
            clarityWeight: 0.2,
            technicalDepthWeight: 0.2,
            tradeOffWeight: 0.1,
            expectedKeyPoints: ['Bottleneck identification', 'Caching/database scaling', 'State management trade-offs']
          },
          basedOnEvidenceRef: topProject?.id
        },
        {
          id: 'q_pdd_2',
          order: 2,
          category: 'Resilience & Failure Handling',
          question: `How does "${projectTitle}" handle network failures, partial database writes, or unhandled exceptions? What was the hardest bug you personally diagnosed?`,
          context: `Target project: ${projectTitle}`,
          difficulty: 'Advanced',
          rubric: {
            correctnessWeight: 0.2,
            reasoningWeight: 0.2,
            clarityWeight: 0.2,
            technicalDepthWeight: 0.3,
            tradeOffWeight: 0.1,
            expectedKeyPoints: ['Transaction safety', 'Error boundary / catch strategy', 'Diagnostic debugging steps']
          },
          basedOnEvidenceRef: topProject?.id
        },
        {
          id: 'q_pdd_3',
          order: 3,
          category: 'Testing & Verification',
          question: `What automated testing or verification did you implement in "${projectTitle}"? How did you verify edge cases?`,
          context: `Target project: ${projectTitle}`,
          difficulty: 'Intermediate',
          rubric: {
            correctnessWeight: 0.25,
            reasoningWeight: 0.25,
            clarityWeight: 0.25,
            technicalDepthWeight: 0.25,
            tradeOffWeight: 0.0,
            expectedKeyPoints: ['Unit vs integration tests', 'Mocking boundaries', 'Edge case coverage']
          },
          basedOnEvidenceRef: topProject?.id
        }
      ];
    }

    case 'resume_defense': {
      const topSkill = userSkills[0] ? userSkills[0].name : 'Primary Skill';
      return [
        {
          id: 'q_rd_1',
          order: 1,
          category: 'Skill Claim Verification',
          question: `Your profile claims proficiency in ${topSkill}. Can you walk me through the internal mechanics of how it handles concurrency and memory management?`,
          context: `Stated skill: ${topSkill}`,
          difficulty: 'Intermediate',
          rubric: {
            correctnessWeight: 0.3,
            reasoningWeight: 0.25,
            clarityWeight: 0.2,
            technicalDepthWeight: 0.25,
            tradeOffWeight: 0.0,
            expectedKeyPoints: ['Core runtime primitives', 'Memory model', 'Concurrency mechanics']
          }
        },
        {
          id: 'q_rd_2',
          order: 2,
          category: 'Practical Problem Solving',
          question: `Tell me about a specific engineering scenario where using ${topSkill} resulted in a performance bottleneck. How did you profile and resolve it?`,
          context: `Stated skill: ${topSkill}`,
          difficulty: 'Advanced',
          rubric: {
            correctnessWeight: 0.25,
            reasoningWeight: 0.25,
            clarityWeight: 0.2,
            technicalDepthWeight: 0.3,
            tradeOffWeight: 0.0,
            expectedKeyPoints: ['Profiling tools used', 'Root cause identified', 'Quantifiable improvement']
          }
        }
      ];
    }

    case 'system_design': {
      return [
        {
          id: 'q_sd_1',
          order: 1,
          category: 'High-Level Architecture',
          question: `Design an end-to-end distributed URL shortener service (like bit.ly) supporting 10,000 writes/sec and 100,000 reads/sec. What database and hashing strategy do you select?`,
          context: `Scale: 10k writes/sec, 100k reads/sec, 99.99% availability`,
          difficulty: 'Advanced',
          rubric: {
            correctnessWeight: 0.2,
            reasoningWeight: 0.25,
            clarityWeight: 0.2,
            technicalDepthWeight: 0.2,
            tradeOffWeight: 0.15,
            expectedKeyPoints: ['Base62 hashing vs counter', 'Cache tier (Redis)', 'NoSQL vs RDBMS trade-off']
          }
        },
        {
          id: 'q_sd_2',
          order: 2,
          category: 'Reliability & Data Consistency',
          question: `In your URL shortener design, how do you handle cache invalidation, custom slug collisions, and rate limiting to prevent abuse?`,
          context: `Reliability, security, and edge-cases`,
          difficulty: 'Expert',
          rubric: {
            correctnessWeight: 0.2,
            reasoningWeight: 0.25,
            clarityWeight: 0.2,
            technicalDepthWeight: 0.25,
            tradeOffWeight: 0.1,
            expectedKeyPoints: ['Token bucket rate limiting', 'Atomic counter or unique constraint', 'Cache evictions']
          }
        }
      ];
    }

    case 'rapid_fire': {
      return [
        {
          id: 'q_rf_1',
          order: 1,
          category: 'Core Concept',
          question: `What is the difference between an optimistic lock and a pessimistic lock in relational databases, and when would you choose one over the other?`,
          difficulty: 'Beginner',
          rubric: {
            correctnessWeight: 0.35,
            reasoningWeight: 0.25,
            clarityWeight: 0.25,
            technicalDepthWeight: 0.15,
            tradeOffWeight: 0.0,
            expectedKeyPoints: ['Version checking vs row locks', 'High collision vs low collision trade-off']
          }
        },
        {
          id: 'q_rf_2',
          order: 2,
          category: 'Core Concept',
          question: `What does the Event Loop do in JavaScript, and what is the difference between a microtask and a macrotask?`,
          difficulty: 'Intermediate',
          rubric: {
            correctnessWeight: 0.35,
            reasoningWeight: 0.25,
            clarityWeight: 0.25,
            technicalDepthWeight: 0.15,
            tradeOffWeight: 0.0,
            expectedKeyPoints: ['Promise resolution vs setTimeout order', 'Call stack draining']
          }
        },
        {
          id: 'q_rf_3',
          order: 3,
          category: 'Core Concept',
          question: `Explain CAP theorem in distributed systems: why can't a distributed partition have both strong Consistency and Availability?`,
          difficulty: 'Intermediate',
          rubric: {
            correctnessWeight: 0.35,
            reasoningWeight: 0.25,
            clarityWeight: 0.25,
            technicalDepthWeight: 0.15,
            tradeOffWeight: 0.0,
            expectedKeyPoints: ['Partition network split', 'Stale read vs rejected write']
          }
        }
      ];
    }

    default: {
      // Technical interview mode
      const reqSkill = role.requiredSkills[0]?.name || 'Data Structures & Algorithms';
      return [
        {
          id: 'q_tech_1',
          order: 1,
          category: `${role.title} Fundamentals`,
          question: `In a production system for ${role.title}, how do you evaluate whether to optimize for memory footprint versus CPU throughput for ${reqSkill}? Provide a concrete example.`,
          difficulty: 'Intermediate',
          rubric: {
            correctnessWeight: 0.25,
            reasoningWeight: 0.25,
            clarityWeight: 0.2,
            technicalDepthWeight: 0.2,
            tradeOffWeight: 0.1,
            expectedKeyPoints: ['Space-time complexity trade-off', 'Caching vs recalculation', 'Hardware constraints']
          }
        },
        {
          id: 'q_tech_2',
          order: 2,
          category: 'Engineering Best Practices',
          question: `Describe how you implement comprehensive observability (logging, metrics, tracing) across an asynchronous service boundary. How do you correlate logs across distributed calls?`,
          difficulty: 'Advanced',
          rubric: {
            correctnessWeight: 0.25,
            reasoningWeight: 0.25,
            clarityWeight: 0.2,
            technicalDepthWeight: 0.2,
            tradeOffWeight: 0.1,
            expectedKeyPoints: ['Trace ID / Correlation ID propagation', 'Structured JSON logging', 'OpenTelemetry standards']
          }
        }
      ];
    }
  }
}

// AI Evaluator
async function evaluateWithGemini(
  question: InterviewQuestion,
  userAnswer: string
): Promise<InterviewAnswerEvaluation> {
  const prompt = `You are a technical interview evaluator assessing a candidate's answer for the following question:
Question: "${question.question}"
Context: "${question.context || 'General Engineering'}"
Rubric Expectations: ${question.rubric.expectedKeyPoints.join(', ')}

Candidate Answer:
"${userAnswer}"

Evaluate the answer objectively on a scale of 0 to 10 across these criteria:
1. Correctness (0-10)
2. Reasoning (0-10)
3. Clarity (0-10)
4. Technical Depth (0-10)
5. Trade-Off Analysis (0-10)

Respond in JSON format:
{
  "scoreOutOf10": number,
  "criterionScores": {
    "correctness": number,
    "reasoning": number,
    "clarity": number,
    "technicalDepth": number,
    "tradeOffs": number
  },
  "qualitativeFeedback": "constructive 2-3 sentence assessment",
  "strengthsIdentified": ["strength 1", "strength 2"],
  "gapsIdentified": ["gap 1", "gap 2"],
  "suggestedImprovement": "one actionable tip for interview improvement"
}`;

  const text = await callGeminiText(prompt, { responseMimeType: 'application/json', temperature: 0.2 });
  if (text) {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed.scoreOutOf10 === 'number' && parsed.criterionScores) {
        return {
          questionId: question.id,
          userAnswer,
          scoreOutOf10: Math.min(10, Math.max(0, Math.round(parsed.scoreOutOf10 * 10) / 10)),
          criterionScores: {
            correctness: Math.min(10, Math.max(0, parsed.criterionScores.correctness || 5)),
            reasoning: Math.min(10, Math.max(0, parsed.criterionScores.reasoning || 5)),
            clarity: Math.min(10, Math.max(0, parsed.criterionScores.clarity || 5)),
            technicalDepth: Math.min(10, Math.max(0, parsed.criterionScores.technicalDepth || 5)),
            tradeOffs: Math.min(10, Math.max(0, parsed.criterionScores.tradeOffs || 5))
          },
          qualitativeFeedback: parsed.qualitativeFeedback || 'Adequate explanation provided.',
          strengthsIdentified: Array.isArray(parsed.strengthsIdentified) ? parsed.strengthsIdentified : ['Clear communication'],
          gapsIdentified: Array.isArray(parsed.gapsIdentified) ? parsed.gapsIdentified : ['Elaborate further on trade-offs'],
          suggestedImprovement: parsed.suggestedImprovement || 'Deepen concrete technical trade-offs.',
          evaluatedBy: 'gemini',
          answeredAt: new Date().toISOString()
        };
      }
    } catch {
      // Fall through to deterministic rubric
    }
  }

  return evaluateWithDeterministicRubric(question, userAnswer);
}

// Deterministic Rubric Evaluator
function evaluateWithDeterministicRubric(
  question: InterviewQuestion,
  userAnswer: string
): InterviewAnswerEvaluation {
  const words = userAnswer.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  let correctness = 6;
  let reasoning = 6;
  let clarity = 6;
  let technicalDepth = 5;
  let tradeOffs = 5;

  const strengths: string[] = [];
  const gaps: string[] = [];

  // Evaluate length & depth
  if (wordCount < 15) {
    correctness = 3;
    reasoning = 3;
    clarity = 4;
    technicalDepth = 2;
    tradeOffs = 2;
    gaps.push('Answer is too concise; provide structured explanation and rationale.');
  } else if (wordCount >= 50) {
    clarity += 1;
    reasoning += 1;
    strengths.push('Provided detailed context and elaboration.');
  }

  // Check expected key points
  let matchedKeyPoints = 0;
  for (const kp of question.rubric.expectedKeyPoints) {
    const tokens = kp.toLowerCase().split(/\s+/).filter(t => t.length > 3);
    const hasAny = tokens.some(t => userAnswer.toLowerCase().includes(t));
    if (hasAny) matchedKeyPoints++;
  }

  if (matchedKeyPoints > 0) {
    technicalDepth += Math.min(3, matchedKeyPoints);
    correctness += Math.min(2, matchedKeyPoints);
    strengths.push(`Addressed core rubric concepts (${matchedKeyPoints}/${question.rubric.expectedKeyPoints.length}).`);
  } else {
    gaps.push('Did not touch upon key architectural expectations.');
  }

  // Check trade-off keywords
  if (/trade[\s-]?off|however|conversely|alternative|compromise|whereas|pros?\s+and\s+cons?/i.test(userAnswer)) {
    tradeOffs += 2;
    strengths.push('Identified architectural trade-offs explicitly.');
  } else {
    gaps.push('Mention potential alternatives and operational trade-offs.');
  }

  const bounded = (n: number) => Math.min(10, Math.max(1, n));
  const finalScores = {
    correctness: bounded(correctness),
    reasoning: bounded(reasoning),
    clarity: bounded(clarity),
    technicalDepth: bounded(technicalDepth),
    tradeOffs: bounded(tradeOffs)
  };

  const avg = (
    finalScores.correctness * question.rubric.correctnessWeight +
    finalScores.reasoning * question.rubric.reasoningWeight +
    finalScores.clarity * question.rubric.clarityWeight +
    finalScores.technicalDepth * question.rubric.technicalDepthWeight +
    finalScores.tradeOffs * (question.rubric.tradeOffWeight || 0.1)
  ) / (
    question.rubric.correctnessWeight +
    question.rubric.reasoningWeight +
    question.rubric.clarityWeight +
    question.rubric.technicalDepthWeight +
    (question.rubric.tradeOffWeight || 0.1)
  );

  const scoreOutOf10 = Math.round(avg * 10) / 10;

  return {
    questionId: question.id,
    userAnswer,
    scoreOutOf10,
    criterionScores: finalScores,
    qualitativeFeedback: scoreOutOf10 >= 7
      ? `Strong answer addressing the core prompt with sound engineering logic.`
      : `Moderate answer. Good initial points, but needs more concrete technical specificity and trade-off comparison.`,
    strengthsIdentified: strengths.length > 0 ? strengths : ['Clear structure'],
    gapsIdentified: gaps.length > 0 ? gaps : ['Elaborate with concrete profiling or metric examples'],
    suggestedImprovement: 'Structure responses with the STAR method (Situation, Task, Action, Result) and contrast 2 technical alternatives.',
    evaluatedBy: 'deterministic_rubric',
    answeredAt: new Date().toISOString()
  };
}

// Generate session scorecard
function generateInterviewScorecard(session: InterviewSession): InterviewScorecard {
  const evals = session.evaluations;
  const total = evals.length;
  const avgScore = total > 0
    ? Math.round((evals.reduce((sum, e) => sum + e.scoreOutOf10, 0) / total) * 10) / 10
    : 0;
  const percentageScore = Math.round((avgScore / 10) * 100);

  const allStrengths = Array.from(new Set(evals.flatMap(e => e.strengthsIdentified))).slice(0, 4);
  const allGaps = Array.from(new Set(evals.flatMap(e => e.gapsIdentified))).slice(0, 4);

  const recommendations = allGaps.map((gap, idx) => ({
    skillId: `gap_skill_${idx + 1}`,
    skillName: session.mode === 'system_design' ? 'Distributed Systems' : 'Technical Communication & Trade-offs',
    recommendation: `Targeted review: ${gap}`,
    route: '/roadmap'
  }));

  return {
    sessionId: session.id,
    userId: session.userId,
    targetRole: session.targetRole,
    mode: session.mode,
    totalQuestions: session.questions.length,
    answeredQuestions: total,
    averageScoreOutOf10: avgScore,
    percentageScore,
    evaluationBreakdown: evals,
    topStrengths: allStrengths,
    criticalGaps: allGaps,
    recommendedRoadmapActions: recommendations,
    completedAt: new Date().toISOString(),
    disclaimer: 'Mock interview scores are heuristic evaluations based on explicit rubrics and should be treated as diagnostic study feedback, not as an official hiring verdict.'
  };
}
