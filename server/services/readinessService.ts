import { db } from '../db/store.js';
import { CAREER_ROLES } from '../data/careers.js';
import { calculateCareerReadiness } from '../engine/readinessEngine.js';
import { calculateSkillGaps } from '../engine/gapEngine.js';
import { generateRoadmap } from '../engine/roadmapEngine.js';
import { buildNextSevenDaysPlan } from './nextSevenDaysService.js';
import {
  CareerReadinessScore,
  StudentSkill,
  ReadinessReportPayload,
  SkillProfileGroups,
  EvidenceProvenance
} from '../../src/types/index.js';

/**
 * Subphase 2F: single canonical entry point for career readiness.
 *
 * Both `GET /api/readiness` (dashboard) and `GET /api/readiness/report` call
 * this function, which guarantees:
 *   1. The same score + breakdown from the single engine (no parallel formulas).
 *   2. History is appending *before* the delta is read, so the reported delta
 *      reflects the last genuine transition and never a phantom change caused
 *      by the order in which pages happen to be opened.
 *   3. Repeated reads of an unchanged profile return an identical delta.
 *
 * History semantics: `readinessHistory[user]` is an append-only log of distinct
 * observed scores (consecutive duplicates are collapsed by the store). Because
 * the current score is persisted before the delta is derived, `previousScore`
 * is the second-to-last entry and `delta = current - previousScore`.
 */
export interface ReadinessSnapshot {
  readiness: CareerReadinessScore;
  history: number[];
}

export function computeReadinessForUser(userId: string): ReadinessSnapshot | null {
  const profile = db.getProfile(userId);
  if (!profile) return null;

  const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];
  const assessments = db.getAssessments(userId);
  const projects = db.getProjects(userId);

  // Canonical score for the *current* persisted state.
  const current = calculateCareerReadiness(profile, role, assessments, projects, 0);

  // Persist the observed score first (deduped), so the delta below compares
  // against the previous genuine transition rather than the value on screen.
  db.recordReadinessScore(userId, current.overallScore);

  const history = db.getReadinessHistory(userId);
  const previousScore = history.length >= 2 ? history[history.length - 2] : 0;
  const delta = previousScore > 0 ? current.overallScore - previousScore : 0;

  return {
    readiness: { ...current, previousScore, delta },
    history
  };
}

export type EvidenceBreakdown = EvidenceProvenance;

/**
 * Summarises how each tracked skill was established, so the readiness report can
 * explicitly distinguish self-reported skills from assessed / project-backed ones.
 */
export function summarizeEvidence(skills: StudentSkill[]): EvidenceBreakdown {
  const breakdown: EvidenceBreakdown = {
    unverified: 0,
    selfReported: 0,
    assessed: 0,
    projectVerified: 0
  };

  for (const skill of skills) {
    if (skill.status === 'assessed') breakdown.assessed += 1;
    else if (skill.status === 'verified_project') breakdown.projectVerified += 1;
    else if (skill.status === 'self-reported') breakdown.selfReported += 1;
    else breakdown.unverified += 1;
  }

  return breakdown;
}

/**
 * Groups tracked skills by how they were established. Used by the report (and
 * the PDF) to list self-reported, assessed, project-backed, and unverified
 * skills separately, so self-reported skills are never implied to be verified.
 */
export function groupSkillsByEvidence(skills: StudentSkill[]): SkillProfileGroups {
  const groups: SkillProfileGroups = {
    selfReported: [],
    assessed: [],
    projectBacked: [],
    unverified: []
  };

  for (const skill of skills) {
    if (skill.status === 'assessed') groups.assessed.push(skill.name);
    else if (skill.status === 'verified_project') groups.projectBacked.push(skill.name);
    else if (skill.status === 'self-reported') groups.selfReported.push(skill.name);
    else groups.unverified.push(skill.name);
  }

  return groups;
}

/**
 * Builds the complete, canonical readiness report payload from persisted state.
 *
 * This is the single source of truth for both `GET /api/readiness/report` and
 * the downloadable PDF (`GET /api/readiness/report/pdf`). It invokes only the
 * existing engines (readiness, gap, roadmap) — it never re-derives a score.
 */
export function buildReadinessReport(userId: string): ReadinessReportPayload | null {
  const profile = db.getProfile(userId);
  if (!profile) return null;

  const snapshot = computeReadinessForUser(userId);
  if (!snapshot) return null;

  const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];
  const projects = db.getProjects(userId);
  const gaps = calculateSkillGaps(profile, role);
  const existingTasks = db.getRoadmapTasks(userId);
  const roadmap = generateRoadmap(profile, role, gaps, existingTasks);

  const unmetGaps = gaps.items.filter(i => i.gap > 0);

  return {
    student: {
      fullName: profile.fullName,
      degree: profile.degree,
      educationLevel: profile.educationLevel,
      graduationYear: profile.graduationYear,
      weeklyHours: profile.weeklyHours,
      learningStyle: profile.preferredLearningStyle,
      targetCompanies: profile.targetCompanies
    },
    targetCareer: {
      id: role.id,
      title: role.title,
      category: role.category,
      salaryRange: role.averageStartingSalary,
      marketDemand: role.marketDemand
    },
    readiness: snapshot.readiness,
    evidenceBreakdown: summarizeEvidence(profile.currentSkills),
    skillProfile: groupSkillsByEvidence(profile.currentSkills),
    gapSummary: {
      totalSkills: gaps.totalSkillsCount,
      masteredSkills: gaps.masteredSkillsCount,
      criticalGaps: gaps.criticalGapsCount,
      estimatedHours: gaps.totalEstimatedHours,
      coveragePercentage: gaps.overallCoveragePercentage,
      topGaps: unmetGaps.slice(0, 5)
    },
    allGaps: unmetGaps,
    roadmapProgress: {
      totalTasks: roadmap.totalTasks,
      completedTasks: roadmap.completedTasks,
      inProgressTasks: roadmap.inProgressTasks,
      totalHours: roadmap.totalHours,
      completedHours: roadmap.completedHours,
      progressPercentage: roadmap.overallProgressPercentage,
      stages: roadmap.stages
    },
    verifiedAssessments: db.getAssessments(userId).filter(a => a.passed),
    // Self-reported portfolio entries: `hasEvidence` distinguishes a project
    // with a submitted link from one that is merely in progress.
    portfolioProjects: projects
      .filter(p => p.userStatus === 'completed' || p.userStatus === 'in_progress')
      .map(p => ({
        id: p.id,
        title: p.title,
        userStatus: p.userStatus,
        hasEvidence: !!p.submittedEvidence
      })),
    nextSevenDays: buildNextSevenDaysPlan(profile.weeklyHours, unmetGaps, projects),
    generatedAt: new Date().toISOString()
  };
}
