import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.js';
import type { AutopilotAction, CareerAutopilotPlan, DecisionRecord } from '../types/index.js';
import {
  Compass,
  Target,
  CheckCircle2,
  XCircle,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Info,
  Lock,
  ArrowRight,
  History,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

const STATUS_BADGE: Record<string, string> = {
  proposed: 'badge-medium',
  approved: 'badge-accent',
  in_progress: 'badge-accent',
  awaiting_approval: 'badge-high',
  completed: 'badge-mastered',
  rejected: 'badge-critical',
  blocked: 'badge-critical'
};

const CLASSIFICATION_LABEL: Record<string, string> = {
  'self-reported': 'Self-reported',
  'ai-reviewed': 'AI-reviewed',
  'rule-checked': 'Rule-checked',
  'test-verified': 'Test-verified',
  'human-reviewed': 'Human-reviewed'
};

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export const AutopilotPage: React.FC = () => {
  const toast = useToast();
  const [plan, setPlan] = useState<CareerAutopilotPlan | null>(null);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [goalDraft, setGoalDraft] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.autopilot.getPlan();
      setPlan(res.plan);
      setDecisions(res.decisions);
      setGoalDraft(res.plan.goal);
    } catch (err: any) {
      setError(err.message || 'Failed to load your Career Autopilot plan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const run = async (key: string, fn: () => Promise<any>, success: string) => {
    try {
      setBusy(key);
      const res = await fn();
      if (res?.plan) setPlan(res.plan);
      if (res?.experiment) void load();
      toast.success(success);
      void load();
    } catch (err: any) {
      toast.error(err.message || 'Action failed.');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="os-page-container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Building your Career Autopilot plan…</p>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="os-page-container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Autopilot unavailable</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => void load()}>Retry</button>
        </div>
      </div>
    );
  }

  const recommended = plan.actions.find(a => a.id === plan.recommendedActionId) || null;
  const completed = plan.actions.filter(a => a.status === 'completed');
  const actionable = plan.actions.filter(a => a.status !== 'completed' && a.status !== 'rejected');

  return (
    <div className="os-page-container">
      <header className="os-header">
        <div className="os-header-left">
          <div className="os-header-icon"><Compass size={24} /></div>
          <div>
            <h1 className="os-header-title">Career Autopilot</h1>
            <p className="os-header-subtitle">
              Decomposes your goal into objectives, acts on real evidence, and asks before changing anything important.
            </p>
          </div>
        </div>
        <div className="os-header-actions">
          <button
            className="btn btn-secondary btn-sm"
            disabled={busy === 'replan'}
            onClick={() => void run('replan', () => api.autopilot.replan(), 'Plan refreshed against your latest evidence.')}
          >
            <RefreshCw size={15} /> Replan
          </button>
        </div>
      </header>

      <div className="os-grid-3">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>
            <Target size={15} color="var(--color-accent)" /> Target Role
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{plan.targetRole.title}</div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>
            <CheckCircle2 size={15} color="var(--success)" /> Progress
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>
            {completed.length}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/{plan.actions.length}</span>
          </div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>
            <Sparkles size={15} color="var(--info)" /> Objectives
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--info)' }}>
            {plan.objectives.filter(o => o.status === 'completed').length}
            <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/{plan.objectives.length}</span>
          </div>
        </div>
      </div>

      {/* Goal editor */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title"><Target size={18} /> Your Goal</h2>
        </div>
        <textarea
          className="form-input"
          rows={2}
          value={goalDraft}
          onChange={e => setGoalDraft(e.target.value)}
          style={{ width: '100%', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', gap: '1rem', flexWrap: 'wrap' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
            Changing your goal replans the work but never discards completed or approved steps.
          </p>
          <button
            className="btn btn-primary btn-sm"
            disabled={busy === 'goal' || goalDraft.trim().length === 0}
            onClick={() => void run('goal', () => api.autopilot.setGoal(goalDraft.trim()), 'Goal saved. Completed work preserved.')}
          >
            Save goal
          </button>
        </div>
      </div>

      {/* Recommended next action */}
      {recommended && (
        <div className="card" style={{ borderLeft: '3px solid var(--color-accent)', background: 'linear-gradient(135deg, rgba(211,138,25,0.08), rgba(245,166,35,0.02))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-accent)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>
                <Sparkles size={15} /> Recommended next step
              </div>
              <h3 style={{ margin: '0.4rem 0', fontSize: '1.15rem', fontWeight: 800 }}>{recommended.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>{recommended.reason}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.5rem' }}>
                {plan.recommendationReason}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 200 }}>
              <span className={`badge ${STATUS_BADGE[recommended.status] || 'badge-medium'}`}>{statusLabel(recommended.status)}</span>
              <Link to={recommended.route} className="btn btn-primary btn-sm" style={{ textAlign: 'center' }}>
                {recommended.actionLabel} <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Objectives */}
      <div className="card">
        <div className="card-header"><h2 className="card-title"><Target size={18} /> Objectives</h2></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {plan.objectives.map(obj => (
            <div key={obj.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle2 size={18} color={obj.status === 'completed' ? 'var(--success)' : 'var(--text-muted)'} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>{obj.title}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{obj.measurableOutcome}</div>
              </div>
              <span className={`badge ${obj.status === 'completed' ? 'badge-mastered' : 'badge-medium'}`}>{statusLabel(obj.status)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title"><ShieldCheck size={18} /> Action Board</h2>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{actionable.length} open</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {plan.actions.map(action => (
            <ActionRow
              key={action.id}
              action={action}
              expanded={expanded === action.id}
              busy={busy}
              onToggle={() => setExpanded(expanded === action.id ? null : action.id)}
              onReview={(decision) =>
                void run(
                  `${action.id}:${decision}`,
                  () => api.autopilot.reviewAction(action.id, decision),
                  `Action ${decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : statusLabel(decision)}.`
                )
              }
              onApplyTarget={() =>
                void run('apply', () => api.autopilot.applyTargetRole(action.id), 'Career target updated and plan rebuilt.')
              }
            />
          ))}
        </div>
      </div>

      {/* Decision audit */}
      <div className="card">
        <div className="card-header"><h2 className="card-title"><History size={18} /> Decision Audit Trail</h2></div>
        {decisions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No decisions recorded yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {decisions.slice(0, 12).map(d => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-light)' }}>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{d.recommendation}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{d.result}</div>
                </div>
                <span className={`badge ${d.status === 'rejected' ? 'badge-critical' : d.status === 'approved' || d.status === 'applied' ? 'badge-mastered' : 'badge-medium'}`}>
                  {statusLabel(d.status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{plan.disclaimer}</p>
    </div>
  );
};

interface ActionRowProps {
  action: AutopilotAction;
  expanded: boolean;
  busy: string | null;
  onToggle: () => void;
  onReview: (decision: 'approve' | 'reject' | 'start' | 'complete') => void;
  onApplyTarget: () => void;
}

const ActionRow: React.FC<ActionRowProps> = ({ action, expanded, busy, onToggle, onReview, onApplyTarget }) => {
  const done = action.status === 'completed';
  return (
    <div style={{ border: '1px solid var(--border-light)', borderRadius: 10, padding: '0.85rem', opacity: done ? 0.75 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700 }}>{action.title}</span>
            <span className={`badge ${STATUS_BADGE[action.status] || 'badge-medium'}`}>{statusLabel(action.status)}</span>
            <span className={`badge badge-${action.priority.toLowerCase()}`}>{action.priority}</span>
            {action.requiresApproval && !action.approvedByUser && action.status !== 'completed' && (
              <span className="badge badge-high"><Lock size={11} /> Needs approval</span>
            )}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            {action.explanation.what} · Evidence: {CLASSIFICATION_LABEL[action.explanation.evidenceClassification] || action.explanation.evidenceClassification}
          </div>
          {action.recordedEvidence.length > 0 && (
            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', color: 'var(--success)', fontSize: '0.82rem' }}>
              {action.recordedEvidence.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Link to={action.route} className="btn btn-secondary btn-sm">{action.actionLabel}</Link>
          {!done && action.status !== 'approved' && (
            <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => onReview('approve')}>
              Approve
            </button>
          )}
          {!done && (
            <button className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => onReview('reject')}>
              <XCircle size={14} />
            </button>
          )}
          {!done && action.status !== 'completed' && (
            <button className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => onReview('complete')} title="Mark complete">
              <CheckCircle2 size={14} />
            </button>
          )}
          {action.kind === 'change_target_role' && action.status === 'approved' && (
            <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={onApplyTarget}>
              Apply target
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={onToggle}>
            <Info size={14} />
          </button>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <p style={{ margin: '0 0 0.4rem' }}><strong>Why:</strong> {action.explanation.why}</p>
          {action.explanation.supportingData.length > 0 && (
            <p style={{ margin: '0 0 0.4rem' }}><strong>Supporting data:</strong> {action.explanation.supportingData.join(' · ')}</p>
          )}
          {action.explanation.assumptions.length > 0 && (
            <p style={{ margin: '0 0 0.4rem' }}><strong>Assumptions:</strong> {action.explanation.assumptions.join(' ')}</p>
          )}
          {action.explanation.uncertainties.length > 0 && (
            <p style={{ margin: '0 0 0.4rem', color: 'var(--warning)' }}>
              <AlertTriangle size={13} /> <strong>Uncertainty:</strong> {action.explanation.uncertainties.join(' ')}
            </p>
          )}
          <p style={{ margin: '0 0 0.4rem' }}><strong>If accepted:</strong> {action.explanation.ifAccepted}</p>
          <p style={{ margin: 0 }}>
            <strong>Reversible:</strong> {action.explanation.reversible ? 'Yes' : 'No'} · <strong>Expected outcome:</strong> {action.expectedOutcome}
          </p>
          {action.explanation.supportingReferences.length > 0 && (
            <p style={{ margin: '0.4rem 0 0' }}>
              <strong>Sources:</strong>{' '}
              {action.explanation.supportingReferences.map((r, i) => (
                <span key={i}>
                  {r.url ? <Link to={r.url}>{r.label}</Link> : r.label}
                  {i < action.explanation.supportingReferences.length - 1 ? ', ' : ''}
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
