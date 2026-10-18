import { db } from '../db/store.js';
import { CAREER_ROLES } from '../data/careers.js';
import { calculateCareerReadiness } from '../engine/readinessEngine.js';
import { buildEvidenceIndex, normalizeSkillKey } from './evidenceIndex.js';
import type {
  CareerMissionControlSummary,
  MissionControlAction,
  MissionControlDecision,
  MissionActionState,
  StudentProfile
} from '../../src/types/index.js';

export function getMissionControlSummary(userId: string): CareerMissionControlSummary | null {
  const profile = db.getProfile(userId);
  if (!profile) return null;

  const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];
  const assessments = db.getAssessments(userId);
  const projects = db.getProjects(userId);
  const readiness = calculateCareerReadiness(profile, role, assessments, projects, 0);

  // Check stored actions or initialize fresh derived actions
  let actions = db.getMissionControlActions(userId);

  if (actions.length === 0) {
    actions = deriveInitialMissionActions(profile, role);
    db.saveMissionControlActions(userId, actions);
  } else {
    // Synchronize completion states from source entities
    actions = synchronizeActionStates(userId, actions, profile);
    db.saveMissionControlActions(userId, actions);
  }

  const topActionable = actions
    .filter(a => a.state === 'approved' || a.state === 'in_progress' || a.state === 'suggested')
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 3);

  const blockedTasks = actions.filter(a => a.state === 'blocked');
  const completedTasks = actions.filter(a => a.state === 'completed');

  const recommendedNextAction = topActionable[0] || null;
  const recommendationReason = recommendedNextAction
    ? `Highest priority gap for ${role.title}: ${recommendedNextAction.description}`
    : 'All immediate priority milestones complete. Maintain progress with interview defense practice.';

  // Recent evidence
  const proofEvidence = db.getProofOfSkillEvidence(userId);
  const recentEvidence = proofEvidence.slice(0, 5).map(p => ({
    id: p.id,
    label: `Verified ${p.skillName} (${p.scorePercentage}%)`,
    type: 'Proof of Skill Challenge',
    timestamp: p.completedAt
  }));

  const decisionAuditTrail = db.getMissionControlDecisions(userId).slice(0, 10);

  // Active milestone
  const activeRoadmap = db.getRoadmapTasks(userId);
  const currentTask = activeRoadmap.find(t => (t as any).status === 'in_progress') || activeRoadmap.find(t => (t as any).status === 'pending') || activeRoadmap[0];

  const activeMilestone = currentTask
    ? {
        title: currentTask.skillName || 'Active Roadmap Milestone',
        progressPercentage: 50
      }
    : null;

  return {
    userId,
    careerObjective: {
      roleId: role.id,
      roleTitle: role.title,
      targetReadiness: 85,
      currentReadiness: readiness.overallScore,
      targetCompanies: profile.targetCompanies || ['Top Tech Enterprises']
    },
    activeMilestone,
    topActionablePriorities: topActionable,
    blockedTasks,
    completedTasks,
    recentEvidence,
    recommendedNextAction,
    recommendationReason,
    decisionAuditTrail,
    generatedAt: new Date().toISOString()
  };
}

export function updateActionState(
  userId: string,
  actionId: string,
  newState: MissionActionState
): MissionControlAction | undefined {
  const updated = db.updateMissionControlActionState(userId, actionId, newState);
  if (updated) {
    db.logMissionControlDecision({
      id: `dec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      decisionType: 'action_approval',
      title: `Action state set to ${newState}: ${updated.title}`,
      rationale: `User transitioned task state to ${newState}.`,
      timestamp: new Date().toISOString(),
      approvedByUser: true,
      metadata: { actionId, newState }
    });
  }
  return updated;
}

export function recordCareerDecision(
  userId: string,
  decisionInput: {
    decisionType: MissionControlDecision['decisionType'];
    title: string;
    rationale: string;
    metadata?: Record<string, unknown>;
  }
): MissionControlDecision {
  const decision: MissionControlDecision = {
    id: `dec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId,
    decisionType: decisionInput.decisionType,
    title: decisionInput.title,
    rationale: decisionInput.rationale,
    timestamp: new Date().toISOString(),
    approvedByUser: true,
    metadata: decisionInput.metadata
  };

  db.logMissionControlDecision(decision);
  return decision;
}

function deriveInitialMissionActions(
  profile: StudentProfile,
  role: typeof CAREER_ROLES[0]
): MissionControlAction[] {
  const actions: MissionControlAction[] = [];
  const userSkillMap = new Map(profile.currentSkills.map(s => [normalizeSkillKey(s.skillId), s]));
  const userProofMap = new Map(db.getProofOfSkillEvidence(profile.userId).map(p => [normalizeSkillKey(p.skillId), p]));

  // 1. Proof of Skill Action for largest verified skill gap
  const unverifiedGaps = role.requiredSkills.filter(req => {
    const proof = userProofMap.get(normalizeSkillKey(req.skillId));
    const skill = userSkillMap.get(normalizeSkillKey(req.skillId));
    return !proof && (!skill || skill.proficiency < req.requiredLevel || skill.status === 'unverified');
  });

  if (unverifiedGaps.length > 0) {
    const topGap = unverifiedGaps[0];
    actions.push({
      id: `act_mc_pos_${topGap.skillId}`,
      title: `Verify ${topGap.name} Proficiency`,
      description: `Complete the ${topGap.name} practical challenge to earn verifiable proof of skill.`,
      kind: 'proof_of_skill',
      priority: 'Critical',
      priorityScore: 95,
      state: 'suggested',
      targetSkillId: topGap.skillId,
      targetSkillName: topGap.name,
      route: '/proof-of-skill',
      actionLabel: 'Launch Practical Challenge',
      estimatedMinutes: 30,
      reasons: [
        `High weight (${Math.round(topGap.importance * 100)}%) requirement for ${role.title}`,
        'Currently unverified or self-reported in your profile'
      ],
      completionCondition: `Pass ${topGap.name} assessment with >= 75% score`,
      updatedAt: new Date().toISOString()
    });
  }

  // 2. Project Forge Action
  actions.push({
    id: `act_mc_forge_${role.id}`,
    title: `Forge Gap-Closing Architecture Project`,
    description: `Generate and start an industry-grade project designed specifically for ${role.title}.`,
    kind: 'project_milestone',
    priority: 'High',
    priorityScore: 85,
    state: 'suggested',
    route: '/project-forge',
    actionLabel: 'Open Project Forge',
    estimatedMinutes: 120,
    reasons: [
      'Portfolio projects provide substantive evidence for hiring rubrics',
      'Closes multi-skill dependencies simultaneously'
    ],
    completionCondition: 'Complete and verify Milestone 1 in Project Forge',
    updatedAt: new Date().toISOString()
  });

  // 3. Interview Arena Action
  actions.push({
    id: `act_mc_arena_${role.id}`,
    title: `Technical Interview Simulation`,
    description: `Complete a targeted technical mock interview session for ${role.title}.`,
    kind: 'interview_practice',
    priority: 'Medium',
    priorityScore: 75,
    state: 'suggested',
    route: '/interview-arena',
    actionLabel: 'Enter Interview Arena',
    estimatedMinutes: 20,
    reasons: [
      'Validates ability to defend architectural trade-offs verbally',
      'Identifies theoretical blindspots before recruiter screening'
    ],
    completionCondition: 'Complete mock interview session and review scorecard',
    updatedAt: new Date().toISOString()
  });

  // 4. Learning Roadmap Action
  actions.push({
    id: `act_mc_roadmap_${role.id}`,
    title: `Weekly Learning Plan Progress`,
    description: 'Advance foundational curriculum milestones on your personalized roadmap.',
    kind: 'roadmap_learning',
    priority: 'Medium',
    priorityScore: 65,
    state: 'suggested',
    route: '/roadmap',
    actionLabel: 'View Learning Roadmap',
    estimatedMinutes: 60,
    reasons: [
      'Steady progression ensures comprehensive coverage of prerequisites'
    ],
    completionCondition: 'Mark assigned weekly task as completed in roadmap',
    updatedAt: new Date().toISOString()
  });

  return actions;
}

function synchronizeActionStates(
  userId: string,
  actions: MissionControlAction[],
  profile: StudentProfile
): MissionControlAction[] {
  const proofMap = new Map(db.getProofOfSkillEvidence(userId).map(p => [normalizeSkillKey(p.skillId), p]));
  const forged = db.getForgedProjects(userId);

  return actions.map(action => {
    // If proof of skill action and user has passed proof, mark completed
    if (action.kind === 'proof_of_skill' && action.targetSkillId) {
      const proof = proofMap.get(normalizeSkillKey(action.targetSkillId));
      if (proof) {
        return { ...action, state: 'completed', updatedAt: new Date().toISOString() };
      }
    }

    // If project milestone action and forged project has milestone completed, mark completed
    if (action.kind === 'project_milestone') {
      const hasCompletedMs = forged.some(f => f.milestones.some(m => m.completed));
      if (hasCompletedMs && action.state !== 'completed') {
        return { ...action, state: 'completed', updatedAt: new Date().toISOString() };
      }
    }

    return action;
  });
}
