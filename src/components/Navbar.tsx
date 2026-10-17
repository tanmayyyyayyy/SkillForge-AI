import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { Layers, Sparkles, LogIn, UserPlus, LogOut, LayoutDashboard } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isDemo, logout, demoLogin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleDemoClick = async () => {
    try {
      await demoLogin();
      toast.success('Demo mode loaded! Welcome to SkillForge AI.');
      navigate('/dashboard');
    } catch {
      toast.error('Failed to load demo mode.');
    }
  };

  return (
    <header
      className="no-print"
      style={{
        height: 'var(--header-height)',
        background: 'rgba(213, 201, 185, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '1.25rem',
            letterSpacing: '-0.02em'
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #D38A19 0%, #B27010 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(211, 138, 25, 0.3)'
            }}
          >
            <Layers size={20} color="#ffffff" />
          </div>
          <span>SkillForge <span style={{ color: 'var(--color-accent)' }}>AI</span></span>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }} className="desktop-nav">
          <a href="#how-it-works" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
            How It Works
          </a>
          <a href="#features" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
            Features
          </a>
          <a href="#roles" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
            Career Tracks
          </a>
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <button
          onClick={handleDemoClick}
          className="btn btn-secondary btn-sm"
          style={{
            background: 'rgba(211, 138, 25, 0.12)',
            borderColor: 'rgba(211, 138, 25, 0.35)',
            color: 'var(--color-accent)',
            fontWeight: 600
          }}
          title="Instant 1-Click Evaluation for Hackathon Judges"
        >
          <Sparkles size={14} color="var(--color-accent)" />
          Explore Demo
        </button>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <Link to="/dashboard" className="btn btn-primary btn-sm">
              <LayoutDashboard size={15} />
              Dashboard
            </Link>
            <button
              onClick={() => {
                logout();
                toast.info('Logged out successfully.');
                navigate('/');
              }}
              className="btn btn-ghost btn-sm"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Link to="/auth" className="btn btn-ghost btn-sm">
              <LogIn size={15} />
              Sign In
            </Link>
            <Link to="/auth?mode=register" className="btn btn-primary btn-sm">
              <UserPlus size={15} />
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
