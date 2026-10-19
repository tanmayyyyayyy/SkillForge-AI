# SkillForge AI — Hackathon Submission Checklist

> **Hackathon Platform:** SaarthiX Jobs Hackathon 2026 (Level 2 MVP Submission)  
> **Submission Deadline:** 19 October 2026

Use this checklist to complete and verify your platform submission step-by-step.

---

## 1. Codebase & Build Health

- [x] **Unit & Integration Tests:** `npm test` passes 100% (365 tests across 32 suites).
- [x] **TypeScript Validation:** `npm run typecheck` completes with 0 errors across frontend and backend.
- [x] **Production Compilation:** `npm run build` bundles assets cleanly (Rollup/Vite in ~330ms).
- [x] **Code Linter:** `npm run lint` completes with 0 errors.
- [x] **Database Safety:** `server/db/data.json` is preserved without unintended modification or corruption.

---

## 2. Live Deployment Verification

- [x] **Live Web URL:** `https://skillforge-ai-q4tz.onrender.com`
- [x] **Live Health Endpoint:** `https://skillforge-ai-q4tz.onrender.com/api/health` returns `200 OK`.
- [x] **Demo Authentication:** `POST /api/auth/demo` initializes Aarav Sharma's evaluator profile.
- [x] **Fallback Engine Active:** Deterministic Advisory Engine is ready if Gemini experiences timeouts.

---

## 3. Platform Submission Fields (SaarthiX Jobs Platform)

Open the hackathon submission portal and populate the following required inputs:

### Field 1: Submission Link
```
https://skillforge-ai-q4tz.onrender.com
```
*(Alternative or secondary link: `https://github.com/tanmayyyyayyy/SkillForge-AI`)*

### Field 2: Solution Statement / Description
*Copy from `docs/SUBMISSION_CONTENT.md` Section C (216 words):*
> SkillForge AI is an explainable career readiness platform that turns ambiguous job market demands into measurable skills, verifiable proof, and actionable career advancement. Designed for engineering students and job seekers facing skill opacity and unstructured learning, SkillForge AI replaces guesswork with a deterministic, evidence-backed career acceleration engine.
>
> Users begin by targeting industry roles or pasting live job descriptions. The platform's Opportunity Match analyzer extracts requirements and contrasts them with the learner’s profile, surfacing prioritized skill gaps. To close these gaps, Career Autopilot proposes approval-gated actions that strictly require human consent before execution. Learners complete server-authoritative practical coding challenges in the Skill Proof Lab, where solutions are evaluated against rigorous test assertions.
>
> Passing work generates canonical evidence with tamper-resistant provenance, updating an interactive Evidence Graph that links job requirements to demonstrated mastery. A formula-driven Career Readiness Score (0–100%) dynamically tracks progress across demonstrated proficiency, verified assessments, and portfolio milestones.
>
> What sets SkillForge AI apart is radical transparency: every recommendation includes a causal trace, and an offline-capable Deterministic Advisory Engine guarantees dependable guidance even without external AI keys. Built on React 19, TypeScript, Express 5, and Google Gemini with transactional persistence, SkillForge AI proves genuine readiness to employers beyond generic certificates.

### Field 3: Upload File (Accepted formats: PDF, MP4, AVI, MOV, MKV, WEBM)
- **Primary Option (Video):** Upload a 2–3 minute MP4 or WEBM screen recording following the narration script in `docs/SUBMISSION_CONTENT.md` Section I.
- **Alternative Option (PDF):** If screen recording is not uploaded, compile `docs/DEMO_GUIDE.md` and `docs/SUBMISSION_CONTENT.md` into a structured demonstration PDF.

---

## 4. Git & Repository Sanity Check

- [x] No secrets (`GEMINI_API_KEY`, `.env`, JWT secrets) staged or committed.
- [x] `server/db/data.json` not staged or reset.
- [x] Untracked documentation files and integration tests reviewed.
- [x] Working tree clean of temporary test databases.
