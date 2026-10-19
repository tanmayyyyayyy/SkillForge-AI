# SkillForge AI — Known Limitations & Operational Considerations

> **Version:** 2.0 MVP  
> **Platform Target:** SaarthiX Jobs Hackathon 2026

This document provides a factual, transparent record of current architectural boundaries, hardware dependencies, and operational trade-offs in SkillForge AI 2.0.

---

## 1. Cloud Persistence & Ephemeral Filesystems

### Limitation
The backend uses a high-performance transactional JSON file store (`server/db/data.json`). When hosted on **Render's Free Tier** (or equivalent ephemeral container platforms):
- The container's local disk is ephemeral.
- If the instance enters sleep mode due to inactivity (typically after 15 minutes of zero traffic) or restarts during a deployment, any student data or assessment submissions written since container startup are reset to the initial seed state.

### Mitigation & Production Recommendation
1. **Pristine Evaluator Reset:** For hackathon evaluations, the ephemeral reset actually ensures each evaluator starts with clean, consistent demo data via `POST /api/auth/demo/reset`.
2. **Persistent Disk Support:** Render supports attached Persistent Disks on paid plans (Starter and up). SkillForge AI already supports this via the `SKILLFORGE_DB_FILE` environment variable:
   ```yaml
   # render.yaml snippet
   disk:
     name: skillforge-data
     mountPath: /var/data/skillforge
     sizeGB: 1
   envVars:
     - key: SKILLFORGE_DB_FILE
       value: /var/data/skillforge/data.json
   ```
3. **Long-Term Evolution:** Replace the JSON file adapter with a PostgreSQL or CockroachDB driver for horizontal multi-region scaling.

---

## 2. AI Provider Latency, Timeouts & Fallback Honesty

### Limitation
Live generative AI capabilities rely on the Google Gemini API (`gemini-3.8-flash`). In certain geographic regions or during high cloud traffic:
- Upstream requests to Gemini may experience latency or timeout after the configured 15-second client timeout window (as observed during cold starts).
- Network rate limits or quota ceilings on free-tier Gemini API keys can reject calls.

### Fallback Guarantee
- **Deterministic Advisory Engine:** SkillForge AI is architected with a 100% offline-capable Deterministic Advisory Engine.
- **No Fabricated Output:** The application never falsely claims a deterministic response came from Gemini.
- **Real-Time Health Diagnostics:** The `/settings` page and `/api/ai-provider/status` endpoint report the exact runtime health (`connected`, `request_failed`, `not_configured`, or `fallback_active`).

---

## 3. Practical Code Challenge Evaluation Scope

### Limitation
In the **Skill Proof Lab** (`/proof-of-skill`) and **Readiness Experiment** (`/experiment`):
- Code challenges are evaluated using static structural analysis, test-case pattern assertions, and deterministic rubric matching.
- Untrusted user code is not executed inside isolated multi-tenant Docker containers or sandboxed virtual machines.

### Rationale & Boundary
- Running full isolated Docker containers requires privileged Docker-in-Docker daemons or external execution microservices (e.g. Judge0), which introduce significant operational cost and attack surface during a hackathon MVP.
- The existing deterministic rubric evaluation verifies algorithmic patterns, required function signatures, test assertions, and boundary checks reliably without security overhead.

---

## 4. Single-Process Concurrency Boundary

### Limitation
- The JSON storage engine performs atomic POSIX file renames and synchronizes in-memory mutations within the single running Node.js process.
- If deployed across multiple clustered Node.js worker processes or load-balanced across multiple container instances, workers would write to independent files or experience write conflicts without a shared distributed lock.

### Production Solution
- For single-container deployments (such as the current Render deployment), the single-process architecture is safe and zero-dependency.
- Multi-instance deployments should transition storage to a centralized database (PostgreSQL + Prisma / Drizzle).

---

## 5. Curated Career Role Catalog Scope

### Limitation
- The platform currently tracks **8 industry-standard technical roles**:
  1. AI/ML Engineer (11 skills)
  2. Software Development Engineer (10 skills)
  3. Frontend Developer (8 skills)
  4. Backend Developer (7 skills)
  5. Full-Stack Developer (8 skills)
  6. Data Analyst (6 skills)
  7. Data Scientist (6 skills)
  8. DevOps & Cloud Engineer (7 skills)
- Non-technical roles (e.g. Product Management, Graphic Design, Legal) are not currently populated in the career catalog.

### Rationale
- Specializing in core engineering tracks ensures high fidelity, accurate dependency graphs, and robust MCQ and practical challenge coverage rather than shallow, superficial coverage across hundreds of undefined roles.
