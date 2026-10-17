import type {
  JobDescriptionExtraction,
  JobDescriptionSkillMention,
  JobRequirementKind,
  JobSkillConfidence
} from '../../src/types/index.js';
import { normalizeSkillName, toCanonicalSkillId } from '../../src/utils/profileValidation.js';
import { buildSkillLexicon, hasSkill, LexiconEntry } from './resumeExtractor.js';

/**
 * Deterministic (rule-based) job description extraction.
 *
 * The pasted posting is split into labelled sections (Requirements,
 * Responsibilities, Nice-to-have, Tech stack, …), every skill in the shared
 * career lexicon is located, and each mention is classified into a requirement
 * kind with an explicit confidence/inferred label so the UI can show exactly
 * how a skill was found.
 *
 * This is NOT equivalent to AI analysis; it is a transparent, reproducible
 * heuristic used as a fallback when Gemini is unavailable and as the baseline
 * whenever deterministic output is preferred.
 */

type JdSectionKey =
  | 'preamble'
  | 'skills'
  | 'requirements'
  | 'preferred'
  | 'responsibility'
  | 'tech'
  | 'about'
  | 'other';

interface JdSection {
  key: JdSectionKey;
  label: string;
  lines: string[];
}

interface JdOccurrence {
  key: JdSectionKey;
  label: string;
  line: string;
  synonymLength: number;
}

/** Headings are matched in this order so the more specific label wins. */
const HEADING_PATTERNS: Array<{ key: JdSectionKey; re: RegExp }> = [
  {
    key: 'preferred',
    re: /nice[\s-]?to[\s-]?have|preferred|desirable|bonus[\s-]?to[\s-]?have|good[\s-]?to[\s-]?have|\bplus\b|an advantage/i
  },
  {
    key: 'responsibility',
    re: /responsibilit|what you['\u2019]?ll do|day[\s-]?to[\s-]?day|about the role|role (?:overview|summary|description)|key (?:duties|responsibilities)|your (?:job|impact|mission|day)/i
  },
  { key: 'tech', re: /tech[\s-]?stack|technolog|tools?\b|our stack|software we use/i },
  {
    key: 'requirements',
    re: /requirement|must[\s-]?have|required|qualification|eligibility|what you (?:need|bring)|who you are|candidate (?:should|must)|essential|expectations|skills we/i
  },
  { key: 'skills', re: /^(?:technical\s+|core\s+)?skills(?:\s+(?:&|and|proficiency|highlights|summary))?$/i },
  { key: 'about', re: /about (?:us|the company)|who we are|company (?:overview|culture)|benefits|perks|why (?:join|us)/i }
];

/** Sections that explicitly enumerate requirements (drives confidence labels). */
const EXPLICIT_KEYS: Set<JdSectionKey> = new Set(['skills', 'requirements', 'preferred', 'tech']);

/** Lower rank wins when the same skill is found in more than one section. */
const KIND_RANK: Record<JobRequirementKind, number> = {
  required: 0,
  tool: 1,
  responsibility: 2,
  preferred: 3
};

const CONFIDENCE_RANK: Record<JobSkillConfidence, number> = { high: 3, medium: 2, low: 1 };

const ROLE_TITLE_RE =
  /\b(engineer|developer|analyst|scientist|manager|designer|intern|architect|consultant|specialist|administrator|devops|sre|researcher|technician|trainer|associate|lead|officer|consultant)\b/i;

const BULLET_PREFIX = /^[•\-*\u2022\u00b7]+\s*/;

const CORPORATE_SUFFIX_RE =
  /\b(?:pvt\.?\s*ltd\.?|private\s+limited|inc\.?|ltd\.?|llc|technologies|labs|systems|softwares|consulting|corporation|corp\.?|group)\b/i;

const MAX_EVIDENCE_LENGTH = 160;
const MAX_SKILLS = 60;
const MAX_BULLETS = 10;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Compiled-once word-boundary matcher (the shared `hasSkill` recompiles per call). */
const synonymCache = new Map<string, RegExp | null>();

function containsSkill(haystack: string, synonym: string): boolean {
  let re = synonymCache.get(synonym);
  if (re === undefined) {
    try {
      re = new RegExp(`(?<![a-z0-9])${escapeRegExp(synonym)}(?![a-z0-9])`, 'i');
    } catch {
      re = null;
    }
    synonymCache.set(synonym, re);
  }
  if (re) return re.test(haystack);
  return haystack.toLowerCase().includes(synonym.toLowerCase());
}

/**
 * Decides whether a trimmed line is a section heading rather than content.
 * A line is only a heading when it is short and either colon-terminated,
 * very short, or title-cased — which keeps sentences such as
 * "Python and SQL experience required" out of the heading bucket.
 */
function headingKey(rawLine: string): JdSectionKey | null {
  const raw = rawLine.trim();
  if (!raw || raw.length > 60) return null;
  if (/[.!?\u3002]$/.test(raw)) return null;
  if (BULLET_PREFIX.test(raw)) return null;
  if (/^\d/.test(raw)) return null;

  const words = raw.split(/\s+/);
  if (words.length > 9) return null;

  const endsWithColon = /[:\uFF1A]\s*$/.test(raw);
  const shortEnough = words.length <= 4;
  const titleCaseWords = words.filter(w => /^[A-Z0-9&/+-]/.test(w)).length;
  const titleCase = titleCaseWords >= Math.max(2, Math.ceil(words.length * 0.6));
  if (!endsWithColon && !shortEnough && !titleCase) return null;

  const cleaned = raw.replace(/[:\uFF1A\u2013\u2014\s]+$/, '');
  if (!cleaned) return null;

  for (const pattern of HEADING_PATTERNS) {
    if (pattern.re.test(cleaned)) return pattern.key;
  }
  return null;
}

function splitSections(text: string): JdSection[] {
  const sections: JdSection[] = [{ key: 'preamble', label: 'Role summary', lines: [] }];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const key = headingKey(line);
    if (key) {
      const label = line.replace(/[:\uFF1A\u2013\u2014]+$/, '').trim();
      sections.push({ key, label, lines: [] });
      continue;
    }
    sections[sections.length - 1].lines.push(line);
  }

  return sections;
}

function kindForKey(key: JdSectionKey): JobRequirementKind {
  if (key === 'preferred') return 'preferred';
  if (key === 'responsibility') return 'responsibility';
  if (key === 'tech') return 'tool';
  return 'required';
}

function cleanEvidence(line: string): string {
  const cleaned = line.replace(BULLET_PREFIX, '').replace(/\s+/g, ' ').trim();
  return cleaned.length > MAX_EVIDENCE_LENGTH ? `${cleaned.slice(0, MAX_EVIDENCE_LENGTH - 1)}\u2026` : cleaned;
}

function collectMentions(sections: JdSection[]): JobDescriptionSkillMention[] {
  const lexicon = buildSkillLexicon();
  const mentions: JobDescriptionSkillMention[] = [];

  for (const entry of lexicon) {
    const occurrences: JdOccurrence[] = [];

    for (const section of sections) {
      if (section.lines.length === 0) continue;
      const explicit = EXPLICIT_KEYS.has(section.key) || section.key === 'responsibility';
      const minSynonymLength = explicit ? 2 : 3;
      const sectionText = section.lines.join('\n');

      for (const synonym of entry.synonyms) {
        if (synonym.length < minSynonymLength) continue;
        if (!containsSkill(sectionText, synonym)) continue;
        const hitLine = section.lines.find(line => containsSkill(line, synonym));
        occurrences.push({
          key: section.key,
          label: section.label,
          line: hitLine || '',
          synonymLength: synonym.length
        });
        break;
      }
    }

    if (occurrences.length === 0) continue;

    let kind = kindForKey(occurrences[0].key);
    let kindRank = KIND_RANK[kind];
    for (const occurrence of occurrences) {
      const candidateKind = kindForKey(occurrence.key);
      if (KIND_RANK[candidateKind] < kindRank) {
        kind = candidateKind;
        kindRank = KIND_RANK[candidateKind];
      }
    }

    const kindOccurrence =
      occurrences.find(o => KIND_RANK[kindForKey(o.key)] === kindRank) || occurrences[0];

    const explicitHit = occurrences.some(o => EXPLICIT_KEYS.has(o.key));
    const responsibilityHit = occurrences.some(o => o.key === 'responsibility');
    const longestSynonym = Math.max(...occurrences.map(o => o.synonymLength));

    let confidence: JobSkillConfidence;
    let inferred: boolean;
    if (explicitHit) {
      confidence = 'high';
      inferred = false;
    } else if (responsibilityHit) {
      confidence = 'medium';
      inferred = false;
    } else {
      confidence = longestSynonym >= 5 ? 'medium' : 'low';
      inferred = true;
    }

    mentions.push({
      skillId: entry.id,
      name: entry.name,
      category: entry.category,
      kind,
      sections: Array.from(new Set(occurrences.map(o => o.label))).slice(0, 6),
      evidence: cleanEvidence(kindOccurrence.line),
      inferred,
      confidence
    });

    if (mentions.length >= MAX_SKILLS) break;
  }

  return mentions;
}

function extractBullets(section: JdSection[], keys: JdSectionKey[]): string[] {
  const bullets: string[] = [];
  for (const sec of section) {
    if (!keys.includes(sec.key)) continue;
    for (const line of sec.lines) {
      const cleaned = line.replace(BULLET_PREFIX, '').replace(/\s+/g, ' ').trim();
      if (cleaned.length < 4 || cleaned.length > 220) continue;
      if (bullets.includes(cleaned)) continue;
      bullets.push(cleaned);
      if (bullets.length >= MAX_BULLETS) return bullets;
    }
  }
  return bullets;
}

function extractJobTitle(preambleLines: string[]): string | undefined {
  for (const raw of preambleLines.slice(0, 6)) {
    const cleaned = raw.replace(BULLET_PREFIX, '').replace(/\s+/g, ' ').trim();
    if (!cleaned || cleaned.length > 90) continue;
    if (cleaned.split(/\s+/).length > 10) continue;
    if (!ROLE_TITLE_RE.test(cleaned)) continue;
    return normalizeSkillName(cleaned.replace(/\s+(?:at|@)\s+.*$/i, ''));
  }
  return undefined;
}

function extractCompanyName(preambleLines: string[], jobTitle?: string): string | undefined {
  for (const raw of preambleLines.slice(0, 8)) {
    const labelled = /^\s*(?:company|employer|organisation|organization|about us)\s*[:\-\u2013]\s*(.+)$/i.exec(raw);
    if (labelled) {
      const value = normalizeSkillName(labelled[1]);
      if (value && value.length <= 80) return value;
    }
  }

  if (jobTitle) {
    const atMatch = /\s+(?:at|@)\s+([A-Za-z0-9][A-Za-z0-9&.'\u2019-]*(?:\s+[A-Za-z0-9&.'\u2019-]*){0,3})\s*$/.exec(jobTitle);
    if (atMatch) {
      const value = normalizeSkillName(atMatch[1]);
      if (value && value.length <= 80) return value;
    }
  }

  for (const raw of preambleLines.slice(0, 8)) {
    const cleaned = raw.replace(BULLET_PREFIX, '').replace(/\s+/g, ' ').trim();
    if (!cleaned || cleaned.length > 80) continue;
    if (!/^[A-Z]/.test(cleaned)) continue;
    if (cleaned.split(/\s+/).length > 6) continue;
    if (jobTitle && cleaned.toLowerCase() === jobTitle.toLowerCase()) continue;
    if (ROLE_TITLE_RE.test(cleaned)) continue;
    if (CORPORATE_SUFFIX_RE.test(cleaned)) {
      const value = normalizeSkillName(cleaned);
      if (value) return value;
    }
  }

  return undefined;
}

export function extractJobDescriptionDeterministic(text: string): {
  extraction: JobDescriptionExtraction;
  warnings: string[];
} {
  const warnings: string[] = [];
  const sections = splitSections(text);
  const preamble = sections.find(s => s.key === 'preamble');

  const skills = collectMentions(sections);
  const qualifications = extractBullets(sections, ['requirements', 'preferred', 'skills']);
  const responsibilities = extractBullets(sections, ['responsibility']);

  const jobTitle = extractJobTitle(preamble?.lines || []);
  const companyName = extractCompanyName(preamble?.lines || [], jobTitle);

  const hasHeadings = sections.some(s => s.key !== 'preamble');

  if (text.trim().length < 200) {
    warnings.push('Very little text was provided. The analysis may be incomplete.');
  }
  if (skills.length === 0) {
    warnings.push('No known skills were detected. The posting may use unusual names or be too short.');
  }
  if (!hasHeadings) {
    warnings.push(
      'No standard section headings (such as "Requirements" or "Responsibilities") were found, so skills were inferred from the full text.'
    );
  }
  if (skills.length >= MAX_SKILLS) {
    warnings.push(`Only the first ${MAX_SKILLS} detected skills were kept.`);
  }

  return {
    extraction: {
      jobTitle,
      companyName,
      skills,
      qualifications,
      responsibilities,
      warnings
    },
    warnings
  };
}

/**
 * Resolves an untrusted skill name (typically AI output) against the shared
 * career lexicon so the resulting `skillId` lines up with the IDs used by the
 * profile, gap engine, and career catalog. Off-catalog names fall back to the
 * canonical slug so they still compare correctly against the student's skills.
 */
export function resolveJobSkill(
  rawName: string,
  fallbackCategory?: string
): { skillId: string; name: string; category: string } | null {
  const name = normalizeSkillName(rawName);
  if (!name) return null;

  const lexicon: LexiconEntry[] = buildSkillLexicon();
  const lower = name.toLowerCase();

  for (const entry of lexicon) {
    if (entry.name.toLowerCase() === lower) {
      return { skillId: entry.id, name: entry.name, category: entry.category };
    }
    if (entry.synonyms.some(s => s.toLowerCase() === lower)) {
      return { skillId: entry.id, name: entry.name, category: entry.category };
    }
  }

  for (const entry of lexicon) {
    if (entry.synonyms.some(s => s.length >= 3 && s.toLowerCase() !== lower && hasSkill(lower, s))) {
      return { skillId: entry.id, name: entry.name, category: entry.category };
    }
  }

  const skillId = toCanonicalSkillId(name);
  if (!skillId || skillId === 'custom_skill') return null;
  return {
    skillId,
    name,
    category: normalizeSkillName(fallbackCategory || '') || 'General'
  };
}

/**
 * Re-resolves every skill mention through the shared lexicon and merges
 * duplicates, guaranteeing that AI-sourced and rule-sourced extractions end up
 * with identical canonical IDs before scoring.
 */
export function canonicalizeMentions(extraction: JobDescriptionExtraction): JobDescriptionExtraction {
  const merged = new Map<string, JobDescriptionSkillMention>();

  for (const mention of extraction.skills) {
    const resolved = resolveJobSkill(mention.name, mention.category);
    if (!resolved) continue;

    const existing = merged.get(resolved.skillId);
    if (!existing) {
      merged.set(resolved.skillId, {
        ...mention,
        skillId: resolved.skillId,
        name: resolved.name,
        category: resolved.category
      });
      continue;
    }

    if (KIND_RANK[mention.kind] < KIND_RANK[existing.kind]) {
      existing.kind = mention.kind;
    }
    if (CONFIDENCE_RANK[mention.confidence] > CONFIDENCE_RANK[existing.confidence]) {
      existing.confidence = mention.confidence;
      existing.inferred = mention.inferred;
      existing.evidence = mention.evidence || existing.evidence;
    }
    existing.sections = Array.from(new Set([...existing.sections, ...mention.sections])).slice(0, 6);
    if (!existing.evidence) existing.evidence = mention.evidence;
  }

  return {
    ...extraction,
    skills: Array.from(merged.values()).slice(0, MAX_SKILLS)
  };
}
