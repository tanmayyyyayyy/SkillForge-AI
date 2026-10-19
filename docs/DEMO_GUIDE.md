# SkillForge AI — 3-Minute Hackathon Demo Script & Evaluator Guide

> **Live Application URL:** [https://skillforge-ai-q4tz.onrender.com](https://skillforge-ai-q4tz.onrender.com)  
> **Local Dev URL:** `http://localhost:3000` (API at `http://localhost:5001`)  
> **Pre-seeded Evaluator Account:** `demo.evaluator@skillforge.ai` (Aarav Sharma, Year 3 B.Tech targeting AI/ML Engineer)

---

## Quick Demo Overview (3–5 Minutes)

This walkthrough demonstrates the end-to-end value proposition of SkillForge AI 2.0:
1. **Analyze:** Parse a target job description to uncover missing skill gaps.
2. **Govern:** Propose an autonomous career action with human-in-the-loop approval.
3. **Prove:** Submit practical code in the Skill Proof Lab to earn verifiable evidence.
4. **Trace:** Inspect the Evidence Graph to see the complete provenance trace from job requirement to readiness score.
5. **Simulate:** Explore the Career Twin What-If Lab to project readiness over time.

---

## Step-by-Step Demonstration Script

### Step 1: Instant Demo Login & Mission Control (0:00 – 0:45)
1. Navigate to the application homepage (`/` or `https://skillforge-ai-q4tz.onrender.com`).
2. Click **"Explore Demo"** (or **"Demo Login"**).
   - *What happens:* Automatically logs in as **Aarav Sharma**, pre-seeded with real engineering coursework, verified skills, and project milestones.
3. Observe **Mission Control** (`/mission-control`):
   - Highlight the **Readiness Score** gauge (78% for AI/ML Engineer).
   - Point to the navigation sidebar showing:
     - **Career Autopilot**
     - **Evidence Graph**
     - **Opportunity Match**
     - **Career Twin**
     - **Skill Proof Lab**
   - *Talking point:* *"Students usually learn randomly without knowing what employers actually want. SkillForge AI connects career requirements directly to verifiable evidence."*

---

### Step 2: Opportunity Match & Skill Gap Detection (0:45 – 1:30)
1. Click **Opportunity Match** (`/opportunity-match`) in the sidebar.
2. In the Job Description input card, click **"Paste Sample Senior Cloud JD"** (or paste any target engineering job listing).
3. Click **"Analyze Alignment"**:
   - The analyzer breaks down the job requirements against Aarav's verified evidence ledger.
   - Show the 4-quadrant alignment grid:
     - **Strong Matches (Green):** Python, Data Manipulation.
     - **Missing Skill Gaps (Red):** `Kubernetes`, `Docker`.
4. On the missing **"Kubernetes Pod Lifecycle & Container Orchestration"** gap card, click **"Add to Career Autopilot"**.
   - A success notification confirms the action has been proposed to Autopilot.
   - *Talking point:* *"Instead of just showing gaps, SkillForge bridges gaps straight into an actionable career plan."*

---

### Step 3: Career Autopilot & Human-in-the-Loop Governance (1:30 – 2:15)
1. Navigate to **Career Autopilot** (`/autopilot`).
2. Scroll to the **"Awaiting Approval"** section.
3. Show the newly proposed action card:
   - Notice the badge: `Awaiting Approval`.
   - Point out that Autopilot respects AI safety: it **never** executes unapproved career tasks autonomously.
4. Click **"Approve"**:
   - The card transitions into `In Progress`.
   - Scroll down to the **Decision Audit Trail** at the bottom: point out the timestamped immutable log recording the approval decision.
5. Click **"Start Practical Proof"** on the approved card.
   - The application deep-links straight into the **Skill Proof Lab**.

---

### Step 4: Skill Proof Lab & Canonical Evidence Creation (2:15 – 3:00)
1. In the **Skill Proof Lab** (`/proof-of-skill`), observe the practical challenge:
   - Challenge requirements, difficulty tag, and test criteria.
2. *(Optional Failure Test)* Click **"Submit Proof"** with empty or incomplete code:
   - Show that the evaluation engine runs server-authoritative rubric assertions and rejects incomplete code with actionable error feedback. Zero evidence is awarded.
3. Submit the valid challenge code and click **"Submit Proof"**:
   - The test runner passes all criteria.
   - The badge updates to **Verified**.
   - A direct proof record (`classification: 'direct_proof'`, `confidence: 0.95`) is written to the canonical evidence ledger.
   - *Talking point:* *"Certificates can be faked; SkillForge AI proves actual execution through server-graded code challenges."*

---

### Step 5: Evidence Graph & Recommendation Provenance (3:00 – 3:45)
1. Navigate to **Evidence Graph** (`/evidence-graph`).
2. Observe the interactive directed graph visualization:
   - Show how nodes are connected in a causal sequence:
     `Job Requirement` &rarr; `Required Skill` &rarr; `Recorded Evidence` &rarr; `Recommended Action` &rarr; `Target Readiness`.
3. Click on the newly verified proof node (`proof:...`):
   - The **Node Detail Drawer** opens on the right.
   - Show the recorded provenance metadata:
     - Verification Method: `challenge_passed`
     - Confidence: `95%`
     - Timestamp and accredited hours.
4. Highlight the **Recommendation Trace** panel:
   - *Talking point:* *"Every recommendation is explainable. Students and recruiters can trace exactly why an action was suggested and how it impacts readiness."*

---

### Step 6: Career Twin What-If Lab (3:45 – 4:15)
1. Navigate to **Career Twin** (`/career-twin`).
2. Demonstrate the interactive simulation:
   - Drag the **Study Hours per Week** slider from 5 hours to 15 hours.
   - Observe the projected readiness trajectory and estimated job-readiness date dynamically recalculate.
3. Click on one of the 5 **Career Evolution Scenarios** (e.g. "AI Engineering Pivot"):
   - See how the model projects alternative career tracks based on transferable skills.

---

### Step 7: Verifiable Reset (4:15 – 4:30)
1. In the top sticky banner, click **"Reset Demo Data"**.
2. Confirm the reset.
   - All state cleanly resets to the pristine evaluator baseline, ready for the next evaluator.

---

## Fallback & Offline Resilience

If running offline or without an active `GEMINI_API_KEY`:
- SkillForge AI automatically operates on its built-in **Deterministic Advisory Engine**.
- All gap calculations, roadmaps, assessments, evidence graph links, and what-if simulations function with 100% fidelity.
- Visit **Settings &rarr; System Diagnostics** (`/settings`) to inspect live provider health and status transparently.
