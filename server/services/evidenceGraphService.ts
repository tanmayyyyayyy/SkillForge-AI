import { db } from '../db/store.js';
import { CAREER_ROLES } from '../data/careers.js';
import { summarizeEvidence } from './readinessService.js';
import { normalizeSkillKey } from './evidenceIndex.js';
import type { CareerEvidenceGraph, EvidenceGraphNode, EvidenceGraphEdge } from '../../src/types/index.js';

/**
 * Subphase 3D — Career Evidence Graph.
 *
 * A derived graph connecting the target role to the skills it requires and to
 * the assessments/projects that substantiate those skills. Built from the same
 * evidence model as the Career Twin so provenance labels never drift. The graph
 * is capped so a large profile cannot produce an unbounded response.
 */

const DISCLAIMER =
  'SkillForge compares claims with your own stored evidence only; skills without an assessment ' +
  'or completed project are self-reported and not independently verified.';

const MAX_SKILL_NODES = 60;
const MAX_ARTEFACT_NODES = 60;

export function buildEvidenceGraph(userId: string): CareerEvidenceGraph | null {
  const profile = db.getProfile(userId);
  if (!profile) return null;

  const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];
  const nodes: EvidenceGraphNode[] = [];
  const edges: EvidenceGraphEdge[] = [];
  const nodeIds = new Set<string>();
  const edgeKeys = new Set<string>();
  let skillNodeCount = 0;
  let artefactNodeCount = 0;

  const addNode = (node: EvidenceGraphNode): boolean => {
    if (nodeIds.has(node.id)) return true;
    if (node.kind === 'skill') {
      if (skillNodeCount >= MAX_SKILL_NODES) return false;
      skillNodeCount++;
    } else if (node.kind !== 'role') {
      if (artefactNodeCount >= MAX_ARTEFACT_NODES) return false;
      artefactNodeCount++;
    }
    nodeIds.add(node.id);
    nodes.push(node);
    return true;
  };

  const addEdge = (from: string, to: string, kind: EvidenceGraphEdge['kind']): void => {
    if (!nodeIds.has(from) || !nodeIds.has(to)) return;
    const key = `${from}|${to}|${kind}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ from, to, kind });
  };

  addNode({
    id: `role:${role.id}`,
    kind: 'role',
    label: role.title,
    detail: `${role.requiredSkills.length} required skills`
  });

  const roleReqBySkillId = new Map(role.requiredSkills.map(r => [r.skillId, r]));
  const nameToSkillNode = new Map<string, string>();

  // Skills the student tracks, with their verification status.
  for (const skill of profile.currentSkills) {
    const nodeId = `skill:${skill.skillId}`;
    nameToSkillNode.set(normalizeSkillKey(skill.skillId), nodeId);
    nameToSkillNode.set(normalizeSkillKey(skill.name), nodeId);
    const req = roleReqBySkillId.get(skill.skillId);
    addNode({
      id: nodeId,
      kind: 'skill',
      label: skill.name,
      status: skill.status,
      proficiency: skill.proficiency,
      requiredLevel: req ? req.requiredLevel : null,
      requiredByRole: !!req
    });
  }

  // Role requirements the student has not tracked at all.
  for (const req of role.requiredSkills) {
    const nodeId = `skill:${req.skillId}`;
    if (!nameToSkillNode.has(normalizeSkillKey(req.skillId))) {
      nameToSkillNode.set(normalizeSkillKey(req.skillId), nodeId);
      nameToSkillNode.set(normalizeSkillKey(req.name), nodeId);
    }
    addNode({
      id: nodeId,
      kind: 'skill',
      label: req.name,
      status: 'unverified',
      proficiency: 0,
      requiredLevel: req.requiredLevel,
      requiredByRole: true
    });
  }

  // role -> skill ("requires")
  for (const req of role.requiredSkills) {
    addEdge(`role:${role.id}`, nameToSkillNode.get(normalizeSkillKey(req.skillId)) ?? `skill:${req.skillId}`, 'requires');
  }

  // skill -> assessment ("verified-by")
  for (const result of db.getAssessments(userId)) {
    const nodeId = `assessment:${result.id}`;
    addNode({
      id: nodeId,
      kind: 'assessment',
      label: `${result.skillName} assessment`,
      detail: `${result.passed ? 'Passed' : 'Not passed'} - ${result.scorePercentage}%`
    });
    addEdge(nameToSkillNode.get(normalizeSkillKey(result.skillId)) ?? `skill:${result.skillId}`, nodeId, 'verified-by');
  }

  // skill -> project ("demonstrated-by")
  for (const project of db.getProjects(userId)) {
    if (project.userStatus === 'recommended') continue;
    const nodeId = `project:${project.id}`;
    const detail =
      project.userStatus === 'completed'
        ? 'Completed project'
        : project.userStatus === 'in_progress'
          ? 'Project in progress'
          : 'Planned project';
    addNode({ id: nodeId, kind: 'project', label: project.title, detail, sourceId: project.id });
    for (const skillName of project.skillsDemonstrated) {
      const skillNode = nameToSkillNode.get(normalizeSkillKey(skillName));
      if (skillNode) addEdge(skillNode, nodeId, 'demonstrated-by');
    }
  }

  // milestone -> skill ("improves"): roadmap learning tasks are the milestones
  // that build a skill. Completing them does not by itself verify a skill, so the
  // edge is directional only and never upgrades a skill's evidence status.
  for (const task of db.getRoadmapTasks(userId)) {
    const nodeId = `milestone:${task.id}`;
    if (!addNode({
      id: nodeId,
      kind: 'milestone',
      label: task.skillName ? `Learn ${task.skillName}` : task.stageName || 'Roadmap milestone',
      detail: task.stageName ? `Stage ${task.stageNumber}: ${task.stageName}` : 'Roadmap milestone',
      completed: task.status === 'completed',
      estimatedHours: task.estimatedHours,
      sourceId: task.id
    })) {
      continue;
    }
    const skillNode = nameToSkillNode.get(normalizeSkillKey(task.skillId));
    if (skillNode) addEdge(nodeId, skillNode, 'improves');
  }

  return {
    role: { id: role.id, title: role.title },
    nodes,
    edges,
    summary: summarizeEvidence(profile.currentSkills),
    generatedAt: new Date().toISOString(),
    disclaimer: DISCLAIMER
  };
}
