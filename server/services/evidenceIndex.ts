import { db } from '../db/store.js';
import type { StudentSkill, CareerTwinEvidenceRef, CareerTwinSkill } from '../../src/types/index.js';

/**
 * Subphase 3C/3D — shared skill-evidence index.
 *
 * Both the Career Twin (3A), the Resume Truth Engine (3C) and the Evidence Graph
 * (3D) need to answer the same question: "what independently verifiable artefacts
 * back this skill?". This module is the single place that reads assessments and
 * projects and attributes them to skills, so the three features can never drift.
 */

export function normalizeSkillKey(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Collects the assessments and projects that back each skill, keyed by both
 * skill id and (case-insensitive) name so resume-imported projects that list
 * display names are still attributed.
 */
export function buildEvidenceIndex(userId: string): Map<string, CareerTwinEvidenceRef[]> {
  const index = new Map<string, CareerTwinEvidenceRef[]>();

  const add = (keys: string[], ref: CareerTwinEvidenceRef): void => {
    for (const key of keys) {
      if (!key) continue;
      const bucket = index.get(key);
      if (bucket) bucket.push(ref);
      else index.set(key, [ref]);
    }
  };

  for (const result of db.getAssessments(userId)) {
    add([normalizeSkillKey(result.skillId), normalizeSkillKey(result.skillName)], {
      kind: 'assessment',
      id: result.skillId,
      label: `${result.skillName} assessment`,
      detail: result.passed
        ? `Passed — ${result.scorePercentage}%`
        : `Not passed — ${result.scorePercentage}%`,
      url: '/assessments'
    });
  }

  for (const project of db.getProjects(userId)) {
    if (project.userStatus === 'recommended') continue;
    const detail =
      project.userStatus === 'completed'
        ? 'Completed project'
        : project.userStatus === 'in_progress'
          ? 'Project in progress'
          : 'Planned project';
    for (const skill of project.skillsDemonstrated) {
      add([normalizeSkillKey(skill)], {
        kind: 'project',
        id: project.id,
        label: project.title,
        detail,
        url: project.submittedEvidence?.repoUrl
      });
    }
  }

  for (const proof of db.getProofOfSkillEvidence(userId)) {
    add([normalizeSkillKey(proof.skillId), normalizeSkillKey(proof.skillName)], {
      kind: 'assessment',
      id: proof.challengeId,
      label: `Proof of Skill: ${proof.challengeTitle}`,
      detail: `Verified by automated tests — ${proof.scorePercentage}% (${proof.passedTests}/${proof.totalTests} passed)`,
      url: '/proof-of-skill'
    });
  }

  for (const forged of db.getForgedProjects(userId)) {
    if (forged.status === 'planned') continue;
    const completedMilestones = forged.milestones.filter(m => m.completed).length;
    const detail = forged.status === 'completed'
      ? 'Completed engineering project'
      : `In progress (${completedMilestones}/${forged.milestones.length} milestones complete)`;
    for (const skill of forged.targetedGapSkills) {
      add([normalizeSkillKey(skill)], {
        kind: 'project',
        id: forged.id,
        label: `Forged Project: ${forged.title}`,
        detail,
        url: '/project-forge'
      });
    }
  }

  return index;
}

export function collectSkillEvidence(
  index: Map<string, CareerTwinEvidenceRef[]>,
  skillId: string,
  skillName: string
): CareerTwinEvidenceRef[] {
  const byId = index.get(normalizeSkillKey(skillId)) ?? [];
  const byName = index.get(normalizeSkillKey(skillName)) ?? [];
  const seen = new Set<string>();
  const merged: CareerTwinEvidenceRef[] = [];
  for (const ref of [...byId, ...byName]) {
    const key = `${ref.kind}:${ref.id}:${ref.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(ref);
  }
  return merged;
}

export function deriveEvidence(
  skill: Pick<StudentSkill, 'status' | 'proficiency'>,
  evidence: CareerTwinEvidenceRef[]
): { kind: CareerTwinSkill['evidenceKind']; confidence: CareerTwinSkill['confidence'] } {
  const hasAssessment = evidence.some(e => e.kind === 'assessment');
  const hasProject = evidence.some(e => e.kind === 'project');

  if (skill.status === 'verified_project' || (hasProject && skill.status !== 'assessed')) {
    return { kind: 'project', confidence: 'high' };
  }
  if (skill.status === 'assessed' || hasAssessment) {
    return { kind: 'assessment', confidence: 'high' };
  }
  if (skill.proficiency > 0) {
    return { kind: 'self-reported', confidence: 'low' };
  }
  return { kind: 'none', confidence: 'low' };
}
