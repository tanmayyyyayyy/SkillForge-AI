import { describe, it, expect } from 'vitest';
import { generateRoadmap } from '../engine/roadmapEngine.js';
import { calculateSkillGaps } from '../engine/gapEngine.js';
import { CAREER_ROLES } from '../data/careers.js';
import { StudentProfile } from '../../src/types/index.js';

describe('Roadmap Engine', () => {
  const aimlRole = CAREER_ROLES.find(r => r.id === 'aiml')!;

  const mockProfile: StudentProfile = {
    userId: 'user_123',
    fullName: 'Test Student',
    educationLevel: 'Undergraduate',
    degree: 'B.Tech CS',
    graduationYear: 2026,
    experienceLevel: 'Beginner',
    weeklyHours: 15,
    preferredLearningStyle: 'Project-based',
    targetCompanies: [],
    targetRole: 'aiml',
    currentSkills: [
      {
        skillId: 'python',
        name: 'Python Programming',
        category: 'Programming Languages',
        proficiency: 4,
        status: 'assessed'
      }
    ],
    existingProjects: [],
    interests: [],
    updatedAt: new Date().toISOString()
  };

  it('generates stages containing ordered tasks matching role definition', () => {
    const gaps = calculateSkillGaps(mockProfile, aimlRole);
    const roadmap = generateRoadmap(mockProfile, aimlRole, gaps);

    expect(roadmap.roleId).toBe('aiml');
    expect(roadmap.stages.length).toBe(aimlRole.stages.length);
    expect(roadmap.totalTasks).toBe(aimlRole.requiredSkills.length);

    // Python was level 4 out of 4 (gap 0), so it should start completed
    const stage1 = roadmap.stages[0];
    const pythonTask = stage1.tasks.find(t => t.skillId === 'python');
    expect(pythonTask?.status).toBe('completed');
    expect(pythonTask?.completionPercentage).toBe(100);
  });

  it('preserves existing task status and user notes when regenerated', () => {
    const gaps = calculateSkillGaps(mockProfile, aimlRole);
    const initialRoadmap = generateRoadmap(mockProfile, aimlRole, gaps);

    // Find a task and simulate user updating progress
    const taskToUpdate = initialRoadmap.stages[0].tasks.find(t => t.skillId === 'data_manipulation')!;
    const updatedTask = {
      ...taskToUpdate,
      status: 'in_progress' as const,
      completionPercentage: 60,
      userNotes: 'Finished Pandas indexing notebook.'
    };

    const regeneratedRoadmap = generateRoadmap(mockProfile, aimlRole, gaps, [updatedTask]);
    const reloaded = regeneratedRoadmap.stages[0].tasks.find(t => t.skillId === 'data_manipulation');

    expect(reloaded?.status).toBe('in_progress');
    expect(reloaded?.completionPercentage).toBe(60);
    expect(reloaded?.userNotes).toBe('Finished Pandas indexing notebook.');
  });
});
