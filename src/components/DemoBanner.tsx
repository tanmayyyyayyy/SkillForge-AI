import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { Sparkles, RotateCcw, ShieldCheck } from 'lucide-react';

export const DemoBanner: React.FC = () => {
  const { isDemo, demoReset } = useAuth();
  const toast = useToast();
  const [isResetting, setIsResetting] = useState(false);

  if (!isDemo) return null;

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await demoReset();
      toast.success('Demo profile successfully reset to evaluation baseline.');
    } catch {
      toast.error('Failed to reset demo data.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="demo-banner no-print">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <Sparkles size={16} color="var(--color-accent)" />
        <span>
          <strong>EVALUATOR DEMO MODE:</strong> Exploring realistic sample profile for <em>Aarav Sharma</em> (AI/ML Engineer track).
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          <ShieldCheck size={14} color="var(--color-accent)" /> Full Access Active
        </span>
        <button
          onClick={handleReset}
          disabled={isResetting}
          className="btn btn-secondary btn-sm"
          style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem', background: 'var(--bg-card)', border: '1px solid var(--border-medium)' }}
          title="Reset sample progress, assessments, and projects to original state"
        >
          <RotateCcw size={13} className={isResetting ? 'spin' : ''} />
          {isResetting ? 'Resetting...' : 'Reset Demo'}
        </button>
      </div>
    </div>
  );
};
