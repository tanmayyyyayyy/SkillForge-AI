import { db } from '../db/store.js';
import { evaluateOpportunityMatch } from './opportunityMatchService.js';
import { computeSkillRadar } from './skillRadarService.js';
import { getAutopilotPlan } from './autopilotService.js';
import { buildExplanation, reference } from './explanationService.js';
import {
  buildEvidenceLedger,
  evidenceForSkill,
  ledgerReferences,
  strongestClassification
} from './evidenceLedger.js';
import { normalizeSkillKey } from './evidenceIndex.js';
import type {
  AutopilotAction,
  AutopilotChange,
  CareerAutopilotPlan,
  OpportunityActionPlanResult,
  OpportunityMatchResult,
  PriorityBadge
} from '../../src/types/index.js';

/**
 * SkillForge 2.0 — Opportunity-to-Action workflow.
 *
 * Turns an evaluated opportunity match (saved analysis or pasted description)
 * into approval-gated Career Autopilot actions for the highest-priority
 * missing required skills, prioritised with the existing Skill Radar. Actions
 * are proposals only: they require explicit approval, the student still
 * performs the work, and completion is detected later from real evidence —
 * never from the proposal itself.
 */

const MAX_PROPOSED_ACTIONS = 3;
const PLAN_CHANGELOG_LIMIT = 40;

function nowIso(): string {
  return new Date().toISOString();
}

function badgeFor(score: number, tier?: string): PriorityBadge {
  if (tier === 'Critical' || score >= 75) return 'Critical';
  if (score >= 50) return 'High';
  if (score >= 25) return 'Medium';
  return 'Medium';
}

export interface OpportunityActionInput {
  analysisId?: string;
  description?: string;
}

export function proposeOpportunityActions(
  userId: string,
  input: OpportunityActionInput = {}
): OpportunityActionPlanResult | null {
  const profile = db.getProfile(userId);
  if (!profile) return null;

  let analysisId = input.analysisId;
  let description = input.description;
  let analysisTitle: string | undefined;
  let analysisCompany: string | undefined;

  if (!analysisId && !description) {
    const analyses = db.getJobAnalyses(userId);
    const latest = analyses[analyses.length - 1];
    if (!latest) return null;
    analysisId = latest.id;
  }

  if (analysisId) {
    const saved = db.getJobAnalysis(userId, analysisId);
    if (!saved) return null;
    analysisTitle = saved.title;
    analysisCompany = saved.company;
  }

  const match: OpportunityMatchResult | null = evaluateOpportunityMatch(
    userId,
    analysisId ? { analysisId } : { description }
  );
  if (!match) return null;

  const plan = getAutopilotPlan(userId);
  if (!plan) return null;

  const radar = computeSkillRadar(userId);
  const radarBySkill = new Map(
    (radar?.prioritizedSkills ?? []).map(item => [normalizeSkillKey(item.skillId), item])
  );
  const ledger = buildEvidenceLedger(userId);

  const missing = match.requiredSkillsMissing.slice(0, MAX_PROPOSED_ACTIONS);
  const proposed: AutopilotAction[] = [];
  const stamp = nowIso();

  for (const skill of missing) {
    const key = normalizeSkillKey(skill.skillId || skill.name);
    const id = `ap_opp_${key}`;
    const existing = plan.actions.find(a => a.id === id);
    if (existing && existing.status !== 'rejected') {
      proposed.push(existing);
      continue;
    }

    const priority = radarBySkill.get(key);
    const skillEvidence = evidenceForSkill(ledger, skill.skillId || skill.name, skill.name);
    const strongest = strongestClassification(skillEvidence);
    const badge = badgeFor(priority?.priorityScore ?? 60, priority?.importanceTier);

    const action: AutopilotAction = {
      id,
      objectiveId: 'obj_practice',
      title: `Close the ${skill.name} gap for ${analysisTitle || match.jobTitle}`,
      kind: 'proof_of_skill',
      consequential: false,
      priority: badge,
      priorityScore: Math.min(100, Math.max(10, Math.round(priority?.priorityScore ?? 65))),
      reason: `${skill.name} is a required skill for this opportunity and currently has no matching evidence in your profile.`,
      prerequisites: priority?.dependencies ?? [],
      expectedOutcome: `Pass a ${skill.name} challenge so the required skill is backed by stored evidence.`,
      status: 'awaiting_approval',
      completionEvidence: [
        'A passed Proof of Skill or Skill Proof Lab evidence record for this skill'
      ],
      recordedEvidence: [],
      route: '/proof-of-skill',
      actionLabel: 'Open Proof of Skill',
      requiresApproval: true,
      approvedByUser: false,
      targetSkillId: skill.skillId || skill.name,
      createdAt: existing?.createdAt ?? stamp,
      updatedAt: stamp,
      explanation: buildExplanation({
        what: `Prove ${skill.name} with a practical challenge for this ${match.jobTitle} opportunity.`,
        why:
          `The opportunity match found ${skill.name} missing among required skills ` +
          `(overall alignment ${match.overallSkillAlignmentPercentage}%, eligibility: ${match.statedRequirementsEligibility}).` +
          (priority ? ` Skill Radar ranks it ${priority.importanceTier} for your target role.` : ''),
        supportingData: [
          `Missing required skill: ${skill.name}`,
          `Overall alignment: ${match.overallSkillAlignmentPercentage}%`,
          `Eligibility: ${match.statedRequirementsEligibility}`,
          ...(priority ? [`Market demand: ${priority.supportingJobCount} supporting job(s)`] : []),
          ...(skillEvidence.length
            ? [`Existing evidence for this skill: ${skillEvidence[0].evaluationResult} (${skillEvidence[0].classification})`]
            : ['No stored evidence exists for this skill yet'])
        ],
        supportingReferences: [
          reference('Opportunity match analysis', 'Opportunity Match', '/opportunity-match'),
          reference('Skill Radar', 'Skill Radar', '/skill-radar'),
          ...ledgerReferences(skillEvidence)
        ],
        assumptions: [
          'Approving records a preparation proposal only; evidence is created when you actually pass a challenge.',
          'Skill demand is derived from stored and benchmark job descriptions, not live job feeds.'
        ],
        uncertainties: [
          'A single opportunity match samples one job specification; requirements vary across postings.'
        ],
        ifAccepted:
          'Adds this preparation action to your Autopilot plan as awaiting approval. You still perform the challenge yourself; completion is detected from real evidence.',
        reversible: true,
        evidenceClassification: strongest ?? 'rule-checked'
      })
    };

    proposed.push(action);
  }

  if (proposed.length === 0) {
    return {
      plan,
      source: { analysisId, jobTitle: analysisTitle ?? match.jobTitle, company: analysisCompany ?? match.company },
      matchSummary: {
        overallSkillAlignmentPercentage: match.overallSkillAlignmentPercentage,
        statedRequirementsEligibility: match.statedRequirementsEligibility,
        missingRequiredSkills: []
      },
      proposedActionIds: [],
      message: 'No missing required skills — nothing to propose. Review matched skills for maintenance actions.'
    };
  }

  const proposedIds = new Set(proposed.map(a => a.id));
  const actions = [...plan.actions.filter(a => !proposedIds.has(a.id)), ...proposed];
  const changeEntry: AutopilotChange = {
    at: stamp,
    kind: 'replan',
    summary:
      `Proposed ${proposed.length} preparation action(s) for "${analysisTitle ?? match.jobTitle}" ` +
      `covering: ${proposed.map(a => a.title.replace(/^Close the /, '').replace(/ gap for .*$/, '')).join(', ')}. Awaiting your approval.`,
    affectedActionIds: proposed.map(a => a.id)
  };
  const updatedPlan: CareerAutopilotPlan = {
    ...plan,
    actions,
    changeLog: [changeEntry, ...plan.changeLog].slice(0, PLAN_CHANGELOG_LIMIT)
  };
  db.saveAutopilotPlan(updatedPlan);

  return {
    plan: updatedPlan,
    source: {
      analysisId,
      jobTitle: analysisTitle ?? match.jobTitle,
      company: analysisCompany ?? match.company
    },
    matchSummary: {
      overallSkillAlignmentPercentage: match.overallSkillAlignmentPercentage,
      statedRequirementsEligibility: match.statedRequirementsEligibility,
      missingRequiredSkills: proposed.map(a => a.title)
    },
    proposedActionIds: proposed.map(a => a.id),
    message: `${proposed.length} preparation action(s) added to your Career Autopilot and awaiting your approval.`
  };
}
