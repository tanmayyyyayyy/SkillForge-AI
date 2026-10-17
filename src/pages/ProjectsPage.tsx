import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import { useDialogA11y } from '../hooks/useDialogA11y.js';
import { ProjectRecommendation } from '../types/index.js';
import {
  FolderGit2,
  CheckCircle2,
  Circle,
  ExternalLink,
  ShieldCheck,
  UploadCloud
} from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const toast = useToast();
  const [projects, setProjects] = useState<ProjectRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Evidence submission modal state
  const [evidenceProject, setEvidenceProject] = useState<ProjectRecommendation | null>(null);
  const [repoUrl, setRepoUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useDialogA11y<HTMLDivElement>(() => setEvidenceProject(null), !!evidenceProject);

  const fetchProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.projects.get();
      setProjects(res.projects);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load project recommendations.');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleToggleMilestone = async (projectId: string, milestoneId: string, currentCompleted: boolean) => {
    try {
      await api.projects.toggleMilestone(projectId, milestoneId, !currentCompleted);
      toast.success('Project milestone updated!');
      fetchProjects();
    } catch {
      toast.error('Failed to update milestone.');
    }
  };

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceProject) return;

    if (!repoUrl.trim() && !demoUrl.trim()) {
      toast.error('Please provide a GitHub repo link or live demo URL.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.projects.submitEvidence(evidenceProject.id, {
        repoUrl: repoUrl.trim() || undefined,
        demoUrl: demoUrl.trim() || undefined,
        notes: notes.trim() || undefined
      });

      toast.success(res.message);
      setEvidenceProject(null);
      setRepoUrl('');
      setDemoUrl('');
      setNotes('');
      fetchProjects();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit evidence.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div role="status" aria-live="polite" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spin" aria-hidden="true" style={{ width: 36, height: 36, border: '3px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', margin: '0 auto 1rem' }} />
          <div>Curating role-specific project recommendations...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Role-Tailored Project Portfolio
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.4rem', lineHeight: 1.5 }}>
            Build practical evidence. Complete every milestone in these projects and submit your repository / demo links to earn practical project credit.
          </p>
        </div>

        <div className="card" style={{ padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(45, 106, 79, 0.1)', borderColor: 'rgba(45, 106, 79, 0.3)' }}>
          <ShieldCheck size={18} color="var(--success)" />
          <span style={{ fontSize: '0.84rem', color: 'var(--success)' }}>
            Completed projects with evidence contribute up to <strong>+25% Readiness Score</strong>
          </span>
        </div>
      </div>

      {/* Projects List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {projects.length === 0 && (
          <div className="card" role="status" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
            <FolderGit2 size={24} style={{ marginBottom: '0.5rem' }} />
            <div>No project recommendations are available yet.</div>
            <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }} onClick={fetchProjects}>
              Retry
            </button>
          </div>
        )}
        {projects.map(proj => {
          const isCompleted = proj.userStatus === 'completed';
          const milestones = proj.milestones ?? [];
          const completedMilestones = milestones.filter(m => m.completed).length;

          return (
            <div
              key={proj.id}
              className="card"
              style={{
                borderLeft: isCompleted ? '5px solid var(--success)' : '5px solid var(--primary)',
                background: isCompleted ? 'linear-gradient(145deg, var(--bg-card) 0%, rgba(16, 185, 129, 0.04) 100%)' : 'var(--bg-card)'
              }}
            >
              {/* Project Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '1.35rem' }}>{proj.title}</h2>
                    <span className={`badge badge-${proj.difficulty === 'Advanced' ? 'critical' : proj.difficulty === 'Intermediate' ? 'high' : 'medium'}`}>
                      {proj.difficulty}
                    </span>
                    {isCompleted ? (
                      <span className="badge badge-mastered">
                        <CheckCircle2 size={13} /> Project Completed
                      </span>
                    ) : (
                      <span className="badge badge-pill" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                        {completedMilestones}/{milestones.length} Milestones
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                    {proj.whyItMatters}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEvidenceProject(proj);
                      setRepoUrl(proj.submittedEvidence?.repoUrl || '');
                      setDemoUrl(proj.submittedEvidence?.demoUrl || '');
                      setNotes(proj.submittedEvidence?.notes || '');
                    }}
                    className={`btn ${isCompleted ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                  >
                    <UploadCloud size={14} />
                    <span>{isCompleted ? 'Update Evidence' : 'Submit Evidence'}</span>
                  </button>
                </div>
              </div>

              {/* Skills & Tech Stack Badges */}
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>
                    Skills Demonstrated:
                  </span>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {(proj.skillsDemonstrated ?? []).map(s => (
                      <span key={s} className="editorial-pill" style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>
                    Tech Stack:
                  </span>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {(proj.suggestedTechStack ?? []).map(t => (
                      <span key={t} className="badge badge-pill" style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Estimated Effort</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-accent)' }}>~{proj.estimatedEffortHours} Hours</span>
                </div>
              </div>

              {/* Core Features & Milestones Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.25rem' }}>
                {/* Milestones Checklist */}
                <div>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle2 size={16} color="var(--primary)" />
                    <span>Implementation Milestones (Click to toggle)</span>
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {milestones.map((m, idx) => (
                      <div
                        key={m.id}
                        role="checkbox"
                        aria-checked={m.completed}
                        tabIndex={0}
                        aria-label={`Milestone ${idx + 1}: ${m.title}`}
                        onClick={() => handleToggleMilestone(proj.id, m.id, m.completed)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleToggleMilestone(proj.id, m.id, m.completed);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.65rem',
                          padding: '0.65rem 0.85rem',
                          background: 'var(--bg-surface)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          border: '1px solid',
                          borderColor: m.completed ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)',
                          transition: 'all var(--transition-fast)'
                        }}
                      >
                        <div style={{ marginTop: 2, flexShrink: 0 }}>
                          {m.completed ? (
                            <CheckCircle2 size={16} color="var(--success)" />
                          ) : (
                            <Circle size={16} color="var(--text-muted)" />
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.86rem', fontWeight: 600, color: m.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: m.completed ? 'line-through' : 'none' }}>
                            {idx + 1}. {m.title}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            {m.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Core Features & Evaluation */}
                <div>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '0.65rem' }}>
                    Evaluation Criteria
                  </h4>
                  <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                    {(proj.evaluationCriteria ?? []).map((c, idx) => (
                      <li key={idx}>{c}</li>
                    ))}
                  </ul>

                  <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                      Required Evidence:
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {proj.requiredEvidence}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submitted Evidence Details */}
              {proj.submittedEvidence && (
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontWeight: 600, fontSize: '0.85rem' }}>
                      <ShieldCheck size={16} /> Evidence Submitted
                    </div>
                    {proj.submittedEvidence.repoUrl && (
                      <a href={proj.submittedEvidence.repoUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem' }}>
                        <span>Repository Link</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                    {proj.submittedEvidence.demoUrl && (
                      <a href={proj.submittedEvidence.demoUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem' }}>
                        <span>Live Demo Link</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Self-reported &bull; submitted {new Date(proj.submittedEvidence.submittedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* SUBMIT EVIDENCE MODAL */}
      {evidenceProject && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="evidence-modal-title"
            ref={dialogRef}
          >
            <h3 id="evidence-modal-title" style={{ fontSize: '1.25rem', marginBottom: '0.3rem' }}>
              Submit Project Evidence: {evidenceProject.title}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '1.25rem' }}>
              Links are saved as self-reported project evidence. Submitting a link does not verify your skills on its own —
              complete every milestone to earn practical project credit toward your readiness score.
            </p>

            <form onSubmit={handleSubmitEvidence}>
              <div className="form-group">
                <label className="form-label" htmlFor="repoUrl">GitHub / Git Repository URL</label>
                <input
                  id="repoUrl"
                  type="url"
                  className="form-input"
                  placeholder="https://github.com/username/project-repo"
                  value={repoUrl}
                  onChange={e => setRepoUrl(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="demoUrl">Live Deployed Demo URL (Optional)</label>
                <input
                  id="demoUrl"
                  type="url"
                  className="form-input"
                  placeholder="https://your-demo-app.vercel.app"
                  value={demoUrl}
                  onChange={e => setDemoUrl(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="notes">Implementation Notes & Highlights</label>
                <textarea
                  id="notes"
                  className="form-textarea"
                  placeholder="Describe your architecture decisions, challenges solved, or testing suite..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ minHeight: 70 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setEvidenceProject(null)} className="btn btn-secondary" disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Submit Evidence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
