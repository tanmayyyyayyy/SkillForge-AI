import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import type {
  ProofOfSkillChallenge,
  ProofOfSkillEvaluationResult,
  ProofOfSkillEvidenceRecord
} from '../types/index.js';
import {
  Award,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Code2,
  FileCheck2,
  ChevronRight,
  Terminal
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProofOfSkillPage: React.FC = () => {
  const toast = useToast();
  const [challenges, setChallenges] = useState<ProofOfSkillChallenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<ProofOfSkillChallenge | null>(null);
  const [solution, setSolution] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<ProofOfSkillEvaluationResult | null>(null);
  const [evidenceList, setEvidenceList] = useState<ProofOfSkillEvidenceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [challengesRes, evidenceRes] = await Promise.all([
        api.proofOfSkill.getChallenges(),
        api.proofOfSkill.getEvidence()
      ]);

      setChallenges(challengesRes.challenges);
      setEvidenceList(evidenceRes.evidence);

      if (challengesRes.challenges.length > 0) {
        setSelectedChallenge(challengesRes.challenges[0]);
        setSolution(challengesRes.challenges[0].starterCode || '');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load Proof of Skill challenges.');
      toast.error('Failed to load Proof of Skill challenges.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChallenge = (c: ProofOfSkillChallenge) => {
    setSelectedChallenge(c);
    setSolution(c.starterCode || '');
    setEvaluationResult(null);
  };

  const handleEvaluate = async () => {
    if (!selectedChallenge) return;
    try {
      setEvaluating(true);
      const res = await api.proofOfSkill.evaluate(selectedChallenge.id, solution);
      setEvaluationResult(res.result);

      if (res.result.passed) {
        toast.success(`Challenge passed! Awarded ${res.result.scorePercentage}% score.`);
        const evRes = await api.proofOfSkill.getEvidence();
        setEvidenceList(evRes.evidence);
      } else {
        toast.error(`Evaluation failed: ${res.result.explanation}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Evaluation failed.');
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div role="status" aria-live="polite" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spin" aria-hidden="true" style={{ width: 40, height: 40, border: '3px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', margin: '0 auto 1.25rem' }} />
          <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', fontSize: '1.4rem' }}>Loading Practical Verification Suite...</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
            Preparing objective code tests and test assertions.
          </p>
        </div>
      </div>
    );
  }

  if (error || challenges.length === 0) {
    return (
      <div className="card" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: 600, margin: '3rem auto' }}>
        <AlertTriangle size={44} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', fontSize: '1.4rem', marginBottom: '0.5rem' }}>
          Unable to Load Challenges
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
          {error || 'No challenges currently available.'}
        </p>
        <button onClick={loadData} className="btn btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="os-page-container">
      {/* Header */}
      <header className="os-header">
        <div className="os-header-left">
          <div className="os-header-icon">
            <Award size={24} />
          </div>
          <div>
            <h1 className="os-header-title">Proof of Skill</h1>
            <p className="os-header-subtitle">
              Practical engineering challenges with automated validation. Replaces self-reported claims with objective evidence.
            </p>
          </div>
        </div>

        <div className="os-header-actions">
          <span className="os-chip os-chip-success">
            <ShieldCheck size={14} />
            <span>Verified Skills: <strong>{evidenceList.length}</strong></span>
          </span>
          <Link to="/evidence-graph" className="btn btn-secondary btn-sm">
            Evidence Graph
          </Link>
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <div className="os-grid-sidebar">
        {/* Left Column: Challenge List & Verified Evidence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ fontSize: '1rem' }}>
                <Terminal size={17} color="var(--color-accent)" />
                Available Challenges
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {challenges.map(c => {
                const isSelected = selectedChallenge?.id === c.id;
                const isVerified = evidenceList.some(e => e.challengeId === c.id);

                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelectChallenge(c)}
                    style={{
                      display: 'block',
                      width: '100%',
                      maxWidth: '100%',
                      minWidth: 0,
                      textAlign: 'left',
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(211, 138, 25, 0.12)' : 'var(--bg-surface)',
                      border: isSelected ? '1.5px solid var(--color-accent)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      whiteSpace: 'normal',
                      overflowWrap: 'anywhere',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isSelected ? 'var(--color-accent)' : 'var(--text-primary)', minWidth: 0, overflowWrap: 'anywhere' }}>
                        {c.title}
                      </span>
                      {isVerified && <CheckCircle2 size={16} color="var(--success)" style={{ flexShrink: 0 }} />}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'center', minWidth: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{c.targetSkillName}</span> • <span className="os-chip" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>{c.difficulty}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Verified Evidence Log */}
          {evidenceList.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title" style={{ fontSize: '1rem' }}>
                  <FileCheck2 size={17} color="var(--success)" />
                  Verified Evidence
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {evidenceList.map(e => (
                  <div
                    key={e.id}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.82rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text-primary)' }}>
                      <span>{e.skillName}</span>
                      <span style={{ color: 'var(--success)' }}>{e.scorePercentage}%</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {e.passedTests}/{e.totalTests} tests • {new Date(e.completedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Challenge Workspace */}
        {selectedChallenge && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Challenge Description Card */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    {selectedChallenge.title}
                  </h2>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginTop: '0.4rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <span>Skill: <strong style={{ color: 'var(--color-accent)' }}>{selectedChallenge.targetSkillName}</strong></span>
                    <span>•</span>
                    <span>Est. Time: {selectedChallenge.timeEstimateMinutes} mins</span>
                    <span>•</span>
                    <span>Passing Score: {selectedChallenge.passingScorePercentage}%</span>
                  </div>
                </div>

                <span className="badge badge-accent">
                  {selectedChallenge.difficulty}
                </span>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                {selectedChallenge.description}
              </p>

              {/* Instructions & Constraints */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.45rem' }}>
                    Instructions
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                    {selectedChallenge.instructions}
                  </p>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.45rem' }}>
                    Constraints
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.15rem', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {selectedChallenge.constraints.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Expected Test Assertions */}
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  Validation Assertions ({selectedChallenge.testCases.length} tests)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {selectedChallenge.testCases.map((tc, idx) => (
                    <div
                      key={tc.id}
                      style={{
                        padding: '0.55rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-card-hover)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.8rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <span style={{ color: 'var(--text-primary)' }}>Test #{idx + 1}: {tc.description}</span>
                      <span className="os-chip" style={{ fontSize: '0.72rem' }}>{tc.expectedOutput}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Code Solution Editor */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title" style={{ fontSize: '1.05rem' }}>
                  <Code2 size={18} color="var(--color-accent)" />
                  Solution Implementation
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Safe deterministic execution</span>
              </div>

              <textarea
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                rows={12}
                placeholder="// Enter your solution here..."
                className="form-textarea"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                  minHeight: '220px',
                  marginBottom: '1.25rem'
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  onClick={handleEvaluate}
                  disabled={evaluating || solution.trim().length === 0}
                  className="btn btn-primary"
                >
                  {evaluating ? (
                    <>
                      <div className="spin" style={{ width: 16, height: 16, border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%' }} />
                      <span>Running Automated Tests...</span>
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      <span>Run Automated Tests</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Evaluation Results Feedback */}
            {evaluationResult && (
              <div
                className="card"
                style={{
                  borderColor: evaluationResult.passed ? 'rgba(45, 106, 79, 0.4)' : 'rgba(153, 27, 27, 0.4)',
                  background: evaluationResult.passed ? 'rgba(45, 106, 79, 0.05)' : 'rgba(153, 27, 27, 0.05)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    {evaluationResult.passed ? (
                      <CheckCircle2 size={24} color="var(--success)" />
                    ) : (
                      <XCircle size={24} color="var(--danger)" />
                    )}
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                        {evaluationResult.passed ? 'Challenge Passed & Verified!' : 'Tests Incomplete or Failed'}
                      </h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Score: <strong>{evaluationResult.scorePercentage}%</strong> ({evaluationResult.testResults.filter(t => t.passed).length}/{evaluationResult.testResults.length} assertions passed)
                      </div>
                    </div>
                  </div>

                  <span className={`badge ${evaluationResult.passed ? 'badge-mastered' : 'badge-critical'}`}>
                    {(evaluationResult.evidenceRecord?.evidenceStatus || (evaluationResult.passed ? 'verified_automated_test' : 'unverified')).replace('_', ' ')}
                  </span>
                </div>

                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '1rem' }}>
                  {evaluationResult.explanation}
                </p>

                {/* Individual Test Suite Results */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {evaluationResult.testResults.map((tr) => (
                    <div
                      key={tr.testCaseId}
                      style={{
                        padding: '0.65rem 0.9rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.82rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {tr.passed ? (
                          <CheckCircle2 size={16} color="var(--success)" />
                        ) : (
                          <XCircle size={16} color="var(--danger)" />
                        )}
                        <span style={{ color: 'var(--text-primary)', fontWeight: tr.passed ? 500 : 700 }}>
                          {tr.description}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: tr.passed ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                        {tr.passed ? 'Passed' : tr.error || 'Failed'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
