import React, { useState } from 'react';
import { api } from '../services/api.js';
import type { OpportunityMatchResult } from '../types/index.js';
import {
  Briefcase,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Layers,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Info,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const OpportunityMatchPage: React.FC = () => {
  const [jobDescription, setJobDescription] = useState<string>('');
  const [matchResult, setMatchResult] = useState<OpportunityMatchResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!jobDescription.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const res = await api.opportunityMatch.evaluate({ description: jobDescription });
      setMatchResult(res.match);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate opportunity match');
    } finally {
      setLoading(false);
    }
  };

  const loadSample = () => {
    setJobDescription(sampleJobText);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                Opportunity Match Engine
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Deterministic alignment evaluation against real job requirements backed by verified evidence.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/skill-radar"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)] transition-colors text-[var(--text-secondary)]"
          >
            <Search className="w-4 h-4 text-cyan-400" />
            Skill Radar
          </Link>
          <Link
            to="/proof-of-skill"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)] transition-colors text-[var(--text-secondary)]"
          >
            <Award className="w-4 h-4 text-emerald-400" />
            Proof of Skill
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-300 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Input Section */}
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Search className="w-4 h-4 text-cyan-400" />
            <span>Target Job Description</span>
          </div>
          <button
            type="button"
            onClick={loadSample}
            className="text-xs text-cyan-400 hover:underline"
          >
            Insert Sample Job Posting
          </button>
        </div>

        <form onSubmit={handleEvaluate} className="space-y-4">
          <textarea
            rows={5}
            placeholder="Paste job posting text here (including required qualifications, preferred skills, and tech stack)..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="w-full px-4 py-3 bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-cyan-500 placeholder-[var(--text-muted)] font-mono leading-relaxed"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-[var(--text-secondary)]">
              Evaluates against your verified assessments, forged projects, and active profile evidence.
            </span>
            <button
              type="submit"
              disabled={loading || !jobDescription.trim()}
              className="py-2.5 px-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-slate-950 font-semibold rounded-lg text-sm flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Evaluating Alignment...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run Opportunity Match</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Match Results Display */}
      {matchResult && (
        <div className="space-y-6">
          {/* Top Score & Notice Banner */}
          <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-cyan-400 font-semibold">
                  Target Alignment: {matchResult.targetRoleAlignment}
                </span>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mt-1">
                  {matchResult.jobTitle}
                </h2>
                {matchResult.company && (
                  <p className="text-xs text-[var(--text-secondary)]">{matchResult.company}</p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-3xl font-extrabold text-[var(--text-primary)]">
                    {matchResult.overallSkillAlignmentPercentage}%
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    Evidence Match Score
                  </div>
                </div>

                <div className={`px-4 py-2 rounded-xl border text-xs font-bold ${
                  matchResult.statedRequirementsEligibility === 'Fully Eligible'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : matchResult.statedRequirementsEligibility === 'Moderately Eligible'
                    ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                }`}>
                  {matchResult.statedRequirementsEligibility}
                </div>
              </div>
            </div>

            {/* Scientific Disclaiming Notice */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-400">
              <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <span>{matchResult.hiringProbabilityNotice}</span>
            </div>
          </div>

          {/* 4-Quadrant Skills Breakdown: Required vs Preferred */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Required Skills Matched */}
            <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Required Skills Matched</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                  {matchResult.requiredSkillsMatched.length}
                </span>
              </div>

              {matchResult.requiredSkillsMatched.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] italic">
                  No required skills directly match existing verified records.
                </p>
              ) : (
                <div className="space-y-2">
                  {matchResult.requiredSkillsMatched.map((item) => (
                    <div
                      key={item.skillId}
                      className="p-3 rounded-xl bg-[var(--bg-page)] border border-[var(--border-subtle)] flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)]">
                          Proficiency: {item.userProficiency} (Required: {item.requiredProficiency})
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-medium capitalize">
                        {item.evidenceStatus.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Required Skills Missing */}
            <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>Required Skills Missing</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400">
                  {matchResult.requiredSkillsMissing.length}
                </span>
              </div>

              {matchResult.requiredSkillsMissing.length === 0 ? (
                <p className="text-xs text-emerald-400">
                  All stated required skills are covered by your existing profile!
                </p>
              ) : (
                <div className="space-y-2">
                  {matchResult.requiredSkillsMissing.map((item) => (
                    <div
                      key={item.skillId}
                      className="p-3 rounded-xl bg-[var(--bg-page)] border border-rose-500/20 flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)]">
                          {item.gapExplanation}
                        </div>
                      </div>
                      <Link
                        to="/proof-of-skill"
                        className="text-[10px] px-2.5 py-1 rounded bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 transition-colors font-medium flex items-center gap-1 flex-shrink-0"
                      >
                        <span>Verify</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preferred Skills Matched */}
            <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <Award className="w-4 h-4 text-cyan-400" />
                  <span>Preferred Qualifications Matched</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
                  {matchResult.preferredSkillsMatched.length}
                </span>
              </div>

              {matchResult.preferredSkillsMatched.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)] italic">
                  None of the optional/preferred skills currently have matching evidence.
                </p>
              ) : (
                <div className="space-y-2">
                  {matchResult.preferredSkillsMatched.map((item) => (
                    <div
                      key={item.skillId}
                      className="p-3 rounded-xl bg-[var(--bg-page)] border border-[var(--border-subtle)] flex items-center justify-between gap-2"
                    >
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        {item.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                        {item.userProficiency}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preferred Skills Missing */}
            <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Preferred Qualifications Missing</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                  {matchResult.preferredSkillsMissing.length}
                </span>
              </div>

              {matchResult.preferredSkillsMissing.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)]">
                  No missing preferred qualifications identified.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {matchResult.preferredSkillsMissing.map((item) => (
                    <span
                      key={item.skillId}
                      className="text-xs px-2.5 py-1 rounded-lg bg-[var(--bg-page)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                    >
                      {item.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actionable Recommendations */}
          <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Recommended Gap-Closing Actions</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchResult.recommendedActions.map((act, i) => (
                <Link
                  key={i}
                  to={act.route}
                  className="p-4 rounded-xl bg-[var(--bg-page)] border border-[var(--border-subtle)] hover:border-cyan-500/40 transition-all flex items-start justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-cyan-400 transition-colors">
                      {act.title}
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      {act.detail}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-cyan-400 flex-shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </div>

          {/* Traceable Explainability Audit Trail */}
          <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
              <span>Transparent Reasoning & Source Trace</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Every score element is derived deterministically from explicit criteria and verified user records:
            </p>

            <div className="space-y-2">
              {matchResult.explainabilityTrace.map((trace, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[var(--bg-page)] border border-[var(--border-subtle)] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="font-semibold text-[var(--text-primary)] min-w-[150px]">
                    {trace.dimension}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] flex-1">
                    <span className="text-[var(--text-primary)] font-medium">Source:</span> {trace.sourceEvidence}
                  </div>
                  <div className="text-[11px] text-cyan-400">
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
