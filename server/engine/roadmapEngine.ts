import { CareerRole, StudentProfile, RoadmapResult, RoadmapTask, SkillGapAnalysisResult } from '../../src/types/index.js';

/**
 * Generates an ordered, dependency-aware learning roadmap for the student.
 * Preserves existing task completion status, percentage, and user notes.
 */
export function generateRoadmap(
  profile: StudentProfile,
  role: CareerRole,
  gapAnalysis: SkillGapAnalysisResult,
  existingTasks: RoadmapTask[] = []
): RoadmapResult {
  const existingTaskMap = new Map(existingTasks.map(t => [t.skillId, t]));
  const gapItemMap = new Map(gapAnalysis.items.map(item => [item.skillId, item]));

  // Topological sorting helper
  // We respect role.stages, and within each stage, we order by prerequisite graph, then priorityScore
  const stageTasks: Array<{
    stageNumber: number;
    stageName: string;
    description: string;
    tasks: RoadmapTask[];
  }> = [];

  let totalTasks = 0;
  let completedTasks = 0;
  let inProgressTasks = 0;
  let totalHours = 0;
  let completedHours = 0;

  for (const stage of role.stages) {
    const tasksForStage: RoadmapTask[] = [];

    // Find all required skills assigned to this stage
    const stageSkillIds = stage.skillIds;
    const stageSkills = role.requiredSkills.filter(s => stageSkillIds.includes(s.skillId));

    // Sort stage skills by dependency order:
    // If skill B depends on skill A, skill A must appear before skill B
    const sortedSkills = [...stageSkills].sort((a, b) => {
      if (b.prerequisites.includes(a.skillId)) return -1;
      if (a.prerequisites.includes(b.skillId)) return 1;

      // Secondary sort: priorityScore descending
      const gapA = gapItemMap.get(a.skillId)?.priorityScore || 0;
      const gapB = gapItemMap.get(b.skillId)?.priorityScore || 0;
      return gapB - gapA;
    });

    for (const skill of sortedSkills) {
      const gapItem = gapItemMap.get(skill.skillId);
      const existing = existingTaskMap.get(skill.skillId);

      const isMastered = gapItem ? gapItem.gap === 0 : false;
      const initialStatus = existing ? existing.status : (isMastered ? 'completed' : 'not_started');
      const initialPercentage = existing ? existing.completionPercentage : (isMastered ? 100 : 0);
      const initialNotes = existing ? existing.userNotes : '';

      const task: RoadmapTask = {
        id: existing?.id || `task_${skill.skillId}_${stage.stageNumber}`,
        userId: profile.userId,
        skillId: skill.skillId,
        skillName: skill.name,
        category: skill.category,
        stageNumber: stage.stageNumber,
        stageName: stage.name,
        whyItMatters: `Essential for ${role.title}: ${skill.assessmentCriteria[0] || 'Core role requirement.'}`,
        currentProficiency: gapItem?.currentLevel ?? 0,
        targetProficiency: skill.requiredLevel,
        priority: gapItem?.priorityBadge ?? 'Medium',
        priorityScore: gapItem?.priorityScore ?? 50,
        estimatedHours: gapItem?.estimatedLearningHours ?? skill.estimatedHours,
        prerequisites: skill.prerequisites,
        learningResources: skill.learningResources,
        practiceActivity: skill.practiceActivity,
        projectApplication: skill.projectApplication,
        completionCriteria: skill.assessmentCriteria,
        status: initialStatus,
        completionPercentage: initialPercentage,
        userNotes: initialNotes,
        // Only a genuine stored completion carries a timestamp. A skill that is
        // merely already-mastered (auto-marked complete, never worked on by the
        // student) must not look like work completed on a particular date, so
        // the weekly planner cannot credit it as hours done "this week".
        completedAt: existing?.completedAt
      };

      tasksForStage.push(task);
      totalTasks++;
      totalHours += task.estimatedHours;

      if (task.status === 'completed') {
        completedTasks++;
        completedHours += task.estimatedHours;
      } else if (task.status === 'in_progress') {
        inProgressTasks++;
        completedHours += Math.round(task.estimatedHours * (task.completionPercentage / 100));
      }
    }

    stageTasks.push({
      stageNumber: stage.stageNumber,
      stageName: stage.name,
      description: stage.description,
      tasks: tasksForStage
    });
  }

  const overallProgressPercentage = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0;

  return {
    roleId: role.id,
    roleTitle: role.title,
    totalTasks,
    completedTasks,
    inProgressTasks,
    totalHours,
    completedHours,
    overallProgressPercentage,
    stages: stageTasks
  };
}
