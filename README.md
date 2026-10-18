# SkillForge AI

**Stop learning randomly. Build skills that get you hired.**

> 🏆 SaarthiX Hackathon 2026 — Level 2 Submission

---

## The Problem

India produces **1.5 million** engineering graduates annually, yet **60%+ struggle to secure relevant employment**. The core issue isn't a lack of learning resources — it's the absence of an **intelligent, personalized bridge** between a student's current capabilities and what employers actually require.

Students face three critical challenges:
1. **Skill Opacity** — They don't know *which* skills they're missing for their target career
2. **Learning Scatter** — They consume courses randomly without a structured, dependency-aware progression
3. **Evidence Gap** — They can't quantifiably prove readiness to employers beyond generic certifications

## The Solution

**SkillForge AI** is an AI-powered Career Readiness Intelligence System that:

1. **Analyzes** a student's profile against curated, industry-validated career role requirements
2. **Identifies** critical skill gaps using a deterministic, explainable gap analysis algorithm
3. **Generates** a dependency-ordered, prioritized learning roadmap tailored to available study hours
4. **Verifies** assessed knowledge through server-graded, MCQ-based skill assessments with detailed explanations
5. **Recommends** high-impact portfolio projects mapped directly to identified skill gaps
6. **Calculates** a transparent, formula-driven **Career Readiness Score** (0-100%)
7. **Coaches** students with an AI Career Coach powered by Google Gemini with a robust deterministic fallback

---

## Architecture

```
┌─────────────────────────────────────────────┐
│               Frontend (React + TypeScript)  │
│  Vite • React Router • Lucide Icons          │
│                                              │
│  Pages:                                      │
│  • Landing • Auth • Onboarding • Dashboard   │
│  • Career Selection • Gap Analysis           │
│  • Learning Roadmap • Skill Assessments      │
│  • Project Hub • AI Career Coach             │
│  • Progress Analytics • Readiness Report     │
│  • Profile • Settings                        │
├─────────────────────────────────────────────┤
│          API Layer (Express 5 + TypeScript)   │
│                                              │
│  Core Intelligence Engines:                  │
│  ├── gapEngine     — Skill Gap Analysis      │
│  ├── roadmapEngine — Dependency-Ordered      │
│  │                   Learning Path           │
│  ├── readinessEngine — Career Readiness      │
│  │                     Score Calculator      │
│  └── aiCoach       — Gemini + Deterministic  │
│                      Advisory Engine         │
│                                              │
│  Persistence: JSON File-Based Store          │
│  Auth: JWT + bcrypt                          │
├─────────────────────────────────────────────┤
│          Data Layer                          │
│  • 8 Career Roles with 10-14 skills each     │
│  • 45 Skill Assessment Questions (9 skills)   │
│  • 8 Curated Project Recommendations         │
│  • Pre-seeded Demo Profile (Aarav Sharma)    │
└─────────────────────────────────────────────┘
```

## Core AI & Intelligence Features

### 1. Skill Gap Analysis Engine (`server/engine/gapEngine.ts`)
- Deterministic, explainable gap calculation
- Normalized priority scoring: `gap × importance weight`
- Categorizes gaps as **Critical**, **High**, **Medium**, or **Low** priority
- Generates actionable next-step recommendations per skill

### 2. Learning Roadmap Engine (`server/engine/roadmapEngine.ts`)
- Dependency-aware topological ordering of learning tasks
- Preserves existing task completion state
- Prioritizes foundational skills before advanced specializations
- Estimates learning hours based on gap magnitude and complexity

### 3. Career Readiness Score (`server/engine/readinessEngine.ts`)
- **Transparent, formula-driven** scoring (not a black box):
  - **Demonstrated Proficiency** (50%): Weighted skill coverage vs. role requirements
  - **Assessment Verification** (25%): Formally tested skill scores
  - **Project Evidence** (25%): Portfolio completeness and milestone progress
- Score breakdown with per-component analysis

### 4. AI Career Coach (`server/routes/aiCoach.ts`)
- **Primary**: Google Gemini Flash (configurable via `GEMINI_MODEL`, default `gemini-3.8-flash`) with full profile context injection
- **Fallback**: Contextual Deterministic Advisory Engine — functions fully offline
- Intent classification: detects queries about learning priorities, projects, scheduling, interviews, and blockers
- Suggested follow-up actions for guided conversations

### 5. Skill Verification Assessments
- Server-graded, multiple-choice knowledge checks (5 questions per skill, no client-side scoring)
- Detailed per-question explanations revealed only after submission
- Only a graded **passing** attempt records verified assessment evidence, which the readiness engine then consumes
- Does **not** fabricate a proficiency level or practical experience — see §9 for the full engine, attempt lifecycle and evidence policy

### 6. Downloadable Career Readiness Report (`server/services/pdf/`)
- Server-rendered, **dependency-free** PDF (a real PDF 1.4 document, not HTML renamed)
- Built from the exact same canonical readiness payload as the report page — no client-supplied scores
- Warm editorial layout, page numbering, honest evidence labelling (self-reported vs assessed vs project-backed)
- `GET /api/readiness/report/pdf` (authenticated) returns an `application/pdf` attachment named after the student

### 7. Job Description Analyzer (`server/services/jobDescriptionExtractor.ts`)
- Paste a full job posting → get an evidence-quoted comparison against **your own** authenticated profile
- **Section-aware deterministic extraction** classifies every detected skill by where it appears:
  `required` › `tool` › `responsibility` › `preferred` (lower rank wins on merge), with `tool` for tech-stack sections
- Each mention carries `evidence` (the verbatim line), `inferred`, `confidence` and the source heading — the UI shows
  exactly which text the requirement came from, and any low-confidence heuristic detections are flagged as warnings
- **Transparent scoring** (never a black box, never presented as hiring probability):
  `coverage = Σ(weight × credit) / Σ(weight)`, `credit = 1.0 matched / 0.5 partial / 0 missing`,
  `matchScore = 0.75 × requiredCoverage + 0.25 × preferredCoverage`
  - `weight` = career-catalog `importance` for the target track (max across roles), else the default `0.6`
  - `partial` = skill present but below the target track's `requiredLevel`; `missing` = absent or level `0`
  - `matchScore = null` + an explicit note when the posting yields no scorable skills — no fabricated score
- Explains matches / missing skills as quote-backed rows, then generates **next steps from the canonical gap engine**
  (`calculateSkillGaps`) — no second readiness or gap formula is introduced
- Optional Gemini path (`extractJobDescriptionWithGemini`) with a strict JSON schema validator and one bounded retry;
  on any AI failure it **degrades to deterministic parsing and says so** rather than labelling rule output as AI
- Limits: 80–20,000 characters, 20 requests / 10 minutes per user, and the score is always recomputed server-side
  (client-supplied `matchScore`/`matches`/`source` are ignored)

### 8. Intelligent Weekly Learning Planner (`server/engine/weeklyPlanEngine.ts`)
- Turns the student's **prioritized skill gaps, dependency-ordered roadmap, next incomplete project milestone and
  declared weekly availability** into a day-by-day seven-day schedule (`Mon`–`Sun`)
- **Deterministic**: identical inputs always produce the same schedule — no randomness, no AI required
- Scheduling rules: highest-priority gaps first (timed against the existing 1–3h session convention and 2h milestone
  sessions), whole sessions only so the **weekly total never exceeds the declared availability**, sessions spread
  across the days by load, and every item that does not fit is listed with a plain-language reason rather than hidden
- **No invented tasks or progress**: scheduled items are *references* to canonical records — a roadmap task
  (`task_<skill>_<stage>`) or a project milestone (`ms_<project>_<milestone>`). Marking one complete goes through the
  existing roadmap / project endpoints, so completion is genuinely persisted, can never be lost by regenerating, and a
  task is only "completed" because the store says so. Regeneration preserves completed work.
- Shows three honest numbers separately: **estimated/scheduled hours**, **hours actually credited this week**
  (from stored completion records — mastered-but-never-worked skills are excluded), and **remaining scheduled hours**
- Setup states: missing target career, zero availability, and nothing-to-do are each explained instead of faked
- Endpoints: `GET /api/weekly-plan` (read the current week) and `POST /api/weekly-plan/regenerate` (recompute;
  optionally persists a bounded `availableHours` of 1–80 to the profile). Completion uses the existing
  `PATCH /api/roadmap/tasks/:taskId` and `PATCH /api/projects/:id/milestones/:milestoneId`.
- Does **not** change the readiness score or its formula — generating a plan and completing a roadmap session leave
  readiness untouched (covered by tests)

### 9. Assessment Engine & Skill Verification (`server/engine/assessmentEngine.ts`)
- **Server-authoritative multiple-choice assessments** tied to canonical skill IDs. Nine assessments cover Python,
  React, SQL, Scikit-Learn, Docker, JavaScript, TypeScript, Pandas/NumPy data wrangling, and Kubernetes — i.e. the
  Software Engineering, AI/ML, Data Analytics, Full-Stack and DevOps tracks present in the career catalog. (Cybersecurity,
  Product Management and UI/UX are **not** in the catalog yet, so no assessments are invented for them — documented limitation.)
- **Answer keys never leave the server.** Question sheets served to the client (and in an in-progress attempt) contain only
  the id, prompt and options; `correctOptionIndex` and explanations are returned **only after grading**.
- **Grading formula (documented + tested):** `score = round(correct / total * 100)`, passed when
  `score >= assessment.passingScorePercentage` (75% for every current assessment). The client submits *answers only*; a
  client-supplied score, pass flag or verification status is never trusted. Missing / out-of-range / non-integer answers
  are graded incorrect (never accepted as truthy). Unknown question ids → `400`; empty assessments never pass.
- **Attempt lifecycle:** `in_progress → graded`. `POST /:skillId/attempts` opens an attempt (owning the served question
  ids), `POST /attempts/:attemptId/submit` grades it. Grading **appends** to history — retakes create new attempts and
  never overwrite earlier results. Attempts are owner-scoped (JWT-derived), a graded attempt cannot be rewritten, and a
  repeat submission returns the stored result (`alreadyGraded: true`) with **no duplicate activity or credit**.
- **Verified evidence policy:** only a graded *passing* attempt awards assessment evidence. The current evidence for a
  skill is its **highest-scoring pass**, so a lower retake never downgrades it and failed attempts award nothing. A skill
  verified by a completed project keeps `verified_project`. A passed MCQ sets `status: 'assessed'` + the recorded score
  but **does not fabricate a proficiency level** (a newly recorded skill starts at proficiency 0) — an MCQ confirms
  conceptual knowledge, not practical project ability.
- **Readiness / gap integration:** the existing readiness engine consumes the resolved evidence through its normal path
  (no formula change). Opening or generating an assessment moves nothing; a pass raises readiness; repeating a submission
  does not. The gap engine still reads real proficiency, so assessments never fake gap closure.
- Endpoints: `GET /api/assessments`, `GET /api/assessments/:skillId`, `POST /api/assessments/:skillId/attempts`,
  `GET /api/assessments/:skillId/attempts`, `GET /api/assessments/attempts/:attemptId`,
  `POST /api/assessments/attempts/:attemptId/submit`, and the backward-compatible `POST /api/assessments/:skillId/submit`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 6, Vite 8 |
| Styling | Vanilla CSS Design System (Dark Mode, Glassmorphism) |
| Routing | React Router v7 |
| Icons | Lucide React |
| Backend | Express 5, TypeScript, tsx |
| Auth | JWT (jsonwebtoken) + bcrypt |
| AI | Google Gemini Flash API (model configurable via `GEMINI_MODEL`) |
| Persistence | JSON File Store |
| Testing | Vitest |
| Fonts | Inter, Outfit, JetBrains Mono (Google Fonts) |

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/skillforge-ai.git
cd skillforge-ai

# Install dependencies
npm install

# Start development server (frontend + backend)
npm run dev
```

The app runs at **http://localhost:3000** (frontend) with the API at **http://localhost:5001**.

```bash
# Production Build & Run
npm run build      # Compiles frontend to dist/
npm start          # Runs Express production server (serves API + static frontend)

# Verification & Quality Checks
npm run typecheck  # Type-checks both React frontend and Express server
npm test           # Runs all 18 test suites (235 tests) in isolation
npm run lint       # Runs code linter (oxlint)
```

### Demo Mode

Click **"Explore Demo"** on the landing page to instantly access a pre-seeded evaluator profile (Aarav Sharma, B.Tech CSE, targeting AI/ML Engineer). No registration required.

### Optional: Enable Live AI

```bash
# Add to .env file
GEMINI_API_KEY=your_google_gemini_api_key
```

Without a Gemini key, the AI Coach runs on the **Contextual Deterministic Advisory Engine** — a fully functional, offline-capable fallback.

---

## Testing

```bash
# Run all tests
npm test

# Tests cover:
# ✓ Skill Gap Analysis Engine (3 tests)
# ✓ Roadmap Generation Engine (2 tests)
# ✓ Career Readiness Calculation (3 tests)
# ✓ Readiness Consistency & Delta Integrity (5 tests)
# ✓ Evidence Integrity & Duplicate-Credit Guards (5 tests)
# ✓ Authentication & API Flow (4 tests)
# ✓ Profile Validation (18 tests)
# ✓ Resume Upload & Skill Extraction (21 tests)
# ✓ Career Data Integrity (12 tests)
# ✓ Server API Robustness (22 tests)
# ✓ Error Message Normalization (10 tests)
# ✓ Activity Velocity & Streak Metrics (10 tests)
# ✓ Next-Seven-Days Planner (6 tests)
# ✓ Career Readiness Report PDF (15 tests)
# ✓ Job Description Analyzer (24 tests)
# ✓ Intelligent Weekly Learning Planner (27 tests)
# ✓ Assessment Engine & Skill Verification (31 tests)
# ✓ Persistence Integrity, API Security & Data Consistency (17 tests)
```

**235 tests, 18 suites, 100% passing.**

**Test isolation:** `vitest.config.ts` loads `server/tests/setup.ts`, which points the JSON store at a
throwaway file under the OS temp directory (unique per vitest worker). Tests therefore never read or
write the real `server/db/data.json`, and parallel workers cannot clobber a shared file.

**Storage integrity:** the store writes atomically (temp file + rename), propagates write failures as
`StorageError` instead of reporting false success, and rolls back whole multi-step mutations as one
transaction. A corrupt `data.json` fails fast on startup with an actionable message rather than being
silently re-seeded over; delete or restore the file to recover. The store assumes a single server
process (writes are synchronous and serialized); a multi-process deployment would need a real database.

---

## Project Structure

```
├── server/
│   ├── data/           # Career roles, assessments, projects datasets
│   ├── db/             # JSON file-based persistent store
│   ├── engine/         # Core intelligence algorithms
│   │   ├── gapEngine.ts
│   │   ├── roadmapEngine.ts
│   │   ├── readinessEngine.ts
│   │   ├── jobMatchEngine.ts
│   │   ├── weeklyPlanEngine.ts
│   │   └── assessmentEngine.ts
│   ├── middleware/      # JWT auth middleware
│   ├── routes/          # 13 RESTful API route modules
│   ├── services/        # Resume/job-description extraction, readiness, evidence & next-seven-days services
│   │   ├── readinessService.ts
│   │   ├── evidenceService.ts
│   │   ├── nextSevenDaysService.ts
│   │   ├── jobDescriptionExtractor.ts
│   │   └── pdf/         # Dependency-free PDF writer + readiness report layout
│   ├── tests/           # Vitest test suites
│   └── index.ts         # Express server entry point
├── src/
│   ├── components/      # Navbar, Sidebar, ProtectedRoute, DemoBanner
│   ├── context/         # AuthContext, ToastContext
│   ├── pages/           # 16 fully functional pages
│   ├── services/        # Typed API client
│   ├── hooks/           # Shared React hooks (dialog accessibility)
│   ├── utils/           # Error normalization, validation, activity metrics, job-description schema
│   ├── types/           # Shared TypeScript type definitions
│   ├── index.css        # Design system (CSS variables, components)
│   ├── main.tsx         # React entry point
│   └── App.tsx          # Router configuration
├── index.html           # SEO-optimized HTML template
├── vite.config.ts       # Vite + proxy configuration
├── vitest.config.ts     # Vitest config (loads the test-isolation setup file)
└── package.json
```

---

## Supported Career Tracks

| Career Role | Skills Tracked |
|------------|---------------|
| AI/ML Engineer | 11 skills |
| Software Development Engineer | 10 skills |
| Frontend Developer | 8 skills |
| Backend Developer | 7 skills |
| Full-Stack Developer | 8 skills |
| Data Analyst | 6 skills |
| Data Scientist | 6 skills |
| DevOps & Cloud Engineer | 7 skills |

---

## Evaluator Walkthrough & Demo Script (3–5 Minutes)

For hackathon judges evaluating SkillForge AI:

1. **Step 1: The Problem & Landing Page (0:00 - 0:45)**
   - Open [Landing Page](http://localhost:3000).
   - Point out the core thesis: Indian graduates learn randomly because they lack a personalized, evidence-based bridge between their current skills and industry job requirements.
   - Click **"Explore Demo"** for instant 1-click access to the pre-seeded student profile (**Aarav Sharma**, B.Tech CSE Year 3 targeting **AI/ML Engineer**).

2. **Step 2: Profile & Career Selection (0:45 - 1:15)**
   - Navigate to `/career` to view the 8 curated career roles (10–14 skills each).
   - Navigate to `/profile` to view Aarav's verified skills, academic background, project history, and declared 14 hours/week availability.

3. **Step 3: Deterministic Gap Analysis (1:15 - 1:50)**
   - Navigate to `/analysis`.
   - Explain the deterministic formula: `gap × importance weight = priority score`.
   - Point out **Critical Gaps** (PyTorch, Docker, FastAPI) vs verified foundation skills (Python 85%).

4. **Step 4: Topological Roadmap & Weekly Planner (1:50 - 2:40)**
   - Navigate to `/roadmap`: show dependency-ordered tasks (foundations come before advanced deployment).
   - Navigate to `/planner`: explain the **Intelligent Weekly Planner**:
     - Schedules tasks to strictly fit within Aarav's 14 hours/week budget.
     - Explains unscheduled tasks with honest capacity reasons instead of hiding them.
     - Separates estimated study hours from actual completed hours.

5. **Step 5: Server-Authoritative Skill Verification (2:40 - 3:30)**
   - Navigate to `/assessments`.
   - Select an assessment (e.g. Python or Docker).
   - Note that answer keys and explanations are **never** transmitted to the client before submission.
   - Submit answers: server grades the attempt, provides explanations, awards verified evidence on passing, and rejects duplicate submissions idempotently.

6. **Step 6: Career Readiness Score & PDF Download (3:30 - 4:15)**
   - Navigate to `/dashboard`: inspect the 3-part overview composition (Missing Gaps, Featured Puzzle Piece, Career Readiness Ring).
   - Explain the 3-part canonical formula: **50% Proficiency + 25% Assessment Evidence + 25% Project Evidence**.
   - Navigate to `/report`: click **"Download Official PDF"** to verify the server-generated, pure PDF 1.4 document.

7. **Step 7: Job Description Analyzer & AI Coach (4:15 - 5:00)**
   - Navigate to `/jd-analyzer`: paste a real job posting and click **Analyze**. Show verbatim quotes, match classification, and next steps generated from the canonical gap engine.
   - Navigate to `/ai-coach`: show conversation powered by Google Gemini (or the built-in Deterministic Advisory Engine if offline).

---

## Production Deployment Guide

SkillForge AI supports two production deployment models:

### Model A: Single Full-Stack Service (Recommended for Hackathons)
Express serves both the `/api` REST endpoints and static pre-built frontend files (`dist/`) with automatic client-side SPA routing for all non-API paths.

- **Supported Platforms**: [Render Web Service](https://render.com), [Railway](https://railway.app), [Fly.io](https://fly.io), or any Linux VPS.
- **Build Command**:
  ```bash
  npm install && npm run build
  ```
- **Start Command**:
  ```bash
  npm start
  ```
- **Required Environment Variables**:
  - `PORT`: (Provided dynamically by host, defaults to 5001)
  - `HOST`: `0.0.0.0`
  - `NODE_ENV`: `production`
  - `JWT_SECRET`: Generate a random 64-character secret
- **Optional Environment Variables**:
  - `GEMINI_API_KEY`: (If omitted, system uses Contextual Deterministic Advisory Engine)
  - `SKILLFORGE_DB_FILE`: Path to persistent disk storage (see Persistence Notes below)
- **Health Check Endpoint**: `GET /api/health`

### Model B: Decoupled Hosting (Frontend on Vercel/Netlify + Backend on Render/Railway)

1. **Deploy Backend (Render / Railway)**:
   - Build: `npm install`
   - Start: `npm start`
   - Set `CLIENT_ORIGIN=https://<your-frontend>.vercel.app`
2. **Deploy Frontend (Vercel / Netlify)**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Set `VITE_API_BASE_URL=https://<your-backend>.onrender.com/api`

---

## Database Persistence & Storage Architecture

SkillForge AI utilizes a zero-dependency, transactional JSON file store with:
- **Atomic Writes**: Writes to a process-unique temporary file and executes an atomic OS rename, preventing file corruption on mid-write crashes.
- **Transactional Rollback**: Multi-step operations commit as one unit; any downstream failure rolls back the in-memory cache to the prior disk state.
- **Startup Protection**: Corrupted or unparseable database files trigger a fast-fail `StorageError` to avoid overwriting recoverable student data.

> [!WARNING]
> **Ephemeral Storage Limitation**: Free-tier cloud instances (e.g. Render free tier) utilize ephemeral containers that reset local filesystem changes when the container sleeps or redeploys. To maintain database changes across container restarts in production, attach a **Persistent Disk** (e.g., Render Disk at `/var/data`) and set:
> ```bash
> SKILLFORGE_DB_FILE=/var/data/skillforge/data.json
> ```
> For multi-instance horizontal scaling, a distributed database (e.g. PostgreSQL) would be required; the current architecture is single-process safe.

---

## Key Differentiators

- **Not a course marketplace** — SkillForge AI doesn't sell courses. It analyzes, diagnoses, and prescribes.
- **Explainable AI** — Every score, gap, and recommendation has a transparent formula.
- **Works offline** — Deterministic fallback ensures full functionality without API keys.
- **Measurable impact** — Career Readiness Score provides a quantifiable metric of progress.
- **Industry-validated** — Skill requirements derived from actual job descriptions and industry standards.

---

## License

Built for the SaarthiX Hackathon 2026.
