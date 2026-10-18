import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server } from 'node:http';
import { createApp } from '../app.js';

/**
 * Subphase 3C/3D — Resume Truth Engine and Career Evidence Graph.
 *
 * These tests assert the honesty contract: unbacked claims are never reported as
 * verified, evidence-backed claims are recognised, validation is strict, and the
 * graph only references nodes that actually exist.
 */

const DEMO_TOKEN = 'demo_token_aarav';

let server: Server;
let baseUrl: string;

interface ApiResponse {
  status: number;
  body: any;
}

async function api(
  path: string,
  options: { method?: string; token?: string | null; body?: unknown } = {}
): Promise<ApiResponse> {
  const { method = 'GET', token = DEMO_TOKEN, body } = options;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

beforeAll(async () => {
  const app = createApp();
  server = app.listen(0);
  await new Promise<void>(resolve => server.once('listening', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Failed to bind test server.');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
});

describe('Resume Truth Engine', () => {
  it('requires authentication', async () => {
    const res = await api('/api/resume/truth-check', { method: 'POST', token: null, body: { skills: [] } });
    expect(res.status).toBe(401);
  });

  it('rejects a draft without a skills array', async () => {
    const noSkills = await api('/api/resume/truth-check', { method: 'POST', body: {} });
    expect(noSkills.status).toBe(400);

    const badSkills = await api('/api/resume/truth-check', { method: 'POST', body: { skills: 'nope' } });
    expect(badSkills.status).toBe(400);
  });

  it('accepts an empty resume and reports zero claims honestly', async () => {
    const res = await api('/api/resume/truth-check', { method: 'POST', body: { skills: [] } });
    expect(res.status).toBe(200);

    const report = res.body.report;
    expect(report.summary.totalClaims).toBe(0);
    expect(report.summary.evidenceBackedRatio).toBe(0);
    expect(report.skills).toHaveLength(0);
    expect(typeof report.disclaimer).toBe('string');
    expect(report.disclaimer.length).toBeGreaterThan(0);
  });

  it('never marks an unbacked claim as verified', async () => {
    const res = await api('/api/resume/truth-check', {
      method: 'POST',
      body: { skills: [{ skillId: 'totally-fake-skill', name: 'Quantum Basket Weaving', category: 'Other', proficiency: 3 }] }
    });
    expect(res.status).toBe(200);

    const claim = res.body.report.skills[0];
    expect(claim.verdict).toBe('unsupported');
    expect(claim.evidencedLevel).toBe(0);
    expect(claim.levelOverstated).toBe(true);
    expect(claim.evidence).toHaveLength(0);
  });

  it('recognises evidence-backed claims from the Career Twin model', async () => {
    const twin = (await api('/api/career-twin')).body.twin;
    const backed = twin.skills.find(
      (s: any) => s.evidenceKind === 'assessment' || s.evidenceKind === 'project'
    );
    expect(backed).toBeTruthy();

    const expectedVerdict = backed.evidenceKind === 'assessment' ? 'verified' : 'project-backed';

    const res = await api('/api/resume/truth-check', {
      method: 'POST',
      body: {
        skills: [{ skillId: backed.skillId, name: backed.name, category: backed.category, proficiency: backed.currentLevel }],
        projects: [{ title: 'Demo Project', description: '', technologies: [], repoUrl: 'https://example.com/repo' }]
      }
    });
    expect(res.status).toBe(200);

    const report = res.body.report;
    const claim = report.skills[0];
    expect(claim.verdict).toBe(expectedVerdict);
    expect(claim.evidence.length).toBeGreaterThan(0);

    // A project with a link is flagged as checkable.
    expect(report.projects[0].hasLink).toBe(true);
  });
});

describe('Career Evidence Graph', () => {
  it('requires authentication', async () => {
    const res = await api('/api/evidence-graph', { token: null });
    expect(res.status).toBe(401);
  });

  it('builds a graph whose edges only reference existing nodes', async () => {
    const res = await api('/api/evidence-graph');
    expect(res.status).toBe(200);

    const graph = res.body.graph;
    expect(graph.role).toBeTruthy();
    expect(Array.isArray(graph.nodes)).toBe(true);
    expect(Array.isArray(graph.edges)).toBe(true);
    expect(graph.nodes.length).toBeGreaterThan(0);

    const nodeIds = new Set(graph.nodes.map((n: any) => n.id));
    expect(nodeIds.has(`role:${graph.role.id}`)).toBe(true);

    const allowedKinds = ['skill', 'assessment', 'project', 'role', 'milestone'];
    const allowedEdges = ['verified-by', 'demonstrated-by', 'requires', 'improves'];
    for (const node of graph.nodes) {
      expect(allowedKinds).toContain(node.kind);
    }
    for (const edge of graph.edges) {
      expect(allowedEdges).toContain(edge.kind);
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
    }

    // The provenance summary must match the canonical readiness breakdown shape.
    expect(graph.summary).toBeDefined();
    for (const key of ['unverified', 'selfReported', 'assessed', 'projectVerified']) {
      expect(typeof graph.summary[key]).toBe('number');
    }
  });

  it('connects roadmap milestones to the skills they build, without verifying them', async () => {
    const res = await api('/api/evidence-graph');
    expect(res.status).toBe(200);
    const graph = res.body.graph;

    const nodeById = new Map(graph.nodes.map((n: any) => [n.id, n]));
    const improveEdges = graph.edges.filter((e: any) => e.kind === 'improves');

    for (const edge of improveEdges) {
      const from = nodeById.get(edge.from);
      const to = nodeById.get(edge.to);
      expect(from?.kind).toBe('milestone');
      expect(to?.kind).toBe('skill');
      expect(typeof from?.completed).toBe('boolean');
    }
  });
});
