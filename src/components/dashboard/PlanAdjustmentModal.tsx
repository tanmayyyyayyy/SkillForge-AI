import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { api } from '../../services/api.js';
import { X, Clock, Target, Check } from 'lucide-react';

interface PlanAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanAdjusted: () => void;
}

export const PlanAdjustmentModal: React.FC<PlanAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onPlanAdjusted
}) => {
  const { profile, refreshSession } = useAuth();
  const toast = useToast();

  const [weeklyHours, setWeeklyHours] = useState<number>(profile?.weeklyHours || 15);
  const [learningStyle, setLearningStyle] = useState<string>(profile?.preferredLearningStyle || 'Project-based');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await api.profile.update({
        weeklyHours,
        preferredLearningStyle: learningStyle as any
      });
      await refreshSession();
      toast.success('Learning plan schedule updated!');
      onPlanAdjusted();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update plan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="editorial-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-plan-title"
    >
      <div
        className="editorial-modal-card"
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 id="modal-plan-title" className="editorial-modal-title">Adjust Learning Plan</h2>
            <p className="editorial-modal-desc">
              Calibrate your weekly time commitment and learning focus.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-muted)',
              padding: '0.25rem'
            }}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '0.5rem' }}>
              Weekly Hours Available: <strong>{weeklyHours} hrs / week</strong>
            </label>
            <input
              type="range"
              min="5"
              max="40"
              step="1"
              value={weeklyHours}
              onChange={e => setWeeklyHours(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: 'var(--color-accent)',
                cursor: 'pointer'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.35rem' }}>
              <span>5 hrs (Relaxed)</span>
              <span>15 hrs (Recommended)</span>
              <span>40 hrs (Intensive)</span>
            </div>
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '0.5rem' }}>
              Preferred Learning Focus
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              {[
                'Project-based',
                'Theory & Practice',
                'Visual & Video',
                'Documentation & Code'
              ].map(style => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setLearningStyle(style)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: `1.5px solid ${learningStyle === style ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    background: learningStyle === style ? 'var(--color-accent-light)' : 'var(--color-paper)',
                    color: 'var(--color-ink)',
                    fontSize: '0.85rem',
                    fontWeight: learningStyle === style ? 600 : 400,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              className="editorial-btn-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="editorial-btn-primary"
              disabled={isSaving}
            >
              <Check size={16} />
              <span>{isSaving ? 'Saving...' : 'Apply Schedule'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
