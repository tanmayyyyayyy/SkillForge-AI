import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { Navbar } from '../components/Navbar.js';
import {
  Sparkles,
  ArrowRight,
  Compass,
  GitCompare,
  Milestone,
  Award,
  CheckCircle2,
  TrendingUp,
  Brain,
  ShieldCheck,
  AlertTriangle,
  FolderGit2,
  Layers
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user, demoLogin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleDemo = async () => {
    try {
      await demoLogin();
      toast.success('Loaded evaluator demo profile for Aarav Sharma.');
      navigate('/dashboard');
    } catch {
      toast.error('Failed to initialize demo mode.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        {/* HERO SECTION */}
        <section
          style={{
            padding: '5rem 2rem 4rem',
            textAlign: 'center',
            maxWidth: 1100,
            margin: '0 auto',
            position: 'relative'
          }}
        >
          {/* Subtle glow backdrop */}
          <div
            style={{
              position: 'absolute',
              top: '20%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 500,
              height: 300,
              background: 'radial-gradient(circle, rgba(211, 138, 25, 0.12) 0%, rgba(178, 112, 16, 0.04) 50%, transparent 70%)',
              pointerEvents: 'none',
              zIndex: 0
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.9rem',
                background: 'rgba(211, 138, 25, 0.1)',
                border: '1px solid rgba(211, 138, 25, 0.3)',
                borderRadius: 'var(--radius-full)',
                color: 'var(--color-accent)',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '1.5rem'
              }}
            >
              <Sparkles size={15} color="var(--color-accent)" />
              <span>SaarthiX Level 2 Hackathon Submission</span>
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                marginBottom: '1.5rem',
                lineHeight: 1.15,
                color: 'var(--text-primary)'
              }}
            >
              Stop Learning Randomly.{' '}
              <br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #D38A19 0%, #B27010 60%, #8C5507 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                Build Skills That Get You Hired.
              </span>
            </h1>

            <p
              style={{
                fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
                color: 'var(--text-secondary)',
                maxWidth: 720,
                margin: '0 auto 2.5rem',
                lineHeight: 1.6
              }}
            >
              Discover your skill gaps, prioritize what matters, and follow an AI-powered roadmap built around your dream career.
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                flexWrap: 'wrap'
              }}
            >
              <Link to={user ? "/dashboard" : "/auth?mode=register"} className="btn btn-primary btn-lg">
                <span>Build My Career Roadmap</span>
                <ArrowRight size={18} />
              </Link>

              <button onClick={handleDemo} className="btn btn-secondary btn-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-medium)' }}>
                <Sparkles size={18} color="var(--color-accent)" />
                <span>Explore Demo</span>
              </button>
            </div>
          </div>

          {/* REALISTIC DASHBOARD PREVIEW */}
          <div
            style={{
              marginTop: '4rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-medium)',
              background: 'var(--bg-card)',
              overflow: 'hidden',
              boxShadow: '0 20px 40px -10px rgba(48, 35, 25, 0.15)',
              textAlign: 'left'
            }}
          >
            {/* Mock Header Window Bar */}
            <div
              style={{
                background: 'rgba(48, 35, 25, 0.05)',
                padding: '0.75rem 1.25rem',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#f59e0b' }} />
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#10b981' }} />
                <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  SkillForge AI / Career Intelligence Cockpit &mdash; Target: AI/ML Engineer
                </span>
              </div>
              <span className="badge badge-medium">Live System Active</span>
            </div>

            {/* Dashboard Embedded Mock Content */}
            <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
              <div className="card" style={{ background: 'var(--bg-surface)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Explainable Readiness Score
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                    48%
                  </span>
                  <span style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>
                    +6% this week
                  </span>
                </div>
                <div className="progress-container" style={{ margin: '0.75rem 0' }}>
                  <div className="progress-bar" style={{ width: '48%' }} />
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  50% Base Skills &bull; 25% Assessments &bull; 25% Portfolio Projects
                </div>
              </div>

              <div className="card" style={{ background: 'var(--bg-surface)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Top Priority Skill Gap
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>PyTorch & Deep Learning</span>
                  <span className="badge badge-critical">Critical</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.5rem 0' }}>
                  Gap: 3 levels (current: 1/5, required: 4/5). Weight: 92%.
                </p>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: 500 }}>
                  &rarr; Next: Tensor operations & computational graph exercises
                </div>
              </div>

              <div className="card" style={{ background: 'var(--bg-surface)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Verified Portfolio Milestone
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Enterprise RAG Pipeline
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--success)' }}>
                  <CheckCircle2 size={15} /> 2 of 4 milestones completed
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
                  Proves: Python, Vector DBs, FastAPI, Docker
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* THE PROBLEM SECTION */}
        <section
          style={{
            padding: '5rem 2rem',
            background: 'rgba(48, 35, 25, 0.03)',
            borderTop: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                The Core Problem
              </span>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', fontWeight: 600, marginTop: '0.5rem' }}>
                Why Most Students Learn for Months Without Getting Hired
              </h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: 650, margin: '0.75rem auto 0' }}>
                Collecting certificates and watching tutorials gives an illusion of progress. Employers hire for demonstrable role readiness.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.75rem' }}>
              <div className="card">
                <AlertTriangle size={26} color="#ef4444" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Random, Unfocused Learning</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  Jumping from one trendy framework to another without knowing if your target role actually requires it in industry production.
                </p>
              </div>

              <div className="card">
                <Compass size={26} color="#f59e0b" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Unclear Career Requirements</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  Job descriptions list 30 buzzwords. Students cannot tell which 4 core skills actually decide whether they get shortlisted.
                </p>
              </div>

              <div className="card">
                <FolderGit2 size={26} color="#38bdf8" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Lack of Practical Evidence</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  Generic tutorial clones (to-do apps, basic calculators) fail to prove technical competence to engineering hiring managers.
                </p>
              </div>

              <div className="card">
                <TrendingUp size={26} color="var(--color-accent)" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>No Measurable Career Velocity</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  Students spend hundreds of hours studying without knowing if their actions are making them 10% or 0% closer to being hireable.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how-it-works" style={{ padding: '5rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Methodology
            </span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', fontWeight: 600, marginTop: '0.5rem' }}>How SkillForge AI Works</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 600, margin: '0.75rem auto 0' }}>
              Four structured steps to convert ambiguity into a clear, measurable hiring trajectory.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            <div className="card" style={{ position: 'relative' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'rgba(211, 138, 25, 0.25)', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
                01
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>Define Career Goal</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                Select from 8 curated industry career tracks: AI/ML Engineer, SDE, Frontend, Backend, Full-Stack, and more.
              </p>
            </div>

            <div className="card" style={{ position: 'relative' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'rgba(211, 138, 25, 0.25)', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
                02
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>Discover Skill Gaps</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                Deterministic engine compares your existing proficiency against role requirements, ranking gaps by importance and prerequisites.
              </p>
            </div>

            <div className="card" style={{ position: 'relative' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'rgba(211, 138, 25, 0.25)', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
                03
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>Follow Action Plan</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                Execute a staged roadmap with curated free resources, practice challenges, and practical portfolio milestones.
              </p>
            </div>

            <div className="card" style={{ position: 'relative' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'rgba(211, 138, 25, 0.25)', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
                04
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>Track Readiness</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                Take verification quizzes, submit project evidence, and watch your explainable Career Readiness Score climb.
              </p>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section
          id="features"
          style={{
            padding: '5rem 2rem',
            background: 'var(--bg-card)',
            borderTop: '1px solid var(--border-subtle)'
          }}
        >
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Product Capabilities
              </span>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', fontWeight: 600, marginTop: '0.5rem' }}>Built for Complete Career Preparation</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <GitCompare size={24} color="var(--color-accent)" style={{ flexShrink: 0, marginTop: 4 }} />
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.3rem' }}>Deterministic Skill Gap Analysis</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Transparent scoring formula that separates self-reported skills from verified assessments and calculates exact learning hours.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <Milestone size={24} color="var(--color-accent)" style={{ flexShrink: 0, marginTop: 4 }} />
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.3rem' }}>Topological Roadmap Ordering</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Respects prerequisite hierarchies so foundational requirements are mastered before tackling advanced distributed systems.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <Brain size={24} color="#ec4899" style={{ flexShrink: 0, marginTop: 4 }} />
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.3rem' }}>Personalized AI Career Coach</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Powered by Google Gemini with instant deterministic fallback, providing tactical study schedules and interview preparation.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <FolderGit2 size={24} color="#38bdf8" style={{ flexShrink: 0, marginTop: 4 }} />
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.3rem' }}>Project Recommendation Engine</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Suggests practical, multi-milestone projects with evaluation criteria specifically tailored to fill your missing skills.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <Award size={24} color="#10b981" style={{ flexShrink: 0, marginTop: 4 }} />
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.3rem' }}>Skill Verification Assessments</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Server-graded interactive quizzes that test conceptual rigor and upgrade skills to officially verified status.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <ShieldCheck size={24} color="#f59e0b" style={{ flexShrink: 0, marginTop: 4 }} />
                <div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '0.3rem' }}>Explainable Career Readiness</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Documented, weighted scoring model (50% skills, 25% quizzes, 25% projects) with actionable advice on gaining +10% readiness.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ padding: '6rem 2rem', textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 600, marginBottom: '1rem' }}>
            Your Next Career Move Starts Here.
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
            Answer the two most important questions in your career: What am I missing? And what should I do next?
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={user ? "/dashboard" : "/auth?mode=register"} className="btn btn-primary btn-lg">
              <span>Create My Roadmap</span>
              <ArrowRight size={18} />
            </Link>
            <button onClick={handleDemo} className="btn btn-secondary btn-lg">
              <Sparkles size={18} color="var(--color-accent)" />
              <span>Explore Demo Profile</span>
            </button>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer
        className="no-print"
        style={{
          padding: '2.5rem 2rem',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-card)',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.85rem'
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontWeight: 700 }}>
            <Layers size={18} color="var(--color-accent)" />
            SkillForge AI
          </div>
          <div>SaarthiX Hackathon Level 2 Submission &bull; Career Intelligence & Skill Development MVP</div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link to="/auth" style={{ color: 'var(--text-secondary)' }}>Sign In</Link>
            <button onClick={handleDemo} style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Demo Mode</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
