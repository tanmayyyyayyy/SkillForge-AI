import { db } from '../db/store.js';
import { CAREER_ROLES } from '../data/careers.js';
import { buildEvidenceIndex, collectSkillEvidence, normalizeSkillKey } from './evidenceIndex.js';
import type {
  ProficiencyLevel,
  ResumeClaimVerdict,
  ResumeSkillClaimAssessment,
  ResumeProjectClaimAssessment,
  ResumeExperienceClaimAssessment,
  ResumeMissingClaim,
  ResumeTruthDraft,
  ResumeTruthReport,
  StudentSkill
} from '../../src/types/index.js';

/**
 * Subphase 3C — Resume Truth Engine.
 *
 * Compares a resume *draft* against the student's own SkillForge evidence and
 * reports, per claim, what is independently verifiable. It is deliberately
 * conservative:
 *   - it never invents endorsements or upgrades a claim,
 *   - it never edits the resume,
 *   - it never marks an unbacked claim as verified.
 */

const DISCLAIMER =
  'SkillForge compares claims with your own stored evidence only; it does not verify external ' +
  'experience and never edits your resume.';

const MAX_SKILLS = 200;
const MAX_PROJECTS = 50;
const MAX_EXPERIENCE = 50;

export function checkResumeTruth(userId: string, draft: ResumeTruthDraft): ResumeTruthReport | null {
  const profile = db.getProfile(userId);
  if (!profile) return null;

  const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];
  const assessments = db.getAssessments(userId);
  const projects = db.getProjects(userId);
  const evidenceIndex = buildEvidenceIndex(userId);

  // Independent evidence, keyed case-insensitively by id and display name.
  const passedSkillKeys = new Set<string>();
  for (const result of assessments) {
    if (!result.passed) continue;
    passedSkillKeys.add(normalizeSkillKey(result.skillId));
    passedSkillKeys.add(normalizeSkillKey(result.skillName));
  }

  const completedProjectSkillKeys = new Set<string>();
  for (const project of projects) {
    if (project.userStatus !== 'completed') continue;
    for (const skill of project.skillsDemonstrated) completedProjectSkillKeys.add(normalizeSkillKey(skill));
  }

  const profileSkillByKey = new Map<string, StudentSkill>();
  for (const skill of profile.currentSkills) {
    profileSkillByKey.set(normalizeSkillKey(skill.skillId), skill);
    profileSkillByKey.set(normalizeSkillKey(skill.name), skill);
  }

  const claimedKeys = new Set<string>();
  const skillAssessments = new Map<string, ResumeSkillClaimAssessment>();
  const draftSkills = Array.isArray(draft.skills) ? draft.skills : [];

  for (const claim of draftSkills.slice(0, MAX_SKILLS)) {
    const name = typeof claim.name === 'string' ? claim.name.trim() : '';
    const skillId = typeof claim.skillId === 'string' && claim.skillId.trim() ? claim.skillId.trim() : name;
    if (!name && !skillId) continue;

    const keys = [normalizeSkillKey(skillId), normalizeSkillKey(name)].filter(Boolean);
    for (const key of keys) claimedKeys.add(key);

    const resumeLevel = (typeof claim.proficiency === 'number' ? claim.proficiency : 0) as ProficiencyLevel;
    const hasVerifiedAssessment = keys.some(k => passedSkillKeys.has(k));
    const hasCompletedProject = keys.some(k => completedProjectSkillKeys.has(k));
    const profileSkill = keys.map(k => profileSkillByKey.get(k)).find(Boolean);

    let verdict: ResumeClaimVerdict;
    if (hasVerifiedAssessment) verdict = 'verified';
    else if (hasCompletedProject) verdict = 'project-backed';
    else if (profileSkill) verdict = 'in-profile';
    else verdict = 'unsupported';

    const evidencedLevel: ProficiencyLevel = profileSkill
      ? profileSkill.proficiency
      : verdict === 'verified' || verdict === 'project-backed'
        ? resumeLevel
        : 0;
    const levelOverstated = resumeLevel > evidencedLevel;
    const evidence = collectSkillEvidence(evidenceIndex, skillId, name);

    const existing = skillAssessments.get(skillId);
    if (existing && existing.resumeLevel >= resumeLevel) continue;

    skillAssessments.set(skillId, {
      skillId,
      name: name || skillId,
      resumeLevel,
      evidencedLevel,
      verdict,
      levelOverstated,
      evidence,
      suggestion: skillSuggestion(verdict, levelOverstated)
    });
  }

  const knownProjectTitles = new Set<string>();
  for (const project of profile.existingProjects) knownProjectTitles.add(normalizeSkillKey(project.title));
  for (const project of projects) {
    if (project.userStatus && project.userStatus !== 'recommended') knownProjectTitles.add(normalizeSkillKey(project.title));
  }

  const draftProjects = Array.isArray(draft.projects) ? draft.projects : [];
  const projectsOut: ResumeProjectClaimAssessment[] = draftProjects.slice(0, MAX_PROJECTS).map(project => {
    const title = typeof project.title === 'string' ? project.title.trim() : '';
    const hasLink = Boolean(project.repoUrl || project.liveUrl);
    const matchedProfileProject = title.length > 0 && knownProjectTitles.has(normalizeSkillKey(title));
    return {
      title: title || 'Untitled project',
      hasLink,
      matchedProfileProject,
      suggestion: projectSuggestion(title, hasLink, matchedProfileProject)
    };
  });

  const draftExperience = Array.isArray(draft.experience) ? draft.experience : [];
  const experienceOut: ResumeExperienceClaimAssessment[] = draftExperience.slice(0, MAX_EXPERIENCE).map(exp => ({
    organization: typeof exp.organization === 'string' ? exp.organization.trim().slice(0, 120) : '',
    role: typeof exp.role === 'string' ? exp.role.trim().slice(0, 120) : '',
    note: 'Self-reported role. SkillForge does not verify external employment — add measurable outcomes.'
  }));

  const missingFromResume: ResumeMissingClaim[] = role.requiredSkills
    .filter(
      req =>
        req.requiredLevel >= 3 &&
        !claimedKeys.has(normalizeSkillKey(req.skillId)) &&
        !claimedKeys.has(normalizeSkillKey(req.name))
    )
    .sort((a, b) => b.requiredLevel - a.requiredLevel)
    .slice(0, 8)
    .map(req => {
      const profileSkill = profile.currentSkills.find(s => s.skillId === req.skillId);
      return {
        skillId: req.skillId,
        name: req.name,
        requiredLevel: req.requiredLevel,
        hasEvidence: !!profileSkill && (profileSkill.status === 'assessed' || profileSkill.status === 'verified_project')
      };
    });

  const skills = [...skillAssessments.values()];
  const verified = skills.filter(s => s.verdict === 'verified').length;
  const projectBacked = skills.filter(s => s.verdict === 'project-backed').length;
  const inProfile = skills.filter(s => s.verdict === 'in-profile').length;
  const unsupported = skills.filter(s => s.verdict === 'unsupported').length;
  const totalClaims = skills.length;

  const advisories: string[] = [
    'This check compares your resume only against evidence stored in your SkillForge profile. External work, certificates, and coursework are not independently verified.'
  ];
  if (unsupported > 0) {
    advisories.push(
      `${unsupported} skill claim${unsupported === 1 ? '' : 's'} have no matching profile evidence. SkillForge will not mark these as verified.`
    );
  }
  const overstated = skills.filter(s => s.levelOverstated).length;
  if (overstated > 0) {
    advisories.push(
      `${overstated} claim${overstated === 1 ? '' : 's'} state a higher level than your evidence supports — align the level or add evidence.`
    );
  }
  if (missingFromResume.length > 0) {
    advisories.push(
      `${missingFromResume.length} role-critical skill${missingFromResume.length === 1 ? '' : 's'} for ${role.title} are not mentioned on the resume.`
    );
  }

  return {
    summary: {
      totalClaims,
      verified,
      projectBacked,
      inProfile,
      unsupported,
      evidenceBackedRatio: totalClaims === 0 ? 0 : Math.round(((verified + projectBacked) / totalClaims) * 100)
    },
    skills,
    projects: projectsOut,
    experience: experienceOut,
    missingFromResume,
    advisories,
    disclaimer: DISCLAIMER,
    generatedAt: new Date().toISOString()
  };
}

function skillSuggestion(verdict: ResumeClaimVerdict, levelOverstated: boolean): string {
  switch (verdict) {
    case 'verified':
      return 'Backed by a passed assessment. Keep it — this claim is independently supported.';
    case 'project-backed':
      return 'Backed by a completed project. Link the repository or demo so a reviewer can confirm it at a glance.';
    case 'in-profile':
      return levelOverstated
        ? 'In your profile without independent evidence, and the stated level exceeds it. Take the assessment or finish a project before claiming this level.'
        : 'In your profile but not independently verified. Take the assessment or complete a project to strengthen it.';
    default:
      return 'No matching evidence in your SkillForge profile. Add and verify this skill, or reconsider the claim.';
  }
}

function projectSuggestion(title: string, hasLink: boolean, matchedProfileProject: boolean): string {
  if (!title) return 'Add a title so this project can be referenced.';
  if (matchedProfileProject) return 'Already in your SkillForge profile — keep the description consistent.';
  if (hasLink) return 'Not in your SkillForge profile yet. Add it as project evidence so it becomes verifiable.';
  return 'Add a repository or live link so this project can be checked.';
}
