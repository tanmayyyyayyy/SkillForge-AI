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
