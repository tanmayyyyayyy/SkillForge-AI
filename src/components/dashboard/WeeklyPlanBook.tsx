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

  // Fallback project representation if projects haven't seeded yet
  const defaultProject: ProjectRecommendation = {
    id: 'default_ml_project',
    title: 'Ship a churn-prediction A/B study',
    difficulty: 'Intermediate',
    skillsDemonstrated: ['Statistics for ML', 'Python', 'Scikit-learn', 'Model Evaluation'],
    whyItMatters: 'End-to-end classification pipeline demonstrating statistical hypothesis testing on simulated user retention data.',
    coreFeatures: [
      'Design randomized test/control splits with balanced covariates',
      'Compute two-sample Kolmogorov-Smirnov and t-tests for statistical significance',
      'Train logistic regression baseline and evaluate precision-recall tradeoffs',
      'Package pipeline with reproducible inference script'
    ],
    suggestedTechStack: ['Python', 'SciPy', 'Scikit-Learn', 'Pandas'],
    milestones: [
      { id: 'm1', title: 'Frame hypothesis & calculate minimum sample size', description: 'Define alpha=0.05 and power=0.80', completed: true },
      { id: 'm2', title: 'Data cleaning & covariate distribution checks', description: 'Handle missing values and outliers', completed: true },
      { id: 'm3', title: 'Two-sample hypothesis test & p-value analysis', description: 'Run permutation tests on churn rate', completed: true },
      { id: 'm4', title: 'Interpret confidence intervals & prepare briefing', description: 'Explain p-values out loud with non-technical clarity', completed: false }
    ],
    estimatedEffortHours: 18,
    evaluationCriteria: ['Statistical validity', 'Confidence intervals clearly formulated', 'Code modularity'],
    requiredEvidence: 'GitHub repository with Jupyter notebook walkthrough and README'
  };

  const activeProject = project || defaultProject;
  const milestones = activeProject.milestones || defaultProject.milestones;

  // Find active milestone index
  const activeMilestoneIndex = milestones.findIndex(m => !m.completed);
  const activeMilestoneNumber = activeMilestoneIndex >= 0 ? activeMilestoneIndex + 1 : milestones.length;

  // Calculate weekly progress labels
  const currentWeek = roadmap?.stages ? 2 : 2;
  const totalWeeks = roadmap?.stages ? Math.max(4, roadmap.stages.length) : 4;
  const remainingHours = Math.max(4, Math.round(weeklyHours * 0.4));

  const handleMilestoneClick = async (milestoneId: string, currentCompleted: boolean) => {
    try {
      setTogglingId(milestoneId);
      await onToggleMilestone(activeProject.id, milestoneId, currentCompleted);
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
          WEEK {currentWeek} OF {totalWeeks} · {remainingHours} HRS LEFT
        </span>
      </div>

      {/* Open-Book Journal Panel */}
      <div className="editorial-book-panel">
        {/* Left Page: Project */}
        <div className="editorial-book-left-page">
          <div>
            <div className="editorial-book-section-label">the project</div>
            <h3 className="editorial-project-title">{activeProject.title}</h3>
            <p className="editorial-project-desc">
              {activeProject.whyItMatters || activeProject.coreFeatures?.[0]}
            </p>

            <div className="editorial-practice-label">HOW TO PRACTICE</div>
            <div className="editorial-practice-text">
              {activeProject.coreFeatures?.[0] || 'Focus on proving statistical significance using verifiable sample sets.'}
            </div>
          </div>

          <div className="editorial-project-meta-pill">
            <span>{milestones.length} milestones · {activeProject.estimatedEffortHours || 18} hrs estimated effort</span>
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
              done when <span>I can explain p-values out loud</span>
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
