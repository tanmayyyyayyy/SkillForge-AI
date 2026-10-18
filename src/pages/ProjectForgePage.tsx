import React, { useState, useEffect } from 'react';
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
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.projectForge.list();
      setProjects(res.projects);
      if (res.projects.length > 0) {
        setSelectedProject(res.projects[0]);
        // Expand first milestone by default
        if (res.projects[0].milestones.length > 0) {
          setExpandedMilestones({ [res.projects[0].milestones[0].id]: true });
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load forged projects');
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Project generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !verifyingMilestone) return;

    try {
      setSubmittingVerification(true);
      setVerificationFeedback(null);
      const res = await api.projectForge.verifyMilestone(
        selectedProject.id,
        verifyingMilestone.id,
        { repoUrl: repoUrl || undefined, artifactUrl: artifactUrl || undefined, notes: notes || undefined }
      );

      // Update selected project state
      setSelectedProject(res.project);
      setProjects(prev => prev.map(p => p.id === res.project.id ? res.project : p));
      setVerificationFeedback('Milestone verified successfully! Evidence has been added to your Career Evidence Graph.');
      setTimeout(() => {
        setVerifyingMilestone(null);
        setRepoUrl('');
        setArtifactUrl('');
        setNotes('');
        setVerificationFeedback(null);
      }, 1500);
    } catch (err: unknown) {
      setVerificationFeedback(err instanceof Error ? err.message : 'Failed to verify milestone');
    } finally {
      setSubmittingVerification(false);
    }
  };

  const toggleMilestone = (id: string) => {
    setExpandedMilestones(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Hammer className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                Project Forge
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Architect verifiable, gap-closing projects with milestone evidence tracking.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/portfolio-intelligence"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)] transition-colors text-[var(--text-secondary)]"
          >
            <FolderGit2 className="w-4 h-4 text-emerald-400" />
            Portfolio Intelligence
          </Link>
          <Link
            to="/evidence-graph"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)] transition-colors text-[var(--text-secondary)]"
          >
            <Award className="w-4 h-4 text-cyan-400" />
            Evidence Graph
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Generator & Active Project */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Generate New Project & History */}
        <div className="space-y-6">
          {/* Generator Card */}
          <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Forge New Project</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Analyzes your current skill gaps and target career role to generate an engineering project complete with security, testing, and milestone rubrics.
            </p>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Target Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
                >
                  <option value="Beginner">Beginner (Foundations)</option>
                  <option value="Intermediate">Intermediate (Full Stack / Microservice)</option>
                  <option value="Advanced">Advanced (High-scale & Distributed)</option>
                  <option value="Industry-Grade">Industry-Grade (Enterprise Hardened)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Focus Gap Skills (comma-separated, optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Redis, Docker, PostgreSQL, WebSockets"
                  value={gapSkillInput}
                  onChange={(e) => setGapSkillInput(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-500 placeholder-[var(--text-muted)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Preferred Technologies (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. TypeScript, Express, Vitest"
                  value={preferredStackInput}
                  onChange={(e) => setPreferredStackInput(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-amber-500 placeholder-[var(--text-muted)]"
                />
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-900 font-semibold rounded-lg text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    <span>Architecting Project...</span>
                  </>
                ) : (
                  <>
                    <Hammer className="w-4 h-4" />
                    <span>Generate Project Spec</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Project History */}
          <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center justify-between">
              <span>Your Forged Projects</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-page)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                {projects.length}
              </span>
            </h3>

            {loading ? (
              <div className="py-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : projects.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] text-center py-6">
                No forged projects yet. Click Generate Project Spec to create your first evidence-backed engineering project.
              </p>
            ) : (
              <div className="space-y-2">
                {projects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => setSelectedProject(proj)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedProject?.id === proj.id
                        ? 'bg-amber-500/10 border-amber-500/30 text-[var(--text-primary)]'
                        : 'bg-[var(--bg-page)] border-[var(--border-subtle)] hover:border-amber-500/20 text-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold truncate max-w-[170px] text-[var(--text-primary)]">
                        {proj.title}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        proj.status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-amber-500/15 text-amber-400'
                      }`}>
                        {proj.difficulty}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] truncate">
                      {proj.targetRole}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Columns: Active Project Spec & Milestones */}
        <div className="lg:col-span-2 space-y-6">
          {selectedProject ? (
            <>
              {/* Project Overview Card */}
              <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/20">
                      {selectedProject.difficulty}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      ~{selectedProject.estimatedTotalHours} hours total
                    </span>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    selectedProject.status === 'completed'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                  }`}>
                    {selectedProject.status === 'completed' ? 'Fully Completed' : 'In Progress'}
                  </span>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">
                    {selectedProject.title}
                  </h2>
                  <p className="text-xs text-amber-400 mt-0.5">
                    Target Role: {selectedProject.targetRole}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[var(--bg-page)] border border-[var(--border-subtle)] space-y-2">
                  <div className="text-xs font-semibold text-[var(--text-primary)]">
                    Problem Statement & User Need
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {selectedProject.problemStatement}
                  </p>
                  <div className="text-[11px] text-[var(--text-secondary)] pt-1">
                    <span className="font-medium text-[var(--text-primary)]">Target Audience:</span> {selectedProject.targetUsers}
                  </div>
                </div>

                {/* Targeted Gaps & Tech Stack */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-[var(--bg-page)] border border-[var(--border-subtle)]">
                    <div className="text-xs font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <span>Targeted Skill Gaps</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProject.targetedGapSkills.map((gap, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {gap}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[var(--bg-page)] border border-[var(--border-subtle)]">
                    <div className="text-xs font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Recommended Architecture</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(selectedProject.recommendedStack).flatMap(([cat, items]) =>
                        (items || []).map((t, idx) => (
                          <span key={`${cat}-${idx}`} className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                            {t}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Architecture & Engineering Standards Accordion */}
                <div className="space-y-3 pt-2">
                  <div className="p-4 rounded-xl bg-[var(--bg-page)] border border-[var(--border-subtle)] text-xs space-y-2">
                    <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Architecture Breakdown</span>
                    </div>
                    <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                      {selectedProject.architectureOutline}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-[var(--bg-page)] border border-[var(--border-subtle)] space-y-1">
                      <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-rose-400" />
                        <span>Security Considerations</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[var(--text-secondary)] text-[11px]">
                        {selectedProject.securityConsiderations.map((sc, i) => (
                          <li key={i}>{sc}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--bg-page)] border border-[var(--border-subtle)] space-y-1">
                      <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Testing Requirements</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[var(--text-secondary)] text-[11px]">
                        {selectedProject.testingRequirements.map((tr, i) => (
                          <li key={i}>{tr}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Milestones & Evidence Collection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>Project Milestones & Verification</span>
                  </h3>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {selectedProject.milestones.filter(m => m.completed).length} of {selectedProject.milestones.length} verified
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedProject.milestones.map((milestone) => {
                    const isExpanded = !!expandedMilestones[milestone.id];
                    return (
                      <div
                        key={milestone.id}
                        className={`rounded-xl border transition-all ${
                          milestone.completed
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-[var(--bg-card)] border-[var(--border-subtle)]'
                        }`}
                      >
                        {/* Header */}
                        <div
                          onClick={() => toggleMilestone(milestone.id)}
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-card-hover)] transition-colors rounded-xl"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              milestone.completed
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {milestone.completed ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <span className="text-xs font-bold">{milestone.order}</span>
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                <span>{milestone.title}</span>
                                {milestone.completed && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-normal">
                                    Verified Evidence
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--text-secondary)]">
                                {milestone.objective}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className="text-xs text-[var(--text-secondary)] hidden sm:inline">
                              ~{milestone.estimatedHours}h
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
                            )}
                          </div>
                        </div>

                        {/* Collapsible Details */}
                        {isExpanded && (
                          <div className="p-4 pt-0 border-t border-[var(--border-subtle)] space-y-4 text-xs mt-2">
                            {/* Tasks Breakdown */}
                            <div className="space-y-1.5 pt-3">
                              <span className="font-semibold text-[var(--text-primary)]">
                                Concrete Implementation Tasks
                              </span>
                              <div className="space-y-1">
                                {milestone.tasks.map((task) => (
                                  <div
                                    key={task.id}
                                    className="p-2.5 rounded-lg bg-[var(--bg-page)] border border-[var(--border-subtle)] flex items-start justify-between gap-2"
                                  >
                                    <div>
                                      <div className="font-medium text-[var(--text-primary)]">
                                        {task.title}
                                      </div>
                                      <div className="text-[11px] text-[var(--text-secondary)]">
                                        {task.description}
                                      </div>
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-card)] text-[var(--text-secondary)] flex-shrink-0">
                                      {task.estimatedHours}h
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Acceptance Criteria */}
                            <div className="space-y-1">
                              <span className="font-semibold text-[var(--text-primary)]">
                                Acceptance Criteria
                              </span>
                              <ul className="list-disc list-inside space-y-0.5 text-[var(--text-secondary)] text-[11px]">
                                {milestone.acceptanceCriteria.map((ac, i) => (
                                  <li key={i}>{ac}</li>
                                ))}
                              </ul>
                            </div>

                            {/* Demonstrated Skills */}
                            <div className="flex items-center gap-2 pt-1 flex-wrap">
                              <span className="font-semibold text-[var(--text-primary)]">
                                Demonstrates:
                              </span>
                              {milestone.skillsDemonstrated.map((sk, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]"
                                >
                                  {sk}
                                </span>
                              ))}
                            </div>

                            {/* Verification Status or Button */}
                            <div className="pt-3 flex items-center justify-between border-t border-[var(--border-subtle)]">
                              {milestone.completed ? (
                                <div className="text-emerald-400 flex items-center gap-1.5 text-xs">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>
                                    Evidence verified on {new Date(milestone.completedAt || '').toLocaleDateString()}
                                  </span>
                                  {milestone.submittedEvidence?.repoUrl && (
                                    <a
                                      href={milestone.submittedEvidence.repoUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="ml-2 text-cyan-400 hover:underline flex items-center gap-1"
                                    >
                                      <span>Repository</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <button
                                  onClick={() => setVerifyingMilestone(milestone)}
                                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-semibold rounded-lg text-xs hover:from-emerald-600 hover:to-teal-600 transition-all shadow-sm flex items-center gap-1.5"
                                >
                                  <FolderGit2 className="w-3.5 h-3.5" />
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
            <div className="p-12 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                No Project Selected
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                Generate a new project specification targeted to your career goals, or select an existing project from the left sidebar.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Milestone Evidence Verification Modal */}
      {verifyingMilestone && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Verify Milestone Evidence
                </h3>
              </div>
              <button
                onClick={() => setVerifyingMilestone(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-[var(--text-secondary)]">
              Submitting evidence for: <strong className="text-[var(--text-primary)]">{verifyingMilestone.title}</strong>
            </div>

            {verificationFeedback && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 text-xs">
                {verificationFeedback}
              </div>
            )}

            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Public Git Repository URL (optional)
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/username/project"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 placeholder-[var(--text-muted)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Live Deployment or Artifact URL (optional)
                </label>
                <input
                  type="url"
                  placeholder="https://project-demo.render.com"
                  value={artifactUrl}
                  onChange={(e) => setArtifactUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 placeholder-[var(--text-muted)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Implementation Summary & Verification Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe your implementation, tests written, or architecture choices..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 placeholder-[var(--text-muted)]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setVerifyingMilestone(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-[var(--bg-page)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVerification}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-lg text-xs flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {submittingVerification ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm & Record Evidence</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
