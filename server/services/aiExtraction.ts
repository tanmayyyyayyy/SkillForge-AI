import { validateResumeExtraction } from '../../src/utils/resumeSchema.js';
import type { ResumeExtraction } from '../../src/types/index.js';

/**
 * Gemini-backed resume extraction.
 *
 * - Only invoked when a Gemini API key is configured.
 * - Requests strict JSON and validates it against the resume schema before use.
 * - Never logs resume contents (privacy).
 * - Returns null on any failure so the caller can use the deterministic fallback.
 */

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

const EXTRACTION_PROMPT = `You are a resume parsing engine. Extract structured data from the resume text below.
Return ONLY valid minified JSON with this exact shape:
{
  "fullName": string | null,
  "degree": string | null,
  "branch": string | null,
  "institution": string | null,
  "graduationYear": number | null,
  "skills": [{ "name": string, "category": string, "proficiency": number(0-5), "evidence": string }],
  "projects": [{ "title": string, "description": string, "technologies": string[], "repoUrl": string | null, "liveUrl": string | null }],
  "experience": [{ "organization": string, "role": string, "duration": string, "responsibilities": string, "skillsDemonstrated": string[] }],
  "certifications": [{ "name": string, "issuer": string | null, "year": number | null }],
  "technologies": string[]
}

STRICT RULES:
1. Extract ONLY information that is explicitly present in the resume text.
2. NEVER invent, guess, or infer qualifications, employers, dates, or skills that are absent.
3. Proficiency must be 0-5. Use 2 when the resume does not state a level.
4. Use null (or omit) for unknown fields. Use empty arrays for missing sections.
5. Do not include any commentary, markdown, or code fences — output raw JSON only.`;

function safeParseJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function extractWithGemini(text: string): Promise<{ extraction: ResumeExtraction; warnings: string[] } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  // Keep the payload bounded to control cost and latency.
  const boundedText = text.slice(0, 20000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${EXTRACTION_PROMPT}\n\n--- RESUME TEXT START ---\n${boundedText}\n--- RESUME TEXT END ---` }]
            }
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json'
          }
        }),
        signal: AbortSignal.timeout(20000)
      }
    );

    if (!response.ok) return null;

    const data = (await response.json()) as any;
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText || typeof candidateText !== 'string') return null;

    const parsed = safeParseJson(candidateText);
    if (!parsed) return null;

    // Never trust AI JSON — validate against the schema.
    const validated = validateResumeExtraction(parsed);
    if (!validated.isValid) return null;

    return { extraction: validated.extraction, warnings: validated.warnings };
  } catch {
    // Network/timeout/parse failures are handled by the deterministic fallback.
    return null;
  }
}
