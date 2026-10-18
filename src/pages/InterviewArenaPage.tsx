import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import type {
  InterviewMode,
  InterviewSession,
  InterviewAnswerEvaluation
} from '../types/index.js';
import {
  Swords,
  Mic,
  MicOff,
  Send,
  CheckCircle2,
  AlertCircle,
  Award,
  Sparkles,
  ArrowRight,
  Clock,
  HelpCircle,
  RotateCcw
} from 'lucide-react';

const INTERVIEW_MODES: Array<{ mode: InterviewMode; title: string; desc: string }> = [
  { mode: 'technical', title: 'Technical Interview', desc: 'Core computer science fundamentals, runtime mechanics, and problem-solving.' },
  { mode: 'project_deep_dive', title: 'Project Deep Dive', desc: 'Explores real architecture decisions, trade-offs, and failure handling in your projects.' },
  { mode: 'system_design', title: 'System Design', desc: 'Distributed architecture, scalability, storage choices, and high availability.' },
  { mode: 'behavioral', title: 'Behavioral & Leadership', desc: 'Collaboration, conflict resolution, technical ownership, and STAR method delivery.' },
  { mode: 'resume_defense', title: 'Resume Defense', desc: 'Validates claims on your profile against technical questioning and edge cases.' },
  { mode: 'rapid_fire', title: 'Rapid-Fire Drills', desc: 'Fast-paced conceptual questions testing quick recall and clarity under pressure.' }
];

export const InterviewArenaPage: React.FC = () => {
  const toast = useToast();
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [latestEvaluation, setLatestEvaluation] = useState<InterviewAnswerEvaluation | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const res = await api.interviewArena.listSessions();
      setSessions(res.sessions);
      const inProg = res.sessions.find(s => s.status === 'in_progress');
      if (inProg) {
        setActiveSession(inProg);
      }
    } catch (err: any) {
      toast.error('Failed to load interview sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setUserAnswer(prev => `${prev} ${transcript}`.trim());
      };

      rec.onerror = () => setIsRecording(false);
      rec.onend = () => setIsRecording(false);

      recognitionRef.current = rec;
    }
  }, []);

  const handleStartSession = async (mode: InterviewMode) => {
    try {
      setCreating(true);
      const res = await api.interviewArena.createSession(mode);
      setActiveSession(res.session);
      setUserAnswer('');
      setLatestEvaluation(null);
      await loadSessions();
      toast.success(`Started ${res.session.mode.replace('_', ' ')} session.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start interview session.');
    } finally {
      setCreating(false);
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setUserAnswer('');
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!activeSession || !userAnswer.trim()) {
      toast.info('Please enter your answer before submitting.');
      return;
    }
    const currentQuestion = activeSession.questions[activeSession.currentQuestionIndex];
    if (!currentQuestion) return;

    try {
      setSubmitting(true);
      if (isRecording && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsRecording(false);
      }

      const res = await api.interviewArena.submitAnswer(activeSession.id, currentQuestion.id, userAnswer);
      setLatestEvaluation(res.evaluation);
      setActiveSession(res.session);
      setUserAnswer('');
      toast.success('Answer evaluated against rubric criteria.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit answer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishEarly = async () => {
    if (!activeSession) return;
    try {
      setSubmitting(true);
      const res = await api.interviewArena.finishSession(activeSession.id);
      setActiveSession(res.session);
      await loadSessions();
      toast.success('Session finalized and scorecard recorded.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to finalize session.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !activeSession) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div role="status" aria-live="polite" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spin" aria-hidden="true" style={{ width: 40, height: 40, border: '3px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', margin: '0 auto 1.25rem' }} />
          <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', fontSize: '1.4rem' }}>Preparing Interview Arena...</h2>
        </div>
      </div>
    );
  }

  const currentQuestion = activeSession?.status === 'in_progress'
    ? activeSession.questions[activeSession.currentQuestionIndex]
    : null;

  return (
    <div className="os-page-container">
      {/* Header */}
      <header className="os-header">
        <div className="os-header-left">
          <div className="os-header-icon">
            <Swords size={24} />
          </div>
          <div>
            <h1 className="os-header-title">Interview Arena</h1>
            <p className="os-header-subtitle">
              Adaptive mock interview platform evaluating correctness, technical depth, and trade-offs.
            </p>
          </div>
        </div>

        <div className="os-header-actions">
          <span className="os-chip os-chip-accent">
            {sessions.length} Recorded Session{sessions.length === 1 ? '' : 's'}
          </span>
          {activeSession && activeSession.status === 'in_progress' && (
            <button onClick={handleFinishEarly} className="btn btn-secondary btn-sm" disabled={submitting}>
              Finish Session Early
            </button>
          )}
        </div>
      </header>

      {/* Mode Selection Grid (When no active session in progress) */}
      {(!activeSession || activeSession.status === 'completed') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Recent Scorecard Banner */}
          {activeSession?.scorecard && (
            <div className="card" style={{ border: '1.5px solid var(--color-accent)', background: 'linear-gradient(135deg, rgba(211, 138, 25, 0.08) 0%, rgba(243, 235, 221, 0.4) 100%)' }}>
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Award size={22} color="var(--color-accent)" />
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Interview Session Scorecard ({activeSession.scorecard.percentageScore}%)
                  </h2>
                </div>
                <button onClick={() => setActiveSession(null)} className="btn btn-secondary btn-sm">
                  Start New Session
                </button>
              </div>

              <div className="os-grid-2" style={{ marginBottom: '1rem' }}>
                <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--success)', margin: '0 0 0.5rem' }}>
                    Top Strengths Demonstrated
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '1.15rem', fontSize: '0.84rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {activeSession.scorecard.topStrengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--danger)', margin: '0 0 0.5rem' }}>
                    Gaps & Areas to Sharpen
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '1.15rem', fontSize: '0.84rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {activeSession.scorecard.criticalGaps.map((g, idx) => (
                      <li key={idx}>{g}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                {activeSession.scorecard.disclaimer}
              </p>
            </div>
          )}

          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
              Choose Interview Simulation Mode
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Select a specialized simulation track calibrated to your target career role.
            </p>

            <div className="os-grid-3">
              {INTERVIEW_MODES.map(m => (
                <div
                  key={m.mode}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1.25rem'
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>
                      {m.title}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
                      {m.desc}
                    </p>
                  </div>

                  <button
                    onClick={() => handleStartSession(m.mode)}
                    disabled={creating}
                    className="btn btn-primary btn-sm btn-block"
                  >
                    <span>Start {m.title}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Session Question & Response Flow */}
      {activeSession && activeSession.status === 'in_progress' && currentQuestion && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Progression Tracker */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span className="badge badge-accent">
              Question {activeSession.currentQuestionIndex + 1} of {activeSession.questions.length}
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Mode: <strong>{activeSession.mode.replace('_', ' ').toUpperCase()}</strong>
            </span>
          </div>

          {/* Question Card */}
          <div className="card">
            <span className="os-chip" style={{ marginBottom: '0.5rem' }}>
              {currentQuestion.category}
            </span>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--text-primary)', lineHeight: 1.35 }}>
              {currentQuestion.question}
            </h2>
            {currentQuestion.context && (
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: '0 0 1rem' }}>
                Scenario: {currentQuestion.context}
              </p>
            )}

            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Expected Key Points:</strong> {currentQuestion.rubric.expectedKeyPoints.join(' • ')}
            </div>
          </div>

          {/* Answer Workspace */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ fontSize: '1rem' }}>
                Your Technical Answer
              </h3>
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`btn btn-sm ${isRecording ? 'btn-danger' : 'btn-secondary'}`}
                >
                  {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                  <span>{isRecording ? 'Stop Recording' : 'Voice Input'}</span>
                </button>
              )}
            </div>

            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              rows={6}
              placeholder="Structure your answer with reasoning, architecture decisions, and operational trade-offs..."
              className="form-textarea"
              style={{
                fontFamily: 'inherit',
                fontSize: '0.92rem',
                minHeight: '140px',
                lineHeight: 1.5,
                marginBottom: '1rem'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleSubmitAnswer}
                disabled={submitting || !userAnswer.trim()}
                className="btn btn-primary"
              >
                {submitting ? (
                  <>
                    <div className="spin" style={{ width: 16, height: 16, border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%' }} />
                    <span>Evaluating Answer...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Submit Answer</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Evaluation Feedback Callout */}
          {latestEvaluation && (
            <div className="card" style={{ background: 'var(--bg-surface)', borderColor: 'rgba(211, 138, 25, 0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={18} color="var(--color-accent)" />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Evaluator Feedback ({latestEvaluation.scoreOutOf10}/10)
                  </h3>
                </div>
                <span className="badge badge-accent">
                  {latestEvaluation.scoreOutOf10 >= 7 ? 'Demonstrated' : 'Needs Depth'}
                </span>
              </div>

              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
                {latestEvaluation.qualitativeFeedback}
              </p>

              {/* Rubric Criteria Grid */}
              <div className="os-grid-3">
                {latestEvaluation.criterionScores && Object.entries(latestEvaluation.criterionScores).map(([criterion, score]) => (
                  <div
                    key={criterion}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem'
                    }}
                  >
                    <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                      {criterion.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <strong style={{ color: 'var(--color-accent)' }}>{Number(score)}/10</strong>
                  </div>
                ))}
              </div>

              {latestEvaluation.suggestedImprovement && (
                <div style={{ marginTop: '0.85rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Key Recommendation: </strong>
                  {latestEvaluation.suggestedImprovement}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
