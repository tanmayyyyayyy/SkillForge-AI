import React, { useState, useEffect } from 'react';
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
  ChevronRight
} from 'lucide-react';

export const ProofOfSkillPage: React.FC = () => {
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
        // Refresh evidence list
        const evRes = await api.proofOfSkill.getEvidence();
        setEvidenceList(evRes.evidence);
      }
    } catch (err: any) {
      alert(err.message || 'Evaluation failed.');
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <div className="spin" style={{ width: 40, height: 40, border: '3px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', marginBottom: '1rem' }} />
          <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-primary)' }}>Loading Practical Verification Suite...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: 1240, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
            <div style={{ padding: '0.45rem', borderRadius: 8, background: 'rgba(211, 138, 25, 0.12)', color: 'var(--color-accent)' }}>
              <Award size={22} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Proof of Skill
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
            Practical engineering challenges with automated validation. Replaces self-reported claims with objective evidence.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', borderRadius: 20, background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ShieldCheck size={15} /> Verified Skills: <strong>{evidenceList.length}</strong>
          </span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 320px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Challenge List & Evidence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.85rem', color: 'var(--text-primary)' }}>
              Available Practical Challenges
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {challenges.map(c => {
                const isSelected = selectedChallenge?.id === c.id;
                const isVerified = evidenceList.some(e => e.challengeId === c.id);

                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelectChallenge(c)}
                    style={{
                      textAlign: 'left',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(211, 138, 25, 0.12)' : 'var(--bg-surface)',
                      border: isSelected ? '1px solid var(--color-accent)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem', color: isSelected ? 'var(--color-accent)' : 'var(--text-primary)' }}>
                        {c.title}
                      </span>
                      {isVerified && <CheckCircle2 size={16} color="#10b981" />}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>{c.targetSkillName}</span> • <span>{c.difficulty}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Verified Evidence Log */}
          {evidenceList.length > 0 && (
            <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.75rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileCheck2 size={16} color="var(--color-accent)" /> Verified Evidence Records
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {evidenceList.map(e => (
                  <div key={e.id} style={{ padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <span>{e.skillName}</span>
                      <span style={{ color: '#10b981' }}>{e.scorePercentage}%</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Challenge Description Card */}
            <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    {selectedChallenge.title}
                  </h2>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Target Skill: <strong style={{ color: 'var(--color-accent)' }}>{selectedChallenge.targetSkillName}</strong></span>
                    <span>•</span>
                    <span>Est. Time: {selectedChallenge.timeEstimateMinutes} mins</span>
                    <span>•</span>
                    <span>Pass Threshold: {selectedChallenge.passingScorePercentage}%</span>
                  </div>
                </div>
                <span style={{ padding: '0.25rem 0.65rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700, background: 'rgba(211, 138, 25, 0.15)', color: 'var(--color-accent)' }}>
                  {selectedChallenge.difficulty}
                </span>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5, margin: '0 0 1rem' }}>
                {selectedChallenge.description}
              </p>

              {/* Instructions & Constraints */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>Instructions</h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>{selectedChallenge.instructions}</p>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>Constraints</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.15rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {selectedChallenge.constraints.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Test Cases Preview */}
              <div>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
                  Validation Assertions ({selectedChallenge.testCases.length} suites)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {selectedChallenge.testCases.map((tc, idx) => (
                    <div key={tc.id} style={{ padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(48, 35, 25, 0.03)', border: '1px solid var(--border-subtle)', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-primary)' }}>Test #{idx + 1}: {tc.description}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{tc.expectedOutput}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Code Solution Editor */}
            <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  <Code2 size={16} color="var(--color-accent)" /> Solution Implementation
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Safe static evaluation runner</span>
              </div>

              <textarea
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                rows={12}
                placeholder="// Enter your solution here..."
                style={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: '#1e1e1e',
                  color: '#d4d4d4',
                  border: '1px solid var(--border-subtle)',
                  resize: 'vertical',
                  marginBottom: '1rem',
                  lineHeight: 1.45
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  onClick={handleEvaluate}
                  disabled={evaluating || solution.trim().length === 0}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Play size={16} />
                  <span>{evaluating ? 'Running Assertions...' : 'Run Automated Tests'}</span>
                </button>
              </div>
            </div>

            {/* Evaluation Results Banner */}
            {evaluationResult && (
              <div
                className="card"
                style={{
                  background: evaluationResult.passed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: evaluationResult.passed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {evaluationResult.passed ? <CheckCircle2 size={22} color="#10b981" /> : <XCircle size={22} color="#ef4444" />}
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      {evaluationResult.passed ? 'Challenge Passed & Verified!' : 'Verification Incomplete'}
                    </h3>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: evaluationResult.passed ? '#10b981' : '#ef4444' }}>
                    {evaluationResult.scorePercentage}%
                  </div>
                </div>

                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0 0 1rem' }}>
                  {evaluationResult.explanation}
                </p>

                {/* Individual Test Results */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {evaluationResult.testResults.map((tr) => (
                    <div
                      key={tr.testCaseId}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.8rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        {tr.passed ? <CheckCircle2 size={14} color="#10b981" /> : <XCircle size={14} color="#ef4444" />}
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{tr.description}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: tr.passed ? '#10b981' : '#ef4444' }}>
                        {tr.passed ? 'PASSED' : tr.error || 'FAILED'} ({tr.executionTimeMs}ms)
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
