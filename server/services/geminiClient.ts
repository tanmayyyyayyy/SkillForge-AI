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
 */

const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export function getGeminiModel(): string {
  const configured = process.env.GEMINI_MODEL?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_GEMINI_MODEL;
}

/** Human-readable engine label that names the exact model that served a reply. */
export function geminiEngineLabel(): string {
  return `Gemini ${getGeminiModel()} (Live API)`;
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
 * Calls the Gemini generateContent endpoint and returns the candidate text,
 * or null when the provider is unavailable, times out, or returns something
 * unusable. Failures are logged (status + provider message only) so a silent
 * fallback to the deterministic engine can always be diagnosed.
 */
export async function callGeminiText(
  prompt: string,
  options: GeminiCallOptions = {}
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = getGeminiModel();
  const {
    temperature = 0.7,
    maxOutputTokens = 600,
    responseMimeType,
    timeoutMs = 15000,
    maxAttempts = 2
  } = options;

  const generationConfig: Record<string, unknown> = { temperature, maxOutputTokens };
  if (responseMimeType) generationConfig.responseMimeType = responseMimeType;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
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
        continue;
      }

      const data = (await response.json()) as any;
      const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof candidateText === 'string' && candidateText.trim().length > 0) {
        return candidateText.trim();
      }
      console.warn(`Gemini returned no usable candidate text [model: ${model}, attempt ${attempt}/${maxAttempts}]`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(
        `Gemini request error [model: ${model}, attempt ${attempt}/${maxAttempts}]: ${reason}`
      );
    }
  }

  return null;
}
