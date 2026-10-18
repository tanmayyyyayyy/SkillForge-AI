import React, { useRef, useState } from 'react';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import type { ResumeExtractionResult, ResumeTruthReport, ResumeClaimVerdict } from '../types/index.js';
import {
  ShieldCheck,
  Upload,
  FileText,
  AlertTriangle,
  BadgeCheck,
  FolderGit2,
  UserRound,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Cpu
} from 'lucide-react';

const verdictMeta: Record<
  ResumeClaimVerdict,
  { label: string; color: string; Icon: React.ElementType }
> = {
  verified: { label: 'Verified', color: 'var(--success)', Icon: BadgeCheck },
  'project-backed': { label: 'Project-backed', color: 'var(--color-accent)', Icon: FolderGit2 },
  'in-profile': { label: 'In profile', color: 'var(--text-secondary)', Icon: UserRound },
  unsupported: { label: 'Unsupported', color: 'var(--danger)', Icon: HelpCircle }
};

export const ResumeTruthPage: React.FC = () => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [extraction, setExtraction] = useState<ResumeExtractionResult | null>(null);
  const [report, setReport] = useState<ResumeTruthReport | null>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      toast.error('Please select a PDF file.');
      return;
    }

    setIsProcessing(true);
    setFileName(file.name);
    setExtraction(null);
    setReport(null);

    try {
      const config = await api.resume.getConfig();
      if (file.size > config.maxBytes) {
        toast.error(`File is too large. Maximum size is ${Math.round(config.maxBytes / (1024 * 1024))} MB.`);
        return;
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || '');
          resolve(dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl);
        };
        reader.onerror = () => reject(new Error('Could not read the selected file.'));
        reader.readAsDataURL(file);
      });

      const res = await api.resume.extract(base64, file.name);
      setExtraction(res);

      const check = await api.resumeTruth.check({
        skills: res.extraction.skills,
        projects: res.extraction.projects,
        experience: res.extraction.experience
      });
      setReport(check.report);
    } catch (err: any) {
      toast.error(err.message || 'Failed to analyze your resume. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ShieldCheck size={26} color="var(--color-accent)" />
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.9rem', margin: 0 }}>Resume Truth Engine</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', maxWidth: 720 }}>
          Upload your resume to see which claims your SkillForge evidence actually supports. We never
          invent endorsements or edit your resume — every claim is checked against your own assessments
          and completed projects.
        </p>
      </header>

      <div className="card">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
            <Upload size={16} />
            {isProcessing ? 'Analyzing resume...' : fileName ? 'Choose a different PDF' : 'Upload PDF resume'}
          </button>
          {fileName && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <FileText size={14} style={{ display: 'inline', marginRight: 4 }} />
              {fileName}
            </span>
          )}
          {extraction && (
            <span className="badge" style={{ fontSize: '0.74rem' }}>
              {extraction.source === 'gemini' ? <Sparkles size={12} /> : <Cpu size={12} />}
              {extraction.source === 'gemini' ? 'AI extracted' : 'Rule-based extraction'}
            </span>
          )}
        </div>
      </div>

      {report && <ResumeTruthReport report={report} />}
    </div>
  );
};

const ResumeTruthReport: React.FC<{ report: ResumeTruthReport }> = ({ report }) => {
  const { summary } = report;
  const stats: Array<{ label: string; value: number | string; color?: string }> = [
    { label: 'Total claims', value: report.summary.totalClaims },
    { label: 'Verified', value: report.summary.verified, color: 'var(--success)' },
    { label: 'Project-backed', value: report.summary.projectBacked, color: 'var(--color-accent)' },
    { label: 'In profile', value: report.summary.inProfile, color: 'var(--text-secondary)' },
    { label: 'Unsupported', value: report.summary.unsupported, color: 'var(--danger)' },
    { label: 'Evidence-backed', value: `${summary.evidenceBackedRatio}%` }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
        {stats.map(s => (
          <div key={s.label} className="card">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</div>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {report.advisories.length > 0 && (
        <div
          className="card"
          style={{ borderLeft: '4px solid var(--color-accent)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          {report.advisories.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.55rem', alignItems: 'flex-start', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              <AlertTriangle size={15} color="var(--color-accent)" style={{ marginTop: 2, flexShrink: 0 }} />
              <span>{a}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Skill claims</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{report.skills.length} claims</span>
        </div>
        {report.skills.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No skills were detected in this resume.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {report.skills.map(skill => {
              const meta = verdictMeta[skill.verdict];
              const Icon = meta.Icon;
              return (
                <div key={skill.skillId} style={{ padding: '0.9rem 1rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <Icon size={18} color={meta.color} />
                    <span style={{ fontWeight: 600, flex: 1, minWidth: 140 }}>{skill.name}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Claimed L{skill.resumeLevel} · Evidence L{skill.evidencedLevel}
                    </span>
                    {skill.levelOverstated && (
                      <span className="badge badge-critical" style={{ fontSize: '0.7rem' }}>Overstated</span>
                    )}
                    <span className="badge" style={{ color: meta.color, borderColor: meta.color, fontSize: '0.72rem' }}>{meta.label}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>{skill.suggestion}</div>
                  {skill.evidence.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                      {skill.evidence.map((ev, i) => (
                        <span key={i} className="badge" style={{ fontSize: '0.7rem', background: 'var(--bg-card)' }}>
                          {ev.kind === 'assessment' ? <BadgeCheck size={11} /> : <FolderGit2 size={11} />}
                          {ev.label} · {ev.detail}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Projects</span></div>
          {report.projects.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No projects detected in this resume.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {report.projects.map((p, i) => (
                <div key={i}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                    {p.title}{' '}
                    {p.hasLink ? (
                      <span className="badge" style={{ fontSize: '0.68rem', color: 'var(--success)', borderColor: 'var(--success)' }}>Has link</span>
                    ) : (
                      <span className="badge" style={{ fontSize: '0.68rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}>No link</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.suggestion}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Missing role-critical skills</span></div>
          {report.missingFromResume.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Your resume already mentions the role-critical skills we track.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {report.missingFromResume.map(m => (
                <div key={m.skillId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}>
                  <ArrowRight size={14} color="var(--text-muted)" />
                  <span style={{ flex: 1 }}>{m.name}</span>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>needs L{m.requiredLevel}</span>
                  {m.hasEvidence && (
                    <span className="badge" style={{ fontSize: '0.68rem', color: 'var(--success)', borderColor: 'var(--success)' }}>You have evidence</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {report.experience.length > 0 && (
        <div className="card">
          <div className="card-header"><span className="card-title">Experience</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {report.experience.map((e, i) => (
              <div key={i}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{e.role}{e.organization ? ` — ${e.organization}` : ''}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{e.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>{report.disclaimer}</p>
    </div>
  );
};

export default ResumeTruthPage;
