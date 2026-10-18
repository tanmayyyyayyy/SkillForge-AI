import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { getAiProviderStatus } from '../services/aiProviderStatus.js';
import {
  callGeminiText,
  getGeminiModel,
  hasGeminiApiKey,
  isDeterministicOverrideActive
} from '../services/geminiClient.js';

/**
 * Authenticated AI provider diagnostics.
 *
 * - GET  /status — honest runtime provider status (no secrets, ever).
 * - POST /test   — performs a real, minimal Gemini request and reports the
 *                  outcome. Only possible when GEMINI_API_KEY is set; the
 *                  deterministic override (AI_PROVIDER=deterministic) does not
 *   block the explicit connectivity test.
 */
export const aiProviderRouter = Router();

aiProviderRouter.get('/status', authMiddleware, (_req: AuthenticatedRequest, res: Response): void => {
  res.json({ provider: getAiProviderStatus() });
});

aiProviderRouter.post('/test', authMiddleware, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!hasGeminiApiKey()) {
    res.status(400).json({
      ok: false,
      error: 'Gemini is not configured. Set GEMINI_API_KEY in the server environment (e.g. the Render dashboard Environment tab) and redeploy to enable live AI.',
      provider: getAiProviderStatus()
    });
    return;
  }

  const model = getGeminiModel();
  const startedAt = Date.now();
  const reply = await callGeminiText('Reply with the single word: OK', {
    temperature: 0,
    maxOutputTokens: 32,
    timeoutMs: 15000,
    maxAttempts: 1
  });
  const latencyMs = Date.now() - startedAt;
  const provider = getAiProviderStatus();

  if (reply) {
    res.json({ ok: true, model, latencyMs, provider });
    return;
  }

  const reason = provider.lastFailureDetail ?? 'no usable response was returned';
  const overrideNote = isDeterministicOverrideActive()
    ? ' Note: AI_PROVIDER=deterministic is active, so AI features remain on the deterministic engine even if this test succeeds.'
    : '';
  res.status(502).json({
    ok: false,
    model,
    latencyMs,
    error: `Gemini request failed: ${reason}.${overrideNote}`,
    provider
  });
});
