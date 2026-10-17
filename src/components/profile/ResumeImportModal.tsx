import React, { useState, useRef } from 'react';
import { useToast } from '../../context/ToastContext.js';
import { api } from '../../services/api.js';
import {
  ResumeExtractionResult,
  ResumeReviewSelection,
  ResumeExtractedSkill,
  ResumeExtractedProject,
  StudentExperience,
  StudentCertification,
  ProficiencyLevel
} from '../../types/index.js';
import { FileText, X, Upload, Sparkles, Cpu, AlertTriangle, Check, ShieldCheck, Trash2 } from 'lucide-react';
import { useDialogA11y } from '../../hooks/useDialogA11y.js';
import { Select } from '../ui/Select.js';

interface ResumeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (selection: ResumeReviewSelection) => void;
}

type Selectable<T> = T & { selected: boolean };

function stripSelected<T>({ selected: _selected, ...rest }: Selectable<T>): T {
  return rest as T;
}

export const ResumeImportModal: React.FC<ResumeImportModalProps> = ({ isOpen, onClose, onApply }) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ResumeExtractionResult | null>(null);
  const [fileName, setFileName] = useState('');

  // Editable, user-reviewable draft state
  const [includeEducation, setIncludeEducation] = useState(false);
  const [draftSkills, setDraftSkills] = useState<Selectable<ResumeExtractedSkill>[]>([]);
  const [draftProjects, setDraftProjects] = useState<Selectable<ResumeExtractedProject>[]>([]);
  const [draftExperience, setDraftExperience] = useState<Selectable<StudentExperience>[]>([]);
  const [draftCerts, setDraftCerts] = useState<Selectable<StudentCertification>[]>([]);

  const resetState = () => {
    setResult(null);
    setFileName('');
    setDraftSkills([]);
    setDraftProjects([]);
    setDraftExperience([]);
    setDraftCerts([]);
    setIncludeEducation(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const dialogRef = useDialogA11y<HTMLDivElement>(handleClose, isOpen);

  if (!isOpen) return null;

  const loadDrafts = (res: ResumeExtractionResult) => {
    setDraftSkills(res.extraction.skills.map(s => ({ ...s, selected: true })));
    setDraftProjects(res.extraction.projects.map(p => ({ ...p, selected: true })));
    setDraftExperience(res.extraction.experience.map(e => ({ ...e, selected: true })));
    setDraftCerts(res.extraction.certifications.map(c => ({ ...c, selected: true })));
    setIncludeEducation(
      Boolean(res.extraction.degree || res.extraction.institution || res.extraction.graduationYear)
    );
  };

  const handleFile = async (file: File) => {
    if (!file) return;

    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      toast.error('Please select a PDF file.');
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setFileName(file.name);

    try {
      const config = await api.resume.getConfig();
      if (file.size > config.maxBytes) {
        toast.error(`File is too large. Maximum size is ${Math.round(config.maxBytes / (1024 * 1024))} MB.`);
        setIsProcessing(false);
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
      setResult(res);
      loadDrafts(res);
    } catch (err: any) {
      toast.error(err.message || 'Failed to extract your resume. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSkill = (skillId: string) =>
    setDraftSkills(prev => prev.map(s => (s.skillId === skillId ? { ...s, selected: !s.selected } : s)));
  const setSkillLevel = (skillId: string, level: ProficiencyLevel) =>
    setDraftSkills(prev => prev.map(s => (s.skillId === skillId ? { ...s, proficiency: level } : s)));
  const toggleProject = (idx: number) =>
    setDraftProjects(prev => prev.map((p, i) => (i === idx ? { ...p, selected: !p.selected } : p)));
  const toggleExperience = (idx: number) =>
    setDraftExperience(prev => prev.map((e, i) => (i === idx ? { ...e, selected: !e.selected } : e)));
  const toggleCert = (idx: number) =>
    setDraftCerts(prev => prev.map((c, i) => (i === idx ? { ...c, selected: !c.selected } : c)));

  const selectedCount =
    draftSkills.filter(s => s.selected).length +
    draftProjects.filter(p => p.selected).length +
    draftExperience.filter(e => e.selected).length +
    draftCerts.filter(c => c.selected).length +
    (includeEducation && result ? 1 : 0);

  const handleApply = () => {
    if (!result) return;
    if (selectedCount === 0) {
      toast.error('Select at least one item to import.');
      return;
    }

    const selection: ResumeReviewSelection = {
      gradeInfo: includeEducation
        ? {
            includeEducation: true,
            fullName: result.extraction.fullName,
            degree: result.extraction.degree,
            branch: result.extraction.branch,
            institution: result.extraction.institution,
            graduationYear: result.extraction.graduationYear
          }
        : undefined,
      skills: draftSkills.filter(s => s.selected).map(stripSelected),
      projects: draftProjects.filter(p => p.selected).map(stripSelected),
      experience: draftExperience.filter(e => e.selected).map(stripSelected),
      certifications: draftCerts.filter(c => c.selected).map(stripSelected)
    };

    onApply(selection);
    toast.success('Resume items staged into your profile. Review and click "Save Profile Changes" to persist.');
    handleClose();
  };

  const renderSourceBadge = () => {
    if (!result) return null;
    const isAi = result.source === 'gemini';
    return (
      <span
        className="badge"
        style={{
          background: isAi ? 'rgba(211, 138, 25, 0.12)' : 'var(--bg-card)',
          color: isAi ? 'var(--color-accent)' : 'var(--text-secondary)',
          borderColor: isAi ? 'rgba(211, 138, 25, 0.3)' : 'var(--border-subtle)',
          fontSize: '0.74rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4
        }}
      >
        {isAi ? <Sparkles size={12} /> : <Cpu size={12} />}
        {isAi ? 'AI extracted (Gemini)' : 'Rule-based extraction'}
      </span>
    );
  };

  return (
    <div
      className="editorial-modal-backdrop"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-resume-title"
    >
      <div
        ref={dialogRef}
        className="editorial-modal-card"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 820, maxHeight: '88vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <h2 id="modal-resume-title" className="editorial-modal-title">
              Import from Resume
            </h2>
            <p className="editorial-modal-desc">
              Upload a PDF resume to pre-fill your profile. Extracted items are a draft — review and select what to keep
              before saving.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: '0.25rem' }}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Privacy notice */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.6rem 0.85rem',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            marginTop: '1rem'
          }}
        >
          <ShieldCheck size={15} color="var(--color-accent)" />
          <span>Your PDF is parsed in memory and never stored on our servers.</span>
        </div>

        {/* Upload control */}
        <div style={{ marginTop: '1.25rem' }}>
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
          <button
            type="button"
            className="editorial-btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            <Upload size={16} />
            <span>{isProcessing ? 'Analyzing resume...' : fileName ? 'Choose a different PDF' : 'Choose PDF Resume'}</span>
          </button>
          {fileName && !isProcessing && (
            <span style={{ marginLeft: '0.75rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <FileText size={13} style={{ display: 'inline', marginRight: 4 }} />
              {fileName}
            </span>
          )}
        </div>

        {isProcessing && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Extracting text and analyzing your resume. This may take a few seconds...
          </div>
        )}

        {/* Results */}
        {result && !isProcessing && (
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Found {result.extraction.skills.length} skills, {result.extraction.projects.length} projects,{' '}
                {result.extraction.experience.length} experience, {result.extraction.certifications.length} certifications
                <span style={{ color: 'var(--text-muted)' }}> &bull; {result.pdf.pageCount} page(s)</span>
              </div>
              {renderSourceBadge()}
            </div>

            {result.warnings.length > 0 && (
              <div
                style={{
                  background: 'rgba(211, 138, 25, 0.08)',
                  border: '1px solid rgba(211, 138, 25, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem 1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.82rem', color: 'var(--color-accent)' }}>
                  <AlertTriangle size={14} />
                  <span>Review notes</span>
                </div>
                <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.1rem', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Education */}
            {(result.extraction.fullName || result.extraction.degree || result.extraction.institution) && (
              <section>
                <SectionTitle title="Personal & Education" />
                <label style={checkboxRowStyle}>
                  <input type="checkbox" checked={includeEducation} onChange={() => setIncludeEducation(v => !v)} />
                  <span>
                    {[result.extraction.fullName, result.extraction.degree, result.extraction.branch, result.extraction.institution, result.extraction.graduationYear]
                      .filter(Boolean)
                      .join(' • ') || 'Education details'}
                  </span>
                </label>
              </section>
            )}

            {/* Skills */}
            {draftSkills.length > 0 && (
              <section>
                <SectionTitle title={`Skills (${draftSkills.filter(s => s.selected).length}/${draftSkills.length})`} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {draftSkills.map(s => (
                    <div key={s.skillId} style={{ ...checkboxRowStyle, justifyContent: 'space-between' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, cursor: 'pointer' }}>
                        <input type="checkbox" checked={s.selected} onChange={() => toggleSkill(s.skillId)} />
                        <span>
                          <strong>{s.name}</strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}> &bull; {s.category}</span>
                        </span>
                      </label>
                      <Select
                        ariaLabel={`Proficiency level for ${s.name}`}
                        inline
                        size="xs"
                        value={s.proficiency}
                        onChange={v => setSkillLevel(s.skillId, Number(v) as ProficiencyLevel)}
                        disabled={!s.selected}
                        options={[1, 2, 3, 4, 5].map(l => ({ value: l, label: `Lvl ${l}` }))}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Projects */}
            {draftProjects.length > 0 && (
              <section>
                <SectionTitle title={`Projects (${draftProjects.filter(p => p.selected).length}/${draftProjects.length})`} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {draftProjects.map((p, idx) => (
                    <label key={idx} style={{ ...checkboxRowStyle, alignItems: 'flex-start' }}>
                      <input type="checkbox" checked={p.selected} onChange={() => toggleProject(idx)} style={{ marginTop: 3 }} />
                      <span>
                        <strong>{p.title}</strong>
                        {p.description && (
                          <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{p.description}</span>
                        )}
                        {p.technologies && p.technologies.length > 0 && (
                          <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            Tech: {p.technologies.join(', ')}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            {/* Experience */}
            {draftExperience.length > 0 && (
              <section>
                <SectionTitle title={`Experience (${draftExperience.filter(e => e.selected).length}/${draftExperience.length})`} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {draftExperience.map((e, idx) => (
                    <label key={idx} style={{ ...checkboxRowStyle, alignItems: 'flex-start' }}>
                      <input type="checkbox" checked={e.selected} onChange={() => toggleExperience(idx)} style={{ marginTop: 3 }} />
                      <span>
                        <strong>{e.role}</strong>
                        <span style={{ color: 'var(--color-accent)' }}> — {e.organization}</span>
                        {e.duration && <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}> ({e.duration})</span>}
                        {e.responsibilities && (
                          <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{e.responsibilities}</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            {/* Certifications */}
            {draftCerts.length > 0 && (
              <section>
                <SectionTitle title={`Certifications (${draftCerts.filter(c => c.selected).length}/${draftCerts.length})`} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {draftCerts.map((c, idx) => (
                    <label key={idx} style={checkboxRowStyle}>
                      <input type="checkbox" checked={c.selected} onChange={() => toggleCert(idx)} />
                      <span>
                        {c.name}
                        {c.year ? <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}> ({c.year})</span> : null}
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', flexWrap: 'wrap' }}>
              <button type="button" className="editorial-btn-secondary" onClick={resetState}>
                <Trash2 size={15} />
                <span>Clear</span>
              </button>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="editorial-btn-secondary" onClick={handleClose}>
                  Cancel
                </button>
                <button type="button" className="editorial-btn-primary" onClick={handleApply} disabled={selectedCount === 0}>
                  <Check size={16} />
                  <span>Import {selectedCount} item{selectedCount === 1 ? '' : 's'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const checkboxRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  padding: '0.6rem 0.85rem',
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.86rem',
  color: 'var(--text-primary)',
  cursor: 'pointer'
};

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.6rem' }}>{title}</div>
);
