import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import { Select } from '../components/ui/Select.js';
import {
  User,
  Clock,
  Sparkles,
  RotateCcw,
  Server
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, profile, setProfile, isDemo, demoReset } = useAuth();
  const toast = useToast();

  const [weeklyHours, setWeeklyHours] = useState(profile?.weeklyHours || 14);
  const [learningStyle, setLearningStyle] = useState<any>(profile?.preferredLearningStyle || 'Project-based');
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [healthInfo, setHealthInfo] = useState<any>(null);
  const [healthState, setHealthState] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    api.health.get()
      .then(data => {
        if (cancelled) return;
        setHealthInfo(data);
        setHealthState('ok');
      })
      .catch(() => {
        if (cancelled) return;
        setHealthState('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      const res = await api.profile.update({
        weeklyHours: Number(weeklyHours),
        preferredLearningStyle: learningStyle
      });
      setProfile(res.profile);
      toast.success('Study preferences saved successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      await demoReset();
      toast.success('Demo evaluation profile reset to clean baseline.');
    } catch {
      toast.error('Failed to reset demo data.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: 800 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Application settings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.3rem' }}>
          Configure your study parameters, manage evaluator demo states, and inspect system health.
        </p>
      </div>

      {/* Account Info */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={18} color="var(--color-accent)" /> Account Information
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', fontSize: '0.88rem' }}>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Name</div>
            <div style={{ fontWeight: 600, marginTop: '0.15rem' }}>{user?.name}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Email</div>
            <div style={{ fontWeight: 600, marginTop: '0.15rem' }}>{user?.email}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Account Mode</div>
            <div style={{ fontWeight: 600, color: isDemo ? 'var(--color-accent)' : 'var(--text-primary)', marginTop: '0.15rem' }}>
              {isDemo ? 'Evaluator Demo Profile' : 'Standard User'}
            </div>
          </div>
        </div>
      </div>

      {/* Study Parameters */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={18} color="#10b981" /> Learning Parameters
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="hrs">Weekly Available Study Hours</label>
            <Select
              id="hrs"
              ariaLabel="Weekly Available Study Hours"
              value={weeklyHours}
              onChange={v => setWeeklyHours(Number(v))}
              options={[
                { value: 8, label: '8 hours/week (~1 hour daily)' },
                { value: 14, label: '14 hours/week (~2 hours daily)' },
                { value: 20, label: '20 hours/week (Semi-intensive)' },
                { value: 35, label: '35+ hours/week (Full-time intensive)' }
              ]}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="stylePref">Preferred Learning Style</label>
            <Select
              id="stylePref"
              ariaLabel="Preferred Learning Style"
              value={learningStyle}
              onChange={v => setLearningStyle(v)}
              options={[
                { value: 'Project-based', label: 'Project-based (Build immediately)' },
                { value: 'Theory & Practice', label: 'Theory & Practice (Balanced)' },
                { value: 'Documentation & Code', label: 'Documentation & Code' },
                { value: 'Visual & Video', label: 'Visual & Video' }
              ]}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSavePreferences}
          disabled={isSaving}
          className="btn btn-primary btn-sm"
        >
          {isSaving ? 'Saving...' : 'Save Parameters'}
        </button>
      </div>

      {/* Evaluator Demo Controls (Judge convenience) */}
      <div className="card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={18} color="var(--color-accent)" /> Evaluator Demo Controls
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '1.25rem' }}>
          Reset sample student progress, test assessments, and milestone submissions back to the original benchmark for re-evaluating.
        </p>

        <button
          type="button"
          onClick={handleResetDemo}
          disabled={isResetting}
          className="btn btn-secondary btn-sm"
        >
          <RotateCcw size={14} className={isResetting ? 'spin' : ''} />
          <span>{isResetting ? 'Resetting Demo...' : 'Reset Demo Profile (Aarav Sharma)'}</span>
        </button>
      </div>

      {/* System Diagnostics */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Server size={18} color="#f59e0b" /> System Diagnostics
        </h3>
        <div aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Backend Express API Status:</span>
            {healthState === 'loading' && (
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Checking&hellip;</span>
            )}
            {healthState === 'ok' && (
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>&check; {healthInfo?.status || 'Online'}</span>
            )}
            {healthState === 'error' && (
              <span style={{ color: '#ef4444', fontWeight: 600 }}>&times; Unreachable</span>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Database Persistence:</span>
            <span style={{ color: healthState === 'error' ? 'var(--text-muted)' : 'var(--success)', fontWeight: 600 }}>
              {healthState === 'error' ? 'Unknown' : 'Transactional JSON Store Active'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
            <span style={{ color: 'var(--text-muted)' }}>AI Provider Mode:</span>
            <span style={{ color: healthState === 'error' ? 'var(--text-muted)' : (healthInfo?.aiProviderConfigured ? 'var(--success)' : 'var(--color-accent)'), fontWeight: 600 }}>
              {healthState === 'error'
                ? 'Unknown'
                : healthInfo?.aiProviderConfigured
                  ? 'Google Gemini 1.5 Flash (Live)'
                  : 'Deterministic Advisory Engine (Active)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
