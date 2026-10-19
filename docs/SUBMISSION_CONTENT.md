# SkillForge AI — Hackathon Submission Content Package

> **Hackathon:** SaarthiX Jobs Hackathon 2026  
> **Submission Level:** Level 2 (MVP Submission)  
> **Date:** 19 October 2026

This document contains copy-paste materials for the official SaarthiX Jobs hackathon submission form.

---

## A. Project Title
```
SkillForge AI
```

---

## B. One-Line Pitch
```
Turn career goals into measurable skills, verifiable proof, and actionable job readiness.
```

---

## C. Solution Statement / Description (218 Words)

*Copy and paste directly into the "Solution Statement / Description" field:*

> SkillForge AI is an explainable career readiness platform that turns ambiguous job market demands into measurable skills, verifiable proof, and actionable career advancement. Designed for engineering students and job seekers facing skill opacity and unstructured learning, SkillForge AI replaces guesswork with a deterministic, evidence-backed career acceleration engine.
>
> Users begin by targeting industry roles or pasting live job descriptions. The platform's Opportunity Match analyzer extracts requirements and contrasts them with the learner’s profile, surfacing prioritized skill gaps. To close these gaps, Career Autopilot proposes approval-gated actions that strictly require human consent before execution. Learners complete server-authoritative practical coding challenges in the Skill Proof Lab, where solutions are evaluated against rigorous test assertions.
>
> Passing work generates canonical evidence with tamper-resistant provenance, updating an interactive Evidence Graph that links job requirements to demonstrated mastery. A formula-driven Career Readiness Score (0–100%) dynamically tracks progress across demonstrated proficiency, verified assessments, and portfolio milestones.
>
> What sets SkillForge AI apart is radical transparency: every recommendation includes a causal trace, and an offline-capable Deterministic Advisory Engine guarantees dependable guidance even without external AI keys. Built on React 19, TypeScript, Express 5, and Google Gemini with transactional persistence, SkillForge AI proves genuine readiness to employers beyond generic certificates.

---

## D. Short Description (68 Words)

*Alternative for short-form submission boxes:*

> SkillForge AI is an explainable career acceleration platform for engineering graduates. It analyzes job descriptions against student profiles, calculates deterministic skill gaps, and coordinates approval-gated Career Autopilot actions. Learners complete practical coding challenges to generate tamper-resistant evidence recorded on an interactive Evidence Graph. Powered by React 19, TypeScript, Express 5, and Google Gemini with deterministic offline fallback, SkillForge AI provides transparent, formula-driven career readiness scoring.

---

## E. Key Features

1. **Opportunity Match & Skill Gap Analysis:** Deterministically contrasts target job postings against verified student skills to categorize gaps by priority (`gap × importance weight`).
2. **Career Autopilot with Human Governance:** Proposes personalized career actions with strict human-in-the-loop approval gating and an immutable Decision Audit Trail.
3. **Skill Proof Lab:** Server-authoritative practical coding challenges evaluated against rigorous test criteria to verify conceptual and practical competency.
4. **Canonical Evidence Ledger:** Immutable, tamper-resistant evidence logging with confidence scores, verification methods, and accredited hours.
5. **Interactive Evidence Graph & Recommendation Trace:** Visual directed graph tracing causal paths from job requirements through required skills, evidence, and actions to target readiness.
6. **Career Twin What-If Lab:** Parameterized slider simulation projecting readiness trajectories based on weekly study hours, intensity, and career evolution scenarios.
7. **Transparent Career Readiness Score:** Formula-driven scoring ($50\%$ demonstrated proficiency + $25\%$ assessment verification + $25\%$ project evidence + proof bonuses).
8. **Dual-Mode AI Resilience:** Powered by Google Gemini Flash with an automatic fallback to an offline Deterministic Advisory Engine, ensuring zero crashes.

---

## F. Technical Implementation

SkillForge AI is architected as a high-performance, single-repository full-stack application. The frontend is built on **React 19** and **TypeScript 6** bundled with **Vite 8**, featuring a responsive vanilla CSS design system and code-split routing. The backend runs on **Node.js** with **Express 5** and TypeScript, exposing a modular RESTful API secured by **JWT authentication** and strict tenant isolation. The intelligence layer combines **Google Gemini 3.8 Flash** with an offline **Deterministic Advisory Engine** for fail-safe rubric evaluation and gap analysis. Persistence is handled by a zero-dependency transactional JSON store utilizing atomic POSIX file renames and multi-step rollbacks.

---

## G. Live Demo URL
```
https://skillforge-ai-q4tz.onrender.com
```
- **Status:** **Verified Live** (HTTP 200 OK on health endpoint, authenticated demo session active).
- **Instant Demo Access:** Click **"Explore Demo"** on the landing page to load Aarav Sharma's evaluator profile (`demo.evaluator@skillforge.ai`).

---

## H. Source Code Repository
```
https://github.com/tanmayyyyayyy/SkillForge-AI
```
- **Branch:** `main`
- **Testing:** 365 passing tests across 32 test suites (`npm test`).

---

## I. Demo Video Narration Script (2–3 Minutes)

*Use this script when recording or narrating the demonstration screen capture:*

- **[0:00 - 0:30] Introduction & Problem:**  
  *"Every year, millions of engineering graduates struggle to find jobs not because they aren't learning, but because they learn randomly. They face skill opacity—not knowing which skills employers actually require—and an evidence gap, unable to prove their capabilities beyond generic certificates. This is SkillForge AI: the platform that turns career goals into measurable skills, verifiable proof, and actionable readiness."*

- **[0:30 - 1:00] Instant Demo & Opportunity Match:**  
  *"Let's jump into Mission Control with our pre-seeded student, Aarav Sharma, targeting an AI/ML Engineer role. Aarav has a current readiness score of 78%. Let's head to Opportunity Match. Aarav pastes a live job description for a Senior Cloud & ML role. With one click, SkillForge deterministically parses the posting, identifying strong matches like Python, but immediately highlights a critical missing gap: Kubernetes and container orchestration."*

- **[1:00 - 1:35] Career Autopilot & Human-in-the-Loop Governance:**  
  *"Instead of leaving this gap as a passive observation, we click 'Add to Career Autopilot'. In the Autopilot board, notice that the action is not executed blindly—it sits in 'Awaiting Approval'. SkillForge AI respects AI governance: autonomous career recommendations require explicit student consent. Aarav clicks 'Approve', which logs an immutable entry in the Decision Audit Trail, moving the action to In Progress."*

- **[1:35 - 2:10] Skill Proof Lab & Canonical Evidence:**  
  *"From the approved action, Aarav clicks into the Skill Proof Lab. Here, he solves a hands-on practical coding challenge. If he submits incomplete code, our server-side evaluator rejects it with actionable feedback. Once he implements the correct solution and clicks Submit Proof, the test assertions pass, awarding a verified direct proof credential to his canonical evidence ledger."*

- **[2:10 - 2:40] Evidence Graph & Recommendation Trace:**  
  *"Navigating to the Evidence Graph, we can see the magic. The newly passed proof creates an active node with a 95% confidence score. By clicking the node, recruiters and students see the complete provenance trace—linking the exact job requirement to the skill, the evidence record, and the resulting readiness increase. No black boxes, no hallucinations."*

- **[2:40 - 3:00] Career Twin & Conclusion:**  
  *"Finally, in the Career Twin What-If Lab, Aarav simulates his trajectory, seeing how adjusting his weekly hours from 5 to 15 hours compresses his time to job readiness. With 365 automated tests, zero external database overhead, and seamless offline AI fallback, SkillForge AI is ready to transform engineering education. Thank you."*

---

## J. Submission File Recommendation

The SaarthiX Jobs hackathon platform accepts: **PDF, MP4, AVI, MOV, MKV, and WEBM**.

### Upload Options:
1. **Primary Option — Official Career Readiness Report (PDF) [VERIFIED & AVAILABLE NOW]:**  
   A verified, 5-page official PDF report has been generated directly from the live platform for our evaluator profile (Aarav Sharma):  
   `docs/SkillForge_AI_Official_Readiness_Report_Aarav_Sharma.pdf`  
   This document is fully compliant with the platform's accepted PDF format and can be uploaded immediately.
2. **Alternative Option — Screen Recording Video (MP4 / WEBM):**  
   If you have 5 minutes to capture a screen recording, follow the 2.5-minute narration script in Section I using QuickTime, Loom, or OBS while clicking through `http://localhost:3000` or `https://skillforge-ai-q4tz.onrender.com`, save it as an MP4 or WEBM file, and upload it.

---

## K. Final Submission Step-by-Step Checklist

1. Log in to the SaarthiX Jobs hackathon portal.
2. Select your Level 2 MVP Submission.
3. Paste `https://skillforge-ai-q4tz.onrender.com` into the **Submission Link** field.
4. Copy the text from **Section C** (218 words) into the **Solution Statement / Description** field.
5. Upload your demonstration MP4 screen recording or the PDF walkthrough.
6. Verify all fields and click **Submit**.
