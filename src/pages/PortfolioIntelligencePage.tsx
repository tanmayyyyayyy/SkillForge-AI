import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import type {
  PortfolioIntelligenceData,
  PortfolioRepoAnalysis,
  PortfolioResumeBullet
} from '../types/index.js';
import {
  FolderGit2,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  Award,
  Copy,
  ExternalLink,
  Sparkles,
  FileText,
  ShieldCheck,
  Code2,
  RefreshCw,
  Search,
  Eye,
  Lock,
  Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const PortfolioIntelligencePage: React.FC = () => {
  const [portfolio, setPortfolio] = useState<PortfolioIntelligenceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Repo Analysis State
  const [repoUrlInput, setRepoUrlInput] = useState<string>('');
  const [analyzingRepo, setAnalyzingRepo] = useState<boolean>(false);
  const [repoAnalysis, setRepoAnalysis] = useState<PortfolioRepoAnalysis | null>(null);
  const [repoAnalysisError, setRepoAnalysisError] = useState<string | null>(null);

  // Resume Bullet Generator Modal / Panel
  const [bulletProjectTitle, setBulletProjectTitle] = useState<string>('');
  const [bulletTechnologies, setBulletTechnologies] = useState<string>('');
  const [generatingBullets, setGeneratingBullets] = useState<boolean>(false);
  const [generatedBullets, setGeneratedBullets] = useState<PortfolioResumeBullet[]>([]);
  const [copiedMarkdown, setCopiedMarkdown] = useState<boolean>(false);

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.portfolioIntelligence.get();
      setPortfolio(res.portfolio);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio intelligence');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrlInput.trim()) return;

    try {
      setAnalyzingRepo(true);
      setRepoAnalysisError(null);
      const res = await api.portfolioIntelligence.analyzeRepo(repoUrlInput);
      setRepoAnalysis(res.analysis);
    } catch (err: unknown) {
      setRepoAnalysisError(err instanceof Error ? err.message : 'Failed to analyze repository');
    } finally {
      setAnalyzingRepo(false);
    }
  };

  const handleGenerateBullets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulletProjectTitle.trim()) return;

    try {
      setGeneratingBullets(true);
      const techs = bulletTechnologies.split(',').map(s => s.trim()).filter(Boolean);
      const res = await api.portfolioIntelligence.generateBullets({
        title: bulletProjectTitle,
        technologies: techs
      });
      setGeneratedBullets(res.bullets);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate evidence bullets');
    } finally {
      setGeneratingBullets(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!portfolio?.exportableMarkdown) return;
    navigator.clipboard.writeText(portfolio.exportableMarkdown);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                Portfolio Intelligence
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Transform verified projects, code repos, and assessments into verifiable career assets.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyMarkdown}
            disabled={!portfolio?.exportableMarkdown}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)] transition-colors text-[var(--text-primary)]"
          >
            <Copy className="w-4 h-4 text-emerald-400" />
            <span>{copiedMarkdown ? 'Copied Markdown!' : 'Export Portfolio Markdown'}</span>
          </button>
          <Link
            to="/project-forge"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold transition-colors"
          >
            <Code2 className="w-4 h-4" />
            <span>Forge Project</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-300 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[var(--text-secondary)]">Synthesizing portfolio intelligence...</span>
        </div>
      ) : portfolio ? (
        <div className="space-y-8">
          {/* Top Metric & Control Bar */}
          <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Target Profile
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-page)] border border-[var(--border-subtle)] text-[var(--text-secondary)] flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Visibility: {portfolio.visibility}
                </span>
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                {portfolio.studentName || 'Student Profile'} — {portfolio.targetRole}
              </h2>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-3xl font-extrabold text-emerald-400">
                  {portfolio.overallPortfolioReadiness}%
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Portfolio Readiness
                </div>
              </div>

              <div className="h-10 w-px bg-[var(--border-subtle)] hidden sm:block" />

              <div className="flex flex-col text-xs text-[var(--text-secondary)] gap-1">
                <span><strong>{portfolio.projects.length}</strong> Showcase Projects</span>
                <span><strong>{portfolio.verifiedSkillBadges.length}</strong> Verified Skill Badges</span>
              </div>
            </div>
          </div>

          {/* Repository Inspector & Verifier */}
          <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <GitBranch className="w-4 h-4 text-emerald-400" />
                <span>Public Repository Inspector & Structure Audit</span>
              </div>
              <span className="text-xs text-[var(--text-secondary)]">
                Safe public metadata inspection (no token storage)
              </span>
            </div>

            <form onSubmit={handleAnalyzeRepo} className="flex flex-col sm:flex-row gap-3">
              <input
                type="url"
                placeholder="https://github.com/owner/repository"
                value={repoUrlInput}
                onChange={(e) => setRepoUrlInput(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 placeholder-[var(--text-muted)] font-mono"
              />
              <button
                type="submit"
                disabled={analyzingRepo || !repoUrlInput.trim()}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {analyzingRepo ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Auditing...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Audit Repository</span>
                  </>
                )}
              </button>
            </form>

            {repoAnalysisError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                {repoAnalysisError}
              </div>
            )}

            {repoAnalysis && (
              <div className="mt-4 p-5 rounded-xl bg-[var(--bg-page)] border border-[var(--border-subtle)] space-y-4 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <span>{repoAnalysis.repoName}</span>
                      <a
                        href={repoAnalysis.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline text-xs flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </h4>
                    <span className="text-xs text-[var(--text-secondary)]">Owner: {repoAnalysis.owner}</span>
                  </div>

                  {/* Audit Indicators */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      repoAnalysis.hasReadme ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}>
                      README: {repoAnalysis.hasReadme ? 'Yes' : 'Missing'}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      repoAnalysis.hasTests ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}>
                      Automated Tests: {repoAnalysis.hasTests ? 'Detected' : 'Not Observed'}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      repoAnalysis.hasLicense ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}>
                      License: {repoAnalysis.hasLicense ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>

                {/* Detected Tech */}
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-[var(--text-primary)]">
                    Detected Technologies & Frameworks
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {repoAnalysis.detectedTechnologies.map((t, idx) => (
                      <span key={idx} className="text-[11px] px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Observable Architecture & Identified Gaps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1">
                    <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified Architecture Evidence</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-[var(--text-secondary)] text-[11px]">
                      {repoAnalysis.architectureEvidence.map((ae, i) => (
                        <li key={i}>{ae}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-1">
                    <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Identified Gaps to Strengthen</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-[var(--text-secondary)] text-[11px]">
                      {repoAnalysis.identifiedEvidenceGaps.map((gap, i) => (
                        <li key={i}>{gap}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Verified Skill Badges Bar */}
          {portfolio.verifiedSkillBadges.length > 0 && (
            <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>Verified Assessment & Milestone Credentials</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {portfolio.verifiedSkillBadges.map((badge) => (
                  <div
                    key={badge.skillId}
                    className="p-3 rounded-xl bg-[var(--bg-page)] border border-emerald-500/20 space-y-1"
                  >
                    <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                      {badge.skillName}
                    </div>
                    <div className="text-[10px] text-emerald-400 font-medium">
                      {badge.score ? `Score: ${badge.score}%` : 'Verified Milestone'}
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)] truncate">
                      Via: {badge.verificationMethod}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Showcase Projects Cards */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span>Evidence-Backed Project Showcase</span>
            </h3>

            {portfolio.projects.length === 0 ? (
              <div className="p-12 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-center space-y-3">
                <p className="text-xs text-[var(--text-secondary)]">
                  No projects in your showcase yet. Use Project Forge to architect and record your engineering work.
                </p>
                <Link
                  to="/project-forge"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-slate-950 font-semibold rounded-lg text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Forge Your First Project</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {portfolio.projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-base font-bold text-[var(--text-primary)]">
                          {proj.title}
                        </h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          proj.evidenceStatus === 'verified_complete'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                        }`}>
                          {proj.evidenceStatus.replace('_', ' ')}
                        </span>
                      </div>

                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {proj.description}
                      </p>

                      {/* Tech Stack Pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {proj.technologies.map((t, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-page)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      {/* Problem & Solution */}
                      {proj.problemAndSolution?.problem && (
                        <div className="p-3 rounded-xl bg-[var(--bg-page)] border border-[var(--border-subtle)] text-[11px] space-y-1">
                          <div>
                            <strong className="text-[var(--text-primary)]">Challenge:</strong> {proj.problemAndSolution.problem}
                          </div>
                          <div>
                            <strong className="text-emerald-400">Solution:</strong> {proj.problemAndSolution.solution}
                          </div>
                        </div>
                      )}

                      {/* Verified Features */}
                      {proj.verifiedFeatures.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                            Verified Deliverables:
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 text-[var(--text-secondary)] text-[11px]">
                            {proj.verifiedFeatures.map((f, i) => (
                              <li key={i}>{f}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Links & Resume Bullets */}
                    <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        {proj.repoUrl ? (
                          <a
                            href={proj.repoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-400 hover:underline flex items-center gap-1"
                          >
                            <GitBranch className="w-3.5 h-3.5" />
                            <span>Repository</span>
                          </a>
                        ) : (
                          <span className="text-[var(--text-secondary)] text-[11px]">No repository linked</span>
                        )}

                        {proj.assessmentBacking && proj.assessmentBacking.length > 0 && (
                          <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {proj.assessmentBacking.length} skills backed
                          </span>
                        )}
                      </div>

                      {/* Evidence-backed resume bullet preview */}
                      {proj.suggestedBullets.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-[var(--bg-page)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] font-mono">
                          "{proj.suggestedBullets[0].bulletText}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Evidence-Backed Bullet Generator */}
          <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Evidence-Backed Resume Bullet Generator</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Generates high-impact resume bullet points strictly grounded in verified deliverables (no fabricated metrics or metrics without supporting evidence).
            </p>

            <form onSubmit={handleGenerateBullets} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Project Title"
                value={bulletProjectTitle}
                onChange={(e) => setBulletProjectTitle(e.target.value)}
                className="px-3 py-2 bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
              />
              <input
                type="text"
                placeholder="Technologies (comma-separated)"
                value={bulletTechnologies}
                onChange={(e) => setBulletTechnologies(e.target.value)}
                className="px-3 py-2 bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={generatingBullets || !bulletProjectTitle.trim()}
                className="py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {generatingBullets ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Bullets</span>
                  </>
                )}
              </button>
            </form>

            {generatedBullets.length > 0 && (
              <div className="space-y-2 pt-2">
                {generatedBullets.map((b, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-[var(--bg-page)] border border-[var(--border-subtle)] space-y-1.5"
                  >
                    <div className="text-xs font-mono text-[var(--text-primary)]">
                      • {b.bulletText}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-[var(--text-secondary)]">
                      <span className="text-emerald-400 font-semibold">Supported facts:</span>
                      {b.supportedFacts.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
