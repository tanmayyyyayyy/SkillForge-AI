import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import type { CareerMissionControlSummary, MissionControlAction, MissionActionState } from '../types/index.js';
import {
  Rocket,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  History,
  Target,
  Sparkles,
  ChevronRight,
  PauseCircle,
  PlayCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const MissionControlPage: React.FC = () => {
  const toast = useToast();
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
      toast.error('Failed to load Career Mission Control.');
    } finally {
      setLoading(false);
    }
  };

  const handleStateChange = async (actionId: string, newState: MissionActionState) => {
    try {
      setActionUpdating(actionId);
      await api.missionControl.updateActionState(actionId, newState);
      toast.success(`Action marked ${newState.replace('_', ' ')}.`);
      await fetchSummary();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update action state.');
    } finally {
      setActionUpdating(null);
    }
  };

  const handleApprove = async (actionId: string) => {
    try {
      setActionUpdating(actionId);
      await api.missionControl.updateActionState(actionId, 'approved');
      toast.success('Action approved and logged to audit trail.');
      await fetchSummary();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve action.');
    } finally {
      setActionUpdating(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div role="status" aria-live="polite" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spin" aria-hidden="true" style={{ width: 40, height: 40, border: '3px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', margin: '0 auto 1.25rem' }} />
          <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', fontSize: '1.4rem' }}>Loading Mission Control HUD...</h2>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="card" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: 600, margin: '3rem auto' }}>
        <AlertCircle size={44} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', fontSize: '1.4rem', marginBottom: '0.5rem' }}>
          Failed to Load Mission Control
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
          {error || 'Unable to load mission data.'}
        </p>
        <button onClick={fetchSummary} className="btn btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="os-page-container">
      {/* Header */}
      <header className="os-header">
        <div className="os-header-left">
          <div className="os-header-icon">
            <Rocket size={24} />
          </div>
          <div>
            <h1 className="os-header-title">Career Mission Control</h1>
            <p className="os-header-subtitle">
              Unified command center orchestrating proof, projects, interviews, and roadmaps into action.
            </p>
          </div>
        </div>

        <div className="os-header-actions">
          <button onClick={fetchSummary} className="btn btn-secondary btn-sm">
            Refresh HUD
          </button>
        </div>
      </header>

      {/* Top HUD Metrics */}
      <div className="os-grid-3">
        {/* Objective */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>
            <Target size={15} color="var(--color-accent)" /> Target Role Objective
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            {summary.careerObjective.roleTitle}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            <span>Readiness: <strong style={{ color: 'var(--color-accent)' }}>{summary.careerObjective.currentReadiness}%</strong></span>
            <span>Target: 85%</span>
          </div>
        </div>

        {/* Active Milestone */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>
            <Clock size={15} color="var(--info)" /> Active Milestone
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            {summary.activeMilestone?.title || 'Core Engineering Track Execution'}
          </div>
          <div style={{ height: 7, background: 'var(--color-progress-track)', borderRadius: 4, overflow: 'hidden', marginTop: '0.65rem' }}>
            <div style={{ height: '100%', width: `${summary.activeMilestone?.progressPercentage || 50}%`, background: 'var(--info)', borderRadius: 4 }} />
          </div>
        </div>

        {/* Priority Counts */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>
            <Sparkles size={15} color="var(--success)" /> Action Execution State
          </div>
          <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.4rem' }}>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-accent)' }}>{summary.topActionablePriorities.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Actionable</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{summary.completedTasks.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Completed</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)' }}>{summary.blockedTasks.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Blocked</div>
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
            border: '1.5px solid rgba(211, 138, 25, 0.35)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.25rem'
          }}
        >
          <div style={{ minWidth: 0 }}>
            <span className="badge badge-accent" style={{ marginBottom: '0.4rem' }}>
              Highest Priority Action
            </span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0.35rem 0 0.25rem', color: 'var(--text-primary)' }}>
              {summary.recommendedNextAction.title}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, maxWidth: 760 }}>
              {summary.recommendationReason}
            </p>
          </div>

          <Link
            to={summary.recommendedNextAction.route}
            className="btn btn-primary"
            style={{ flexShrink: 0 }}
          >
            <span>{summary.recommendedNextAction.actionLabel}</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {/* Top Actionable Priorities */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Top Actionable Priorities
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {summary.topActionablePriorities.map((action, idx) => {
            const isBlocked = action.state === 'blocked';
            const isUpdating = actionUpdating === action.id;

            return (
              <div
                key={action.id}
                className="card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  padding: '1.15rem 1.4rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1, minWidth: 260 }}>
                  <span style={{ fontWeight: 800, color: 'var(--color-accent)', fontSize: '1.1rem', minWidth: 20 }}>
                    {idx + 1}
                  </span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                        {action.title}
                      </span>
                      <span className="os-chip" style={{ fontSize: '0.72rem' }}>
                        {action.kind.replace('_', ' ')}
                      </span>
                      <span className={`badge ${
                        action.state === 'completed'
                          ? 'badge-mastered'
                          : action.state === 'in_progress'
                          ? 'badge-high'
                          : action.state === 'blocked'
                          ? 'badge-critical'
                          : 'badge-medium'
                      }`}>
                        {action.state.replace('_', ' ')}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                      {action.description}
                    </p>

                    {action.blockedReason && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-critical, #c53030)', marginTop: '0.35rem' }}>
                        Blocked: {action.blockedReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                  {action.state === 'suggested' && (
                    <button
                      onClick={() => handleApprove(action.id)}
                      disabled={isUpdating}
                      className="btn btn-secondary btn-sm"
                    >
                      Approve Action
                    </button>
                  )}

                  {action.state === 'in_progress' && (
                    <button
                      onClick={() => handleStateChange(action.id, 'completed')}
                      disabled={isUpdating}
                      className="btn btn-primary btn-sm"
                    >
                      <CheckCircle2 size={14} />
                      <span>Mark Complete</span>
                    </button>
                  )}

                  <Link to={action.route} className="btn btn-outline btn-sm">
                    <span>{action.actionLabel}</span>
                    <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Human-in-the-Loop Audit Trail */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <ShieldCheck size={18} color="var(--color-accent)" />
            Human-in-the-Loop Decision Audit Trail
          </h2>
          <span className="os-chip">{summary.decisionAuditTrail.length} Logged Events</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '1.25rem' }}>
          All automated recommendations require explicit student confirmation prior to mutating major career plans or roadmap deliverables.
        </p>

        {summary.decisionAuditTrail.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', fontStyle: 'italic', margin: 0 }}>
            No recent state modifications recorded in this session.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {summary.decisionAuditTrail.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  fontSize: '0.84rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <History size={15} color="var(--color-accent)" />
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{entry.title}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                      ({entry.decisionType.replace('_', ' ')})
                    </span>
                    {entry.rationale && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {entry.rationale}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.78rem' }}>
                  <span className={`badge ${entry.approvedByUser ? 'badge-mastered' : 'badge-high'}`}>
                    {entry.approvedByUser ? 'Approved' : 'Pending Approval'}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
