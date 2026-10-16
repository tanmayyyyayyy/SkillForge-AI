import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import { useDialogA11y } from '../hooks/useDialogA11y.js';
import { SkillGapAnalysisResult, PriorityBadge } from '../types/index.js';
import {
  GitCompare,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Edit3
} from 'lucide-react';

export const GapAnalysisPage: React.FC = () => {
  const { profile } = useAuth();
  const toast = useToast();

  const [analysis, setAnalysis] = useState<SkillGapAnalysisResult | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'All' | PriorityBadge>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);

  // Quick edit modal state
  const [editingSkill, setEditingSkill] = useState<{ skillId: string; name: string; proficiency: number } | null>(null);
  const dialogRef = useDialogA11y<HTMLDivElement>(() => setEditingSkill(null), !!editingSkill);

  const fetchAnalysis = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.analysis.get();
      setAnalysis(res.analysis);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load skill gap analysis.');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const handleUpdateProficiency = async (skillId: string, newLevel: number) => {
    try {
      await api.profile.updateSkill({ skillId, proficiency: newLevel });
      toast.success('Skill proficiency updated! Re-running analysis...');
      setEditingSkill(null);
      fetchAnalysis();
    } catch {
      toast.error('Failed to update skill proficiency.');
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div role="status" aria-live="polite" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spin" aria-hidden="true" style={{ width: 36, height: 36, border: '3px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', margin: '0 auto 1rem' }} />
          <div>Running deterministic skill gap engine...</div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', textAlign: 'center', gap: '0.75rem' }}>
        <GitCompare size={26} color="var(--color-accent)" />
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Skill gap analysis unavailable
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 480, margin: 0, lineHeight: 1.5 }}>
          We could not run the gap analysis. Please choose a target career and ensure your profile has skills, then try again.
        </p>
        <button type="button" className="btn btn-primary" onClick={fetchAnalysis}>
          Retry
        </button>
      </div>
    );
  }

  const items = analysis?.items || [];
  const categories = ['All', ...Object.keys(analysis?.categoryBreakdown || {})];

  const filteredItems = items.filter(item => {
    if (selectedFilter !== 'All' && item.priorityBadge !== selectedFilter) return false;
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Skill Gap Intelligence Engine
            </h1>
            <div className="editorial-pill" style={{ background: 'var(--color-paper-light)', borderColor: 'var(--border-medium)' }}>
              <span className="editorial-pill-dot" />
              <span>Target · {analysis?.roleTitle || 'Career Track'}</span>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
            Deterministic comparison of your demonstrated capability vs employer expectations for {analysis?.roleTitle}.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/roadmap" className="editorial-btn-primary" style={{ padding: '0.55rem 1.1rem', fontSize: '0.88rem' }}>
            <span>View Personalized Roadmap</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div className="card" style={{ background: 'var(--color-paper)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Role Skill Coverage</div>
          <div style={{ fontSize: '2.4rem', fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            {analysis?.overallCoveragePercentage}%
          </div>
          <div className="progress-container" role="progressbar" aria-label="Role skill coverage" aria-valuenow={analysis.overallCoveragePercentage} aria-valuemin={0} aria-valuemax={100} style={{ height: 6, margin: '0.5rem 0', background: 'var(--color-progress-track)' }}>
            <div className="progress-bar" style={{ width: `${analysis?.overallCoveragePercentage}%`, background: 'var(--color-accent)' }} />
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {analysis?.masteredSkillsCount} mastered of {analysis?.totalSkillsCount} required skills
          </div>
        </div>

        <div className="card" style={{ background: 'var(--color-paper)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Critical Priority Gaps</div>
          <div style={{ fontSize: '2.4rem', fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--danger)', marginTop: '0.2rem' }}>
            {analysis?.criticalGapsCount}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
            Immediate hiring blockers requiring foundational study
          </div>
        </div>

        <div className="card" style={{ background: 'var(--color-paper)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Estimated Effort</div>
          <div style={{ fontSize: '2.4rem', fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--color-accent)', marginTop: '0.2rem' }}>
            {analysis?.totalEstimatedHours}h
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
            ~{Math.ceil((analysis?.totalEstimatedHours || 0) / (profile?.weeklyHours || 14))} weeks at {profile?.weeklyHours || 14}h/week
          </div>
        </div>
      </div>

      {/* CATEGORY BREAKDOWN CARDS */}
      <div className="card" style={{ background: 'var(--color-paper)', border: '1px solid var(--border-subtle)' }}>
        <div className="card-header">
          <span className="card-title" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--text-primary)' }}>
            <Layers size={18} color="var(--color-accent)" />
            Category Mastery Distribution
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          {Object.entries(analysis?.categoryBreakdown || {}).map(([cat, data]) => (
            <div key={cat} style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{cat}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: data.percentage >= 70 ? 'var(--success)' : data.percentage >= 40 ? 'var(--warning)' : 'var(--danger)' }}>
                  {data.percentage}%
                </span>
              </div>
              <div className="progress-container" role="progressbar" aria-label={`${cat} mastery`} aria-valuenow={data.percentage} aria-valuemin={0} aria-valuemax={100} style={{ height: 6, marginBottom: '0.5rem' }}>
                <div
                  className={`progress-bar ${data.percentage >= 70 ? 'progress-bar-success' : data.percentage >= 40 ? 'progress-bar-warning' : 'progress-bar-danger'}`}
                  style={{ width: `${data.percentage}%` }}
                />
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Demonstrated: {data.current} pts / Required: {data.total} pts
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Filter size={14} /> Filter Priority:
          </span>
          {(['All', 'Critical', 'High', 'Medium', 'Low', 'Mastered'] as const).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedFilter(p)}
              className={`btn btn-sm ${selectedFilter === p ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}
            >
              {p}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Category:</span>
          <select
            className="form-select"
            aria-label="Filter by skill category"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem', width: 'auto' }}
          >
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* DETAILED SKILL GAP COMPARISON LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredItems.length === 0 && (
          <div className="card" role="status" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
            <Filter size={22} style={{ marginBottom: '0.5rem' }} />
            <div>No skills match the current filters.</div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '0.75rem' }}
              onClick={() => { setSelectedFilter('All'); setSelectedCategory('All'); }}
            >
              Clear filters
            </button>
          </div>
        )}
        {filteredItems.map(item => (
          <div
            key={item.skillId}
            className="card"
            style={{
              padding: '1.25rem',
              borderLeft: item.priorityBadge === 'Critical' ? '4px solid var(--danger)' :
                          item.priorityBadge === 'High' ? '4px solid var(--warning)' :
                          item.priorityBadge === 'Mastered' ? '4px solid var(--success)' : '4px solid var(--info)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <h3 style={{ fontSize: '1.15rem' }}>{item.name}</h3>
                  <span className={`badge badge-${item.priorityBadge.toLowerCase()}`}>
                    {item.priorityBadge}
                  </span>
                  <span className="badge badge-pill" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                    Verification: {item.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Category: {item.category} &bull; Role Weight: {Math.round(item.importance * 100)}%
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingSkill({ skillId: item.skillId, name: item.name, proficiency: item.currentLevel })}
                  className="btn btn-secondary btn-sm"
                  title="Update your self-reported proficiency for this skill"
                >
                  <Edit3 size={13} />
                  <span>Update Level</span>
                </button>
                {item.gap > 0 && (
                  <Link to="/roadmap" className="btn btn-primary btn-sm">
                    <span>Roadmap Step</span>
                    <ArrowRight size={13} />
                  </Link>
                )}
              </div>
            </div>

            {/* Proficiency Comparison Bar */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                <span>
                  Current Demonstrated: <strong>Level {item.currentLevel}/5</strong> ({item.currentLevel === 0 ? 'Not started' : item.currentLevel === 1 ? 'Beginner' : item.currentLevel === 2 ? 'Elementary' : item.currentLevel === 3 ? 'Intermediate' : item.currentLevel === 4 ? 'Advanced' : 'Expert'})
                </span>
                <span>
                  Required Level: <strong>{item.requiredLevel}/5</strong> &bull; Gap: <strong>{item.gap} level(s)</strong>
                </span>
              </div>

              {/* Dual Progress Stack */}
              <div style={{ display: 'flex', height: 10, borderRadius: 'var(--radius-full)', background: 'var(--color-progress-track)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${(item.currentLevel / 5) * 100}%`,
                    background: item.gap === 0 ? 'var(--success)' : 'var(--color-accent)'
                  }}
                  title={`Current: ${item.currentLevel}/5`}
                />
                <div
                  style={{
                    width: `${(item.gap / 5) * 100}%`,
                    background: 'rgba(153, 27, 27, 0.35)'
                  }}
                  title={`Missing Gap: ${item.gap}/5`}
                />
              </div>
            </div>

            {/* Reason & Action Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', background: 'rgba(213, 201, 185, 0.25)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(217, 204, 186, 0.5)' }}>
              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem', fontWeight: 600 }}>
                  Analysis & Reason:
                </div>
                <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                  {item.reason}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '0.2rem', fontWeight: 700 }}>
                  Recommended Action:
                </div>
                <div style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                  {item.nextRecommendedAction}
                </div>
              </div>
            </div>

            {/* Missing Prerequisites Warning */}
            {(item.missingPrerequisites?.length ?? 0) > 0 && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={14} />
                <span>Foundational Prerequisites to strengthen: <strong>{item.missingPrerequisites.join(', ')}</strong></span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Proficiency Edit Modal */}
      {editingSkill && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gap-edit-title"
            ref={dialogRef}
          >
            <h3 id="gap-edit-title" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              Update Proficiency: {editingSkill.name}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              Update your self-assessed proficiency. The skill gap engine and readiness score will recalculate immediately.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="gap-proficiency-select">Proficiency Level (0 to 5)</label>
              <select
                id="gap-proficiency-select"
                className="form-select"
                value={editingSkill.proficiency}
                onChange={e => setEditingSkill({ ...editingSkill, proficiency: Number(e.target.value) })}
              >
                <option value={0}>0 - None / Unknown</option>
                <option value={1}>1 - Beginner (Basic syntax / exposure)</option>
                <option value={2}>2 - Elementary (Can write simple scripts)</option>
                <option value={3}>3 - Intermediate (Built production features)</option>
                <option value={4}>4 - Advanced (Deep architectural knowledge)</option>
                <option value={5}>5 - Expert (Staff-level optimization)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" onClick={() => setEditingSkill(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdateProficiency(editingSkill.skillId, editingSkill.proficiency)}
                className="btn btn-primary"
              >
                Save & Recalculate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
