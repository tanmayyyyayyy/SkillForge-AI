import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import {
  FileText,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  TrendingUp,
  Award
} from 'lucide-react';

export const ReadinessReportPage: React.FC = () => {
  const toast = useToast();
  const [report, setReport] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.readiness.getReport();
      setReport(res.report);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate readiness report.');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div role="status" aria-live="polite" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spin" aria-hidden="true" style={{ width: 36, height: 36, border: '3px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', margin: '0 auto 1rem' }} />
          <div>Compiling official Career Readiness Report...</div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', textAlign: 'center', gap: '0.75rem' }}>
        <Sparkles size={26} color="var(--color-accent)" />
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Report unavailable
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 460, margin: 0, lineHeight: 1.5 }}>
          We could not generate your career readiness report. This usually means your profile or target career needs a quick update.
        </p>
        <button type="button" className="btn btn-primary" onClick={fetchReport}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Action Header (Hidden in Print) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Career readiness report</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.3rem' }}>
            Comprehensive verification report of alignment, skill evidence, and hiring readiness.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="btn btn-primary"
        >
          <Printer size={16} />
          <span>Print / Save as PDF</span>
        </button>
      </div>

      {/* OFFICIAL REPORT DOCUMENT (Styled for both Screen and Print) */}
      <div
        className="card"
        style={{
          padding: '2.5rem',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem'
        }}
      >
        {/* Document Official Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--border-medium)', paddingBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: 6, background: '#D38A19', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Layers size={18} color="#ffffff" />
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.35rem' }}>
                SkillForge AI
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              Official Career Alignment & Skill Readiness Assessment
            </div>
          </div>

          <div style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <div>Generated: {new Date(report.generatedAt).toLocaleDateString()}</div>
            <div>Document Ref: SF-AI-{(report.student?.fullName || 'STD').replace(/\s+/g, '').toUpperCase()}-{new Date().getFullYear()}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--success)', marginTop: '0.2rem', fontWeight: 600 }}>
              <ShieldCheck size={13} /> Verified Evidence Profile
            </div>
          </div>
        </div>

        {/* Candidate & Target Role Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Candidate Profile</div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.2rem' }}>{report.student?.fullName || 'Candidate'}</h3>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              {report.student?.degree} &bull; {report.student?.educationLevel}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Class of {report.student?.graduationYear} &bull; Availability: {report.student?.weeklyHours}h/week
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Target Role Alignment</div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.2rem', color: 'var(--color-accent)' }}>{report.targetCareer?.title || 'Target Role'}</h3>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Industry Category: {report.targetCareer?.category || '—'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Benchmark: {report.targetCareer?.salaryRange || '—'} &bull; Demand: {report.targetCareer?.marketDemand || '—'}
            </div>
          </div>
        </div>

        {/* Readiness Score Breakdown */}
        <div>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} color="var(--color-accent)" />
            <span>Demonstrated Career Readiness: {report.readiness?.overallScore ?? 0}%</span>
          </h3>

          <div className="progress-container" style={{ height: 12, marginBottom: '1rem' }}>
            <div className="progress-bar" style={{ width: `${report.readiness?.overallScore ?? 0}%` }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center', background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>1. Core Skill Coverage</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {report.readiness?.breakdown?.skillCoverageScore ?? 0} / 50 pts
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Weighted demonstrated proficiency</div>
            </div>

            <div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>2. Verified Assessments</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.2rem' }}>
                {report.readiness?.breakdown?.assessmentBonus ?? 0} / 25 pts
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Passed rigorous technical tests</div>
            </div>

            <div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>3. Practical Portfolio Evidence</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.2rem' }}>
                {report.readiness?.breakdown?.projectEvidenceBonus ?? 0} / 25 pts
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Completed projects with repo links</div>
            </div>
          </div>
        </div>

        {/* Verified Strengths vs Critical Gaps */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)' }}>
              <CheckCircle2 size={16} /> Key Contributing Strengths
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {(report.readiness?.positiveFactors ?? []).map((f: string, idx: number) => (
                <div key={idx} style={{ padding: '0.6rem 0.85rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                  &bull; {f}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--danger)' }}>
              <AlertCircle size={16} /> Highest-Priority Remaining Gaps
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {(report.gapSummary?.topGaps ?? []).map((g: any) => (
                <div key={g.skillId} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.85rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                  <span>{g.name} (Gap: {g.gap} levels)</span>
                  <span className={`badge badge-${g.priorityBadge.toLowerCase()}`} style={{ fontSize: '0.72rem' }}>
                    {g.priorityBadge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Roadmap & Verified Evidence Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.65rem' }}>Learning Roadmap Velocity</h4>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <div>Completed Tasks: <strong>{report.roadmapProgress?.completedTasks ?? 0} of {report.roadmapProgress?.totalTasks ?? 0}</strong></div>
              <div>Roadmap Progress: <strong>{report.roadmapProgress?.progressPercentage ?? 0}%</strong></div>
              <div>Estimated Effort Remaining: <strong>{report.gapSummary?.estimatedHours ?? 0} hours</strong></div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.65rem' }}>Verified Portfolio Work</h4>
            {(report.portfolioProjects?.length ?? 0) > 0 ? (
              <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                {(report.portfolioProjects ?? []).map((p: any) => (
                  <div key={p.id} style={{ marginBottom: '0.4rem' }}>
                    &check; <strong>{p.title}</strong> &bull; Status: {p.userStatus}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                No verified projects submitted yet.
              </div>
            )}
          </div>
        </div>

        {/* Disclaimer Footer */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {report.readiness?.disclaimer}
        </div>
      </div>
    </div>
  );
};
