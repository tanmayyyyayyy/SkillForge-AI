import { validateResumeExtraction } from '../../src/utils/resumeSchema.js';
import { validateJobDescriptionExtraction } from '../../src/utils/jobDescriptionSchema.js';
import type { ResumeExtraction, JobDescriptionExtraction } from '../../src/types/index.js';

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

const REQUEST_TIMEOUT_MS = 20000;
const MAX_ATTEMPTS = 2;

/**
 * Bounded-retry Gemini call. Returns the raw candidate text, or null when the
 * provider is unavailable, times out, or returns something unusable.
 * Never logs the prompt contents (privacy).
 */
async function callGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 4096,
              responseMimeType: 'application/json'
            }
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
        }
      );

      if (!response.ok) {
        if (attempt === MAX_ATTEMPTS) return null;
        continue;
      }

      const data = (await response.json()) as any;
      const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof candidateText === 'string' && candidateText.trim()) {
        return candidateText;
      }
      if (attempt === MAX_ATTEMPTS) return null;
    } catch {
      if (attempt === MAX_ATTEMPTS) return null;
    }
  }
  return null;
}

export async function extractWithGemini(text: string): Promise<{ extraction: ResumeExtraction; warnings: string[] } | null> {
  // Keep the payload bounded to control cost and latency.
  const candidateText = await callGemini(
    `${EXTRACTION_PROMPT}\n\n--- RESUME TEXT START ---\n${text.slice(0, 20000)}\n--- RESUME TEXT END ---`
  );
  if (!candidateText) return null;

  const parsed = safeParseJson(candidateText);
  if (!parsed) return null;

  // Never trust AI JSON — validate against the schema.
  const validated = validateResumeExtraction(parsed);
  if (!validated.isValid) return null;

  return { extraction: validated.extraction, warnings: validated.warnings };
}

const JOB_EXTRACTION_PROMPT = `You are a job-posting parsing engine. Extract structured skill requirements from the job description text below.
Return ONLY valid minified JSON with this exact shape:
{
  "jobTitle": string | null,
  "companyName": string | null,
  "skills": [{ "name": string, "category": string, "kind": "required" | "preferred" | "tool" | "responsibility", "section": string | null, "evidence": string | null }],
  "qualifications": string[],
  "responsibilities": string[]
}

STRICT RULES:
1. Extract ONLY skills explicitly present in the job description text. NEVER invent, guess, or infer skills that are absent.
2. "kind" assignment:
   - "preferred" ONLY when the skill appears under a nice-to-have, preferred, desirable or bonus heading.
   - "tool" for tools, platforms, products or infrastructure entries (e.g. Docker, AWS, Figma, Git).
   - "responsibility" only when the skill is implied by a duty sentence rather than listed as a requirement.
   - "required" in every other case (use this as the default).
3. "section" is the exact heading the skill appeared under (e.g. "Requirements", "Nice to have"). Use null if there is no heading.
4. "evidence" is the exact short phrase or sentence from the posting that mentions the skill, max 140 characters. Use null if unavailable.
5. "qualifications" and "responsibilities" are the verbatim bullet points under those headings (max 10 each). Do not paraphrase.
6. Use null (or omit) for unknown scalar fields. Use empty arrays for missing lists.
7. Extract at most 40 skills.
8. Do not include any commentary, markdown, or code fences — output raw JSON only.`;

/**
 * Gemini-backed job description extraction.
 * Returns null on any failure so the caller can use the deterministic fallback.
 */
export async function extractJobDescriptionWithGemini(
  text: string
): Promise<{ extraction: JobDescriptionExtraction; warnings: string[] } | null> {
  const candidateText = await callGemini(
    `${JOB_EXTRACTION_PROMPT}\n\n--- JOB DESCRIPTION START ---\n${text.slice(0, 20000)}\n--- JOB DESCRIPTION END ---`
  );
  if (!candidateText) return null;

  const parsed = safeParseJson(candidateText);
  if (!parsed) return null;

  const validated = validateJobDescriptionExtraction(parsed);
  if (!validated.isValid) return null;

  return { extraction: validated.extraction, warnings: validated.warnings };
}
