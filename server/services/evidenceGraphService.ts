import { db } from '../db/store.js';
import { CAREER_ROLES } from '../data/careers.js';
import { summarizeEvidence } from './readinessService.js';
import { normalizeSkillKey } from './evidenceIndex.js';
import {
  buildEvidenceLedger,
  confidenceForClassification,
  evidenceForSkill,
  strongestClassification,
  summarizeLedger
} from './evidenceLedger.js';
import { calculateCareerReadiness } from '../engine/readinessEngine.js';
import { calculateSkillGaps } from '../engine/gapEngine.js';
import type {
  CareerEvidenceGraph,
  CareerRole,
  EvidenceGraphNode,
  EvidenceGraphEdge,
  EvidenceRecord,
  EvidenceTraceStep,
  SkillGapAnalysisResult
} from '../../src/types/index.js';

/**
 * Subphase 3D — Career Evidence Graph.
 *
 * A derived graph connecting the target role to the skills it requires and to
 * the assessments/projects/proof records that substantiate those skills. Built
 * from the canonical evidence ledger so provenance labels never drift from the
 * underlying evaluations: every artefact node carries the verification method,
 * classification, confidence, and timestamp of the record it came from. The
 * graph is capped so a large profile cannot produce an unbounded response.
 */

const DISCLAIMER =
  'SkillForge compares claims with your own stored evidence only; skills without an assessment ' +
  'or completed project are self-reported and not independently verified.';

const MAX_SKILL_NODES = 60;
const MAX_ARTEFACT_NODES = 60;

const SOURCE_VERIFICATION_LABEL: Partial<Record<EvidenceRecord['source'], string>> = {
  project_evidence: 'Self-submitted repository/demo link',
  roadmap_task: 'Roadmap learning task marked complete by the student'
};

function provenanceFromLedger(record: EvidenceRecord, node: EvidenceGraphNode): EvidenceGraphNode {
  return {
    ...node,
    verificationMethod: record.verificationMethod,
    classification: record.classification,
    confidence: confidenceForClassification(record.classification),
    timestamp: record.observedAt,
    provenance: record.provenance
  };
}

/**
 * Builds the explainable recommendation chain for the highest-priority gap:
 * job requirement -> required skill -> existing evidence (or gap) -> the
 * autopilot's recommended action -> the latest evidence it produced -> the
 * current readiness score. Every step references real stored ids.
 */
function buildEvidenceTrace(
  userId: string,
  role: CareerRole,
  gaps: SkillGapAnalysisResult,
  ledger: EvidenceRecord[],
  nameToSkillNode: Map<string, string>
): EvidenceTraceStep[] {
  const gap = gaps.items.find(i => i.gap > 0);
  if (!gap) return [];

  const profile = db.getProfile(userId)!;
  const skillNode = nameToSkillNode.get(normalizeSkillKey(gap.skillId)) ?? `skill:${gap.skillId}`;
  const steps: EvidenceTraceStep[] = [
    {
      stage: 'job_requirement',
      label: `${role.title} requires ${gap.name}`,
      detail: `${gap.name} is required at level ${gap.requiredLevel}/5 with role importance ${Math.round(gap.importance * 100)}%.`,
      refIds: [`role:${role.id}`, skillNode]
    },
    {
      stage: 'required_skill',
      label: `${gap.name}: level ${gap.currentLevel}/5 vs required ${gap.requiredLevel}/5`,
      detail: `A gap of ${gap.gap} level(s), currently rated ${gap.priorityBadge} priority.`,
      refIds: [skillNode]
    }
  ];

  const skillEvidence = evidenceForSkill(ledger, gap.skillId, gap.name).filter(r => r.passed !== false);
  const strongest = strongestClassification(skillEvidence);

  if (skillEvidence.length > 0) {
    steps.push({
      stage: 'existing_evidence',
      label: `${skillEvidence.length} stored evidence record(s) for ${gap.name}`,
      detail: `Strongest classification: ${strongest ?? 'unknown'}. Most recent: ${skillEvidence[0].sourceLabel} — ${skillEvidence[0].evaluationResult}.`,
      refIds: skillEvidence.slice(0, 5).map(r => r.id)
    });
  } else {
    steps.push({
      stage: 'evidence_gap',
      label: `No stored evidence for ${gap.name}`,
      detail: 'Any current level for this skill is self-reported or absent; nothing has been assessed, proven, or shipped for it yet.',
      refIds: [skillNode]
    });
  }

  const plan = db.getAutopilotPlan(userId);
  const recommended = plan?.actions.find(a => a.id === plan.recommendedActionId);
  if (recommended) {
    steps.push({
      stage: 'recommended_action',
      label: recommended.title,
      detail: `${recommended.reason} Completion evidence required: ${recommended.completionEvidence.join('; ')}.`,
      refIds: [recommended.id]
    });
  }

  if (skillEvidence.length > 0) {
    steps.push({
      stage: 'new_evidence',
      label: `Latest evidence: ${skillEvidence[0].evaluationResult}`,
      detail: skillEvidence[0].provenance,
      refIds: [skillEvidence[0].id]
    });
  }

  const readiness = calculateCareerReadiness(
    profile,
    role,
    db.getAssessments(userId),
    db.getProjects(userId)
  );
  steps.push({
    stage: 'updated_readiness',
    label: `Current readiness: ${readiness.overallScore}%`,
    detail:
      `Skill coverage ${readiness.breakdown.skillCoverageScore}/50, assessment bonus ` +
      `${readiness.breakdown.assessmentBonus}/25, project evidence bonus ` +
      `${readiness.breakdown.projectEvidenceBonus}/25.`,
    refIds: [skillNode, `role:${role.id}`]
  });

  return steps;
}

export function buildEvidenceGraph(userId: string): CareerEvidenceGraph | null {
  const profile = db.getProfile(userId);
  if (!profile) return null;

  const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];
  const ledger = buildEvidenceLedger(userId);
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
      requiredByRole: !!req,
      provenance: skill.status === 'self-reported'
        ? 'Self-reported in your profile; no stored assessment, proof, or project evidence for this skill.'
        : undefined
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

  // skill -> assessment ("verified-by"), with real provenance from the ledger.
  const ledgerById = new Map(ledger.map(r => [r.id, r]));
  for (const result of db.getAssessments(userId)) {
    const nodeId = `assessment:${result.id}`;
    const base: EvidenceGraphNode = {
      id: nodeId,
      kind: 'assessment',
      label: `${result.skillName} assessment`,
      detail: `${result.passed ? 'Passed' : 'Not passed'} - ${result.scorePercentage}%`,
      sourceId: result.id
    };
    const fromLedger = ledgerById.get(`assessment:${result.id}`);
    addNode(
      fromLedger
        ? provenanceFromLedger(fromLedger, base)
        : {
            ...base,
            verificationMethod: 'Graded assessment',
            classification: 'rule-checked',
            confidence: 'medium',
            timestamp: result.completedAt
          }
    );
    addEdge(nameToSkillNode.get(normalizeSkillKey(result.skillId)) ?? `skill:${result.skillId}`, nodeId, 'verified-by');
  }

  // skill -> proof ("verified-by"): Proof of Skill and gap-challenge records are
  // the strongest stored signal and must be visible in the graph.
  for (const record of ledger) {
    if (record.source !== 'proof_of_skill' && record.source !== 'gap_challenge') continue;
    const nodeId = `proof:${record.id}`;
    if (!addNode(
      provenanceFromLedger(record, {
        id: nodeId,
        kind: 'assessment',
        label: `${record.skillName} — ${record.sourceLabel}`,
        detail: `${record.evaluationResult} (${record.classification})`,
        sourceId: record.sourceRecordId
      })
    )) {
      continue;
    }
    const skillNode = nameToSkillNode.get(normalizeSkillKey(record.skillId))
      ?? nameToSkillNode.get(normalizeSkillKey(record.skillName));
    if (skillNode) addEdge(skillNode, nodeId, 'verified-by');
  }

  // skill -> project ("demonstrated-by")
  for (const project of db.getProjects(userId)) {
    if (project.userStatus === 'recommended') continue;
    const nodeId = `project:${project.id}`;
    const evidence = project.submittedEvidence;
    const detail =
      project.userStatus === 'completed'
        ? 'Completed project'
        : project.userStatus === 'in_progress'
          ? 'Project in progress'
          : 'Planned project';
    addNode(
      evidence
        ? {
            id: nodeId,
            kind: 'project',
            label: project.title,
            detail: `${detail} — evidence submitted`,
            sourceId: project.id,
            verificationMethod: SOURCE_VERIFICATION_LABEL.project_evidence,
            classification: 'self-reported',
            confidence: 'low',
            timestamp: evidence.submittedAt,
            provenance: `Self-submitted evidence${evidence.repoUrl ? ` (${evidence.repoUrl})` : ''}; links are not independently reviewed.`
          }
        : { id: nodeId, kind: 'project', label: project.title, detail: `${detail} — no evidence submitted yet`, sourceId: project.id }
    );
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
    const fromLedger = ledgerById.get(`roadmap_task:${task.id}`);
    if (!addNode({
      id: nodeId,
      kind: 'milestone',
      label: task.skillName ? `Learn ${task.skillName}` : task.stageName || 'Roadmap milestone',
      detail: task.stageName ? `Stage ${task.stageNumber}: ${task.stageName}` : 'Roadmap milestone',
      completed: task.status === 'completed',
      estimatedHours: task.estimatedHours,
      sourceId: task.id,
      verificationMethod: SOURCE_VERIFICATION_LABEL.roadmap_task,
      classification: 'self-reported',
      confidence: 'low',
      timestamp: task.completedAt,
      provenance: fromLedger
        ? fromLedger.provenance
        : 'Study progress only; completing a task never verifies a skill.'
    })) {
      continue;
    }
    const skillNode = nameToSkillNode.get(normalizeSkillKey(task.skillId));
    if (skillNode) addEdge(nodeId, skillNode, 'improves');
  }

  // Reuse the canonical gap engine so the trace matches every other page.
  const gapAnalysis = calculateSkillGaps(profile, role);

  return {
    role: { id: role.id, title: role.title },
    nodes,
    edges,
    summary: summarizeEvidence(profile.currentSkills),
    classificationBreakdown: summarizeLedger(ledger),
    trace: buildEvidenceTrace(userId, role, gapAnalysis, ledger, nameToSkillNode),
    generatedAt: new Date().toISOString(),
    disclaimer: DISCLAIMER
  };
}
