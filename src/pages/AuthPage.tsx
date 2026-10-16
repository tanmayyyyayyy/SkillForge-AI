import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { Layers, Sparkles, LogIn, UserPlus, ArrowRight, ShieldCheck } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [isRegister, setIsRegister] = useState(searchParams.get('mode') === 'register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login, register, demoLogin, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    setIsRegister(searchParams.get('mode') === 'register');
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          throw new Error('Please enter your full name.');
        }
        await register(name.trim(), email.trim(), password);
        toast.success('Account created! Welcome to SkillForge AI.');
        navigate('/onboarding');
      } else {
        await login(email.trim(), password);
        toast.success('Welcome back!');
        navigate('/dashboard');
      }
    } catch (err: any) {
      const msg = err.message || 'Authentication failed. Please check your credentials.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoAccess = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      await demoLogin();
      toast.success('Demo profile loaded! You are logged in as Aarav Sharma.');
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize demo session.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main)',
        padding: '2rem 1.5rem',
        position: 'relative'
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: '100%',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem 2rem',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.65rem',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '1.4rem'
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #D38A19 0%, #B27010 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(211, 138, 25, 0.35)'
              }}
            >
              <Layers size={20} color="#ffffff" />
            </div>
            <span>SkillForge <span style={{ color: 'var(--color-accent)' }}>AI</span></span>
          </Link>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '1.25rem' }}>
            {isRegister ? 'Create Your Account' : 'Welcome Back'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.35rem' }}>
            {isRegister
              ? 'Start building your personalized career roadmap today.'
              : 'Sign in to access your saved skills, roadmap, and progress.'}
          </p>
        </div>

        {/* 1-Click Evaluator Demo Access Box */}
        <div
          style={{
            background: 'rgba(211, 138, 25, 0.08)',
            border: '1px solid rgba(211, 138, 25, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.75rem',
            textAlign: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: 'var(--color-accent)', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <Sparkles size={14} color="var(--color-accent)" />
            <span>Hackathon Evaluator Quick Access</span>
          </div>
          <button
            type="button"
            onClick={handleDemoAccess}
            disabled={isLoading}
            className="btn btn-secondary"
            style={{
              width: '100%',
              background: 'rgba(211, 138, 25, 0.15)',
              color: 'var(--color-accent)',
              borderColor: 'rgba(211, 138, 25, 0.35)',
              fontSize: '0.88rem',
              fontWeight: 600
            }}
          >
            <ShieldCheck size={16} color="var(--color-accent)" />
            <span>Explore Demo Profile (Aarav Sharma)</span>
          </button>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.45rem' }}>
            Instant access with pre-loaded AI/ML profile, completed tasks, and assessments.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Or continue with email
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--danger-subtle)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--danger)',
              fontSize: '0.85rem',
              marginBottom: '1.25rem'
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label" htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                required
                className="form-input"
                placeholder="e.g. Tanmay Jain"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              required
              className="form-input"
              placeholder="you@domain.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              className="form-input"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : isRegister ? (
              <>
                <UserPlus size={16} />
                <span>Create Account</span>
              </>
            ) : (
              <>
                <LogIn size={16} />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Switch mode */}
        <div style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          {isRegister ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(false); setErrorMessage(''); }}
                style={{ color: 'var(--color-accent)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(true); setErrorMessage(''); }}
                style={{ color: 'var(--color-accent)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Create One
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
