import { db } from '../db/store.js';
import { CAREER_ROLES } from '../data/careers.js';
import { calculateSkillGaps } from '../engine/gapEngine.js';
import { calculateCareerReadiness } from '../engine/readinessEngine.js';
import { buildExplanation, reference } from './explanationService.js';
import { normalizeSkillKey } from './evidenceIndex.js';
import {
  buildEvidenceLedger,
  evidenceForSkill,
  ledgerReferences,
  strongestClassification
} from './evidenceLedger.js';
import type {
  AutopilotAction,
  AutopilotActionStatus,
  AutopilotChange,
  AutopilotObjective,
  CareerAutopilotPlan,
  EvidenceClassification,
  EvidenceRecord,
  ExplainabilityReference,
  PriorityBadge,
  StudentProfile,
  CareerRole,
  SkillGapAnalysisResult,
  DecisionRecord
} from '../../src/types/index.js';

/**
 * SkillForge 2.0 — Career Autopilot.
 *
 * The Autopilot is an *orchestrator*, not a second career engine. It decomposes
 * a career goal into dependency-aware objectives, proposes actions that map onto
 * existing pages/engines (roadmap, assessments, proof of skill, project forge,
 * interview arena), and detects completion from the real stored records. It never
 * writes learning progress itself: the student still performs each action, and
 * the Autopilot observes the resulting evidence.
 *
 * Adaptive replanning refreshes states in place. Stable action ids mean completed
 * work is preserved rather than regenerated, and every transition is appended to
 * a change log explaining what changed and why.
 */

const AUTOPILOT_DISCLAIMER =
  'Career Autopilot coordinates the existing SkillForge engines using only the data ' +
  'stored in your profile. It recommends and tracks actions; it never fabricates ' +
  'progress, and projections are planning aids, not guarantees of employment.';

const PLAN_CHANGELOG_LIMIT = 40;

function nowIso(): string {
  return new Date().toISOString();
}

function badgeForScore(score: number): PriorityBadge {
  if (score >= 75) return 'Critical';
  if (score >= 50) return 'High';
  if (score >= 25) return 'Medium';
  return 'Low';
}

function clampPriority(score: number): number {
  return Math.round(Math.min(100, Math.max(10, score)));
}

interface EvidenceSnapshot {
  passedAssessmentSkillIds: Set<string>;
  proofSkillIds: Set<string>;
  completedForgedMilestones: number;
  completedProjectMilestones: number;
  hasCompletedInterview: boolean;
  completedRoadmapSkillIds: Set<string>;
  /** Canonical evidence ledger for citing real stored records. */
  ledger: EvidenceRecord[];
}

function collectEvidence(userId: string): EvidenceSnapshot {
  const passedAssessmentSkillIds = new Set(
    db.getAssessments(userId).filter(a => a.passed).map(a => normalizeSkillKey(a.skillId))
  );
  const proofSkillIds = new Set(
    db.getProofOfSkillEvidence(userId).map(p => normalizeSkillKey(p.skillId))
  );
  const forged = db.getForgedProjects(userId);
  const completedForgedMilestones = forged.reduce(
    (sum, p) => sum + p.milestones.filter(m => m.completed).length,
    0
  );
  const completedProjectMilestones = db
    .getProjects(userId)
    .reduce((sum, p) => sum + p.milestones.filter(m => m.completed).length, 0);
  const hasCompletedInterview = db.getInterviewSessions(userId).some(s => s.status === 'completed');
  const completedRoadmapSkillIds = new Set(
    db
      .getRoadmapTasks(userId)
      .filter(t => t.status === 'completed')
      .map(t => normalizeSkillKey(t.skillId))
  );

  return {
    passedAssessmentSkillIds,
    proofSkillIds,
    completedForgedMilestones,
    completedProjectMilestones,
    hasCompletedInterview,
    completedRoadmapSkillIds,
    ledger: buildEvidenceLedger(userId)
  };
}

/** Real stored evidence refs for a skill, cited in recommendation explanations. */
function skillEvidenceRefs(
  evidence: EvidenceSnapshot,
  skillId: string,
  skillName?: string
): ExplainabilityReference[] {
  return ledgerReferences(evidenceForSkill(evidence.ledger, skillId, skillName));
}

/** Strongest classification actually present in stored evidence for a skill. */
function skillEvidenceClassification(
  evidence: EvidenceSnapshot,
  skillId: string,
  skillName?: string
): EvidenceClassification {
  return (
    strongestClassification(evidenceForSkill(evidence.ledger, skillId, skillName)) ?? 'rule-checked'
  );
}

/** Chooses the single highest-priority unmet skill gap, if any. */
function topGap(gaps: SkillGapAnalysisResult) {
  return gaps.items.find(i => i.gap > 0) ?? null;
}

/** The most foundational missing prerequisite across all gaps. */
function firstMissingPrerequisite(gaps: SkillGapAnalysisResult): { id: string; name: string } | null {
  for (const item of gaps.items) {
    if (item.missingPrerequisites.length > 0) {
      // Prefer a prerequisite that is itself a tracked role skill so we can link it.
      return { id: item.skillId, name: item.missingPrerequisites[0] };
    }
  }
  return null;
}

function actionId(kind: string, suffix: string): string {
  return `ap_${kind}_${suffix}`;
}

function buildObjectives(
  profile: StudentProfile,
  role: CareerRole,
  gaps: SkillGapAnalysisResult
): AutopilotObjective[] {
  const gap = topGap(gaps);
  const prereq = firstMissingPrerequisite(gaps);

  return [
    {
      id: 'obj_foundation',
      order: 1,
      title: 'Establish prerequisite foundations',
      measurableOutcome: 'Every prerequisite skill for the target role reaches proficiency 2/5 or higher.',
      prerequisiteIds: [],
      linkedSkillId: prereq?.id,
      status: 'proposed'
    },
    {
      id: 'obj_verify',
      order: 2,
      title: 'Verify core skills with a targeted assessment',
      measurableOutcome: 'At least one role-critical skill is passed in a graded assessment.',
      prerequisiteIds: ['obj_foundation'],
      linkedSkillId: gap?.skillId,
      status: 'proposed'
    },
    {
      id: 'obj_practice',
      order: 3,
      title: 'Prove the skill in a practical challenge',
      measurableOutcome: 'A Proof of Skill challenge is passed with test-verified evidence.',
      prerequisiteIds: ['obj_verify'],
      linkedSkillId: gap?.skillId,
      status: 'proposed'
    },
    {
      id: 'obj_build',
      order: 4,
      title: 'Ship a portfolio project milestone',
      measurableOutcome: 'At least one project milestone is completed with submitted evidence.',
      prerequisiteIds: ['obj_verify'],
      status: 'proposed'
    },
    {
      id: 'obj_interview',
      order: 5,
      title: 'Defend your skills in a technical interview',
      measurableOutcome: 'A technical interview session is completed and scored.',
      prerequisiteIds: ['obj_practice', 'obj_build'],
      status: 'proposed'
    },
    {
      id: 'obj_reassess',
      order: 6,
      title: 'Reassess career readiness',
      measurableOutcome: `Readiness for ${role.title} is recalculated and any change is explained.`,
      prerequisiteIds: ['obj_interview'],
      status: 'proposed'
    }
  ];
}

function action(
  base: Omit<
    AutopilotAction,
    'createdAt' | 'updatedAt' | 'status' | 'recordedEvidence' | 'approvedByUser'
  >,
  existing?: AutopilotAction
): AutopilotAction {
  const stamp = nowIso();
  return {
    ...base,
    status: existing?.status ?? (base.requiresApproval ? 'awaiting_approval' : 'proposed'),
    recordedEvidence: existing?.recordedEvidence ?? [],
    approvedByUser: existing?.approvedByUser ?? false,
    createdAt: existing?.createdAt ?? stamp,
    updatedAt: existing?.updatedAt ?? stamp
  };
}

/**
 * Builds the proposed action set from real profile data. Stable ids mean an
 * existing plan's action can be matched and preserved across replans.
 */
function buildActions(
  profile: StudentProfile,
  role: CareerRole,
  gaps: SkillGapAnalysisResult,
  existingById: Map<string, AutopilotAction>,
  evidence: EvidenceSnapshot
): AutopilotAction[] {
  const gap = topGap(gaps);
  const prereq = firstMissingPrerequisite(gaps);
  const skillName = gap?.name ?? role.requiredSkills[0]?.name ?? 'core skills';
  const skillId = gap?.skillId ?? role.requiredSkills[0]?.skillId ?? 'core';

  const actions: AutopilotAction[] = [];

  const foundationId = actionId('roadmap', prereq?.id ?? skillId);
  actions.push(
    action(
      {
        id: foundationId,
        objectiveId: 'obj_foundation',
        title: prereq
          ? `Strengthen prerequisite: ${prereq.name}`
          : `Review foundations for ${skillName}`,
        kind: 'roadmap_learning',
        consequential: false,
        priority: 'High',
        priorityScore: clampPriority(70 + (gap?.priorityScore ?? 0) * 0.2),
        reason: prereq
          ? `${prereq.name} is a prerequisite for a critical gap and is currently below proficiency 2.`
          : 'Solidifying foundations accelerates every later action.',
        prerequisites: [],
        expectedOutcome: `Raise ${prereq?.name ?? skillName} foundations to at least level 2/5.`,
        completionEvidence: ['A completed roadmap learning task for this skill'],
        route: '/roadmap',
        actionLabel: 'Open roadmap',
        requiresApproval: false,
        targetSkillId: prereq?.id ?? skillId,
        explanation: buildExplanation({
          what: `Focus a roadmap learning block on ${prereq?.name ?? skillName}.`,
          why: prereq
            ? `${skillName} depends on ${prereq.name}, which is currently below the foundational threshold.`
            : 'Foundations reduce rework when you attempt harder tasks later.',
          supportingData: prereq
            ? [`Missing prerequisite: ${prereq.name}`, `Blocked gap: ${skillName}`]
            : [`Target-role requirement: ${skillName}`],
          supportingReferences: [
            reference('Skill Gap Analysis', 'Gap Engine', '/analysis'),
            ...skillEvidenceRefs(evidence, prereq?.id ?? skillId, prereq?.name)
          ],
          assumptions: ['Progress assumes consistent weekly study hours from your profile.'],
          uncertainties: ['The roadmap engine estimates hours; actual pace varies.'],
          ifAccepted: 'Adds a focused roadmap block; no application state is changed automatically.',
          reversible: true,
          evidenceClassification: 'rule-checked'
        })
      },
      existingById.get(foundationId)
    )
  );

  const assessId = actionId('assess', skillId);
  actions.push(
    action(
      {
        id: assessId,
        objectiveId: 'obj_verify',
        title: `Verify ${skillName} with an assessment`,
        kind: 'assessment',
        consequential: false,
        priority: gap?.priorityBadge ?? 'High',
        priorityScore: clampPriority((gap?.priorityScore ?? 55) + 5),
        reason: `Assessment evidence is the fastest way to make your ${skillName} level independently verifiable.`,
        prerequisites: prereq ? [`Foundational level in ${prereq.name}`] : [],
        expectedOutcome: `Pass the ${skillName} assessment to convert a self-reported skill into verified evidence.`,
        completionEvidence: ['A passed assessment result for this skill'],
        route: '/assessments',
        actionLabel: 'Take assessment',
        requiresApproval: false,
        targetSkillId: skillId,
        explanation: buildExplanation({
          what: `Take the ${skillName} skill assessment.`,
          why: `It is a high-weight requirement for ${role.title} and a high-priority gap in your profile.`,
          supportingData: gap
            ? [
                `Current level ${gap.currentLevel}/5 vs required ${gap.requiredLevel}/5`,
                `Role importance ${Math.round(gap.importance * 100)}%`,
                `Gap priority: ${gap.priorityBadge}`
              ]
            : [],
          supportingReferences: [
            reference('Skill Gap Analysis', 'Gap Engine', '/analysis'),
            reference('Assessment Engine', 'Assessments', '/assessments'),
            ...skillEvidenceRefs(evidence, skillId, skillName)
          ],
          assumptions: ['Passing reflects conceptual knowledge of the assessed topics.'],
          uncertainties: ['A single assessment samples a subset of topics.'],
          ifAccepted: 'Only records a result after you actually take and pass the assessment.',
          reversible: true,
          evidenceClassification: 'rule-checked'
        })
      },
      existingById.get(assessId)
    )
  );

  const proofId = actionId('proof', skillId);
  actions.push(
    action(
      {
        id: proofId,
        objectiveId: 'obj_practice',
        title: `Prove ${skillName} in a practical challenge`,
        kind: 'proof_of_skill',
        consequential: false,
        priority: gap?.priorityBadge ?? 'High',
        priorityScore: clampPriority(gap?.priorityScore ?? 60),
        reason: 'Practical challenges produce the strongest stored evidence in the evidence graph — test-verified for curated challenges, explicitly labelled rule-checked or AI-reviewed rubrics otherwise.',
        prerequisites: prereq ? [`Foundational level in ${prereq.name}`] : [],
        expectedOutcome: `Pass a ${skillName} Proof of Skill challenge.`,
        completionEvidence: ['A passed Proof of Skill evidence record'],
        route: '/proof-of-skill',
        actionLabel: 'Open challenge',
        requiresApproval: false,
        targetSkillId: skillId,
        explanation: buildExplanation({
          what: `Complete the ${skillName} practical challenge.`,
          why: 'It converts a conceptual assessment pass into demonstrated, test-verified skill.',
          supportingData: [`Target role: ${role.title}`, `Skill gap: ${skillName}`],
          supportingReferences: [
            reference('Proof of Skill', 'Proof of Skill Engine', '/proof-of-skill'),
            ...skillEvidenceRefs(evidence, skillId, skillName)
          ],
          assumptions: ['The deterministic evaluator checks structural invariants, not full correctness.'],
          uncertainties: [
            'Curated challenges are test-verified; gap challenges are graded by a labelled rule-checked or AI-reviewed rubric.',
            'Static evaluation cannot prove runtime behaviour; results are labelled accordingly.'
          ],
          ifAccepted: 'Records evidence only if you pass the challenge, classified by the method that actually graded it.',
          reversible: true,
          evidenceClassification: skillEvidenceClassification(evidence, skillId, skillName)
        })
      },
      existingById.get(proofId)
    )
  );

  const projectId = actionId('project', role.id);
  actions.push(
    action(
      {
        id: projectId,
        objectiveId: 'obj_build',
        title: 'Complete a project milestone with evidence',
        kind: 'project_milestone',
        consequential: true,
        priority: 'High',
        priorityScore: 80,
        reason: 'Portfolio milestones with submitted evidence are the strongest practical signal for hiring rubrics.',
        prerequisites: [],
        expectedOutcome: 'A project milestone is completed and its evidence submitted.',
        completionEvidence: ['A completed milestone with a repository or artifact link'],
        route: '/project-forge',
        actionLabel: 'Open Project Forge',
        requiresApproval: true,
        explanation: buildExplanation({
          what: 'Complete a project milestone and submit supporting evidence.',
          why: 'Project evidence counts toward your practical project readiness component.',
          supportingData: ['Project evidence can contribute up to 25 points of readiness.'],
          supportingReferences: [
            reference('Project Forge', 'Project Forge Engine', '/project-forge'),
            ...ledgerReferences(
              evidence.ledger.filter(
                r => r.source === 'project_evidence' || r.source === 'forged_project'
              )
            )
          ],
          assumptions: ['Submitted links are self-reported and not independently reviewed.'],
          uncertainties: ['Milestone effort estimates vary with your experience.'],
          ifAccepted: 'Marks the milestone complete and updates your portfolio evidence after you submit it.',
          reversible: true,
          evidenceClassification: 'self-reported'
        })
      },
      existingById.get(projectId)
    )
  );

  const interviewId = actionId('interview', role.id);
  actions.push(
    action(
      {
        id: interviewId,
        objectiveId: 'obj_interview',
        title: 'Complete a technical interview simulation',
        kind: 'interview',
        consequential: false,
        priority: 'Medium',
        priorityScore: 65,
        reason: 'Interview performance reveals communication gaps that assessments cannot capture.',
        prerequisites: ['At least one practical challenge or project milestone'],
        expectedOutcome: 'A scored technical interview session is recorded.',
        completionEvidence: ['A completed interview session scorecard'],
        route: '/interview-arena',
        actionLabel: 'Enter Interview Arena',
        requiresApproval: false,
        explanation: buildExplanation({
          what: 'Run a technical interview simulation.',
          why: 'It validates your ability to defend skills verbally before a real screen.',
          supportingData: [`Target role: ${role.title}`],
          supportingReferences: [
            reference('Interview Arena', 'Interview Arena Engine', '/interview-arena'),
            ...ledgerReferences(evidence.ledger.filter(r => r.source === 'interview'))
          ],
          assumptions: ['Answers are evaluated by an AI rubric and, when offline, a deterministic rubric.'],
          uncertainties: ['Rubric scores are indicative, not a real hiring decision.'],
          ifAccepted: 'Records a session scorecard; it does not change your skills automatically.',
          reversible: true,
          evidenceClassification: 'ai-reviewed'
        })
      },
      existingById.get(interviewId)
    )
  );

  const recalcId = actionId('recalc', role.id);
  actions.push(
    action(
      {
        id: recalcId,
        objectiveId: 'obj_reassess',
        title: 'Reassess your career readiness',
        kind: 'recalculate_readiness',
        consequential: false,
        priority: 'Medium',
        priorityScore: 55,
        reason: 'Recomputing readiness after new evidence keeps your plan aligned with reality.',
        prerequisites: ['New assessment, proof, or project evidence'],
        expectedOutcome: 'An updated readiness score with an explanation of what changed.',
        completionEvidence: ['A readiness recalculation over the new evidence'],
        route: '/autopilot',
        actionLabel: 'Reassess readiness',
        requiresApproval: false,
        explanation: buildExplanation({
          what: 'Recalculate your career readiness score.',
          why: 'Recent evidence may have changed your alignment with the target role.',
          supportingData: [`Target role: ${role.title}`],
          supportingReferences: [
            reference('Readiness Engine', 'Readiness', '/report'),
            ...ledgerReferences(evidence.ledger, 2)
          ],
          assumptions: ['Uses the same deterministic readiness formula as every other page.'],
          uncertainties: ['Small deltas may reflect rounding, not real progress.'],
          ifAccepted: 'Displays the recomputed score; it changes no underlying records.',
          reversible: true,
          evidenceClassification: 'rule-checked'
        })
      },
      existingById.get(recalcId)
    )
  );

  return actions;
}

/**
 * Recomputes an action's status from real evidence. Completed states are sticky
 * and can never be silently downgraded by a later replan.
 */
function deriveActionStatus(
  action: AutopilotAction,
  evidence: EvidenceSnapshot
): { status: AutopilotActionStatus; recordedEvidence: string[] } {
  const key = action.targetSkillId ? normalizeSkillKey(action.targetSkillId) : null;

  if (action.status === 'completed') {
    return { status: 'completed', recordedEvidence: action.recordedEvidence };
  }

  if (action.kind === 'assessment' && key) {
    if (evidence.passedAssessmentSkillIds.has(key)) {
      const record = evidenceForSkill(evidence.ledger, action.targetSkillId!, action.title)
        .find(r => r.source === 'assessment' && r.passed);
      return {
        status: 'completed',
        recordedEvidence: record
          ? [`Passed a graded assessment: ${record.evaluationResult} (${record.classification})`]
          : ['Passed a graded assessment for this skill']
      };
    }
  }

  if (action.kind === 'proof_of_skill' && key) {
    if (evidence.proofSkillIds.has(key)) {
      const record = evidenceForSkill(evidence.ledger, action.targetSkillId!, action.title).find(
        r => r.source === 'proof_of_skill' || r.source === 'gap_challenge'
      );
      return {
        status: 'completed',
        recordedEvidence: record
          ? [`${record.sourceLabel}: ${record.evaluationResult} (${record.classification})`]
          : ['Passed a Proof of Skill challenge']
      };
    }
  }

  if (action.kind === 'roadmap_learning' && key) {
    if (evidence.completedRoadmapSkillIds.has(key)) {
      return { status: 'completed', recordedEvidence: ['Completed a roadmap learning task'] };
    }
  }

  if (action.kind === 'project_milestone') {
    const projectRecords = evidence.ledger.filter(
      r => r.source === 'project_evidence' || r.source === 'forged_project'
    );
    if (evidence.completedForgedMilestones + evidence.completedProjectMilestones > 0) {
      return {
        status: 'completed',
        recordedEvidence: projectRecords.length
          ? [`Completed milestone evidence: ${projectRecords[0].evaluationResult} (self-reported)`]
          : ['Completed at least one project milestone with evidence']
      };
    }
  }

  if (action.kind === 'interview') {
    if (evidence.hasCompletedInterview) {
      const record = evidence.ledger.find(r => r.source === 'interview');
      return {
        status: 'completed',
        recordedEvidence: record
          ? [`Completed interview session: ${record.evaluationResult} (ai-reviewed)`]
          : ['Completed a technical interview session']
      };
    }
  }

  if (action.kind === 'recalculate_readiness') {
    const hasNewEvidence =
      evidence.passedAssessmentSkillIds.size > 0 ||
      evidence.proofSkillIds.size > 0 ||
      evidence.completedForgedMilestones + evidence.completedProjectMilestones > 0;
    const upstreamDone =
      evidence.proofSkillIds.size > 0 ||
      evidence.completedForgedMilestones + evidence.completedProjectMilestones > 0 ||
      evidence.hasCompletedInterview;
    if (hasNewEvidence && upstreamDone) {
      return { status: 'completed', recordedEvidence: ['Recalculated readiness over new evidence'] };
    }
  }

  // Sticky review states preserved unless evidence now proves completion.
  if (
    action.status === 'rejected' ||
    action.status === 'awaiting_approval' ||
    action.status === 'blocked' ||
    action.status === 'approved' ||
    action.status === 'in_progress'
  ) {
    return { status: action.status, recordedEvidence: action.recordedEvidence };
  }

  return {
    status: action.requiresApproval ? 'awaiting_approval' : 'proposed',
    recordedEvidence: action.recordedEvidence
  };
}

/** Marks actions blocked when their target skill still has missing prerequisites. */
function applyBlocking(
  actions: AutopilotAction[],
  gaps: SkillGapAnalysisResult
): AutopilotAction[] {
  const gapById = new Map(gaps.items.map(i => [normalizeSkillKey(i.skillId), i]));
  return actions.map(a => {
    if (a.status === 'completed' || a.status === 'rejected') return a;
    const gapItem = a.targetSkillId ? gapById.get(normalizeSkillKey(a.targetSkillId)) : undefined;
    if (gapItem && gapItem.missingPrerequisites.length > 0 && a.kind !== 'roadmap_learning') {
      return {
        ...a,
        status: 'blocked',
        recordedEvidence: [
          `Blocked by missing prerequisites: ${gapItem.missingPrerequisites.join(', ')}`
        ]
      };
    }
    return a;
  });
}

function objectiveStatuses(actions: AutopilotAction[], objectives: AutopilotObjective[]): AutopilotObjective[] {
  return objectives.map(obj => {
    const own = actions.filter(a => a.objectiveId === obj.id);
    if (own.length === 0) return obj;
    const status: AutopilotActionStatus = own.every(a => a.status === 'completed')
      ? 'completed'
      : own.some(a => a.status === 'blocked')
        ? 'blocked'
        : own.some(a => a.status === 'in_progress' || a.status === 'approved')
          ? 'in_progress'
          : 'proposed';
    return { ...obj, status };
  });
}

function pickRecommended(actions: AutopilotAction[], objectives: AutopilotObjective[]): AutopilotAction | null {
  const completedObjectives = new Set(
    objectives.filter(o => o.status === 'completed').map(o => o.id)
  );
  const candidates = actions
    .filter(a => a.status !== 'completed' && a.status !== 'rejected' && a.status !== 'blocked')
    .filter(a => {
      const obj = objectives.find(o => o.id === a.objectiveId);
      if (!obj) return true;
      // Recommend only when the objective's prerequisites are complete.
      return obj.prerequisiteIds.every(pid => completedObjectives.has(pid) || pid === a.objectiveId);
    });
  if (candidates.length === 0) {
    const fallback = actions
      .filter(a => a.status === 'blocked')
      .sort((a, b) => b.priorityScore - a.priorityScore)[0];
    return fallback ?? null;
  }
  return candidates.sort((a, b) => b.priorityScore - a.priorityScore)[0];
}

function diffChanges(
  previous: AutopilotAction[],
  next: AutopilotAction[],
  evidence: EvidenceSnapshot
): AutopilotChange[] {
  const prevById = new Map(previous.map(a => [a.id, a]));
  const changes: AutopilotChange[] = [];
  const at = nowIso();

  for (const a of next) {
    const before = prevById.get(a.id);
    if (before && before.status !== a.status) {
      const kind: AutopilotChange['kind'] =
        a.status === 'completed'
          ? 'completion'
          : a.status === 'blocked'
            ? 'replan'
            : 'replan';
      changes.push({
        at,
        kind,
        summary: `"${a.title}" moved from ${before.status} to ${a.status}.`,
        affectedActionIds: [a.id]
      });
    }
  }

  if (changes.length === 0 && evidence.passedAssessmentSkillIds.size > 0) {
    // Nothing structural changed even though evidence exists; record the observation.
    return [];
  }
  return changes;
}

function refreshPlan(
  userId: string,
  plan: CareerAutopilotPlan,
  profile: StudentProfile,
  role: CareerRole
): CareerAutopilotPlan {
  const gaps = calculateSkillGaps(profile, role);
  const evidence = collectEvidence(userId);

  const existingById = new Map(plan.actions.map(a => [a.id, a]));

  // Rebuild action definitions (keeps stable ids and preserves review states),
  // then re-derive completion from real evidence and re-apply blocking.
  const rebuilt = buildActions(profile, role, gaps, existingById, evidence);
  const rebuiltIds = new Set(rebuilt.map(a => a.id));
  // Preserve user-driven custom actions (e.g. opportunity preparation or a pending
  // target-role change) that are not regenerated from evidence.
  const customSurvivors = plan.actions
    .filter(a => !rebuiltIds.has(a.id) && a.status !== 'rejected')
    .map(a => {
      const { status, recordedEvidence } = deriveActionStatus(a, evidence);
      return {
        ...a,
        status,
        recordedEvidence: recordedEvidence.length > 0 ? recordedEvidence : a.recordedEvidence,
        updatedAt: nowIso()
      };
    });
  const derived = [
    ...rebuilt.map(a => {
      const { status, recordedEvidence } = deriveActionStatus(a, evidence);
      return { ...a, status, recordedEvidence, updatedAt: nowIso() };
    }),
    ...customSurvivors
  ];
  const actions = applyBlocking(derived, gaps);
  const objectives = objectiveStatuses(actions, buildObjectives(profile, role, gaps));

  const changes = diffChanges(plan.actions, actions, evidence);
  const recommended = pickRecommended(actions, objectives);

  let recommendationReason = 'All autopilot objectives are complete — keep evidence fresh with periodic re-assessment.';
  if (recommended) {
    recommendationReason = recommended.status === 'blocked'
      ? `Prerequisites must be cleared first: ${recommended.recordedEvidence[0] ?? 'see prerequisites'}.`
      : `${recommended.reason} (priority ${recommended.priority}).`;
  }

  const changeLog = [...changes, ...plan.changeLog].slice(0, PLAN_CHANGELOG_LIMIT);

  return {
    ...plan,
    targetRole: { id: role.id, title: role.title },
    objectives,
    actions,
    blockedActionIds: actions.filter(a => a.status === 'blocked').map(a => a.id),
    recommendedActionId: recommended?.id ?? null,
    recommendationReason,
    changeLog,
    lastReplannedAt: nowIso()
  };
}

function createPlan(userId: string, profile: StudentProfile, role: CareerRole, goal: string): CareerAutopilotPlan {
  const gaps = calculateSkillGaps(profile, role);
  const evidence = collectEvidence(userId);
  const actions = applyBlocking(
    buildActions(profile, role, gaps, new Map(), evidence).map(a => {
      const { status, recordedEvidence } = deriveActionStatus(a, evidence);
      return { ...a, status, recordedEvidence };
    }),
    gaps
  );
  const objectives = objectiveStatuses(actions, buildObjectives(profile, role, gaps));
  const recommended = pickRecommended(actions, objectives);

  return {
    userId,
    goal,
    targetRole: { id: role.id, title: role.title },
    objectives,
    actions,
    blockedActionIds: actions.filter(a => a.status === 'blocked').map(a => a.id),
    recommendedActionId: recommended?.id ?? null,
    recommendationReason: recommended ? recommended.reason : 'All objectives complete.',
    changeLog: [
      {
        at: nowIso(),
        kind: 'goal_set',
        summary: `Goal set: "${goal}". Decomposed into ${objectives.length} objectives and ${actions.length} actions.`,
        affectedActionIds: actions.map(a => a.id)
      }
    ],
    generatedAt: nowIso(),
    lastReplannedAt: nowIso(),
    disclaimer: AUTOPILOT_DISCLAIMER
  };
}

export function defaultGoal(profile: StudentProfile, role: CareerRole): string {
  return `Become a ${role.title} and secure a role aligned with ${profile.targetCompanies?.[0] ?? 'your target companies'}.`;
}

/** Loads the persisted plan, creating or refreshing it from current evidence. */
export function getAutopilotPlan(userId: string): CareerAutopilotPlan | null {
  const profile = db.getProfile(userId);
  if (!profile) return null;

  const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];
  const existing = db.getAutopilotPlan(userId);

  if (!existing) {
    const created = createPlan(userId, profile, role, defaultGoal(profile, role));
    db.saveAutopilotPlan(created);
    return created;
  }

  const refreshed = refreshPlan(userId, existing, profile, role);
  db.saveAutopilotPlan(refreshed);
  return refreshed;
}

/** Sets or changes the autopilot goal and replans. Consequential but reversible. */
export function setAutopilotGoal(userId: string, goal: string): CareerAutopilotPlan | null {
  const profile = db.getProfile(userId);
  if (!profile) return null;
  const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];

  const existing = db.getAutopilotPlan(userId) ?? createPlan(userId, profile, role, goal);
  const goalChanged = existing.goal !== goal;
  const refreshed = refreshPlan(userId, { ...existing, goal }, profile, role);

  if (goalChanged) {
    const goalChangeKind: AutopilotChange['kind'] = existing.goal ? 'goal_change' : 'goal_set';
    refreshed.changeLog = [
      {
        at: nowIso(),
        kind: goalChangeKind,
        summary: `Goal ${existing.goal ? 'changed' : 'set'} to "${goal}". Completed work was preserved.`,
        affectedActionIds: []
      },
      ...refreshed.changeLog
    ].slice(0, PLAN_CHANGELOG_LIMIT);
  }

  db.saveAutopilotPlan(refreshed);
  return refreshed;
}

export function replanAutopilot(userId: string): CareerAutopilotPlan | null {
  return getAutopilotPlan(userId);
}

/**
 * Approves or rejects a proposed action. Approval is required before a
 * consequential action may be carried out by the student.
 */
export function reviewAutopilotAction(
  userId: string,
  actionIdValue: string,
  decision: 'approve' | 'reject' | 'start' | 'complete'
): { plan: CareerAutopilotPlan; action: AutopilotAction } | null {
  const plan = getAutopilotPlan(userId);
  if (!plan) return null;
  const idx = plan.actions.findIndex(a => a.id === actionIdValue);
  if (idx === -1) return null;

  const current = plan.actions[idx];
  if (current.status === 'completed') {
    return { plan, action: current };
  }

  let nextStatus: AutopilotActionStatus = current.status;
  if (decision === 'approve') nextStatus = 'approved';
  else if (decision === 'reject') nextStatus = 'rejected';
  else if (decision === 'start') nextStatus = 'in_progress';
  else if (decision === 'complete') {
    // Manual completion is only allowed for approved/simple actions.
    nextStatus = current.requiresApproval && !current.approvedByUser ? 'awaiting_approval' : 'completed';
  }

  const updatedAction: AutopilotAction = {
    ...current,
    status: nextStatus,
    approvedByUser: decision === 'approve' ? true : current.approvedByUser,
    updatedAt: nowIso()
  };

  const actions = plan.actions.map(a => (a.id === actionIdValue ? updatedAction : a));
  const objectives = objectiveStatuses(actions, plan.objectives);
  const changeKind: AutopilotChange['kind'] =
    decision === 'approve' ? 'approval' : decision === 'reject' ? 'rejection' : decision === 'complete' ? 'completion' : 'replan';

  const updatedPlan: CareerAutopilotPlan = {
    ...plan,
    actions,
    objectives,
    changeLog: [
      {
        at: nowIso(),
        kind: changeKind,
        summary: `Action "${updatedAction.title}" set to ${nextStatus}${decision === 'approve' ? ' (approved by you)' : ''}.`,
        affectedActionIds: [actionIdValue]
      },
      ...plan.changeLog
    ].slice(0, PLAN_CHANGELOG_LIMIT)
  };

  db.saveAutopilotPlan(updatedPlan);

  // Record the decision in the shared audit trail.
  const record: DecisionRecord = {
    id: `dec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    actionId: actionIdValue,
    recommendation: updatedAction.title,
    supportingReferences: updatedAction.explanation.supportingReferences,
    status:
      decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : decision === 'complete' ? 'applied' : 'proposed',
    approvedByUser: decision === 'approve' || decision === 'complete',
    timestamp: nowIso(),
    result: `Status is now ${nextStatus}.`,
    reversible: updatedAction.explanation.reversible
  };
  db.logDecisionRecord(userId, record);

  return { plan: updatedPlan, action: updatedAction };
}

/**
 * Proposes switching the active career target. Creating the proposal is
 * reversible; applying it (separate explicit approval) changes the profile.
 */
export function proposeTargetRoleChange(
  userId: string,
  roleId: string
): { plan: CareerAutopilotPlan; action: AutopilotAction } | null {
  const profile = db.getProfile(userId);
  if (!profile) return null;
  const role = CAREER_ROLES.find(r => r.id === roleId);
  if (!role) return null;

  const plan = getAutopilotPlan(userId);
  if (!plan) return null;

  const id = `ap_change_target_${roleId}`;
  const existing = plan.actions.find(a => a.id === id);
  const proposal: AutopilotAction = {
    id,
    objectiveId: 'obj_reassess',
    title: `Switch active career target to ${role.title}`,
    kind: 'change_target_role',
    consequential: true,
    priority: 'High',
    priorityScore: 90,
    reason: `You requested to target ${role.title}. This changes which skills count toward readiness.`,
    prerequisites: [],
    expectedOutcome: `Your profile target role becomes ${role.title} and all engines recompute against it.`,
    status: 'awaiting_approval',
    completionEvidence: ['An explicit approval, then the profile target role is updated'],
    recordedEvidence: [],
    route: '/autopilot',
    actionLabel: 'Review target change',
    requiresApproval: true,
    approvedByUser: false,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    explanation: buildExplanation({
      what: `Change your active career target to ${role.title}.`,
      why: `Your current target is ${plan.targetRole.title}. Aiming at ${role.title} re-scores your entire plan.`,
      supportingData: [`Requested role: ${role.title}`, `Current role: ${plan.targetRole.title}`],
      supportingReferences: [reference('Career Selection', 'Careers', '/careers')],
      assumptions: ['You have considered how this affects your current evidence and plan.'],
      uncertainties: ['Switching targets may temporarily lower measured readiness against the new role.'],
      ifAccepted: `Your profile target role changes to ${role.title} and every engine recomputes.`,
      reversible: true,
      evidenceClassification: 'self-reported'
    })
  };

  const actions = [proposal, ...plan.actions.filter(a => a.id !== id)];
  const proposalEntry: AutopilotChange = {
    at: nowIso(),
    kind: 'replan',
    summary: `Proposed switching target to ${role.title}. Awaiting your approval.`,
    affectedActionIds: [id]
  };
  const updatedPlan: CareerAutopilotPlan = {
    ...plan,
    actions,
    changeLog: [proposalEntry, ...plan.changeLog].slice(0, PLAN_CHANGELOG_LIMIT)
  };
  db.saveAutopilotPlan(updatedPlan);
  return { plan: updatedPlan, action: proposal };
}

/** Applies an approved target-role change. Requires prior approval. */
export function applyTargetRoleChange(
  userId: string,
  actionIdValue: string
): { plan: CareerAutopilotPlan; roleId: string } | null {
  const plan = db.getAutopilotPlan(userId);
  const profile = db.getProfile(userId);
  if (!plan || !profile) return null;

  const proposal = plan.actions.find(a => a.id === actionIdValue);
  if (!proposal || proposal.kind !== 'change_target_role' || !proposal.approvedByUser) {
    return null;
  }

  const roleId = actionIdValue.replace('ap_change_target_', '');
  const role = CAREER_ROLES.find(r => r.id === roleId);
  if (!role) return null;

  const updatedProfile = { ...profile, targetRole: roleId, updatedAt: nowIso() };
  db.saveProfile(updatedProfile);
  db.saveAutopilotPlan({
    ...plan,
    actions: plan.actions.map(a =>
      a.id === actionIdValue ? { ...a, status: 'completed' as AutopilotActionStatus, updatedAt: nowIso() } : a
    )
  });
  db.logActivity({
    id: `act_${Date.now()}_target`,
    userId,
    activityType: 'roadmap_task',
    title: `Changed career target to ${role.title}`,
    details: 'Applied via Career Autopilot after explicit approval.',
    hoursSpent: 0,
    timestamp: nowIso()
  });

  // Rebuild the plan against the new role.
  const rebuilt = setAutopilotGoal(userId, defaultGoal(updatedProfile, role));
  return rebuilt ? { plan: rebuilt, roleId } : { plan, roleId };
}

export function getDecisionAudit(userId: string): DecisionRecord[] {
  return db.getDecisionRecords(userId).slice(0, 50);
}
