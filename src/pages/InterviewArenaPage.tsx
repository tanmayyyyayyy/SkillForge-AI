import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import type {
  InterviewMode,
  InterviewSession,
  InterviewAnswerEvaluation,
  InterviewScorecard
} from '../types/index.js';
import {
  Swords,
  Mic,
  MicOff,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
  Sparkles,
  RefreshCw,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const INTERVIEW_MODES: Array<{ mode: InterviewMode; title: string; desc: string }> = [
  { mode: 'technical', title: 'Technical Interview', desc: 'Core computer science fundamentals, runtime mechanics, and problem-solving.' },
  { mode: 'project_deep_dive', title: 'Project Deep Dive', desc: 'Explores real architecture decisions, trade-offs, and failure handling in your projects.' },
  { mode: 'system_design', title: 'System Design', desc: 'Distributed architecture, scalability, storage choices, and high availability.' },
  { mode: 'behavioral', title: 'Behavioral & Leadership', desc: 'Collaboration, conflict resolution, technical ownership, and STAR method delivery.' },
  { mode: 'resume_defense', title: 'Resume Defense', desc: 'Validates claims on your profile against technical questioning and edge cases.' },
  { mode: 'rapid_fire', title: 'Rapid-Fire Drills', desc: 'Fast-paced conceptual questions testing quick recall and clarity under pressure.' }
];

export const InterviewArenaPage: React.FC = () => {
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
      console.error('Failed to load interview sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();

    // Check Speech Recognition support in browser
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

      rec.onerror = () => {
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

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
    } catch (err: any) {
      alert(err.message || 'Failed to start interview session.');
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
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.warn('Speech recognition error:', err);
      }
    }
  };

  const handleSubmitAnswer = async () => {
    if (!activeSession || !userAnswer.trim()) return;
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
    } catch (err: any) {
      alert(err.message || 'Failed to submit answer.');
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
    } catch (err: any) {
      alert(err.message || 'Failed to finalize session.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <div className="spin" style={{ width: 40, height: 40, border: '3px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', marginBottom: '1rem' }} />
          <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-primary)' }}>Entering Interview Arena...</h3>
        </div>
      </div>
    );
  }

  // Active Session or Scorecard View
  const currentQuestion = activeSession?.status === 'in_progress'
    ? activeSession.questions[activeSession.currentQuestionIndex]
    : null;

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
            <div style={{ padding: '0.45rem', borderRadius: 8, background: 'rgba(211, 138, 25, 0.12)', color: 'var(--color-accent)' }}>
              <Swords size={22} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Interview Arena
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
            Adaptive mock interview platform evaluating correctness, technical depth, and trade-offs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span className="badge badge-accent" style={{ fontSize: '0.75rem' }}>
            {sessions.length} Recorded Session{sessions.length === 1 ? '' : 's'}
          </span>
          {activeSession && activeSession.status === 'in_progress' && (
            <button onClick={handleFinishEarly} className="btn btn-secondary btn-sm" disabled={submitting}>
              Finish Session Early
            </button>
          )}
        </div>
      </div>

      {/* No active session: Mode Selection Grid */}
      {(!activeSession || activeSession.status === 'completed') && (
        <>
          {activeSession?.scorecard && (
            <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Award size={24} color="#10b981" />
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Interview Session Scorecard ({activeSession.scorecard.percentageScore}%)
                  </h2>
                </div>
                <button onClick={() => setActiveSession(null)} className="btn btn-secondary btn-sm">
                  Start New Session
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981', margin: '0 0 0.5rem' }}>Top Strengths Demonstrated</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.15rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {activeSession.scorecard.topStrengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ef4444', margin: '0 0 0.5rem' }}>Gaps & Areas to Sharpen</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.15rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {activeSession.scorecard.criticalGaps.map((g, idx) => (
                      <li key={idx}>{g}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                {activeSession.scorecard.disclaimer}
              </p>
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Choose Interview Simulation Mode
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              Select a mode to initiate an adaptive session calibrated to your target career track.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {INTERVIEW_MODES.map(m => (
                <div
                  key={m.mode}
                  className="card"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 6px rgba(48, 35, 25, 0.04)'
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>
                      {m.title}
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: '0 0 1rem' }}>
                      {m.desc}
                    </p>
                  </div>

                  <button
                    onClick={() => handleStartSession(m.mode)}
                    disabled={creating}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Start {m.title}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Active Session Questions & Responses */}
      {activeSession && activeSession.status === 'in_progress' && currentQuestion && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Question Progression Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-accent)' }}>
              Question {activeSession.currentQuestionIndex + 1} of {activeSession.questions.length}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Mode: {activeSession.mode.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          {/* Question Card */}
          <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {currentQuestion.category}
            </span>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--text-primary)', lineHeight: 1.4 }}>
              {currentQuestion.question}
            </h2>
            {currentQuestion.context && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: '0 0 1rem' }}>
                Context: {currentQuestion.context}
              </p>
            )}

            <div style={{ background: 'var(--bg-surface)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <strong>Evaluator Rubric Focus:</strong> {currentQuestion.rubric.expectedKeyPoints.join(' • ')}
            </div>
          </div>

          {/* Answer Input Workspace */}
          <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Your Technical Answer
              </span>
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`btn btn-sm ${isRecording ? 'btn-danger' : 'btn-secondary'}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                  <span>{isRecording ? 'Stop Voice' : 'Voice Input'}</span>
                </button>
              )}
            </div>

            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              rows={6}
              placeholder="Structure your answer with reasoning, architecture decisions, and operational trade-offs..."
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                marginBottom: '1rem',
                lineHeight: 1.5,
                resize: 'vertical'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleSubmitAnswer}
                disabled={submitting || userAnswer.trim().length === 0}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Send size={15} />
                <span>{submitting ? 'Evaluating with Rubrics...' : 'Submit Answer'}</span>
              </button>
            </div>
          </div>

          {/* Previous Evaluation Feedback (if just answered) */}
          {latestEvaluation && (
            <div className="card" style={{ background: 'rgba(211, 138, 25, 0.06)', border: '1px solid rgba(211, 138, 25, 0.3)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Evaluator Feedback (Score: {latestEvaluation.scoreOutOf10}/10)
                </h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Evaluated by: {latestEvaluation.evaluatedBy}
                </span>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0 0 0.85rem' }}>
                {latestEvaluation.qualitativeFeedback}
              </p>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                <strong>Tip for Next Question:</strong> {latestEvaluation.suggestedImprovement}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
