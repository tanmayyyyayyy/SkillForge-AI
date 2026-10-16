import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import { SkillAssessment } from '../types/index.js';
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export const AssessmentsPage: React.FC = () => {
  const toast = useToast();
  const [assessments, setAssessments] = useState<Array<any>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Quiz State
  const [activeQuiz, setActiveQuiz] = useState<SkillAssessment | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAssessments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.assessments.getAll();
      setAssessments(res.assessments);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load assessments.');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const handleStartQuiz = async (skillId: string) => {
    try {
      setIsLoading(true);
      const res = await api.assessments.getQuestions(skillId);
      setActiveQuiz(res.assessment);
      setSelectedAnswers({});
      setQuizResult(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start assessment.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (quizResult) return; // Locked once submitted
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    const answeredCount = Object.keys(selectedAnswers).length;
    if (answeredCount < (activeQuiz.questions?.length ?? 0)) {
      toast.info(`Please answer all ${activeQuiz.questions?.length ?? 0} questions before submitting.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.assessments.submit(activeQuiz.skillId, selectedAnswers);
      setQuizResult(res);
      toast.success(res.message);
      fetchAssessments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit assessment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !activeQuiz) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div role="status" aria-live="polite" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spin" aria-hidden="true" style={{ width: 36, height: 36, border: '3px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', margin: '0 auto 1rem' }} />
          <div>Loading technical skill assessments...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Skill verification assessments
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.3rem' }}>
            Prove practical mastery through server-graded technical questions. Passing scores (&ge; 75%) officially certify your capability.
          </p>
        </div>

        <div className="card" style={{ padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(211, 138, 25, 0.1)', borderColor: 'rgba(211, 138, 25, 0.25)' }}>
          <ShieldCheck size={18} color="var(--color-accent)" />
          <span style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>
            Verified assessments contribute up to <strong style={{ color: 'var(--color-accent)' }}>+25% to Readiness Score</strong>
          </span>
        </div>
      </div>

      {/* QUIZ VIEW (When active) */}
      {activeQuiz ? (
        <div className="card" style={{ padding: '2rem' }}>
          {/* Quiz Top Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.25rem', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-serif)', color: 'var(--text-primary)' }}>{activeQuiz.skillName} Technical Assessment</h2>
                <span className="badge badge-medium">{activeQuiz.difficulty}</span>
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Passing threshold: {activeQuiz.passingScorePercentage}% &bull; {activeQuiz.questions?.length ?? 0} questions
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => { setActiveQuiz(null); setQuizResult(null); }}
                className="btn btn-secondary btn-sm"
              >
                Back to Assessments
              </button>
            </div>
          </div>

          {/* Graded Result Banner (If already submitted) */}
          {quizResult && (
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '2rem',
                background: quizResult.result?.passed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                border: '1px solid',
                borderColor: quizResult?.result?.passed ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {quizResult.result?.passed ? (
                  <CheckCircle2 size={32} color="var(--success)" />
                ) : (
                  <XCircle size={32} color="var(--danger)" />
                )}
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: quizResult.result?.passed ? 'var(--success)' : 'var(--danger)' }}>
                    {quizResult.result?.passed ? 'Assessment Passed! Skill Verified' : 'Assessment Completed (Needs Review)'}
                  </div>
                  <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                    Score: <strong>{quizResult.result?.scorePercentage}%</strong> ({quizResult.result?.correctAnswersCount}/{quizResult.result?.totalQuestions} questions correct)
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleStartQuiz(activeQuiz.skillId)}
                className="btn btn-secondary btn-sm"
              >
                <RotateCcw size={14} />
                <span>Retake Assessment</span>
              </button>
            </div>
          )}

          {/* Questions List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {(activeQuiz.questions ?? []).map((q, idx) => {
              const selectedOption = selectedAnswers[q.id];
              const gradedItem = quizResult?.gradedQuestions?.find((g: any) => g.questionId === q.id);

              return (
                <div
                  key={q.id}
                  style={{
                    background: 'var(--bg-surface)',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: gradedItem
                      ? gradedItem.isCorrect
                        ? 'rgba(16, 185, 129, 0.4)'
                        : 'rgba(239, 68, 68, 0.4)'
                      : 'var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '1rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-accent)', fontSize: '0.95rem' }}>
                      Q{idx + 1}.
                    </span>
                    <span id={`q-${q.id}`} style={{ fontWeight: 600, fontSize: '1rem', flex: 1, lineHeight: 1.5 }}>
                      {q.question}
                    </span>
                  </div>

                  {/* Options */}
                  <div role="radiogroup" aria-labelledby={`q-${q.id}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {(q.options ?? []).map((opt, optIdx) => {
                      const isSelected = selectedOption === optIdx;
                      let optionBg = 'var(--bg-card)';
                      let optionBorder = 'var(--border-subtle)';

                      if (gradedItem) {
                        if (optIdx === gradedItem.correctOptionIndex) {
                          optionBg = 'rgba(16, 185, 129, 0.15)';
                          optionBorder = 'var(--success)';
                        } else if (isSelected && !gradedItem.isCorrect) {
                          optionBg = 'rgba(239, 68, 68, 0.15)';
                          optionBorder = 'var(--danger)';
                        }
                      } else if (isSelected) {
                        optionBg = 'var(--primary-subtle)';
                        optionBorder = 'var(--primary)';
                      }

                      return (
                        <div
                          key={optIdx}
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={quizResult ? -1 : 0}
                          onClick={() => handleSelectOption(q.id, optIdx)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSelectOption(q.id, optIdx);
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            background: optionBg,
                            border: '1px solid',
                            borderColor: optionBorder,
                            borderRadius: 'var(--radius-sm)',
                            cursor: quizResult ? 'default' : 'pointer',
                            transition: 'all var(--transition-fast)'
                          }}
                        >
                          <div
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              border: '2px solid',
                              borderColor: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                              background: isSelected ? 'var(--primary)' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            {isSelected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff' }} />}
                          </div>
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            {opt}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Question Explanation (shown after grading) */}
                  {gradedItem && (
                    <div
                      style={{
                        marginTop: '1rem',
                        padding: '0.85rem',
                        background: 'rgba(48, 35, 25, 0.04)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: gradedItem.isCorrect ? '3px solid var(--success)' : '3px solid var(--danger)',
                        fontSize: '0.84rem'
                      }}
                    >
                      <div style={{ fontWeight: 600, color: gradedItem.isCorrect ? 'var(--success)' : 'var(--danger)', marginBottom: '0.2rem' }}>
                        {gradedItem.isCorrect ? '&check; Correct' : '&cross; Incorrect'}
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        {gradedItem.explanation}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submit Action */}
          {!quizResult && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2.5rem' }}>
              <button
                type="button"
                onClick={handleSubmitQuiz}
                disabled={isSubmitting}
                className="btn btn-primary btn-lg"
              >
                <span>{isSubmitting ? 'Evaluating Answers...' : 'Submit Assessment for Grading'}</span>
                <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ASSESSMENTS DIRECTORY VIEW */
        <div>
          {assessments.length === 0 && (
            <div className="card" role="status" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              <HelpCircle size={24} style={{ marginBottom: '0.5rem' }} />
              <div>No assessments are available yet. Add skills to your profile to unlock verification.</div>
              <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }} onClick={fetchAssessments}>
                Retry
              </button>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {assessments.map(item => (
            <div
              key={item.skillId}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderLeft: item.passed ? '4px solid var(--success)' : '4px solid var(--color-accent)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-serif)', color: 'var(--text-primary)' }}>{item.skillName}</h3>
                  {item.passed ? (
                    <span className="badge badge-mastered">
                      <CheckCircle2 size={13} /> Verified
                    </span>
                  ) : item.lastScorePercentage !== null ? (
                    <span className="badge badge-high">
                      Score: {item.lastScorePercentage}%
                    </span>
                  ) : (
                    <span className="badge badge-pill" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                      Unverified
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Category: {item.category} &bull; {item.questionsCount} Questions &bull; Difficulty: {item.difficulty}
                </div>

                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  {item.passed
                    ? `You successfully scored ${item.lastScorePercentage}% on this assessment, granting verified skill evidence.`
                    : 'Server-graded conceptual and architecture questions to verify production competence.'}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Passing Score: {item.passingScorePercentage}%
                </span>
                <button
                  type="button"
                  onClick={() => handleStartQuiz(item.skillId)}
                  className={`btn ${item.passed ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                >
                  <Award size={14} />
                  <span>{item.passed ? 'Retake Quiz' : 'Start Assessment'}</span>
                </button>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  );
};
