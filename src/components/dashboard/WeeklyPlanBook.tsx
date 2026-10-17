import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectRecommendation, RoadmapResult } from '../../types/index.js';
import { Check, ArrowRight, Sliders } from 'lucide-react';
import { PlanAdjustmentModal } from './PlanAdjustmentModal.js';

interface WeeklyPlanBookProps {
  project?: ProjectRecommendation | null;
  roadmap?: RoadmapResult | null;
  weeklyHours?: number;
  onToggleMilestone: (projectId: string, milestoneId: string, currentCompleted: boolean) => Promise<void>;
  onPlanAdjusted: () => void;
}

export const WeeklyPlanBook: React.FC<WeeklyPlanBookProps> = ({
  project,
  roadmap,
  weeklyHours = 15,
  onToggleMilestone,
  onPlanAdjusted
}) => {
  const navigate = useNavigate();
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Honest rendering: never invent a project when the backend has none.
  if (!project) {
    return (
      <section className="editorial-section" aria-labelledby="weekly-plan-heading">
        <div className="editorial-section-header">
          <h2 id="weekly-plan-heading" className="editorial-section-heading">
            Your plan this week
          </h2>
        </div>
        <div className="editorial-book-panel">
          <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--color-muted)', width: '100%' }}>
            No project is on your plan yet. Browse your role-tailored project recommendations to start one.
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                className="editorial-btn-primary"
                onClick={() => navigate('/projects')}
              >
                <span>Browse projects</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const milestones = project.milestones ?? [];

  // Find active milestone index
  const activeMilestoneIndex = milestones.findIndex(m => !m.completed);
  const activeMilestoneNumber = activeMilestoneIndex >= 0 ? activeMilestoneIndex + 1 : milestones.length;

  // Derive remaining effort and plan position from real roadmap totals only.
  // If no roadmap exists we show an honest unknown rather than an invented figure.
  const totalHours = roadmap?.totalHours ?? 0;
  const completedHours = roadmap?.completedHours ?? 0;
  const hasRoadmap = roadmap != null && totalHours > 0;
  const safeWeekly = Math.max(1, weeklyHours);
  const totalWeeks = hasRoadmap ? Math.max(1, Math.ceil(totalHours / safeWeekly)) : null;
  const remainingHours = hasRoadmap ? Math.max(0, Math.round(totalHours - completedHours)) : null;
  const currentWeek = totalWeeks != null
    ? Math.min(totalWeeks, Math.max(1, Math.ceil(completedHours / safeWeekly) || 1))
    : null;
  const planAside = totalWeeks != null && currentWeek != null && remainingHours != null
    ? `WEEK ${currentWeek} OF ${totalWeeks} · ${remainingHours} HRS LEFT`
    : 'REMAINING EFFORT UNKNOWN';

  const handleMilestoneClick = async (milestoneId: string, currentCompleted: boolean) => {
    try {
      setTogglingId(milestoneId);
      await onToggleMilestone(project.id, milestoneId, currentCompleted);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <section className="editorial-section" aria-labelledby="weekly-plan-heading">
      <div className="editorial-section-header">
        <h2 id="weekly-plan-heading" className="editorial-section-heading">
          Your plan this week
        </h2>
        <span className="editorial-section-aside">
          {planAside}
        </span>
      </div>

      {/* Open-Book Journal Panel */}
      <div className="editorial-book-panel">
        {/* Left Page: Project */}
        <div className="editorial-book-left-page">
          <div>
            <div className="editorial-book-section-label">the project</div>
            <h3 className="editorial-project-title">{project.title}</h3>
            <p className="editorial-project-desc">
              {project.whyItMatters || project.coreFeatures?.[0]}
            </p>

            <div className="editorial-practice-label">HOW TO PRACTICE</div>
            <div className="editorial-practice-text">
              {project.coreFeatures?.[0] || project.requiredEvidence}
            </div>
          </div>

          <div className="editorial-project-meta-pill">
            <span>{milestones.length} milestones · {project.estimatedEffortHours} hrs estimated effort</span>
          </div>
        </div>

        {/* Right Page: Milestones */}
        <div className="editorial-book-right-page">
          <div>
            <div className="editorial-book-section-label">milestones</div>

            <div className="editorial-milestone-list">
              {milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="editorial-milestone-item"
                  onClick={() => handleMilestoneClick(milestone.id, milestone.completed)}
                  role="checkbox"
                  aria-checked={milestone.completed}
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      handleMilestoneClick(milestone.id, milestone.completed);
                    }
                  }}
                  title={milestone.completed ? 'Click to mark incomplete' : 'Click to complete milestone'}
                >
                  <div
                    className={`editorial-milestone-check ${
                      milestone.completed
                        ? 'editorial-milestone-check-completed'
                        : 'editorial-milestone-check-incomplete'
                    }`}
                  >
                    {milestone.completed && <Check size={13} strokeWidth={2.8} />}
                  </div>

                  <span className={`editorial-milestone-text ${milestone.completed ? 'completed' : ''}`}>
                    {milestone.title}
                  </span>
                </div>
              ))}
            </div>

            <div className="editorial-done-criterion">
              done when <span>{project.evaluationCriteria?.[0] || project.requiredEvidence || 'all milestones are complete'}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="editorial-book-actions">
            <button
              type="button"
              className="editorial-btn-primary"
              onClick={() => navigate('/projects')}
              title="Continue this project in full view"
            >
              <span>Continue milestone {activeMilestoneNumber}</span>
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              className="editorial-btn-secondary"
              onClick={() => setIsAdjustModalOpen(true)}
              title="Adjust your weekly hours and learning schedule"
            >
              <Sliders size={15} />
              <span>Adjust plan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Plan Adjustment Modal */}
      <PlanAdjustmentModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        onPlanAdjusted={onPlanAdjusted}
      />
    </section>
  );
};
