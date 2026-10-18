import { describe, it, expect, beforeAll, afterAll, beforeEach, vi, type MockInstance } from 'vitest';
import { Server } from 'node:http';
import { createApp } from '../app.js';
import { db } from '../db/store.js';
import { CAREER_ROLES } from '../data/careers.js';
import { getGeminiModel, geminiEngineLabel } from '../services/geminiClient.js';

/**
 * AI Career Coach provider-selection and response-quality tests.
 *
 * The Gemini provider is exercised only through a mocked global fetch — no
 * test ever requires a real GEMINI_API_KEY or performs a network call to
 * Google. The suite locks in these guarantees:
 *   1. Gemini answers are used verbatim when the mocked provider succeeds,
 *      and both the response label and the stored transcript say so.
 *   2. Thought parts from thinking models are never presented as the answer.
 *   3. Truncated output (finishReason MAX_TOKENS) is retried with a doubled
 *      budget and, if still incomplete, falls back — never persisted as a
 *      complete answer. Blocked output (SAFETY/…) fails fast without retries.
 *   4. Any provider failure (retired model → HTTP 404, network error, empty
 *      candidate) falls back to the Deterministic Advisory Engine, and the
 *      fallback is logged — never silently, and never labeled as Gemini.
 *   5. Historical transcript entries keep the engine label they were stored
 *      with; demo mode authenticates the seeded user without replacing
 *      Gemini answers.
 *   6. Without a key, the deterministic engine answers roadmap questions
 *      with a structured plan and Gemini is never contacted.
 */

const DEMO_TOKEN = 'demo_token_aarav';
const TEST_API_KEY = 'test-key-not-a-real-secret';

const MODEL_PROMPT = 'Give me a personalized 30-day machine learning roadmap.';
const MOCK_GEMINI_REPLY = '**30-Day ML Roadmap**\n\n- Week 1: pandas and numpy drills\n- Week 2: scikit-learn pipelines';

interface GeminiRecord {
  url: string;
  body: any;
}

let geminiCalls: GeminiRecord[] = [];
let geminiResponder: () => Response | Promise<Response>;
let warnSpy: MockInstance;

const realFetch = globalThis.fetch;

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function geminiSuccess(text: string): Response {
  return jsonResponse(200, { candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }] });
}

/** Mimics a thinking-model response: a thought-flagged part before the real answer. */
function geminiWithThoughtParts(answer: string): Response {
  return jsonResponse(200, {
    candidates: [
      {
        finishReason: 'STOP',
        content: {
          parts: [
            { text: 'Considering the backend stack: JWT auth, migrations with Alembic)', thought: true },
            { text: answer }
          ]
        }
      }
    ]
  });
}

/** Mimics generation cut off by the output token limit. */
function geminiTruncated(text: string): Response {
  return jsonResponse(200, {
    candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text }] } }]
  });
}

/** Mimics a safety-blocked response. */
function geminiBlocked(): Response {
  return jsonResponse(200, {
    candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }]
  });
}

function geminiEmptyCandidates(): Response {
  return jsonResponse(200, { candidates: [] });
}

function geminiNotFound(): Response {
  return jsonResponse(404, {
    error: { code: 404, message: 'models/gemini-3.8-flash is not found for API version v1beta', status: 'NOT_FOUND' }
  });
}

function warnLogText(): string {
  return warnSpy.mock.calls.map(args => args.map(String).join(' ')).join('\n');
}

/** A complete 30-day roadmap long enough to exercise verbatim persistence. */
function buildLongRoadmap(): string {
  const days = Array.from({ length: 30 }, (_, i) => `- **Day ${i + 1}:** Complete focused task ${i + 1} and push progress to GitHub.`).join('\n');
  return `### 30-Day Backend Development Roadmap

#### Week 1 — Foundations
${days.split('\n').slice(0, 7).join('\n')}

#### Week 2 — APIs
${days.split('\n').slice(7, 14).join('\n')}

#### Week 3 — Databases
${days.split('\n').slice(14, 21).join('\n')}

#### Week 4 — Deployment
${days.split('\n').slice(21, 30).join('\n')}

**Final capstone:** a deployed API with JWT auth, tests, and a README.`;
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
  vi.restoreAllMocks();
  await new Promise<void>(resolve => server.close(() => resolve()));
});

beforeEach(() => {
  db.resetDemoData();
  geminiCalls = [];
  geminiResponder = () => geminiSuccess(MOCK_GEMINI_REPLY);
  delete process.env.GEMINI_MODEL;
  process.env.GEMINI_API_KEY = TEST_API_KEY;
  vi.restoreAllMocks();
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('AI Coach — request validation and auth', () => {
  it('rejects unauthenticated chat requests without contacting Gemini', async () => {
    const res = await api('/api/ai/chat', { method: 'POST', token: null, body: { prompt: MODEL_PROMPT } });

    expect(res.status).toBe(401);
    expect(geminiCalls).toHaveLength(0);
  });

  it('rejects an empty prompt', async () => {
    const res = await api('/api/ai/chat', { method: 'POST', body: { prompt: '   ' } });

    expect(res.status).toBe(400);
    expect(geminiCalls).toHaveLength(0);
  });
});

describe('AI Coach — Gemini success path', () => {
  it('uses the Gemini reply verbatim and labels both turns with the live engine', async () => {
    const res = await api('/api/ai/chat', { method: 'POST', body: { prompt: MODEL_PROMPT } });

    expect(res.status).toBe(200);
    expect(res.body.engineUsed).toBe(geminiEngineLabel());
    expect(res.body.engineUsed).toContain(getGeminiModel());
    expect(res.body.message.role).toBe('assistant');
    expect(res.body.message.content).toBe(MOCK_GEMINI_REPLY);
    expect(res.body.message.engineUsed).toBe(geminiEngineLabel());

    // The transcript stores the same engine for the user turn of this exchange.
    const messages = (await api('/api/ai/messages')).body.messages as any[];
    const lastTwo = messages.slice(-2);
    expect(lastTwo).toHaveLength(2);
    expect(lastTwo[0].role).toBe('user');
    expect(lastTwo[0].content).toBe(MODEL_PROMPT);
    expect(lastTwo[0].engineUsed).toBe(geminiEngineLabel());
    expect(lastTwo[1].role).toBe('assistant');
    expect(lastTwo[1].content).toBe(MOCK_GEMINI_REPLY);
    expect(lastTwo[1].engineUsed).toBe(geminiEngineLabel());
  });

  it('sends the student question and profile context to Gemini on the backend', async () => {
    const res = await api('/api/ai/chat', { method: 'POST', body: { prompt: MODEL_PROMPT } });
    expect(res.status).toBe(200);
    expect(geminiCalls.length).toBeGreaterThan(0);

    const { url, body } = geminiCalls[0];
    expect(url).toContain(`models/${getGeminiModel()}:generateContent`);
    expect(url).toContain(`key=${TEST_API_KEY}`);

    const sentText = body.contents[0].parts[0].text;
    expect(sentText).toContain(MODEL_PROMPT);
    expect(sentText).toContain('Student question:');
    expect(sentText).toContain('Target Role:');
    expect(body.generationConfig.temperature).toBe(0.7);
  });

  it('honours the GEMINI_MODEL override in the request URL and the engine label', async () => {
    process.env.GEMINI_MODEL = 'gemini-3.6-flash';

    const res = await api('/api/ai/chat', { method: 'POST', body: { prompt: MODEL_PROMPT } });

    expect(res.status).toBe(200);
    expect(geminiCalls[0].url).toContain('models/gemini-3.6-flash:generateContent');
    expect(res.body.engineUsed).toBe('Gemini gemini-3.6-flash (Live API)');
    expect(res.body.message.content).toBe(MOCK_GEMINI_REPLY);
  });

  it('never presents a thinking-model thought part as the answer', async () => {
    // Thinking models emit reasoning parts flagged thought:true before the
    // answer. Reading parts[0] returned a mid-sentence thought fragment as
    // the whole reply (e.g. ", JWT auth, migrations with Alembic).").
    geminiResponder = () => geminiWithThoughtParts(MOCK_GEMINI_REPLY);

    const res = await api('/api/ai/chat', { method: 'POST', body: { prompt: MODEL_PROMPT } });

    expect(res.status).toBe(200);
    expect(res.body.engineUsed).toBe(geminiEngineLabel());
    expect(res.body.message.content).toBe(MOCK_GEMINI_REPLY);
    expect(res.body.message.content).not.toContain('Considering the backend stack');
  });

  it('asks Gemini for a complete answer with enough tokens and question-first instructions', async () => {
    const profile = (await api('/api/profile')).body.profile;
    const res = await api('/api/ai/chat', { method: 'POST', body: { prompt: MODEL_PROMPT } });
    expect(res.status).toBe(200);

    const { body } = geminiCalls[0];
    expect(body.generationConfig.maxOutputTokens).toBeGreaterThanOrEqual(4096);

    const sentText = body.contents[0].parts[0].text;
    // The old prompt capped answers at 300 words, forcing short generic roadmaps.
    expect(sentText).not.toContain('300 words');
    expect(sentText).toContain('primary instruction');
    expect(sentText).toContain('four weekly objectives');
    expect(sentText).toContain('every single day');
    expect(sentText).toContain('capstone');
    expect(sentText).toContain(`${profile.weeklyHours} hours/week`);
    // The question itself must be present, after the profile context.
    expect(sentText).toContain(`Student question: ${MODEL_PROMPT}`);
    expect(sentText.indexOf('Student Profile')).toBeLessThan(sentText.indexOf('Student question:'));
  });

  it('retries a truncated response with a doubled token budget and returns the complete answer', async () => {
    const fullRoadmap = buildLongRoadmap();
    let call = 0;
    geminiResponder = () => {
      call += 1;
      return call === 1
        ? geminiTruncated('### 30-Day Backend Development Roadmap\n\n#### Week 1 — Foundations\n- **Day 1:** setup')
        : geminiSuccess(fullRoadmap);
    };

    const res = await api('/api/ai/chat', { method: 'POST', body: { prompt: MODEL_PROMPT } });

    expect(res.status).toBe(200);
    expect(res.body.engineUsed).toBe(geminiEngineLabel());
    expect(res.body.message.content).toBe(fullRoadmap);
    expect(geminiCalls).toHaveLength(2);
    expect(geminiCalls[1].body.generationConfig.maxOutputTokens).toBe(
      geminiCalls[0].body.generationConfig.maxOutputTokens * 2
    );
    expect(warnLogText()).toContain('MAX_TOKENS');
  });

  it('never persists a truncated answer: still-cut output falls back to the deterministic engine', async () => {
    geminiResponder = () => geminiTruncated('### Week 1 — Foundations\n- **Day 1:** setup');

    const res = await api('/api/ai/chat', { method: 'POST', body: { prompt: MODEL_PROMPT } });

    expect(res.status).toBe(200);
    expect(res.body.engineUsed).toBe('Deterministic Advisory Engine');
    // The half-answer from Gemini must not leak into the transcript.
    expect(res.body.message.content).not.toContain('Day 1:** setup');
    expect(res.body.message.content).toContain('Week 4');
    expect(warnLogText()).toContain('MAX_TOKENS');

    const messages = (await api('/api/ai/messages')).body.messages as any[];
    expect(messages.slice(-2).every(m => m.engineUsed === 'Deterministic Advisory Engine')).toBe(true);
  });

  it('fails fast on blocked responses without wasting retries', async () => {
    geminiResponder = () => geminiBlocked();

    const res = await api('/api/ai/chat', { method: 'POST', body: { prompt: MODEL_PROMPT } });

    expect(res.status).toBe(200);
    expect(res.body.engineUsed).toBe('Deterministic Advisory Engine');
    expect(geminiCalls).toHaveLength(1);
    expect(warnLogText()).toContain('SAFETY');
  });

  it('persists a long structured 30-day roadmap verbatim end to end', async () => {
    const fullRoadmap = buildLongRoadmap();
    geminiResponder = () => geminiSuccess(fullRoadmap);

    const res = await api('/api/ai/chat', { method: 'POST', body: { prompt: MODEL_PROMPT } });

    expect(res.status).toBe(200);
    expect(res.body.message.content).toBe(fullRoadmap);
    expect(res.body.message.content.endsWith('README.')).toBe(true);

    const messages = (await api('/api/ai/messages')).body.messages as any[];
    const stored = messages[messages.length - 1];
    expect(stored.content).toBe(fullRoadmap);
    expect(stored.engineUsed).toBe(geminiEngineLabel());
  });

  it('uses the user question as the instruction, not a generic profile summary', async () => {
    const profile = (await api('/api/profile')).body.profile;
    const fullRoadmap = buildLongRoadmap();
    geminiResponder = () => geminiSuccess(fullRoadmap);

    const res = await api('/api/ai/chat', { method: 'POST', body: { prompt: MODEL_PROMPT } });

    // The reply is exactly what the question asked for — the demo profile
    // (Aarav Sharma) personalizes the prompt but never replaces the answer.
    expect(res.body.message.content).toBe(fullRoadmap);
    expect(res.body.message.content).not.toContain('Career Intelligence Analysis');

    const sentText = geminiCalls[0].body.contents[0].parts[0].text;
    expect(sentText).toContain(profile.fullName);
    expect(sentText).toContain(MODEL_PROMPT);
  });
});

describe('AI Coach — transcript attribution consistency', () => {
  it('keeps historical engine labels intact when later messages come from Gemini', async () => {
    const before = (await api('/api/ai/messages')).body.messages as any[];
    const welcomeBefore = before.find(m => m.id === 'msg_welcome');
    expect(welcomeBefore).toBeDefined();
    expect(welcomeBefore.engineUsed).toBe('Deterministic Advisory Engine');

    const res = await api('/api/ai/chat', { method: 'POST', body: { prompt: MODEL_PROMPT } });
    expect(res.body.engineUsed).toBe(geminiEngineLabel());

    const after = (await api('/api/ai/messages')).body.messages as any[];
    const welcomeAfter = after.find(m => m.id === 'msg_welcome');

    // The seeded greeting is historical: same content, same label — never
    // relabeled as Gemini even though newer messages are Gemini-served.
    expect(welcomeAfter.content).toBe(welcomeBefore.content);
    expect(welcomeAfter.engineUsed).toBe('Deterministic Advisory Engine');

    // Newer Gemini-served messages keep their own label through reload.
    const last = after[after.length - 1];
    expect(last.engineUsed).toBe(geminiEngineLabel());
    expect(last.content).toBe(MOCK_GEMINI_REPLY);
  });

  it('demo mode authenticates the seeded user without replacing Gemini answers', async () => {
    // Demo login issues the demo token; chat still runs the real provider
    // path with the demo student's profile as personalization context.
    const login = await api('/api/auth/demo', { method: 'POST', token: null });
    expect(login.status).toBe(200);
    expect(login.body.token).toBe(DEMO_TOKEN);

    const res = await api('/api/ai/chat', {
      token: login.body.token,
      method: 'POST',
      body: { prompt: MODEL_PROMPT }
    });
    expect(res.status).toBe(200);
    expect(res.body.engineUsed).toBe(geminiEngineLabel());
    expect(res.body.message.content).toBe(MOCK_GEMINI_REPLY);

    const sentText = geminiCalls[0].body.contents[0].parts[0].text;
    expect(sentText).toContain(login.body.profile.fullName);
  });
});

describe('AI Coach — deterministic roadmap fallback (no key)', () => {
  it('answers a roadmap question with a complete four-week skeleton', async () => {
    delete process.env.GEMINI_API_KEY;
    const profile = (await api('/api/profile')).body.profile;

    const res = await api('/api/ai/chat', {
      method: 'POST',
      body: { prompt: 'Give me a 30-day backend development roadmap' }
    });

    expect(res.status).toBe(200);
    expect(res.body.engineUsed).toBe('Deterministic Advisory Engine');
    expect(geminiCalls).toHaveLength(0);

    const content = res.body.message.content as string;
    expect(content).toContain('30-Day');
    expect(content).toContain('Week 1');
    expect(content).toContain('Week 2');
    expect(content).toContain('Week 3');
    expect(content).toContain('Week 4');
    expect(content).toContain('Day 1');
    expect(content).toContain(`${profile.weeklyHours} hours/week`);
    expect(content).toContain('Final project');
    // Not the generic catch-all summary.
    expect(content).not.toContain('Career Intelligence Analysis');
    expect(res.body.message.suggestedActions.length).toBeGreaterThan(0);
  });
});

describe('AI Coach — deterministic fallback', () => {
  it('falls back to the deterministic engine when Gemini returns HTTP 404 and logs it', async () => {
    // Reproduces the production incident: a retired model id makes the Gemini
    // endpoint answer 404. The old code swallowed this silently.
    geminiResponder = () => geminiNotFound();

    const res = await api('/api/ai/chat', { method: 'POST', body: { prompt: MODEL_PROMPT } });

    expect(res.status).toBe(200);
    expect(res.body.engineUsed).toBe('Deterministic Advisory Engine');
    expect(res.body.message.content).not.toBe(MOCK_GEMINI_REPLY);
    // A roadmap request must still receive a roadmap-shaped fallback answer.
    expect(res.body.message.content).toContain('30-Day');
    expect(res.body.message.content).toContain('Week 1');
    expect(res.body.message.content).toContain('Week 4');
    expect(geminiCalls.length).toBeGreaterThan(0);
    expect(warnLogText()).toContain('HTTP 404');

    // Neither stored turn may claim Gemini produced this reply.
    const messages = (await api('/api/ai/messages')).body.messages as any[];
    const lastTwo = messages.slice(-2);
    expect(lastTwo[0].engineUsed).toBe('Deterministic Advisory Engine');
    expect(lastTwo[1].engineUsed).toBe('Deterministic Advisory Engine');
  });

  it('falls back when the Gemini request fails with a network error', async () => {
    geminiResponder = () => {
      throw new TypeError('fetch failed');
    };

    const res = await api('/api/ai/chat', { method: 'POST', body: { prompt: MODEL_PROMPT } });

    expect(res.status).toBe(200);
    expect(res.body.engineUsed).toBe('Deterministic Advisory Engine');
    expect(res.body.message.content).toContain('30-Day');
    expect(warnLogText()).toContain('Gemini request error');
  });

  it('falls back when Gemini returns an empty candidate list', async () => {
    geminiResponder = () => geminiEmptyCandidates();

    const res = await api('/api/ai/chat', { method: 'POST', body: { prompt: MODEL_PROMPT } });

    expect(res.status).toBe(200);
    expect(res.body.engineUsed).toBe('Deterministic Advisory Engine');
    expect(warnLogText()).toContain('no usable candidate text');
  });

  it('answers contextually per intent and offers suggested follow-ups', async () => {
    geminiResponder = () => geminiNotFound();

    const profile = (await api('/api/profile')).body.profile;
    const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];

    const interview = await api('/api/ai/chat', {
      method: 'POST',
      body: { prompt: 'How should I prepare for technical interviews?' }
    });
    expect(interview.status).toBe(200);
    expect(interview.body.engineUsed).toBe('Deterministic Advisory Engine');
    expect(interview.body.message.content).toContain(role.title);
    expect(interview.body.message.suggestedActions.length).toBeGreaterThan(0);

    const project = await api('/api/ai/chat', {
      method: 'POST',
      body: { prompt: 'Which project should I build for my portfolio?' }
    });
    expect(project.body.message.content).toContain('Project');
    // Different intents must produce different replies, not one fixed summary.
    expect(project.body.message.content).not.toBe(interview.body.message.content);
  });
});

describe('AI Coach — no key configured', () => {
  it('uses the deterministic engine and never calls Gemini without an API key', async () => {
    delete process.env.GEMINI_API_KEY;

    const res = await api('/api/ai/chat', { method: 'POST', body: { prompt: MODEL_PROMPT } });

    expect(res.status).toBe(200);
    expect(res.body.engineUsed).toBe('Deterministic Advisory Engine');
    expect(geminiCalls).toHaveLength(0);

    const messages = (await api('/api/ai/messages')).body.messages as any[];
    expect(messages.slice(-2).every(m => m.engineUsed === 'Deterministic Advisory Engine')).toBe(true);
  });
});

describe('AI Coach — user isolation', () => {
  it('keeps coach transcripts isolated per user', async () => {
    geminiResponder = () => geminiNotFound();

    const demoChat = await api('/api/ai/chat', { method: 'POST', body: { prompt: MODEL_PROMPT } });
    expect(demoChat.status).toBe(200);

    const registered = await api('/api/auth/register', {
      method: 'POST',
      token: null,
      body: { name: 'Isolation Tester', email: 'isolation@test.local', password: 'secret123' }
    });
    expect(registered.status).toBe(201);
    const otherToken = registered.body.token as string;

    const otherChat = await api('/api/ai/chat', {
      method: 'POST',
      token: otherToken,
      body: { prompt: 'What should I learn next?' }
    });
    expect(otherChat.status).toBe(200);

    const otherMessages = (await api('/api/ai/messages', { token: otherToken })).body.messages as any[];
    expect(otherMessages).toHaveLength(2);
    expect(otherMessages.every(m => m.content !== MODEL_PROMPT)).toBe(true);

    const demoMessages = (await api('/api/ai/messages')).body.messages as any[];
    expect(demoMessages.some(m => m.content === MODEL_PROMPT)).toBe(true);
  });
});
