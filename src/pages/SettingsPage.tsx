import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import { Select } from '../components/ui/Select.js';
import type { AiProviderHealth, AiProviderStatus } from '../types/index.js';
import {
  User,
  Clock,
  Sparkles,
  RotateCcw,
  Server,
  Cpu,
  Zap
} from 'lucide-react';

interface HealthInfo {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  environment?: string;
  aiProviderConfigured: boolean;
}

const HEALTH_LABELS: Record<AiProviderHealth, string> = {
  connected: 'Connected',
  not_configured: 'Not configured',
  not_verified: 'Not yet verified',
  request_failed: 'Request failed',
  fallback_active: 'Fallback active'
};

const HEALTH_COLORS: Record<AiProviderHealth, string> = {
  connected: 'var(--success)',
  not_configured: 'var(--text-muted)',
  not_verified: 'var(--info)',
  request_failed: 'var(--danger)',
  fallback_active: 'var(--color-accent)'
};

const DIAG_ROW: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '0.5rem',
  padding: '0.5rem 0',
  borderBottom: '1px solid var(--border-subtle)'
};

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

export const SettingsPage: React.FC = () => {
  const { user, profile, setProfile, isDemo, demoReset } = useAuth();
  const toast = useToast();

  const [weeklyHours, setWeeklyHours] = useState(profile?.weeklyHours || 14);
  const [learningStyle, setLearningStyle] = useState<any>(profile?.preferredLearningStyle || 'Project-based');
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [healthInfo, setHealthInfo] = useState<HealthInfo | null>(null);
  const [healthState, setHealthState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [providerInfo, setProviderInfo] = useState<AiProviderStatus | null>(null);
  const [providerState, setProviderState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const loadProviderStatus = useCallback(async () => {
    try {
      const res = await api.aiProvider.status();
      setProviderInfo(res.provider);
      setProviderState('ok');
    } catch {
      setProviderState('error');
    }
  }, []);

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
    loadProviderStatus();
    return () => {
      cancelled = true;
    };
  }, [loadProviderStatus]);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const res = await api.aiProvider.testConnection();
      setProviderInfo(res.provider);
      setProviderState('ok');
      if (res.ok) {
        toast.success(`Gemini ${res.model} responded in ${res.latencyMs} ms — connection verified.`);
      } else {
        toast.error(res.error || 'Gemini connection test failed.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Gemini connection test failed.');
      // Refresh status so the UI reflects the failed attempt recorded by the server.
      await loadProviderStatus();
    } finally {
      setIsTestingConnection(false);
    }
  };

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

  const providerDisplayName = providerInfo
    ? providerInfo.provider === 'gemini' ? 'Gemini AI' : 'Deterministic Fallback'
    : null;
  const providerHealth = providerInfo ? HEALTH_LABELS[providerInfo.health] : null;
  const providerHealthColor = providerInfo ? HEALTH_COLORS[providerInfo.health] : 'var(--text-muted)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: 800, minWidth: 0, width: '100%' }}>
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

      {/* AI Provider Settings */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Cpu size={18} color="var(--color-accent)" /> AI Provider
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '1.25rem' }}>
          Which engine serves AI Career Coach, interview evaluation, project generation, and resume/JD analysis.
        </p>

        <div aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          <div style={DIAG_ROW}>
            <span style={{ color: 'var(--text-muted)' }}>Current Provider:</span>
            {providerState === 'loading' && (
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Checking&hellip;</span>
            )}
            {providerState === 'error' && (
              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Unknown (backend unreachable)</span>
            )}
            {providerState === 'ok' && providerDisplayName && (
              <span style={{ color: providerHealthColor, fontWeight: 600, textAlign: 'right', minWidth: 0 }}>
                {providerDisplayName} — {providerHealth}
              </span>
            )}
          </div>
          <div style={DIAG_ROW}>
            <span style={{ color: 'var(--text-muted)' }}>Model:</span>
            <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.82rem', textAlign: 'right', minWidth: 0 }}>
              {providerState === 'ok' && providerInfo ? providerInfo.model : '—'}
            </span>
          </div>
          <div style={DIAG_ROW}>
            <span style={{ color: 'var(--text-muted)' }}>Last Successful Response:</span>
            <span style={{ fontWeight: 600, textAlign: 'right', minWidth: 0 }}>
              {providerState === 'ok' && providerInfo ? formatTimestamp(providerInfo.lastSuccessAt) : '—'}
            </span>
          </div>
          <div style={{ ...DIAG_ROW, borderBottom: 'none' }}>
            <span style={{ color: 'var(--text-muted)' }}>Last Failure:</span>
            <span style={{ fontWeight: 600, textAlign: 'right', minWidth: 0, color: providerInfo?.lastFailureDetail ? 'var(--danger)' : 'var(--text-primary)' }}>
              {providerState === 'ok' && providerInfo
                ? providerInfo.lastFailureDetail
                  ? `${formatTimestamp(providerInfo.lastFailureAt)} — ${providerInfo.lastFailureDetail}`
                  : '—'
                : '—'}
            </span>
          </div>
          {providerState === 'ok' && providerInfo && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.45, margin: 0 }}>
              {providerInfo.detail}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTestingConnection || providerState !== 'ok' || !providerInfo?.apiKeyConfigured}
            className="btn btn-secondary btn-sm"
            title={providerInfo && !providerInfo.apiKeyConfigured ? 'Set GEMINI_API_KEY on the server to enable the live connection test' : 'Send a minimal real request to Gemini'}
          >
            <Zap size={14} />
            <span>{isTestingConnection ? 'Testing Connection...' : 'Test Connection'}</span>
          </button>
          {providerState === 'ok' && providerInfo && !providerInfo.apiKeyConfigured && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Live test unavailable until a Gemini API key is configured on the server.
            </span>
          )}
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.5, marginTop: '1.25rem', marginBottom: 0 }}>
          Provider credentials are managed on the server and are never sent to the browser. To change the
          provider, update the environment variables in the Render dashboard (Environment tab) and redeploy:
          set <code>GEMINI_API_KEY</code> to enable Gemini, optionally <code>GEMINI_MODEL</code> to override
          the model, or <code>AI_PROVIDER=deterministic</code> to force the offline engine. There is no
          frontend-only toggle because the API key must stay on the server.
        </p>
      </div>

      {/* System Diagnostics */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Server size={18} color="#f59e0b" /> System Diagnostics
        </h3>
        <div aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem' }}>
          <div style={DIAG_ROW}>
            <span style={{ color: 'var(--text-muted)' }}>Backend Express API Status:</span>
            {healthState === 'loading' && (
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Checking&hellip;</span>
            )}
            {healthState === 'ok' && (
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>&check; {healthInfo?.status || 'Online'}</span>
            )}
            {healthState === 'error' && (
              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>&times; Unreachable</span>
            )}
          </div>
          <div style={DIAG_ROW}>
            <span style={{ color: 'var(--text-muted)' }}>Database Persistence:</span>
            <span style={{ color: healthState === 'error' ? 'var(--text-muted)' : 'var(--success)', fontWeight: 600 }}>
              {healthState === 'error' ? 'Unknown' : 'Transactional JSON Store Active'}
            </span>
          </div>
          <div style={{ ...DIAG_ROW, borderBottom: 'none' }}>
            <span style={{ color: 'var(--text-muted)' }}>AI Provider Mode:</span>
            {providerState === 'loading' && (
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Checking&hellip;</span>
            )}
            {providerState === 'error' && (
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Unknown</span>
            )}
            {providerState === 'ok' && providerDisplayName && (
              <span style={{ color: providerHealthColor, fontWeight: 600, textAlign: 'right', minWidth: 0 }}>
                {providerDisplayName === 'Gemini AI'
                  ? `Gemini AI — ${providerHealth}`
                  : `Deterministic Fallback — ${providerHealth === 'Not configured' ? 'Active' : providerHealth}`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
