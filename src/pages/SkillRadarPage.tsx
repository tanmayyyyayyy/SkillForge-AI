import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import type { SkillRadarData, SkillPrioritizationItem } from '../types/index.js';
import {
  Radio,
  Compass,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  BarChart2,
  Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const SkillRadarPage: React.FC = () => {
  const [data, setData] = useState<SkillRadarData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'prioritized' | 'demand' | 'cooccurrence'>('prioritized');

  useEffect(() => {
    fetchRadar();
  }, []);

  const fetchRadar = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.skillRadar.get();
      setData(res.radar);
    } catch (err: any) {
      setError(err.message || 'Failed to load SkillForge Radar analysis.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div role="status" aria-live="polite" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spin" aria-hidden="true" style={{ width: 40, height: 40, border: '3px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', margin: '0 auto 1.25rem' }} />
          <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', fontSize: '1.4rem' }}>Analyzing Market Skill Intelligence...</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
            Aggregating skills and co-occurrences across verified job postings.
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: 600, margin: '3rem auto' }}>
        <AlertCircle size={44} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', fontSize: '1.4rem', marginBottom: '0.5rem' }}>
          Failed to Load Radar
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
          {error || 'Unable to load market data.'}
        </p>
        <button onClick={fetchRadar} className="btn btn-primary">Retry Analysis</button>
      </div>
    );
  }

  return (
    <div className="os-page-container">
      {/* Header */}
      <header className="os-header">
        <div className="os-header-left">
          <div className="os-header-icon">
            <Radio size={24} />
          </div>
          <div>
            <h1 className="os-header-title">SkillForge Radar</h1>
            <p className="os-header-subtitle">
              Market skill demand, prioritization, and explainability for <strong style={{ color: 'var(--color-accent)' }}>{data.targetRole.title}</strong>
            </p>
          </div>
        </div>

        <div className="os-header-actions">
          <span className="os-chip">
            Sample: <strong>{data.sampleSize} JDs Analyzed</strong>
          </span>
          <button onClick={fetchRadar} className="btn btn-secondary btn-sm" title="Refresh Analysis">
            Refresh
          </button>
        </div>
      </header>

      {/* Data Integrity Notice */}
      <div
        className="card"
        style={{
          padding: '0.85rem 1.2rem',
          background: 'rgba(211, 138, 25, 0.08)',
          borderColor: 'rgba(211, 138, 25, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}
      >
        <Compass size={18} color="var(--color-accent)" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
          {data.dataIntegrityNotice}
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('prioritized')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'prioritized' ? '2.5px solid var(--color-accent)' : '2.5px solid transparent',
            color: activeTab === 'prioritized' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'prioritized' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}
        >
          <TrendingUp size={16} color={activeTab === 'prioritized' ? 'var(--color-accent)' : 'inherit'} />
          <span>Skill Prioritization Matrix ({data.prioritizedSkills.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('demand')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'demand' ? '2.5px solid var(--color-accent)' : '2.5px solid transparent',
            color: activeTab === 'demand' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'demand' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}
        >
          <BarChart2 size={16} color={activeTab === 'demand' ? 'var(--color-accent)' : 'inherit'} />
          <span>Market Skill Demand</span>
        </button>

        <button
          onClick={() => setActiveTab('cooccurrence')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'cooccurrence' ? '2.5px solid var(--color-accent)' : '2.5px solid transparent',
            color: activeTab === 'cooccurrence' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'cooccurrence' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}
        >
          <Layers size={16} color={activeTab === 'cooccurrence' ? 'var(--color-accent)' : 'inherit'} />
          <span>Co-occurrence Network</span>
        </button>
      </div>

      {/* Tab 1: Prioritization Matrix */}
      {activeTab === 'prioritized' && (
        <div className="os-grid-2">
          {data.prioritizedSkills.map((item: SkillPrioritizationItem) => {
            const isCritical = item.importanceTier === 'Critical';
            const isHigh = item.importanceTier === 'High';
            return (
              <div
                key={item.skillId}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.25rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>
                        {item.name}
                      </h3>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.category}</span>
                    </div>
                    <span className={`badge ${isCritical ? 'badge-critical' : isHigh ? 'badge-high' : 'badge-medium'}`}>
                      {item.importanceTier} Priority
                    </span>
                  </div>

                  {/* Proficiency Gap Meter */}
                  <div style={{ background: 'var(--bg-surface)', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-md)', marginBottom: '0.9rem', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Current: Level {item.userProficiency}/5</span>
                      <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>Target: Level {item.targetProficiency}/5</span>
                    </div>
                    <div style={{ height: 7, background: 'rgba(48, 35, 25, 0.1)', borderRadius: 4, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, (item.userProficiency / item.targetProficiency) * 100)}%`,
                          background: item.gap === 0 ? 'var(--success)' : 'var(--color-accent)',
                          borderRadius: 4,
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </div>

                  {/* Explainability Block */}
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.85rem', lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Why it matters:</strong> {item.whyItMatters}
                  </div>

                  <div style={{ fontSize: '0.8rem', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                      <ShieldCheck size={14} color="var(--color-accent)" /> Verified Evidence:
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {item.currentEvidenceNotes}
                    </div>
                  </div>
                </div>

                {/* Contained Action Button */}
                <Link
                  to={item.recommendedNextAction.route}
                  className="btn btn-primary btn-sm btn-block"
                >
                  <span>{item.recommendedNextAction.label}</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Frequently Requested Skills */}
      {activeTab === 'demand' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <BarChart2 size={20} color="var(--color-accent)" />
              Skill Demand Frequency Distribution
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
            Percentage of workspace job postings requiring or preferring each skill within {data.targetRole.title}.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {data.frequentlyRequestedSkills.map((skill) => (
              <div key={skill.skillId} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{skill.name}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({skill.category})</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{skill.requiredCount} Required</span>
                    <span style={{ color: 'var(--info)', fontWeight: 600 }}>{skill.preferredCount} Preferred</span>
                    <span className="badge badge-accent">{skill.percentageOfSample}% Demand</span>
                  </div>
                </div>

                <div style={{ height: 9, background: 'var(--color-progress-track)', borderRadius: 5, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${skill.percentageOfSample}%`,
                      background: 'linear-gradient(90deg, var(--color-accent) 0%, #F5A623 100%)',
                      borderRadius: 5
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Co-occurrences */}
      {activeTab === 'cooccurrence' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Layers size={20} color="var(--color-accent)" />
              Skill Co-occurrence Network
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
            Technologies and core capabilities that frequently bundle together in hiring specifications.
          </p>

          <div className="os-grid-3">
            {data.cooccurrences.map((pair, idx) => (
              <div
                key={idx}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  <strong>{pair.skillA}</strong> <span style={{ color: 'var(--color-accent)' }}>↔</span> <strong>{pair.skillB}</strong>
                </div>
                <span className="os-chip os-chip-accent">
                  {pair.cooccurrenceCount} JDs
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
