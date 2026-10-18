/**
 * Runtime AI provider status used by the Settings → System Diagnostics UI and
 * the /api/ai-provider endpoints.
 *
 * Honesty rules:
 * - "Connected" is only ever reported after a real successful Gemini response
 *   (a live Test Connection or a recent feature request served by Gemini).
 *   An API key alone reports "Not yet verified".
 * - The Gemini API key is never included in any field of this status.
 * - Failure details come from the sanitized geminiClient call records.
 */

import {
  getGeminiModel,
  isGeminiConfigured,
  isDeterministicOverrideActive,
  hasGeminiApiKey,
  getLastGeminiSuccess,
  getLastGeminiFailure
} from './geminiClient.js';

export type AiProviderKind = 'gemini' | 'deterministic';

export type AiProviderHealth =
  | 'connected'
  | 'not_configured'
  | 'not_verified'
  | 'request_failed'
  | 'fallback_active';

export interface AiProviderStatus {
  /** Provider that currently serves AI features. */
  provider: AiProviderKind;
  /** Model that Gemini calls will use (relevant when provider is gemini). */
  model: string;
  /** Whether a GEMINI_API_KEY exists in the server environment (never the key itself). */
  apiKeyConfigured: boolean;
  /** Whether AI features currently attempt live Gemini calls. */
  active: boolean;
  health: AiProviderHealth;
  /** Human-readable explanation of the current health state. Never contains secrets. */
  detail: string;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastFailureDetail: string | null;
  checkedAt: string;
}

function describeFailure(record: { outcome: string; httpStatus?: number; detail?: string }): string {
  switch (record.outcome) {
    case 'http_error':
      return `HTTP ${record.httpStatus}${record.detail ? ` — ${record.detail}` : ''}`;
    case 'timeout':
      return `request timed out${record.detail ? ` — ${record.detail}` : ''}`;
    case 'network_error':
      return `network error${record.detail ? ` — ${record.detail}` : ''}`;
    case 'unusable_response':
      return `provider returned an unusable response${record.detail ? ` — ${record.detail}` : ''}`;
    case 'not_configured':
      return 'not configured';
    default:
      return record.detail ?? record.outcome;
  }
}

export function getAiProviderStatus(): AiProviderStatus {
  const apiKeyConfigured = hasGeminiApiKey();
  const model = getGeminiModel();
  const active = isGeminiConfigured();
  const lastSuccess = getLastGeminiSuccess();
  const lastFailure = getLastGeminiFailure();

  let provider: AiProviderKind;
  let health: AiProviderHealth;
  let detail: string;

  if (!apiKeyConfigured) {
    provider = 'deterministic';
    health = 'not_configured';
    detail = 'Gemini is not configured: no GEMINI_API_KEY is set on the server, so the Deterministic Advisory Engine handles every AI feature.';
  } else if (isDeterministicOverrideActive()) {
    provider = 'deterministic';
    health = 'fallback_active';
    detail = 'Deterministic fallback is explicitly active (AI_PROVIDER=deterministic) even though a Gemini API key is configured.';
  } else if (lastSuccess && (!lastFailure || lastSuccess.at >= lastFailure.at)) {
    provider = 'gemini';
    health = 'connected';
    detail = `Gemini ${lastSuccess.model} served a real response at ${lastSuccess.at}.`;
  } else if (lastFailure) {
    provider = 'gemini';
    health = 'request_failed';
    detail = `Gemini is configured but the most recent request failed (${describeFailure(lastFailure)}). AI features fall back to the Deterministic Advisory Engine until a request succeeds.`;
  } else {
    provider = 'gemini';
    health = 'not_verified';
    detail = `Gemini ${model} is configured, but no live provider response has completed yet. Use Test Connection to verify connectivity.`;
  }

  return {
    provider,
    model,
    apiKeyConfigured,
    active,
    health,
    detail,
    lastSuccessAt: lastSuccess?.at ?? null,
    lastFailureAt: lastFailure?.at ?? null,
    lastFailureDetail: lastFailure ? describeFailure(lastFailure) : null,
    checkedAt: new Date().toISOString()
  };
}
