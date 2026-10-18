import { Router, Response } from 'express';
import { db } from '../db/store.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { CAREER_ROLES } from '../data/careers.js';
import { calculateSkillGaps } from '../engine/gapEngine.js';
import { calculateCareerReadiness } from '../engine/readinessEngine.js';
import { callGeminiText, geminiEngineLabel, isGeminiConfigured } from '../services/geminiClient.js';
import { AiCoachMessage } from '../../src/types/index.js';

export const aiCoachRouter = Router();

const DETERMINISTIC_ENGINE = 'Deterministic Advisory Engine';

// Get conversation history
aiCoachRouter.get('/messages', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  const messages = db.getAiMessages(req.userId!);
  res.json({ messages });
});

// Post a question to AI Coach
aiCoachRouter.post('/chat', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      res.status(400).json({ error: 'Please enter a valid message or question.' });
      return;
    }

    const profile = db.getProfile(req.userId!);
    if (!profile) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }

    const role = CAREER_ROLES.find(r => r.id === profile.targetRole) || CAREER_ROLES[0];
    const gaps = calculateSkillGaps(profile, role);
    const assessments = db.getAssessments(req.userId!);
    const projects = db.getProjects(req.userId!);
    const readiness = calculateCareerReadiness(profile, role, assessments, projects);
    const roadmapTasks = db.getRoadmapTasks(req.userId!);

    const userPromptLower = prompt.toLowerCase();
    let replyContent = '';
    let engineUsed: string = DETERMINISTIC_ENGINE;
    let suggestedActions: string[] = [];

    // Attempt a live Gemini reply when an API key is configured. Any failure
    // (HTTP error, timeout, retired model, empty candidate) returns null and
    // falls through to the deterministic engine — but it is always logged.
    if (isGeminiConfigured()) {
      const topGapsText = gaps.items.filter(i => i.gap > 0).slice(0, 4).map(i => `${i.name} (gap: ${i.gap}, priority: ${i.priorityBadge})`).join(', ');
      const inProgressTask = roadmapTasks.find(t => t.status === 'in_progress')?.skillName || 'None active';
      const passedAssessmentsText = assessments.filter(a => a.passed).map(a => a.skillName).join(', ') || 'None yet';

      const systemPrompt = `You are the SkillForge AI Career Intelligence Coach — a personal career mentor for ${role.title} aspirants.

The student's question is your primary instruction. Answer exactly what was asked. The profile below is context for personalizing your answer (their skills, gaps, target role, availability) — never substitute a generic profile summary for the question they actually asked.

Student Profile (personalization context):
- Name: ${profile.fullName}
- Education: ${profile.degree} (${profile.educationLevel}, Class of ${profile.graduationYear})
- Target Role: ${role.title} (${role.category})
- Current Career Readiness Score: ${readiness.overallScore}%
- Top Missing Skills: ${topGapsText || 'None, all target skills mastered!'}
- Currently in-progress roadmap task: ${inProgressTask}
- Verified Assessments: ${passedAssessmentsText}
- Weekly Study Availability: ${profile.weeklyHours} hours/week
- Learning Style: ${profile.preferredLearningStyle}

Response rules:
1. Be encouraging, direct, and practical for the ${role.title} role.
2. Use markdown: '###' section headers, bold for emphasis, and bullet or numbered lists.
3. Match depth to the request. A quick question gets a short answer. A request for a roadmap, plan, or schedule gets the complete structure that was asked for — never cut it short and never pad it with generic filler.
4. When asked for a multi-week roadmap or study plan, always include: four weekly objectives; a task for every single day of the plan; a concrete deliverable for each week; one final capstone project; and realistic time estimates that fit the student's ${profile.weeklyHours} hours/week availability.`;

      const candidateText = await callGeminiText(`${systemPrompt}\n\nStudent question: ${prompt}`, {
        temperature: 0.7,
        maxOutputTokens: 4096,
        timeoutMs: 30000
      });

      if (candidateText) {
        replyContent = candidateText;
        engineUsed = geminiEngineLabel();
      }
    }

    // Contextual Deterministic Advisory Engine (Robust, reliable fallback)
    if (!replyContent) {
      engineUsed = DETERMINISTIC_ENGINE;
      const criticalGaps = gaps.items.filter(i => i.priorityBadge === 'Critical' || i.priorityBadge === 'High');
      const topGap = criticalGaps[0] || gaps.items[0];
      const verifiedCount = assessments.filter(a => a.passed).length;
      const activeProject = projects.find(p => p.userStatus === 'in_progress') || projects[0];

      if (userPromptLower.includes('next') || userPromptLower.includes('what to learn') || userPromptLower.includes('first')) {
        replyContent = `### Recommended Next Action for ${role.title}

Based on your current readiness score of **${readiness.overallScore}%**, your highest-impact skill gap is **${topGap ? topGap.name : 'foundational practice'}**.

1. **Why it matters:** ${topGap ? topGap.reason : 'It is a core requirement for this career track.'}
2. **Immediate Focus:** Dedicate **${Math.min(profile.weeklyHours, 8)} hours** this week to ${topGap ? topGap.name : 'core concepts'}.
3. **Practice Milestone:** Work towards: *${topGap?.nextRecommendedAction || 'Complete foundational exercises'}*.

Once you feel confident, take the **${topGap?.name || 'skill'} Assessment** in SkillForge to formally verify your competency and boost your readiness score.`;
        suggestedActions = [
          `How do I practice ${topGap?.name || 'this skill'}?`,
          'Which project will best prove my missing skills?',
          `How should I structure my ${profile.weeklyHours} hours this week?`
        ];
      } else if (userPromptLower.includes('project') || userPromptLower.includes('build') || userPromptLower.includes('portfolio')) {
        replyContent = `### High-Impact Project Recommendation

To prove your skills for the **${role.title}** role, recruiters look for projects that demonstrate real system design and business value:

**Recommended Project:** **${activeProject.title}**
- **Difficulty:** ${activeProject.difficulty}
- **Skills Demonstrated:** ${activeProject.skillsDemonstrated.join(', ')}
- **Why it stands out:** ${activeProject.whyItMatters}

**Suggested Roadmap:**
${activeProject.milestones.map((m, idx) => `${idx + 1}. **${m.title}:** ${m.description}`).join('\n')}

> Completing this project and adding your GitHub repository link in the Projects section will award you **+10% to +15% Career Readiness**!`;
        suggestedActions = [
          'What are the core evaluation criteria for this project?',
          'What should I learn next?',
          'How should I prepare for technical interviews?'
        ];
      } else if (userPromptLower.includes('hour') || userPromptLower.includes('time') || userPromptLower.includes('schedule') || userPromptLower.includes('week')) {
        const halfHours = Math.round(profile.weeklyHours * 0.5);
        const projectHours = Math.round(profile.weeklyHours * 0.35);
        const reviewHours = profile.weeklyHours - halfHours - projectHours;

        replyContent = `### Weekly Study Plan (${profile.weeklyHours} Hours Available)

Here is a structured, high-retention weekly breakdown aligned with your **${profile.preferredLearningStyle}** preference:

- **Phase 1: High-Priority Skill Gap (${halfHours} hrs/week):**
  - Focus: **${topGap?.name || 'Primary Skill Gap'}**
  - Activity: Theory, documentation, and targeted coding exercises.
- **Phase 2: Project Implementation (${projectHours} hrs/week):**
  - Focus: Milestones for **${activeProject.title}**
  - Activity: Write modular code, add error handling, and commit to GitHub.
- **Phase 3: Assessment & Review (${reviewHours} hrs/week):**
  - Take skill quizzes and review incorrect answers to lock in retention.

*Consistency beats cramming: sticking to this schedule will advance your career readiness by ~4-6% each week.*`;
        suggestedActions = [
          'What should I learn next?',
          'What is blocking my progress right now?',
          'How do I prepare for technical interviews?'
        ];
      } else if (userPromptLower.includes('interview') || userPromptLower.includes('prepare') || userPromptLower.includes('hired')) {
        replyContent = `### Interview Preparation Strategy for ${role.title}

Top employers like **${profile.targetCompanies.slice(0, 3).join(', ') || 'industry leaders'}** evaluate candidates across three dimensions:

1. **Foundational Competence (40%):** Can you explain core concepts clearly? Make sure you take our skill assessments to test conceptual rigor.
2. **Practical System Construction (40%):** Have you built non-trivial applications? Recruiters want to see code organization, testing, and deployment rather than clone tutorials.
3. **Communication & Trade-offs (20%):** Can you explain *why* you chose a specific technology over alternatives?

**Next Step:** Your readiness score is **${readiness.overallScore}%**. Target reaching **70%+** before scheduling primary technical screens.`;
        suggestedActions = [
          'What should I learn next?',
          'Which project should I build?',
          'What is blocking my progress right now?'
        ];
      } else if (userPromptLower.includes('block') || userPromptLower.includes('stuck') || userPromptLower.includes('weakness')) {
        replyContent = `### Progress Diagnostic

Here is what is currently limiting your career readiness score (**${readiness.overallScore}%**):

- **Unverified Skills:** You have ${verifiedCount === 0 ? 'zero verified assessments' : `only ${verifiedCount} verified skill(s)`}. Self-reported skills only count for partial weight until tested.
- **Top Skill Gap:** **${topGap?.name}** requires ${topGap?.estimatedLearningHours} hours of targeted learning.
- **Missing Project Evidence:** Providing verified repository or live demo links provides up to **25% bonus** in overall career readiness.

**Action to Unblock:** Complete 1 skill assessment today and commit your latest project milestone.`;
        suggestedActions = [
          'What should I learn next?',
          'Which project should I build?',
          'How should I structure my study hours?'
        ];
      } else if (
        userPromptLower.includes('roadmap') ||
        userPromptLower.includes('30-day') ||
        userPromptLower.includes('30 day') ||
        userPromptLower.includes('month') ||
        userPromptLower.includes('study plan') ||
        userPromptLower.includes('learning plan') ||
        userPromptLower.includes('day plan')
      ) {
        const perDayHours = Math.round((profile.weeklyHours / 7) * 10) / 10;
        replyContent = `### 30-Day ${role.title} Roadmap

Built for **${profile.weeklyHours} hours/week** (~${profile.weeklyHours * 4} hours total), aligned with your **${profile.preferredLearningStyle}** learning style. Your anchor skill throughout: **${topGap?.name || 'core fundamentals'}**.

#### Week 1 — Foundations
- **Day 1:** Set up your environment and map the ${role.title} skill landscape (~${perDayHours}h).
- **Days 2–7 (one focused task per day):** Core theory and documentation for **${topGap?.name || 'fundamentals'}**, with short coding drills each evening.
- **Deliverable:** Study notes repo plus 10 solved practice exercises committed to GitHub.

#### Week 2 — Guided Practice
- **Days 8–14 (one task per day):** Tutorials and small exercises that apply Week 1 concepts, increasing difficulty through the week.
- **Deliverable:** A mini-project demonstrating your top gap skill end to end.

#### Week 3 — Capstone Build
- **Days 15–21 (one milestone per day):** Build **${activeProject.title}**, committing working increments daily.
- **Deliverable:** Deployed or demo-ready repository with a clear README.

#### Week 4 — Integration & Interview Prep
- **Days 22–28 (one task per day):** Polish the capstone, write one technical blog or README walkthrough, drill behavioral answers.
- **Days 29–30:** Review all notes, take the **${topGap?.name || 'skill'} Assessment** in SkillForge, and publish your portfolio.
- **Final project:** Ship the capstone with tests and documentation to demonstrate ${role.title}-level competence.

*This is the offline fallback plan. For a fully personalized day-by-day version generated by live AI, ask again once the Gemini API is reachable.*`;
        suggestedActions = [
          'What should I learn next?',
          'Which project will best prove my missing skills?',
          'How do I prepare for technical interviews?'
        ];
      } else {
        replyContent = `### Career Intelligence Analysis

You are preparing for the **${role.title}** career path with **${readiness.overallScore}%** readiness.

**Key Insights:**
- **Top Priority Gap:** **${topGap?.name}** (${topGap?.priorityBadge} Priority)
- **Target Commitment:** ${profile.weeklyHours} hours weekly
- **Recommended Milestone:** ${activeProject.title}

Feel free to ask me any of the following to accelerate your progress:
- *What should I learn next?*
- *Which project should I build to demonstrate my skills?*
- *How should I structure my weekly hours?*
- *How can I prepare for technical interviews?*`;
        suggestedActions = [
          'What should I learn next?',
          'Which project should I build?',
          `How should I use my ${profile.weeklyHours} weekly hours?`,
          'What is blocking my progress right now?'
        ];
      }
    }

    // The stored user turn records the engine that actually produced this
    // reply — never "Gemini" just because a key happens to be configured.
    const userMessage: AiCoachMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: prompt.trim(),
      timestamp: new Date().toISOString(),
      engineUsed
    };

    const assistantMessage: AiCoachMessage = {
      id: `msg_a_${Date.now()}`,
      role: 'assistant',
      content: replyContent,
      timestamp: new Date().toISOString(),
      engineUsed,
      suggestedActions
    };

    // Persist the user turn and the reply together so the transcript never ends
    // up with one message missing when storage fails mid-write.
    db.transaction(() => {
      db.addAiMessage(req.userId!, userMessage);
      db.addAiMessage(req.userId!, assistantMessage);
    });

    res.json({
      message: assistantMessage,
      engineUsed
    });
  } catch (err) {
    console.error('AI Coach error:', err);
    res.status(500).json({ error: 'Failed to generate career coach response.' });
  }
});
