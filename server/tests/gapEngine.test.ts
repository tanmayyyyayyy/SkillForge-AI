import { describe, it, expect } from 'vitest';
import { calculateSkillGaps } from '../engine/gapEngine.js';
import { CAREER_ROLES } from '../data/careers.js';
import { StudentProfile } from '../../src/types/index.js';

describe('Skill Gap Engine', () => {
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
    targetCompanies: ['Google', 'Microsoft'],
    targetRole: 'aiml',
    currentSkills: [
      {
        skillId: 'python',
        name: 'Python Programming',
        category: 'Programming Languages',
        proficiency: 3,
        status: 'assessed'
      },
      {
        skillId: 'sql',
        name: 'SQL & Relational Databases',
        category: 'Data Management',
        proficiency: 3,
        status: 'self-reported'
      }
    ],
    existingProjects: [],
    interests: ['Machine Learning', 'Data Science'],
    updatedAt: new Date().toISOString()
  };

  it('correctly calculates gap and identifies mastered skills', () => {
    const analysis = calculateSkillGaps(mockProfile, aimlRole);

    expect(analysis.roleId).toBe('aiml');
    expect(analysis.totalSkillsCount).toBe(aimlRole.requiredSkills.length);

    // Python required is 4, current is 3 -> gap is 1
    const pythonItem = analysis.items.find(i => i.skillId === 'python');
    expect(pythonItem).toBeDefined();
    expect(pythonItem?.gap).toBe(1);
    expect(pythonItem?.currentLevel).toBe(3);
    expect(pythonItem?.requiredLevel).toBe(4);

    // SQL required is 3, current is 3 -> gap is 0 (Mastered)
    const sqlItem = analysis.items.find(i => i.skillId === 'sql');
    expect(sqlItem).toBeDefined();
    expect(sqlItem?.gap).toBe(0);
    expect(sqlItem?.priorityBadge).toBe('Mastered');
    expect(sqlItem?.priorityScore).toBe(0);
  });

  it('correctly assigns high priority to high-gap, high-importance skills', () => {
    const analysis = calculateSkillGaps(mockProfile, aimlRole);

    // PyTorch: required 4, current 0 -> gap 4, importance 0.92
    const pytorchItem = analysis.items.find(i => i.skillId === 'pytorch');
    expect(pytorchItem).toBeDefined();
    expect(pytorchItem?.gap).toBe(4);
    expect(pytorchItem?.priorityScore).toBeGreaterThanOrEqual(50);
  });

  it('handles empty profile skills safely without crashing', () => {
    const emptyProfile: StudentProfile = {
      ...mockProfile,
      currentSkills: []
    };

    const analysis = calculateSkillGaps(emptyProfile, aimlRole);
    expect(analysis.masteredSkillsCount).toBe(0);
    expect(analysis.gapSkillsCount).toBe(aimlRole.requiredSkills.length);
    expect(analysis.overallCoveragePercentage).toBe(0);
  });
});
