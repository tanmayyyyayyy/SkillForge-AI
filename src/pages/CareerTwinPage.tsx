import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import {
  CareerTwinSummary,
  CareerTwinScenarioComparison,
  CareerTwinScenarioInput,
  CareerTwinEvolutionData,
  WhatIfLabResult
} from '../types/index.js';
import {
  Fingerprint,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  TrendingUp,
  FlaskConical,
  GitFork,
  Calendar,
  CheckCircle2,
  Clock,
  Layers
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
  const [evolution, setEvolution] = useState<CareerTwinEvolutionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [comparison, setComparison] = useState<CareerTwinScenarioComparison | null>(null);

  const [focusSkills, setFocusSkills] = useState<string[]>([]);
  const [weeklyHours, setWeeklyHours] = useState(10);
  const [horizonWeeks, setHorizonWeeks] = useState(12);
  const [whatIf, setWhatIf] = useState<WhatIfLabResult | null>(null);
  const [isWhatIfRunning, setIsWhatIfRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [res, evoRes] = await Promise.all([
          api.careerTwin.get(),
          api.careerTwinEvolution.getEvolution().catch(() => ({ evolution: null }))
        ]);
        if (cancelled) return;
        setTwin(res.twin);
        if (evoRes?.evolution) {
          setEvolution(evoRes.evolution);
        }
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

  const runWhatIfLab = async () => {
    try {
      setIsWhatIfRunning(true);
      const res = await api.careerTwin.whatIf({ weeklyHours, horizonWeeks });
      setWhatIf(res.result);
    } catch (err: any) {
      toast.error(err.message || 'Failed to run the what-if lab.');
    } finally {
      setIsWhatIfRunning(false);
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

      {/* What-If Lab: prerequisites, milestone movement, evidence gaps */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><Calendar size={18} color="var(--info)" /> What-If Lab</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rule-based projection · not measured progress</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Compares your current pace against doubled effort and an extended horizon, using the same
          hours and horizon as the simulator above. Prerequisites, milestone movement, and remaining
          evidence gaps are shown explicitly.
        </p>
        <button className="btn btn-secondary btn-sm" disabled={isWhatIfRunning} onClick={() => void runWhatIfLab()}>
          {isWhatIfRunning ? 'Projecting…' : 'Run What-If Lab'}
        </button>

        {whatIf && (
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{whatIf.comparisonSummary}</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {whatIf.scenarios.map(sc => (
                <div key={sc.scenarioId} style={{ padding: '1rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700 }}>{sc.label}</span>
                    <span className="badge badge-medium" style={{ fontSize: '0.68rem' }}>{sc.uncertainty} uncertainty</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.25rem 0 0.6rem' }}>
                    {sc.weeklyHours} h/week · {sc.horizonWeeks} weeks · {sc.projectionBasis}
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                    {whatIf.baseReadiness}% → <span style={{ color: 'var(--success)' }}>{sc.projectedReadiness}%</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-accent)', marginLeft: '0.4rem' }}>+{sc.readinessDelta}</span>
                  </div>

                  {sc.skillsAffected.length > 0 && (
                    <div style={{ marginTop: '0.6rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      {sc.skillsAffected.map(s => (
                        <div key={s.skillId} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{s.name}</span>
                          <span style={{ color: 'var(--text-muted)' }}>L{s.fromLevel} → L{s.toLevel}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {sc.blockedPrerequisites.length > 0 && (
                    <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: 'var(--warning)' }}>
                      Blocked: {sc.blockedPrerequisites.join('; ')}
                    </div>
                  )}
                  {sc.evidenceStillNeeded.length > 0 && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Still needs evidence: {sc.evidenceStillNeeded.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {whatIf.prerequisites.length > 0 && (
              <div style={{ marginTop: '1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <strong>Prerequisites:</strong>{' '}
                {whatIf.prerequisites.map(p => `${p.skillName} needs ${p.missingPrerequisites.join(', ')}`).join('; ')}
              </div>
            )}

            <div style={{ marginTop: '0.85rem', fontSize: '0.84rem', color: 'var(--text-primary)' }}>
              <strong>{whatIf.recommendation}</strong>
            </div>
            <ul style={{ margin: '0.6rem 0 0', paddingLeft: '1.1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {whatIf.scenarios[0]?.assumptions.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>{whatIf.disclaimer}</div>
          </div>
        )}
      </div>

      {/* Evolution Multi-Scenario Comparative Forecasts */}
      {evolution && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div className="os-header-icon" style={{ width: 38, height: 38 }}>
                <GitFork size={20} />
              </div>
              <div>
                <h3 className="card-title" style={{ fontSize: '1.2rem', margin: 0 }}>
                  Career Twin Evolution: Comparative Scenarios
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                  Deterministic trajectories comparing learning paces against {evolution.targetRole.title}.
                </p>
              </div>
            </div>
            <span className="badge badge-accent">
              Base Readiness: {evolution.baseReadiness}%
            </span>
          </div>

          <div
            style={{
              fontSize: '0.86rem',
              color: 'var(--text-secondary)',
              marginBottom: '1.25rem',
              padding: '0.85rem 1rem',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              lineHeight: 1.5
            }}
          >
            <strong style={{ color: 'var(--text-primary)' }}>Strategic Recommendation:</strong> {evolution.comparisonSummary}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            {evolution.scenarios.map((sc) => {
              const isRecommended = sc.scenarioId === evolution.recommendedScenario;
              return (
                <div
                  key={sc.scenarioId}
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-lg)',
                    background: isRecommended ? 'rgba(211, 138, 25, 0.07)' : 'var(--bg-card)',
                    border: isRecommended ? '1.5px solid var(--color-accent)' : '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    boxShadow: isRecommended ? '0 4px 14px rgba(211, 138, 25, 0.12)' : 'none'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', minWidth: 0, overflowWrap: 'anywhere' }}>
                        {sc.label}
                      </div>
                      {isRecommended && (
                        <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>
                          Recommended
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.85rem', lineHeight: 1.45 }}>
                      {sc.description}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Commitment</div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{sc.weeklyStudyHours}h / week</div>
                      </div>
                      <div style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Timeline</div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>~{sc.estimatedWeeksToReadiness} weeks</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.85rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Projected Readiness</span>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--success)' }}>
                        {sc.projectedReadinessScore}% (+{sc.projectedReadinessDelta}%)
                      </span>
                    </div>

                    {sc.milestoneForecasts.length > 0 && (
                      <div style={{ fontSize: '0.78rem', marginBottom: '0.5rem', background: 'var(--bg-card-hover)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>Next Key Milestone:</div>
                        <div style={{ color: 'var(--text-secondary)' }}>
                          • {sc.milestoneForecasts[0].milestoneName} ({sc.milestoneForecasts[0].targetSkill})
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.15rem' }}>
                          Target: {sc.milestoneForecasts[0].expectedCompletionDate} (~{sc.milestoneForecasts[0].requiredHours}h)
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <div><strong style={{ color: 'var(--text-primary)' }}>Assumption:</strong> {sc.assumptions[0] || 'Linear study pace'}</div>
                    {sc.riskFactors[0] && (
                      <div style={{ color: 'var(--warning)', marginTop: '0.25rem' }}>
                        <strong>Risk:</strong> {sc.riskFactors[0]}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
            {evolution.disclaimer}
          </div>
        </div>
      )}

      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{twin.disclaimer}</p>
    </div>
  );
};

export default CareerTwinPage;
