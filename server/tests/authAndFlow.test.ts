import { describe, it, expect, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { db, DEMO_USER_ID } from '../db/store.js';
import { signToken } from '../middleware/auth.js';
import { calculateSkillGaps } from '../engine/gapEngine.js';
import { generateRoadmap } from '../engine/roadmapEngine.js';
import { calculateCareerReadiness } from '../engine/readinessEngine.js';
import { CAREER_ROLES } from '../data/careers.js';
import { ASSESSMENTS } from '../data/assessments.js';

describe('Auth, Security & End-to-End Workflow Integration', () => {
  beforeEach(() => {
    db.resetDemoData();
  });

  it('correctly hashes passwords and prevents plain text storage', async () => {
    const rawPassword = 'superSecurePassword123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);

    expect(hash).not.toBe(rawPassword);
    const isMatch = await bcrypt.compare(rawPassword, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await bcrypt.compare('wrongPassword', hash);
    expect(isWrongMatch).toBe(false);
  });

  it('generates valid JWT token with user identity', () => {
    const token = signToken('usr_test_123', false);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);
  });

  it('isolates demo user data and supports full reset', () => {
    const demoUser = db.findUserById(DEMO_USER_ID);
    expect(demoUser).toBeDefined();
    expect(demoUser?.name).toBe('Aarav Sharma');
    expect(demoUser?.isDemo).toBe(true);

    const profile = db.getProfile(DEMO_USER_ID);
    expect(profile).toBeDefined();
    expect(profile?.targetRole).toBe('aiml');

    // Modify profile then reset
    profile!.weeklyHours = 50;
    db.saveProfile(profile!);
    expect(db.getProfile(DEMO_USER_ID)?.weeklyHours).toBe(50);

    db.resetDemoData();
    expect(db.getProfile(DEMO_USER_ID)?.weeklyHours).toBe(14);
  });

  it('runs complete end-to-end intelligence cycle: profile -> gaps -> roadmap -> task complete -> readiness delta', () => {
    const profile = db.getProfile(DEMO_USER_ID)!;
    const role = CAREER_ROLES.find(r => r.id === profile.targetRole)!;

    // 1. Calculate Gaps
    const gaps = calculateSkillGaps(profile, role);
    expect(gaps.totalSkillsCount).toBe(role.requiredSkills.length);
    expect(gaps.overallCoveragePercentage).toBeGreaterThan(0);

    // 2. Generate Roadmap
    const existingTasks = db.getRoadmapTasks(DEMO_USER_ID);
    const roadmap = generateRoadmap(profile, role, gaps, existingTasks);
    expect(roadmap.totalTasks).toBe(role.requiredSkills.length);

    // 3. Initial Readiness
    const assessments = db.getAssessments(DEMO_USER_ID);
    const projects = db.getProjects(DEMO_USER_ID);
    const initialReadiness = calculateCareerReadiness(profile, role, assessments, projects, 0);
    expect(initialReadiness.overallScore).toBeGreaterThan(0);

    // 4. Simulate Passing a new assessment (SQL)
    const sqlAssessment = ASSESSMENTS.find(a => a.skillId === 'sql')!;
    const newAssessmentResult = {
      id: 'res_sql',
      userId: DEMO_USER_ID,
      skillId: 'sql',
      skillName: sqlAssessment.skillName,
      scorePercentage: 100,
      totalQuestions: 5,
      correctAnswersCount: 5,
      passed: true,
      answers: [],
      completedAt: new Date().toISOString()
    };
    db.saveAssessmentResult(newAssessmentResult);

    // 5. Recalculate Readiness with verified assessment
    const updatedAssessments = db.getAssessments(DEMO_USER_ID);
    const updatedReadiness = calculateCareerReadiness(
      profile,
      role,
      updatedAssessments,
      projects,
      initialReadiness.overallScore
    );

    expect(updatedReadiness.overallScore).toBeGreaterThan(initialReadiness.overallScore);
    expect(updatedReadiness.breakdown.assessmentBonus).toBeGreaterThan(initialReadiness.breakdown.assessmentBonus);
    expect(updatedReadiness.delta).toBe(updatedReadiness.overallScore - initialReadiness.overallScore);
  });
});
