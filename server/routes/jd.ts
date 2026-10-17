import { Router, Response } from 'express';
import { db } from '../db/store.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { JD_CONFIG } from '../config.js';
import { isPlainObject, readTrimmedString } from '../utils/request.js';
import {
  canonicalizeMentions,
  extractJobDescriptionDeterministic
} from '../services/jobDescriptionExtractor.js';
import { extractJobDescriptionWithGemini, isGeminiConfigured } from '../services/aiExtraction.js';
import { validateJobDescriptionExtraction } from '../../src/utils/jobDescriptionSchema.js';
import { calculateJobMatch } from '../engine/jobMatchEngine.js';
import type { JobDescriptionExtraction } from '../../src/types/index.js';

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

      if (!description) {
        res.status(400).json({ error: 'Paste a job description to analyze.' });
        return;
      }
      if (description.length < JD_CONFIG.minChars) {
        res.status(400).json({
          error: `Job description is too short to analyze (minimum ${JD_CONFIG.minChars} characters).`
        });
        return;
      }
      if (description.length > JD_CONFIG.maxChars) {
        res.status(413).json({
          error: `Job description is too long (maximum ${JD_CONFIG.maxChars} characters).`
        });
        return;
      }

      const profile = db.getProfile(req.userId!);
      if (!profile) {
        res.status(404).json({ error: 'Profile not found. Please complete profile onboarding.' });
        return;
      }

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

      const mergedWarnings = Array.from(new Set(warnings));
      extraction.warnings = mergedWarnings;

      const analysis = calculateJobMatch(profile, extraction, source);
      res.json({ analysis });
    } catch (err) {
      console.error('Job description analysis error:', err);
      res.status(500).json({ error: 'Failed to analyze the job description. Please try again.' });
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
