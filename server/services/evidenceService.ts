import { ProjectRecommendation, StudentProfile, StudentSkill } from '../../src/types/index.js';

/**
 * Subphase 2F: honest project-evidence semantics.
 *
 * A submitted repository / demo URL is *self-reported evidence* — it is recorded
 * so the student can reference it and so the readiness engine can credit practical
 * portfolio work, but it is never treated as independent proof of proficiency.
 *
 * Rules encoded here (kept pure for direct testing):
 *   - Submitting evidence never force-completes milestones.
 *   - A project becomes `completed` only when every milestone is complete (or it
 *     was already completed); evidence alone does not complete the chain.
 *   - Demonstrated skills are upgraded to `verified_project` only once the project
 *     is completed *and* evidence exists.
 *   - Submitting evidence never inflates a skill's proficiency level.
 *   - An attempt to submit evidence on an already-completed project is a no-op for
 *     completion state (so status can never be downgraded).
 *   - Only the first evidence submission should be logged as a credited activity,
 *     preventing duplicate credit on updates.
 */

export interface EvidenceSubmission {
  repoUrl?: string;
  demoUrl?: string;
  notes?: string;
}

export interface EvidenceApplication {
  project: ProjectRecommendation;
  /** Profile skills after applying the rules (only meaningful when `profile` was supplied). */
  skills: StudentSkill[];
  /** True when every milestone was already complete at submission time. */
  milestoneChainComplete: boolean;
  /** True when this submission is the first evidence recorded for the project. */
  isFirstEvidence: boolean;
  /** True when the project should now count as completed with evidence. */
  awarded: boolean;
}

export function applyEvidenceSubmission(
  project: ProjectRecommendation,
  profile: StudentProfile | undefined,
  evidence: EvidenceSubmission,
  submittedAt: string
): EvidenceApplication {
  const wasCompleted = project.userStatus === 'completed';
  const hadEvidence = !!project.submittedEvidence;
  const milestones = project.milestones ?? [];
  const milestoneChainComplete = milestones.length > 0 && milestones.every(m => m.completed);

  const awarded = wasCompleted || milestoneChainComplete;

  const updatedProject: ProjectRecommendation = {
    ...project,
    isSaved: true,
    userStatus: awarded ? 'completed' : 'in_progress',
    submittedEvidence: {
      repoUrl: evidence.repoUrl,
      demoUrl: evidence.demoUrl,
      notes: evidence.notes,
      submittedAt
    }
  };

  const skills = profile ? profile.currentSkills : [];
  const upgradedSkills = profile && awarded
    ? skills.map(skill =>
        project.skillsDemonstrated.includes(skill.skillId)
          ? {
              ...skill,
              status: 'verified_project' as const,
              verifiedEvidenceUrl: evidence.repoUrl || evidence.demoUrl
            }
          : skill
      )
    : skills;

  return {
    project: updatedProject,
    skills: upgradedSkills,
    milestoneChainComplete,
    isFirstEvidence: !hadEvidence,
    awarded
  };
}
