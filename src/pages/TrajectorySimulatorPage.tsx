import React, { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import type { TrajectorySimulation } from '../types/index.js';
import { TrendingUp, ChartLine, Info, Target } from 'lucide-react';

export const TrajectorySimulatorPage: React.FC = () => {
  const toast = useToast();
  const [trajectory, setTrajectory] = useState<TrajectorySimulation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.trajectory.get();
        if (!cancelled) setTrajectory(res.trajectory);
      } catch (err: any) {
        if (!cancelled) toast.error(err.message || 'Failed to load trajectory.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [toast]);

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div aria-hidden="true" className="spin" style={{ width: 36, height: 36, border: '3px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', margin: '0 auto 1rem' }} />
          <div>Simulating your trajectory...</div>
        </div>
      </div>
    );
  }

  if (!trajectory) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <TrendingUp size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
        <div style={{ color: 'var(--text-secondary)' }}>Complete onboarding to generate a trajectory.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <TrendingUp size={26} color="var(--color-accent)" />
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.9rem', margin: 0 }}>Trajectory Simulator</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', maxWidth: 720 }}>
          See how consistent effort could move your readiness. Projections are conservative and reuse the same canonical readiness model.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Base score</div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{trajectory.baseScore}%</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Readiness history points</div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{trajectory.history.length}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title"><ChartLine size={18} color="var(--color-accent)" /> Scenarios</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {trajectory.scenarios.map((s, i) => (
            <div key={i} style={{ padding: '0.9rem 1rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Target size={16} color="var(--color-accent)" />
                <span style={{ fontWeight: 600, flex: 1 }}>{s.label}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {s.weeklyHours}h/week · {s.horizonWeeks} weeks
                </span>
                <span className="badge" style={{ color: 'var(--success)', borderColor: 'var(--success)' }}>
                  +{s.delta}% → {s.projectedScore}%
                </span>
              </div>
              {s.assumptions.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <Info size={14} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <span>{s.assumptions.join(' ')}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{trajectory.disclaimer}</p>
    </div>
  );
};

export default TrajectorySimulatorPage;
