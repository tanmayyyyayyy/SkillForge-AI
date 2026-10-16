import { Router, Response } from 'express';
import { db } from '../db/store.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { CAREER_ROLES } from '../data/careers.js';
import { calculateCareerReadiness } from '../engine/readinessEngine.js';
import { calculateSkillGaps } from '../engine/gapEngine.js';
import { generateRoadmap } from '../engine/roadmapEngine.js';

export const readinessRouter = Router();

// Get current readiness score and breakdown
readinessRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const profile = db.getProfile(req.userId!);
    if (!profile) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }

    const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];
    const assessments = db.getAssessments(req.userId!);
    const projects = db.getProjects(req.userId!);
    const history = db.getReadinessHistory(req.userId!);
    const previousScore = history.length > 1 ? history[history.length - 2] : 0;

    const readiness = calculateCareerReadiness(profile, role, assessments, projects, previousScore);
    db.recordReadinessScore(req.userId!, readiness.overallScore);

    res.json({
      readiness,
      history: db.getReadinessHistory(req.userId!)
    });
  } catch (err) {
    console.error('Error calculating readiness:', err);
    res.status(500).json({ error: 'Failed to compute career readiness.' });
  }
});

// Comprehensive Readiness Report payload (for Report page and Print-to-PDF)
readinessRouter.get('/report', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const profile = db.getProfile(req.userId!);
    if (!profile) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }

    const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];
    const assessments = db.getAssessments(req.userId!);
    const projects = db.getProjects(req.userId!);
    const gaps = calculateSkillGaps(profile, role);
    const existingTasks = db.getRoadmapTasks(req.userId!);
    const roadmap = generateRoadmap(profile, role, gaps, existingTasks);

    const history = db.getReadinessHistory(req.userId!);
    const previousScore = history.length > 1 ? history[history.length - 2] : 0;
    const readiness = calculateCareerReadiness(profile, role, assessments, projects, previousScore);

    res.json({
      report: {
        student: {
          fullName: profile.fullName,
          degree: profile.degree,
          educationLevel: profile.educationLevel,
          graduationYear: profile.graduationYear,
          weeklyHours: profile.weeklyHours,
          learningStyle: profile.preferredLearningStyle,
          targetCompanies: profile.targetCompanies
        },
        targetCareer: {
          id: role.id,
          title: role.title,
          category: role.category,
          salaryRange: role.averageStartingSalary,
          marketDemand: role.marketDemand
        },
        readiness,
        gapSummary: {
          totalSkills: gaps.totalSkillsCount,
          masteredSkills: gaps.masteredSkillsCount,
          criticalGaps: gaps.criticalGapsCount,
          estimatedHours: gaps.totalEstimatedHours,
          coveragePercentage: gaps.overallCoveragePercentage,
          topGaps: gaps.items.filter(i => i.gap > 0).slice(0, 5)
        },
        roadmapProgress: {
          totalTasks: roadmap.totalTasks,
          completedTasks: roadmap.completedTasks,
          inProgressTasks: roadmap.inProgressTasks,
          progressPercentage: roadmap.overallProgressPercentage,
          stages: roadmap.stages
        },
        verifiedAssessments: assessments.filter(a => a.passed),
        portfolioProjects: projects.filter(p => p.userStatus === 'completed' || p.userStatus === 'in_progress'),
        generatedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Error generating readiness report:', err);
    res.status(500).json({ error: 'Failed to generate readiness report.' });
  }
});
