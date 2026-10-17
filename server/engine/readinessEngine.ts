import { CareerRole, StudentProfile, AssessmentResult, ProjectRecommendation, CareerReadinessScore } from '../../src/types/index.js';

/**
 * Calculates an explainable, deterministic Career Readiness Score (0 - 100%).
 * 
 * Formula:
 * 1. Demonstrated Base Skill Coverage (50% max):
 *    sum( (min(currentProficiency, requiredLevel) / requiredLevel) * importance ) / sum(importance) * 50
 * 
 * 2. Verified Assessment Bonus (25% max):
 *    Passed assessments on required role skills.
 *    Each passed assessment contributes proportionally to its skill's role importance.
 * 
 * 3. Practical Project Evidence Bonus (25% max):
 *    Completed milestone projects addressing core role skills with submitted
 *    (self-reported) evidence URL, plus completed profile projects with a repo link.
 *    Submitted links are not independently verified.
 * 
 * Total Score = Math.round(Base Skill Coverage + Assessment Bonus + Project Evidence Bonus)
 */
export function calculateCareerReadiness(
  profile: StudentProfile,
  role: CareerRole,
  assessments: AssessmentResult[],
  projects: ProjectRecommendation[],
  previousScore: number = 0
): CareerReadinessScore {
  const currentSkillsMap = new Map(profile.currentSkills.map(s => [s.skillId, s]));
  const passedAssessmentsMap = new Map(assessments.filter(a => a.passed).map(a => [a.skillId, a]));

  // Calculate Base Skill Coverage
  let totalImportanceWeight = 0;
  let weightedProficiencySum = 0;
  const positiveFactors: string[] = [];
  const criticalGaps: string[] = [];

  for (const req of role.requiredSkills) {
    totalImportanceWeight += req.importance;
    const studentSkill = currentSkillsMap.get(req.skillId);
    const currentLevel = studentSkill ? studentSkill.proficiency : 0;
    const coverageRatio = Math.min(currentLevel, req.requiredLevel) / req.requiredLevel;

    weightedProficiencySum += coverageRatio * req.importance;

    if (currentLevel >= req.requiredLevel) {
      positiveFactors.push(`${req.name} meets role requirement (${currentLevel}/${req.requiredLevel})`);
    } else if (req.requiredLevel - currentLevel >= 2 && req.importance >= 0.85) {
      criticalGaps.push(`${req.name}: Gap of ${req.requiredLevel - currentLevel} levels (Importance: ${Math.round(req.importance * 100)}%)`);
    }
  }

  const rawSkillCoverageScore = totalImportanceWeight > 0
    ? (weightedProficiencySum / totalImportanceWeight) * 50
    : 0;
  const skillCoverageScore = Math.min(50, Math.round(rawSkillCoverageScore * 10) / 10);

  // Calculate Verified Assessment Bonus (25% max)
  let assessmentImportanceSum = 0;
  for (const req of role.requiredSkills) {
    const passed = passedAssessmentsMap.get(req.skillId);
    if (passed) {
      // Scale by assessment percentage
      const scoreWeight = (passed.scorePercentage / 100);
      assessmentImportanceSum += req.importance * scoreWeight;
      positiveFactors.push(`Verified via assessment: ${req.name} (${passed.scorePercentage}%)`);
    }
  }

  const rawAssessmentBonus = totalImportanceWeight > 0
    ? (assessmentImportanceSum / totalImportanceWeight) * 25
    : 0;
  const assessmentBonus = Math.min(25, Math.round(rawAssessmentBonus * 10) / 10);

  // Calculate Project Evidence Bonus (25% max)
  // Check completed projects that have evidence submitted
  const roleSkillIds = new Set(role.requiredSkills.map(s => s.skillId));
  const completedProjectsWithEvidence = projects.filter(p =>
    p.userStatus === 'completed' &&
    p.submittedEvidence &&
    (p.submittedEvidence.repoUrl || p.submittedEvidence.demoUrl) &&
    p.skillsDemonstrated.some(s => roleSkillIds.has(s))
  );

  // Also check student's profile existingProjects with repoUrl or liveUrl
  const profileProjectsWithEvidence = profile.existingProjects.filter(p =>
    p.completed && (p.repoUrl || p.liveUrl)
  );

  const totalValidProjects = completedProjectsWithEvidence.length + profileProjectsWithEvidence.length;
  // Up to 3 projects provide full 25% project bonus
  const rawProjectBonus = Math.min(25, (totalValidProjects / 2.5) * 25);
  const projectEvidenceBonus = Math.min(25, Math.round(rawProjectBonus * 10) / 10);

  if (totalValidProjects > 0) {
    positiveFactors.push(`${totalValidProjects} portfolio project(s) with submitted repository / live demo links (self-reported)`);
  }

  const overallScore = Math.min(100, Math.round(skillCoverageScore + assessmentBonus + projectEvidenceBonus));
  const delta = previousScore > 0 ? overallScore - previousScore : 0;

  // Generate actionable improvement suggestions
  const improvementSuggestions: Array<{ action: string; potentialGain: number; type: 'assessment' | 'project' | 'roadmap' }> = [];

  // Suggest taking assessments for unassessed skills
  const unassessedSkills = role.requiredSkills.filter(req => {
    const studentSkill = currentSkillsMap.get(req.skillId);
    return studentSkill && studentSkill.proficiency >= 2 && !passedAssessmentsMap.has(req.skillId);
  });

  if (unassessedSkills.length > 0) {
    const target = unassessedSkills[0];
    const potentialGain = Math.round((target.importance / totalImportanceWeight) * 25 * 0.9);
    improvementSuggestions.push({
      action: `Take the ${target.name} Skill Assessment to officially verify your proficiency.`,
      potentialGain: Math.max(3, potentialGain),
      type: 'assessment'
    });
  }

  // Suggest project milestone completion
  if (totalValidProjects < 2) {
    improvementSuggestions.push({
      action: `Complete and submit evidence (GitHub / Demo URL) for a recommended portfolio project.`,
      potentialGain: 10,
      type: 'project'
    });
  }

  // Suggest roadmap advancement for top gap
  if (criticalGaps.length > 0) {
    improvementSuggestions.push({
      action: `Advance in high-priority roadmap tasks to close: ${criticalGaps[0].split(':')[0]}.`,
      potentialGain: 6,
      type: 'roadmap'
    });
  }

  return {
    overallScore,
    previousScore,
    delta,
    breakdown: {
      skillCoverageScore,
      assessmentBonus,
      projectEvidenceBonus
    },
    positiveFactors,
    criticalGaps,
    improvementSuggestions,
    calculatedAt: new Date().toISOString(),
    disclaimer: 'This readiness score is an explainable estimate of alignment with curated industry role requirements. It does not guarantee employment or placement.'
  };
}
