import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import { StudentSkill, StudentProject, CareerRole } from '../types/index.js';
import {
  GraduationCap,
  Code2,
  Target,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Plus,
  Trash2,
  Sparkles
} from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const { profile, setProfile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [careers, setCareers] = useState<Array<Partial<CareerRole>>>([]);

  // Step 1: Background & Education
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [educationLevel, setEducationLevel] = useState<any>(profile?.educationLevel || 'Undergraduate');
  const [degree, setDegree] = useState(profile?.degree || 'Computer Science & Engineering');
  const [graduationYear, setGraduationYear] = useState<number>(profile?.graduationYear || (new Date().getFullYear() + 2));
  const [experienceLevel, setExperienceLevel] = useState<any>(profile?.experienceLevel || 'Beginner');

  // Step 2: Current Skills & Projects
  const [skills, setSkills] = useState<StudentSkill[]>(profile?.currentSkills || [
    { skillId: 'python', name: 'Python', category: 'Programming Languages', proficiency: 3, status: 'self-reported' },
    { skillId: 'sql', name: 'SQL', category: 'Data Management', proficiency: 2, status: 'self-reported' }
  ]);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState<any>(2);

  const [projects, setProjects] = useState<StudentProject[]>(profile?.existingProjects || []);
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projRepo, setProjRepo] = useState('');

  // Step 3: Target Role & Goals
  const [targetRole, setTargetRole] = useState(profile?.targetRole || 'aiml');
  const [targetCompaniesText, setTargetCompaniesText] = useState(profile?.targetCompanies?.join(', ') || 'Google, Microsoft, Amazon');
  const [weeklyHours, setWeeklyHours] = useState(profile?.weeklyHours || 14);
  const [learningStyle, setLearningStyle] = useState<any>(profile?.preferredLearningStyle || 'Project-based');
  const [interestsText, setInterestsText] = useState(profile?.interests?.join(', ') || 'Machine Learning, Web Development, Cloud Computing');

  useEffect(() => {
    api.careers.getAll()
      .then(res => setCareers(res.careers))
      .catch(() => toast.error('Failed to load career tracks. You can still continue with the default target role.'));
  }, [toast]);

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    const skillId = newSkillName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (skills.some(s => s.skillId === skillId)) {
      toast.info('Skill already in list.');
      return;
    }
    setSkills(prev => [
      ...prev,
      {
        skillId,
        name: newSkillName.trim(),
        category: 'General',
        proficiency: Number(newSkillLevel) as any,
        status: 'self-reported'
      }
    ]);
    setNewSkillName('');
    setNewSkillLevel(2);
  };

  const handleRemoveSkill = (skillId: string) => {
    setSkills(prev => prev.filter(s => s.skillId !== skillId));
  };

  const handleAddProject = () => {
    if (!projTitle.trim()) return;
    setProjects(prev => [
      ...prev,
      {
        id: `proj_${Date.now()}`,
        title: projTitle.trim(),
        description: projDesc.trim(),
        technologies: ['Custom'],
        repoUrl: projRepo.trim() || undefined,
        skillsDemonstrated: [],
        completed: true
      }
    ]);
    setProjTitle('');
    setProjDesc('');
    setProjRepo('');
  };

  const handleFinishOnboarding = async () => {
    setIsSubmitting(true);
    try {
      const targetCompanies = targetCompaniesText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const interests = interestsText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const payload = {
        fullName,
        educationLevel,
        degree,
        graduationYear: Number(graduationYear),
        experienceLevel,
        currentSkills: skills,
        existingProjects: projects,
        targetRole,
        targetCompanies,
        weeklyHours: Number(weeklyHours),
        preferredLearningStyle: learningStyle,
        interests
      };

      const res = await api.profile.update(payload);
      setProfile(res.profile);
      toast.success('Career Profile successfully created! Generating skill gap analysis...');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete onboarding.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', padding: '2.5rem 1.5rem' }}>
      <div style={{ maxWidth: 740, margin: '0 auto' }}>
        {/* Onboarding Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Personalize Your Career Roadmap
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Tell us about your background, current capabilities, and target career role.
          </p>
        </div>

        {/* Step Progress Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '2rem',
            position: 'relative'
          }}
        >
          {[
            { num: 1, label: 'Education & Background', icon: GraduationCap },
            { num: 2, label: 'Current Skills & Projects', icon: Code2 },
            { num: 3, label: 'Target Career & Goals', icon: Target }
          ].map(s => {
            const Icon = s.icon;
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;

            return (
              <div
                key={s.num}
                aria-current={isCurrent ? 'step' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  zIndex: 2,
                  background: 'var(--bg-main)',
                  padding: '0 0.5rem'
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: isCompleted ? 'var(--success)' : isCurrent ? 'var(--color-accent)' : 'var(--bg-surface)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    border: '2px solid',
                    borderColor: isCompleted ? 'var(--success)' : isCurrent ? 'var(--color-accent)' : 'var(--border-medium)',
                    boxShadow: isCurrent ? '0 0 12px rgba(211, 138, 25, 0.4)' : 'none'
                  }}
                >
                  {isCompleted ? <CheckCircle2 size={18} /> : <Icon size={16} />}
                </div>
                <div style={{ display: 'none' }} className="step-label-desktop">
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {s.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Form Container */}
        <div className="card" style={{ padding: '2rem' }}>
          {/* STEP 1: EDUCATION */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <GraduationCap size={22} color="var(--color-accent)" />
                <span>Step 1: Education & Experience</span>
              </h2>

              <div className="form-group">
                <label className="form-label" htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  required
                  className="form-input"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Tanmay Jain"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="eduLevel">Education Level</label>
                  <select
                    id="eduLevel"
                    className="form-select"
                    value={educationLevel}
                    onChange={e => setEducationLevel(e.target.value)}
                  >
                    <option value="Undergraduate">Undergraduate (B.Tech / B.E / B.Sc)</option>
                    <option value="Postgraduate">Postgraduate (M.Tech / M.S / MCA)</option>
                    <option value="Bootcamp">Bootcamp / Training Program</option>
                    <option value="Self-Taught">Self-Taught Developer</option>
                    <option value="High School">High School Student</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="gradYear">Graduation Year</label>
                  <input
                    id="gradYear"
                    type="number"
                    min={2020}
                    max={2032}
                    className="form-input"
                    value={graduationYear}
                    onChange={e => setGraduationYear(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="degree">Degree & Specialization</label>
                <input
                  id="degree"
                  type="text"
                  className="form-input"
                  placeholder="e.g. B.Tech Computer Science & Artificial Intelligence"
                  value={degree}
                  onChange={e => setDegree(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" id="exp-level-label">Self-Assessed Experience Level</label>
                <div role="radiogroup" aria-labelledby="exp-level-label" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  {['Beginner', 'Intermediate', 'Advanced'].map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      role="radio"
                      aria-checked={experienceLevel === lvl}
                      onClick={() => setExperienceLevel(lvl as any)}
                      className={`btn ${experienceLevel === lvl ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.75rem' }}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!fullName.trim()) {
                      toast.error('Please enter your full name.');
                      return;
                    }
                    setStep(2);
                  }}
                  className="btn btn-primary"
                >
                  <span>Continue to Skills</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SKILLS & PROJECTS */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Code2 size={22} color="var(--color-accent)" />
                <span>Step 2: Current Capabilities & Existing Projects</span>
              </h2>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                List the technical skills you currently have and rate your self-assessed proficiency (1 = Beginner, 5 = Expert).
              </p>

              {/* Add Skill Form */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-end',
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ flex: 2, minWidth: 180 }}>
                  <label className="form-label" htmlFor="newSkillName">Skill Name</label>
                  <input
                    id="newSkillName"
                    type="text"
                    className="form-input"
                    placeholder="e.g. React, Docker, Python, Java"
                    value={newSkillName}
                    onChange={e => setNewSkillName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 130 }}>
                  <label className="form-label" htmlFor="newSkillLevel">Proficiency (1-5)</label>
                  <select
                    id="newSkillLevel"
                    className="form-select"
                    value={newSkillLevel}
                    onChange={e => setNewSkillLevel(Number(e.target.value))}
                  >
                    <option value={1}>1 - Beginner</option>
                    <option value={2}>2 - Elementary</option>
                    <option value={3}>3 - Intermediate</option>
                    <option value={4}>4 - Advanced</option>
                    <option value={5}>5 - Expert</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="btn btn-secondary"
                  style={{ alignSelf: 'flex-end' }}
                >
                  <Plus size={16} />
                  <span>Add Skill</span>
                </button>
              </div>

              {/* Skill Badges List */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.65rem',
                  marginBottom: '2rem',
                  padding: '1rem',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  minHeight: 60
                }}
              >
                {skills.length === 0 ? (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No skills added yet. Add skills above to evaluate your gaps accurately.
                  </span>
                ) : (
                  skills.map(s => (
                    <div
                      key={s.skillId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.35rem 0.75rem',
                        background: 'rgba(211, 138, 25, 0.12)',
                        border: '1px solid rgba(211, 138, 25, 0.3)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</span>
                      <span className="badge badge-pill" style={{ background: 'var(--color-accent)', color: '#FFFFFF', fontSize: '0.72rem', fontWeight: 600 }}>
                        Lvl {s.proficiency}/5
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(s.skillId)}
                        aria-label={`Remove ${s.name}`}
                        title={`Remove ${s.name}`}
                        style={{ color: 'var(--text-muted)', display: 'flex' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Optional Existing Project */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Add an Existing Project (Optional)</h3>
                <div className="form-group">
                  <input
                    type="text"
                    className="form-input"
                    aria-label="Project title"
                    placeholder="Project Title (e.g. Expense Tracker API)"
                    value={projTitle}
                    onChange={e => setProjTitle(e.target.value)}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    aria-label="Brief project description"
                    placeholder="Brief description"
                    value={projDesc}
                    onChange={e => setProjDesc(e.target.value)}
                  />
                  <input
                    type="url"
                    className="form-input"
                    aria-label="GitHub repository URL"
                    placeholder="GitHub Repo URL (https://...)"
                    value={projRepo}
                    onChange={e => setProjRepo(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddProject}
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: '0.65rem' }}
                >
                  <Plus size={14} /> Add Project
                </button>

                {projects.length > 0 && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--success)' }}>
                    &check; {projects.length} project(s) recorded.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                <button type="button" onClick={() => setStep(1)} className="btn btn-secondary">
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="button" onClick={() => setStep(3)} className="btn btn-primary">
                  <span>Continue to Target Role</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: TARGET ROLE & GOALS */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Target size={22} color="#10b981" />
                <span>Step 3: Target Role & Career Preferences</span>
              </h2>

              <div className="form-group">
                <label className="form-label" id="career-track-label">Select Your Target Career Track</label>
                <div role="radiogroup" aria-labelledby="career-track-label" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                  {careers.map(c => (
                    <div
                      key={c.id}
                      role="radio"
                      aria-checked={targetRole === c.id}
                      tabIndex={0}
                      onClick={() => setTargetRole(c.id!)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setTargetRole(c.id!);
                        }
                      }}
                      style={{
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        background: targetRole === c.id ? 'rgba(211, 138, 25, 0.08)' : 'var(--bg-surface)',
                        border: '2px solid',
                        borderColor: targetRole === c.id ? 'var(--color-accent)' : 'var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {c.title}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {c.category}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--success)', marginTop: '0.45rem', fontWeight: 600 }}>
                        Demand: {c.marketDemand}
                      </div>
                    </div>
                  ))}
                </div>
                {careers.length === 0 && (
                  <div role="status" style={{ marginTop: '0.6rem', fontSize: '0.84rem', color: 'var(--warning)', padding: '0.6rem 0.75rem', background: 'rgba(211, 138, 25, 0.08)', border: '1px solid rgba(211, 138, 25, 0.3)', borderRadius: 'var(--radius-sm)' }}>
                    No career tracks are loaded. You can still finish onboarding with the default target role.
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="hours">Weekly Learning Availability</label>
                  <select
                    id="hours"
                    className="form-select"
                    value={weeklyHours}
                    onChange={e => setWeeklyHours(Number(e.target.value))}
                  >
                    <option value={8}>8 hours/week (~1 hour daily)</option>
                    <option value={14}>14 hours/week (~2 hours daily)</option>
                    <option value={20}>20 hours/week (Semi-intensive)</option>
                    <option value={35}>35+ hours/week (Full-time intensive)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="style">Preferred Learning Style</label>
                  <select
                    id="style"
                    className="form-select"
                    value={learningStyle}
                    onChange={e => setLearningStyle(e.target.value)}
                  >
                    <option value="Project-based">Project-based (Build immediately)</option>
                    <option value="Theory & Practice">Theory & Practice (Balanced)</option>
                    <option value="Documentation & Code">Documentation & Code (Official docs)</option>
                    <option value="Visual & Video">Visual & Video (Diagrams & walkthroughs)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="companies">Target Companies (Comma separated)</label>
                <input
                  id="companies"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Google, Microsoft, DeepMind, Swiggy, Stripe"
                  value={targetCompaniesText}
                  onChange={e => setTargetCompaniesText(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="interests">Areas of Interest</label>
                <input
                  id="interests"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Deep Learning, Distributed Systems, Cloud Architecture"
                  value={interestsText}
                  onChange={e => setInterestsText(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem' }}>
                <button type="button" onClick={() => setStep(2)} className="btn btn-secondary">
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  type="button"
                  onClick={handleFinishOnboarding}
                  disabled={isSubmitting}
                  className="btn btn-primary btn-lg"
                >
                  <Sparkles size={18} />
                  <span>{isSubmitting ? 'Analyzing & Generating...' : 'Generate Career Intelligence'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
