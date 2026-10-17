import type {
  CareerRole,
  StudentProfile,
  JobDescriptionAnalysis,
  JobDescriptionExtraction,
  JobDescriptionMatch,
  JobDescriptionSkillMention,
  JobDescriptionSummary,
  JobDescriptionNextStep,
  JobMatchState,
  JobRequirementKind
} from '../../src/types/index.js';
import { CAREER_ROLES } from '../data/careers.js';
import { calculateSkillGaps } from './gapEngine.js';

/**
 * Subphase 2H: Job Description match engine.
 *
 * Compares the skills parsed out of a pasted job posting against the student's
 * own profile. This engine is deliberately independent of the readiness engine:
 * a job posting is external context, so it must never move the official
 * Career Readiness Score. It does reuse the shared career catalog (weights,
 * levels, learning resources) and the gap engine (next-step recommendations).
 *
 * Scoring (documented to the user in `summary.methodology`):
 *   coverage(group) = Σ(weight × credit) ÷ Σ(weight)
 *   credit = 1.0 (present, at/above catalog level or no level defined)
 *          | 0.5 (present, below the catalog level)
 *          | 0.0 (absent)
 *   matchScore = 0.75 × requiredCoverage + 0.25 × preferredCoverage
 *              = requiredCoverage alone when the posting lists no preferred skills
 */

type CatalogRequirement = CareerRole['requiredSkills'][number];

const DEFAULT_WEIGHT = 0.6;

const KIND_RANK: Record<JobRequirementKind, number> = {
  required: 0,
  tool: 1,
  responsibility: 2,
  preferred: 3
};

const STATE_RANK: Record<JobMatchState, number> = { matched: 0, partial: 1, missing: 2 };

const PRIORITY_RANK: Record<JobDescriptionNextStep['priority'], number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3
};

interface CatalogSkillInfo {
  importance: number;
  levelsByRole: Map<string, number>;
  sample: CatalogRequirement;
}

const CATALOG: Map<string, CatalogSkillInfo> = (() => {
  const map = new Map<string, CatalogSkillInfo>();
  for (const role of CAREER_ROLES) {
    for (const skill of role.requiredSkills) {
      const existing = map.get(skill.skillId);
      if (existing) {
        existing.importance = Math.max(existing.importance, skill.importance);
        existing.levelsByRole.set(role.id, skill.requiredLevel);
      } else {
        map.set(skill.skillId, {
          importance: skill.importance,
          levelsByRole: new Map([[role.id, skill.requiredLevel]]),
          sample: skill
        });
      }
    }
  }
  return map;
})();

const GLOBAL_REQUIREMENT_BY_SKILL: Map<string, CatalogRequirement> = (() => {
  const map = new Map<string, CatalogRequirement>();
  for (const role of CAREER_ROLES) {
    for (const skill of role.requiredSkills) {
      if (!map.has(skill.skillId)) map.set(skill.skillId, skill);
    }
  }
  return map;
})();

function creditFor(state: JobMatchState): number {
  if (state === 'matched') return 1;
  if (state === 'partial') return 0.5;
  return 0;
}

/** Defensive merge so a duplicated skill (e.g. listed twice) is scored once. */
function mergeMentions(mentions: JobDescriptionSkillMention[]): JobDescriptionSkillMention[] {
  const merged = new Map<string, JobDescriptionSkillMention>();
  for (const mention of mentions) {
    const existing = merged.get(mention.skillId);
    if (!existing) {
      merged.set(mention.skillId, { ...mention, sections: [...mention.sections] });
      continue;
    }
    if (KIND_RANK[mention.kind] < KIND_RANK[existing.kind]) existing.kind = mention.kind;
    existing.sections = Array.from(new Set([...existing.sections, ...mention.sections])).slice(0, 6);
    if (!existing.evidence) existing.evidence = mention.evidence;
    existing.inferred = existing.inferred && mention.inferred;
  }
  return Array.from(merged.values());
}

function coverage(matches: JobDescriptionMatch[]): number | null {
  if (matches.length === 0) return null;
  const totalWeight = matches.reduce((sum, m) => sum + m.weight, 0);
  if (totalWeight <= 0) return null;
  const earned = matches.reduce((sum, m) => sum + creditFor(m.state) * m.weight, 0);
  return Math.round((earned / totalWeight) * 100);
}

function buildReason(
  state: JobMatchState,
  proficiency: number,
  targetLevel: number | undefined,
  present: boolean,
  inferred: boolean
): string {
  const inferredNote = inferred
    ? ' Detected from surrounding context rather than an explicit skills list.'
    : '';

  if (state === 'matched') {
    if (targetLevel !== undefined) {
      return `In your profile at level ${proficiency}/5, meeting your target track's catalog level of ${targetLevel}/5.${inferredNote}`;
    }
    return `In your profile at level ${proficiency}/5. Your target track's catalog defines no fixed level for this skill, so presence was used.${inferredNote}`;
  }
  if (state === 'partial') {
    return `In your profile at level ${proficiency}/5, below your target track's catalog level of ${targetLevel}/5.${inferredNote}`;
  }
  if (present) {
    return `Recorded at level 0, so it does not count as a match yet.${inferredNote}`;
  }
  return `Not present in your profile.${inferredNote}`;
}

function buildNextSteps(
  profile: StudentProfile,
  targetRole: CareerRole,
  matches: JobDescriptionMatch[]
): JobDescriptionNextStep[] {
  const gaps = calculateSkillGaps(profile, targetRole);
  const gapBySkill = new Map(gaps.items.map(item => [item.skillId, item]));
  const targetReqBySkill = new Map(targetRole.requiredSkills.map(s => [s.skillId, s]));

  const candidates = matches
    .filter(m => m.state !== 'matched')
    .sort((a, b) => b.weight - a.weight || STATE_RANK[a.state] - STATE_RANK[b.state]);

  const steps: JobDescriptionNextStep[] = [];

  for (const match of candidates) {
    const gapItem = gapBySkill.get(match.skillId);
    const targetReq = targetReqBySkill.get(match.skillId);
    const reqSkill = targetReq || GLOBAL_REQUIREMENT_BY_SKILL.get(match.skillId);

    let priority: JobDescriptionNextStep['priority'];
    if (gapItem && gapItem.priorityBadge !== 'Mastered') {
      priority = gapItem.priorityBadge;
    } else if (match.weight >= 0.85) {
      priority = 'High';
    } else if (match.weight >= 0.7) {
      priority = 'Medium';
    } else {
      priority = 'Low';
    }

    let action: string;
    if (gapItem) {
      action = gapItem.nextRecommendedAction;
    } else if (match.state === 'partial' && match.roleRequiredLevel !== undefined) {
      action = `Raise ${match.name} toward level ${match.roleRequiredLevel}/5 with focused practice, then re-run this analysis.`;
    } else if (reqSkill) {
      action = `Study ${match.name}, build something small with it, then add it to your profile and re-run this analysis.`;
    } else {
      action = `Add ${match.name} to your profile once you have learned it, then re-run this analysis to update your match.`;
    }

    const firstResource = reqSkill?.learningResources?.[0];
    const estimatedHours = gapItem?.estimatedLearningHours ?? reqSkill?.estimatedHours;

    steps.push({
      skillId: match.skillId,
      name: match.name,
      state: match.state,
      priority,
      action,
      resource: firstResource
        ? { title: firstResource.title, url: firstResource.url, type: firstResource.type, free: firstResource.free }
        : undefined,
      estimatedHours,
      inTargetTrack: targetReqBySkill.has(match.skillId)
    });

    if (steps.length >= 8) break;
  }

  return steps.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.name.localeCompare(b.name));
}

export function calculateJobMatch(
  profile: StudentProfile,
  extraction: JobDescriptionExtraction,
  source: 'gemini' | 'deterministic'
): JobDescriptionAnalysis {
  const targetRole = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];
  const profileBySkill = new Map(profile.currentSkills.map(s => [s.skillId, s]));

  const matches: JobDescriptionMatch[] = mergeMentions(extraction.skills).map(mention => {
    const catalog = CATALOG.get(mention.skillId);
    const weight = catalog ? Math.round(catalog.importance * 100) / 100 : DEFAULT_WEIGHT;
    const existing = profileBySkill.get(mention.skillId);
    const proficiency = existing ? existing.proficiency : 0;
    const targetLevel = catalog ? catalog.levelsByRole.get(targetRole.id) : undefined;

    let state: JobMatchState;
    if (!existing || proficiency === 0) {
      state = 'missing';
    } else if (targetLevel !== undefined && proficiency < targetLevel) {
      state = 'partial';
    } else {
      state = 'matched';
    }

    return {
      skillId: mention.skillId,
      name: mention.name,
      category: mention.category,
      kind: mention.kind,
      weight,
      state,
      profileProficiency: existing ? existing.proficiency : undefined,
      profileStatus: existing ? existing.status : undefined,
      roleRequiredLevel: targetLevel,
      evidence: mention.evidence,
      inferred: mention.inferred,
      confidence: mention.confidence,
      reason: buildReason(state, proficiency, targetLevel, !!existing, mention.inferred)
    };
  });

  matches.sort(
    (a, b) => STATE_RANK[a.state] - STATE_RANK[b.state] || b.weight - a.weight || a.name.localeCompare(b.name)
  );

  const requiredMatches = matches.filter(m => m.kind !== 'preferred');
  const preferredMatches = matches.filter(m => m.kind === 'preferred');
  const requiredCoverage = coverage(requiredMatches);
  const preferredCoverage = coverage(preferredMatches);

  let matchScore: number | null;
  let note: string | undefined;

  if (matches.length === 0) {
    matchScore = null;
    note =
      'No recognizable skills were found in this posting, so a match score could not be calculated. Try pasting a posting that lists concrete skills.';
  } else if (requiredCoverage === null && preferredCoverage === null) {
    matchScore = null;
    note = 'The posting produced no scorable skills, so a match score could not be calculated.';
  } else if (requiredCoverage === null) {
    matchScore = preferredCoverage;
  } else if (preferredCoverage === null) {
    matchScore = requiredCoverage;
  } else {
    matchScore = Math.round(requiredCoverage * 0.75 + preferredCoverage * 0.25);
  }

  const requiredCount = requiredMatches.length;
  const preferredCount = preferredMatches.length;
  const weighting =
    preferredCoverage === null
      ? 'Because the posting lists no preferred skills, the score equals the weighted required-coverage.'
      : 'The score is 0.75 × required-coverage + 0.25 × preferred-coverage.';
  const methodology = `${weighting} Coverage = Σ(weight × credit) ÷ Σ(weight) across the ${requiredCount} required-group skill(s)${
    preferredCount ? ` and ${preferredCount} preferred skill(s)` : ''
  }. Credit is 1.0 for a skill in your profile at or above your target track's catalog level (or any level when the catalog defines none), 0.5 for a skill you list below the catalog level, and 0 for a skill you do not list. Weights use catalog importance (0.60 default for skills outside the catalog). Required-group skills are those under explicit requirements, tech/tools, or responsibilities; preferred skills come only from nice-to-have/preferred headings. This is a fit signal for your own planning, not a hiring probability.`;

  const summary: JobDescriptionSummary = {
    extractedSkillCount: matches.length,
    requiredSkillCount: requiredCount,
    preferredSkillCount: preferredCount,
    matchedCount: matches.filter(m => m.state === 'matched').length,
    partialCount: matches.filter(m => m.state === 'partial').length,
    missingCount: matches.filter(m => m.state === 'missing').length,
    requiredCoverage,
    preferredCoverage,
    matchScore,
    methodology,
    note
  };

  let closestRole: JobDescriptionAnalysis['closestRole'];
  const jdSkillIds = new Set(matches.map(m => m.skillId));
  if (jdSkillIds.size > 0) {
    let best: { id: string; title: string; overlap: number } | null = null;
    for (const role of CAREER_ROLES) {
      const roleSkillIds = new Set(role.requiredSkills.map(s => s.skillId));
      let hits = 0;
      for (const id of jdSkillIds) if (roleSkillIds.has(id)) hits += 1;
      const overlap = Math.round((hits / jdSkillIds.size) * 100);
      if (!best || overlap > best.overlap) {
        best = { id: role.id, title: role.title, overlap };
      }
    }
    if (best && best.overlap > 0) closestRole = best;
  }

  return {
    extraction,
    source,
    matches,
    summary,
    nextSteps: buildNextSteps(profile, targetRole, matches),
    closestRole,
    targetRole: { id: targetRole.id, title: targetRole.title },
    generatedAt: new Date().toISOString()
  };
}
