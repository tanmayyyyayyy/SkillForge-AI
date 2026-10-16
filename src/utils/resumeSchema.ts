import {
  ResumeExtraction,
  ResumeExtractedSkill,
  ResumeExtractedProject,
  StudentExperience,
  StudentCertification,
  ProficiencyLevel
} from '../types/index.js';
import { toCanonicalSkillId, normalizeSkillName, isValidUrl } from './profileValidation.js';

const MAX_SKILLS = 60;
const MAX_PROJECTS = 15;
const MAX_EXPERIENCE = 15;
const MAX_CERTIFICATIONS = 20;
const MAX_TECHNOLOGIES = 40;

export function emptyExtraction(): ResumeExtraction {
  return {
    skills: [],
    projects: [],
    experience: [],
    certifications: [],
    technologies: []
  };
}

function clampProficiency(value: unknown): ProficiencyLevel {
  const num = Number(value);
  if (isNaN(num)) return 2;
  return Math.max(0, Math.min(5, Math.round(num))) as ProficiencyLevel;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? normalizeSkillName(value) : '';
}

function asYear(value: unknown): number | undefined {
  const num = Number(value);
  if (isNaN(num) || num < 1980 || num > 2045) return undefined;
  return Math.round(num);
}

/**
 * Validates and normalizes an untrusted resume-extraction object.
 * Used for BOTH deterministic extraction and AI (Gemini) output — AI-generated
 * JSON is never trusted without passing through this validator.
 */
export function validateResumeExtraction(raw: unknown): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  extraction: ResumeExtraction;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const extraction = emptyExtraction();

  if (!raw || typeof raw !== 'object') {
    return { isValid: false, errors: ['Extraction result was not a valid object.'], warnings, extraction };
  }

  const obj = raw as Record<string, unknown>;

  // --- Scalar education / identity fields ---
  const fullName = asString(obj.fullName);
  if (fullName) extraction.fullName = fullName;
  const degree = asString(obj.degree);
  if (degree) extraction.degree = degree;
  const branch = asString(obj.branch);
  if (branch) extraction.branch = branch;
  const institution = asString(obj.institution);
  if (institution) extraction.institution = institution;
  const graduationYear = asYear(obj.graduationYear);
  if (graduationYear) extraction.graduationYear = graduationYear;

  // --- Skills ---
  const rawSkills = Array.isArray(obj.skills) ? obj.skills : [];
  const skillMap = new Map<string, ResumeExtractedSkill>();
  for (const item of rawSkills) {
    if (!item || typeof item !== 'object') continue;
    const s = item as Record<string, unknown>;
    const rawId = asString(s.skillId);
    const name = asString(s.name) || rawId;
    if (!name) continue;
    // Prefer an explicit canonical skillId (e.g. from the deterministic lexicon)
    // so extracted skills line up with the career engine's skill IDs; otherwise
    // derive the ID from the display name (AI output provides a name only).
    const canonicalId = rawId ? toCanonicalSkillId(rawId) : toCanonicalSkillId(name);
    if (!canonicalId) continue;

    const skill: ResumeExtractedSkill = {
      skillId: canonicalId,
      name,
      category: asString(s.category) || 'General',
      proficiency: clampProficiency(s.proficiency),
      evidence: asString(s.evidence) || undefined
    };

    if (!skillMap.has(canonicalId)) {
      skillMap.set(canonicalId, skill);
    } else {
      const existing = skillMap.get(canonicalId)!;
      if (skill.proficiency > existing.proficiency) {
        skillMap.set(canonicalId, { ...existing, proficiency: skill.proficiency });
      }
    }
  }
  extraction.skills = Array.from(skillMap.values()).slice(0, MAX_SKILLS);

  // --- Projects ---
  const rawProjects = Array.isArray(obj.projects) ? obj.projects : [];
  const projects: ResumeExtractedProject[] = [];
  for (const item of rawProjects) {
    if (!item || typeof item !== 'object') continue;
    const p = item as Record<string, unknown>;
    const title = asString(p.title);
    if (!title) {
      warnings.push('A project without a title was skipped during validation.');
      continue;
    }
    let repoUrl: string | undefined;
    if (p.repoUrl !== undefined) {
      if (isValidUrl(String(p.repoUrl))) repoUrl = String(p.repoUrl).trim();
      else warnings.push(`Project "${title}" has an invalid repository URL and it was removed.`);
    }
    let liveUrl: string | undefined;
    if (p.liveUrl !== undefined) {
      if (isValidUrl(String(p.liveUrl))) liveUrl = String(p.liveUrl).trim();
      else warnings.push(`Project "${title}" has an invalid live URL and it was removed.`);
    }
    projects.push({
      title,
      description: asString(p.description),
      technologies: Array.isArray(p.technologies)
        ? (p.technologies as unknown[]).map(t => asString(t)).filter(Boolean).slice(0, 15)
        : [],
      repoUrl,
      liveUrl
    });
    if (projects.length >= MAX_PROJECTS) break;
  }
  extraction.projects = projects;

  // --- Experience ---
  const rawExperience = Array.isArray(obj.experience) ? obj.experience : [];
  const experience: StudentExperience[] = [];
  for (let i = 0; i < rawExperience.length && experience.length < MAX_EXPERIENCE; i++) {
    const item = rawExperience[i];
    if (!item || typeof item !== 'object') continue;
    const e = item as Record<string, unknown>;
    const organization = asString(e.organization);
    const role = asString(e.role);
    if (!organization || !role) {
      warnings.push('An experience entry missing an organization or role was skipped.');
      continue;
    }
    experience.push({
      id: asString(e.id) || `resume_exp_${Date.now()}_${i}`,
      organization,
      role,
      duration: asString(e.duration),
      responsibilities: typeof e.responsibilities === 'string' ? e.responsibilities.trim() : '',
      skillsDemonstrated: Array.isArray(e.skillsDemonstrated)
        ? (e.skillsDemonstrated as unknown[]).map(s => asString(s)).filter(Boolean).slice(0, 20)
        : []
    });
  }
  extraction.experience = experience;

  // --- Certifications ---
  const rawCerts = Array.isArray(obj.certifications) ? obj.certifications : [];
  const certifications: StudentCertification[] = [];
  for (let i = 0; i < rawCerts.length && certifications.length < MAX_CERTIFICATIONS; i++) {
    const item = rawCerts[i];
    if (!item || typeof item !== 'object') continue;
    const c = item as Record<string, unknown>;
    const name = asString(c.name);
    if (!name) continue;
    certifications.push({
      id: asString(c.id) || `resume_cert_${Date.now()}_${i}`,
      name,
      issuer: asString(c.issuer) || undefined,
      year: asYear(c.year)
    });
  }
  extraction.certifications = certifications;

  // --- Technologies ---
  const rawTech = Array.isArray(obj.technologies) ? obj.technologies : [];
  const seenTech = new Set<string>();
  const technologies: string[] = [];
  for (const t of rawTech) {
    const name = asString(t);
    const key = name.toLowerCase();
    if (!name || seenTech.has(key)) continue;
    seenTech.add(key);
    technologies.push(name);
    if (technologies.length >= MAX_TECHNOLOGIES) break;
  }
  extraction.technologies = technologies;

  const hasAnyContent =
    extraction.skills.length > 0 ||
    extraction.projects.length > 0 ||
    extraction.experience.length > 0 ||
    extraction.certifications.length > 0 ||
    !!extraction.fullName ||
    !!extraction.degree ||
    !!extraction.institution;

  if (!hasAnyContent) {
    errors.push('No usable profile information could be extracted from the document.');
  }

  return { isValid: errors.length === 0, errors, warnings, extraction };
}
