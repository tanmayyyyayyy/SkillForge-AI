import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import {
  RoadmapResult,
  LearningActivityLog,
  SkillGapAnalysisResult
} from '../types/index.js';
import { currentStreak, hoursLoggedSince } from '../utils/activityMetrics.js';
import {
  TrendingUp,
  Clock,
  Calendar,
  Layers,
  Award,
  Milestone,
  Flame
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const toast = useToast();
  const [roadmap, setRoadmap] = useState<RoadmapResult | null>(null);
  const [gaps, setGaps] = useState<SkillGapAnalysisResult | null>(null);
  const [activities, setActivities] = useState<LearningActivityLog[]>([]);
  const [assessments, setAssessments] = useState<Array<{ passed?: boolean }>>([]);
  const [weekMetrics, setWeekMetrics] = useState<{ hours: number; streak: number }>({ hours: 0, streak: 0 });
  const [readinessHistory, setReadinessHistory] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      const [roadmapRes, gapsRes, activitiesRes, readinessRes, assessmentsRes] = await Promise.all([
        api.roadmap.get(),
        api.analysis.get(),
        api.activities.getAll(),
        api.readiness.get(),
        api.assessments.getAll()
      ]);

      setRoadmap(roadmapRes.roadmap);
      setGaps(gapsRes.analysis);
      setActivities(activitiesRes.activities);
      setReadinessHistory(readinessRes.history || []);
      setAssessments(assessmentsRes.assessments || []);

      const now = new Date();
      setWeekMetrics({
        hours: hoursLoggedSince(activitiesRes.activities, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)),
        streak: currentStreak(activitiesRes.activities, now)
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to load progress analytics.');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div aria-hidden="true" className="spin" style={{ width: 36, height: 36, border: '3px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', margin: '0 auto 1rem' }} />
          <div>Aggregating progress velocity metrics...</div>
        </div>
      </div>
    );
  }

  const totalHoursLogged = activities.reduce((sum, a) => sum + a.hoursSpent, 0);
  const passedAssessments = assessments.filter(a => a.passed).length;
  const hoursLast7Days = weekMetrics.hours;
  const streak = weekMetrics.streak;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Progress & velocity analytics</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.3rem' }}>
          Tracking of completed roadmap tasks, logged hours, and readiness trajectory.
        </p>
      </div>

      {/* METRIC OVERVIEW CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div className="card" style={{ background: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <Clock size={16} color="var(--primary)" /> Hours Logged (est.)
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginTop: '0.3rem' }}>
            {totalHoursLogged.toFixed(1)}h
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            {activities.length === 0 ? 'No activity recorded yet' : `Across ${activities.length} recorded ${activities.length === 1 ? 'activity' : 'activities'}`}
          </div>
        </div>

        <div className="card" style={{ background: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <Milestone size={16} color="var(--success)" /> Tasks Completed
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--success)', marginTop: '0.3rem' }}>
            {roadmap?.completedTasks ?? 0} / {roadmap?.totalTasks ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            {roadmap?.overallProgressPercentage ?? 0}% Roadmap Complete
          </div>
        </div>

        <div className="card" style={{ background: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <Award size={16} color="var(--color-accent)" /> Passed Assessments
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-accent)', marginTop: '0.3rem' }}>
            {passedAssessments}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            Skills verified via technical assessment
          </div>
        </div>

        <div className="card" style={{ background: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <Flame size={16} color="#e07b39" /> Last 7 Days
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginTop: '0.3rem' }}>
            {activities.length === 0 ? '—' : `${hoursLast7Days.toFixed(1)}h`}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            {activities.length === 0
              ? 'Log activity to start building a streak'
              : streak > 0
                ? `${streak}-day activity streak`
                : 'No active streak'}
          </div>
        </div>
      </div>

      {/* READINESS TRAJECTORY & CATEGORY CHARTS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Readiness Trajectory Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <TrendingUp size={18} color="var(--color-accent)" />
              Career Readiness Score Trajectory
            </span>
            <span className="badge badge-medium">
              Latest: {readinessHistory.length > 0 ? `${readinessHistory[readinessHistory.length - 1]}%` : '—'}
            </span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Historical progression as you complete assessments, finish project milestones, and master roadmap stages.
          </p>

          {/* SVG Line Chart */}
          <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
            {readinessHistory.length < 2 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Not enough readiness history to chart a trajectory yet. Complete assessments and roadmap tasks to build your progress curve.
              </div>
            ) : (
            <svg viewBox="0 0 400 160" role="img" aria-label="Career readiness score trajectory over recorded history" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
              {/* Grid Lines */}
              <line x1="40" y1="20" x2="380" y2="20" stroke="rgba(48, 35, 25, 0.08)" strokeDasharray="4" />
              <line x1="40" y1="70" x2="380" y2="70" stroke="rgba(48, 35, 25, 0.08)" strokeDasharray="4" />
              <line x1="40" y1="120" x2="380" y2="120" stroke="rgba(48, 35, 25, 0.08)" strokeDasharray="4" />

              <text x="15" y="25" fill="var(--text-muted)" fontSize="10">80%</text>
              <text x="15" y="75" fill="var(--text-muted)" fontSize="10">50%</text>
              <text x="15" y="125" fill="var(--text-muted)" fontSize="10">20%</text>

              {/* Data points mapping */}
              {(() => {
                const points = readinessHistory;
                const xStep = (380 - 50) / (points.length - 1);
                const polylinePoints = points.map((p, idx) => {
                  const x = 50 + idx * xStep;
                  const y = 140 - (p / 100) * 120;
                  return `${x},${y}`;
                }).join(' ');

                return (
                  <>
                    <polyline
                      fill="none"
                      stroke="#D38A19"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={polylinePoints}
                    />
                    {points.map((p, idx) => {
                      const x = 50 + idx * xStep;
                      const y = 140 - (p / 100) * 120;
                      return (
                        <g key={idx}>
                          <circle cx={x} cy={y} r="5" fill="#D38A19" stroke="#F3EBDD" strokeWidth="2" />
                          <text x={x - 8} y={y - 10} fill="#302319" fontSize="11" fontWeight="bold">
                            {p}%
                          </text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
            )}
          </div>
        </div>

        {/* Skill Category Progress Bar Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <Layers size={18} color="#10b981" />
              Category Coverage Breakdown
            </span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Percentage of required points satisfied per technical domain.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Object.keys(gaps?.categoryBreakdown || {}).length === 0 && (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No category coverage data yet. Select a target role and complete a gap analysis to see per-domain progress.
              </div>
            )}
            {Object.entries(gaps?.categoryBreakdown || {}).map(([cat, val]) => (
              <div key={cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 500 }}>{cat}</span>
                  <span style={{ fontWeight: 700, color: val.percentage >= 70 ? 'var(--success)' : val.percentage >= 40 ? 'var(--warning)' : 'var(--danger)' }}>
                    {val.percentage}%
                  </span>
                </div>
                <div
                  className="progress-container"
                  role="progressbar"
                  aria-label={`${cat} category coverage`}
                  aria-valuenow={val.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  style={{ height: 8 }}
                >
                  <div
                    className={`progress-bar ${val.percentage >= 70 ? 'progress-bar-success' : val.percentage >= 40 ? 'progress-bar-warning' : 'progress-bar-danger'}`}
                    style={{ width: `${val.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY TIMELINE */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <Calendar size={18} color="var(--color-accent)" />
            Activity Log
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Chronological audit trail of recorded learning activity
          </span>
        </div>

        {activities.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No activity recorded yet. Start by completing roadmap tasks or taking a skill assessment!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {activities.map(act => (
              <div
                key={act.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.85rem 1.25rem',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: act.activityType === 'assessment' ? '4px solid var(--success)' :
                              act.activityType === 'project_submitted' ? '4px solid #38bdf8' : '4px solid var(--primary)',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{act.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    {act.details}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-pill" style={{ background: 'rgba(211, 138, 25, 0.1)', color: 'var(--color-accent)' }}>
                    +{act.hoursSpent}h Credited
                  </span>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {new Date(act.timestamp).toLocaleDateString()} &bull; {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
