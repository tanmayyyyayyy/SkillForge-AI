import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import { RoadmapResult, RoadmapTask } from '../types/index.js';
import {
  CheckCircle2,
  Circle,
  BookOpen,
  ExternalLink,
  Edit,
  Save,
  Sparkles,
  Check
} from 'lucide-react';

export const RoadmapPage: React.FC = () => {
  const toast = useToast();
  const [roadmap, setRoadmap] = useState<RoadmapResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Note editing state: taskId -> note string
  const [activeNoteTaskId, setActiveNoteTaskId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');

  const fetchRoadmap = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.roadmap.get();
      setRoadmap(res.roadmap);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load learning roadmap.');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRoadmap();
  }, [fetchRoadmap]);

  const handleToggleStatus = async (task: RoadmapTask) => {
    try {
      const newStatus = task.status === 'completed' ? 'not_started' : 'completed';
      const newPct = newStatus === 'completed' ? 100 : 0;
      await api.roadmap.updateTask(task.id, { status: newStatus, completionPercentage: newPct });
      toast.success(newStatus === 'completed' ? `Completed: ${task.skillName}!` : `Marked ${task.skillName} as not started.`);
      fetchRoadmap();
    } catch {
      toast.error('Failed to update task.');
    }
  };

  const handleUpdatePercentage = async (taskId: string, percentage: number) => {
    try {
      await api.roadmap.updateTask(taskId, {
        status: percentage === 100 ? 'completed' : percentage > 0 ? 'in_progress' : 'not_started',
        completionPercentage: percentage
      });
      fetchRoadmap();
    } catch {
      toast.error('Failed to update progress percentage.');
    }
  };

  const handleSaveNotes = async (taskId: string) => {
    try {
      await api.roadmap.updateTask(taskId, { userNotes: noteContent });
      toast.success('Notes saved successfully.');
      setActiveNoteTaskId(null);
      fetchRoadmap();
    } catch {
      toast.error('Failed to save notes.');
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div role="status" aria-live="polite" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div
            aria-hidden="true"
            style={{
              width: 44,
              height: 44,
              border: '3px solid rgba(211, 138, 25, 0.2)',
              borderTopColor: '#D38A19',
              borderRadius: '50%',
              margin: '0 auto 1.25rem',
              animation: 'spin 0.8s linear infinite'
            }}
          />
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--text-primary)' }}>
            Synthesizing Learning Roadmap...
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Sequencing dependency-ordered curriculum for your target career
          </p>
        </div>
      </div>
    );
  }

  if (!roadmap || (roadmap.stages?.length ?? 0) === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', textAlign: 'center', gap: '0.75rem' }}>
        <div className="editorial-pill" style={{ background: 'var(--color-accent-light)', borderColor: '#E5C37A' }}>
          <Sparkles size={13} />
          <span>Roadmap</span>
        </div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          {roadmap ? 'No roadmap stages yet' : 'Could not load your roadmap'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 480, margin: 0, lineHeight: 1.5 }}>
          {roadmap
            ? 'Your roadmap does not have any stages yet. Update your profile or choose a target career to generate one.'
            : 'Something went wrong while loading your learning roadmap. Please try again.'}
        </p>
        <button type="button" className="btn btn-primary" onClick={fetchRoadmap}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Editorial Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Your learning roadmap
            </h1>
            <div className="editorial-pill" style={{ background: 'var(--color-paper-light)', borderColor: 'var(--border-medium)' }}>
              <span className="editorial-pill-dot" />
              <span>Target · {roadmap?.roleTitle || 'Career Track'}</span>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: 0, maxWidth: '650px', lineHeight: 1.5 }}>
            A personalized path from your current skills to your target career, organized by dependency tiers.
          </p>
        </div>

        {/* Global Progress Panel */}
        <div
          className="card"
          style={{
            background: 'var(--color-paper)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '14px',
            padding: '1.25rem 1.6rem',
            minWidth: 280,
            boxShadow: '0 4px 16px rgba(48, 35, 25, 0.05)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              OVERALL PROGRESS
            </span>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {roadmap?.overallProgressPercentage}%
            </span>
          </div>

          <div
            className="progress-container"
            role="progressbar"
            aria-label="Roadmap overall progress"
            aria-valuenow={roadmap?.overallProgressPercentage ?? 0}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{ height: 7, marginBottom: '0.6rem', background: 'var(--color-progress-track)' }}
          >
            <div
              className="progress-bar"
              style={{
                width: `${roadmap?.overallProgressPercentage}%`,
                background: 'var(--color-accent)',
                transition: 'width 0.4s ease'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <span>{roadmap?.completedTasks} of {roadmap?.totalTasks} Tasks Done</span>
            <span>~{roadmap?.completedHours || 0} / {roadmap?.totalHours || 0} hrs</span>
          </div>
        </div>
      </div>

      {/* ROADMAP STAGES */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {roadmap.stages.map((stage) => {
          const stageTasks = stage.tasks ?? [];
          const stageCompleted = stageTasks.length > 0 && stageTasks.every(t => t.status === 'completed');
          const stageHours = stageTasks.reduce((sum, t) => sum + t.estimatedHours, 0);

          return (
            <div key={stage.stageNumber} style={{ position: 'relative' }}>
              {/* Stage Header Banner */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--color-paper)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '14px',
                  padding: '1.35rem 1.75rem',
                  marginBottom: '1.25rem',
                  boxShadow: '0 4px 14px rgba(48, 35, 25, 0.04)',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '10px',
                      background: stageCompleted ? 'var(--success)' : 'var(--color-accent-light)',
                      border: `1px solid ${stageCompleted ? 'var(--success)' : '#E5C37A'}`,
                      color: stageCompleted ? '#ffffff' : 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1.25rem',
                      fontFamily: 'var(--font-serif)',
                      boxShadow: '0 2px 6px rgba(48, 35, 25, 0.08)'
                    }}
                  >
                    {stageCompleted ? <Check size={22} strokeWidth={3} /> : stage.stageNumber}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                        Stage {stage.stageNumber}: {stage.stageName}
                      </h2>
                      {stageCompleted && (
                        <span className="badge badge-mastered">Stage Completed</span>
                      )}
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem', margin: 0 }}>
                      {stage.description}
                    </p>
                  </div>
                </div>

                <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{stageTasks.length} Learning Tasks</div>
                  <div>~{stageHours} Estimated Hours</div>
                </div>
              </div>

              {/* Tasks List in Stage */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.15rem',
                  paddingLeft: '1.5rem',
                  borderLeft: '2px dashed var(--border-medium)',
                  marginLeft: '1.35rem'
                }}
              >
                {stageTasks.map((task) => {
                  const isComplete = task.status === 'completed';
                  const isEditingNote = activeNoteTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      className="card"
                      style={{
                        background: isComplete ? 'var(--color-paper-light)' : 'var(--color-paper)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '12px',
                        padding: '1.5rem 1.65rem',
                        boxShadow: '0 2px 8px rgba(48, 35, 25, 0.04)',
                        borderLeft: isComplete ? '4px solid var(--success)' : '4px solid var(--color-accent)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Task Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(task)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 2,
                              marginTop: 2,
                              color: isComplete ? 'var(--success)' : 'var(--text-muted)'
                            }}
                            aria-label={isComplete ? `Mark ${task.skillName} as incomplete` : `Mark ${task.skillName} as completed`}
                            title={isComplete ? 'Mark task incomplete' : 'Mark task completed'}
                          >
                            {isComplete ? (
                              <CheckCircle2 size={24} color="var(--success)" fill="rgba(45, 106, 79, 0.15)" />
                            ) : (
                              <Circle size={24} color="#BAA993" />
                            )}
                          </button>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                              <h3
                                style={{
                                  fontFamily: 'var(--font-serif)',
                                  fontSize: '1.3rem',
                                  fontWeight: 600,
                                  textDecoration: isComplete ? 'line-through' : 'none',
                                  color: isComplete ? 'var(--text-muted)' : 'var(--text-primary)',
                                  margin: 0
                                }}
                              >
                                {task.skillName}
                              </h3>
                              <span className={`badge badge-${task.priority.toLowerCase()}`}>
                                {task.priority} Priority
                              </span>
                              <span className="editorial-pill" style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
                                Target: Level {task.targetProficiency}/5
                              </span>
                            </div>
                            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.45 }}>
                              {task.whyItMatters}
                            </div>
                          </div>
                        </div>

                        {/* Progress slider / hours */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {task.completionPercentage}% Done
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              ~{task.estimatedHours} hrs
                            </div>
                          </div>

                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={10}
                            value={task.completionPercentage}
                            onChange={e => handleUpdatePercentage(task.id, Number(e.target.value))}
                            style={{
                              width: 95,
                              accentColor: 'var(--color-accent)',
                              cursor: 'pointer'
                            }}
                            aria-label={`Completion percentage for ${task.skillName}`}
                            title="Adjust completion percentage"
                          />
                        </div>
                      </div>

                      {/* Learning Details Grid */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                          gap: '1rem',
                          background: 'rgba(213, 201, 185, 0.22)',
                          padding: '1rem 1.15rem',
                          borderRadius: '10px',
                          marginBottom: '1rem',
                          border: '1px solid rgba(217, 204, 186, 0.5)'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
                            Hands-On Practice
                          </div>
                          <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                            {task.practiceActivity}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
                            Project Application
                          </div>
                          <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                            {task.projectApplication}
                          </div>
                        </div>
                      </div>

                      {/* Learning Resources */}
                      {(task.learningResources?.length ?? 0) > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 500 }}>
                            <BookOpen size={14} color="var(--color-accent)" /> Curated Resources:
                          </span>
                          {task.learningResources.map((res, idx) => (
                            <a
                              key={idx}
                              href={res.url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.3rem 0.65rem',
                                background: 'var(--color-paper-light)',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-medium)',
                                transition: 'all 0.15s ease'
                              }}
                              className="editorial-pill-interactive"
                            >
                              <span>{res.title}</span>
                              <ExternalLink size={11} color="var(--text-muted)" />
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Notes Section */}
                      {isEditingNote ? (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                          <textarea
                            className="form-textarea"
                            aria-label={`Study notes for ${task.skillName}`}
                            value={noteContent}
                            onChange={e => setNoteContent(e.target.value)}
                            placeholder="Add your study notes, insights, or repository links for this skill..."
                            style={{ minHeight: 75, background: '#FAF5EC', border: '1px solid var(--border-medium)' }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => setActiveNoteTaskId(null)}
                              className="btn btn-secondary btn-sm"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveNotes(task.id)}
                              className="editorial-btn-primary"
                              style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
                            >
                              <Save size={13} /> Save Note
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', fontStyle: task.userNotes ? 'normal' : 'italic' }}>
                            {task.userNotes ? `Note: "${task.userNotes}"` : 'No personal notes attached.'}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveNoteTaskId(task.id);
                              setNoteContent(task.userNotes || '');
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.78rem', padding: '0.25rem 0.65rem' }}
                          >
                            <Edit size={12} /> {task.userNotes ? 'Edit Note' : 'Add Note'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoadmapPage;
