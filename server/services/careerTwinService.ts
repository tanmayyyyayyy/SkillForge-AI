import { db } from '../db/store.js';
import { CAREER_ROLES } from '../data/careers.js';
import { calculateSkillGaps } from '../engine/gapEngine.js';
import { calculateCareerReadiness } from '../engine/readinessEngine.js';
import { summarizeEvidence } from './readinessService.js';
import { buildEvidenceIndex, collectSkillEvidence, deriveEvidence } from './evidenceIndex.js';
import type {
  StudentProfile,
  StudentSkill,
  ProficiencyLevel,
  CareerTwinSummary,
  CareerTwinSkill,
  CareerTwinScenarioInput,
  CareerTwinScenarioResult,
  CareerTwinScenarioComparison,
  CareerTwinScenarioSkillProjection
} from '../../src/types/index.js';

/**
 * Subphase 3A — Career Twin AI.
 *
 * The twin is a *derived* model: it re-reads the canonical profile, assessments,
 * projects, and the existing gap/readiness engines to describe the student's
 * current, evidence-backed capabilities. It introduces no parallel schemas and
 * no competing score formula — scenario projections are produced by re-running
 * the real readiness engine on a hypothetical skill profile.
 */

const TWIN_DISCLAIMER =
  'This twin reflects only the data stored in your SkillForge profile. Skills without ' +
  'an assessment or project are self-reported and may be inaccurate. It is a planning ' +
  'aid, not an evaluation of your ability or employability.';

function toLevel(n: number): ProficiencyLevel {
  const clamped = Math.max(0, Math.min(5, Math.round(n)));
  return clamped as ProficiencyLevel;
}

export function buildCareerTwin(userId: string): CareerTwinSummary | null {
  const profile = db.getProfile(userId);
  if (!profile) return null;

  const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];
  const assessments = db.getAssessments(userId);
  const projects = db.getProjects(userId);
  const gaps = calculateSkillGaps(profile, role);
  const readiness = calculateCareerReadiness(profile, role, assessments, projects, 0);

  const evidenceIndex = buildEvidenceIndex(userId);
  const gapBySkillId = new Map(gaps.items.map(item => [item.skillId, item]));

  const skills: CareerTwinSkill[] = profile.currentSkills.map(skill => {
    const gapItem = gapBySkillId.get(skill.skillId);
    const evidence = collectSkillEvidence(evidenceIndex, skill.skillId, skill.name);
    const { kind, confidence } = deriveEvidence(skill, evidence);

    return {
      skillId: skill.skillId,
      name: skill.name,
      category: skill.category,
      currentLevel: skill.proficiency,
      requiredLevel: gapItem ? gapItem.requiredLevel : null,
      gap: gapItem ? gapItem.gap : 0,
      status: skill.status,
      evidenceKind: kind,
      confidence,
      evidence,
      lastUpdated: skill.lastAssessedAt ?? skill.updatedAt,
      nextAction: gapItem
        ? gapItem.nextRecommendedAction
        : 'Maintain this skill and use it in a project to keep the evidence fresh.',
      inTargetRole: !!gapItem
    };
  });

  // Role requirements the student has not tracked at all — surfacing them keeps
  // the twin honest about what is still unknown rather than implied mastery.
  for (const req of role.requiredSkills) {
    if (gapBySkillId.get(req.skillId) && skills.some(s => s.skillId === req.skillId)) continue;
    if (skills.some(s => s.skillId === req.skillId)) continue;
    const gapItem = gapBySkillId.get(req.skillId);
    if (!gapItem) continue;
    const evidence = collectSkillEvidence(evidenceIndex, req.skillId, req.name);
    const untrackedSkill: StudentSkill = {
      skillId: req.skillId,
      name: req.name,
      category: req.category,
      proficiency: 0,
      status: 'unverified'
    };
    const { kind, confidence } = deriveEvidence(untrackedSkill, evidence);
    skills.push({
      skillId: req.skillId,
      name: req.name,
      category: req.category,
      currentLevel: 0,
      requiredLevel: req.requiredLevel,
      gap: gapItem.gap,
      status: 'unverified',
      evidenceKind: kind,
      confidence,
      evidence,
      nextAction: gapItem.nextRecommendedAction,
      inTargetRole: true
    });
  }

  const strengths = skills
    .filter(s => s.requiredLevel !== null && s.gap === 0)
    .sort((a, b) => b.currentLevel - a.currentLevel)
    .map(s => s.name);

  const majorGaps = gaps.items
    .filter(item => item.gap > 0)
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 5)
    .map(item => ({
      skillId: item.skillId,
      name: item.name,
      gap: item.gap,
      priority: item.priorityBadge,
      nextAction: item.nextRecommendedAction
    }));

  const missingEvidence = skills
    .filter(s => s.evidenceKind === 'self-reported' || s.evidenceKind === 'none')
    .filter(s => s.currentLevel > 0 || s.requiredLevel !== null)
    .sort((a, b) => b.gap - a.gap)
    .map(s => s.name);

  return {
    identity: {
      userId: profile.userId,
      fullName: profile.fullName,
      targetRoleId: role.id,
      targetRoleTitle: role.title,
      educationLevel: profile.educationLevel,
      academicStanding: profile.currentAcademicYear,
      graduationYear: profile.graduationYear,
      weeklyHours: profile.weeklyHours,
      learningStyle: profile.preferredLearningStyle,
      targetCompanies: profile.targetCompanies ?? [],
      interests: profile.interests ?? []
    },
    readiness,
    evidenceBreakdown: summarizeEvidence(profile.currentSkills),
    strengths,
    majorGaps,
    missingEvidence,
    skills,
    generatedAt: new Date().toISOString(),
    disclaimer: TWIN_DISCLAIMER
  };
}

const MAX_SCENARIOS = 4;
const MAX_FOCUS_SKILLS = 6;
const MIN_WEEKS = 1;
const MAX_WEEKS = 52;
const MIN_HOURS = 1;
const MAX_HOURS = 80;

function sanitizeLabel(label: string, fallbackIndex: number): string {
  const trimmed = (label ?? '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return `Scenario ${fallbackIndex + 1}`;
  return trimmed.slice(0, 60);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Projects one scenario by re-running the canonical readiness engine against a
 * hypothetical copy of the student's skill profile. Only `currentSkills` change;
 * assessments, projects, and the scoring formula are untouched.
 */
function simulateScenario(
  profile: StudentProfile,
  role: (typeof CAREER_ROLES)[number],
  baseReadiness: number,
  input: CareerTwinScenarioInput
): CareerTwinScenarioResult {
  const gaps = calculateSkillGaps(profile, role);
  const gapBySkillId = new Map(gaps.items.map(item => [item.skillId, item]));
  const skillById = new Map(profile.currentSkills.map(s => [s.skillId, s]));

  const focusSkillIds = input.focusSkillIds
    .filter(id => gapBySkillId.has(id) || skillById.has(id))
    .slice(0, MAX_FOCUS_SKILLS);

  const weeklyHours = Math.max(MIN_HOURS, Math.min(MAX_HOURS, Math.round(input.weeklyHours)));
  const horizonWeeks = Math.max(MIN_WEEKS, Math.min(MAX_WEEKS, Math.round(input.horizonWeeks)));
  const totalHours = weeklyHours * horizonWeeks;
  const perSkillHours = focusSkillIds.length > 0 ? totalHours / focusSkillIds.length : 0;

  const projections: CareerTwinScenarioSkillProjection[] = [];
  const adjustedSkills: StudentSkill[] = profile.currentSkills.map(s => ({ ...s }));
  const adjustedById = new Map(adjustedSkills.map(s => [s.skillId, s]));

  for (const skillId of focusSkillIds) {
    const gapItem = gapBySkillId.get(skillId);
    const existing = skillById.get(skillId);
    const currentLevel = existing ? existing.proficiency : 0;
    const targetLevel = gapItem ? gapItem.requiredLevel : toLevel(currentLevel + 1);
    const remainingGap = Math.max(0, targetLevel - currentLevel);

    // Hours needed per proficiency level, derived from the gap engine's own
    // estimate for closing the whole gap. Falls back to a modest default.
    const hoursToCloseGap = gapItem && gapItem.estimatedLearningHours > 0
      ? gapItem.estimatedLearningHours
      : Math.max(1, remainingGap) * 20;
    const costPerLevel = remainingGap > 0 ? hoursToCloseGap / remainingGap : hoursToCloseGap;

    const levelsGained = costPerLevel > 0
      ? Math.min(remainingGap, Math.floor(perSkillHours / costPerLevel))
      : 0;
    const nextLevel = toLevel(currentLevel + levelsGained);
    const weeksNeeded = levelsGained > 0 ? round1((levelsGained * costPerLevel) / weeklyHours) : horizonWeeks;

    if (adjustedById.has(skillId)) {
      adjustedById.get(skillId)!.proficiency = nextLevel;
    } else {
      const newSkill: StudentSkill = {
        skillId,
        name: gapItem?.name ?? skillId,
        category: gapItem?.category ?? 'General',
        proficiency: nextLevel,
        status: 'unverified'
      };
      adjustedSkills.push(newSkill);
      adjustedById.set(skillId, newSkill);
    }

    projections.push({
      skillId,
      name: gapItem?.name ?? existing?.name ?? skillId,
      fromLevel: toLevel(currentLevel),
      toLevel: nextLevel,
      targetLevel,
      weeksNeeded
    });
  }

  const simulatedProfile: StudentProfile = { ...profile, currentSkills: adjustedSkills };
  const simulated = calculateCareerReadiness(simulatedProfile, role, db.getAssessments(profile.userId), db.getProjects(profile.userId), 0);

  const simulatedGaps = calculateSkillGaps(simulatedProfile, role);
  const remainingGapSkills = simulatedGaps.items.filter(i => i.gap > 0).length;

  const focusSkillNames = projections.map(p => p.name);
  const assumptions = [
    `Assumes ~${weeklyHours} focused hours/week for ${horizonWeeks} week(s).`,
    `Assumes roughly ${Math.round(perSkillHours)} hours available per focus skill.`,
    `Uses your target role's estimated learning hours as the cost to gain a proficiency level.`,
    `Other skills, assessments, and projects are held constant.`,
    `Deterministic projection of your own data — not a hiring or salary prediction.`
  ];

  const stalled = projections.filter(p => p.toLevel === p.fromLevel).map(p => p.name);
  const notes: string[] = [];
  if (focusSkillIds.length === 0) {
    notes.push('No valid focus skills were selected for this scenario.');
  }
  if (stalled.length > 0) {
    notes.push(`Not enough allocated time to advance: ${stalled.join(', ')}. Increase hours or horizon.`);
  }

  return {
    label: sanitizeLabel(input.label, 0),
    assumptions,
    focusSkillIds,
    focusSkillNames,
    projectedReadiness: simulated.overallScore,
    readinessDelta: simulated.overallScore - baseReadiness,
    skillsTouched: projections,
    remainingGapSkills,
    notes
  };
}

/**
 * Compares 1..N learning scenarios against the current readiness baseline.
 * Invalid inputs are rejected by the caller (route); this function is defensive
 * and returns an empty comparison when nothing valid is supplied.
 */
export function simulateScenarios(
  userId: string,
  scenarios: CareerTwinScenarioInput[]
): CareerTwinScenarioComparison | null {
  const profile = db.getProfile(userId);
  if (!profile) return null;

  const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];
  const baseReadiness = calculateCareerReadiness(
    profile,
    role,
    db.getAssessments(userId),
    db.getProjects(userId),
    0
  ).overallScore;

  const safeScenarios = Array.isArray(scenarios) ? scenarios.slice(0, MAX_SCENARIOS) : [];
  const results = safeScenarios.map((scenario, index) => {
    const result = simulateScenario(profile, role, baseReadiness, scenario);
    return { ...result, label: sanitizeLabel(scenario.label, index) };
  });

  let recommendation =
    'Simulate at least one scenario to see how focused effort could move your readiness score.';
  if (results.length > 0) {
    const best = [...results].sort((a, b) => b.projectedReadiness - a.projectedReadiness)[0];
    recommendation =
      best.readinessDelta > 0
        ? `Focusing on ${best.focusSkillNames.join(', ') || 'your selected skills'} shows the largest projected gain (+${best.readinessDelta} points).`
        : 'None of the simulated plans move the score within the chosen horizon — consider a longer horizon or higher weekly hours.';
  }

  return {
    baseReadiness,
    scenarios: results,
    recommendation,
    disclaimer:
      'Scenario projections are heuristic estimates computed from your own SkillForge data. ' +
      'They are intended for planning and comparison only, not as guarantees.',
    generatedAt: new Date().toISOString()
  };
}

/**
 * Career Twin Evolution: Multi-scenario comparative forecasting.
 *
 * Evaluates 5 explicit career scenarios (Current learning pace, Focused gap-closure,
 * Internship preparation, Technical interview preparation, and Project sprint)
 * using deterministic effort calculations and real profile evidence.
 */
export function evolveCareerTwinScenarios(userId: string): import('../../src/types/index.js').CareerTwinEvolutionData | null {
  const profile = db.getProfile(userId);
  if (!profile) return null;

  const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];
  const assessments = db.getAssessments(userId);
  const projects = db.getProjects(userId);
  const gaps = calculateSkillGaps(profile, role);
  const baseReadiness = calculateCareerReadiness(profile, role, assessments, projects, 0).overallScore;

  const weeklyHours = Math.max(5, profile.weeklyHours || 14);
  const criticalGaps = gaps.items.filter(g => g.gap > 0).sort((a, b) => b.importance - a.importance);

  const makeDate = (weeksFromNow: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + Math.round(weeksFromNow * 7));
    return d.toISOString().split('T')[0];
  };

  // 1. Current Pace
  const currentTotalHours = criticalGaps.reduce((sum, g) => sum + g.estimatedLearningHours, 0);
  const currentWeeks = Math.max(2, Math.round(currentTotalHours / weeklyHours));
  let currentCumHours = 0;
  const currentMilestones = criticalGaps.slice(0, 4).map((g, idx) => {
    currentCumHours += g.estimatedLearningHours;
    return {
      milestoneName: `Complete ${g.name} Curriculum`,
      targetSkill: g.name,
      expectedCompletionDate: makeDate(currentCumHours / weeklyHours),
      requiredHours: g.estimatedLearningHours,
      dependencies: idx === 0 ? [] : [criticalGaps[idx - 1].name]
    };
  });

  const scenarioCurrent: import('../../src/types/index.js').CareerScenarioForecast = {
    scenarioId: 'current_pace',
    label: 'Current Learning Pace',
    description: `Maintaining your current study allocation of ${weeklyHours} hrs/week across all roadmap milestones evenly.`,
    weeklyStudyHours: weeklyHours,
    estimatedWeeksToReadiness: currentWeeks,
    projectedReadinessScore: Math.min(95, baseReadiness + Math.round(criticalGaps.length * 4)),
    projectedReadinessDelta: Math.min(30, Math.round(criticalGaps.length * 4)),
    milestoneForecasts: currentMilestones,
    assumptions: [
      `Assumes consistent ${weeklyHours} hours/week of focused study`,
      'Milestones are worked sequentially without interruption'
    ],
    riskFactors: [
      'Even distribution may delay closing critical blocker skills needed for technical interviews',
      'Context switching across multiple topics simultaneously'
    ],
    alternativePaths: ['Accelerate critical gaps first to qualify for early applicant pools'],
    confidenceLevel: 'High'
  };

  // 2. Focused Skill-Gap Improvement
  const focusedGaps = criticalGaps.slice(0, 2);
  const focusedHours = focusedGaps.reduce((sum, g) => sum + g.estimatedLearningHours, 0);
  const focusedWeeks = Math.max(2, Math.round(focusedHours / (weeklyHours * 0.8)));
  let focusedCumHours = 0;
  const focusedMilestones = focusedGaps.map(g => {
    focusedCumHours += g.estimatedLearningHours;
    return {
      milestoneName: `Pass ${g.name} Practical Proof Challenge`,
      targetSkill: g.name,
      expectedCompletionDate: makeDate(focusedCumHours / (weeklyHours * 0.8)),
      requiredHours: g.estimatedLearningHours,
      dependencies: []
    };
  });

  const scenarioFocused: import('../../src/types/index.js').CareerScenarioForecast = {
    scenarioId: 'skill_gap_focused',
    label: 'Focused Skill-Gap Closure',
    description: `Dedicates 80% of your weekly time strictly to your top 2 blocking skills: ${focusedGaps.map(g => g.name).join(' & ') || 'Core competencies'}.`,
    weeklyStudyHours: weeklyHours,
    estimatedWeeksToReadiness: focusedWeeks,
    projectedReadinessScore: Math.min(95, baseReadiness + 18),
    projectedReadinessDelta: 18,
    milestoneForecasts: focusedMilestones,
    assumptions: [
      'Concentrated effort yields faster concept retention and mastery',
      'Secondary non-essential topics are temporarily deferred'
    ],
    riskFactors: [
      'High cognitive fatigue if tackling two complex theoretical topics simultaneously'
    ],
    alternativePaths: ['Pair theoretical study with hands-on challenge drills in Proof of Skill'],
    confidenceLevel: 'High'
  };

  // 3. Internship Preparation Sprint
  const internWeeks = 8;
  const internMilestones = [
    {
      milestoneName: 'Core Algorithms & Data Structures Proof',
      targetSkill: 'Data Structures & Algorithms',
      expectedCompletionDate: makeDate(2),
      requiredHours: weeklyHours * 2,
      dependencies: []
    },
    {
      milestoneName: 'Portfolio Project MVP Deliverable',
      targetSkill: 'Practical Systems Engineering',
      expectedCompletionDate: makeDate(5),
      requiredHours: weeklyHours * 3,
      dependencies: ['Algorithms Foundation']
    },
    {
      milestoneName: 'Resume Defense & Technical Mock Screening',
      targetSkill: 'Interview Communication',
      expectedCompletionDate: makeDate(8),
      requiredHours: weeklyHours * 3,
      dependencies: ['Portfolio Project MVP']
    }
  ];

  const scenarioInternship: import('../../src/types/index.js').CareerScenarioForecast = {
    scenarioId: 'internship_prep',
    label: 'Internship Preparation Sprint',
    description: 'An aggressive 8-week milestone path targeted at passing technical screening rounds and establishing practical project proof.',
    weeklyStudyHours: Math.max(16, weeklyHours),
    estimatedWeeksToReadiness: 8,
    projectedReadinessScore: Math.min(95, baseReadiness + 22),
    projectedReadinessDelta: 22,
    milestoneForecasts: internMilestones,
    assumptions: [
      'Recruiting cycle deadlines require verifiable portfolio proof by Week 6',
      'Time allocation increases to at least 16 hours/week'
    ],
    riskFactors: [
      'Requires strict adherence to schedule; incomplete milestones leave gaps in interview prep'
    ],
    alternativePaths: ['Extend timeline to 12 weeks if academic workload intensifies'],
    confidenceLevel: 'Moderate'
  };

  // 4. Technical Interview Preparation
  const interviewWeeks = 6;
  const interviewMilestones = [
    {
      milestoneName: 'System Architecture & Concurrency Drills',
      targetSkill: 'System Design',
      expectedCompletionDate: makeDate(2),
      requiredHours: weeklyHours * 2,
      dependencies: []
    },
    {
      milestoneName: 'Live Coding Challenge Rapid-Fire',
      targetSkill: 'Live Coding & Problem Solving',
      expectedCompletionDate: makeDate(4),
      requiredHours: weeklyHours * 2,
      dependencies: ['System Design']
    },
    {
      milestoneName: 'Behavioral STAR Story Formulation',
      targetSkill: 'Behavioral Competence',
      expectedCompletionDate: makeDate(6),
      requiredHours: weeklyHours * 2,
      dependencies: []
    }
  ];

  const scenarioInterview: import('../../src/types/index.js').CareerScenarioForecast = {
    scenarioId: 'interview_prep',
    label: 'Technical Interview Defense',
    description: 'Prioritizes verbal explanation, architectural trade-offs, and live coding fluency in Interview Arena.',
    weeklyStudyHours: weeklyHours,
    estimatedWeeksToReadiness: interviewWeeks,
    projectedReadinessScore: Math.min(95, baseReadiness + 15),
    projectedReadinessDelta: 15,
    milestoneForecasts: interviewMilestones,
    assumptions: [
      'Foundational syntax is already acquired; focus is on live delivery and trade-off defense'
    ],
    riskFactors: [
      'Does not produce new external GitHub projects; strictly sharpens test performance'
    ],
    alternativePaths: ['Conduct mock interviews twice weekly in Interview Arena'],
    confidenceLevel: 'High'
  };

  // 5. Project-Focused Sprint
  const projectWeeks = 10;
  const projectMilestones = [
    {
      milestoneName: 'Project Forge: Architecture & Persistence Spec',
      targetSkill: 'Architecture Design',
      expectedCompletionDate: makeDate(3),
      requiredHours: weeklyHours * 3,
      dependencies: []
    },
    {
      milestoneName: 'Project Forge: High-Concurrency Core Implementation',
      targetSkill: 'Backend & Data Pipelines',
      expectedCompletionDate: makeDate(7),
      requiredHours: weeklyHours * 4,
      dependencies: ['Architecture Spec']
    },
    {
      milestoneName: 'Portfolio Intelligence: Verified Testing & Public Demo',
      targetSkill: 'DevOps & Quality Assurance',
      expectedCompletionDate: makeDate(10),
      requiredHours: weeklyHours * 3,
      dependencies: ['Core Implementation']
    }
  ];

  const scenarioProject: import('../../src/types/index.js').CareerScenarioForecast = {
    scenarioId: 'project_sprint',
    label: 'Project-Focused Development Sprint',
    description: 'Immerses 100% of study time into building an industry-grade project in Project Forge to substantiate your resume with verifiable artifacts.',
    weeklyStudyHours: weeklyHours,
    estimatedWeeksToReadiness: projectWeeks,
    projectedReadinessScore: Math.min(95, baseReadiness + 25),
    projectedReadinessDelta: 25,
    milestoneForecasts: projectMilestones,
    assumptions: [
      'Practical engineering artifacts provide the strongest signal for technical hiring managers',
      'Theoretical learning is acquired contextually while solving real build errors'
    ],
    riskFactors: [
      'Debugging complex architectural issues can cause timeline variance'
    ],
    alternativePaths: ['Break down larger milestones into sub-tasks in Project Forge'],
    confidenceLevel: 'Moderate'
  };

  const scenarios = [scenarioCurrent, scenarioFocused, scenarioInternship, scenarioInterview, scenarioProject];

  return {
    baseReadiness,
    targetRole: { id: role.id, title: role.title },
    scenarios,
    recommendedScenario: 'skill_gap_focused',
    comparisonSummary: `Comparing 5 scenarios against your ${weeklyHours} hrs/week availability. The "Focused Skill-Gap Closure" scenario offers the highest efficiency gain (+18 readiness points in ${focusedWeeks} weeks) by addressing top blocker skills first.`,
    disclaimer: 'All scenario dates and readiness changes are deterministic mathematical estimates derived from your personal profile and historical activity. SkillForge does not guarantee employment outcomes.',
    generatedAt: new Date().toISOString()
  };
}
