import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Compass,
  Bot,
  Layers,
  Award,
  BarChart3,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Sparkles
} from 'lucide-react';

interface DashboardHeaderProps {
  roleTitle?: string;
  educationInfo?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  roleTitle,
  educationInfo
}) => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format display role
  const displayRole = roleTitle || (
    profile?.targetRole === 'aiml' ? 'Machine Learning Engineer' :
    profile?.targetRole === 'sde' ? 'Full Stack Developer' :
    profile?.targetRole === 'devops' ? 'DevOps & Cloud Engineer' :
    profile?.targetRole === 'data' ? 'Data Scientist' :
    'Machine Learning Engineer'
  );

  // Format education info
  const displayEducation = educationInfo || (
    profile ? `${profile.degree || profile.educationLevel} · Class of ${profile.graduationYear || 2026}` :
    'B.Tech CSE · Year 3'
  );

  return (
    <header className="editorial-header">
      {/* Brand: Golden Puzzle Logo + Wordmark */}
      <Link to="/dashboard" className="editorial-brand" title="SkillForge AI Dashboard">
        <div className="editorial-brand-logo">
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="34" height="34" rx="8" fill="#F3EBDD" stroke="#D9CCBA" strokeWidth="1.2" />
            {/* Golden Puzzle Piece */}
            <path
              d="M11 11H15C15 9.34 16.34 8 18 8C19.66 8 21 9.34 21 11H23C24.1 11 25 11.9 25 13V15C26.66 15 28 16.34 28 18C28 19.66 26.66 21 25 21V23C25 24.1 24.1 25 23 25H21C21 23.34 19.66 22 18 22C16.34 22 15 23.34 15 25H11C9.9 25 9 24.1 9 23V19C10.66 19 12 17.66 12 16C12 14.34 10.66 13 9 13V13C9 11.9 9.9 11 11 11Z"
              fill="#D38A19"
              stroke="#B3700E"
              strokeWidth="0.8"
            />
          </svg>
        </div>
        <span className="editorial-brand-name">SkillForge AI</span>
      </Link>

      {/* Right Pills & Menu */}
      <div className="editorial-header-actions">
        {/* Target Role Pill */}
        <div className="editorial-pill" title={`Target Career Role: ${displayRole}`}>
          <span className="editorial-pill-dot" />
          <span className="editorial-pill-text">Target · {displayRole}</span>
        </div>

        {/* Education Pill */}
        <div className="editorial-pill" title={`Education: ${displayEducation}`}>
          <span className="editorial-pill-text">{displayEducation}</span>
        </div>

        {/* Navigation Dropdown Pill */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            type="button"
            className="editorial-nav-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-label="Navigation Menu"
          >
            <Sparkles size={14} color="#D38A19" />
            <span>Explore</span>
            <ChevronDown size={14} style={{ transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {menuOpen && (
            <div className="editorial-nav-dropdown">
              <Link to="/roadmap" className="editorial-nav-link" onClick={() => setMenuOpen(false)}>
                <Compass size={16} color="#756659" />
                <span>Roadmap</span>
              </Link>
              <Link to="/analysis" className="editorial-nav-link" onClick={() => setMenuOpen(false)}>
                <Layers size={16} color="#756659" />
                <span>Skill Gaps</span>
              </Link>
              <Link to="/projects" className="editorial-nav-link" onClick={() => setMenuOpen(false)}>
                <Award size={16} color="#756659" />
                <span>Projects</span>
              </Link>
              <Link to="/ai-coach" className="editorial-nav-link" onClick={() => setMenuOpen(false)}>
                <Bot size={16} color="#D38A19" />
                <span>AI Coach</span>
              </Link>
              <Link to="/assessments" className="editorial-nav-link" onClick={() => setMenuOpen(false)}>
                <Award size={16} color="#756659" />
                <span>Assessments</span>
              </Link>
              <Link to="/analytics" className="editorial-nav-link" onClick={() => setMenuOpen(false)}>
                <BarChart3 size={16} color="#756659" />
                <span>Analytics</span>
              </Link>
              <Link to="/report" className="editorial-nav-link" onClick={() => setMenuOpen(false)}>
                <Sparkles size={16} color="#756659" />
                <span>Readiness Report</span>
              </Link>
              <Link to="/profile" className="editorial-nav-link" onClick={() => setMenuOpen(false)}>
                <User size={16} color="#756659" />
                <span>Profile</span>
              </Link>
              <Link to="/settings" className="editorial-nav-link" onClick={() => setMenuOpen(false)}>
                <Settings size={16} color="#756659" />
                <span>Settings</span>
              </Link>
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0.4rem 0' }} />
              <button
                type="button"
                className="editorial-nav-link"
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                  navigate('/auth');
                }}
              >
                <LogOut size={16} color="#756659" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
