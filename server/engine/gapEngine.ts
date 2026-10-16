import { CareerRole, StudentProfile, SkillGapItem, SkillGapAnalysisResult, PriorityBadge, ProficiencyLevel } from '../../src/types/index.js';

/**
 * Analyzes the student profile against the target career role.
 * Uses deterministic, explainable calculations.
 */
export function calculateSkillGaps(profile: StudentProfile, role: CareerRole): SkillGapAnalysisResult {
  const currentSkillsMap = new Map(profile.currentSkills.map(s => [s.skillId, s]));

  let totalSkillsCount = role.requiredSkills.length;
  let masteredSkillsCount = 0;
  let criticalGapsCount = 0;
  let totalEstimatedHours = 0;

  const categoryTotals: Record<string, { total: number; current: number; gap: number }> = {};

  const items: SkillGapItem[] = role.requiredSkills.map(reqSkill => {
    const studentSkill = currentSkillsMap.get(reqSkill.skillId);
    const currentLevel: ProficiencyLevel = studentSkill ? studentSkill.proficiency : 0;
    const requiredLevel: ProficiencyLevel = reqSkill.requiredLevel;
    const status = studentSkill ? studentSkill.status : 'unverified';

    const gap = Math.max(0, requiredLevel - currentLevel);
    const normalizedGap = gap / 5.0; // 0.0 to 1.0

    // Check prerequisites
    const missingPrerequisites: string[] = [];
    for (const prereqId of reqSkill.prerequisites) {
      const prereqSkill = currentSkillsMap.get(prereqId);
      if (!prereqSkill || prereqSkill.proficiency < 2) {
        // Missing or very beginner
        const prereqReq = role.requiredSkills.find(s => s.skillId === prereqId);
        missingPrerequisites.push(prereqReq ? prereqReq.name : prereqId);
      }
    }

    // Dependency factor: if prerequisites are missing, the student needs foundational work first
    // If prerequisites are already met, priority is boosted for immediate readiness
    const hasMissingPrereqs = missingPrerequisites.length > 0;
    const dependencyFactor = hasMissingPrereqs ? 0.85 : 1.15;

    // Deterministic Priority Score: (normalized_gap * 55 + role_importance * 35 + verified_penalty * 10) * dependencyFactor
    let priorityScore = 0;
    let priorityBadge: PriorityBadge = 'Low';

    if (gap === 0) {
      masteredSkillsCount++;
      priorityScore = 0;
      priorityBadge = 'Mastered';
    } else {
      // Scale: 0 to 100
      const rawScore = (normalizedGap * 55 + reqSkill.importance * 35) * dependencyFactor;
      priorityScore = Math.round(Math.min(100, Math.max(10, rawScore)));
      totalEstimatedHours += Math.round(reqSkill.estimatedHours * (gap / requiredLevel));

      if (priorityScore >= 75) {
        priorityBadge = 'Critical';
        criticalGapsCount++;
      } else if (priorityScore >= 50) {
        priorityBadge = 'High';
      } else if (priorityScore >= 25) {
        priorityBadge = 'Medium';
      } else {
        priorityBadge = 'Low';
      }
    }

    // Explainable Reason
    let reason = '';
    if (gap === 0) {
      reason = `You have met or exceeded the required level (${currentLevel}/${requiredLevel}) for ${reqSkill.name}.`;
    } else {
      const importancePct = Math.round(reqSkill.importance * 100);
      reason = `Required level is ${requiredLevel}/5 (currently ${currentLevel}/5). High role importance (${importancePct}%). ${
        hasMissingPrereqs
          ? `Note: Foundational prerequisites [${missingPrerequisites.join(', ')}] should be strengthened alongside this.`
          : 'All prerequisites satisfied—ready for immediate acceleration.'
      }`;
    }

    // Next Action Recommendation
    let nextRecommendedAction = '';
    if (gap === 0) {
      nextRecommendedAction = status === 'assessed' ? 'Skill verified via assessment.' : 'Take the skill assessment to verify practical mastery.';
    } else if (hasMissingPrereqs) {
      nextRecommendedAction = `Address prerequisite foundations: ${missingPrerequisites[0]}.`;
    } else if (currentLevel === 0) {
      nextRecommendedAction = `Begin foundational study using ${reqSkill.learningResources[0]?.title || 'curated documentation'}.`;
    } else {
      nextRecommendedAction = `Advance to ${reqSkill.projectApplication}.`;
    }

    // Track Category Breakdown
    if (!categoryTotals[reqSkill.category]) {
      categoryTotals[reqSkill.category] = { total: 0, current: 0, gap: 0 };
    }
    categoryTotals[reqSkill.category].total += requiredLevel;
    categoryTotals[reqSkill.category].current += Math.min(currentLevel, requiredLevel);
    categoryTotals[reqSkill.category].gap += gap;

    return {
      skillId: reqSkill.skillId,
      name: reqSkill.name,
      category: reqSkill.category,
      currentLevel,
      requiredLevel,
      gap,
      normalizedGap,
      importance: reqSkill.importance,
      status,
      priorityScore,
      priorityBadge,
      missingPrerequisites,
      estimatedLearningHours: Math.round(reqSkill.estimatedHours * (gap > 0 ? gap / requiredLevel : 0.2)),
      reason,
      nextRecommendedAction
    };
  });

  // Sort items: Critical first, then High, then Medium, then Low, then Mastered
  items.sort((a, b) => b.priorityScore - a.priorityScore);

  const categoryBreakdown: Record<string, { total: number; current: number; gap: number; percentage: number }> = {};
  let totalRolePoints = 0;
  let totalCurrentPoints = 0;

  for (const [cat, val] of Object.entries(categoryTotals)) {
    const percentage = val.total > 0 ? Math.round((val.current / val.total) * 100) : 0;
    categoryBreakdown[cat] = { ...val, percentage };
    totalRolePoints += val.total;
    totalCurrentPoints += val.current;
  }

  const overallCoveragePercentage = totalRolePoints > 0 ? Math.round((totalCurrentPoints / totalRolePoints) * 100) : 0;

  return {
    roleId: role.id,
    roleTitle: role.title,
    totalSkillsCount,
    masteredSkillsCount,
    gapSkillsCount: totalSkillsCount - masteredSkillsCount,
    criticalGapsCount,
    totalEstimatedHours,
    overallCoveragePercentage,
    categoryBreakdown,
    items,
    generatedAt: new Date().toISOString()
  };
}
