import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext.js';
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
  FileText,
  ShieldCheck,
  Code2,
  Search,
  Lock,
  Check
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const PortfolioIntelligencePage: React.FC = () => {
  const toast = useToast();
  const [portfolio, setPortfolio] = useState<PortfolioIntelligenceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Repo Analysis State
  const [repoUrlInput, setRepoUrlInput] = useState<string>('');
  const [analyzingRepo, setAnalyzingRepo] = useState<boolean>(false);
  const [repoAnalysis, setRepoAnalysis] = useState<PortfolioRepoAnalysis | null>(null);

  // Resume Bullet Generator State
  const [bulletProjectTitle, setBulletProjectTitle] = useState<string>('');
  const [bulletTechnologies, setBulletTechnologies] = useState<string>('');
  const [generatingBullets, setGeneratingBullets] = useState<boolean>(false);
  const [generatedBullets, setGeneratedBullets] = useState<PortfolioResumeBullet[]>([]);
  const [copiedMarkdown, setCopiedMarkdown] = useState<boolean>(false);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.portfolioIntelligence.get();
      setPortfolio(res.portfolio);
    } catch (err: any) {
      setError(err.message || 'Failed to load portfolio intelligence');
      toast.error('Failed to load portfolio intelligence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const handleAnalyzeRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrlInput.trim()) {
      toast.info('Please enter a valid Git repository URL.');
      return;
    }

    try {
      setAnalyzingRepo(true);
      const res = await api.portfolioIntelligence.analyzeRepo(repoUrlInput);
      setRepoAnalysis(res.analysis);
      toast.success('Repository metadata audited successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to analyze repository');
    } finally {
      setAnalyzingRepo(false);
    }
  };

  const handleGenerateBullets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulletProjectTitle.trim()) {
      toast.info('Please enter a project title.');
      return;
    }

    try {
      setGeneratingBullets(true);
      const techs = bulletTechnologies.split(',').map(s => s.trim()).filter(Boolean);
      const res = await api.portfolioIntelligence.generateBullets({
        title: bulletProjectTitle,
        technologies: techs
      });
      setGeneratedBullets(res.bullets);
      toast.success('Generated evidence-backed resume bullets.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate evidence bullets');
    } finally {
      setGeneratingBullets(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!portfolio?.exportableMarkdown) return;
    navigator.clipboard.writeText(portfolio.exportableMarkdown);
    setCopiedMarkdown(true);
    toast.success('Portfolio markdown copied to clipboard!');
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div role="status" aria-live="polite" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spin" aria-hidden="true" style={{ width: 40, height: 40, border: '3px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', margin: '0 auto 1.25rem' }} />
          <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', fontSize: '1.4rem' }}>Synthesizing Portfolio Intelligence...</h2>
        </div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="card" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: 600, margin: '3rem auto' }}>
        <AlertTriangle size={44} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', fontSize: '1.4rem', marginBottom: '0.5rem' }}>
          Unable to Load Portfolio
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
          {error || 'Unable to assemble portfolio records.'}
        </p>
        <button onClick={fetchPortfolio} className="btn btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="os-page-container">
      {/* Header */}
      <header className="os-header">
        <div className="os-header-left">
          <div className="os-header-icon">
            <FolderGit2 size={24} />
          </div>
          <div>
            <h1 className="os-header-title">Portfolio Intelligence</h1>
            <p className="os-header-subtitle">
              Transform verified projects, code repositories, and assessments into verifiable career assets.
            </p>
          </div>
        </div>

        <div className="os-header-actions">
          <button
            onClick={handleCopyMarkdown}
            disabled={!portfolio.exportableMarkdown}
            className="btn btn-secondary btn-sm"
          >
            {copiedMarkdown ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
            <span>{copiedMarkdown ? 'Copied Markdown!' : 'Export Portfolio Markdown'}</span>
          </button>
          <Link to="/project-forge" className="btn btn-primary btn-sm">
            <Code2 size={14} />
            <span>Forge Project</span>
          </Link>
        </div>
      </header>

      {/* Top Profile Summary Bar */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-accent">
              Target Track
            </span>
            <span className="os-chip" style={{ fontSize: '0.74rem' }}>
              <Lock size={12} /> Visibility: {portfolio.visibility}
            </span>
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--text-primary)' }}>
            {portfolio.studentName || 'Student Profile'} — {portfolio.targetRole}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--success)', lineHeight: 1 }}>
              {portfolio.overallPortfolioReadiness}%
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Portfolio Readiness
            </div>
          </div>

          <div style={{ height: 40, width: 1, background: 'var(--border-subtle)' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            <span><strong>{portfolio.projects.length}</strong> Showcase Projects</span>
            <span><strong>{portfolio.verifiedSkillBadges.length}</strong> Verified Credentials</span>
          </div>
        </div>
      </div>

      {/* Public Repository Inspector & Structure Audit */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <GitBranch size={18} color="var(--color-accent)" />
            Public Repository Inspector & Structure Audit
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Safe public metadata inspection (no token storage)
          </span>
        </div>

        <form onSubmit={handleAnalyzeRepo} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: repoAnalysis ? '1.25rem' : 0 }}>
          <input
            type="url"
            placeholder="https://github.com/owner/repository"
            value={repoUrlInput}
            onChange={(e) => setRepoUrlInput(e.target.value)}
            className="form-input"
            style={{ flex: '1 1 300px', fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}
          />
          <button
            type="submit"
            disabled={analyzingRepo || !repoUrlInput.trim()}
            className="btn btn-primary"
            style={{ flexShrink: 0 }}
          >
            {analyzingRepo ? (
              <>
                <div className="spin" style={{ width: 16, height: 16, border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%' }} />
                <span>Auditing...</span>
              </>
            ) : (
              <>
                <Search size={15} />
                <span>Audit Repository</span>
              </>
            )}
          </button>
        </form>

        {repoAnalysis && (
          <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>{repoAnalysis.repoName}</span>
                  <a href={repoAnalysis.repoUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center' }}>
                    <ExternalLink size={14} />
                  </a>
                </h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Owner: {repoAnalysis.owner}</span>
              </div>

              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                <span className={`badge ${repoAnalysis.hasReadme ? 'badge-mastered' : 'badge-medium'}`}>
                  README: {repoAnalysis.hasReadme ? 'Detected' : 'Missing'}
                </span>
                <span className={`badge ${repoAnalysis.hasTests ? 'badge-mastered' : 'badge-medium'}`}>
                  Tests: {repoAnalysis.hasTests ? 'Detected' : 'Not Observed'}
                </span>
                <span className={`badge ${repoAnalysis.hasLicense ? 'badge-mastered' : 'badge-medium'}`}>
                  License: {repoAnalysis.hasLicense ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            {/* Detected Technologies */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Detected Technologies & Frameworks
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {repoAnalysis.detectedTechnologies.map((t, idx) => (
                  <span key={idx} className="os-chip">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Architecture Evidence & Gaps */}
            <div className="os-grid-2">
              <div style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--success)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={15} />
                  <span>Verified Architecture Evidence</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.15rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {repoAnalysis.architectureEvidence.map((ae, i) => (
                    <li key={i}>{ae}</li>
                  ))}
                </ul>
              </div>

              <div style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--warning)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertTriangle size={15} />
                  <span>Identified Gaps to Strengthen</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.15rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {repoAnalysis.identifiedEvidenceGaps.map((gap, i) => (
                    <li key={i}>{gap}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Verified Skill Credentials Bar */}
      {portfolio.verifiedSkillBadges.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Award size={18} color="var(--success)" />
              Verified Assessment & Milestone Credentials
            </h3>
          </div>
          <div className="os-grid-4">
            {portfolio.verifiedSkillBadges.map((badge) => (
              <div
                key={badge.skillId}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {badge.skillName}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600 }}>
                  {badge.score ? `Score: ${badge.score}%` : 'Verified Milestone'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Via: {badge.verificationMethod}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence-Backed Project Showcase */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Code2 size={20} color="var(--color-accent)" />
            Evidence-Backed Project Showcase
          </h2>
          <span className="badge badge-accent">
            {portfolio.projects.length} Showcase Project{portfolio.projects.length === 1 ? '' : 's'}
          </span>
        </div>

        {portfolio.projects.length === 0 ? (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              No projects in your showcase yet. Use Project Forge to architect and record your engineering work.
            </p>
            <Link to="/project-forge" className="btn btn-primary btn-sm">
              Forge Your First Project
            </Link>
          </div>
        ) : (
          <div className="os-grid-2">
            {portfolio.projects.map((proj) => (
              <div
                key={proj.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', minWidth: 0, overflowWrap: 'anywhere' }}>
                      {proj.title}
                    </h3>
                    <span className={`badge ${proj.evidenceStatus === 'verified_complete' ? 'badge-mastered' : 'badge-high'}`}>
                      {proj.evidenceStatus.replace('_', ' ')}
                    </span>
                  </div>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: 1.45, margin: 0 }}>
                    {proj.description}
                  </p>

                  {/* Tech Stack Pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {proj.technologies.map((t, i) => (
                      <span key={i} className="os-chip">
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Problem & Solution */}
                  {proj.problemAndSolution?.problem && (
                    <div style={{ padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <div>
                        <strong style={{ color: 'var(--text-primary)' }}>Challenge:</strong> {proj.problemAndSolution.problem}
                      </div>
                      <div>
                        <strong style={{ color: 'var(--success)' }}>Solution:</strong> {proj.problemAndSolution.solution}
                      </div>
                    </div>
                  )}

                  {/* Verified Features */}
                  {proj.verifiedFeatures.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                        Verified Deliverables:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '1.15rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {proj.verifiedFeatures.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Footer Links & Resume Bullet */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                    {proj.repoUrl ? (
                      <a
                        href={proj.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}
                      >
                        <GitBranch size={14} />
                        <span>Code Repository</span>
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>No repository linked</span>
                    )}

                    {proj.assessmentBacking && proj.assessmentBacking.length > 0 && (
                      <span style={{ color: 'var(--success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <CheckCircle2 size={14} />
                        <span>{proj.assessmentBacking.length} skills backed</span>
                      </span>
                    )}
                  </div>

                  {proj.suggestedBullets.length > 0 && (
                    <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      "{proj.suggestedBullets[0].bulletText}"
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resume Bullet Generator */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <FileText size={18} color="var(--color-accent)" />
            Evidence-Backed Resume Bullet Generator
          </h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '1.25rem' }}>
          Synthesizes high-impact bullets strictly grounded in verified deliverables and skills demonstrated.
        </p>

        <form onSubmit={handleGenerateBullets} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr)) auto', gap: '0.75rem', alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="bullet-project-title">Project Title</label>
            <input
              id="bullet-project-title"
              type="text"
              placeholder="e.g. Distributed Task Queue"
              value={bulletProjectTitle}
              onChange={(e) => setBulletProjectTitle(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="bullet-tech">Technologies (comma-separated)</label>
            <input
              id="bullet-tech"
              type="text"
              placeholder="e.g. Redis, Node.js, Docker"
              value={bulletTechnologies}
              onChange={(e) => setBulletTechnologies(e.target.value)}
              className="form-input"
            />
          </div>

          <button
            type="submit"
            disabled={generatingBullets || !bulletProjectTitle.trim()}
            className="btn btn-primary"
            style={{ height: 'var(--control-height)' }}
          >
            {generatingBullets ? 'Synthesizing...' : 'Generate Bullets'}
          </button>
        </form>

        {generatedBullets.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '1.25rem' }}>
            {generatedBullets.map((b, i) => (
              <div
                key={i}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  • {b.bulletText}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--success)' }}>Supported facts:</strong> {b.supportedFacts.join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
