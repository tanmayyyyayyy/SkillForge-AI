# SkillForge AI — Testing & Verification Guide

> **Current Baseline:** 365 tests across 32 test suites  
> **Status:** 100% Passing (0 failed, 0 skipped)  
> **Test Framework:** Vitest v4.1

---

## 1. Quick Verification Commands

Run these standard scripts from the project root:

```bash
# 1. Run full test suite (365 tests)
npm test

# 2. Run TypeScript typecheck across React client & Express server
npm run typecheck

# 3. Compile production bundle (tsc -b && vite build)
npm run build

# 4. Run Oxlint code analysis
npm run lint
```

---

## 2. Test Architecture & Data Isolation

### 2.1 Temp-Store Isolation (`server/tests/setup.ts`)
Vitest executes with `server/tests/setup.ts` preloaded. The setup hook dynamically redirects `SKILLFORGE_DB_FILE` to a unique temporary file path under the operating system's temp directory:

```ts
// server/tests/setup.ts
process.env.SKILLFORGE_DB_FILE = path.join(
  os.tmpdir(),
  `skillforge_test_${process.pid}_${Math.random().toString(36).slice(2)}.json`
);
```

**Guarantees:**
- **Zero Data Loss:** Tests **never** read or modify the real `server/db/data.json`.
- **Parallel Safety:** Multi-threaded Vitest workers run against isolated files, preventing test pollution or race conditions.
- **Auto-Cleanup:** Temporary test databases are removed in `afterAll` hooks.

---

## 3. Test Suites & Coverage Breakdown

The test suite consists of **32 test files and 365 tests**:

| Category | Test Suite File | Test Count | Key Invariants Covered |
| :--- | :--- | :---: | :--- |
| **End-to-End Integration** | `server/tests/integrationAndFailures.test.ts` | **10** | Complete Job &rarr; Opportunity &rarr; Autopilot &rarr; Skill Proof &rarr; Evidence Graph flow; 9 failure/edge cases. |
| **Career Autopilot** | `server/tests/careerAutopilot.test.ts` | **7** | Action plan derivation, approval gate enforcement, rejection handling, status progression. |
| **Evidence Intelligence** | `server/tests/evidenceIntelligence.test.ts` | **6** | Canonical evidence ledger creation, confidence scoring, tamper protection, deduplication. |
| **Evidence Graph** | `server/tests/evidenceIntegrity.test.ts` | **5** | Directed graph acyclicity, node provenance attachment, causal recommendation traces. |
| **Skill Proof Lab** | `server/tests/skillProofLab.test.ts` | **5** | Code execution assertions, rubric grading, retry handling on failure. |
| **Opportunity Match** | `server/tests/opportunityAction.test.ts` | **5** | JD extraction, quadrant classification, Autopilot proposal generation. |
| **Career Twin & What-If** | `server/tests/whatIfLab.test.ts` | **4** | Parameterized simulations, trajectory calculations, career evolution scenarios. |
| **Readiness Experiment** | `server/tests/readinessExperiment.test.ts` | **5** | 9-stage experiment lifecycle, persistence across database reloads, completion criteria. |
| **Career Intelligence OS** | `server/tests/careerIntelligenceOS.test.ts` | **21** | Public repo metadata analysis, privacy protection (no private tokens), trajectory modeling. |
| **AI Provider & Fallback** | `server/tests/aiProvider.test.ts` | **16** | Offline deterministic fallback, status reporting, sanitized failure logs, no secret leakage. |
| **AI Career Coach** | `server/tests/aiCoach.test.ts` | **18** | Context injection, intent routing, fallback responses without Gemini API key. |
| **Readiness Engine** | `server/tests/readinessEngine.test.ts` | **3** | Formula validation: 50% demonstrated + 25% assessment + 25% project + proof bonus. |
| **Readiness Consistency** | `server/tests/readinessConsistency.test.ts` | **5** | Monotonic score tracking, delta integrity, bounded ranges [0, 100]. |
| **Job Description Analyzer**| `server/tests/jobDescription.test.ts` | **24** | Verbatim quote extraction, confidence scoring, section hierarchy (`required` > `preferred`). |
| **Weekly Learning Planner**| `server/tests/nextSevenDays.test.ts` | **6** | Capacity budgeting, no session over-allocation, unscheduled task explanation. |
| **Skill Gap Analysis** | `server/tests/gapEngine.test.ts` | **3** | Normalized priority scoring (`gap × weight`), critical gap classification. |
| **Roadmap Engine** | `server/tests/roadmapEngine.test.ts` | **2** | Dependency-aware topological sort, preserving completed state. |
| **Resume & PDF Intelligence**| `server/tests/resumeTruth.test.ts` | **8** | Work history verification, honest evidence labelling, pure PDF 1.4 generation. |
| **Resume Extraction** | `server/tests/resumeExtraction.test.ts` | **21** | Deterministic resume parser, skill detection, experience parsing. |
| **Profile Validation** | `server/tests/profileValidation.test.ts` | **18** | Input validation, bounded strings, valid target careers, weekly hours checks. |
| **Server API Robustness** | `server/tests/apiRobustness.test.ts` | **22** | HTTP error codes, malformed payloads, non-existent entity lookups. |
| **Data Persistence Integrity**| `server/tests/persistenceIntegrity.test.ts` | **17** | Atomic file writes, multi-step transaction rollback, corruption fast-fail. |
| **Career Data Integrity** | `server/tests/careerDataIntegrity.test.ts` | **12** | Valid catalog career roles, non-empty skill requirements, valid skill categories. |
| **Client Utilities** | `src/utils/*.test.ts(x)` | **31** | Markdown rendering, error normalization, streak/activity metrics. |

---

## 4. Failure Scenarios Verified

The automated suite tests 9 explicit failure and edge conditions:

1. **Failed Challenge & Retry:** Submitting faulty or incomplete code produces rubric failure with zero evidence; subsequent valid attempt succeeds and records verified evidence.
2. **Duplicate Submission Guard:** Submitting the same challenge solution twice returns `isDuplicate: true`, preserving a single evidence record and preventing duplicate study hours.
3. **Empty / Missing Job Requirements:** Passing empty text or whitespace to Opportunity Match returns HTTP 400 Bad Request.
4. **Rejected Autopilot Action:** Rejecting an action marks it `rejected`, halts execution, and records the event in the Decision Audit Trail.
5. **Zero / Insufficient Evidence:** An empty user ledger calculates 0% readiness baseline safely without runtime errors.
6. **AI Provider Unavailable:** Missing `GEMINI_API_KEY` or upstream timeouts degrade gracefully to the Deterministic Advisory Engine.
7. **Cross-User Authorization Boundaries:** User B cannot read, approve, or mutate User A's Autopilot actions or experiments (HTTP 404 tenant isolation).
8. **Experiment Persistence Across Re-reads:** Active experiment stage, attempts, and goals survive store reload.
9. **Malformed API Payloads:** Negative hours, out-of-range horizon weeks, and invalid skill IDs are rejected with 400.

---

## 5. Manual Smoke Test Checklist

If conducting a manual smoke test on a clean machine:

1. **Start Dev Servers:** `npm run dev`
2. **Open Frontend:** Navigate to `http://localhost:3000`
3. **Log in as Demo:** Click "Explore Demo" &rarr; verifies JWT generation and pre-seeded student profile.
4. **Run Opportunity Match:** Go to `/opportunity-match` &rarr; click "Paste Sample Senior Cloud JD" &rarr; click "Analyze Alignment" &rarr; verify 4 quadrants render.
5. **Approve Action:** Click "Add to Autopilot" &rarr; navigate to `/autopilot` &rarr; click "Approve" &rarr; verify Decision Audit Trail updates.
6. **Pass Skill Challenge:** Go to `/proof-of-skill` &rarr; submit challenge &rarr; verify badge updates to "Verified".
7. **Inspect Evidence Graph:** Go to `/evidence-graph` &rarr; verify proof node appears with 0.95 confidence and clickable drawer.
8. **Simulate Career Twin:** Go to `/career-twin` &rarr; adjust study hours slider &rarr; verify projected readiness responds dynamically.
9. **Reset Demo:** Click "Reset Demo Data" in top banner &rarr; verify system returns cleanly to initial evaluation state.
