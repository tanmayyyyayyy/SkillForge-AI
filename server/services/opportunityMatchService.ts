import { db } from '../db/store.js';
import { CAREER_ROLES } from '../data/careers.js';
import { extractJobDescriptionDeterministic } from './jobDescriptionExtractor.js';
import { normalizeSkillKey, buildEvidenceIndex, collectSkillEvidence } from './evidenceIndex.js';
import type {
  OpportunityMatchResult,
  OpportunitySkillMatchItem,
  JobDescriptionExtraction,
  StudentProfile,
  JobAnalysis
} from '../../src/types/index.js';

export function evaluateOpportunityMatch(
  userId: string,
  input: { description?: string; analysisId?: string }
): OpportunityMatchResult | null {
  const profile = db.getProfile(userId);
  if (!profile) return null;

  let extraction: JobDescriptionExtraction | null = null;
  let jobTitle = 'Target Role Opportunity';
  let company: string | undefined;
  let location: string | undefined;

  if (input.analysisId) {
    const saved = db.getJobAnalysis(userId, input.analysisId);
    if (saved && saved.analysis?.extraction) {
      extraction = saved.analysis.extraction;
      jobTitle = saved.title || extraction.jobTitle || jobTitle;
      company = saved.company || extraction.companyName;
      location = saved.location;
    }
  }

  if (!extraction && input.description) {
    extraction = extractJobDescriptionDeterministic(input.description).extraction;
    jobTitle = extraction.jobTitle || jobTitle;
    company = extraction.companyName;
  }

  if (!extraction) {
    return null;
  }

  const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];
  const userSkillMap = new Map(profile.currentSkills.map(s => [normalizeSkillKey(s.skillId), s]));
  const userProofMap = new Map(db.getProofOfSkillEvidence(userId).map(p => [normalizeSkillKey(p.skillId), p]));
  const evidenceIndex = buildEvidenceIndex(userId);

  const requiredMatched: OpportunitySkillMatchItem[] = [];
  const requiredMissing: OpportunitySkillMatchItem[] = [];
  const preferredMatched: OpportunitySkillMatchItem[] = [];
  const preferredMissing: OpportunitySkillMatchItem[] = [];

  for (const skillMention of extraction.skills) {
    const key = normalizeSkillKey(skillMention.name);
    const userSkill = userSkillMap.get(key) || userSkillMap.get(normalizeSkillKey(skillMention.skillId || ''));
    const proof = userProofMap.get(key);
    const userProf = userSkill?.proficiency ?? (proof ? 3 : 0);
    const isRequired = skillMention.kind === 'required';

    const evidenceRefs = collectSkillEvidence(evidenceIndex, skillMention.skillId || key, skillMention.name);
    const supportingEvidence = proof
      ? `Proof of Skill: ${proof.challengeTitle} (${proof.scorePercentage}%)`
      : evidenceRefs.length > 0
        ? evidenceRefs[0].label
        : undefined;

    const evidenceStatus = proof
      ? ('assessed' as const)
      : userSkill
        ? userSkill.status
        : ('unverified' as const);

    const isMatched = userProf >= 2 || !!proof || (!!userSkill && userSkill.status !== 'unverified');

    const item: OpportunitySkillMatchItem = {
      skillId: skillMention.skillId || key,
      name: skillMention.name,
      requirementType: isRequired ? 'required' : 'preferred',
      matched: isMatched,
      userProficiency: userProf,
      requiredProficiency: isRequired ? 3 : 2,
      supportingEvidenceRef: supportingEvidence,
      evidenceStatus,
      gapExplanation: isMatched
        ? `Demonstrated at level ${userProf}/5${supportingEvidence ? ` (${supportingEvidence})` : ''}.`
        : `Stated requirement missing or unverified in your profile.`
    };

    if (isRequired) {
      if (isMatched) requiredMatched.push(item);
      else requiredMissing.push(item);
    } else {
      if (isMatched) preferredMatched.push(item);
      else preferredMissing.push(item);
    }
  }

  // Calculate overall match score
  const totalReq = requiredMatched.length + requiredMissing.length;
  const totalPref = preferredMatched.length + preferredMissing.length;
  const reqRatio = totalReq > 0 ? requiredMatched.length / totalReq : 1;
  const prefRatio = totalPref > 0 ? preferredMatched.length / totalPref : 1;

  const overallSkillAlignmentPercentage = Math.round((reqRatio * 0.75 + prefRatio * 0.25) * 100);

  let statedRequirementsEligibility: OpportunityMatchResult['statedRequirementsEligibility'] = 'Gaps Detected';
  if (reqRatio >= 0.9) statedRequirementsEligibility = 'Fully Eligible';
  else if (reqRatio >= 0.7) statedRequirementsEligibility = 'Moderately Eligible';
  else if (reqRatio < 0.4) statedRequirementsEligibility = 'Under-Qualified';

  // Align user projects
  const userProjects = db.getProjects(userId);
  const forgedProjects = db.getForgedProjects(userId);
  const allProjects = [
    ...userProjects.filter(p => p.userStatus !== 'recommended'),
    ...forgedProjects.map(f => ({
      id: f.id,
      title: f.title,
      skillsDemonstrated: f.targetedGapSkills,
      userStatus: f.status
    }))
  ];

  const projectEvidenceAlignment = allProjects.map(p => ({
    projectId: p.id,
    title: p.title,
    relevance: 'Demonstrates architectural implementation matching core role stack',
    skillsDemonstrated: p.skillsDemonstrated
  }));

  // Align assessments
  const assessmentEvidenceAlignment = [
    ...db.getAssessments(userId).map(a => ({
      skillId: a.skillId,
      skillName: a.skillName,
      scorePercentage: a.scorePercentage,
      passed: a.passed
    })),
    ...db.getProofOfSkillEvidence(userId).map(p => ({
      skillId: p.skillId,
      skillName: p.skillName,
      scorePercentage: p.scorePercentage,
      passed: true
    }))
  ];

  // Recommended actions
  const recommendedActions: OpportunityMatchResult['recommendedActions'] = [];

  if (requiredMissing.length > 0) {
    const topMissing = requiredMissing[0];
    recommendedActions.push({
      actionType: 'proof_of_skill',
      title: `Take ${topMissing.name} Practical Assessment`,
      detail: `This skill is an essential requirement. Complete a practical challenge to prove proficiency.`,
      route: '/proof-of-skill'
    });
  }

  if (requiredMissing.length > 1) {
    const secondMissing = requiredMissing[1];
    recommendedActions.push({
      actionType: 'project_forge',
      title: `Build a Project covering ${secondMissing.name}`,
      detail: `Forge an engineering milestone to create demonstrable portfolio evidence.`,
      route: '/project-forge'
    });
  }

  recommendedActions.push({
    actionType: 'interview_prep',
    title: `Practice Interview Defense for ${jobTitle}`,
    detail: `Simulate technical questions focused on ${extraction.skills.slice(0, 3).map(s => s.name).join(', ')}.`,
    route: '/interview-arena'
  });

  return {
    jobTitle,
    company,
    location,
    targetRoleAlignment: role.title,
    overallSkillAlignmentPercentage,
    statedRequirementsEligibility,
    requiredSkillsMatched: requiredMatched,
    requiredSkillsMissing: requiredMissing,
    preferredSkillsMatched: preferredMatched,
    preferredSkillsMissing: preferredMissing,
    projectEvidenceAlignment,
    assessmentEvidenceAlignment,
    experienceAlignment: {
      matchedExperience: [`Profile education: ${profile.educationLevel} (${profile.degree})`],
      unmatchedRequirements: extraction.qualifications || []
    },
    recommendedActions,
    explainabilityTrace: [
      {
        dimension: 'Required Skills Match',
        sourceEvidence: `${requiredMatched.length}/${totalReq} required skills substantiated by current profile`,
        impactOnAssessment: `Contributes 75% to overall alignment score`
      },
      {
        dimension: 'Preferred Skills Match',
        sourceEvidence: `${preferredMatched.length}/${totalPref} nice-to-have skills matched`,
        impactOnAssessment: `Contributes 25% to overall alignment score`
      },
      {
        dimension: 'Objective Evidence Backing',
        sourceEvidence: `${assessmentEvidenceAlignment.length} passing assessments on file`,
        impactOnAssessment: 'Provides verifiable backing for claimed proficiencies'
      }
    ],
    hiringProbabilityNotice: 'SkillForge does not estimate speculative hiring probability because hiring depends on external competition, interview dynamics, and organizational fit. This report evaluates skill alignment and eligibility against stated requirements only.',
    generatedAt: new Date().toISOString()
  };
}
