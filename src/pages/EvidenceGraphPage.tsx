import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import type { CareerEvidenceGraph, EvidenceGraphNode } from '../types/index.js';
import { Network, BadgeCheck, FolderGit2, List, Share2, Flag } from 'lucide-react';

type GraphView = 'map' | 'list';

const NODE_COLORS: Record<EvidenceGraphNode['kind'], string> = {
  role: 'var(--color-accent)',
  skill: 'var(--text-primary)',
  assessment: 'var(--success)',
  project: 'var(--color-accent)',
  milestone: 'var(--text-secondary)'
};

function nodeRoute(node: EvidenceGraphNode): { route: string; label: string } | null {
  switch (node.kind) {
    case 'milestone':
      return { route: '/roadmap', label: 'Open roadmap' };
    case 'assessment':
      return { route: '/assessments', label: 'Open assessments' };
    case 'project':
      return { route: '/projects', label: 'Open project' };
    case 'skill':
      return { route: '/roadmap', label: 'Review skill gap' };
    default:
      return null;
  }
}

export const EvidenceGraphPage: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [graph, setGraph] = useState<CareerEvidenceGraph | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<GraphView>('map');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.evidenceGraph.get();
        if (!cancelled) setGraph(res.graph);
      } catch (err: any) {
        if (!cancelled) toast.error(err.message || 'Failed to load your evidence graph.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [toast]);

  const derived = useMemo(() => {
    if (!graph) return null;
    const nodeById = new Map(graph.nodes.map(n => [n.id, n]));
    const evidenceBySkill = new Map<string, EvidenceGraphNode[]>();
    for (const edge of graph.edges) {
      if (edge.kind === 'requires') continue;
      const skill = nodeById.get(edge.from);
      const artefact = nodeById.get(edge.to);
      if (!skill || !artefact || skill.kind !== 'skill') continue;
      const list = evidenceBySkill.get(edge.from) ?? [];
      list.push(artefact);
      evidenceBySkill.set(edge.from, list);
    }
    const skills = graph.nodes
      .filter(n => n.kind === 'skill')
      .sort((a, b) => {
        if (a.requiredByRole !== b.requiredByRole) return a.requiredByRole ? -1 : 1;
        const ea = (evidenceBySkill.get(a.id) ?? []).length;
        const eb = (evidenceBySkill.get(b.id) ?? []).length;
        return eb - ea;
      });
    const artefacts = graph.nodes.filter(n => n.kind === 'assessment' || n.kind === 'project');
    const milestones = graph.nodes.filter(n => n.kind === 'milestone');
    return { nodeById, evidenceBySkill, skills, artefacts, milestones, nodes: graph.nodes };
  }, [graph]);

  const layout = useMemo(() => {
    if (!graph) return null;
    const role = graph.nodes.filter(n => n.kind === 'role');
    const skill = graph.nodes.filter(n => n.kind === 'skill');
    const other = graph.nodes.filter(n => n.kind !== 'role' && n.kind !== 'skill');
    const positions = new Map<string, { x: number; y: number }>();
    const rowH = 44;
    const colX = { role: 40, skill: 320, other: 620 };
    const place = (list: EvidenceGraphNode[], x: number) =>
      list.forEach((n, i) => positions.set(n.id, { x, y: 46 + i * rowH }));
    place(role, colX.role);
    place(skill, colX.skill);
    place(other, colX.other);
    const maxRows = Math.max(role.length, skill.length, other.length, 1);
    return { positions, width: 860, height: 80 + maxRows * rowH, colX };
  }, [graph]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(prev => (prev === id ? null : id));
  }, []);

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div aria-hidden="true" className="spin" style={{ width: 36, height: 36, border: '3px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', margin: '0 auto 1rem' }} />
          <div>Mapping your evidence...</div>
        </div>
      </div>
    );
  }

  if (!graph || !derived || !layout) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <Network size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
        <div style={{ color: 'var(--text-secondary)' }}>Complete onboarding to build your evidence graph.</div>
      </div>
    );
  }

  const { summary } = graph;
  const selected = selectedId ? derived.nodeById.get(selectedId) ?? null : null;
  const selectedEvidence = selected ? derived.evidenceBySkill.get(selected.id) ?? [] : [];
  const selectedActions = selected ? nodeRoute(selected) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Network size={26} color="var(--color-accent)" />
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.9rem', margin: 0 }}>
            Career Evidence Graph
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0.4rem 0 0' }}>
          How your target role, skills, learning milestones, assessments, and projects connect — derived only
          from what you have actually recorded.
        </p>
        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/war-room" className="btn btn-ghost btn-sm">Career War Room</Link>
          <Link to="/jd-analyzer" className="btn btn-ghost btn-sm">JD Analyzer</Link>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
        <Stat label="Skills" value={derived.skills.length} color="var(--text-primary)" />
        <Stat label="Verified" value={summary.assessed + summary.projectVerified} color="var(--success)" />
        <Stat label="Self-reported" value={summary.selfReported} color="var(--text-secondary)" />
        <Stat label="Milestones" value={derived.milestones.length} color="var(--color-accent)" />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div role="tablist" aria-label="Evidence graph view" style={{ display: 'inline-flex', gap: '0.25rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '0.2rem' }}>
          <ViewTab active={view === 'map'} onClick={() => setView('map')} icon={<Share2 size={14} />} label="Map" />
          <ViewTab active={view === 'list'} onClick={() => setView('list')} icon={<List size={14} />} label="List" />
        </div>
      </div>

      {view === 'map' ? (
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 520px', minWidth: 300, overflowX: 'auto' }}>
              <svg
                role="group"
                aria-label="Evidence graph. Select a node to see details."
                viewBox={`0 0 ${layout.width} ${layout.height}`}
                style={{ width: '100%', minWidth: 520, height: 'auto', display: 'block' }}
              >
                {graph.edges.map((edge, i) => {
                  const a = layout.positions.get(edge.from);
                  const b = layout.positions.get(edge.to);
                  if (!a || !b) return null;
                  const dim = selectedId && edge.from !== selectedId && edge.to !== selectedId;
                  const dash = edge.kind === 'requires' ? '4 3' : undefined;
                  return (
                    <line
                      key={`${edge.from}-${edge.to}-${edge.kind}-${i}`}
                      x1={a.x + 130}
                      y1={a.y + 14}
                      x2={b.x}
                      y2={b.y + 14}
                      stroke={dim ? 'var(--border-light)' : 'var(--border-medium)'}
                      strokeDasharray={dash}
                      strokeWidth={dim ? 1 : 1.5}
                    />
                  );
                })}
                {graph.nodes.map(node => {
                  const pos = layout.positions.get(node.id);
                  if (!pos) return null;
                  const isSelected = selectedId === node.id;
                  const connected =
                    !selectedId ||
                    node.id === selectedId ||
                    graph.edges.some(
                      e =>
                        (e.from === selectedId && e.to === node.id) ||
                        (e.to === selectedId && e.from === node.id)
                    );
                  const color = NODE_COLORS[node.kind];
                  return (
                    <g
                      key={node.id}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      aria-label={`${node.kind}: ${node.label}`}
                      onClick={() => handleSelect(node.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelect(node.id);
                        }
                      }}
                      style={{ cursor: 'pointer', opacity: connected ? 1 : 0.4 }}
                    >
                      <rect
                        x={pos.x}
                        y={pos.y}
                        width={130}
                        height={28}
                        rx={6}
                        fill={isSelected ? 'var(--color-accent)' : 'var(--bg-surface)'}
                        stroke={color}
                        strokeWidth={isSelected ? 2 : 1}
                      />
                      <text
                        x={pos.x + 8}
                        y={pos.y + 18}
                        fontSize="11"
                        fill={isSelected ? '#fff' : 'var(--text-primary)'}
                        style={{ pointerEvents: 'none' }}
                      >
                        {node.label.length > 18 ? `${node.label.slice(0, 17)}…` : node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div style={{ flex: '1 1 260px', minWidth: 240, minHeight: 160 }} aria-live="polite">
              {selected ? (
                <NodeDetail
                  node={selected}
                  evidence={selectedEvidence}
                  actions={selectedActions}
                  onAction={navigate}
                />
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '0.5rem 0' }}>
                  Select any node in the map to see its evidence and a next action.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Skills</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {derived.skills.filter(s => s.requiredByRole).length} required by role
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {derived.skills.map(skill => {
                const evidence = derived.evidenceBySkill.get(skill.id) ?? [];
                return (
                  <div key={skill.id} style={{ padding: '0.85rem 1rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, flex: 1, minWidth: 140 }}>{skill.label}</span>
                      {skill.requiredByRole && (
                        <span className="badge" style={{ fontSize: '0.68rem' }}>Required L{skill.requiredLevel ?? 0}</span>
                      )}
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>L{skill.proficiency ?? 0}</span>
                      <span className="badge" style={{ fontSize: '0.72rem', color: statusColor(skill.status), borderColor: statusColor(skill.status) }}>
                        {statusLabel(skill.status)}
                      </span>
                    </div>
                    {evidence.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                        {evidence.map(ev => (
                          <span key={ev.id} className="badge" style={{ fontSize: '0.7rem', background: 'var(--bg-card)' }}>
                            {ev.kind === 'assessment' ? <BadgeCheck size={11} /> : <FolderGit2 size={11} />}
                            {ev.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Evidence artefacts</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{derived.artefacts.length}</span>
            </div>
            {derived.artefacts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                No assessments or projects yet. Pass an assessment or save a project to start building evidence.
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {derived.artefacts.map(a => (
                  <span key={a.id} className="badge" style={{ fontSize: '0.76rem', background: 'var(--bg-surface)' }}>
                    {a.kind === 'assessment' ? <BadgeCheck size={12} /> : <FolderGit2 size={12} />}
                    {a.label}{a.detail ? ` · ${a.detail}` : ''}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Learning milestones</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{derived.milestones.length}</span>
            </div>
            {derived.milestones.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                No roadmap milestones yet. Generate your roadmap to see the steps that build each skill.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {derived.milestones.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}>
                    <Flag size={14} color={m.completed ? 'var(--success)' : 'var(--text-muted)'} />
                    <span style={{ flex: 1 }}>{m.label}</span>
                    {typeof m.estimatedHours === 'number' && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{m.estimatedHours}h</span>
                    )}
                    <span className="badge" style={{ fontSize: '0.68rem' }}>
                      {m.completed ? 'Completed' : 'In progress'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{graph.disclaimer}</p>
    </div>
  );
};

const ViewTab: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    onClick={onClick}
    className="btn btn-ghost"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.35rem 0.75rem',
      fontSize: '0.82rem',
      fontWeight: 600,
      background: active ? 'var(--bg-card)' : 'transparent',
      borderRadius: 'var(--radius-sm)',
      border: 'none'
    }}
  >
    {icon}
    {label}
  </button>
);

const NodeDetail: React.FC<{
  node: EvidenceGraphNode;
  evidence: EvidenceGraphNode[];
  actions: { route: string; label: string } | null;
  onAction: (route: string) => void;
}> = ({ node, evidence, actions, onAction }) => (
  <div style={{ padding: '1rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
      {node.kind}
    </div>
    <div style={{ fontWeight: 700, fontSize: '1.05rem', margin: '0.15rem 0 0.5rem' }}>{node.label}</div>
    {node.kind === 'skill' && (
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <span>Evidence: <strong style={{ color: statusColor(node.status) }}>{statusLabel(node.status)}</strong></span>
        <span>Current level: L{node.proficiency ?? 0}{node.requiredByRole ? ` · required L${node.requiredLevel ?? 0}` : ''}</span>
      </div>
    )}
    {node.detail && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>{node.detail}</div>}
    {evidence.length > 0 && (
      <div style={{ marginTop: '0.6rem' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Supported by</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {evidence.map(ev => (
            <span key={ev.id} style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {ev.kind === 'assessment' ? <BadgeCheck size={12} /> : <FolderGit2 size={12} />} {ev.label}
            </span>
          ))}
        </div>
      </div>
    )}
    {actions && (
      <button type="button" className="btn btn-secondary" style={{ marginTop: '0.75rem', fontSize: '0.82rem' }} onClick={() => onAction(actions.route)}>
        {actions.label}
      </button>
    )}
  </div>
);

function statusLabel(status?: string): string {
  switch (status) {
    case 'assessed': return 'Assessment-verified';
    case 'verified_project': return 'Project-verified';
    case 'self-reported': return 'Self-reported';
    default: return 'No evidence';
  }
}

function statusColor(status?: string): string {
  switch (status) {
    case 'assessed': return 'var(--success)';
    case 'verified_project': return 'var(--color-accent)';
    case 'self-reported': return 'var(--text-secondary)';
    default: return 'var(--text-muted)';
  }
}

const Stat: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="card">
    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
    <div style={{ fontSize: '1.9rem', fontWeight: 800, fontFamily: 'var(--font-display)', color }}>{value}</div>
  </div>
);

export default EvidenceGraphPage;
