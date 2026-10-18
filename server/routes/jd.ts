import { Router, Response } from 'express';
import { db } from '../db/store.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { JD_CONFIG } from '../config.js';
import { isPlainObject, readParam, readTrimmedString } from '../utils/request.js';
import {
  canonicalizeMentions,
  extractJobDescriptionDeterministic
} from '../services/jobDescriptionExtractor.js';
import { extractJobDescriptionWithGemini, isGeminiConfigured } from '../services/aiExtraction.js';
import { validateJobDescriptionExtraction } from '../../src/utils/jobDescriptionSchema.js';
import { calculateJobMatch } from '../engine/jobMatchEngine.js';
import {
  saveJobAnalysis,
  listJobAnalyses,
  getSavedJobAnalysis,
  deleteSavedJobAnalysis,
  buildPreparationPlan,
  buildResumeAlignment
} from '../services/jobIntelligenceService.js';
import type {
  JobDescriptionAnalysis,
  JobDescriptionExtraction,
  ResumeTruthDraft
} from '../../src/types/index.js';

export const jobDescriptionRouter = Router();

/**
 * Simple in-memory per-user rate limiter for the externally reachable analyze
 * endpoint (shared shape with the resume limiter). Sufficient for the MVP's
 * single-process JSON store; a distributed deployment would move this to a
 * shared store.
 */
const requestLog = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const windowStart = now - JD_CONFIG.rateLimitWindowMs;
  const timestamps = (requestLog.get(userId) || []).filter(t => t >= windowStart);
  if (timestamps.length >= JD_CONFIG.rateLimitMax) {
    requestLog.set(userId, timestamps);
    return true;
  }
  timestamps.push(now);
  requestLog.set(userId, timestamps);
  return false;
}

/**
 * Runs extraction + matching for a description against a profile. Shared by
 * every route that needs an analysis, so scoring logic exists in exactly one
 * place and cannot drift between endpoints.
 */
async function analyzeDescription(
  description: string,
  profile: NonNullable<ReturnType<typeof db.getProfile>>
): Promise<JobDescriptionAnalysis> {
  let source: 'gemini' | 'deterministic' = 'deterministic';
  let extraction: JobDescriptionExtraction | undefined;
  const warnings: string[] = [];

  if (isGeminiConfigured()) {
    const aiResult = await extractJobDescriptionWithGemini(description);
    if (aiResult) {
      const validated = validateJobDescriptionExtraction(aiResult.extraction);
      if (validated.isValid) {
        source = 'gemini';
        extraction = canonicalizeMentions(validated.extraction);
        warnings.push(...aiResult.warnings, ...validated.warnings);
      } else {
        warnings.push(
          'AI job-description parsing returned an invalid result; results were produced by rule-based text parsing.'
        );
      }
    } else {
      warnings.push(
        'AI job-description parsing was unavailable; results were produced by rule-based text parsing.'
      );
    }
  }

  if (!extraction) {
    const deterministic = extractJobDescriptionDeterministic(description);
    const validated = validateJobDescriptionExtraction(deterministic.extraction);
    extraction = validated.extraction;
    source = 'deterministic';
    warnings.push(...deterministic.warnings, ...validated.warnings);
  }

  extraction.warnings = Array.from(new Set(warnings));
  return calculateJobMatch(profile, extraction, source);
}

/**
 * Validate a posted description. Returns an error message or null when valid.
 */
function validateDescription(description: string): { message: string; status: number } | null {
  if (!description) return { message: 'Paste a job description to analyze.', status: 400 };
  if (description.length < JD_CONFIG.minChars) {
    return {
      message: `Job description is too short to analyze (minimum ${JD_CONFIG.minChars} characters).`,
      status: 400
    };
  }
  if (description.length > JD_CONFIG.maxChars) {
    return {
      message: `Job description is too long (maximum ${JD_CONFIG.maxChars} characters).`,
      status: 413
    };
  }
  return null;
}

/**
 * Compare a pasted job description against the authenticated student's profile.
 *
 * The client sends raw text only — never a score, never a skill verdict. All
 * extraction, matching, and scoring happens server-side from canonical data.
 */
jobDescriptionRouter.post(
  '/analyze',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (isRateLimited(req.userId!)) {
        res.status(429).json({
          error: 'Too many job description analyses. Please wait a few minutes before trying again.'
        });
        return;
      }

      const body = isPlainObject(req.body) ? req.body : {};
      const description = readTrimmedString(body.description) ?? '';

      const validationError = validateDescription(description);
      if (validationError) {
        res.status(validationError.status).json({ error: validationError.message });
        return;
      }

      const profile = db.getProfile(req.userId!);
      if (!profile) {
        res.status(404).json({ error: 'Profile not found. Please complete profile onboarding.' });
        return;
      }

      const analysis = await analyzeDescription(description, profile);
      res.json({ analysis });
    } catch (err) {
      console.error('Job description analysis error:', err);
      res.status(500).json({ error: 'Failed to analyze the job description. Please try again.' });
    }
  }
);

/**
 * Analyse a posting and persist the result so it can be reviewed, planned, and
 * aligned later. Runs the same extraction/matching pipeline as /analyze.
 */
jobDescriptionRouter.post(
  '/analyses',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (isRateLimited(req.userId!)) {
        res.status(429).json({ error: 'Too many job description analyses. Please wait a few minutes before trying again.' });
        return;
      }

      const body = isPlainObject(req.body) ? req.body : {};
      const description = readTrimmedString(body.description) ?? '';
      const validationError = validateDescription(description);
      if (validationError) {
        res.status(validationError.status).json({ error: validationError.message });
        return;
      }

      const profile = db.getProfile(req.userId!);
      if (!profile) {
        res.status(404).json({ error: 'Profile not found. Please complete profile onboarding.' });
        return;
      }

      const title = readTrimmedString(body.title);
      const company = readTrimmedString(body.company);
      const location = readTrimmedString(body.location);
      const url = readTrimmedString(body.url);

      const analysis = await analyzeDescription(description, profile);
      const saved = saveJobAnalysis(req.userId!, { description, title, company, location, url, analysis });
      if (!saved) {
        res.status(404).json({ error: 'Profile not found. Please complete profile onboarding.' });
        return;
      }
      res.status(201).json({ analysis: saved });
    } catch (err) {
      console.error('Error saving job analysis:', err);
      res.status(500).json({ error: 'Failed to save this job analysis.' });
    }
  }
);

// List saved analyses for the authenticated user (ownership enforced by user id).
jobDescriptionRouter.get('/analyses', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const analyses = listJobAnalyses(req.userId!).map(a => ({
      id: a.id,
      title: a.title,
      company: a.company,
      location: a.location,
      url: a.url,
      matchScore: a.analysis.summary.matchScore,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt
    }));
    res.json({ analyses });
  } catch (err) {
    console.error('Error listing job analyses:', err);
    res.status(500).json({ error: 'Failed to list saved analyses.' });
  }
});

// Fetch a single saved analysis (ownership enforced by user id).
jobDescriptionRouter.get('/analyses/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const id = readParam(req, 'id');
    if (!id) {
      res.status(400).json({ error: 'A valid analysis id is required.' });
      return;
    }
    const analysis = getSavedJobAnalysis(req.userId!, id);
    if (!analysis) {
      res.status(404).json({ error: 'Saved analysis not found.' });
      return;
    }
    res.json({ analysis });
  } catch (err) {
    console.error('Error fetching job analysis:', err);
    res.status(500).json({ error: 'Failed to fetch this saved analysis.' });
  }
});

// Delete a saved analysis (ownership enforced by user id).
jobDescriptionRouter.delete('/analyses/:id', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const id = readParam(req, 'id');
    if (!id) {
      res.status(400).json({ error: 'A valid analysis id is required.' });
      return;
    }
    const removed = deleteSavedJobAnalysis(req.userId!, id);
    if (!removed) {
      res.status(404).json({ error: 'Saved analysis not found.' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting job analysis:', err);
    res.status(500).json({ error: 'Failed to delete this saved analysis.' });
  }
});

// Preparation plan for a saved analysis (ownership enforced by user id).
jobDescriptionRouter.post(
  '/analyses/:id/plan',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const id = readParam(req, 'id');
      if (!id) {
        res.status(400).json({ error: 'A valid analysis id is required.' });
        return;
      }
      const saved = getSavedJobAnalysis(req.userId!, id);
      if (!saved) {
        res.status(404).json({ error: 'Saved analysis not found.' });
        return;
      }
      const plan = buildPreparationPlan(req.userId!, saved.analysis);
      if (!plan) {
        res.status(404).json({ error: 'Profile not found. Complete onboarding first.' });
        return;
      }
      res.json({ plan });
    } catch (err) {
      console.error('Error building preparation plan:', err);
      res.status(500).json({ error: 'Failed to build a preparation plan.' });
    }
  }
);

// Resume alignment for a saved analysis. Optionally accepts a resume draft
// (same shape as /resume/truth-check) so verdicts come from the truth engine.
jobDescriptionRouter.post(
  '/analyses/:id/alignment',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const id = readParam(req, 'id');
      if (!id) {
        res.status(400).json({ error: 'A valid analysis id is required.' });
        return;
      }
      const saved = getSavedJobAnalysis(req.userId!, id);
      if (!saved) {
        res.status(404).json({ error: 'Saved analysis not found.' });
        return;
      }

      let draft: ResumeTruthDraft | null = null;
      const body = isPlainObject(req.body) ? req.body : {};
      const resume = body.resume;
      if (
        resume &&
        typeof resume === 'object' &&
        Array.isArray((resume as { skills?: unknown }).skills)
      ) {
        // Delegate parsing/validation to the same shape the truth endpoint uses.
        draft = resume as unknown as ResumeTruthDraft;
      }

      const alignment = buildResumeAlignment(req.userId!, saved.analysis, draft);
      if (!alignment) {
        res.status(404).json({ error: 'Profile not found. Complete onboarding first.' });
        return;
      }
      res.json({ alignment });
    } catch (err) {
      console.error('Error building resume alignment:', err);
      res.status(500).json({ error: 'Failed to build resume alignment.' });
    }
  }
);

// Expose limits and provider state so client-side validation stays consistent.
jobDescriptionRouter.get('/config', authMiddleware, (_req: AuthenticatedRequest, res: Response): void => {
  res.json({
    minChars: JD_CONFIG.minChars,
    maxChars: JD_CONFIG.maxChars,
    aiConfigured: isGeminiConfigured()
  });
});
