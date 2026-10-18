import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  User,
  Compass,
  GitCompare,
  FileSearch,
  Milestone,
  CalendarDays,
  Bot,
  FolderGit2,
  Award,
  BarChart3,
  FileText,
  Settings,
  Swords,
  Fingerprint,
  ShieldCheck,
  Network,
  TrendingUp,
  CornerDownLeft
} from 'lucide-react';

interface CommandItem {
  to: string;
  label: string;
  keywords: string;
  icon: React.ElementType;
}

const COMMANDS: CommandItem[] = [
  { to: '/dashboard', label: 'Main Dashboard', keywords: 'home overview main', icon: LayoutDashboard },
  { to: '/career-twin', label: 'Career Twin', keywords: 'twin model evidence simulate scenario', icon: Fingerprint },
  { to: '/war-room', label: 'Career War Room', keywords: 'war room tasks priorities mission today', icon: Swords },
  { to: '/resume-truth', label: 'Resume Truth Engine', keywords: 'resume truth verify claims upload pdf evidence', icon: ShieldCheck },
  { to: '/evidence-graph', label: 'Career Evidence Graph', keywords: 'evidence graph skills connections provenance verified', icon: Network },
  { to: '/trajectory', label: 'Trajectory Simulator', keywords: 'trajectory simulate projection scenarios effort hours', icon: TrendingUp },
  { to: '/profile', label: 'Student Profile', keywords: 'profile skills education', icon: User },
  { to: '/careers', label: 'Career Selection', keywords: 'career role target choose', icon: Compass },
  { to: '/analysis', label: 'Skill Gap Analysis', keywords: 'gap analysis skills compare', icon: GitCompare },
  { to: '/jd-analyzer', label: 'Job Description Analyzer', keywords: 'job description jd analyzer match', icon: FileSearch },
  { to: '/roadmap', label: 'Learning Roadmap', keywords: 'roadmap stages plan learning', icon: Milestone },
  { to: '/weekly-planner', label: 'Weekly Planner', keywords: 'week planner schedule seven days', icon: CalendarDays },
  { to: '/ai-coach', label: 'AI Career Coach', keywords: 'ai coach mentor chat assistant', icon: Bot },
  { to: '/projects', label: 'Project Portfolio', keywords: 'projects portfolio build forge', icon: FolderGit2 },
  { to: '/assessments', label: 'Skill Verification', keywords: 'assessment verify arena test quiz', icon: Award },
  { to: '/analytics', label: 'Progress Analytics', keywords: 'analytics progress stats trends', icon: BarChart3 },
  { to: '/report', label: 'Readiness Report', keywords: 'report readiness pdf download', icon: FileText },
  { to: '/settings', label: 'Settings', keywords: 'settings account preferences', icon: Settings }
];

export const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
    if (restoreFocusRef.current && typeof restoreFocusRef.current.focus === 'function') {
      restoreFocusRef.current.focus();
    }
  }, []);

  // Global Cmd/Ctrl+K toggle.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(prev => {
          if (prev) {
            setQuery('');
            setActiveIndex(0);
            return false;
          }
          restoreFocusRef.current = (document.activeElement as HTMLElement) ?? null;
          return true;
        });
      } else if (e.key === 'Escape') {
        setOpen(prev => (prev ? false : prev));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(c =>
      c.label.toLowerCase().includes(q) || c.keywords.includes(q)
    );
  }, [query]);

  const run = useCallback((item: CommandItem | undefined) => {
    if (!item) return;
    navigate(item.to);
    close();
  }, [navigate, close]);

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => (results.length === 0 ? 0 : (i + 1) % results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (results.length === 0 ? 0 : (i - 1 + results.length) % results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(results[activeIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  // Keep the active option scrolled into view.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open, results]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay command-palette-overlay"
      onClick={close}
      role="presentation"
      style={{ alignItems: 'flex-start', paddingTop: '12vh' }}
    >
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 560, width: '100%', padding: 0, overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.9rem 1.1rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <Search size={18} color="var(--text-muted)" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={onInputKeyDown}
            placeholder="Search pages and features…"
            aria-label="Search commands"
            aria-controls="command-palette-list"
            aria-activedescendant={results[activeIndex] ? `command-option-${activeIndex}` : undefined}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '1rem' }}
          />
          <kbd style={{ fontSize: '0.7rem', color: 'var(--text-muted)', border: '1px solid var(--border-medium)', borderRadius: 4, padding: '0.1rem 0.35rem' }}>Esc</kbd>
        </div>

        <ul
          ref={listRef}
          id="command-listbox"
          role="listbox"
          aria-label="Commands"
          style={{ listStyle: 'none', margin: 0, padding: '0.4rem', maxHeight: 380, overflowY: 'auto' }}
        >
          {results.length === 0 ? (
            <li style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              No matching pages.
            </li>
          ) : (
            results.map((item, index) => {
              const Icon = item.icon;
              const isActive = index === activeIndex;
              return (
                <li
                  key={item.to}
                  data-index={index}
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => run(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    background: isActive ? 'rgba(211, 138, 25, 0.14)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 600 : 500,
                    transition: 'background var(--transition-fast)'
                  }}
                >
                  <Icon size={17} color={isActive ? 'var(--color-accent)' : 'var(--text-muted)'} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {isActive && <CornerDownLeft size={14} style={{ opacity: 0.5 }} />}
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
};
