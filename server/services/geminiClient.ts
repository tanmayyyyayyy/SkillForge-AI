/**
 * Shared Gemini REST client used by every server-side AI feature (AI Career
 * Coach, resume extraction, JD extraction).
 *
 * Design constraints:
 * - No SDK dependency — a plain HTTPS POST to the generateContent endpoint.
 * - The API key never appears in logs, thrown errors, or returned values.
 * - Prompt contents are never logged (privacy).
 * - Every failure mode (HTTP error, timeout, empty candidate) returns null so
 *   callers fall back to their deterministic engines instead of surfacing
 *   provider errors to users.
 * - The model is overridable via GEMINI_MODEL so operators can migrate when
 *   Google retires a model without a code change.
 * - Operators can force the deterministic engine with AI_PROVIDER=deterministic
 *   (see isGeminiConfigured). CallGeminiText itself only requires the API key so
 *   the explicit Test Connection diagnostics endpoint can still verify the
 *   provider while the deterministic override is active.
 * - Every completed call (success or failure) is recorded in memory so the
 *   /api/ai-provider diagnostics endpoints can report honest, timestamped
 *   connection status. Records never contain the API key or prompt text.
 */

const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

/** True when a GEMINI_API_KEY is present in the server environment (never the value itself). */
export function hasGeminiApiKey(): boolean {
  return !!process.env.GEMINI_API_KEY?.trim();
}

/** True when the operator has explicitly forced the offline deterministic engine. */
export function isDeterministicOverrideActive(): boolean {
  return process.env.AI_PROVIDER?.trim().toLowerCase() === 'deterministic';
}

/**
 * True when AI features should attempt live Gemini calls right now:
 * an API key must be present AND the operator must not have forced the
 * deterministic override via AI_PROVIDER=deterministic.
 */
export function isGeminiConfigured(): boolean {
  return hasGeminiApiKey() && !isDeterministicOverrideActive();
}

export function getGeminiModel(): string {
  const configured = process.env.GEMINI_MODEL?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_GEMINI_MODEL;
}

/** Human-readable engine label that names the exact model that served a reply. */
export function geminiEngineLabel(): string {
  return `Gemini ${getGeminiModel()} (Live API)`;
}

export type GeminiCallOutcome =
  | 'success'
  | 'not_configured'
  | 'http_error'
  | 'timeout'
  | 'network_error'
  | 'unusable_response';

/** Sanitized record of the most recent Gemini call of each kind. Never contains the API key or prompts. */
export interface GeminiCallRecord {
  outcome: GeminiCallOutcome;
  model: string;
  httpStatus?: number;
  /** Provider-supplied error message or network error text (Google never echoes the key). */
  detail?: string;
  at: string;
}

let lastCall: GeminiCallRecord | null = null;
let lastSuccess: GeminiCallRecord | null = null;
let lastFailure: GeminiCallRecord | null = null;

export function getLastGeminiCall(): GeminiCallRecord | null {
  return lastCall;
}

export function getLastGeminiSuccess(): GeminiCallRecord | null {
  return lastSuccess;
}

export function getLastGeminiFailure(): GeminiCallRecord | null {
  return lastFailure;
}

export function recordGeminiCall(record: GeminiCallRecord): void {
  lastCall = record;
  if (record.outcome === 'success') {
    lastSuccess = record;
  } else {
    lastFailure = record;
  }
}

/** Test helper — clears the in-memory call history. */
export function clearGeminiCallHistory(): void {
  lastCall = null;
  lastSuccess = null;
  lastFailure = null;
}

export interface GeminiCallOptions {
  temperature?: number;
  maxOutputTokens?: number;
  /** When set, the model is asked to constrain output to this MIME type (e.g. application/json). */
  responseMimeType?: string;
  timeoutMs?: number;
  maxAttempts?: number;
}

/** Extracts Google's error message from a non-OK response without ever touching the key. */
async function safeErrorDetail(response: Response): Promise<string | null> {
  try {
    const data = (await response.json()) as any;
    const message = data?.error?.message;
    return typeof message === 'string' && message.length > 0 ? message : null;
  } catch {
    return null;
  }
}

/**
 * Joins the visible answer text of a candidate.
 *
 * Thinking models (Gemini 2.5+/3.x) may return reasoning parts flagged
 * `thought: true` before the answer parts. Reading parts[0] blindly returns a
 * mid-sentence thought fragment as if it were the whole reply, so thought
 * parts must be filtered out and the remaining text parts concatenated.
 */
function extractCandidateText(candidate: any): string | null {
  const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
  const visible = parts
    .filter((part: any) => part && part.thought !== true && typeof part.text === 'string')
    .map((part: any) => part.text as string)
    .join('');
  return visible.trim().length > 0 ? visible.trim() : null;
}

function isTimeoutError(err: unknown): boolean {
  return err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
}

/**
 * Calls the Gemini generateContent endpoint and returns the *complete*
 * candidate text, or null when the provider is unavailable, refused, timed
 * out, or returned something unusable.
 *
 * Reliability rules:
 * - `finishReason: MAX_TOKENS` means the text is cut mid-answer. It is retried
 *   once with a doubled token budget; if still truncated it is treated as
 *   unusable so callers never receive half an answer presented as complete.
 * - Any other non-STOP finishReason (SAFETY, RECITATION, …) fails immediately
 *   without retry — regenerating identical content wastes credits and will
 *   almost certainly be blocked again.
 * - Failures are logged (status + provider message only, never the key or the
 *   prompt) so a deterministic fallback can always be diagnosed.
 */
export async function callGeminiText(
  prompt: string,
  options: GeminiCallOptions = {}
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = getGeminiModel();
  if (!apiKey) {
    recordGeminiCall({ outcome: 'not_configured', model, at: new Date().toISOString() });
    return null;
  }

  const {
    temperature = 0.7,
    maxOutputTokens = 2048,
    responseMimeType,
    timeoutMs = 15000,
    maxAttempts = 2
  } = options;

  let tokenBudget = maxOutputTokens;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const generationConfig: Record<string, unknown> = {
        temperature,
        maxOutputTokens: tokenBudget
      };
      if (responseMimeType) generationConfig.responseMimeType = responseMimeType;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig
          }),
          signal: AbortSignal.timeout(timeoutMs)
        }
      );

      if (!response.ok) {
        const detail = await safeErrorDetail(response);
        console.warn(
          `Gemini request failed (HTTP ${response.status}${detail ? `: ${detail}` : ''}) [model: ${model}, attempt ${attempt}/${maxAttempts}]`
        );
        recordGeminiCall({
          outcome: 'http_error',
          model,
          httpStatus: response.status,
          detail: detail ?? undefined,
          at: new Date().toISOString()
        });
        continue;
      }

      const data = (await response.json()) as any;
      const candidate = data?.candidates?.[0];
      const finishReason: string | undefined = candidate?.finishReason;

      if (typeof finishReason === 'string' && finishReason !== 'STOP') {
        if (finishReason === 'MAX_TOKENS' && attempt < maxAttempts) {
          tokenBudget *= 2;
          console.warn(
            `Gemini output hit the token limit (MAX_TOKENS); retrying with maxOutputTokens=${tokenBudget} [model: ${model}]`
          );
          continue;
        }
        console.warn(
          `Gemini response unusable (finishReason=${finishReason}${finishReason === 'MAX_TOKENS' ? ` after ${maxAttempts} attempts` : ''}) [model: ${model}]`
        );
        recordGeminiCall({
          outcome: 'unusable_response',
          model,
          detail: `finishReason=${finishReason}`,
          at: new Date().toISOString()
        });
        return null;
      }

      const candidateText = extractCandidateText(candidate);
      if (candidateText) {
        recordGeminiCall({ outcome: 'success', model, at: new Date().toISOString() });
        return candidateText;
      }
      console.warn(`Gemini returned no usable candidate text [model: ${model}, attempt ${attempt}/${maxAttempts}]`);
      recordGeminiCall({
        outcome: 'unusable_response',
        model,
        detail: 'no usable candidate text',
        at: new Date().toISOString()
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(
        `Gemini request error [model: ${model}, attempt ${attempt}/${maxAttempts}]: ${reason}`
      );
      recordGeminiCall({
        outcome: isTimeoutError(err) ? 'timeout' : 'network_error',
        model,
        detail: reason,
        at: new Date().toISOString()
      });
    }
  }

  return null;
}
