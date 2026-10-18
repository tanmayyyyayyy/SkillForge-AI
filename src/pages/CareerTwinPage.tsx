import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import {
  CareerTwinSummary,
  CareerTwinScenarioComparison,
  CareerTwinScenarioInput
} from '../types/index.js';
import {
  Fingerprint,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  TrendingUp,
  FlaskConical
} from 'lucide-react';

const MAX_FOCUS_SKILLS = 6;

const evidenceLabel: Record<string, string> = {
  assessment: 'Assessment-backed',
  project: 'Project-backed',
  'self-reported': 'Self-reported',
  none: 'No evidence'
};

const confidenceBadge: Record<string, string> = {
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low'
};

export const CareerTwinPage: React.FC = () => {
  const toast = useToast();
  const [twin, setTwin] = useState<CareerTwinSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [comparison, setComparison] = useState<CareerTwinScenarioComparison | null>(null);

  const [focusSkills, setFocusSkills] = useState<string[]>([]);
  const [weeklyHours, setWeeklyHours] = useState(10);
  const [horizonWeeks, setHorizonWeeks] = useState(12);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.careerTwin.get();
        if (cancelled) return;
        setTwin(res.twin);
        setFocusSkills(res.twin.majorGaps.slice(0, 3).map(g => g.skillId));
        setWeeklyHours(res.twin.identity.weeklyHours || 10);
      } catch (err: any) {
        if (!cancelled) toast.error(err.message || 'Failed to load your career twin.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [toast]);

  const toggleFocus = (skillId: string) => {
    setFocusSkills(prev => {
      if (prev.includes(skillId)) return prev.filter(id => id !== skillId);
      if (prev.length >= MAX_FOCUS_SKILLS) return prev;
      return [...prev, skillId];
    });
  };

  const runSimulation = async () => {
    if (focusSkills.length === 0) {
      toast.error('Select at least one focus skill to simulate.');
      return;
    }
    try {
      setIsSimulating(true);
      const scenario: CareerTwinScenarioInput = {
        label: 'Focus plan',
        focusSkillIds: focusSkills,
        weeklyHours,
        horizonWeeks
      };
      const res = await api.careerTwin.simulate([scenario]);
      setComparison(res.comparison);
    } catch (err: any) {
      toast.error(err.message || 'Failed to simulate scenarios.');
    } finally {
      setIsSimulating(false);
    }
  };

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div aria-hidden="true" className="spin" style={{ width: 36, height: 36, border: '3px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', margin: '0 auto 1rem' }} />
          <div>Assembling your career twin from your evidence...</div>
        </div>
      </div>
    );
  }

  if (!twin) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <HelpCircle size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
        <div style={{ color: 'var(--text-secondary)' }}>Complete onboarding to build your career twin.</div>
      </div>
    );
  }

  const { identity, readiness } = twin;
  const suggestionPool = twin.majorGaps.length > 0
    ? twin.majorGaps
    : twin.skills.filter(s => s.requiredLevel !== null).slice(0, MAX_FOCUS_SKILLS).map(s => ({
        skillId: s.skillId,
        name: s.name,
        gap: s.gap,
        priority: 'Medium' as const,
        nextAction: s.nextAction
      }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Fingerprint size={26} color="var(--color-accent)" />
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.9rem', margin: 0 }}>Career Twin</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem', maxWidth: 720 }}>
          An evidence-based model of where you stand against <strong>{identity.targetRoleTitle}</strong>. Self-reported
          skills are always labelled as such — never presented as verified.
        </p>
      </header>

      {/* Identity + readiness */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        <div className="card">
          <div className="card-header"><span className="card-title"><ShieldCheck size={18} color="var(--success)" /> Identity</span></div>
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', margin: 0, fontSize: '0.88rem' }}>
            <dt style={{ color: 'var(--text-muted)' }}>Name</dt><dd style={{ margin: 0, fontWeight: 600 }}>{identity.fullName}</dd>
            <dt style={{ color: 'var(--text-muted)' }}>Education</dt><dd style={{ margin: 0 }}>{identity.educationLevel}{identity.academicStanding ? ` · ${identity.academicStanding}` : ''}</dd>
            <dt style={{ color: 'var(--text-muted)' }}>Graduation</dt><dd style={{ margin: 0 }}>{identity.graduationYear}</dd>
            <dt style={{ color: 'var(--text-muted)' }}>Weekly capacity</dt><dd style={{ margin: 0 }}>{identity.weeklyHours} h / week</dd>
            <dt style={{ color: 'var(--text-muted)' }}>Learning style</dt><dd style={{ margin: 0 }}>{identity.learningStyle}</dd>
            <dt style={{ color: 'var(--text-muted)' }}>Target companies</dt><dd style={{ margin: 0 }}>{identity.targetCompanies.length > 0 ? identity.targetCompanies.join(', ') : '—'}</dd>
          </dl>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title"><TrendingUp size={18} color="var(--color-accent)" /> Readiness</span>
            <span className={`badge ${readiness.delta > 0 ? 'badge-high' : 'badge-medium'}`}>
              {readiness.delta > 0 ? `+${readiness.delta}` : readiness.delta === 0 ? 'No change' : readiness.delta} vs previous
            </span>
          </div>
          <div style={{ fontSize: '3rem', fontFamily: 'var(--font-display)', fontWeight: 800, lineHeight: 1 }}>{readiness.overallScore}</div>
          <div className="progress-container" style={{ marginTop: '0.75rem', height: 10 }} role="progressbar" aria-valuenow={readiness.overallScore} aria-valuemin={0} aria-valuemax={100} aria-label="Overall readiness">
            <div className="progress-bar progress-bar-success" style={{ width: `${readiness.overallScore}%` }} />
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <span className="badge badge-pill">Assessed: {twin.evidenceBreakdown.assessed}</span>
            <span className="badge badge-pill">Project-backed: {twin.evidenceBreakdown.projectVerified}</span>
            <span className="badge badge-pill">Self-reported: {twin.evidenceBreakdown.selfReported}</span>
            <span className="badge badge-pill">Unverified: {twin.evidenceBreakdown.unverified}</span>
          </div>
        </div>
      </div>

      {/* Strengths / gaps / missing evidence */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        <div className="card">
          <div className="card-header"><span className="card-title"><Sparkles size={18} color="var(--success)" /> Strengths</span></div>
          {twin.strengths.length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No role requirements fully met yet.</p>
            : <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>{twin.strengths.map(s => <span key={s} className="badge badge-mastered">{s}</span>)}</div>}
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title"><AlertTriangle size={18} color="var(--danger)" /> Major gaps</span></div>
          {twin.majorGaps.length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No outstanding gaps for your target role.</p>
            : <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {twin.majorGaps.map(g => (
                  <li key={g.skillId}>
                    <span style={{ fontWeight: 600 }}>{g.name}</span>{' '}
                    <span className={`badge badge-${g.priority.toLowerCase()}`}>{g.priority}</span>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{g.nextAction}</div>
                  </li>
                ))}
              </ul>}
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title"><HelpCircle size={18} color="var(--warning)" /> Needs evidence</span></div>
          {twin.missingEvidence.length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Every role-required skill has independent evidence.</p>
            : <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>{twin.missingEvidence.map(s => <span key={s} className="badge badge-medium">{s}</span>)}</div>}
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.75rem' }}>
            Verify these with an assessment or a project to increase your readiness score.
          </p>
        </div>
      </div>

      {/* Skill model */}
      <div className="card">
        <div className="card-header"><span className="card-title">Skill model</span><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{twin.skills.length} skills tracked</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.5rem' }}>Skill</th>
                <th style={{ padding: '0.5rem' }}>Level</th>
                <th style={{ padding: '0.5rem' }}>Target</th>
                <th style={{ padding: '0.5rem' }}>Evidence</th>
                <th style={{ padding: '0.5rem' }}>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {twin.skills.map(s => (
                <tr key={s.skillId} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.5rem' }}>{s.name}</td>
                  <td style={{ padding: '0.5rem' }}>{s.currentLevel}{s.gap > 0 && <span style={{ color: 'var(--danger)', fontSize: '0.78rem' }}> (−{s.gap})</span>}</td>
                  <td style={{ padding: '0.5rem' }}>{s.requiredLevel === null ? '—' : s.requiredLevel}</td>
                  <td style={{ padding: '0.5rem' }}>{evidenceLabel[s.evidenceKind]}</td>
                  <td style={{ padding: '0.5rem' }}><span className={`badge ${confidenceBadge[s.confidence]}`}>{s.confidence}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scenario simulation */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><FlaskConical size={18} color="var(--color-accent)" /> Scenario simulator</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Deterministic "what if" projection</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Pick up to {MAX_FOCUS_SKILLS} skills and see how focused effort could move your readiness score. The
          projection re-runs the same scoring engine on a hypothetical profile — it is an estimate, not a promise.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          <div>
            <div className="form-label">Focus skills</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.4rem' }}>
              {suggestionPool.map(s => (
                <label key={s.skillId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.86rem' }}>
                  <input
                    type="checkbox"
                    checked={focusSkills.includes(s.skillId)}
                    onChange={() => toggleFocus(s.skillId)}
                  />
                  {s.name}
                </label>
              ))}
              {suggestionPool.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No gaps to simulate.</span>}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="twin-hours">Focused hours / week</label>
              <input id="twin-hours" className="form-input" type="number" min={1} max={80} value={weeklyHours}
                onChange={e => setWeeklyHours(Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="twin-weeks">Horizon (weeks)</label>
              <input id="twin-weeks" className="form-input" type="number" min={1} max={52} value={horizonWeeks}
                onChange={e => setHorizonWeeks(Number(e.target.value))} />
            </div>
            <button className="btn btn-primary" onClick={runSimulation} disabled={isSimulating}>
              {isSimulating ? 'Simulating…' : 'Run simulation'}
            </button>
          </div>
        </div>

        {comparison && comparison.scenarios.length > 0 && (
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Current</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{comparison.baseReadiness}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Projected</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)' }}>{comparison.scenarios[0].projectedReadiness}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Delta</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-accent)' }}>
                  {comparison.scenarios[0].readinessDelta >= 0 ? '+' : ''}{comparison.scenarios[0].readinessDelta}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Remaining gaps</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{comparison.scenarios[0].remainingGapSkills}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
              {comparison.scenarios[0].skillsTouched.map(p => (
                <div key={p.skillId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                  <span>{p.name}</span>
                  <span style={{ color: p.toLevel > p.fromLevel ? 'var(--success)' : 'var(--text-muted)' }}>
                    L{p.fromLevel} → L{p.toLevel} (target L{p.targetLevel})
                  </span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <strong>{comparison.recommendation}</strong>
            </div>
            <ul style={{ margin: '0.6rem 0 0', paddingLeft: '1.1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {comparison.scenarios[0].assumptions.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
            {comparison.scenarios[0].notes.map((n, i) => (
              <div key={i} style={{ fontSize: '0.8rem', color: 'var(--warning)', marginTop: '0.4rem' }}>{n}</div>
            ))}
          </div>
        )}
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{twin.disclaimer}</p>
    </div>
  );
};

export default CareerTwinPage;
