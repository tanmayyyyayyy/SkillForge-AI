import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import type { ForgedProject, ForgedProjectMilestone } from '../types/index.js';
import {
  Hammer,
  Sparkles,
  Layers,
  CheckCircle2,
  Clock,
  Shield,
  FileCode,
  FolderGit2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Award,
  Terminal,
  BookOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProjectForgePage: React.FC = () => {
  const toast = useToast();
  const [projects, setProjects] = useState<ForgedProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<ForgedProject | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedMilestones, setExpandedMilestones] = useState<Record<string, boolean>>({});

  // Generation Form State
  const [difficulty, setDifficulty] = useState<string>('Intermediate');
  const [gapSkillInput, setGapSkillInput] = useState<string>('');
  const [preferredStackInput, setPreferredStackInput] = useState<string>('');

  // Milestone Submission Modal State
  const [verifyingMilestone, setVerifyingMilestone] = useState<ForgedProjectMilestone | null>(null);
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [artifactUrl, setArtifactUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submittingVerification, setSubmittingVerification] = useState<boolean>(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.projectForge.list();
      setProjects(res.projects);
      if (res.projects.length > 0) {
        setSelectedProject(res.projects[0]);
        if (res.projects[0].milestones.length > 0) {
          setExpandedMilestones({ [res.projects[0].milestones[0].id]: true });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load forged projects');
      toast.error('Failed to load forged projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGenerating(true);
      setError(null);
      const targetedGapSkills = gapSkillInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const preferredStack = preferredStackInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const res = await api.projectForge.generate({
        difficulty,
        targetedGapSkills: targetedGapSkills.length > 0 ? targetedGapSkills : undefined,
        preferredStack: preferredStack.length > 0 ? preferredStack : undefined
      });

      setProjects(prev => [res.project, ...prev]);
      setSelectedProject(res.project);
      if (res.project.milestones.length > 0) {
        setExpandedMilestones({ [res.project.milestones[0].id]: true });
      }
      toast.success('Project engineered successfully!');
    } catch (err: any) {
      setError(err.message || 'Project generation failed');
      toast.error(err.message || 'Project generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !verifyingMilestone) return;

    try {
      setSubmittingVerification(true);
      const res = await api.projectForge.verifyMilestone(
        selectedProject.id,
        verifyingMilestone.id,
        { repoUrl: repoUrl || undefined, artifactUrl: artifactUrl || undefined, notes: notes || undefined }
      );

      setSelectedProject(res.project);
      setProjects(prev => prev.map(p => p.id === res.project.id ? res.project : p));
      toast.success('Milestone verified! Evidence added to your Career Evidence Graph.');
      setVerifyingMilestone(null);
      setRepoUrl('');
      setArtifactUrl('');
      setNotes('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify milestone');
    } finally {
      setSubmittingVerification(false);
    }
  };

  const toggleMilestone = (id: string) => {
    setExpandedMilestones(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="os-page-container">
      {/* Header */}
      <header className="os-header">
        <div className="os-header-left">
          <div className="os-header-icon">
            <Hammer size={24} />
          </div>
          <div>
            <h1 className="os-header-title">Project Forge</h1>
            <p className="os-header-subtitle">
              Architect verifiable, gap-closing projects with milestone evidence tracking.
            </p>
          </div>
        </div>

        <div className="os-header-actions">
          <Link to="/portfolio-intelligence" className="btn btn-secondary btn-sm">
            <FolderGit2 size={14} />
            <span>Portfolio Intelligence</span>
          </Link>
          <Link to="/evidence-graph" className="btn btn-secondary btn-sm">
            <Award size={14} />
            <span>Evidence Graph</span>
          </Link>
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <div className="os-grid-sidebar">
        {/* Left Column: Generator Card & Project List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Project Generator Form */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ fontSize: '1rem' }}>
                <Sparkles size={16} color="var(--color-accent)" />
                Forge New Project
              </h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.45, marginBottom: '1.25rem' }}>
              Engineers an end-to-end architecture plan with testing and security standards to close your skill gaps.
            </p>

            <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="project-difficulty">
                  Target Difficulty
                </label>
                <select
                  id="project-difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="form-select"
                >
                  <option value="Beginner">Beginner (Foundations)</option>
                  <option value="Intermediate">Intermediate (Full Stack / Microservice)</option>
                  <option value="Advanced">Advanced (High-scale & Distributed)</option>
                  <option value="Industry-Grade">Industry-Grade (Enterprise Hardened)</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="gap-skills-input">
                  Focus Gap Skills (optional)
                </label>
                <input
                  id="gap-skills-input"
                  type="text"
                  placeholder="e.g. Redis, Docker, PostgreSQL"
                  value={gapSkillInput}
                  onChange={(e) => setGapSkillInput(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="preferred-tech-input">
                  Preferred Technologies (optional)
                </label>
                <input
                  id="preferred-tech-input"
                  type="text"
                  placeholder="e.g. TypeScript, Express, Vitest"
                  value={preferredStackInput}
                  onChange={(e) => setPreferredStackInput(e.target.value)}
                  className="form-input"
                />
              </div>

              <button
                type="submit"
                disabled={generating}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.25rem' }}
              >
                {generating ? (
                  <>
                    <div className="spin" style={{ width: 16, height: 16, border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%' }} />
                    <span>Architecting Spec...</span>
                  </>
                ) : (
                  <>
                    <Hammer size={16} />
                    <span>Generate Project Spec</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Project History List */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ fontSize: '1rem' }}>
                <FolderGit2 size={16} color="var(--color-accent)" />
                Forged Projects
              </h3>
              <span className="badge badge-medium">{projects.length}</span>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                <div className="spin" style={{ width: 24, height: 24, border: '2px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', margin: '0 auto' }} />
              </div>
            ) : projects.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', textAlign: 'center', padding: '1rem 0', margin: 0 }}>
                No projects forged yet. Use the form above to generate your first architecture spec.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {projects.map((proj) => {
                  const isSelected = selectedProject?.id === proj.id;
                  return (
                    <button
                      key={proj.id}
                      onClick={() => setSelectedProject(proj)}
                      style={{
                        textAlign: 'left',
                        padding: '0.75rem 0.9rem',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'rgba(211, 138, 25, 0.12)' : 'var(--bg-surface)',
                        border: isSelected ? '1.5px solid var(--color-accent)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: isSelected ? 'var(--color-accent)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                          {proj.title}
                        </span>
                        <span className={`badge ${proj.status === 'completed' ? 'badge-mastered' : 'badge-high'}`} style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                          {proj.difficulty}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {proj.targetRole}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Project Spec & Milestones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {selectedProject ? (
            <>
              {/* Overview Card */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="badge badge-accent">
                      {selectedProject.difficulty}
                    </span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={14} /> ~{selectedProject.estimatedTotalHours} hours total
                    </span>
                  </div>

                  <span className={`badge ${selectedProject.status === 'completed' ? 'badge-mastered' : 'badge-high'}`}>
                    {selectedProject.status === 'completed' ? 'Fully Completed' : 'In Progress'}
                  </span>
                </div>

                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>
                  {selectedProject.title}
                </h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-accent)', fontWeight: 600, marginBottom: '1.25rem' }}>
                  Target Role: {selectedProject.targetRole}
                </div>

                {/* Problem Statement Box */}
                <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '1.25rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    Problem Statement & User Need
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    {selectedProject.problemStatement}
                  </p>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Target Users:</strong> {selectedProject.targetUsers}
                  </div>
                </div>

                {/* Targeted Gaps & Stack */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Award size={15} color="var(--color-accent)" />
                      <span>Targeted Skill Gaps</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {selectedProject.targetedGapSkills.map((gap, i) => (
                        <span key={i} className="os-chip os-chip-accent">
                          {gap}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Terminal size={15} color="var(--color-accent)" />
                      <span>Recommended Architecture Stack</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {Object.entries(selectedProject.recommendedStack).flatMap(([cat, items]) =>
                        (items || []).map((t, idx) => (
                          <span key={`${cat}-${idx}`} className="os-chip">
                            {t}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Architecture & Engineering Standards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Layers size={16} color="var(--color-accent)" />
                      <span>Architecture Outline</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-line' }}>
                      {selectedProject.architectureOutline}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                    <div style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Shield size={15} color="var(--danger)" />
                        <span>Security Standards</span>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '1.15rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {selectedProject.securityConsiderations.map((sc, i) => (
                          <li key={i}>{sc}</li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <FileCode size={15} color="var(--success)" />
                        <span>Testing Standards</span>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '1.15rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {selectedProject.testingRequirements.map((tr, i) => (
                          <li key={i}>{tr}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Milestones & Verification Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Layers size={18} color="var(--color-accent)" />
                    Milestones & Evidence Collection
                  </h3>
                  <span className="badge badge-accent">
                    {selectedProject.milestones.filter(m => m.completed).length} of {selectedProject.milestones.length} verified
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {selectedProject.milestones.map((milestone) => {
                    const isExpanded = !!expandedMilestones[milestone.id];
                    return (
                      <div
                        key={milestone.id}
                        className="card"
                        style={{
                          padding: 0,
                          overflow: 'hidden',
                          borderColor: milestone.completed ? 'rgba(45, 106, 79, 0.4)' : 'var(--border-subtle)',
                          background: milestone.completed ? 'rgba(45, 106, 79, 0.03)' : 'var(--bg-card)'
                        }}
                      >
                        {/* Milestone Accordion Header */}
                        <div
                          onClick={() => toggleMilestone(milestone.id)}
                          style={{
                            padding: '1.1rem 1.25rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            background: isExpanded ? 'var(--bg-card-hover)' : 'transparent',
                            transition: 'background var(--transition-fast)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: milestone.completed ? 'var(--success)' : 'rgba(211, 138, 25, 0.15)',
                                color: milestone.completed ? '#ffffff' : 'var(--color-accent)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                flexShrink: 0
                              }}
                            >
                              {milestone.completed ? <CheckCircle2 size={16} /> : milestone.order}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{milestone.title}</span>
                                {milestone.completed && (
                                  <span className="badge badge-mastered" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                                    Verified
                                  </span>
                                )}
                              </div>
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0' }}>
                                {milestone.objective}
                              </p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              ~{milestone.estimatedHours}h
                            </span>
                            {isExpanded ? (
                              <ChevronUp size={18} color="var(--text-muted)" />
                            ) : (
                              <ChevronDown size={18} color="var(--text-muted)" />
                            )}
                          </div>
                        </div>

                        {/* Collapsible Details */}
                        {isExpanded && (
                          <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
                            {/* Concrete Tasks */}
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.45rem' }}>
                                Implementation Tasks
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {milestone.tasks.map((task) => (
                                  <div
                                    key={task.id}
                                    style={{
                                      padding: '0.65rem 0.85rem',
                                      borderRadius: 'var(--radius-sm)',
                                      background: 'var(--bg-surface)',
                                      border: '1px solid var(--border-subtle)',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      gap: '0.5rem'
                                    }}
                                  >
                                    <div>
                                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{task.title}</div>
                                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{task.description}</div>
                                    </div>
                                    <span className="os-chip" style={{ fontSize: '0.72rem' }}>
                                      {task.estimatedHours}h
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Acceptance Criteria */}
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                                Acceptance Criteria
                              </div>
                              <ul style={{ margin: 0, paddingLeft: '1.15rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.82rem' }}>
                                {milestone.acceptanceCriteria.map((ac, i) => (
                                  <li key={i}>{ac}</li>
                                ))}
                              </ul>
                            </div>

                            {/* Demonstrated Skills */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Demonstrates:</span>
                              {milestone.skillsDemonstrated.map((sk, i) => (
                                <span key={i} className="os-chip os-chip-accent">
                                  {sk}
                                </span>
                              ))}
                            </div>

                            {/* Action Button or Verified Note */}
                            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                              {milestone.completed ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.84rem', fontWeight: 600 }}>
                                  <CheckCircle2 size={16} />
                                  <span>Verified on {new Date(milestone.completedAt || '').toLocaleDateString()}</span>
                                  {milestone.submittedEvidence?.repoUrl && (
                                    <a
                                      href={milestone.submittedEvidence.repoUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{ color: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginLeft: '0.5rem' }}
                                    >
                                      <span>Repository</span>
                                      <ExternalLink size={12} />
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <button
                                  onClick={() => setVerifyingMilestone(milestone)}
                                  className="btn btn-primary btn-sm"
                                >
                                  <FolderGit2 size={14} />
                                  <span>Submit Milestone Evidence</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <BookOpen size={40} color="var(--color-accent)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                No Project Selected
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 440, margin: '0 auto' }}>
                Generate a new project specification targeted to your career goals, or select an existing project from the left history list.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Milestone Evidence Verification Modal */}
      {verifyingMilestone && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FolderGit2 size={20} color="var(--color-accent)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Verify Milestone Evidence
                </h3>
              </div>
              <button
                onClick={() => setVerifyingMilestone(null)}
                className="btn btn-ghost btn-sm"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '1.25rem' }}>
              Submitting evidence for: <strong style={{ color: 'var(--text-primary)' }}>{verifyingMilestone.title}</strong>
            </p>

            <form onSubmit={handleVerifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="repo-url-input">
                  Public Git Repository URL (optional)
                </label>
                <input
                  id="repo-url-input"
                  type="url"
                  placeholder="https://github.com/username/project"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="artifact-url-input">
                  Live Deployment or Artifact URL (optional)
                </label>
                <input
                  id="artifact-url-input"
                  type="url"
                  placeholder="https://project-demo.render.com"
                  value={artifactUrl}
                  onChange={(e) => setArtifactUrl(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="verification-notes-input">
                  Implementation Summary & Notes
                </label>
                <textarea
                  id="verification-notes-input"
                  rows={3}
                  placeholder="Describe your implementation, tests written, or architecture choices..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setVerifyingMilestone(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVerification}
                  className="btn btn-primary btn-sm"
                >
                  {submittingVerification ? 'Recording Evidence...' : 'Confirm & Record Evidence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
