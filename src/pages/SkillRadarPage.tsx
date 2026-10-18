import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import type { SkillRadarData, SkillDemandItem, SkillPrioritizationItem } from '../types/index.js';
import { Radar, Compass, TrendingUp, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2, BarChart2, Layers } from 'lucide-react';
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
      <div className="page-container" style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <div className="spin" style={{ width: 40, height: 40, border: '3px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', marginBottom: '1rem' }} />
          <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-primary)' }}>Analyzing Market Skill Intelligence...</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Aggregating skills and co-occurrences across verified job postings.</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-container" style={{ padding: '2rem 1.5rem' }}>
        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: '2rem', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
          <AlertCircle size={40} color="var(--color-danger, #d9534f)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: 'var(--text-primary)' }}>Failed to Load Radar</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error || 'Unable to load market data.'}</p>
          <button onClick={fetchRadar} className="btn btn-primary">Retry Analysis</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
            <div style={{ padding: '0.45rem', borderRadius: 8, background: 'rgba(211, 138, 25, 0.12)', color: 'var(--color-accent)' }}>
              <Radar size={22} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              SkillForge Radar
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
            Market skill demand, prioritization, and explainability for <strong style={{ color: 'var(--color-accent)' }}>{data.targetRole.title}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', borderRadius: 20, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
            Sample Size: <strong>{data.sampleSize} JDs Analyzed</strong>
          </span>
          <button onClick={fetchRadar} className="btn btn-secondary btn-sm" title="Refresh Analysis">
            Refresh
          </button>
        </div>
      </div>

      {/* Data Integrity Alert */}
      <div style={{ padding: '0.85rem 1.15rem', borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Compass size={18} color="#3b82f6" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
          {data.dataIntegrityNotice}
        </span>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('prioritized')}
          style={{
            padding: '0.65rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'prioritized' ? '2px solid var(--color-accent)' : '2px solid transparent',
            color: activeTab === 'prioritized' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'prioritized' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <TrendingUp size={16} /> Skill Prioritization Matrix ({data.prioritizedSkills.length})
        </button>
        <button
          onClick={() => setActiveTab('demand')}
          style={{
            padding: '0.65rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'demand' ? '2px solid var(--color-accent)' : '2px solid transparent',
            color: activeTab === 'demand' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'demand' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <BarChart2 size={16} /> Market Skill Demand
        </button>
        <button
          onClick={() => setActiveTab('cooccurrence')}
          style={{
            padding: '0.65rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'cooccurrence' ? '2px solid var(--color-accent)' : '2px solid transparent',
            color: activeTab === 'cooccurrence' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'cooccurrence' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Layers size={16} /> Co-occurrence Network
        </button>
      </div>

      {/* Tab 1: Prioritization */}
      {activeTab === 'prioritized' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {data.prioritizedSkills.map((item) => (
            <div
              key={item.skillId}
              className="card"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 2px 8px rgba(48, 35, 25, 0.04)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.2rem', color: 'var(--text-primary)' }}>
                      {item.name}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.category}</span>
                  </div>
                  <span
                    style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: 12,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: item.importanceTier === 'Critical' ? 'rgba(239, 68, 68, 0.12)' : item.importanceTier === 'High' ? 'rgba(211, 138, 25, 0.15)' : 'rgba(59, 130, 246, 0.12)',
                      color: item.importanceTier === 'Critical' ? '#ef4444' : item.importanceTier === 'High' ? 'var(--color-accent)' : '#3b82f6'
                    }}
                  >
                    {item.importanceTier} Priority
                  </span>
                </div>

                {/* Proficiency Gap Bar */}
                <div style={{ background: 'var(--bg-surface)', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Current: Level {item.userProficiency}/5</span>
                    <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Target: Level {item.targetProficiency}/5</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(0,0,0,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, (item.userProficiency / item.targetProficiency) * 100)}%`,
                        background: item.gap === 0 ? '#10b981' : 'var(--color-accent)',
                        borderRadius: 3
                      }}
                    />
                  </div>
                </div>

                {/* Explainability Block */}
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.45 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Why it matters:</strong> {item.whyItMatters}
                </div>

                <div style={{ fontSize: '0.8rem', padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-sm)', background: 'rgba(48, 35, 25, 0.03)', border: '1px solid var(--border-subtle)', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.76rem', marginBottom: '0.2rem' }}>
                    <ShieldCheck size={14} color="var(--color-accent)" /> Current Evidence:
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                    {item.currentEvidenceNotes}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Link
                to={item.recommendedNextAction.route}
                className="btn btn-primary btn-sm"
                style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span>{item.recommendedNextAction.label}</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Frequently Requested Skills */}
      {activeTab === 'demand' && (
        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Skill Demand Frequency Distribution
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Percentage of workspace job postings requiring or preferring each skill.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.frequentlyRequestedSkills.map((skill) => (
              <div key={skill.skillId} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{skill.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({skill.category})</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem' }}>
                    <span style={{ color: '#ef4444' }}>{skill.requiredCount} Required</span>
                    <span style={{ color: '#3b82f6' }}>{skill.preferredCount} Preferred</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>{skill.percentageOfSample}%</span>
                  </div>
                </div>

                <div style={{ height: 8, background: 'rgba(0,0,0,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${skill.percentageOfSample}%`,
                      background: 'linear-gradient(90deg, #D38A19 0%, #F5A623 100%)',
                      borderRadius: 4
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
        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Skill Co-occurrence Network
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Skills that frequently appear bundled together in hiring specifications.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {data.cooccurrences.map((pair, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <strong>{pair.skillA}</strong> <span style={{ color: 'var(--color-accent)' }}>↔</span> <strong>{pair.skillB}</strong>
                </div>
                <span style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem', borderRadius: 10, background: 'rgba(211, 138, 25, 0.12)', color: 'var(--color-accent)', fontWeight: 600 }}>
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
