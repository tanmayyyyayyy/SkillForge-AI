import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { RESUME_CONFIG } from '../config.js';
import { extractPdfText, isPdfBuffer, PdfExtractionError } from '../services/pdfText.js';
import { extractDeterministic } from '../services/resumeExtractor.js';
import { extractWithGemini, isGeminiConfigured } from '../services/aiExtraction.js';
import { validateResumeExtraction } from '../../src/utils/resumeSchema.js';
import type { ResumeExtractionResult } from '../../src/types/index.js';

export const resumeRouter = Router();

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

// Expose limits to the client so validation messages stay consistent.
resumeRouter.get('/config', authMiddleware, (_req: AuthenticatedRequest, res: Response): void => {
  res.json({
    maxBytes: RESUME_CONFIG.maxBytes,
    aiConfigured: isGeminiConfigured()
  });
});
