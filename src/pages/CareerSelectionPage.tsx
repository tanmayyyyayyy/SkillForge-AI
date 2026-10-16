import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import { useDialogA11y } from '../hooks/useDialogA11y.js';
import { CareerRole } from '../types/index.js';
import {
  Compass,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  ArrowRight,
  Layers,
  Sparkles
} from 'lucide-react';

export const CareerSelectionPage: React.FC = () => {
  const { profile, setProfile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [careers, setCareers] = useState<Array<any>>([]);
  const [selectedRole, setSelectedRole] = useState<CareerRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const dialogRef = useDialogA11y<HTMLDivElement>(() => setSelectedRole(null), !!selectedRole);

  useEffect(() => {
    api.careers.getAll()
      .then(res => setCareers(res.careers))
      .catch(() => toast.error('Failed to load career paths.'))
      .finally(() => setIsLoading(false));
  }, [toast]);

  const handleInspectRole = async (roleId: string) => {
    try {
      const res = await api.careers.getById(roleId);
      setSelectedRole(res.career);
    } catch {
      toast.error('Failed to load role details.');
    }
  };

  const handleSwitchTargetRole = async (roleId: string) => {
    setIsUpdating(true);
    try {
      const res = await api.profile.update({ targetRole: roleId });
      setProfile(res.profile);
      toast.success(`Target career switched to ${selectedRole?.title || roleId}! Recalculating roadmap...`);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update target career.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div role="status" aria-live="polite" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spin" aria-hidden="true" style={{ width: 36, height: 36, border: '3px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', margin: '0 auto 1rem' }} />
          <div>Loading curated career intelligence tracks...</div>
        </div>
      </div>
    );
  }

  const currentTargetRoleId = profile?.targetRole || 'aiml';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Career Intelligence Tracks
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.4rem', lineHeight: 1.5 }}>
          Explore curated technical career paths with real market expectations, compensation benchmarks, and prerequisite hierarchies.
        </p>
      </div>

      {/* Career Roles Grid */}
      {careers.length === 0 && (
        <div className="card" role="status" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
          <Compass size={24} style={{ marginBottom: '0.5rem' }} />
          <div>No career tracks are available right now.</div>
          <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }} onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.5rem' }}>
        {careers.map(role => {
          const isTarget = currentTargetRoleId === role.id;

          return (
            <div
              key={role.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: isTarget ? '1.5px solid #E5C37A' : '1px solid var(--border-subtle)',
                background: isTarget ? 'var(--color-accent-light)' : 'var(--color-paper)',
                boxShadow: isTarget ? '0 6px 18px rgba(211, 138, 25, 0.12)' : '0 2px 8px rgba(48, 35, 25, 0.04)',
                borderRadius: '14px',
                padding: '1.6rem'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.5rem' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--text-primary)', margin: 0 }}>
                    {role.title}
                  </h3>
                  {isTarget ? (
                    <span className="badge badge-mastered">
                      <CheckCircle2 size={13} /> Active Track
                    </span>
                  ) : (
                    <span className="badge badge-medium">
                      Demand: {role.marketDemand}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--color-accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                  {role.category}
                </div>

                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  {role.shortDescription}
                </p>

                <div style={{ background: isTarget ? 'rgba(255, 255, 255, 0.4)' : 'rgba(213, 201, 185, 0.25)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.82rem', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Salary Benchmark:</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    {role.averageStartingSalary}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleInspectRole(role.id)}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.8rem' }}
                >
                  Inspect Skills
                </button>

                {isTarget ? (
                  <button type="button" disabled className="btn btn-secondary btn-sm" style={{ opacity: 0.8 }}>
                    Current Goal
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSwitchTargetRole(role.id)}
                    disabled={isUpdating}
                    className="btn btn-primary btn-sm"
                  >
                    Select as Goal
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* INSPECT ROLE MODAL */}
      {selectedRole && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="career-inspect-title"
            ref={dialogRef}
            style={{ maxWidth: 700 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h2 id="career-inspect-title" style={{ fontSize: '1.4rem' }}>{selectedRole.title}</h2>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {selectedRole.category} &bull; Starting Salary: {selectedRole.averageStartingSalary}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRole(null)}
                className="btn btn-ghost btn-sm"
              >
                Close
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              {selectedRole.fullDescription}
            </p>

            <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Curated Required Skills ({(selectedRole.requiredSkills?.length ?? 0)})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 250, overflowY: 'auto', marginBottom: '1.5rem' }}>
              {(selectedRole.requiredSkills ?? []).map(s => (
                <div key={s.skillId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{s.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                      ({s.category})
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                    Required: Level {s.requiredLevel}/5 &bull; {Math.round(s.importance * 100)}% Weight
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setSelectedRole(null)} className="btn btn-secondary">
                Back
              </button>
              {currentTargetRoleId !== selectedRole.id && (
                <button
                  type="button"
                  onClick={() => handleSwitchTargetRole(selectedRole.id)}
                  disabled={isUpdating}
                  className="btn btn-primary"
                >
                  Set as My Target Career
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
