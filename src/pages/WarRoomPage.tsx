import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import { CareerWarRoom, WarRoomTask } from '../types/index.js';
import {
  Target,
  Swords,
  Clock,
  CheckCircle2,
  Circle,
  PlayCircle,
  Award,
  ClipboardList,
  FolderGit2,
  ArrowRight,
  Info,
  Flag,
  AlertTriangle
} from 'lucide-react';

const kindIcon: Record<WarRoomTask['kind'], React.ElementType> = {
  learn: ClipboardList,
  assess: Award,
  project: FolderGit2,
  practice: PlayCircle
};

const kindLabel: Record<WarRoomTask['kind'], string> = {
  learn: 'Study',
  assess: 'Prove',
  project: 'Build',
  practice: 'Practice'
};

function formatDuration(minutes: number): string {
  if (minutes <= 0) return '—';
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return hours >= 10 ? `${Math.round(hours)} h` : `${hours.toFixed(hours % 1 === 0 ? 0 : 1)} h`;
}

const StatusIcon: React.FC<{ status: WarRoomTask['status'] }> = ({ status }) => {
  if (status === 'done') return <CheckCircle2 size={18} color="var(--success)" />;
  if (status === 'in_progress') return <PlayCircle size={18} color="var(--color-accent)" />;
  return <Circle size={18} color="var(--text-muted)" />;
};

export const WarRoomPage: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [warRoom, setWarRoom] = useState<CareerWarRoom | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNotes, setShowNotes] = useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await api.warRoom.get();
      setWarRoom(res.warRoom);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load your war room.');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.warRoom.get();
        if (!cancelled) setWarRoom(res.warRoom);
      } catch (err: any) {
        if (!cancelled) toast.error(err.message || 'Failed to load your war room.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [toast]);

  const markTaskDone = React.useCallback(async (task: WarRoomTask) => {
    // Only roadmap-backed tasks can be completed here; everything else routes
    // to its real page so progress is never double-counted.
    if (task.kind !== 'learn' || !task.sourceId) {
      navigate(task.route);
      return;
    }
    try {
      await api.roadmap.updateTask(task.sourceId, { status: 'completed' });
      toast.success('Marked complete — progress recorded once.');
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark this task complete.');
    }
  }, [navigate, toast, load]);

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div aria-hidden="true" className="spin" style={{ width: 36, height: 36, border: '3px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', margin: '0 auto 1rem' }} />
          <div>Prioritising your next moves...</div>
        </div>
      </div>
    );
  }

  if (!warRoom) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <Swords size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
        <div style={{ color: 'var(--text-secondary)' }}>Complete onboarding to open your war room.</div>
      </div>
    );
  }

  const { todaysMission, priorityTasks, weeklyProgress, topPriorities, activeGoal, criticalGaps, incompleteMilestones, completedTasks } = warRoom;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Swords size={26} color="var(--color-accent)" />
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.9rem', margin: 0 }}>Career War Room</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem', maxWidth: 720 }}>
            {warRoom.targetRole ? <>Your prioritised plan for <strong>{warRoom.targetRole.title}</strong>.</> : 'Your prioritised plan.'}{' '}
            Every task links back to the page that actually records progress.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Link to="/evidence-graph" className="btn btn-ghost btn-sm">Evidence Graph</Link>
          <Link to="/jd-analyzer" className="btn btn-ghost btn-sm">JD Analyzer</Link>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowNotes(v => !v)} aria-expanded={showNotes}>
            <Info size={15} /> How priorities work
          </button>
        </div>
      </header>

      {showNotes && (
        <div className="card" style={{ background: 'var(--bg-surface)' }}>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {warRoom.prioritizationNotes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      )}

      {/* Weekly progress */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        <div className="card"><div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Readiness</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{weeklyProgress.readinessScore}
            {weeklyProgress.readinessDelta !== 0 && <span style={{ fontSize: '0.9rem', marginLeft: '0.4rem', color: weeklyProgress.readinessDelta > 0 ? 'var(--success)' : 'var(--danger)' }}>{weeklyProgress.readinessDelta > 0 ? '+' : ''}{weeklyProgress.readinessDelta}</span>}
          </div>
        </div>
        <div className="card"><div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Scheduled / week</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{weeklyProgress.scheduledHours} h</div></div>
        <div className="card"><div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Logged (7 days)</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{weeklyProgress.completedHours} h</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{weeklyProgress.completedThisWeek} activities</div></div>
      </div>

      {/* Active goal */}
      {activeGoal && (
        <div className="card">
          <div className="card-header">
            <span className="card-title"><Target size={18} color="var(--color-accent)" /> Active career goal</span>
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{activeGoal.roleTitle}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Readiness {activeGoal.currentReadiness} · {activeGoal.remainingCriticalGaps} critical gaps open
            {activeGoal.horizon ? ` · target horizon ${activeGoal.horizon}` : ''}
          </div>
          {activeGoal.targetCompanies.length > 0 && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Target companies: {activeGoal.targetCompanies.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Top 3 priorities */}
      {topPriorities.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title"><ClipboardList size={18} color="var(--color-accent)" /> Top three priorities</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {topPriorities.map((task, i) => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 0.9rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontWeight: 800, color: 'var(--color-accent)', minWidth: 20 }}>{i + 1}</span>
                <StatusIcon status={task.status} />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{task.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{kindLabel[task.kind]} · {formatDuration(task.estimatedMinutes)}</div>
                </div>
                <span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
                <button className="btn btn-outline btn-sm" onClick={() => navigate(task.route)}>{task.actionLabel}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Critical skill gaps */}
      {criticalGaps.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title"><AlertTriangle size={18} color="var(--danger)" /> Critical skill gaps</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {criticalGaps.map(gap => (
              <div key={gap.skillId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                <span>{gap.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>L{gap.currentLevel} → L{gap.requiredLevel}</span>
              </div>
            ))}
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/roadmap')} style={{ marginTop: '0.35rem' }}>Open roadmap</button>
          </div>
        </div>
      )}

      {/* Today's mission */}
      {todaysMission ? (
        <div className="card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
          <div className="card-header">
            <span className="card-title"><Target size={18} color="var(--color-accent)" /> Today's mission</span>
            <span className={`badge badge-${todaysMission.priority.toLowerCase()}`}>{todaysMission.priority} priority</span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem' }}>{todaysMission.title}</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>{todaysMission.explanation}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock size={14} /> {formatDuration(todaysMission.estimatedMinutes)}
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Done when: {todaysMission.completionCriteria}</span>
            <button className="btn btn-primary btn-sm" onClick={() => markTaskDone(todaysMission)}>
              {todaysMission.kind === 'learn' && todaysMission.sourceId ? 'Mark complete' : todaysMission.actionLabel} <ArrowRight size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
          <div style={{ fontWeight: 700 }}><CheckCircle2 size={18} color="var(--success)" /> All priority tasks are complete.</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.4rem', marginBottom: 0 }}>
            Nothing is overdue. Explore a new skill, take on a tougher project, or revisit your target role.
          </p>
        </div>
      )}

      {/* Incomplete learning milestones */}
      {incompleteMilestones.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title"><Flag size={18} color="var(--color-accent)" /> Incomplete learning milestones</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {incompleteMilestones.map(m => (
              <div key={m.taskId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                <span>{m.skillName} — {m.stageName}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{m.estimatedHours}h · {m.completionPercentage}%</span>
              </div>
            ))}
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/roadmap')} style={{ marginTop: '0.35rem' }}>Open roadmap</button>
          </div>
        </div>
      )}

      {/* Priority tasks */}
      <div className="card">
        <div className="card-header"><span className="card-title"><ClipboardList size={18} color="var(--color-accent)" /> Priority queue</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{priorityTasks.length} tasks</span></div>
        {priorityTasks.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No tasks yet — select a target role and complete a gap analysis.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {priorityTasks.map(task => {
              const Icon = kindIcon[task.kind];
              return (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.85rem 1rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', flexWrap: 'wrap' }}>
                  <StatusIcon status={task.status} />
                  <Icon size={16} color="var(--text-muted)" aria-hidden="true" />
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{task.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{kindLabel[task.kind]} · {formatDuration(task.estimatedMinutes)}</div>
                  </div>
                  <span className={`badge badge-${task.priority.toLowerCase()}`}>{task.priority}</span>
                  {task.kind === 'learn' && task.sourceId ? (
                    <button className="btn btn-outline btn-sm" onClick={() => markTaskDone(task)}>Mark complete</button>
                  ) : (
                    <button className="btn btn-outline btn-sm" onClick={() => navigate(task.route)}>{task.actionLabel}</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed tasks */}
      {completedTasks.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title"><CheckCircle2 size={18} color="var(--success)" /> Completed tasks</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {completedTasks.map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}>
                <CheckCircle2 size={15} color="var(--success)" />
                <span style={{ flex: 1 }}>{task.title}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{kindLabel[task.kind]}</span>
              </div>
            ))}
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/roadmap')} style={{ marginTop: '0.35rem' }}>View completed work</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {/* Pending assessments */}
        <div className="card">
          <div className="card-header"><span className="card-title"><Award size={18} color="var(--color-accent)" /> Skills to verify</span></div>
          {warRoom.pendingAssessments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Every required skill is assessed.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {warRoom.pendingAssessments.map(p => (
                <div key={p.skillId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.88rem' }}>{p.name}</span>
                  <span className={`badge badge-${p.priority.toLowerCase()}`}>{p.priority}</span>
                </div>
              ))}
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/assessments')} style={{ marginTop: '0.4rem' }}>Go to assessments</button>
            </div>
          )}
        </div>

        {/* Project milestones */}
        <div className="card">
          <div className="card-header"><span className="card-title"><FolderGit2 size={18} color="var(--color-accent)" /> Next build steps</span></div>
          {warRoom.projectMilestones.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No in-progress projects. Save one to start building evidence.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {warRoom.projectMilestones.map(m => (
                <div key={`${m.projectId}:${m.milestoneId}`}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{m.milestoneTitle}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{m.projectTitle}</div>
                </div>
              ))}
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/projects')} style={{ marginTop: '0.4rem' }}>Go to projects</button>
            </div>
          )}
        </div>
      </div>

      {/* Achievements */}
      <div className="card">
        <div className="card-header"><span className="card-title"><Award size={18} color="var(--success)" /> Recent wins</span></div>
        {warRoom.achievements.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No achievements recorded yet. Pass an assessment or complete a project to start your track record.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {warRoom.achievements.map(a => (
              <div key={a.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <CheckCircle2 size={16} color="var(--success)" style={{ marginTop: 3 }} />
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{a.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{a.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WarRoomPage;
