import React, { useState } from 'react';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import type { OpportunityMatchResult } from '../types/index.js';
import {
  Briefcase,
  Search,
  CheckCircle2,
  XCircle,
  Award,
  Layers,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Info,
  ChevronRight,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const OpportunityMatchPage: React.FC = () => {
  const toast = useToast();
  const [jobDescription, setJobDescription] = useState<string>('');
  const [matchResult, setMatchResult] = useState<OpportunityMatchResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [proposing, setProposing] = useState<boolean>(false);
  const [proposalMessage, setProposalMessage] = useState<string | null>(null);

  const sampleJobText = `Senior Full-Stack Engineer
We are seeking an experienced Full Stack Engineer with strong expertise in TypeScript, React, and Node.js.
Requirements:
- 3+ years experience with modern JavaScript / TypeScript.
- Strong knowledge of REST API development, PostgreSQL, and database design.
- Hands-on experience with automated testing (Vitest / Jest) and CI/CD pipelines.
- Experience with Docker, Redis, and cloud infrastructure is preferred.
- Familiarity with AI model integration and distributed architectures is a plus.`;

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDescription.trim()) {
      toast.info('Please enter or paste a job description.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.opportunityMatch.evaluate({ description: jobDescription });
      setMatchResult(res.match);
      toast.success('Opportunity alignment evaluated successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to evaluate opportunity match');
    } finally {
      setLoading(false);
    }
  };

  const loadSample = () => {
    setJobDescription(sampleJobText);
    toast.info('Sample job description inserted.');
  };

  const proposeToAutopilot = async () => {
    if (!jobDescription.trim()) {
      toast.error('Paste the job description again to turn this match into actions.');
      return;
    }
    try {
      setProposing(true);
      const res = await api.autopilot.opportunityPlan({ description: jobDescription });
      setProposalMessage(res.message);
      toast.success(res.message);
    } catch (err: any) {
      toast.error(err.message || 'Failed to turn this opportunity into actions.');
    } finally {
      setProposing(false);
    }
  };

  return (
    <div className="os-page-container">
      {/* Header */}
      <header className="os-header">
        <div className="os-header-left">
          <div className="os-header-icon">
            <Briefcase size={24} />
          </div>
          <div>
            <h1 className="os-header-title">Opportunity Match Engine</h1>
            <p className="os-header-subtitle">
              Deterministic alignment evaluation against real job requirements backed by verified evidence.
            </p>
          </div>
        </div>

        <div className="os-header-actions">
          <Link to="/skill-radar" className="btn btn-secondary btn-sm">
            <Search size={14} />
            <span>Skill Radar</span>
          </Link>
          <Link to="/proof-of-skill" className="btn btn-secondary btn-sm">
            <Award size={14} />
            <span>Proof of Skill</span>
          </Link>
        </div>
      </header>

      {/* Input Form Card */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <FileText size={18} color="var(--color-accent)" />
            Target Job Specification
          </h2>
          <button
            type="button"
            onClick={loadSample}
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--color-accent)' }}
          >
            Insert Sample Job Posting
          </button>
        </div>

        <form onSubmit={handleEvaluate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="job-description-input">
              Job Description & Stated Qualifications
            </label>
            <textarea
              id="job-description-input"
              rows={6}
              placeholder="Paste job posting text here (including required qualifications, preferred skills, and tech stack)..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="form-textarea"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.88rem',
                minHeight: '140px',
                lineHeight: 1.5
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Evaluates against your verified assessments, forged projects, and active profile evidence.
            </span>
            <button
              type="submit"
              disabled={loading || !jobDescription.trim()}
              className="btn btn-primary"
            >
              {loading ? (
                <>
                  <div className="spin" style={{ width: 16, height: 16, border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  <span>Evaluating Alignment...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Run Opportunity Match</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Match Results */}
      {matchResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Top Score Banner */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className="badge badge-accent" style={{ marginBottom: '0.5rem' }}>
                  Target Alignment: {matchResult.targetRoleAlignment}
                </span>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: '0.35rem 0 0.2rem', color: 'var(--text-primary)' }}>
                  {matchResult.jobTitle}
                </h2>
                {matchResult.company && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                    {matchResult.company} {matchResult.location ? `• ${matchResult.location}` : ''}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-accent)', lineHeight: 1 }}>
                    {matchResult.overallSkillAlignmentPercentage}%
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Evidence Match Score
                  </div>
                </div>

                <div
                  className={`badge ${
                    matchResult.statedRequirementsEligibility === 'Fully Eligible'
                      ? 'badge-mastered'
                      : matchResult.statedRequirementsEligibility === 'Moderately Eligible'
                      ? 'badge-high'
                      : 'badge-critical'
                  }`}
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                >
                  {matchResult.statedRequirementsEligibility}
                </div>
              </div>
            </div>

            {/* Scientific Disclaiming Notice */}
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                fontSize: '0.82rem',
                color: 'var(--text-secondary)'
              }}
            >
              <Info size={16} color="var(--color-accent)" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{matchResult.hiringProbabilityNotice}</span>
            </div>

            {/* Opportunity → Career Autopilot actions */}
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Turn the missing required skills into approval-gated preparation actions in your
                Career Autopilot. Nothing runs without your approval, and completion is detected
                only from real evidence.
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={proposing}
                  onClick={() => void proposeToAutopilot()}
                >
                  {proposing ? 'Adding actions…' : 'Add to Career Autopilot'}
                </button>
                <Link to="/autopilot" className="btn btn-ghost btn-sm">
                  Open Autopilot <ArrowRight size={14} />
                </Link>
              </div>
              {proposalMessage && (
                <div style={{ fontSize: '0.78rem', color: 'var(--success)', width: '100%' }}>{proposalMessage}</div>
              )}
            </div>
          </div>

          {/* 4-Quadrant Skills Breakdown: Required vs Preferred */}
          <div className="os-grid-2">
            {/* Required Skills Matched */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title" style={{ fontSize: '1.05rem', color: 'var(--success)' }}>
                  <CheckCircle2 size={18} color="var(--success)" />
                  Required Skills Matched ({matchResult.requiredSkillsMatched.length})
                </h3>
              </div>

              {matchResult.requiredSkillsMatched.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>
                  No required skills directly match existing verified records.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {matchResult.requiredSkillsMatched.map((item) => (
                    <div
                      key={item.skillId}
                      style={{
                        padding: '0.75rem 0.9rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Your Proficiency: Level {item.userProficiency}/5 (Required: Level {item.requiredProficiency}/5)
                        </div>
                      </div>
                      <span className="badge badge-mastered" style={{ textTransform: 'capitalize' }}>
                        {item.evidenceStatus.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Required Skills Missing */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title" style={{ fontSize: '1.05rem', color: 'var(--danger)' }}>
                  <XCircle size={18} color="var(--danger)" />
                  Required Skills Missing ({matchResult.requiredSkillsMissing.length})
                </h3>
              </div>

              {matchResult.requiredSkillsMissing.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--success)', margin: 0 }}>
                  All stated required skills are covered by your verified records!
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {matchResult.requiredSkillsMissing.map((item) => (
                    <div
                      key={item.skillId}
                      style={{
                        padding: '0.75rem 0.9rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(153, 27, 27, 0.05)',
                        border: '1px solid rgba(153, 27, 27, 0.2)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {item.gapExplanation}
                        </div>
                      </div>
                      <Link
                        to="/proof-of-skill"
                        className="btn btn-outline btn-sm"
                        style={{ flexShrink: 0 }}
                      >
                        <span>Verify</span>
                        <ChevronRight size={13} />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preferred Skills Matched */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title" style={{ fontSize: '1.05rem', color: 'var(--color-accent)' }}>
                  <Award size={18} color="var(--color-accent)" />
                  Preferred Qualifications Matched ({matchResult.preferredSkillsMatched.length})
                </h3>
              </div>

              {matchResult.preferredSkillsMatched.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>
                  None of the optional preferred skills currently have matching evidence.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {matchResult.preferredSkillsMatched.map((item) => (
                    <div
                      key={item.skillId}
                      style={{
                        padding: '0.75rem 0.9rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        {item.name}
                      </span>
                      <span className="os-chip os-chip-accent">
                        Level {item.userProficiency}/5
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preferred Skills Missing */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title" style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
                  <Layers size={18} color="var(--color-accent)" />
                  Preferred Qualifications Missing ({matchResult.preferredSkillsMissing.length})
                </h3>
              </div>

              {matchResult.preferredSkillsMissing.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                  No missing preferred qualifications identified.
                </p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {matchResult.preferredSkillsMissing.map((item) => (
                    <span
                      key={item.skillId}
                      className="os-chip"
                    >
                      {item.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actionable Recommendations */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Sparkles size={18} color="var(--color-accent)" />
                Recommended Gap-Closing Actions
              </h3>
            </div>

            <div className="os-grid-2">
              {matchResult.recommendedActions.map((act, i) => (
                <Link
                  key={i}
                  to={act.route}
                  style={{
                    padding: '1.15rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    textDecoration: 'none',
                    transition: 'all var(--transition-fast)'
                  }}
                  className="card-hover"
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                      {act.title}
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.45, margin: 0 }}>
                      {act.detail}
                    </p>
                  </div>
                  <ArrowRight size={16} color="var(--color-accent)" style={{ flexShrink: 0, marginTop: 3 }} />
                </Link>
              ))}
            </div>
          </div>

          {/* Transparent Reasoning & Provenance Trace */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <ShieldCheck size={18} color="var(--color-accent)" />
                Transparent Reasoning & Provenance Trace
              </h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '1.25rem' }}>
              Every evaluation metric is traceable deterministically to explicit criteria and verified user records:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {matchResult.explainabilityTrace.map((trace, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontSize: '0.85rem'
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', minWidth: 160 }}>
                    {trace.dimension}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', flex: 1, minWidth: 200, fontSize: '0.82rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Source:</span> {trace.sourceEvidence}
                  </div>
                  <div style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.82rem' }}>
                    {trace.impactOnAssessment}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
