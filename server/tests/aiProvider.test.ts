import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Server } from 'node:http';
import { createApp } from '../app.js';
import { db } from '../db/store.js';
import { getGeminiModel, clearGeminiCallHistory } from '../services/geminiClient.js';

/**
 * AI provider configuration and diagnostics tests.
 *
 * Gemini is exercised only through a mocked global fetch — no test requires a
 * real GEMINI_API_KEY or performs a network call to Google. The suite locks in:
 *   1. Honest status reporting: "Connected" requires a real successful provider
 *      response; an API key alone reports "Not yet verified".
 *   2. Explicit fallback: without a key (or with AI_PROVIDER=deterministic) the
 *      Deterministic Advisory Engine serves AI features and Gemini is never
 *      contacted by feature routes.
 *   3. Accurate attribution: failed Gemini requests fall back to the
 *      Deterministic Advisory Engine and are never labeled as Gemini output.
 *   4. Graceful failure handling: invalid model (404), quota (429), and network
 *      errors surface as honest 502 test results with timestamped status.
 *   5. Security: no diagnostics response ever contains the API key.
 */

const DEMO_TOKEN = 'demo_token_aarav';
const TEST_API_KEY = 'test-key-not-a-real-secret';

interface GeminiRecord {
  url: string;
  body: any;
}

let geminiCalls: GeminiRecord[] = [];
let geminiResponder: () => Response | Promise<Response>;

const realFetch = globalThis.fetch;

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function geminiOkReply(): Response {
  return jsonResponse(200, {
    candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'OK' }] } }]
  });
}

function geminiHttpError(status: number, message: string): Response {
  return jsonResponse(status, { error: { code: status, message, status: status === 404 ? 'NOT_FOUND' : 'RESOURCE_EXHAUSTED' } });
}

interface ApiResponse {
  status: number;
  body: any;
}

let server: Server;
let baseUrl: string;

async function api(
  path: string,
  options: { method?: string; token?: string | null; body?: unknown } = {}
): Promise<ApiResponse> {
  const { method = 'GET', token = DEMO_TOKEN, body } = options;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

beforeAll(async () => {
  const app = createApp();
  server = app.listen(0);
  await new Promise<void>(resolve => server.once('listening', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Failed to bind test server.');
  baseUrl = `http://127.0.0.1:${address.port}`;

  // Route only generativelanguage.googleapis.com traffic to the mock; every
  // other fetch (including the harness's own HTTP calls) uses the real one.
  globalThis.fetch = (async (input: any, init?: any) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : String(input?.url ?? input);
    if (url.includes('generativelanguage.googleapis.com')) {
      geminiCalls.push({ url, body: init?.body ? JSON.parse(init.body) : undefined });
      return geminiResponder();
    }
    return realFetch(input, init);
  }) as typeof fetch;
});

afterAll(async () => {
  globalThis.fetch = realFetch;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_MODEL;
  delete process.env.AI_PROVIDER;
  clearGeminiCallHistory();
  vi.restoreAllMocks();
  await new Promise<void>(resolve => server.close(() => resolve()));
});

beforeEach(() => {
  db.resetDemoData();
  geminiCalls = [];
  geminiResponder = () => geminiOkReply();
  delete process.env.GEMINI_MODEL;
  delete process.env.AI_PROVIDER;
  clearGeminiCallHistory();
  vi.restoreAllMocks();
  // Silence provider warnings — assertions check recorded status, not logs.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('AI Provider — Gemini not configured', () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it('requires authentication for status and test endpoints', async () => {
    const status = await api('/api/ai-provider/status', { token: null });
    const test = await api('/api/ai-provider/test', { method: 'POST', token: null });

    expect(status.status).toBe(401);
    expect(test.status).toBe(401);
  });

  it('reports the deterministic engine as not configured', async () => {
    const res = await api('/api/ai-provider/status');

    expect(res.status).toBe(200);
    expect(res.body.provider.provider).toBe('deterministic');
    expect(res.body.provider.health).toBe('not_configured');
    expect(res.body.provider.apiKeyConfigured).toBe(false);
    expect(res.body.provider.active).toBe(false);
    expect(res.body.provider.model).toBe(getGeminiModel());
    expect(res.body.provider.detail).toContain('GEMINI_API_KEY');
    expect(res.body.provider.lastSuccessAt).toBeNull();
  });

  it('rejects the connection test with an actionable error', async () => {
    const res = await api('/api/ai-provider/test', { method: 'POST' });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toContain('GEMINI_API_KEY');
    expect(res.body.provider.health).toBe('not_configured');
    expect(geminiCalls).toHaveLength(0);
  });

  it('serves AI Coach from the deterministic engine without contacting Gemini', async () => {
    const res = await api('/api/ai/chat', {
      method: 'POST',
      body: { prompt: 'What should I learn next for my target role?' }
    });

    expect(res.status).toBe(200);
    expect(res.body.engineUsed).toBe('Deterministic Advisory Engine');
    expect(res.body.message.engineUsed).toBe('Deterministic Advisory Engine');
    expect(geminiCalls).toHaveLength(0);
  });
});

describe('AI Provider — Gemini configured and reachable', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = TEST_API_KEY;
  });

  it('reports "not verified" before any live request completes', async () => {
    const res = await api('/api/ai-provider/status');

    expect(res.status).toBe(200);
    expect(res.body.provider.provider).toBe('gemini');
    expect(res.body.provider.health).toBe('not_verified');
    expect(res.body.provider.apiKeyConfigured).toBe(true);
    expect(res.body.provider.active).toBe(true);
  });

  it('verifies connectivity with a real (mocked) provider response and reports Connected', async () => {
    const testRes = await api('/api/ai-provider/test', { method: 'POST' });

    expect(testRes.status).toBe(200);
    expect(testRes.body.ok).toBe(true);
    expect(testRes.body.model).toBe(getGeminiModel());
    expect(typeof testRes.body.latencyMs).toBe('number');
    expect(testRes.body.latencyMs).toBeGreaterThanOrEqual(0);
    expect(testRes.body.provider.health).toBe('connected');
    expect(testRes.body.provider.lastSuccessAt).toBeTruthy();
    expect(geminiCalls).toHaveLength(1);
    expect(geminiCalls[0].url).toContain(`models/${getGeminiModel()}:generateContent`);

    const statusRes = await api('/api/ai-provider/status');
    expect(statusRes.body.provider.health).toBe('connected');
    expect(statusRes.body.provider.lastSuccessAt).toBeTruthy();
  });

  it('attributes a successful chat reply to the live Gemini engine', async () => {
    geminiResponder = () => jsonResponse(200, {
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '**Live advice** — keep shipping.' }] } }]
    });

    const res = await api('/api/ai/chat', {
      method: 'POST',
      body: { prompt: 'What should I learn next for my target role?' }
    });

    expect(res.status).toBe(200);
    expect(res.body.engineUsed).toContain('Gemini');
    expect(res.body.engineUsed).toContain(getGeminiModel());
    expect(res.body.message.content).toBe('**Live advice** — keep shipping.');

    const statusRes = await api('/api/ai-provider/status');
    expect(statusRes.body.provider.health).toBe('connected');
  });

  it('never exposes the API key in any diagnostics response', async () => {
    await api('/api/ai-provider/test', { method: 'POST' });
    const statusRes = await api('/api/ai-provider/status');
    const healthRes = await api('/api/health', { token: null });

    for (const body of [statusRes.body, healthRes.body]) {
      const serialized = JSON.stringify(body);
      expect(serialized).not.toContain(TEST_API_KEY);
      expect(serialized).not.toContain('GEMINI_API_KEY');
    }
  });
});

describe('AI Provider — invalid model / API error', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = TEST_API_KEY;
  });

  it('surfaces HTTP 404 as an honest failed test and request_failed status', async () => {
    geminiResponder = () => geminiHttpError(404, 'models/gemini-3.8-flash is not found for API version v1beta');

    const testRes = await api('/api/ai-provider/test', { method: 'POST' });

    expect(testRes.status).toBe(502);
    expect(testRes.body.ok).toBe(false);
    expect(testRes.body.error).toContain('404');
    expect(testRes.body.error).toContain('not found');
    expect(testRes.body.provider.health).toBe('request_failed');
    expect(testRes.body.provider.lastFailureDetail).toContain('HTTP 404');
    expect(testRes.body.provider.lastFailureAt).toBeTruthy();

    const statusRes = await api('/api/ai-provider/status');
    expect(statusRes.body.provider.health).toBe('request_failed');
    expect(statusRes.body.provider.lastSuccessAt).toBeNull();
  });

  it('falls back to the deterministic engine and never claims Gemini served the reply', async () => {
    geminiResponder = () => geminiHttpError(404, 'models/retired-model is not found');

    const res = await api('/api/ai/chat', {
      method: 'POST',
      body: { prompt: 'Give me a roadmap for my target role.' }
    });

    expect(res.status).toBe(200);
    expect(res.body.engineUsed).toBe('Deterministic Advisory Engine');
    expect(res.body.message.engineUsed).toBe('Deterministic Advisory Engine');
    expect(res.body.message.content).toContain('Roadmap');
  });
});

describe('AI Provider — quota and network failures', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = TEST_API_KEY;
  });

  it('handles quota (HTTP 429) failures gracefully', async () => {
    geminiResponder = () => geminiHttpError(429, 'RESOURCE_EXHAUSTED: Quota exceeded for quota metric');

    const testRes = await api('/api/ai-provider/test', { method: 'POST' });

    expect(testRes.status).toBe(502);
    expect(testRes.body.ok).toBe(false);
    expect(testRes.body.error).toContain('429');
    expect(testRes.body.error).toContain('Quota exceeded');
    expect(testRes.body.provider.health).toBe('request_failed');

    const statusRes = await api('/api/ai-provider/status');
    expect(statusRes.body.provider.health).toBe('request_failed');
    expect(statusRes.body.provider.lastFailureDetail).toContain('HTTP 429');
  });

  it('handles network failures gracefully', async () => {
    geminiResponder = () => {
      throw new TypeError('fetch failed');
    };
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const testRes = await api('/api/ai-provider/test', { method: 'POST' });

    expect(testRes.status).toBe(502);
    expect(testRes.body.ok).toBe(false);
    expect(testRes.body.provider.health).toBe('request_failed');
    expect(testRes.body.provider.lastFailureDetail).toContain('network error');

    const chatRes = await api('/api/ai/chat', {
      method: 'POST',
      body: { prompt: 'What should I focus on this week?' }
    });
    expect(chatRes.status).toBe(200);
    expect(chatRes.body.engineUsed).toBe('Deterministic Advisory Engine');

    errorSpy.mockRestore();
  });

  it('recovers to Connected once a later request succeeds', async () => {
    geminiResponder = () => geminiHttpError(429, 'RESOURCE_EXHAUSTED');
    await api('/api/ai-provider/test', { method: 'POST' });

    geminiResponder = () => geminiOkReply();
    const retryRes = await api('/api/ai-provider/test', { method: 'POST' });

    expect(retryRes.status).toBe(200);
    expect(retryRes.body.ok).toBe(true);
    expect(retryRes.body.provider.health).toBe('connected');
  });
});

describe('AI Provider — explicit deterministic override', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = TEST_API_KEY;
    process.env.AI_PROVIDER = 'deterministic';
  });

  it('reports fallback_active and keeps AI features on the deterministic engine', async () => {
    const statusRes = await api('/api/ai-provider/status');

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.provider.provider).toBe('deterministic');
    expect(statusRes.body.provider.health).toBe('fallback_active');
    expect(statusRes.body.provider.apiKeyConfigured).toBe(true);
    expect(statusRes.body.provider.active).toBe(false);
    expect(statusRes.body.provider.detail).toContain('AI_PROVIDER=deterministic');

    const chatRes = await api('/api/ai/chat', {
      method: 'POST',
      body: { prompt: 'What should I learn next for my target role?' }
    });
    expect(chatRes.status).toBe(200);
    expect(chatRes.body.engineUsed).toBe('Deterministic Advisory Engine');
    expect(geminiCalls).toHaveLength(0);
  });

  it('still allows the explicit connection test to verify the live provider', async () => {
    const testRes = await api('/api/ai-provider/test', { method: 'POST' });

    expect(testRes.status).toBe(200);
    expect(testRes.body.ok).toBe(true);
    expect(geminiCalls).toHaveLength(1);

    const statusRes = await api('/api/ai-provider/status');
    expect(statusRes.body.provider.provider).toBe('deterministic');
    expect(statusRes.body.provider.health).toBe('fallback_active');
    expect(statusRes.body.provider.lastSuccessAt).toBeTruthy();
  });

  it('reports an honest error when the test fails under the override', async () => {
    geminiResponder = () => geminiHttpError(404, 'models/gemini-3.8-flash is not found');

    const testRes = await api('/api/ai-provider/test', { method: 'POST' });

    expect(testRes.status).toBe(502);
    expect(testRes.body.ok).toBe(false);
    expect(testRes.body.error).toContain('AI_PROVIDER=deterministic');
  });
});
