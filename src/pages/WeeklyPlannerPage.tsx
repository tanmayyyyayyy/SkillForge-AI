import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, RefreshCw, Check, Clock, RotateCcw, ArrowRight } from 'lucide-react';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import type { WeeklyPlan, WeeklyPlanTask } from '../types/index.js';

const MIN_AVAILABILITY = 1;
const MAX_AVAILABILITY = 80;

function formatRange(weekStart: string, weekEnd: string): string {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(`${weekEnd}T00:00:00Z`);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' };
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, { ...opts, year: 'numeric' })}`;
}

function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });
}

export const WeeklyPlannerPage: React.FC = () => {
  const toast = useToast();

  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [availabilityInput, setAvailabilityInput] = useState<number>(14);

  const loadPlan = useCallback(
    async (preserveInput = false) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const { plan: fetched } = await api.weeklyPlan.get();
        setPlan(fetched);
        if (!preserveInput) setAvailabilityInput(fetched.availableHours || 14);
      } catch (err: any) {
        setLoadError(err?.message || 'Failed to load your weekly plan.');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const { plan: fetched } = await api.weeklyPlan.get();
        if (cancelled) return;
        setPlan(fetched);
        setAvailabilityInput(fetched.availableHours || 14);
      } catch (err: any) {
        if (!cancelled) setLoadError(err?.message || 'Failed to load your weekly plan.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRegenerate = async (withAvailability: boolean) => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      if (withAvailability) {
        if (!Number.isFinite(availabilityInput) || availabilityInput < MIN_AVAILABILITY || availabilityInput > MAX_AVAILABILITY) {
          toast.error(`Available study hours must be between ${MIN_AVAILABILITY} and ${MAX_AVAILABILITY}.`);
          return;
        }
      }
      const { plan: regenerated } = await api.weeklyPlan.regenerate(withAvailability ? Math.round(availabilityInput) : undefined);
      setPlan(regenerated);
      toast.success('Weekly plan regenerated.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to regenerate the weekly plan.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComplete = async (task: WeeklyPlanTask) => {
    if (savingId) return;
    setSavingId(task.id);
    try {
      if (task.source === 'roadmap') {
        await api.roadmap.updateTask(task.sourceId, { status: 'completed' });
      } else if (task.source === 'project' && task.milestoneId) {
        await api.projects.toggleMilestone(task.sourceId, task.milestoneId, true);
      } else {
        throw new Error('This task cannot be completed from here.');
      }
      toast.success('Task marked complete.');
      await loadPlan(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update the task.');
    } finally {
      setSavingId(null);
    }
  };

  const handleReopen = async (taskId: string) => {
    if (savingId) return;
    setSavingId(taskId);
    try {
      await api.roadmap.updateTask(taskId, { status: 'not_started', completionPercentage: 0 });
      toast.info('Task reopened.');
      await loadPlan(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reopen the task.');
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading && !plan) {
    return (
      <div className="editorial-container">
        <div role="status" aria-live="polite" style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--color-muted)' }}>
          <div className="spin" aria-hidden="true" style={{ width: 36, height: 36, border: '3px solid rgba(211,138,25,0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', margin: '0 auto 1rem' }} />
          Loading your weekly plan…
        </div>
      </div>
    );
  }

  if (loadError && !plan) {
    return (
      <div className="editorial-container">
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <h1 className="card-title">We couldn’t load your weekly plan</h1>
          <p style={{ color: 'var(--color-muted)', margin: '0.75rem 0 1.5rem' }}>{loadError}</p>
          <button type="button" className="editorial-btn-primary" onClick={() => void loadPlan()}>
            <RefreshCw size={16} />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  if (!plan) return null;

  const needsSetup = plan.state === 'no-availability' || plan.state === 'no-target-role';
  const utilization = plan.availableHours > 0
    ? Math.min(100, Math.round((plan.totalScheduledHours / plan.availableHours) * 100))
    : 0;

  return (
    <div className="editorial-container">
      <header className="editorial-section-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="editorial-pill" style={{ marginBottom: '0.5rem' }}>
            <span className="editorial-pill-text">Weekly learning planner</span>
          </div>
          <h1 className="editorial-section-heading">Your week, planned</h1>
          <p style={{ color: 'var(--color-muted)', marginTop: '0.35rem' }}>
            {formatRange(plan.weekStart, plan.weekEnd)} · {plan.targetRole.title}
          </p>
        </div>
        <div className="editorial-section-aside" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            className="editorial-btn-secondary"
            onClick={() => void handleRegenerate(false)}
            disabled={isGenerating}
            aria-busy={isGenerating}
          >
            <RefreshCw size={15} className={isGenerating ? 'spin' : undefined} />
            <span>{isGenerating ? 'Regenerating…' : 'Regenerate plan'}</span>
          </button>
        </div>
      </header>

      <p role="status" aria-live="polite" style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 1.5rem' }}>
        {plan.message}
      </p>

      {/* Overview metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)' }}>Available</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{plan.availableHours} h</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>declared per week</div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)' }}>Scheduled</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{plan.totalScheduledHours} h</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>{plan.tasks.length} session{plan.tasks.length === 1 ? '' : 's'}</div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)' }}>Completed</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{plan.completedHours} h</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>credited this week</div>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)' }}>Remaining</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{plan.remainingScheduledHours} h</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>scheduled, not done</div>
        </div>
      </div>

      {/* Availability control */}
      <section className="editorial-section" aria-labelledby="availability-heading">
        <div className="editorial-section-header">
          <h2 id="availability-heading" className="editorial-section-heading" style={{ fontSize: '1.1rem' }}>
            Study availability
          </h2>
        </div>
        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="planner-availability">Hours available per week</label>
            <input
              id="planner-availability"
              className="form-input"
              type="number"
              min={MIN_AVAILABILITY}
              max={MAX_AVAILABILITY}
              value={availabilityInput}
              onChange={e => setAvailabilityInput(Number(e.target.value))}
              style={{ maxWidth: 140 }}
            />
          </div>
          <button
            type="button"
            className="editorial-btn-primary"
            onClick={() => void handleRegenerate(true)}
            disabled={isGenerating}
          >
            <span>{isGenerating ? 'Saving…' : 'Save & regenerate'}</span>
            <ArrowRight size={16} />
          </button>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
            Updates your profile availability ({MIN_AVAILABILITY}–{MAX_AVAILABILITY}h).
          </span>
        </div>
      </section>

      {needsSetup ? (
        <section className="editorial-section">
          <div className="card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            <CalendarDays size={28} aria-hidden="true" style={{ color: 'var(--color-accent)' }} />
            <h2 className="card-title" style={{ marginTop: '0.75rem' }}>A little setup first</h2>
            <p style={{ color: 'var(--color-muted)', maxWidth: 560, margin: '0.5rem auto 1.25rem' }}>{plan.message}</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link className="editorial-btn-primary" to="/profile"><span>Update profile</span><ArrowRight size={16} /></Link>
              <Link className="editorial-btn-secondary" to="/careers"><span>Choose a career</span></Link>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* Progress */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div className="progress-container" role="progressbar" aria-valuenow={utilization} aria-valuemin={0} aria-valuemax={100} aria-label="Weekly availability scheduled">
              <div className="progress-bar progress-bar-success" style={{ width: `${utilization}%` }} />
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.4rem' }}>
              {utilization}% of your available hours are scheduled this week.
            </div>
          </div>

          {/* Day-by-day schedule */}
          <section className="editorial-section" aria-labelledby="schedule-heading">
            <div className="editorial-section-header">
              <h2 id="schedule-heading" className="editorial-section-heading">This week’s schedule</h2>
              <span className="editorial-section-aside">{plan.completedHours}h done · {plan.remainingScheduledHours}h to go</span>
            </div>

            {plan.tasks.length === 0 ? (
              <div className="card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                {plan.state === 'no-work'
                  ? plan.message
                  : 'No sessions fit within your available hours this week. Increase your availability above or reduce higher-priority work.'}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.85rem' }}>
                {plan.days.map(day => (
                  <div key={day.day} className="card" style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.75rem', marginBottom: day.tasks.length ? '0.6rem' : 0 }}>
                      <strong style={{ fontFamily: 'var(--font-serif, serif)' }}>{day.label}</strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>{formatDay(day.date)} · {day.hours}h</span>
                    </div>
                    {day.tasks.length === 0 ? (
                      <span style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>Rest / flexible — no session scheduled.</span>
                    ) : (
                      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.6rem' }}>
                        {day.tasks.map(task => (
                          <li key={task.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem' }}>
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={false}
                              aria-label={`Mark "${task.title}" complete`}
                              onClick={() => void handleComplete(task)}
                              disabled={savingId !== null}
                              className="editorial-milestone-check editorial-milestone-check-incomplete"
                              style={{ marginTop: 2, flexShrink: 0, cursor: 'pointer', background: 'transparent' }}
                            >
                              {savingId === task.id ? <span className="spin" aria-hidden="true">•</span> : null}
                            </button>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <strong>{task.title}</strong>
                                <span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
                                <span className="badge badge-pill" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                                  {task.kind === 'skill-gap' ? 'Skill' : 'Project'}
                                </span>
                              </div>
                              <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.86rem' }}>{task.description}</p>
                              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--color-muted)', alignItems: 'center' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Clock size={13} aria-hidden="true" /> {task.estimatedHours}h session
                                  {task.originalEstimatedHours > task.estimatedHours ? ` · ~${task.originalEstimatedHours}h total` : ''}
                                </span>
                                {task.skillId ? (
                                  <Link to={`/analysis`} style={{ color: 'var(--color-accent)' }}>{task.skillName || task.skillId}</Link>
                                ) : null}
                                {task.resource?.url ? (
                                  <a href={task.resource.url} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>
                                    {task.resource.title}
                                  </a>
                                ) : null}
                                {task.prerequisites.length > 0 ? <span>Prereqs: {task.prerequisites.join(', ')}</span> : null}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Completed this week */}
          {plan.completedThisWeek.length > 0 ? (
            <section className="editorial-section" aria-labelledby="completed-heading">
              <div className="editorial-section-header">
                <h2 id="completed-heading" className="editorial-section-heading" style={{ fontSize: '1.1rem' }}>
                  Completed this week
                </h2>
                <span className="editorial-section-aside">{plan.completedHours}h credited</span>
              </div>
              <div className="card" style={{ padding: '0.5rem 1.25rem' }}>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {plan.completedThisWeek.map(item => (
                    <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.6rem 0', borderTop: '1px solid var(--border-subtle)' }}>
                      <span style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Check size={15} color="var(--success)" aria-hidden="true" /> {item.skillName || item.title} · {item.hours}h
                      </span>
                      <button type="button" className="editorial-btn-secondary" onClick={() => void handleReopen(item.id)} disabled={savingId !== null} title="Reopen this task">
                        <RotateCcw size={14} />
                        <span>Reopen</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          {/* Unscheduled work */}
          {plan.unscheduled.length > 0 ? (
            <section className="editorial-section" aria-labelledby="unscheduled-heading">
              <div className="editorial-section-header">
                <h2 id="unscheduled-heading" className="editorial-section-heading" style={{ fontSize: '1.1rem' }}>
                  Couldn’t fit this week
                </h2>
                <span className="editorial-section-aside">{plan.unscheduled.length} item{plan.unscheduled.length === 1 ? '' : 's'}</span>
              </div>
              <div className="card" style={{ padding: '0.5rem 1.25rem' }}>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {plan.unscheduled.map(item => (
                    <li key={item.id} style={{ padding: '0.7rem 0', borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong>{item.title}</strong>
                        <span className={`badge badge-${item.priority.toLowerCase()}`}>{item.priority}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>~{item.estimatedHours}h</span>
                      </div>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>{item.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}
        </>
      )}

      <footer style={{ margin: '2rem 0 1rem', fontSize: '0.78rem', color: 'var(--color-muted)' }}>
        Generated {new Date(plan.generatedAt).toLocaleString()} · {plan.totalCandidates} candidate task{plan.totalCandidates === 1 ? '' : 's'} considered.
        Sessions are derived from your roadmap and project milestones — completing one updates it everywhere.
      </footer>
    </div>
  );
};

export default WeeklyPlannerPage;
