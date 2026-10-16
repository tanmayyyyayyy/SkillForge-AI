import { describe, it, expect } from 'vitest';
import { calculateCareerReadiness } from '../engine/readinessEngine.js';
import { CAREER_ROLES } from '../data/careers.js';
import { StudentProfile, AssessmentResult, ProjectRecommendation } from '../../src/types/index.js';

describe('Career Readiness Engine', () => {
  const aimlRole = CAREER_ROLES.find(r => r.id === 'aiml')!;

  const baseProfile: StudentProfile = {
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
      { skillId: 'python', name: 'Python', category: 'Programming Languages', proficiency: 3, status: 'self-reported' }
    ],
    existingProjects: [],
    interests: [],
    updatedAt: new Date().toISOString()
  };

  it('calculates score within 0 to 100 range and separates breakdown factors', () => {
    const result = calculateCareerReadiness(baseProfile, aimlRole, [], []);

    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.breakdown.skillCoverageScore).toBeGreaterThan(0);
    expect(result.breakdown.assessmentBonus).toBe(0);
    expect(result.breakdown.projectEvidenceBonus).toBe(0);
  });

  it('increases score when assessments are passed', () => {
    const initialResult = calculateCareerReadiness(baseProfile, aimlRole, [], []);

    const passedAssessment: AssessmentResult = {
      id: 'res_1',
      userId: 'user_123',
      skillId: 'python',
      skillName: 'Python Programming',
      scorePercentage: 90,
      totalQuestions: 5,
      correctAnswersCount: 4,
      passed: true,
      answers: [],
      completedAt: new Date().toISOString()
    };

    const updatedResult = calculateCareerReadiness(baseProfile, aimlRole, [passedAssessment], [], initialResult.overallScore);

    expect(updatedResult.overallScore).toBeGreaterThan(initialResult.overallScore);
    expect(updatedResult.breakdown.assessmentBonus).toBeGreaterThan(0);
    expect(updatedResult.delta).toBe(updatedResult.overallScore - initialResult.overallScore);
  });

  it('increases score when projects with evidence are completed', () => {
    const initialResult = calculateCareerReadiness(baseProfile, aimlRole, [], []);

    const completedProject: ProjectRecommendation = {
      id: 'proj_1',
      title: 'ML Project',
      difficulty: 'Intermediate',
      skillsDemonstrated: ['python', 'scikit_learn'],
      whyItMatters: 'Demonstrates ML pipelines',
      coreFeatures: ['Feature engineering', 'Model training'],
      suggestedTechStack: ['Python', 'Scikit-Learn'],
      milestones: [],
      estimatedEffortHours: 20,
      evaluationCriteria: [],
      requiredEvidence: 'Repo URL',
      userStatus: 'completed',
      submittedEvidence: {
        repoUrl: 'https://github.com/student/ml-pipeline',
        notes: 'Passed 100% tests',
        submittedAt: new Date().toISOString()
      }
    };

    const updatedResult = calculateCareerReadiness(baseProfile, aimlRole, [], [completedProject], initialResult.overallScore);

    expect(updatedResult.overallScore).toBeGreaterThan(initialResult.overallScore);
    expect(updatedResult.breakdown.projectEvidenceBonus).toBeGreaterThan(0);
  });
});
