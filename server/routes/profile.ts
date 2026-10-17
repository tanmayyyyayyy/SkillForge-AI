import { Router, Response } from 'express';
import { db } from '../db/store.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { StudentProfile, ProficiencyLevel, SkillVerificationStatus, SkillEvidenceSource } from '../../src/types/index.js';
import { validateProfile, toCanonicalSkillId, normalizeSkillName } from '../../src/utils/profileValidation.js';
import { CAREER_ROLES } from '../data/careers.js';
import { calculateSkillGaps } from '../engine/gapEngine.js';
import { generateRoadmap } from '../engine/roadmapEngine.js';
import { calculateCareerReadiness } from '../engine/readinessEngine.js';

export const profileRouter = Router();

const VALID_SKILL_STATUSES: readonly SkillVerificationStatus[] = ['unverified', 'self-reported', 'assessed', 'verified_project'];
const VALID_EVIDENCE_SOURCES: readonly SkillEvidenceSource[] = ['self-reported', 'assessment', 'project', 'course', 'work_experience', 'resume'];

function isSkillStatus(value: unknown): value is SkillVerificationStatus {
  return typeof value === 'string' && (VALID_SKILL_STATUSES as readonly string[]).includes(value);
}

function isEvidenceSource(value: unknown): value is SkillEvidenceSource {
  return typeof value === 'string' && (VALID_EVIDENCE_SOURCES as readonly string[]).includes(value);
}

// Get profile of authenticated user
profileRouter.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const profile = db.getProfile(req.userId!);
  if (!profile) {
    res.status(404).json({ error: 'Profile not found for this user.' });
    return;
  }
  res.json({ profile });
});

// Update or complete onboarding profile with strict validation & dependent recalculation
profileRouter.put('/', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const existing = db.getProfile(req.userId!);
    const rawUpdates = req.body as Partial<StudentProfile>;

    // Reject malformed / unknown career role IDs at the server boundary
    if (rawUpdates.targetRole !== undefined) {
      const isKnownRole = CAREER_ROLES.some(r => r.id === rawUpdates.targetRole);
      if (!isKnownRole) {
        res.status(400).json({
          error: `Unknown target role '${rawUpdates.targetRole}'.`,
          details: ['Target role must reference a supported career track.']
        });
        return;
      }
    }

    const validation = validateProfile(
      {
        ...rawUpdates,
        userId: req.userId!
      },
      existing
    );

    if (!validation.isValid) {
      res.status(400).json({
        error: 'Profile validation failed.',
        details: validation.errors
      });
      return;
    }

    // Persist the profile, regenerated roadmap, and readiness observation as a
    // single atomic unit so a mid-way storage failure cannot leave the profile
    // saved but the dependent assets stale.
    const { savedProfile, readiness } = db.transaction(() => {
      const profile = db.saveProfile(validation.sanitized);

      // Recalculate dependent intelligence assets (gaps, roadmap, readiness)
      const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];
      const gaps = calculateSkillGaps(profile, role);
      const existingTasks = db.getRoadmapTasks(req.userId!);
      const updatedRoadmap = generateRoadmap(profile, role, gaps, existingTasks);
      db.saveRoadmapTasks(req.userId!, updatedRoadmap.stages.flatMap(s => s.tasks));

      const assessments = db.getAssessments(req.userId!);
      const projects = db.getProjects(req.userId!);
      const history = db.getReadinessHistory(req.userId!);
      const previousScore = history.length > 0 ? history[history.length - 1] : 0;
      const snapshot = calculateCareerReadiness(profile, role, assessments, projects, previousScore);
      db.recordReadinessScore(req.userId!, snapshot.overallScore);

      return { savedProfile: profile, readiness: snapshot };
    });

    res.json({
      profile: savedProfile,
      readiness: readiness.overallScore,
      message: 'Profile saved and verified successfully.'
    });
  } catch (err) {
    console.error('Error saving profile:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// Update single skill proficiency in profile
profileRouter.patch('/skills', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { skillId, name, category, proficiency, status, source } = req.body;
    const cleanName = normalizeSkillName(name || skillId || '');
    if (!cleanName) {
      res.status(400).json({ error: 'Skill name or skillId is required.' });
      return;
    }

    const canonicalId = skillId ? toCanonicalSkillId(skillId) : toCanonicalSkillId(cleanName);
    const profNum = Number(proficiency);
    if (!Number.isInteger(profNum) || profNum < 0 || profNum > 5) {
      res.status(400).json({ error: 'Proficiency must be an integer between 0 and 5.' });
      return;
    }
    const proficiencyLevel = profNum as ProficiencyLevel;

    const profile = db.getProfile(req.userId!);
    if (!profile) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }

    const skills = [...profile.currentSkills];
    const index = skills.findIndex(s => toCanonicalSkillId(s.skillId) === canonicalId);

    // Self-reported skills must never be automatically flagged as verified
    let safeStatus: SkillVerificationStatus = isSkillStatus(status) ? status : 'self-reported';
    if (safeStatus !== 'self-reported' && safeStatus !== 'unverified') {
      // only allow verified if previously verified
      if (index !== -1 && (skills[index].status === 'assessed' || skills[index].status === 'verified_project')) {
        safeStatus = skills[index].status;
      } else {
        safeStatus = 'self-reported';
      }
    }

    const safeSource: SkillEvidenceSource = isEvidenceSource(source)
      ? source
      : (skills[index]?.source ?? 'self-reported');

    if (index !== -1) {
      skills[index] = {
        ...skills[index],
        name: cleanName || skills[index].name,
        category: normalizeSkillName(category) || skills[index].category,
        proficiency: proficiencyLevel,
        status: safeStatus,
        source: safeSource,
        updatedAt: new Date().toISOString()
      };
    } else {
      skills.push({
        skillId: canonicalId,
        name: cleanName,
        category: normalizeSkillName(category) || 'General',
        proficiency: proficiencyLevel,
        status: safeStatus,
        source: safeSource,
        updatedAt: new Date().toISOString()
      });
    }

    // Work on a copy so a failed transaction rolls back to the pristine profile
    // rather than an object already mutated in place.
    const nextProfile: StudentProfile = {
      ...profile,
      currentSkills: skills,
      updatedAt: new Date().toISOString()
    };

    // Persist the skill update and its readiness observation atomically.
    const readiness = db.transaction(() => {
      db.saveProfile(nextProfile);

      // Recalculate dependent readiness
      const role = CAREER_ROLES.find(r => r.id === nextProfile.targetRole) || CAREER_ROLES[0];
      const assessments = db.getAssessments(req.userId!);
      const projects = db.getProjects(req.userId!);
      const history = db.getReadinessHistory(req.userId!);
      const previousScore = history.length > 0 ? history[history.length - 1] : 0;
      const snapshot = calculateCareerReadiness(nextProfile, role, assessments, projects, previousScore);
      db.recordReadinessScore(req.userId!, snapshot.overallScore);
      return snapshot;
    });

    res.json({
      profile: nextProfile,
      readiness: readiness.overallScore,
      message: 'Skill updated successfully.'
    });
  } catch (err) {
    console.error('Error updating skill:', err);
    res.status(500).json({ error: 'Failed to update skill.' });
  }
});
