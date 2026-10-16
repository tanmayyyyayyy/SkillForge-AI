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
4. **Verifies** skill proficiency through timed, MCQ-based assessments with detailed explanations
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
│  • 50+ Skill Assessment Questions            │
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
- **Primary**: Google Gemini 1.5 Flash with full profile context injection
- **Fallback**: Contextual Deterministic Advisory Engine — functions fully offline
- Intent classification: detects queries about learning priorities, projects, scheduling, interviews, and blockers
- Suggested follow-up actions for guided conversations

### 5. Skill Verification Assessments
- Timed, MCQ-based assessments with 5 questions per skill
- Detailed per-question explanations
- Assessment results directly update skill proficiency and readiness score
- Prevents score inflation through verification requirements

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
| AI | Google Gemini 1.5 Flash API |
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
# ✓ Authentication & API Flow (4 tests)
# ✓ Profile Validation (18 tests)
# ✓ Resume Upload & Skill Extraction (21 tests)
# ✓ Career Data Integrity (12 tests)
# ✓ Server API Robustness (22 tests)
```

**85 tests, 8 suites, 100% passing.**

---

## Project Structure

```
├── server/
│   ├── data/           # Career roles, assessments, projects datasets
│   ├── db/             # JSON file-based persistent store
│   ├── engine/         # Core intelligence algorithms
│   │   ├── gapEngine.ts
│   │   ├── roadmapEngine.ts
│   │   └── readinessEngine.ts
│   ├── middleware/      # JWT auth middleware
│   ├── routes/          # 11 RESTful API route modules
│   ├── tests/           # Vitest test suites
│   └── index.ts         # Express server entry point
├── src/
│   ├── components/      # Navbar, Sidebar, ProtectedRoute, DemoBanner
│   ├── context/         # AuthContext, ToastContext
│   ├── pages/           # 14 fully functional pages
│   ├── services/        # Typed API client
│   ├── types/           # Shared TypeScript type definitions
│   ├── index.css        # Design system (CSS variables, components)
│   ├── main.tsx         # React entry point
│   └── App.tsx          # Router configuration
├── index.html           # SEO-optimized HTML template
├── vite.config.ts       # Vite + proxy configuration
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

## Evaluator Walkthrough

1. **Landing Page** → Click "Explore Demo" → Instant demo login
2. **Dashboard** → Overview of readiness score, top gaps, active roadmap tasks
3. **Gap Analysis** → Full skill-by-skill gap breakdown with priority badges
4. **Learning Roadmap** → Dependency-ordered tasks with estimated hours
5. **Skill Assessments** → Take a quiz, see results update readiness score
6. **Project Hub** → Recommended portfolio projects with milestone tracking
7. **AI Coach** → Ask "What should I learn next?" — get personalized advice
8. **Analytics** → Progress velocity, hours invested, readiness trend
9. **Readiness Report** → Printable official career readiness document

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

