import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import {
  LayoutDashboard,
  User,
  Compass,
  GitCompare,
  Milestone,
  Bot,
  FolderGit2,
  Award,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  Layers,
  ChevronRight
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { to: '/dashboard', label: 'Main Dashboard', icon: LayoutDashboard },
    { to: '/profile', label: 'Student Profile', icon: User },
    { to: '/careers', label: 'Career Selection', icon: Compass },
    { to: '/analysis', label: 'Skill Gap Analysis', icon: GitCompare },
    { to: '/roadmap', label: 'Learning Roadmap', icon: Milestone },
    { to: '/ai-coach', label: 'AI Career Coach', icon: Bot },
    { to: '/projects', label: 'Project Portfolio', icon: FolderGit2 },
    { to: '/assessments', label: 'Skill Verification', icon: Award },
    { to: '/analytics', label: 'Progress Analytics', icon: BarChart3 },
    { to: '/report', label: 'Readiness Report', icon: FileText },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className="app-sidebar no-print"
      style={{
        width: 'var(--sidebar-width)',
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 40,
        boxShadow: '2px 0 10px rgba(48, 35, 25, 0.04)'
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'var(--color-paper-light)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(48, 35, 25, 0.08)'
            }}
          >
            <svg width="22" height="22" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M11 11H15C15 9.34 16.34 8 18 8C19.66 8 21 9.34 21 11H23C24.1 11 25 11.9 25 13V15C26.66 15 28 16.34 28 18C28 19.66 26.66 21 25 21V23C25 24.1 24.1 25 23 25H21C21 23.34 19.66 22 18 22C16.34 22 15 23.34 15 25H11C9.9 25 9 24.1 9 23V19C10.66 19 12 17.66 12 16C12 14.34 10.66 13 9 13V13C9 11.9 9.9 11 11 11Z"
                fill="#D38A19"
                stroke="#B3700E"
                strokeWidth="0.8"
              />
            </svg>
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              SkillForge AI
            </span>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Career Intelligence</div>
          </div>
        </div>

        {/* Mobile toggle button */}
        <button
          type="button"
          className="mobile-nav-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: 'none',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
            borderRadius: 6,
            padding: '0.35rem 0.6rem',
            fontSize: '0.8rem',
            color: 'var(--text-primary)',
            cursor: 'pointer'
          }}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? 'Close ✕' : 'Menu ☰'}
        </button>
      </div>

      {/* Navigation Links */}
      <nav
        className={`sidebar-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}
        style={{
          flex: 1,
          padding: '1rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          overflowY: 'auto'
        }}
      >
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(211, 138, 25, 0.14)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--color-accent)' : '3px solid transparent',
                fontSize: '0.9rem',
                fontWeight: isActive ? 700 : 500,
                transition: 'all var(--transition-fast)'
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} color={isActive ? 'var(--color-accent)' : 'inherit'} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  <ChevronRight size={13} style={{ opacity: 0.35 }} />
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer Profile Card */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(48, 35, 25, 0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #D38A19 0%, #F5A623 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
              flexShrink: 0
            }}
          >
            {user?.name?.charAt(0).toUpperCase() || 'S'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                fontSize: '0.86rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {user?.name || 'Student'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              {profile?.targetRole ? profile.targetRole.toUpperCase() : 'TRACK SELECTED'}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            logout();
            navigate('/');
          }}
          className="btn btn-ghost btn-sm"
          style={{ padding: '0.4rem', color: 'var(--text-muted)' }}
          title="Sign Out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};
