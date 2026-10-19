import { db } from '../db/store.js';
import { CAREER_ROLES } from '../data/careers.js';
import { calculateSkillGaps } from '../engine/gapEngine.js';
import { callGeminiText, isGeminiConfigured } from './geminiClient.js';
import { normalizeSkillKey } from './evidenceIndex.js';
import { limitForClassification } from './evidenceLedger.js';
import { PROOF_OF_SKILL_CHALLENGES } from '../data/proofOfSkillChallenges.js';
import type {
  EvidenceClassification,
  ProofOfSkillChallenge,
  ProofOfSkillEvidenceRecord,
  SkillGapItem,
  StudentProfile
} from '../../src/types/index.js';

/**
 * SkillForge 2.0 — Live Skill Proof Lab.
 *
 * Extends Proof of Skill by letting the *student's actual skill gap* drive the
 * challenge. When a curated challenge already targets the gap skill it is reused
 * verbatim (with its real evaluator). Otherwise a synthesized "explain + artifact"
 * challenge is produced and graded by an explicitly-labelled rubric:
 *   - Gemini rubric when configured         -> `ai-reviewed`
 *   - deterministic structural rubric       -> `rule-checked`
 *
 * Arbitrary student code is never executed. The honest evaluation method is
 * always surfaced so a structural pass is never mistaken for proven correctness.
 */

export interface GapChallenge {
  challengeId: string;
  skillId: string;
  skillName: string;
  category: string;
  difficulty: ProofOfSkillChallenge['difficulty'];
  objectives: string[];
  instructions: string;
  constraints: string[];
  submissionFormat: string;
  evaluationCriteria: string[];
  requiredEvidence: string;
  maxScore: number;
  passingScorePercentage: number;
  timeEstimateMinutes: number;
  /** Set when a curated challenge already covers this skill. */
  matchedStaticChallengeId?: string;
  evaluationMethod: 'curated_static' | 'ai_reviewed_rubric' | 'rule_checked_rubric';
}

export interface GapEvaluationResult {
  challengeId: string;
  skillId: string;
  skillName: string;
  passed: boolean;
  scorePercentage: number;
  evaluationMethod: 'automated_test_runner' | 'static_assertion' | 'ai_rubric';
  evidenceClassification: EvidenceClassification;
  demonstrated: string[];
  missing: string[];
  feedback: string;
  limitations: string[];
  evidenceRecord?: ProofOfSkillEvidenceRecord;
}

export interface NextChallengeSuggestion {
  skillId: string;
  skillName: string;
  priority: SkillGapItem['priorityBadge'];
  reason: string;
}

function topGapFor(profile: StudentProfile): SkillGapItem | null {
  const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];
  const gaps = calculateSkillGaps(profile, role);
  return gaps.items.find(i => i.gap > 0) ?? null;
}

function gapForSkill(profile: StudentProfile, skillId?: string): SkillGapItem | null {
  const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];
  const gaps = calculateSkillGaps(profile, role);
  if (skillId) {
    const key = normalizeSkillKey(skillId);
    return gaps.items.find(i => normalizeSkillKey(i.skillId) === key) ?? null;
  }
  return gaps.items.find(i => i.gap > 0) ?? null;
}

function findStaticChallenge(gap: SkillGapItem): ProofOfSkillChallenge | undefined {
  const key = normalizeSkillKey(gap.skillId);
  const name = normalizeSkillKey(gap.name);
  return PROOF_OF_SKILL_CHALLENGES.find(
    c => normalizeSkillKey(c.targetSkillId) === key || normalizeSkillKey(c.targetSkillName) === name
  );
}

function requirementFor(skillId: string) {
  for (const role of CAREER_ROLES) {
    const req = role.requiredSkills.find(s => s.skillId === skillId);
    if (req) return req;
  }
  return undefined;
}

/** Builds a gap-driven challenge, preferring a curated one when it exists. */
export function getGapChallenge(userId: string, skillId?: string): GapChallenge | null {
  const profile = db.getProfile(userId);
  if (!profile) return null;
  const gap = gapForSkill(profile, skillId);
  if (!gap) return null;

  const staticMatch = findStaticChallenge(gap);
  if (staticMatch) {
    return {
      challengeId: staticMatch.id,
      skillId: staticMatch.targetSkillId,
      skillName: staticMatch.targetSkillName,
      category: staticMatch.category,
      difficulty: staticMatch.difficulty,
      objectives: staticMatch.evaluationCriteria,
      instructions: staticMatch.instructions,
      constraints: staticMatch.constraints,
      submissionFormat: staticMatch.submissionFormat,
      evaluationCriteria: staticMatch.evaluationCriteria,
      requiredEvidence: 'A passing submission to the curated challenge',
      maxScore: staticMatch.maxScore,
      passingScorePercentage: staticMatch.passingScorePercentage,
      timeEstimateMinutes: staticMatch.timeEstimateMinutes,
      matchedStaticChallengeId: staticMatch.id,
      evaluationMethod: 'curated_static'
    };
  }

  const req = requirementFor(gap.skillId);
  const criteria = req?.assessmentCriteria?.length
    ? req.assessmentCriteria
    : [
        `Explain the core purpose of ${gap.name}`,
        `Describe a concrete implementation or workflow`,
        'Identify one failure mode and how you would detect it'
      ];

  return {
    challengeId: `pos_gap_${normalizeSkillKey(gap.skillId)}`,
    skillId: gap.skillId,
    skillName: gap.name,
    category: gap.category,
    difficulty: gap.currentLevel <= 1 ? 'Intermediate' : gap.requiredLevel >= 4 ? 'Advanced' : 'Intermediate',
    objectives: criteria,
    instructions:
      `Produce a written technical response for ${gap.name} (${gap.category}). Address every objective in ` +
      `separate sections, include a short code or pseudocode snippet, and state the trade-offs you considered. ` +
      `If you pushed code, include the repository or artifact link.`,
    constraints: [
      'Written technical explanation of at least 120 characters',
      'Address each objective explicitly',
      'No copy-pasted text without your own reasoning'
    ],
    submissionFormat: 'Markdown or plain text with optional repository/artifact link',
    evaluationCriteria: criteria,
    requiredEvidence: 'A written explanation plus a code snippet or artifact link',
    maxScore: 100,
    passingScorePercentage: 70,
    timeEstimateMinutes: 30,
    evaluationMethod: isGeminiConfigured() ? 'ai_reviewed_rubric' : 'rule_checked_rubric'
  };
}

function countSentences(text: string): number {
  return (text.match(/[.!?](\s|$)/g) || []).length;
}

/**
 * Deterministic structural rubric. It measures completeness, structure, and use
 * of the skill's own terminology — never correctness of executed code. The
 * returned limitations say so explicitly.
 */
function ruleBasedRubric(
  challenge: GapChallenge,
  submission: string
): Pick<GapEvaluationResult, 'passed' | 'scorePercentage' | 'demonstrated' | 'missing' | 'feedback' | 'limitations'> {
  const text = submission.trim();
  const limitations = [
    'This deterministic rubric checks structure and terminology, not runtime correctness.',
    'Code was not executed; results are labelled rule-checked, not test-verified.'
  ];

  const demonstrated: string[] = [];
  const missing: string[] = [];
  let points = 0;
  const total = 3;

  // 1. Completeness
  if (text.length >= 120) {
    points += 1;
    demonstrated.push('Response has substantive length and detail.');
  } else {
    missing.push('Response is too brief to demonstrate completeness.');
  }

  // 2. Terminology coverage — proportion of objectives with a matching keyword.
  const objectives = challenge.evaluationCriteria;
  let objectivesAddressed = 0;
  for (const objective of objectives) {
    const keywords = objective
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 4);
    const hit = keywords.some(k => text.toLowerCase().includes(k));
    if (hit) objectivesAddressed += 1;
  }
  const coverage = objectives.length > 0 ? objectivesAddressed / objectives.length : 0;
  if (coverage >= 0.5) {
    points += 1;
    demonstrated.push(`Addressed roughly ${Math.round(coverage * 100)}% of the stated objectives.`);
  } else {
    missing.push('Most stated objectives are not clearly addressed.');
  }

  // 3. Structure — multiple sentences or a code fence / list.
  const structured = countSentences(text) >= 2 || /```|^\s*[-*]\s|^\s*\d+\./m.test(text);
  if (structured) {
    points += 1;
    demonstrated.push('Response is structured (sections, list, or code block).');
  } else {
    missing.push('Add structure such as sections, a list, or a code block.');
  }

  const scorePercentage = Math.round((points / total) * 100);
  const passed = scorePercentage >= challenge.passingScorePercentage;
  const feedback = passed
    ? 'Structural rubric passed. Add an artifact link and push for test-verified evidence when available.'
    : 'Structural rubric not passed. Address the missing points and resubmit.';

  return { passed, scorePercentage, demonstrated, missing, feedback, limitations };
}

interface AiRubricResponse {
  score?: number;
  demonstrated?: unknown;
  missing?: unknown;
  feedback?: string;
}

async function aiRubric(challenge: GapChallenge, submission: string): Promise<AiRubricResponse | null> {
  const prompt = `You are a strict technical evaluator. Grade a student's response to a skill challenge.
Skill: ${challenge.skillName}
Objectives: ${challenge.evaluationCriteria.join('; ')}
Response:
"""${submission}"""
Return ONLY JSON: {"score": number 0-100, "demonstrated": string[], "missing": string[], "feedback": string}`;
  const text = await callGeminiText(prompt, { responseMimeType: 'application/json', temperature: 0.2, timeoutMs: 20000 });
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as AiRubricResponse;
    if (typeof parsed.score !== 'number') return null;
    return {
      score: Math.max(0, Math.min(100, Math.round(parsed.score))),
      demonstrated: Array.isArray(parsed.demonstrated) ? parsed.demonstrated.filter(x => typeof x === 'string').slice(0, 8) : [],
      missing: Array.isArray(parsed.missing) ? parsed.missing.filter(x => typeof x === 'string').slice(0, 8) : [],
      feedback: typeof parsed.feedback === 'string' ? parsed.feedback.slice(0, 1200) : ''
    };
  } catch {
    return null;
  }
}

/**
 * Evaluates a gap submission and, on a pass, records durable evidence tied to the
 * student's real gap skill.
 */
export async function evaluateGapSubmission(
  userId: string,
  solution: string,
  skillId?: string
): Promise<GapEvaluationResult | null> {
  const profile = db.getProfile(userId);
  if (!profile) return null;
  const challenge = getGapChallenge(userId, skillId);
  if (!challenge) return null;

  // Curated static challenges are delegated to the existing evaluator so their
  // real test semantics are preserved.
  if (challenge.matchedStaticChallengeId) {
    const { evaluateProofOfSkill } = await import('./proofOfSkillService.js');
    const result = await evaluateProofOfSkill(userId, challenge.matchedStaticChallengeId, solution);
    return {
      challengeId: result.challengeId,
      skillId: challenge.skillId,
      skillName: challenge.skillName,
      passed: result.passed,
      scorePercentage: result.scorePercentage,
      evaluationMethod: 'automated_test_runner',
      evidenceClassification: 'test-verified',
      demonstrated: result.testResults.filter(t => t.passed).map(t => t.description),
      missing: result.testResults.filter(t => !t.passed).map(t => t.description),
      feedback: result.explanation,
      limitations: ['Static invariant checks against curated criteria; not a full runtime test harness.'],
      evidenceRecord: result.evidenceRecord
    };
  }

  let scorePercentage = 0;
  let demonstrated: string[] = [];
  let missing: string[] = [];
  let feedback = '';
  let limitations: string[] = [];
  let evaluationMethod: GapEvaluationResult['evaluationMethod'] = 'static_assertion';
  let classification: EvidenceClassification = 'rule-checked';

  if (isGeminiConfigured()) {
    const ai = await aiRubric(challenge, solution);
    if (ai) {
      scorePercentage = ai.score ?? 0;
      demonstrated = (ai.demonstrated as string[]) ?? [];
      missing = (ai.missing as string[]) ?? [];
      feedback = ai.feedback ?? '';
      limitations = ['Evaluated by an AI rubric; not an objective human review.'];
      evaluationMethod = 'ai_rubric';
      classification = 'ai-reviewed';
    }
  }

  if (evaluationMethod === 'static_assertion') {
    const rule = ruleBasedRubric(challenge, solution);
    scorePercentage = rule.scorePercentage;
    demonstrated = rule.demonstrated;
    missing = rule.missing;
    feedback = rule.feedback;
    limitations = rule.limitations;
    classification = 'rule-checked';
  }

  const passed = scorePercentage >= challenge.passingScorePercentage;
  const result: GapEvaluationResult = {
    challengeId: challenge.challengeId,
    skillId: challenge.skillId,
    skillName: challenge.skillName,
    passed,
    scorePercentage,
    evaluationMethod,
    evidenceClassification: classification,
    demonstrated,
    missing,
    feedback,
    limitations
  };

  if (passed) {
    // Deterministic evidence id: resubmitting the same gap challenge cannot
    // create a second record or award duplicate credited activity.
    const priorEvidence = db
      .getProofOfSkillEvidence(userId)
      .find(
        r =>
          r.challengeId === challenge.challengeId &&
          normalizeSkillKey(r.skillId) === normalizeSkillKey(challenge.skillId)
      );
    const isFirstEvidence = !priorEvidence;
    const evidenceRecord: ProofOfSkillEvidenceRecord = {
      id: `pos_gap_ev_${challenge.challengeId}`,
      userId,
      skillId: challenge.skillId,
      skillName: challenge.skillName,
      challengeId: challenge.challengeId,
      challengeTitle: `Gap Challenge: ${challenge.skillName}`,
      score: Math.round((scorePercentage / 100) * challenge.maxScore),
      maxScore: challenge.maxScore,
      scorePercentage,
      evaluationMethod: evaluationMethod === 'ai_rubric' ? 'ai_rubric' : 'static_assertion',
      evidenceStatus: 'assessed',
      completedAt: new Date().toISOString(),
      passedTests: 0,
      totalTests: 0,
      classification,
      limitations: limitForClassification(classification, limitations)
    };
    result.evidenceRecord = evidenceRecord;

    db.transaction(() => {
      db.saveProofOfSkillEvidence(evidenceRecord);
      const skills = [...profile.currentSkills];
      const idx = skills.findIndex(s => normalizeSkillKey(s.skillId) === normalizeSkillKey(challenge.skillId));
      const stamp = new Date().toISOString();
      if (idx !== -1) {
        skills[idx] = {
          ...skills[idx],
          status: 'assessed',
          assessmentScore: Math.max(skills[idx].assessmentScore || 0, scorePercentage),
          lastAssessedAt: stamp,
          updatedAt: stamp
        };
      } else {
        skills.push({
          skillId: challenge.skillId,
          name: challenge.skillName,
          category: challenge.category,
          proficiency: 3,
          status: 'assessed',
          assessmentScore: scorePercentage,
          lastAssessedAt: stamp,
          updatedAt: stamp
        });
      }
      db.saveProfile({ ...profile, currentSkills: skills, updatedAt: stamp });
      if (isFirstEvidence) {
        db.logActivity({
          id: `act_${Date.now()}_gapchallenge`,
          userId,
          activityType: 'assessment',
          title: `Passed Gap Challenge: ${challenge.skillName}`,
          details: `Evaluated by ${evaluationMethod} — scored ${scorePercentage}% (${classification}).`,
          hoursSpent: challenge.timeEstimateMinutes / 60,
          timestamp: stamp
        });
      } else {
        db.logActivity({
          id: `act_${Date.now()}_gapchallenge_retry`,
          userId,
          activityType: 'assessment',
          title: `Resubmitted Gap Challenge: ${challenge.skillName}`,
          details: `New score ${scorePercentage}% (${classification}). Evidence updated for an already-proven gap; no duplicate credit awarded.`,
          hoursSpent: 0,
          timestamp: stamp
        });
      }
    });

    // Report the record that is actually stored: the store keeps the highest
    // score, so a weaker resubmission never rewrites the durable evidence.
    const persisted = db
      .getProofOfSkillEvidence(userId)
      .find(
        r =>
          r.challengeId === challenge.challengeId &&
          normalizeSkillKey(r.skillId) === normalizeSkillKey(challenge.skillId)
      );
    if (persisted) result.evidenceRecord = persisted;
  }

  return result;
}

/** The next most useful skill to prove, based on remaining gaps. */
export function recommendNextChallenge(userId: string): NextChallengeSuggestion | null {
  const profile = db.getProfile(userId);
  if (!profile) return null;
  const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];
  const gaps = calculateSkillGaps(profile, role);
  const proven = new Set(db.getProofOfSkillEvidence(userId).map(p => normalizeSkillKey(p.skillId)));

  const next = gaps.items
    .filter(i => i.gap > 0 && !proven.has(normalizeSkillKey(i.skillId)))
    .sort((a, b) => b.priorityScore - a.priorityScore)[0];

  if (!next) return null;
  return {
    skillId: next.skillId,
    skillName: next.name,
    priority: next.priorityBadge,
    reason: `${next.name} is a ${next.priorityBadge} priority gap and has no practical evidence yet.`
  };
}
