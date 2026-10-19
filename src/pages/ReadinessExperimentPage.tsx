import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.js';
import type { GapEvaluationResult, ReadinessExperimentRecord } from '../types/index.js';
import {
  FlaskConical,
  PlayCircle,
  CheckCircle2,
  Circle,
  ArrowRight,
  TrendingUp,
  FileText,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

function stageStatusIcon(status: string) {
  if (status === 'completed') return <CheckCircle2 size={18} color="var(--success)" />;
  if (status === 'active') return <PlayCircle size={18} color="var(--color-accent)" />;
  return <Circle size={18} color="var(--text-muted)" />;
}

export const ReadinessExperimentPage: React.FC = () => {
  const toast = useToast();
  const [record, setRecord] = useState<ReadinessExperimentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [solution, setSolution] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState<GapEvaluationResult | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.experiment.list();
      const running = res.experiments.find(e => e.status === 'running') || res.experiments[0] || null;
      setRecord(running);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load experiments.');
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
      await fn();
      toast.success(success);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Action failed.');
    } finally {
      setBusy(null);
    }
  };

  const start = () =>
    run('start', () => api.experiment.start(), 'Experiment started with an initial snapshot.');

  const activeKind = record?.stages.find(s => s.status === 'active')?.kind;

  const submitChallenge = async () => {
    if (!record) return;
    try {
      setBusy('challenge');
      const res = await api.experiment.submitChallenge(record.id, solution);
      setEvaluation(res.evaluation);
      toast[res.evaluation.passed ? 'success' : 'error' ](
        res.evaluation.passed ? 'Challenge passed — evidence recorded.' : 'Challenge did not pass yet.'
      );
      setSolution('');
      setRecord(res.record);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit the challenge.');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="os-page-container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading readiness experiments…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="os-page-container">
      <header className="os-header">
        <div className="os-header-left">
          <div className="os-header-icon"><FlaskConical size={24} /></div>
          <div>
            <h1 className="os-header-title">Live Readiness Experiment</h1>
            <p className="os-header-subtitle">
              A reproducible before/after workflow: snapshot readiness, prove a real gap, then measure what changed.
            </p>
          </div>
        </div>
        <div className="os-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => void load()}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" disabled={busy === 'start'} onClick={() => void start()}>
            <PlayCircle size={15} /> New experiment
          </button>
        </div>
      </header>

      {!record && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2 style={{ marginBottom: '0.75rem' }}>No experiments yet</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Start one to turn your highest-priority skill gap into measured, evidence-backed readiness.
          </p>
          <button className="btn btn-primary" onClick={() => void start()}>Start experiment</button>
        </div>
      )}

      {record && (
        <>
          <div className="os-grid-3">
            <MetricCard label="Gap under test" value={record.gapSkillName} accent="var(--color-accent)" />
            <MetricCard
              label="Initial readiness"
              value={`${record.initialReadiness}%`}
              accent="var(--text-secondary)"
            />
            <MetricCard
              label={record.status === 'completed' ? 'Final readiness' : 'Status'}
              value={record.status === 'completed' ? `${record.finalReadiness}%` : 'Running'}
              accent={record.status === 'completed' ? 'var(--success)' : 'var(--info)'}
            />
          </div>

          {/* Stage timeline */}
          <div className="card">
            <div className="card-header"><h2 className="card-title"><ArrowRight size={18} /> Workflow</h2></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {record.stages.map(stage => (
                <div key={stage.kind} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{ marginTop: 2 }}>{stageStatusIcon(stage.status)}</div>
                  <div>
                    <div style={{ fontWeight: stage.status === 'active' ? 700 : 600 }}>{stage.title}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{stage.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active stage actions */}
          {record.status === 'running' && activeKind === 'challenge' && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title"><ShieldCheck size={18} /> Prove {record.gapSkillName}</h2>
                <Link to="/proof-of-skill" className="btn btn-ghost btn-sm">Open lab</Link>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '0.75rem' }}>
                Submit a gap-driven response. It is evaluated honestly (rule-checked or AI-reviewed) and recorded as evidence.
              </p>
              <textarea
                className="form-input"
                rows={6}
                placeholder="Explain your approach, include a code snippet or artifact link, and state trade-offs…"
                value={solution}
                onChange={e => setSolution(e.target.value)}
                style={{ width: '100%', resize: 'vertical' }}
              />
              {evaluation && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
                  <span className={`badge ${evaluation.passed ? 'badge-mastered' : 'badge-critical'}`}>
                    {evaluation.passed ? 'Passed' : 'Not passed'} · {evaluation.scorePercentage}%
                  </span>
                  <span className="badge badge-medium" style={{ marginLeft: '0.5rem' }}>{evaluation.evidenceClassification}</span>
                  <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>{evaluation.feedback}</p>
                </div>
              )}
              <button className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }} disabled={busy === 'challenge' || !solution.trim()} onClick={() => void submitChallenge()}>
                Submit challenge
              </button>
            </div>
          )}

          {record.status === 'running' && activeKind === 'project_milestone' && (
            <div className="card">
              <div className="card-header"><h2 className="card-title"><ArrowRight size={18} /> Project milestone</h2></div>
              <div className="form-group">
                <label className="form-label">Repository URL</label>
                <input className="form-input" value={repoUrl} onChange={e => setRepoUrl(e.target.value)} placeholder="https://github.com/…" />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="What did you ship?" />
              </div>
              <button
                className="btn btn-primary btn-sm"
                disabled={busy === 'milestone'}
                onClick={() =>
                  void run('milestone', () => api.experiment.submitMilestone(record.id, { repoUrl, notes }), 'Milestone recorded with evidence.')
                }
              >
                Submit milestone evidence
              </button>
            </div>
          )}

          {record.status === 'running' && activeKind === 'interview' && (
            <InterviewStage
              record={record}
              answer={answer}
              setAnswer={setAnswer}
              busy={busy === 'interview'}
              onSubmit={() =>
                void run('interview', () => api.experiment.submitInterview(record.id, answer), 'Interview answer evaluated.')
              }
            />
          )}

          {record.status === 'running' && activeKind === 'evidence_collection' && (
            <div className="card">
              <h2 className="card-title"><ShieldCheck size={18} /> Collect evidence</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                Gather every record produced during the experiment before recalculating.
              </p>
              <button
                className="btn btn-primary btn-sm"
                disabled={busy === 'evidence'}
                onClick={() => void run('evidence', () => api.experiment.collectEvidence(record.id), 'Evidence collected.')}
              >
                Collect evidence
              </button>
            </div>
          )}

          {record.status === 'running' && activeKind === 'recalculation' && (
            <div className="card">
              <h2 className="card-title"><TrendingUp size={18} /> Recalculate and report</h2>
              <button
                className="btn btn-primary btn-sm"
                disabled={busy === 'complete'}
                onClick={() => void run('complete', () => api.experiment.complete(record.id), 'Experiment completed.')}
              >
                Recalculate readiness
              </button>
            </div>
          )}

          {/* Challenge attempts history (honest about failures) */}
          {record.challengeAttempts && record.challengeAttempts.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title"><ShieldCheck size={18} /> Challenge attempts ({record.challengeAttempts.length})</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {record.challengeAttempts.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.82rem' }}>
                    <span className={`badge ${a.passed ? 'badge-mastered' : 'badge-critical'}`} style={{ flexShrink: 0 }}>
                      {a.passed ? 'Passed' : 'Not passed'} · {a.scorePercentage}%
                    </span>
                    <span className="badge badge-medium" style={{ flexShrink: 0 }}>{a.evidenceClassification}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{new Date(a.at).toLocaleTimeString()} — {a.feedback}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next recommended action derived from real state */}
          {record.nextRecommendedAction && (
            <div className="card" style={{ borderLeft: '3px solid var(--color-accent)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.35rem' }}>
                Next recommended action
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '0.6rem' }}>
                {record.nextRecommendedAction.detail}
              </div>
              <Link to={record.nextRecommendedAction.route} className="btn btn-primary btn-sm">
                {record.nextRecommendedAction.label} <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {/* Report */}
          {record.status === 'completed' && (
            <div className="card">
              <div className="card-header"><h2 className="card-title"><FileText size={18} /> Outcome Report</h2></div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{record.reportSummary}</p>
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {record.metricChanges.map(m => (
                  <div key={m.metric} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-light)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.metric}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{m.explanation}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{m.before}</span>
                      <ArrowRight size={14} />
                      <span style={{ fontWeight: 700, color: m.after > m.before ? 'var(--success)' : m.after < m.before ? 'var(--danger)' : 'var(--text-primary)' }}>{m.after}</span>
                    </div>
                  </div>
                ))}
              </div>
              {record.evidenceGained.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Evidence collected</div>
                  <ul style={{ paddingLeft: '1.1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {record.evidenceGained.map((r, i) => <li key={i}>{r.label}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{record.disclaimer}</p>
          <div>
            <Link to="/autopilot" className="btn btn-secondary btn-sm">Open Career Autopilot <ArrowRight size={14} /></Link>
          </div>
        </>
      )}
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string; accent: string }> = ({ label, value, accent }) => (
  <div className="card">
    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>{label}</div>
    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: accent }}>{value}</div>
  </div>
);

const InterviewStage: React.FC<{
  record: ReadinessExperimentRecord;
  answer: string;
  setAnswer: (v: string) => void;
  busy: boolean;
  onSubmit: () => void;
}> = ({ record, answer, setAnswer, busy, onSubmit }) => {
  const [question, setQuestion] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void api.experiment
      .prepareInterview(record.id)
      .then(res => {
        if (!cancelled) setQuestion(res.question);
      })
      .catch(() => {
        if (!cancelled) setQuestion(null);
      });
    return () => {
      cancelled = true;
    };
  }, [record.id]);

  return (
    <div className="card">
      <div className="card-header"><h2 className="card-title"><ArrowRight size={18} /> Targeted interview question</h2></div>
      <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{question || 'Preparing a role-specific question…'}</p>
      <textarea
        className="form-input"
        rows={4}
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        placeholder="Answer as you would in a screen…"
        style={{ width: '100%', resize: 'vertical' }}
      />
      <button className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }} disabled={busy || !answer.trim()} onClick={onSubmit}>
        Submit answer
      </button>
    </div>
  );
};
