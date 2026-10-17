import {
  JobDescriptionExtraction,
  JobDescriptionSkillMention,
  JobRequirementKind,
  JobSkillConfidence
} from '../types/index.js';
import { toCanonicalSkillId } from './profileValidation.js';

const MAX_SKILLS = 60;
const MAX_BULLETS = 10;
const MAX_SECTIONS = 6;
const MAX_EVIDENCE = 200;
const MAX_TITLE = 120;
const MAX_COMPANY = 80;

const KINDS: JobRequirementKind[] = ['required', 'preferred', 'tool', 'responsibility'];
const CONFIDENCES: JobSkillConfidence[] = ['high', 'medium', 'low'];

/** Lower rank wins when the same skill is described more than once. */
const KIND_RANK: Record<JobRequirementKind, number> = {
  required: 0,
  tool: 1,
  responsibility: 2,
  preferred: 3
};

const CONFIDENCE_RANK: Record<JobSkillConfidence, number> = { high: 3, medium: 2, low: 1 };

export function emptyJobDescriptionExtraction(): JobDescriptionExtraction {
  return {
    skills: [],
    qualifications: [],
    responsibilities: [],
    warnings: []
  };
}

function asKind(value: unknown): JobRequirementKind {
  return KINDS.includes(value as JobRequirementKind) ? (value as JobRequirementKind) : 'required';
}

function asConfidence(value: unknown): JobSkillConfidence {
  return CONFIDENCES.includes(value as JobSkillConfidence) ? (value as JobSkillConfidence) : 'medium';
}

function asCleanString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1)}…` : cleaned;
}

function asBullets(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const text = asCleanString(item, 220);
    if (!text || out.includes(text)) continue;
    out.push(text);
    if (out.length >= maxItems) break;
  }
  return out;
}

function asSections(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const text = asCleanString(item, 80);
    if (!text || out.includes(text)) continue;
    out.push(text);
    if (out.length >= MAX_SECTIONS) break;
  }
  return out;
}

/**
 * Validates and normalizes an untrusted job-description extraction.
 * Used for BOTH deterministic extraction and AI (Gemini) output — AI-generated
 * JSON is never trusted without passing through this validator.
 *
 * Skill IDs are derived here from the display name; the server-side service
 * then re-resolves them through the shared career lexicon so they line up with
 * the profile and gap-engine IDs.
 */
export function validateJobDescriptionExtraction(raw: unknown): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  extraction: JobDescriptionExtraction;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const extraction = emptyJobDescriptionExtraction();

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      isValid: false,
      errors: ['Job description extraction was not a valid object.'],
      warnings,
      extraction
    };
  }

  const obj = raw as Record<string, unknown>;

  const jobTitle = asCleanString(obj.jobTitle, MAX_TITLE);
  if (jobTitle) extraction.jobTitle = jobTitle;
  const companyName = asCleanString(obj.companyName, MAX_COMPANY);
  if (companyName) extraction.companyName = companyName;

  const rawSkills = obj.skills;
  if (!Array.isArray(rawSkills)) {
    errors.push('Field "skills" was missing or not an array.');
    return { isValid: false, errors, warnings, extraction };
  }

  const merged = new Map<string, JobDescriptionSkillMention>();
  for (const item of rawSkills) {
    if (!item || typeof item !== 'object') {
      warnings.push('A malformed skill entry was ignored.');
      continue;
    }
    const s = item as Record<string, unknown>;
    const name = asCleanString(s.name, 80);
    if (!name) {
      warnings.push('A skill entry without a name was ignored.');
      continue;
    }

    // Prefer an explicit canonical skillId (already resolved by the
    // deterministic lexicon) so validated IDs are byte-identical to the ones
    // the gap engine and profile use; otherwise derive it from the name.
    const explicitId = asCleanString(s.skillId, 80);
    const skillId = explicitId ? toCanonicalSkillId(explicitId) : toCanonicalSkillId(name);
    if (!skillId || skillId === 'custom_skill') {
      warnings.push(`Could not derive a usable skill id for "${name}"; it was ignored.`);
      continue;
    }

    const kind = asKind(s.kind);
    const confidence = asConfidence(s.confidence);
    const inferred = typeof s.inferred === 'boolean' ? s.inferred : confidence === 'low';

    const mention: JobDescriptionSkillMention = {
      skillId,
      name,
      category: asCleanString(s.category, 60) || 'General',
      kind,
      sections: asSections(s.sections),
      evidence: asCleanString(s.evidence, MAX_EVIDENCE),
      inferred,
      confidence
    };

    const existing = merged.get(skillId);
    if (!existing) {
      merged.set(skillId, mention);
    } else {
      if (KIND_RANK[mention.kind] < KIND_RANK[existing.kind]) existing.kind = mention.kind;
      if (CONFIDENCE_RANK[mention.confidence] > CONFIDENCE_RANK[existing.confidence]) {
        existing.confidence = mention.confidence;
        existing.inferred = mention.inferred;
      }
      existing.sections = Array.from(new Set([...existing.sections, ...mention.sections])).slice(
        0,
        MAX_SECTIONS
      );
      if (!existing.evidence) existing.evidence = mention.evidence;
    }

    if (merged.size >= MAX_SKILLS) break;
  }

  extraction.skills = Array.from(merged.values());
  extraction.qualifications = asBullets(obj.qualifications, MAX_BULLETS);
  extraction.responsibilities = asBullets(obj.responsibilities, MAX_BULLETS);

  if (rawSkills.length > extraction.skills.length) {
    warnings.push(
      `${rawSkills.length - extraction.skills.length} skill entr(y/ies) were merged or dropped during validation.`
    );
  }

  extraction.warnings = [];
  return { isValid: errors.length === 0, errors, warnings, extraction };
}
