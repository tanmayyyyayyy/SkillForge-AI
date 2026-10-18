import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { RESUME_CONFIG } from '../config.js';
import { extractPdfText, isPdfBuffer, PdfExtractionError } from '../services/pdfText.js';
import { extractDeterministic } from '../services/resumeExtractor.js';
import { extractWithGemini, isGeminiConfigured } from '../services/aiExtraction.js';
import { validateResumeExtraction } from '../../src/utils/resumeSchema.js';
import { checkResumeTruth } from '../services/resumeTruthService.js';
import type {
  ResumeExtractionResult,
  ResumeExtractedProject,
  ResumeExtractedSkill,
  ResumeTruthDraft,
  ProficiencyLevel
} from '../../src/types/index.js';

export const resumeRouter = Router();

const TRUTH_MAX_SKILLS = 200;
const TRUTH_MAX_PROJECTS = 50;
const TRUTH_MAX_EXPERIENCE = 50;

function clampLevel(value: unknown): ProficiencyLevel {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, n)) as ProficiencyLevel;
}

/**
 * Parses the untrusted resume draft for the truth check. Returns null when the
 * shape is invalid; individual malformed entries are skipped so a single bad
 * line cannot fail the whole request.
 */
function parseTruthDraft(body: unknown): ResumeTruthDraft | null {
  if (!body || typeof body !== 'object') return null;
  const source = body as Record<string, unknown>;

  if (!Array.isArray(source.skills)) return null;
  if (source.skills.length > TRUTH_MAX_SKILLS) return null;
  if (source.projects !== undefined && !Array.isArray(source.projects)) return null;
  if (source.experience !== undefined && !Array.isArray(source.experience)) return null;

  const skills: ResumeExtractedSkill[] = [];
  for (const raw of source.skills) {
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as Record<string, unknown>;
    const name = typeof entry.name === 'string' ? entry.name.trim().slice(0, 120) : '';
    const skillId = typeof entry.skillId === 'string' ? entry.skillId.trim().slice(0, 120) : '';
    if (!name && !skillId) continue;
    skills.push({
      skillId: skillId || name,
      name: name || skillId,
      category: typeof entry.category === 'string' ? entry.category.slice(0, 60) : '',
      proficiency: clampLevel(entry.proficiency)
    });
  }

  const projects: ResumeExtractedProject[] = [];
  if (Array.isArray(source.projects)) {
    for (const raw of source.projects.slice(0, TRUTH_MAX_PROJECTS)) {
      if (!raw || typeof raw !== 'object') continue;
      const entry = raw as Record<string, unknown>;
      const title = typeof entry.title === 'string' ? entry.title.trim().slice(0, 200) : '';
      if (!title) continue;
      projects.push({
        title,
        description: typeof entry.description === 'string' ? entry.description.slice(0, 2000) : '',
        technologies: Array.isArray(entry.technologies)
          ? entry.technologies.filter((t): t is string => typeof t === 'string').slice(0, 40)
          : [],
        repoUrl: typeof entry.repoUrl === 'string' ? entry.repoUrl.slice(0, 500) : undefined,
        liveUrl: typeof entry.liveUrl === 'string' ? entry.liveUrl.slice(0, 500) : undefined
      });
    }
  }

  const experience = [];
  if (Array.isArray(source.experience)) {
    for (const raw of source.experience.slice(0, TRUTH_MAX_EXPERIENCE)) {
      if (!raw || typeof raw !== 'object') continue;
      const entry = raw as Record<string, unknown>;
      const organization = typeof entry.organization === 'string' ? entry.organization.trim().slice(0, 120) : '';
      const role = typeof entry.role === 'string' ? entry.role.trim().slice(0, 120) : '';
      if (!organization && !role) continue;
      experience.push({
        id: typeof entry.id === 'string' ? entry.id : `exp-${experience.length}`,
        organization,
        role,
        duration: typeof entry.duration === 'string' ? entry.duration.slice(0, 120) : '',
        responsibilities: typeof entry.responsibilities === 'string' ? entry.responsibilities.slice(0, 2000) : '',
        skillsDemonstrated: Array.isArray(entry.skillsDemonstrated)
          ? entry.skillsDemonstrated.filter((s): s is string => typeof s === 'string').slice(0, 40)
          : []
      });
    }
  }

  return { skills, projects, experience };
}

/**
 * Simple in-memory per-user rate limiter for the (externally reachable) upload
 * endpoint. Sufficient for the MVP's single-process JSON store; a distributed
 * deployment would move this to a shared store.
 */
const requestLog = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const windowStart = now - RESUME_CONFIG.rateLimitWindowMs;
  const timestamps = (requestLog.get(userId) || []).filter(t => t >= windowStart);
  if (timestamps.length >= RESUME_CONFIG.rateLimitMax) {
    requestLog.set(userId, timestamps);
    return true;
  }
  timestamps.push(now);
  requestLog.set(userId, timestamps);
  return false;
}

resumeRouter.post('/extract', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (isRateLimited(req.userId!)) {
      res.status(429).json({
        error: 'Too many resume uploads. Please wait a few minutes before trying again.'
      });
      return;
    }

    const { contentBase64 } = req.body || {};
    if (typeof contentBase64 !== 'string' || contentBase64.length === 0) {
      res.status(400).json({ error: 'No file content was provided. Upload a PDF resume.' });
      return;
    }

    // Guard against oversized payloads before decoding.
    const approxBytes = Math.floor((contentBase64.length * 3) / 4);
    if (approxBytes > RESUME_CONFIG.maxBytes) {
      res.status(413).json({
        error: `File is too large. Maximum allowed size is ${Math.round(RESUME_CONFIG.maxBytes / (1024 * 1024))} MB.`
      });
      return;
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(contentBase64, 'base64');
    } catch {
      res.status(400).json({ error: 'File content could not be decoded. Please upload a valid PDF.' });
      return;
    }

    if (buffer.length === 0) {
      res.status(400).json({ error: 'The uploaded file is empty.' });
      return;
    }
    if (buffer.length > RESUME_CONFIG.maxBytes) {
      res.status(413).json({
        error: `File is too large. Maximum allowed size is ${Math.round(RESUME_CONFIG.maxBytes / (1024 * 1024))} MB.`
      });
      return;
    }
    if (!isPdfBuffer(buffer)) {
      res.status(415).json({ error: 'Unsupported file type. Please upload a PDF document.' });
      return;
    }

    // Extract text (in memory only — nothing is written to disk or retained).
    let pdfResult;
    try {
      pdfResult = extractPdfText(buffer);
    } catch (err) {
      if (err instanceof PdfExtractionError) {
        res.status(422).json({ error: err.message });
        return;
      }
      throw err;
    }

    if (pdfResult.text.length < RESUME_CONFIG.minTextLength) {
      res.status(422).json({
        error: 'Could not reliably read text from this PDF. It may be a scanned image or use an unsupported format. Please upload a text-based PDF.'
      });
      return;
    }

    // AI extraction when configured; deterministic fallback otherwise.
    let source: 'gemini' | 'deterministic' = 'deterministic';
    let warnings: string[] = [];
    let extraction;

    const geminiResult = isGeminiConfigured() ? await extractWithGemini(pdfResult.text) : null;

    if (geminiResult) {
      source = 'gemini';
      warnings = geminiResult.warnings;
      const validated = validateResumeExtraction(geminiResult.extraction);
      extraction = validated.extraction;
      warnings = [...warnings, ...validated.warnings];
    } else {
      if (isGeminiConfigured()) {
        warnings.push('AI extraction was unavailable; results were produced by rule-based text parsing and may be incomplete.');
      } else {
        warnings.push('AI extraction is not configured; results were produced by rule-based text parsing and may be incomplete.');
      }
      const deterministic = extractDeterministic(pdfResult.text);
      const validated = validateResumeExtraction(deterministic.extraction);
      extraction = validated.extraction;
      warnings = [...warnings, ...deterministic.warnings, ...validated.warnings];
    }

    const result: ResumeExtractionResult = {
      extraction,
      source,
      warnings,
      pdf: {
        pageCount: pdfResult.pageCount,
        textLength: pdfResult.text.length
      }
    };

    res.json(result);
  } catch (err: any) {
    console.error('Resume extraction error:', err?.message || err);
    res.status(500).json({ error: 'Failed to process the resume. Please try again.' });
  }
});

// Compares a reviewed resume draft against the student's own stored evidence.
// Nothing is persisted — the draft lives only for the duration of this request.
resumeRouter.post('/truth-check', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const draft = parseTruthDraft(req.body);
    if (!draft) {
      res.status(400).json({
        error: `Provide a draft with a skills array (up to ${TRUTH_MAX_SKILLS} entries); skills may include optional projects and experience.`
      });
      return;
    }

    const report = checkResumeTruth(req.userId!, draft);
    if (!report) {
      res.status(404).json({ error: 'Profile not found. Complete onboarding first.' });
      return;
    }

    res.json({ report });
  } catch (err: any) {
    console.error('Resume truth check error:', err?.message || err);
    res.status(500).json({ error: 'Failed to check the resume. Please try again.' });
  }
});

// Expose limits to the client so validation messages stay consistent.
resumeRouter.get('/config', authMiddleware, (_req: AuthenticatedRequest, res: Response): void => {
  res.json({
    maxBytes: RESUME_CONFIG.maxBytes,
    aiConfigured: isGeminiConfigured()
  });
});
