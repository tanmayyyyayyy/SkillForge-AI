import { StudentProfile, StudentSkill, StudentProject, StudentExperience, StudentCertification, ProficiencyLevel } from '../types/index.js';

export const COMMON_SKILL_ALIASES: Record<string, string> = {
  js: 'javascript',
  'react.js': 'react',
  reactjs: 'react',
  ts: 'typescript',
  py: 'python',
  golang: 'go',
  k8s: 'kubernetes',
  'node.js': 'nodejs',
  postgres: 'postgresql',
  psql: 'postgresql',
  'vue.js': 'vue',
  vuejs: 'vue',
  'angular.js': 'angular',
  angularjs: 'angular',
  'next.js': 'nextjs',
  nextjs: 'nextjs',
  'express.js': 'express',
  expressjs: 'express',
  cpp: 'c_plus_plus',
  'c++': 'c_plus_plus',
  'c#': 'c_sharp',
  csharp: 'c_sharp'
};

/**
 * Normalizes skill display name by trimming and collapsing extra whitespace.
 */
export function normalizeSkillName(rawName: string): string {
  if (!rawName || typeof rawName !== 'string') return '';
  return rawName.trim().replace(/\s+/g, ' ');
}

/**
 * Derives a canonical, normalized skill ID to prevent duplicates
 * caused by capitalization, whitespace, punctuation, or common aliases.
 */
export function toCanonicalSkillId(name: string): string {
  const normalized = normalizeSkillName(name).toLowerCase();
  if (!normalized) return '';

  if (COMMON_SKILL_ALIASES[normalized]) {
    return COMMON_SKILL_ALIASES[normalized];
  }

  const cleaned = normalized
    .replace(/\+/g, '_plus_')
    .replace(/#/g, '_sharp_')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return COMMON_SKILL_ALIASES[cleaned] || cleaned || 'custom_skill';
}

/**
 * Validates whether a given URL is a syntactically plausible web address.
 */
export function isValidUrl(url?: string): boolean {
  if (!url || typeof url !== 'string' || !url.trim()) return true;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface ProfileValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized: StudentProfile;
}

/**
 * Validates and normalizes complete student profile inputs.
 * Ensures data integrity, prevents duplicate skills, and guarantees
 * valid numeric bounds for hours and proficiency.
 */
export function validateProfile(
  rawInput: Partial<StudentProfile>,
  existingProfile?: StudentProfile
): ProfileValidationResult {
  const errors: string[] = [];

  // 1. Personal & Education
  const fullName = normalizeSkillName(rawInput.fullName || existingProfile?.fullName || '');
  if (!fullName) {
    errors.push('Full name is required.');
  } else if (fullName.length > 100) {
    errors.push('Full name must be 100 characters or fewer.');
  }

  const validEduLevels = ['High School', 'Undergraduate', 'Postgraduate', 'Bootcamp', 'Self-Taught'];
  const educationLevel = (rawInput.educationLevel || existingProfile?.educationLevel || 'Undergraduate') as any;
  if (!validEduLevels.includes(educationLevel)) {
    errors.push(`Invalid education level. Must be one of: ${validEduLevels.join(', ')}`);
  }

  const degree = normalizeSkillName(rawInput.degree || existingProfile?.degree || 'Computer Science');
  const branch = normalizeSkillName(rawInput.branch || existingProfile?.branch || 'General');
  const institution = normalizeSkillName(rawInput.institution || existingProfile?.institution || '');

  const gradYear = Number(rawInput.graduationYear || existingProfile?.graduationYear || (new Date().getFullYear() + 2));
  if (isNaN(gradYear) || gradYear < 1980 || gradYear > 2045) {
    errors.push('Graduation year must be a realistic year between 1980 and 2045.');
  }

  const currentAcademicYear = normalizeSkillName(rawInput.currentAcademicYear || existingProfile?.currentAcademicYear || 'Year 3');

  // 2. Experience level & preferences
  const validExpLevels = ['Beginner', 'Intermediate', 'Advanced'];
  const experienceLevel = (rawInput.experienceLevel || existingProfile?.experienceLevel || 'Beginner') as any;
  if (!validExpLevels.includes(experienceLevel)) {
    errors.push(`Invalid experience level. Must be one of: ${validExpLevels.join(', ')}`);
  }

  const rawWeeklyHours = rawInput.weeklyHours !== undefined ? rawInput.weeklyHours : existingProfile?.weeklyHours;
  const weeklyHours = typeof rawWeeklyHours === 'number' ? Math.max(1, Math.min(80, Math.round(rawWeeklyHours))) : 14;
  if (rawWeeklyHours !== undefined && (typeof rawWeeklyHours !== 'number' || rawWeeklyHours < 1 || rawWeeklyHours > 80)) {
    errors.push('Available weekly study hours must be between 1 and 80 hours.');
  }

  const validLearningStyles = ['Project-based', 'Theory & Practice', 'Visual & Video', 'Documentation & Code'];
  const preferredLearningStyle = (rawInput.preferredLearningStyle || existingProfile?.preferredLearningStyle || 'Project-based') as any;
  if (!validLearningStyles.includes(preferredLearningStyle)) {
    errors.push(`Invalid preferred learning style. Must be one of: ${validLearningStyles.join(', ')}`);
  }

  const targetRole = normalizeSkillName(rawInput.targetRole || existingProfile?.targetRole || 'aiml');
  const targetCompletionPeriod = normalizeSkillName(rawInput.targetCompletionPeriod || existingProfile?.targetCompletionPeriod || '6 Months');

  const targetCompanies = Array.isArray(rawInput.targetCompanies)
    ? rawInput.targetCompanies.map(c => normalizeSkillName(c)).filter(Boolean)
    : (existingProfile?.targetCompanies || []);

  const constraints = Array.isArray(rawInput.constraints)
    ? rawInput.constraints.map(c => normalizeSkillName(c)).filter(Boolean)
    : (existingProfile?.constraints || []);

  const preferredDomains = Array.isArray(rawInput.preferredDomains)
    ? rawInput.preferredDomains.map(d => normalizeSkillName(d)).filter(Boolean)
    : (existingProfile?.preferredDomains || []);

  const interests = Array.isArray(rawInput.interests)
    ? rawInput.interests.map(i => normalizeSkillName(i)).filter(Boolean)
    : (existingProfile?.interests || []);

  // 3. Current Skills (Normalization & Deduplication)
  const rawSkills = Array.isArray(rawInput.currentSkills) ? rawInput.currentSkills : (existingProfile?.currentSkills || []);
  const sanitizedSkillsMap = new Map<string, StudentSkill>();

  for (let i = 0; i < rawSkills.length; i++) {
    const s = rawSkills[i];
    if (!s || typeof s !== 'object') continue;

    const name = normalizeSkillName(s.name || s.skillId || '');
    if (!name) continue;

    const canonicalId = s.skillId ? toCanonicalSkillId(s.skillId) : toCanonicalSkillId(name);
    let proficiency = Number(s.proficiency);
    if (isNaN(proficiency) || proficiency < 0 || proficiency > 5) {
      errors.push(`Skill '${name}' has invalid proficiency level (${s.proficiency}). Must be an integer between 0 and 5.`);
      proficiency = Math.max(0, Math.min(5, Math.round(proficiency) || 1));
    }

    // Do not automatically mark self-reported skill as verified
    let status = s.status || 'self-reported';
    if (status === 'assessed' && !s.assessmentScore) {
      status = 'self-reported';
    }
    if (status === 'verified_project' && !s.verifiedEvidenceUrl) {
      status = 'self-reported';
    }

    const sanitizedSkill: StudentSkill = {
      skillId: canonicalId,
      name,
      category: normalizeSkillName(s.category || 'General') || 'General',
      proficiency: proficiency as ProficiencyLevel,
      status,
      source: s.source || (status === 'assessed' ? 'assessment' : status === 'verified_project' ? 'project' : 'self-reported'),
      lastAssessedAt: s.lastAssessedAt,
      updatedAt: s.updatedAt || new Date().toISOString(),
      assessmentScore: s.assessmentScore,
      verifiedEvidenceUrl: s.verifiedEvidenceUrl
    };

    // If duplicate canonical skill exists, keep the higher proficiency or verified status
    if (sanitizedSkillsMap.has(canonicalId)) {
      const existing = sanitizedSkillsMap.get(canonicalId)!;
      const isExistingVerified = existing.status === 'assessed' || existing.status === 'verified_project';
      const isNewVerified = sanitizedSkill.status === 'assessed' || sanitizedSkill.status === 'verified_project';

      sanitizedSkillsMap.set(canonicalId, {
        ...existing,
        name: existing.name.length >= sanitizedSkill.name.length ? existing.name : sanitizedSkill.name,
        proficiency: Math.max(existing.proficiency, sanitizedSkill.proficiency) as ProficiencyLevel,
        status: isNewVerified ? sanitizedSkill.status : existing.status,
        updatedAt: new Date().toISOString()
      });
    } else {
      sanitizedSkillsMap.set(canonicalId, sanitizedSkill);
    }
  }

  // 4. Projects Validation
  const rawProjects = Array.isArray(rawInput.existingProjects) ? rawInput.existingProjects : (existingProfile?.existingProjects || []);
  const sanitizedProjects: StudentProject[] = [];

  for (let i = 0; i < rawProjects.length; i++) {
    const p = rawProjects[i];
    if (!p || typeof p !== 'object') continue;

    const title = normalizeSkillName(p.title || '');
    if (!title) {
      errors.push(`Project at index ${i + 1} is missing a title.`);
      continue;
    }

    if (p.repoUrl && !isValidUrl(p.repoUrl)) {
      errors.push(`Project '${title}' has an invalid repository URL. Must be http:// or https://`);
    }

    if (p.liveUrl && !isValidUrl(p.liveUrl)) {
      errors.push(`Project '${title}' has an invalid live deployment URL. Must be http:// or https://`);
    }

    sanitizedProjects.push({
      id: p.id || `proj_${Date.now()}_${i}`,
      title,
      description: p.description ? p.description.trim() : '',
      technologies: Array.isArray(p.technologies) ? p.technologies.map(t => normalizeSkillName(t)).filter(Boolean) : [],
      roleAndContributions: p.roleAndContributions ? p.roleAndContributions.trim() : undefined,
      repoUrl: p.repoUrl ? p.repoUrl.trim() : undefined,
      liveUrl: p.liveUrl ? p.liveUrl.trim() : undefined,
      skillsDemonstrated: Array.isArray(p.skillsDemonstrated) ? p.skillsDemonstrated.map(s => toCanonicalSkillId(s)).filter(Boolean) : [],
      projectStatus: p.projectStatus || (p.completed ? 'completed' : 'in_progress'),
      completed: Boolean(p.completed || p.projectStatus === 'completed'),
      completedAt: p.completedAt || (p.completed ? new Date().toISOString() : undefined)
    });
  }

  // 5. Work Experience Validation
  const rawExp = Array.isArray(rawInput.experience) ? rawInput.experience : (existingProfile?.experience || []);
  const sanitizedExperience: StudentExperience[] = [];

  for (let i = 0; i < rawExp.length; i++) {
    const e = rawExp[i];
    if (!e || typeof e !== 'object') continue;

    const organization = normalizeSkillName(e.organization || '');
    const role = normalizeSkillName(e.role || '');

    if (!organization && !role) continue;
    if (!organization) {
      errors.push(`Experience entry ${i + 1} is missing an organization or company name.`);
      continue;
    }
    if (!role) {
      errors.push(`Experience entry at '${organization}' is missing a role title.`);
      continue;
    }

    sanitizedExperience.push({
      id: e.id || `exp_${Date.now()}_${i}`,
      organization,
      role,
      duration: e.duration ? e.duration.trim() : '',
      responsibilities: e.responsibilities ? e.responsibilities.trim() : '',
      skillsDemonstrated: Array.isArray(e.skillsDemonstrated) ? e.skillsDemonstrated.map(s => normalizeSkillName(s)).filter(Boolean) : []
    });
  }

  // 6. Certifications Validation
  const rawCerts = Array.isArray(rawInput.certifications) ? rawInput.certifications : (existingProfile?.certifications || []);
  const sanitizedCertifications: StudentCertification[] = [];

  for (let i = 0; i < rawCerts.length; i++) {
    const c = rawCerts[i];
    if (!c || typeof c !== 'object') continue;

    const name = normalizeSkillName(c.name || '');
    if (!name) continue;

    let year: number | undefined;
    if (c.year !== undefined && c.year !== null) {
      const parsedYear = Number(c.year);
      if (!isNaN(parsedYear) && parsedYear >= 1980 && parsedYear <= 2045) {
        year = Math.round(parsedYear);
      } else {
        errors.push(`Certification '${name}' has an invalid year (${c.year}). Must be between 1980 and 2045.`);
      }
    }

    sanitizedCertifications.push({
      id: c.id || `cert_${Date.now()}_${i}`,
      name,
      issuer: c.issuer ? normalizeSkillName(c.issuer) : undefined,
      year
    });
  }

  const sanitizedProfile: StudentProfile = {
    userId: rawInput.userId || existingProfile?.userId || 'unknown_user',
    fullName,
    educationLevel,
    degree,
    branch,
    institution,
    graduationYear: gradYear,
    currentAcademicYear,
    experienceLevel,
    weeklyHours,
    preferredLearningStyle,
    targetCompanies,
    targetRole,
    targetCompletionPeriod,
    constraints,
    preferredDomains,
    currentSkills: Array.from(sanitizedSkillsMap.values()),
    existingProjects: sanitizedProjects,
    experience: sanitizedExperience,
    certifications: sanitizedCertifications,
    interests,
    updatedAt: new Date().toISOString()
  };

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: sanitizedProfile
  };
}
