import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import type { CareerMissionControlSummary, MissionControlAction, MissionActionState } from '../types/index.js';
import {
  Rocket,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  History,
  Target,
  Sparkles,
  ChevronRight,
  PauseCircle,
  PlayCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const MissionControlPage: React.FC = () => {
  const [summary, setSummary] = useState<CareerMissionControlSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionUpdating, setActionUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.missionControl.getSummary();
      setSummary(res.missionControl);
    } catch (err: any) {
      setError(err.message || 'Failed to load Career Mission Control.');
    } finally {
      setLoading(false);
    }
  };

  const handleStateChange = async (actionId: string, newState: MissionActionState) => {
    try {
      setActionUpdating(actionId);
      await api.missionControl.updateActionState(actionId, newState);
      await fetchSummary();
    } catch (err: any) {
      alert(err.message || 'Failed to update action state.');
    } finally {
      setActionUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <div className="spin" style={{ width: 40, height: 40, border: '3px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', marginBottom: '1rem' }} />
          <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-primary)' }}>Loading Mission Control HUD...</h3>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="page-container" style={{ padding: '2rem 1.5rem' }}>
        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: '2rem', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
          <AlertCircle size={40} color="var(--color-danger, #d9534f)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: 'var(--text-primary)' }}>Failed to Load Mission Control</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error || 'Unable to load mission data.'}</p>
          <button onClick={fetchSummary} className="btn btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: 1240, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
            <div style={{ padding: '0.45rem', borderRadius: 8, background: 'rgba(211, 138, 25, 0.12)', color: 'var(--color-accent)' }}>
              <Rocket size={22} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Career Mission Control
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
            Unified command center orchestrating proof, projects, interviews, and roadmaps into action.
          </p>
        </div>

        <button onClick={fetchSummary} className="btn btn-secondary btn-sm">
          Refresh HUD
        </button>
      </div>

      {/* Top HUD Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Objective */}
        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>
            <Target size={15} color="var(--color-accent)" /> Target Role Objective
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            {summary.careerObjective.roleTitle}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <span>Readiness: <strong style={{ color: 'var(--color-accent)' }}>{summary.careerObjective.currentReadiness}%</strong></span>
            <span>Goal: 85%</span>
          </div>
        </div>

        {/* Active Milestone */}
        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>
            <Clock size={15} color="#3b82f6" /> Active Milestone
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            {summary.activeMilestone?.title || 'Foundational Milestone Execution'}
          </div>
          <div style={{ height: 6, background: 'rgba(0,0,0,0.08)', borderRadius: 3, overflow: 'hidden', marginTop: '0.5rem' }}>
            <div style={{ height: '100%', width: `${summary.activeMilestone?.progressPercentage || 50}%`, background: '#3b82f6', borderRadius: 3 }} />
          </div>
        </div>

        {/* Priority Counts */}
        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>
            <Sparkles size={15} color="#10b981" /> Action Execution State
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-accent)' }}>{summary.topActionablePriorities.length}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Actionable</div>
            </div>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10b981' }}>{summary.completedTasks.length}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Completed</div>
            </div>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ef4444' }}>{summary.blockedTasks.length}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Blocked</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Next Action Banner */}
      {summary.recommendedNextAction && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, rgba(211, 138, 25, 0.09) 0%, rgba(245, 166, 35, 0.04) 100%)',
            border: '1px solid rgba(211, 138, 25, 0.35)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Highest Priority Recommended Action
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.3rem', color: 'var(--text-primary)' }}>
              {summary.recommendedNextAction.title}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
              {summary.recommendationReason}
            </p>
          </div>

          <Link
            to={summary.recommendedNextAction.route}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}
          >
            <span>{summary.recommendedNextAction.actionLabel}</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {/* Top 3 Actionable Priorities */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.85rem', color: 'var(--text-primary)' }}>
          Top Actionable Priorities
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {summary.topActionablePriorities.map((action) => (
            <div
              key={action.id}
              className="card"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: 10,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: action.priority === 'Critical' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(211, 138, 25, 0.15)',
                      color: action.priority === 'Critical' ? '#ef4444' : 'var(--color-accent)'
                    }}
                  >
                    {action.priority}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    State: <strong>{action.state.toUpperCase()}</strong>
                  </span>
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-primary)' }}>
                  {action.title}
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>
                  {action.description}
                </p>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Criteria: <em>{action.completionCondition}</em>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {action.state === 'suggested' && (
                  <button
                    onClick={() => handleStateChange(action.id, 'approved')}
                    disabled={actionUpdating === action.id}
                    className="btn btn-secondary btn-sm"
                  >
                    Approve
                  </button>
                )}
                {action.state === 'approved' && (
                  <button
                    onClick={() => handleStateChange(action.id, 'in_progress')}
                    disabled={actionUpdating === action.id}
                    className="btn btn-secondary btn-sm"
                  >
                    Start
                  </button>
                )}
                <Link
                  to={action.route}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <span>{action.actionLabel}</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Decision Audit Trail */}
      {summary.decisionAuditTrail.length > 0 && (
        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
            <History size={18} color="var(--color-accent)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Career Decision Audit Log
            </h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1rem' }}>
            Immutable record of user-approved career milestones, action state transitions, and roadmap choices.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {summary.decisionAuditTrail.map((dec) => (
              <div
                key={dec.id}
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.82rem'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{dec.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{dec.rationale}</div>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {new Date(dec.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
