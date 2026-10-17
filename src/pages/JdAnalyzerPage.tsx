import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import {
  JobDescriptionAnalysis,
  JobDescriptionMatch,
  JobRequirementKind
} from '../types/index.js';
import {
  FileText,
  Target,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Info
} from 'lucide-react';

const KIND_LABEL: Record<JobRequirementKind, string> = {
  required: 'Required',
  preferred: 'Preferred',
  tool: 'Tool / platform',
  responsibility: 'Implied by duty'
};

const STATE_META: Record<
  JobDescriptionMatch['state'],
  { label: string; color: string; Icon: React.ComponentType<{ size?: number; color?: string }> }
> = {
  matched: { label: 'Matched', color: 'var(--success)', Icon: CheckCircle2 },
  partial: { label: 'Below bar', color: 'var(--warning)', Icon: Clock },
  missing: { label: 'Missing', color: 'var(--danger)', Icon: AlertTriangle }
};

/** Clearly-labelled sample so the analyzer can be demonstrated without a real posting. */
const SAMPLE_JD = `Senior Backend Engineer
TechAxis Solutions Pvt Ltd

About the role:
We are building the data platform behind our payments product and need an engineer who can design reliable services end to end.

Responsibilities:
- Design and build REST APIs consumed by web and mobile clients
- Write production Python services with automated tests
- Model data in PostgreSQL and tune slow queries
- Containerize and ship services through CI/CD

Requirements:
- 2+ years building backend services in Python
- Strong SQL and relational database design
- Experience with Docker and Git-based workflows
- Solid grasp of data structures and algorithms

Nice to have:
- Familiarity with AWS or another cloud platform
- Exposure to Kubernetes
- Experience with system design for scalability`;

type KindFilter = 'All' | JobRequirementKind;

export const JdAnalyzerPage: React.FC = () => {
  const toast = useToast();

  const [description, setDescription] = useState('');
  const [analysis, setAnalysis] = useState<JobDescriptionAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<KindFilter>('All');
  const [config, setConfig] = useState<{ minChars: number; maxChars: number }>({
    minChars: 80,
    maxChars: 20000
  });

  useEffect(() => {
    let cancelled = false;
    api.jd
      .getConfig()
      .then(res => {
        if (!cancelled) setConfig({ minChars: res.minChars, maxChars: res.maxChars });
      })
      .catch(() => {
        // Non-fatal: client falls back to the documented defaults.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAnalyze = useCallback(async () => {
    const trimmed = description.trim();
    if (trimmed.length < config.minChars) {
      setError(`Paste at least ${config.minChars} characters of a job description before analyzing.`);
      return;
    }
    if (trimmed.length > config.maxChars) {
      setError(`Job description is too long. The maximum is ${config.maxChars} characters.`);
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await api.jd.analyze(trimmed);
      setAnalysis(res.analysis);
      setKindFilter('All');
      toast.success('Job description analyzed.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze the job description.';
      setError(message);
      toast.error(message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [description, config, toast]);

  const loadSample = () => {
    setDescription(SAMPLE_JD);
    setAnalysis(null);
    setError(null);
    setKindFilter('All');
  };

  const clearAll = () => {
    setDescription('');
    setAnalysis(null);
    setError(null);
    setKindFilter('All');
  };

  const summary = analysis?.summary;
  const matches = analysis?.matches || [];
  const kindsPresent = Array.from(new Set(matches.map(m => m.kind)));
  const filtered = matches.filter(m => kindFilter === 'All' || m.kind === kindFilter);
  const haveSkills = filtered.filter(m => m.state !== 'missing');
  const gapSkills = filtered.filter(m => m.state === 'missing');
  const charCount = description.trim().length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Job Description Analyzer
            </h1>
            <div className="editorial-pill" style={{ background: 'var(--color-paper-light)', borderColor: 'var(--border-medium)' }}>
              <span className="editorial-pill-dot" />
              <span>Paste a posting &middot; compare against your profile</span>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, lineHeight: 1.5, maxWidth: 640 }}>
            Paste any job posting. We extract the concrete skills it asks for, match them against what you
            already have, and explain exactly what to close next.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/analysis" className="editorial-btn-primary" style={{ padding: '0.55rem 1.1rem', fontSize: '0.88rem' }}>
            <span>Full Gap Analysis</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* INPUT */}
      <div className="card" style={{ background: 'var(--color-paper)', border: '1px solid var(--border-subtle)', padding: '1.25rem' }}>
        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
          <label className="form-label" htmlFor="jd-input" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <span>Job description text</span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
              {charCount} / {config.maxChars} characters (min {config.minChars})
            </span>
          </label>
          <textarea
            id="jd-input"
            className="form-textarea"
            rows={12}
            value={description}
            maxLength={config.maxChars}
            aria-describedby="jd-input-help"
            placeholder="Paste the full job description here — title, responsibilities, requirements and nice-to-have skills…"
            onChange={e => setDescription(e.target.value)}
            style={{ resize: 'vertical', minHeight: '180px' }}
          />
          <div id="jd-input-help" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Nothing is saved to your profile. The posting is only used to compute this comparison.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="editorial-btn-primary"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            style={{ padding: '0.55rem 1.2rem', fontSize: '0.9rem', opacity: isAnalyzing ? 0.7 : 1 }}
          >
            <span>{isAnalyzing ? 'Analyzing…' : 'Analyze posting'}</span>
            {!isAnalyzing && <Target size={15} />}
          </button>
          <button type="button" className="btn btn-secondary" onClick={loadSample} disabled={isAnalyzing}>
            <span>Insert sample posting</span>
          </button>
          <button type="button" className="btn btn-ghost" onClick={clearAll} disabled={isAnalyzing || (!description && !analysis)}>
            Clear
          </button>
        </div>

        {error && (
          <div role="alert" style={{ marginTop: '0.85rem', padding: '0.7rem 0.9rem', borderRadius: 'var(--radius-md)', background: 'rgba(153, 27, 27, 0.08)', border: '1px solid rgba(153, 27, 27, 0.35)', color: 'var(--danger)', fontSize: '0.86rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{error}</span>
          </div>
        )}

        {isAnalyzing && (
          <div role="status" aria-live="polite" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            <div className="spin" aria-hidden="true" style={{ width: 20, height: 20, border: '3px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%' }} />
            <span>Extracting skills and matching against your profile…</span>
          </div>
        )}
      </div>

      {/* EMPTY STATE */}
      {!analysis && !isAnalyzing && (
        <div className="card" role="status" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)', border: '1px dashed var(--border-medium)', background: 'var(--bg-surface)' }}>
          <FileText size={26} color="var(--color-accent)" style={{ marginBottom: '0.6rem' }} />
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
            No posting analyzed yet
          </div>
          <div style={{ fontSize: '0.9rem', maxWidth: 520, margin: '0 auto', lineHeight: 1.55 }}>
            Paste a job description (at least {config.minChars} characters) or insert the sample posting to see
            matched skills, missing requirements, and the priority order for closing them.
          </div>
        </div>
      )}

      {/* RESULTS */}
      {analysis && summary && (
        <div aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* SUMMARY CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem' }}>
            <div className="card" style={{ background: 'var(--color-paper)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Posting Match Score
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 700, fontFamily: 'var(--font-serif)', color: summary.matchScore === null ? 'var(--text-muted)' : 'var(--text-primary)', marginTop: '0.2rem' }}>
                {summary.matchScore === null ? '—' : `${summary.matchScore}%`}
              </div>
              {summary.matchScore === null ? (
                <div role="status" style={{ fontSize: '0.78rem', color: 'var(--warning)', marginTop: '0.5rem', lineHeight: 1.4 }}>
                  {summary.note}
                </div>
              ) : (
                <>
                  <div
                    className="progress-container"
                    role="progressbar"
                    aria-label="Posting match score"
                    aria-valuenow={summary.matchScore}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    style={{ height: 6, margin: '0.5rem 0', background: 'var(--color-progress-track)' }}
                  >
                    <div className="progress-bar" style={{ width: `${summary.matchScore}%`, background: 'var(--color-accent)' }} />
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Fit signal for your own planning — not a hiring probability.
                  </div>
                </>
              )}
            </div>

            <div className="card" style={{ background: 'var(--color-paper)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Requirements To Close
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--danger)', marginTop: '0.2rem' }}>
                {summary.missingCount}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                {summary.partialCount} more matched but below your target track&apos;s catalog level
              </div>
            </div>

            <div className="card" style={{ background: 'var(--color-paper)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Skills You Already Have
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--success)', marginTop: '0.2rem' }}>
                {summary.matchedCount}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                of {summary.extractedSkillCount} extracted skills
              </div>
            </div>

            <div className="card" style={{ background: 'var(--color-paper)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Weighted Coverage
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--color-accent)', marginTop: '0.2rem' }}>
                {summary.requiredCoverage === null ? '—' : `${summary.requiredCoverage}%`}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                required-group
                {summary.preferredCoverage !== null ? ` · preferred ${summary.preferredCoverage}%` : ' · no preferred skills listed'}
              </div>
            </div>
          </div>

          {/* EXTRACTION TRANSPARENCY */}
          <div className="card" style={{ background: 'var(--color-paper)', border: '1px solid var(--border-subtle)', padding: '1.15rem 1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="badge badge-pill" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '0.74rem' }}>
                {analysis.source === 'gemini' ? 'AI-extracted (validated)' : 'Rule-based extraction'}
              </span>
              {analysis.extraction.jobTitle && (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {analysis.extraction.jobTitle}
                </span>
              )}
              {analysis.extraction.companyName && (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  &middot; {analysis.extraction.companyName}
                </span>
              )}
              {analysis.targetRole && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  &middot; compared against {analysis.targetRole.title}
                </span>
              )}
              {analysis.closestRole && (
                <span className="editorial-pill" style={{ padding: '0.15rem 0.6rem', fontSize: '0.72rem', background: 'var(--color-paper-light)', borderColor: 'var(--border-medium)' }}>
                  Closest track: {analysis.closestRole.title} ({analysis.closestRole.overlap}% skill overlap)
                </span>
              )}
            </div>

            {analysis.extraction.warnings.length > 0 && (
              <ul role="status" style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem', fontSize: '0.8rem', color: 'var(--warning)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                {analysis.extraction.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </div>

          {/* KIND FILTER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Layers size={14} /> Requirement type:
            </span>
            {(['All', ...kindsPresent] as KindFilter[]).map(k => (
              <button
                key={k}
                type="button"
                aria-pressed={kindFilter === k}
                onClick={() => setKindFilter(k)}
                className={`btn btn-sm ${kindFilter === k ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}
              >
                {k === 'All' ? 'All' : KIND_LABEL[k]}
              </button>
            ))}
          </div>

          {/* MATCHED / MISSING LISTS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
            <MatchGroup title="Skills you already have" icon={<CheckCircle2 size={17} color="var(--success)" />} items={haveSkills} emptyText="No listed skill from this posting is present in your profile yet." />
            <MatchGroup title="Requirements to close" icon={<AlertTriangle size={17} color="var(--danger)" />} items={gapSkills} emptyText="Every extracted skill for this filter is already covered by your profile." />
          </div>

          {/* NEXT STEPS */}
          <div className="card" style={{ background: 'var(--color-paper)', border: '1px solid var(--border-subtle)' }}>
            <div className="card-header">
              <span className="card-title" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--text-primary)' }}>
                <Sparkles size={18} color="var(--color-accent)" />
                Priority order for closing this gap
              </span>
            </div>

            {analysis.nextSteps.length === 0 ? (
              <div role="status" style={{ textAlign: 'center', padding: '1.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Nothing to close for this posting — every extracted requirement is already covered in your profile.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {analysis.nextSteps.map(step => (
                  <div
                    key={step.skillId}
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      padding: '0.9rem 1rem',
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: `4px solid ${step.priority === 'Critical' ? 'var(--danger)' : step.priority === 'High' ? 'var(--warning)' : 'var(--info)'}`
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '260px' }}>
                      <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                        <strong style={{ fontSize: '0.98rem' }}>{step.name}</strong>
                        <span className={`badge badge-${step.priority.toLowerCase()}`}>{step.priority}</span>
                        <span className="badge badge-pill" style={{ background: 'var(--color-paper-light)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                          {step.state === 'partial' ? 'Below catalog level' : 'Not in profile'}
                        </span>
                        {step.estimatedHours !== undefined && (
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={12} /> ~{step.estimatedHours}h
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.87rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step.action}</div>
                      {step.resource && (
                        <a
                          href={step.resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.4rem', fontSize: '0.82rem', color: 'var(--color-accent)', fontWeight: 600 }}
                        >
                          <ExternalLink size={13} />
                          {step.resource.title}
                          {step.resource.free && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(free)</span>}
                        </a>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Link to="/roadmap" className="btn btn-secondary btn-sm">
                        Open roadmap <ArrowRight size={13} />
                      </Link>
                      <Link to="/analysis" className="btn btn-ghost btn-sm">
                        Skill gap detail
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* POSTING DETAIL */}
          {(analysis.extraction.qualifications.length > 0 || analysis.extraction.responsibilities.length > 0) && (
            <div className="card" style={{ background: 'var(--color-paper)', border: '1px solid var(--border-subtle)' }}>
              <div className="card-header">
                <span className="card-title" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--text-primary)' }}>
                  <FileText size={18} color="var(--color-accent)" />
                  What the posting actually says
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {analysis.extraction.responsibilities.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                      Responsibilities
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.3rem', lineHeight: 1.45 }}>
                      {analysis.extraction.responsibilities.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  </div>
                )}
                {analysis.extraction.qualifications.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                      Stated qualifications
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.3rem', lineHeight: 1.45 }}>
                      {analysis.extraction.qualifications.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* METHODOLOGY */}
          <details style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.9rem 1.1rem' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Info size={15} color="var(--color-accent)" />
              How this score was calculated
            </summary>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0.7rem 0 0' }}>
              {summary.methodology}
            </p>
          </details>
        </div>
      )}
    </div>
  );
};

const MatchGroup: React.FC<{
  title: string;
  icon: React.ReactNode;
  items: JobDescriptionMatch[];
  emptyText: string;
}> = ({ title, icon, items, emptyText }) => (
  <div className="card" style={{ background: 'var(--color-paper)', border: '1px solid var(--border-subtle)' }}>
    <div className="card-header">
      <span className="card-title" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
        {icon}
        {title} <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 400 }}>({items.length})</span>
      </span>
    </div>

    {items.length === 0 ? (
      <div role="status" style={{ padding: '1.25rem', fontSize: '0.86rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        {emptyText}
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {items.map(item => (
          <MatchRow key={item.skillId} match={item} />
        ))}
      </div>
    )}
  </div>
);

const MatchRow: React.FC<{ match: JobDescriptionMatch }> = ({ match }) => {
  const meta = STATE_META[match.state];
  const Icon = meta.Icon;

  return (
    <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', borderLeft: `3px solid ${meta.color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ minWidth: '180px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '0.95rem' }}>{match.name}</strong>
            <span className="badge badge-pill" style={{ background: 'var(--color-paper-light)', color: 'var(--text-muted)', fontSize: '0.68rem' }}>
              {KIND_LABEL[match.kind]}
            </span>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: meta.color, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Icon size={13} /> {meta.label}
            </span>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {match.category} &middot; weight {Math.round(match.weight * 100)}%
            {match.profileProficiency !== undefined && <> &middot; you: {match.profileProficiency}/5</>}
            {match.roleRequiredLevel !== undefined && <> &middot; catalog: {match.roleRequiredLevel}/5</>}
            {match.inferred && <> &middot; inferred from context</>}
          </div>
        </div>
      </div>

      {match.evidence && (
        <blockquote style={{ margin: '0.5rem 0 0', padding: '0.4rem 0.7rem', borderLeft: '2px solid var(--border-medium)', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'rgba(213, 201, 185, 0.2)', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}>
          “{match.evidence}”
        </blockquote>
      )}

      <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.45rem', lineHeight: 1.45 }}>
        {match.reason}
      </div>
    </div>
  );
};

export default JdAnalyzerPage;
