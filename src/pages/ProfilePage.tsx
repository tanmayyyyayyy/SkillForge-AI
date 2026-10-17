import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import {
  StudentSkill,
  StudentProject,
  StudentExperience,
  StudentCertification,
  ProficiencyLevel,
  PROFICIENCY_SCALE,
  SkillEvidenceSource,
  CareerRole,
  ResumeReviewSelection
} from '../types/index.js';
import { validateProfile, toCanonicalSkillId, isValidUrl } from '../utils/profileValidation.js';
import { ResumeImportModal } from '../components/profile/ResumeImportModal.js';
import {
  User,
  GraduationCap,
  Code2,
  FolderGit2,
  Save,
  Plus,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  Info,
  ExternalLink,
  HelpCircle,
  FileText,
  Award
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { profile, setProfile } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'education' | 'skills' | 'projects' | 'preferences'>('education');
  const [isSaving, setIsSaving] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showProficiencyGuide, setShowProficiencyGuide] = useState(false);
  const [careers, setCareers] = useState<Array<Partial<CareerRole>>>([]);

  // Target role options come from the canonical careers data (avoid a drifting hardcoded list)
  useEffect(() => {
    api.careers.getAll()
      .then(res => setCareers(res.careers))
      .catch(() => toast.error('Failed to load career roles. The target role list may be incomplete.'));
  }, [toast]);

  // TAB 1: Personal & Education
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [educationLevel, setEducationLevel] = useState<any>(profile?.educationLevel || 'Undergraduate');
  const [degree, setDegree] = useState(profile?.degree || '');
  const [branch, setBranch] = useState(profile?.branch || '');
  const [institution, setInstitution] = useState(profile?.institution || '');
  const [graduationYear, setGraduationYear] = useState<number>(profile?.graduationYear || 2026);
  const [currentAcademicYear, setCurrentAcademicYear] = useState(profile?.currentAcademicYear || 'Year 3');
  const [experienceLevel, setExperienceLevel] = useState<any>(profile?.experienceLevel || 'Beginner');

  // TAB 2: Skills
  const [skills, setSkills] = useState<StudentSkill[]>(profile?.currentSkills || []);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('Programming Languages');
  const [newSkillLevel, setNewSkillLevel] = useState<ProficiencyLevel>(2);
  const [newSkillSource, setNewSkillSource] = useState<SkillEvidenceSource>('self-reported');
  const [skillSearch, setSkillSearch] = useState('');

  // TAB 3: Projects & Experience
  const [projects, setProjects] = useState<StudentProject[]>(profile?.existingProjects || []);
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projTech, setProjTech] = useState('');
  const [projRole, setProjRole] = useState('');
  const [projRepo, setProjRepo] = useState('');
  const [projLive, setProjLive] = useState('');
  const [projStatus, setProjStatus] = useState<'completed' | 'in_progress' | 'planned'>('completed');

  const [experiences, setExperiences] = useState<StudentExperience[]>(profile?.experience || []);
  const [certifications, setCertifications] = useState<StudentCertification[]>(profile?.certifications || []);
  const [expOrg, setExpOrg] = useState('');
  const [expRole, setExpRole] = useState('');
  const [expDuration, setExpDuration] = useState('');
  const [expResponsibilities, setExpResponsibilities] = useState('');
  const [expSkills, setExpSkills] = useState('');

  // TAB 4: Preferences & Goals
  const [targetRole, setTargetRole] = useState(profile?.targetRole || 'aiml');
  const [weeklyHours, setWeeklyHours] = useState<number>(profile?.weeklyHours || 14);
  const [targetCompletionPeriod, setTargetCompletionPeriod] = useState(profile?.targetCompletionPeriod || '6 Months');
  const [learningStyle, setLearningStyle] = useState<any>(profile?.preferredLearningStyle || 'Project-based');
  const [targetCompaniesText, setTargetCompaniesText] = useState(profile?.targetCompanies?.join(', ') || '');
  const [preferredDomainsText, setPreferredDomainsText] = useState(profile?.preferredDomains?.join(', ') || '');
  const [constraintsText, setConstraintsText] = useState(profile?.constraints?.join(', ') || '');
  const [interestsText, setInterestsText] = useState(profile?.interests?.join(', ') || '');

  const handleSaveProfile = async () => {
    setValidationErrors([]);

    const payload = {
      fullName,
      educationLevel,
      degree,
      branch,
      institution,
      graduationYear: Number(graduationYear),
      currentAcademicYear,
      experienceLevel,
      currentSkills: skills,
      existingProjects: projects,
      experience: experiences,
      certifications,
      targetRole,
      weeklyHours: Number(weeklyHours),
      targetCompletionPeriod,
      preferredLearningStyle: learningStyle,
      targetCompanies: targetCompaniesText.split(',').map(s => s.trim()).filter(Boolean),
      preferredDomains: preferredDomainsText.split(',').map(s => s.trim()).filter(Boolean),
      constraints: constraintsText.split(',').map(s => s.trim()).filter(Boolean),
      interests: interestsText.split(',').map(s => s.trim()).filter(Boolean)
    };

    // Client-side validation using shared validator
    const validation = validateProfile(payload, profile || undefined);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      toast.error('Please resolve the profile validation errors below.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.profile.update(validation.sanitized);
      setProfile(res.profile);
      toast.success('Profile saved and verified! Gap priorities recalculated.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSkill = () => {
    const trimmed = newSkillName.trim();
    if (!trimmed) {
      toast.error('Skill name is required.');
      return;
    }

    const canonicalId = toCanonicalSkillId(trimmed);
    if (skills.some(s => toCanonicalSkillId(s.skillId) === canonicalId)) {
      toast.info(`'${trimmed}' is already recorded in your skills.`);
      return;
    }

    const newSkill: StudentSkill = {
      skillId: canonicalId,
      name: trimmed,
      category: newSkillCategory,
      proficiency: Number(newSkillLevel) as ProficiencyLevel,
      status: 'self-reported', // never auto-mark self-reported as verified
      source: newSkillSource,
      updatedAt: new Date().toISOString()
    };

    setSkills(prev => [...prev, newSkill]);
    setNewSkillName('');
    setNewSkillLevel(2);
    toast.success(`Added ${trimmed} (Lvl ${newSkillLevel}/5) to skills.`);
  };

  const handleUpdateSkillProficiency = (skillId: string, level: ProficiencyLevel) => {
    setSkills(prev =>
      prev.map(s =>
        s.skillId === skillId
          ? { ...s, proficiency: level, updatedAt: new Date().toISOString() }
          : s
      )
    );
  };

  const handleRemoveSkill = (skillId: string) => {
    setSkills(prev => prev.filter(s => s.skillId !== skillId));
  };

  const handleAddProject = () => {
    if (!projTitle.trim()) {
      toast.error('Project title is required.');
      return;
    }

    if (projRepo.trim() && !isValidUrl(projRepo.trim())) {
      toast.error('Invalid repository URL. Must be http:// or https://');
      return;
    }

    if (projLive.trim() && !isValidUrl(projLive.trim())) {
      toast.error('Invalid deployment URL. Must be http:// or https://');
      return;
    }

    const techArray = projTech.split(',').map(t => t.trim()).filter(Boolean);

    const newProj: StudentProject = {
      id: `proj_${Date.now()}`,
      title: projTitle.trim(),
      description: projDesc.trim(),
      technologies: techArray.length > 0 ? techArray : ['General'],
      roleAndContributions: projRole.trim() || undefined,
      repoUrl: projRepo.trim() || undefined,
      liveUrl: projLive.trim() || undefined,
      skillsDemonstrated: techArray.map(t => toCanonicalSkillId(t)),
      projectStatus: projStatus,
      completed: projStatus === 'completed',
      completedAt: projStatus === 'completed' ? new Date().toISOString() : undefined
    };

    setProjects(prev => [newProj, ...prev]);
    setProjTitle('');
    setProjDesc('');
    setProjTech('');
    setProjRole('');
    setProjRepo('');
    setProjLive('');
    toast.success('Project added to portfolio!');
  };

  const handleRemoveProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const handleAddExperience = () => {
    if (!expOrg.trim() || !expRole.trim()) {
      toast.error('Organization and role title are required.');
      return;
    }

    const skillsArray = expSkills.split(',').map(s => s.trim()).filter(Boolean);

    const newExp: StudentExperience = {
      id: `exp_${Date.now()}`,
      organization: expOrg.trim(),
      role: expRole.trim(),
      duration: expDuration.trim(),
      responsibilities: expResponsibilities.trim(),
      skillsDemonstrated: skillsArray
    };

    setExperiences(prev => [newExp, ...prev]);
    setExpOrg('');
    setExpRole('');
    setExpDuration('');
    setExpResponsibilities('');
    setExpSkills('');
    toast.success('Experience record added!');
  };

  const handleRemoveExperience = (id: string) => {
    setExperiences(prev => prev.filter(e => e.id !== id));
  };

  /**
   * Merges resume-extracted selections into local draft state. Nothing is
   * persisted until the user explicitly saves the profile. Extracted skills are
   * staged as self-reported (never auto-verified) and deduplicated by canonical ID.
   */
  const handleApplyResume = (selection: ResumeReviewSelection) => {
    if (selection.gradeInfo?.includeEducation) {
      const g = selection.gradeInfo;
      if (g.fullName) setFullName(g.fullName);
      if (g.degree) setDegree(g.degree);
      if (g.branch) setBranch(g.branch);
      if (g.institution) setInstitution(g.institution);
      if (g.graduationYear) setGraduationYear(g.graduationYear);
    }

    if (selection.skills.length > 0) {
      setSkills(prev => {
        const merged = [...prev];
        for (const s of selection.skills) {
          const canonicalId = toCanonicalSkillId(s.skillId || s.name);
          const existingIdx = merged.findIndex(m => toCanonicalSkillId(m.skillId) === canonicalId);
          if (existingIdx >= 0) {
            if (s.proficiency > merged[existingIdx].proficiency) {
              merged[existingIdx] = { ...merged[existingIdx], proficiency: s.proficiency };
            }
          } else {
            merged.push({
              skillId: canonicalId,
              name: s.name,
              category: s.category || 'General',
              proficiency: s.proficiency,
              status: 'self-reported',
              source: 'resume',
              updatedAt: new Date().toISOString()
            });
          }
        }
        return merged;
      });
    }

    if (selection.projects.length > 0) {
      setProjects(prev => {
        const merged = [...prev];
        for (const p of selection.projects) {
          const techArray = p.technologies.length > 0 ? p.technologies : ['General'];
          merged.unshift({
            id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            title: p.title,
            description: p.description,
            technologies: techArray,
            repoUrl: p.repoUrl,
            liveUrl: p.liveUrl,
            skillsDemonstrated: techArray.map(t => toCanonicalSkillId(t)),
            projectStatus: 'completed',
            completed: true,
            completedAt: new Date().toISOString()
          });
        }
        return merged;
      });
    }

    if (selection.experience.length > 0) {
      setExperiences(prev => [
        ...selection.experience.map((e, i) => ({
          ...e,
          id: e.id || `exp_${Date.now()}_${i}`
        })),
        ...prev
      ]);
    }

    if (selection.certifications.length > 0) {
      setCertifications(prev => {
        const merged = [...prev];
        for (const c of selection.certifications) {
          if (!merged.some(m => m.name.toLowerCase() === c.name.toLowerCase())) {
            merged.push({ ...c, id: c.id || `cert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` });
          }
        }
        return merged;
      });
    }
  };

  const handleRemoveCertification = (id: string) => {
    setCertifications(prev => prev.filter(c => c.id !== id));
  };

  const filteredSkills = skills.filter(
    s =>
      s.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
      s.category.toLowerCase().includes(skillSearch.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Student Profile
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.4rem', lineHeight: 1.5 }}>
            Authoritative source of background, technical capabilities, verified milestones, and learning constraints.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsResumeModalOpen(true)}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
          >
            <FileText size={16} />
            <span>Import from Resume</span>
          </button>

          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
          >
            <Save size={16} />
            <span>{isSaving ? 'Saving & Verifying...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </div>

      {/* Validation Alert Banner */}
      {validationErrors.length > 0 && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            color: 'var(--danger)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, marginBottom: '0.4rem' }}>
            <AlertTriangle size={18} />
            <span>Profile Validation Notice ({validationErrors.length})</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.88rem', lineHeight: 1.5 }}>
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Navigation Tabs */}
      <div role="tablist" aria-label="Profile sections" style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        {[
          { id: 'education', label: 'Personal & Education', icon: GraduationCap },
          { id: 'skills', label: `Technical Skills (${skills.length})`, icon: Code2 },
          { id: 'projects', label: `Projects & Experience (${projects.length + experiences.length})`, icon: FolderGit2 },
          { id: 'preferences', label: 'Career Goals & Constraints', icon: User }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id as any)}
              className={`btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.88rem', fontWeight: isActive ? 600 : 500 }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT CONTAINER */}
      <div className="card" style={{ padding: '2rem' }}>
        {/* TAB 1: PERSONAL & EDUCATION */}
        {activeTab === 'education' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 760 }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>
                Personal & Academic Credentials
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                Basic biographical and collegiate context used for benchmark calibration and student eligibility.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="fullName">Full Name *</label>
              <input
                id="fullName"
                type="text"
                className="form-input"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Aarav Sharma"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="edu">Education Level</label>
                <select
                  id="edu"
                  className="form-select"
                  value={educationLevel}
                  onChange={e => setEducationLevel(e.target.value)}
                >
                  <option value="Undergraduate">Undergraduate (B.Tech / B.S. / BCA)</option>
                  <option value="Postgraduate">Postgraduate (M.Tech / M.S. / MCA)</option>
                  <option value="Bootcamp">Bootcamp / Technical Program</option>
                  <option value="Self-Taught">Self-Taught / Industry Transition</option>
                  <option value="High School">High School / Pre-University</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="currentYear">Current Academic Standing</label>
                <select
                  id="currentYear"
                  className="form-select"
                  value={currentAcademicYear}
                  onChange={e => setCurrentAcademicYear(e.target.value)}
                >
                  <option value="Year 1">1st Year (Freshman)</option>
                  <option value="Year 2">2nd Year (Sophomore)</option>
                  <option value="Year 3">3rd Year (Junior)</option>
                  <option value="Year 4">4th Year (Senior)</option>
                  <option value="Final Year">Final Year (Graduating Soon)</option>
                  <option value="Graduated">Graduated / Alumnus</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="grad">Expected Graduation Year</label>
                <input
                  id="grad"
                  type="number"
                  className="form-input"
                  min={1980}
                  max={2045}
                  value={graduationYear}
                  onChange={e => setGraduationYear(Number(e.target.value))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="degree">Degree Name</label>
                <input
                  id="degree"
                  type="text"
                  className="form-input"
                  placeholder="e.g. B.Tech, Bachelor of Science"
                  value={degree}
                  onChange={e => setDegree(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="branch">Branch / Specialization</label>
                <input
                  id="branch"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Computer Science & AI"
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="institution">Institution / University</label>
              <input
                id="institution"
                type="text"
                className="form-input"
                placeholder="e.g. National Institute of Technology, Delhi"
                value={institution}
                onChange={e => setInstitution(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" id="profile-exp-label">Self-Assessed Engineering Experience Level</label>
              <div role="radiogroup" aria-labelledby="profile-exp-label" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                {['Beginner', 'Intermediate', 'Advanced'].map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    role="radio"
                    aria-checked={experienceLevel === lvl}
                    onClick={() => setExperienceLevel(lvl as any)}
                    className={`btn ${experienceLevel === lvl ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    style={{ fontWeight: 600 }}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                Beginner: &lt;1 yr coding &bull; Intermediate: 1–3 yrs coding with independent projects &bull; Advanced: 3+ yrs production/internship experience.
              </span>
            </div>
          </div>
        )}

        {/* TAB 2: TECHNICAL SKILLS */}
        {activeTab === 'skills' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>
                  Technical Capabilities & Proficiency Scale
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                  Skills are rated on an objective 0–5 proficiency scale. Self-reported skills remain uncertified until proven via quizzes or verified project evidence.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowProficiencyGuide(!showProficiencyGuide)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
              >
                <HelpCircle size={14} color="var(--color-accent)" />
                <span>{showProficiencyGuide ? 'Hide Scale Guide' : 'View 0–5 Scale Guide'}</span>
              </button>
            </div>

            {/* Documented 0-5 Proficiency Scale Card */}
            {showProficiencyGuide && (
              <div
                style={{
                  background: 'rgba(211, 138, 25, 0.08)',
                  border: '1px solid rgba(211, 138, 25, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Info size={16} color="var(--color-accent)" />
                  <span>Objective Proficiency Scale Definitions (0 to 5)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
                  {[0, 1, 2, 3, 4, 5].map(lvl => {
                    const info = PROFICIENCY_SCALE[lvl as ProficiencyLevel];
                    return (
                      <div
                        key={lvl}
                        style={{
                          background: 'var(--bg-card)',
                          padding: '0.75rem 1rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-accent)' }}>
                          Lvl {lvl}: {info.title}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                          {info.description}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.3rem', fontStyle: 'italic' }}>
                          {info.criteria}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add New Skill Form */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem'
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                Add Skill to Profile
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
                <div style={{ minWidth: 180 }}>
                  <label className="form-label" htmlFor="newSkillName">Skill Name *</label>
                  <input
                    id="newSkillName"
                    type="text"
                    className="form-input"
                    placeholder="e.g. PyTorch, Docker, React, SQL"
                    value={newSkillName}
                    onChange={e => setNewSkillName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                  />
                </div>

                <div style={{ minWidth: 160 }}>
                  <label className="form-label" htmlFor="newSkillCategory">Category</label>
                  <select
                    id="newSkillCategory"
                    className="form-select"
                    value={newSkillCategory}
                    onChange={e => setNewSkillCategory(e.target.value)}
                  >
                    <option value="Programming Languages">Programming Languages</option>
                    <option value="Machine Learning">Machine Learning</option>
                    <option value="Deep Learning">Deep Learning</option>
                    <option value="Data Engineering">Data Engineering</option>
                    <option value="Data Management">Data Management</option>
                    <option value="DevOps & Deployment">DevOps & Deployment</option>
                    <option value="API Development">API Development</option>
                    <option value="UI Libraries">UI Libraries</option>
                    <option value="Mathematics">Mathematics & Stats</option>
                    <option value="General">General / Core CS</option>
                  </select>
                </div>

                <div style={{ minWidth: 160 }}>
                  <label className="form-label" htmlFor="newSkillLevel">Proficiency Level</label>
                  <select
                    id="newSkillLevel"
                    className="form-select"
                    value={newSkillLevel}
                    onChange={e => setNewSkillLevel(Number(e.target.value) as ProficiencyLevel)}
                  >
                    <option value={0}>0 - None / Novice</option>
                    <option value={1}>1 - Beginner (Aware)</option>
                    <option value={2}>2 - Elementary (Basic scripts)</option>
                    <option value={3}>3 - Intermediate (Functional)</option>
                    <option value={4}>4 - Advanced (Production-grade)</option>
                    <option value={5}>5 - Expert (System Master)</option>
                  </select>
                </div>

                <div style={{ minWidth: 140 }}>
                  <label className="form-label" htmlFor="newSkillSource">Evidence Source</label>
                  <select
                    id="newSkillSource"
                    className="form-select"
                    value={newSkillSource}
                    onChange={e => setNewSkillSource(e.target.value as SkillEvidenceSource)}
                  >
                    <option value="self-reported">Self-Reported</option>
                    <option value="course">Coursework / Class</option>
                    <option value="project">Personal Project</option>
                    <option value="work_experience">Internship / Job</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', height: 40 }}
                >
                  <Plus size={16} />
                  <span>Add Skill</span>
                </button>
              </div>

              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
                Note: Skills are normalized and deduplicated automatically (e.g., &ldquo;React.js&rdquo; &amp; &ldquo;react&rdquo; resolve to the same canonical skill).
              </div>
            </div>

            {/* Existing Skills List & Search */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                  Recorded Skills ({skills.length})
                </div>
                <input
                  type="text"
                  placeholder="Filter skills by name or category..."
                  aria-label="Filter skills by name or category"
                  className="form-input"
                  style={{ maxWidth: 280, height: 36, fontSize: '0.85rem' }}
                  value={skillSearch}
                  onChange={e => setSkillSearch(e.target.value)}
                />
              </div>

              {filteredSkills.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                  No matching skills found. Add your first skill using the form above.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.85rem' }}>
                  {filteredSkills.map(s => {
                    const isVerified = s.status === 'assessed' || s.status === 'verified_project';
                    return (
                      <div
                        key={s.skillId}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.6rem',
                          padding: '1rem',
                          background: 'var(--bg-surface)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                              {s.name}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              {s.category} &bull; Source: {s.source || 'self-reported'}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(s.skillId)}
                            aria-label={`Remove ${s.name}`}
                            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                            title="Remove skill"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span
                              className="badge"
                              style={{
                                background: isVerified ? 'rgba(16, 185, 129, 0.12)' : 'rgba(211, 138, 25, 0.12)',
                                color: isVerified ? 'var(--success)' : 'var(--color-accent)',
                                borderColor: isVerified ? 'rgba(16, 185, 129, 0.3)' : 'rgba(211, 138, 25, 0.3)',
                                fontSize: '0.74rem'
                              }}
                            >
                              {isVerified ? <ShieldCheck size={12} style={{ display: 'inline', marginRight: 4 }} /> : null}
                              {s.status}
                            </span>

                            {s.assessmentScore ? (
                              <span style={{ fontSize: '0.74rem', color: 'var(--success)', fontWeight: 600 }}>
                                {s.assessmentScore}% score
                              </span>
                            ) : null}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <label htmlFor={`prof-${s.skillId}`} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Proficiency:</label>
                            <select
                              id={`prof-${s.skillId}`}
                              className="form-select"
                              style={{ width: 'auto', padding: '0.2rem 0.6rem', fontSize: '0.8rem', height: 28 }}
                              value={s.proficiency}
                              onChange={e => handleUpdateSkillProficiency(s.skillId, Number(e.target.value) as ProficiencyLevel)}
                            >
                              <option value={0}>0 - None</option>
                              <option value={1}>1 - Beginner</option>
                              <option value={2}>2 - Elementary</option>
                              <option value={3}>3 - Intermediate</option>
                              <option value={4}>4 - Advanced</option>
                              <option value={5}>5 - Expert</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PROJECTS & EXPERIENCE */}
        {activeTab === 'projects' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {/* 1. Projects Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>
                  Practical Project Portfolio ({projects.length})
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                  Verified code repositories and deployed demonstrations directly establish evidence weight in your Career Readiness Score (+25%).
                </p>
              </div>

              {/* Add Project Form */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                  Record a Practical Project
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" htmlFor="projTitle">Project Title *</label>
                      <input
                        id="projTitle"
                        type="text"
                        className="form-input"
                        placeholder="e.g. Distributed Task Queue & Telemetry"
                        value={projTitle}
                        onChange={e => setProjTitle(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" htmlFor="projTech">Technologies Used</label>
                      <input
                        id="projTech"
                        type="text"
                        className="form-input"
                        placeholder="e.g. Python, FastAPI, Docker, Redis"
                        value={projTech}
                        onChange={e => setProjTech(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" htmlFor="projStatus">Project Status</label>
                      <select
                        id="projStatus"
                        className="form-select"
                        value={projStatus}
                        onChange={e => setProjStatus(e.target.value as any)}
                      >
                        <option value="completed">Completed &amp; Tested</option>
                        <option value="in_progress">In Progress</option>
                        <option value="planned">Planned Milestone</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="projDesc">Project Description</label>
                    <input
                      id="projDesc"
                      type="text"
                      className="form-input"
                      placeholder="High-level architecture, problem solved, and technical throughput"
                      value={projDesc}
                      onChange={e => setProjDesc(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="projRole">Role &amp; Specific Contributions</label>
                    <input
                      id="projRole"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Sole developer: built async event loop, benchmarked under 500 RPS"
                      value={projRole}
                      onChange={e => setProjRole(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" htmlFor="projRepo">GitHub Repository URL</label>
                      <input
                        id="projRepo"
                        type="url"
                        className="form-input"
                        placeholder="https://github.com/username/project"
                        value={projRepo}
                        onChange={e => setProjRepo(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" htmlFor="projLive">Live Deployment URL (Optional)</label>
                      <input
                        id="projLive"
                        type="url"
                        className="form-input"
                        placeholder="https://my-project.vercel.app"
                        value={projLive}
                        onChange={e => setProjLive(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleAddProject}
                      className="btn btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Plus size={16} />
                      <span>Add Project to Portfolio</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Projects List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {projects.length === 0 && (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                    No projects recorded yet. Add one using the form above or import from your resume.
                  </div>
                )}
                {projects.map(p => (
                  <div
                    key={p.id}
                    style={{
                      padding: '1.25rem',
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                          {p.title}
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                          <span className={`badge ${p.completed ? 'badge-success' : 'badge-medium'}`}>
                            {p.projectStatus || (p.completed ? 'completed' : 'in_progress')}
                          </span>
                          {(p.technologies ?? []).map((t, idx) => (
                            <span key={idx} className="badge" style={{ background: 'var(--bg-card)', fontSize: '0.72rem' }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveProject(p.id)}
                        aria-label={`Remove project ${p.title}`}
                        style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                        title="Remove project"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {p.description && (
                      <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {p.description}
                      </div>
                    )}

                    {p.roleAndContributions && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                        <strong>Role &amp; Contribution:</strong> {p.roleAndContributions}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                      {p.repoUrl && (
                        <a href={p.repoUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                          <span>Repository</span>
                          <ExternalLink size={13} />
                        </a>
                      )}
                      {p.liveUrl && (
                        <a href={p.liveUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--success)', fontWeight: 600 }}>
                          <span>Live Demo</span>
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Work & Internship Experience Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '2rem' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>
                  Internship &amp; Work Experience ({experiences.length})
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                  Real-world engineering roles, responsibilities, and competencies demonstrated in production environments.
                </p>
              </div>

              {/* Add Experience Form */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                  Record Work or Internship Experience
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" htmlFor="expOrg">Organization / Company *</label>
                      <input
                        id="expOrg"
                        type="text"
                        className="form-input"
                        placeholder="e.g. SaarthiX Research Labs"
                        value={expOrg}
                        onChange={e => setExpOrg(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" htmlFor="expRole">Role Title *</label>
                      <input
                        id="expRole"
                        type="text"
                        className="form-input"
                        placeholder="e.g. Machine Learning Engineering Intern"
                        value={expRole}
                        onChange={e => setExpRole(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" htmlFor="expDuration">Duration</label>
                      <input
                        id="expDuration"
                        type="text"
                        className="form-input"
                        placeholder="e.g. May 2024 - Jul 2024 (3 mos)"
                        value={expDuration}
                        onChange={e => setExpDuration(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="expResponsibilities">Key Responsibilities &amp; Impact</label>
                    <textarea
                      id="expResponsibilities"
                      className="form-textarea"
                      rows={2}
                      placeholder="Describe the engineering tasks, tools used, and measurable results achieved..."
                      value={expResponsibilities}
                      onChange={e => setExpResponsibilities(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="expSkills">Skills Demonstrated (comma separated)</label>
                    <input
                      id="expSkills"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Python, Scikit-Learn, Pandas, Git"
                      value={expSkills}
                      onChange={e => setExpSkills(e.target.value)}
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleAddExperience}
                      className="btn btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Plus size={16} />
                      <span>Add Experience Record</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Experience List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {experiences.length === 0 && (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                    No experience records yet. Add one using the form above or import from your resume.
                  </div>
                )}
                {experiences.map(e => (
                  <div
                    key={e.id}
                    style={{
                      padding: '1.25rem',
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                          {e.role} &mdash; <span style={{ color: 'var(--color-accent)' }}>{e.organization}</span>
                        </div>
                        {e.duration && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            {e.duration}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveExperience(e.id)}
                        aria-label={`Remove experience at ${e.organization}`}
                        style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                        title="Remove experience"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {e.responsibilities && (
                      <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {e.responsibilities}
                      </div>
                    )}

                    {e.skillsDemonstrated && e.skillsDemonstrated.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                        {e.skillsDemonstrated.map((s, idx) => (
                          <span key={idx} className="badge" style={{ background: 'var(--bg-card)', fontSize: '0.72rem' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Certifications Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '2rem' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>
                  Certifications &amp; Credentials ({certifications.length})
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                  Formal certifications and completed courses. Add these via &ldquo;Import from Resume&rdquo; or manage them here.
                </p>
              </div>

              {certifications.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                  No certifications recorded yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {certifications.map(c => (
                    <div
                      key={c.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.85rem 1rem',
                        background: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Award size={16} color="var(--color-accent)" />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{c.name}</div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                            {[c.issuer, c.year].filter(Boolean).join(' • ') || 'No issuer or year provided'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCertification(c.id)}
                        aria-label={`Remove certification ${c.name}`}
                        style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                        title="Remove certification"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CAREER PREFERENCES & STUDY GOALS */}
        {activeTab === 'preferences' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 760 }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>
                Career Target &amp; Study Parameters
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                These parameters guide the topological roadmap ordering, weekly scheduling constraints, and priority formulas.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="targetRole">Target Career Role</label>
                <select
                  id="targetRole"
                  className="form-select"
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value)}
                >
                  {careers.length === 0 && targetRole ? (
                    <option value={targetRole}>{targetRole}</option>
                  ) : (
                    careers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="completionPeriod">Target Completion Horizon</label>
                <select
                  id="completionPeriod"
                  className="form-select"
                  value={targetCompletionPeriod}
                  onChange={e => setTargetCompletionPeriod(e.target.value)}
                >
                  <option value="3 Months">3 Months (Accelerated / Sprint)</option>
                  <option value="6 Months">6 Months (Standard Semester Track)</option>
                  <option value="9 Months">9 Months (Comprehensive Preparation)</option>
                  <option value="1 Year">1 Year (Long-term Mastery)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="weeklyHours">
                  Weekly Study Availability: <strong>{weeklyHours} hours/week</strong>
                </label>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                  ~{(weeklyHours / 7).toFixed(1)} hrs/day
                </span>
              </div>
              <input
                id="weeklyHours"
                type="range"
                min={1}
                max={50}
                value={weeklyHours}
                onChange={e => setWeeklyHours(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-accent)', margin: '0.5rem 0' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span>Light (1-7 hrs)</span>
                <span>Balanced (14-20 hrs)</span>
                <span>Intensive (30-50 hrs)</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="stylePref">Preferred Learning Style</label>
              <select
                id="stylePref"
                className="form-select"
                value={learningStyle}
                onChange={e => setLearningStyle(e.target.value)}
              >
                <option value="Project-based">Project-based (Build hands-on milestone projects)</option>
                <option value="Theory & Practice">Theory &amp; Practice (Balanced conceptual rigor + coding)</option>
                <option value="Documentation & Code">Documentation &amp; Code (Deep dive into specs &amp; repos)</option>
                <option value="Visual & Video">Visual &amp; Video (Diagrams, system design walk-throughs)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="comps">Target Dream Organizations</label>
              <input
                id="comps"
                type="text"
                className="form-input"
                placeholder="e.g. Google, DeepMind, Microsoft Research, NVIDIA"
                value={targetCompaniesText}
                onChange={e => setTargetCompaniesText(e.target.value)}
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                Comma-separated list of employers used by AI Career Coach for tactical resume positioning.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="domains">Preferred Technical Domains</label>
              <input
                id="domains"
                type="text"
                className="form-input"
                placeholder="e.g. Agentic AI, Multimodal Systems, FinTech Analytics"
                value={preferredDomainsText}
                onChange={e => setPreferredDomainsText(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="constraints">Schedule or Hardware Constraints</label>
              <input
                id="constraints"
                type="text"
                className="form-input"
                placeholder="e.g. Weekend study only, Local CPU only (no CUDA GPU)"
                value={constraintsText}
                onChange={e => setConstraintsText(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="interests">Areas You Want to Explore</label>
              <input
                id="interests"
                type="text"
                className="form-input"
                placeholder="e.g. Neural Architecture Search, Vector Databases, Rust for ML"
                value={interestsText}
                onChange={e => setInterestsText(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <ResumeImportModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
        onApply={handleApplyResume}
      />
    </div>
  );
};
