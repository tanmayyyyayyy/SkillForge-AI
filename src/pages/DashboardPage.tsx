import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import {
  CareerReadinessScore,
  SkillGapAnalysisResult,
  RoadmapResult,
  ProjectRecommendation,
  LearningActivityLog
} from '../types/index.js';

import { DashboardHeader } from '../components/dashboard/DashboardHeader.js';
import { EditorialHero } from '../components/dashboard/EditorialHero.js';
import { SkillGapCircle } from '../components/dashboard/SkillGapCircle.js';
import { PuzzleSkillVisualization } from '../components/dashboard/PuzzleSkillVisualization.js';
import { CareerReadinessCircle } from '../components/dashboard/CareerReadinessCircle.js';
import { SkillGapSection } from '../components/dashboard/SkillGapSection.js';
import { WeeklyPlanBook } from '../components/dashboard/WeeklyPlanBook.js';

export const DashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
  const toast = useToast();

  const [readiness, setReadiness] = useState<CareerReadinessScore | null>(null);
  const [gaps, setGaps] = useState<SkillGapAnalysisResult | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapResult | null>(null);
  const [projects, setProjects] = useState<ProjectRecommendation[]>([]);
  const [activities, setActivities] = useState<LearningActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [readinessRes, gapsRes, roadmapRes, projectsRes, activitiesRes] = await Promise.all([
        api.readiness.get(),
        api.analysis.get(),
        api.roadmap.get(),
        api.projects.get(),
        api.activities.getAll()
      ]);

      setReadiness(readinessRes.readiness);
      setGaps(gapsRes.analysis);
      setRoadmap(roadmapRes.roadmap);
      setProjects(projectsRes.projects);
      setActivities(activitiesRes.activities);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle toggling milestone directly with reactive dashboard recalculation
  const handleToggleMilestone = async (projectId: string, milestoneId: string, currentCompleted: boolean) => {
    try {
      await api.projects.toggleMilestone(projectId, milestoneId, !currentCompleted);
      toast.success(currentCompleted ? 'Milestone marked incomplete.' : 'Milestone marked complete!');
      await loadDashboardData();
    } catch {
      toast.error('Failed to update milestone state.');
    }
  };

  if (isLoading) {
    return (
      <div
        className="editorial-canvas"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          color: 'var(--color-ink)'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 44,
              height: 44,
              border: '3px solid rgba(211, 138, 25, 0.2)',
              borderTopColor: '#D38A19',
              borderRadius: '50%',
              margin: '0 auto 1.25rem',
              animation: 'spin 0.8s linear infinite'
            }}
          />
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.4rem',
              color: 'var(--color-ink)'
            }}
          >
            Synthesizing Career Intelligence...
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-muted)', marginTop: '0.35rem' }}>
            Evaluating role requirements, skill coverage, and active projects
          </p>
        </div>
      </div>
    );
  }

  // Derive dynamic properties from real engine results
  const missingCount = gaps?.gapSkillsCount ?? (
    gaps?.items?.filter(i => i.currentLevel < i.requiredLevel).length || 7
  );

  // Highest priority unfulfilled gap for center puzzle piece
  const topGap = (gaps?.items || [])
    .filter(i => i.currentLevel < i.requiredLevel)
    .sort((a, b) => b.priorityScore - a.priorityScore)?.[0];

  const featuredSkillName = topGap?.name || 'Statistics for ML';

  // Role title from gap analysis or user profile
  const roleTitle = gaps?.roleTitle || (
    profile?.targetRole === 'aiml' ? 'Machine Learning Engineer' :
    profile?.targetRole === 'sde' ? 'Full Stack Developer' :
    profile?.targetRole === 'devops' ? 'DevOps & Cloud Engineer' :
    profile?.targetRole === 'data' ? 'Data Scientist' :
    'Machine Learning Engineer'
  );

  // Education info from profile
  const educationInfo = profile ? (
    `${profile.degree || profile.educationLevel || 'B.Tech CSE'} · Year ${profile.graduationYear ? (profile.graduationYear - 2023) : 3}`
  ) : 'B.Tech CSE · Year 3';

  // Top recommended project for the weekly open-book
  const activeProject = projects.length > 0 ? projects[0] : null;

  return (
    <div className="editorial-canvas">
      {/* Top Demo Banner if demo user */}
      {user?.isDemo && (
        <div className="editorial-demo-banner" role="banner">
          <div>
            <strong>Demo Mode:</strong> Active profile for <strong>{user.name}</strong> ({roleTitle}). Changes persist locally.
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
            SaarthiX Hackathon Level 2
          </span>
        </div>
      )}

      {/* Minimal Horizontal Header */}
      <DashboardHeader
        roleTitle={roleTitle}
        educationInfo={educationInfo}
      />

      {/* Main Editorial Content Container */}
      <main className="editorial-container">
        {/* Editorial Hero: Greeting + Large Serif Headline */}
        <EditorialHero userName={user?.name || profile?.fullName} />

        {/* Central 3-Part Overview Composition: Left Circle - Center Puzzle - Right Circle */}
        <section
          className="editorial-overview-composition"
          aria-label="Career Readiness and Skill Overview"
        >
          {/* Left: Circular Skill Gap Metric */}
          <SkillGapCircle
            missingCount={missingCount}
            totalGaps={gaps?.totalSkillsCount || 10}
          />

          {/* Center: Puzzle-Inspired Featured Skill Visualization */}
          <PuzzleSkillVisualization
            featuredSkillName={featuredSkillName}
            category={topGap?.category}
          />

          {/* Right: Circular Career Readiness Metric */}
          <CareerReadinessCircle
            readiness={readiness}
          />
        </section>

        {/* Ranked Skill Gap Section: "Your gaps, ranked by impact" */}
        <SkillGapSection
          analysis={gaps}
        />

        {/* Weekly Learning Plan: "Your plan this week" Open-Book Panel */}
        <WeeklyPlanBook
          project={activeProject}
          roadmap={roadmap}
          weeklyHours={profile?.weeklyHours || 15}
          onToggleMilestone={handleToggleMilestone}
          onPlanAdjusted={loadDashboardData}
        />
      </main>
    </div>
  );
};

export default DashboardPage;
