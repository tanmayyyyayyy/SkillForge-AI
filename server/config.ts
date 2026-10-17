/**
 * Centralized resume-upload configuration.
 * All limits are overridable via environment variables.
 */

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : fallback;
}

export const RESUME_CONFIG = {
  /** Maximum accepted decoded PDF size in bytes (default 5 MB). */
  maxBytes: intFromEnv('RESUME_MAX_BYTES', 5 * 1024 * 1024),
  /** Maximum number of extraction requests allowed per window, per user. */
  rateLimitMax: intFromEnv('RESUME_RATE_LIMIT_MAX', 10),
  /** Rate-limit window in milliseconds (default 10 minutes). */
  rateLimitWindowMs: intFromEnv('RESUME_RATE_LIMIT_WINDOW_MS', 10 * 60 * 1000),
  /** Minimum extracted text length for the result to be considered usable. */
  minTextLength: 40
};

/**
 * Job Description Analyzer configuration.
 * All limits are overridable via environment variables.
 */
export const JD_CONFIG = {
  /** Minimum pasted characters before a posting is considered analyzable. */
  minChars: intFromEnv('JD_MIN_CHARS', 80),
  /** Maximum accepted pasted job description length in characters. */
  maxChars: intFromEnv('JD_MAX_CHARS', 20000),
  /** Maximum number of analysis requests allowed per window, per user. */
  rateLimitMax: intFromEnv('JD_RATE_LIMIT_MAX', 20),
  /** Rate-limit window in milliseconds (default 10 minutes). */
  rateLimitWindowMs: intFromEnv('JD_RATE_LIMIT_WINDOW_MS', 10 * 60 * 1000)
};
