import { Request } from 'express';

/**
 * Server-side request coercion & validation helpers.
 *
 * Express 5 types `req.params` values as `string | string[]` and `req.query`
 * values as `string | string[] | ParsedQs | ParsedQs[]`, so route handlers must
 * narrow before use. These helpers centralize that narrowing plus common body
 * validation so handlers never crash on malformed input.
 */

/** Reads a route parameter as a plain string, or undefined if it is missing/not a string. */
export function readParam(req: Request, name: string): string | undefined {
  const value = (req.params as Record<string, unknown>)[name];
  return typeof value === 'string' ? value : undefined;
}

/** Reads a query parameter as a plain string, or undefined if missing/not a string. */
export function readQuery(req: Request, name: string): string | undefined {
  const value = req.query[name];
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

/** True when the value is a non-null, non-array object. */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Returns a trimmed string if the value is a string, otherwise undefined. */
export function readTrimmedString(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined;
}

/** Returns the value when it is a finite number, otherwise undefined. */
export function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
