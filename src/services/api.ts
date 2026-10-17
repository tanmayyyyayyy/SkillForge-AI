import {
  User,
  StudentProfile,
  CareerRole,
  SkillGapAnalysisResult,
  RoadmapResult,
  RoadmapTask,
  ProjectRecommendation,
  SkillAssessment,
  AssessmentResult,
  AssessmentAttemptSummary,
  AssessmentAttemptView,
  CareerReadinessScore,
  LearningActivityLog,
  AiCoachMessage,
  ResumeExtractionResult,
  ReadinessReportPayload,
  JobDescriptionAnalysis,
  WeeklyPlan
} from '../types/index.js';
import { toUserMessage } from '../utils/errorMessage.js';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') || '/api';

export const UNAUTHORIZED_EVENT = 'skillforge:unauthorized';

export function getAuthToken(): string | null {
  return localStorage.getItem('skillforge_auth_token');
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem('skillforge_auth_token', token);
  } else {
    localStorage.removeItem('skillforge_auth_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });
  } catch (err) {
    throw new Error(toUserMessage(err, 'Network error: could not reach the server.'));
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Session expiry: a token was sent but the server rejected it. Clear the
    // stale token and let AuthContext log the user out and redirect.
    if (response.status === 401 && token && !endpoint.startsWith('/auth/')) {
      setAuthToken(null);
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    const errorMsg = data?.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

/**
 * Fetches a binary file (e.g. the readiness PDF) with the auth token attached.
 * Mirrors `request`'s 401 handling but returns a Blob plus the server-provided
 * filename instead of parsing JSON.
 */
async function requestFile(endpoint: string): Promise<{ blob: Blob; filename: string | null }> {
  const token = getAuthToken();
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, { headers });
  } catch (err) {
    throw new Error(toUserMessage(err, 'Network error: could not reach the server.'));
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      setAuthToken(null);
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    let message = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
      // Non-JSON error body; keep the status-based message.
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return { blob, filename: match ? match[1] : null };
}

export const api = {
  // Auth
  auth: {
    register: (name: string, email: string, password: string) =>
      request<{ token: string; user: User; profile: StudentProfile }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      }),
    login: (email: string, password: string) =>
      request<{ token: string; user: User; profile: StudentProfile }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }),
    demoLogin: () =>
      request<{ token: string; user: User; profile: StudentProfile }>('/auth/demo', {
        method: 'POST'
      }),
    demoReset: () =>
      request<{ message: string }>('/auth/demo/reset', {
        method: 'POST'
      }),
    getMe: () =>
      request<{ user: User; profile: StudentProfile }>('/auth/me')
  },

  // Careers
  careers: {
    getAll: () =>
      request<{ careers: Array<Partial<CareerRole>> }>('/careers'),
    getById: (id: string) =>
      request<{ career: CareerRole }>(`/careers/${id}`)
  },

  // Profile
  profile: {
    get: () =>
      request<{ profile: StudentProfile }>('/profile'),
    update: (profile: Partial<StudentProfile>) =>
      request<{ profile: StudentProfile; message: string }>('/profile', {
        method: 'PUT',
        body: JSON.stringify(profile)
      }),
    updateSkill: (skillData: { skillId: string; name?: string; category?: string; proficiency: number; status?: string }) =>
      request<{ profile: StudentProfile; message: string }>('/profile/skills', {
        method: 'PATCH',
        body: JSON.stringify(skillData)
      })
  },

  // Analysis
  analysis: {
    get: (roleId?: string) =>
      request<{ analysis: SkillGapAnalysisResult }>(`/analysis${roleId ? `?roleId=${roleId}` : ''}`)
  },

  // Roadmap
  roadmap: {
    get: () =>
      request<{ roadmap: RoadmapResult }>('/roadmap'),
    updateTask: (taskId: string, updates: { status?: string; completionPercentage?: number; userNotes?: string }) =>
      request<{ task: RoadmapTask; message: string }>(`/roadmap/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      })
  },

  // Projects
  projects: {
    get: () =>
      request<{ projects: ProjectRecommendation[] }>('/projects'),
    toggleMilestone: (projectId: string, milestoneId: string, completed?: boolean) =>
      request<{ project: ProjectRecommendation; message: string }>(`/projects/${projectId}/milestones/${milestoneId}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed })
      }),
    submitEvidence: (projectId: string, evidence: { repoUrl?: string; demoUrl?: string; notes?: string }) =>
      request<{ project: ProjectRecommendation; message: string }>(`/projects/${projectId}/evidence`, {
        method: 'POST',
        body: JSON.stringify(evidence)
      })
  },

  // Assessments
  assessments: {
    getAll: () =>
      request<{ assessments: Array<any> }>('/assessments'),
    getQuestions: (skillId: string) =>
      request<{ assessment: SkillAssessment; attempts: AssessmentAttemptSummary[] }>(`/assessments/${skillId}`),
    startAttempt: (skillId: string) =>
      request<{ attempt: AssessmentAttemptView }>(`/assessments/${skillId}/attempts`, {
        method: 'POST'
      }),
    listAttempts: (skillId: string) =>
      request<{ attempts: AssessmentAttemptSummary[] }>(`/assessments/${skillId}/attempts`),
    getAttempt: (attemptId: string) =>
      request<{ attempt: AssessmentAttemptView | AssessmentAttemptSummary; result?: AssessmentResult }>(`/assessments/attempts/${attemptId}`),
    submitAttempt: (attemptId: string, answers: Record<string, number>) =>
      request<{ result: AssessmentResult; gradedQuestions: any[]; message: string; alreadyGraded?: boolean }>(`/assessments/attempts/${attemptId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers })
      }),
    submit: (skillId: string, answers: Record<string, number>) =>
      request<{ result: AssessmentResult; gradedQuestions: any[]; message: string }>(`/assessments/${skillId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers })
      })
  },

  // Readiness
  readiness: {
    get: () =>
      request<{ readiness: CareerReadinessScore; history: number[] }>('/readiness'),
    getReport: () =>
      request<{ report: ReadinessReportPayload }>('/readiness/report'),
    downloadReportPdf: () =>
      requestFile('/readiness/report/pdf')
  },

  // AI Coach
  ai: {
    getMessages: () =>
      request<{ messages: AiCoachMessage[] }>('/ai/messages'),
    chat: (prompt: string) =>
      request<{ message: AiCoachMessage; engineUsed: string }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ prompt })
      })
  },

  // Activities
  activities: {
    getAll: () =>
      request<{ activities: LearningActivityLog[] }>('/activities')
  },

  // Resume import
  resume: {
    getConfig: () =>
      request<{ maxBytes: number; aiConfigured: boolean }>('/resume/config'),
    extract: (contentBase64: string, fileName?: string) =>
      request<ResumeExtractionResult>('/resume/extract', {
        method: 'POST',
        body: JSON.stringify({ contentBase64, fileName })
      })
  },

  // Job Description Analyzer
  jd: {
    getConfig: () =>
      request<{ minChars: number; maxChars: number; aiConfigured: boolean }>('/jd/config'),
    analyze: (description: string) =>
      request<{ analysis: JobDescriptionAnalysis }>('/jd/analyze', {
        method: 'POST',
        body: JSON.stringify({ description })
      })
  },

  // Intelligent Weekly Learning Planner
  weeklyPlan: {
    get: () =>
      request<{ plan: WeeklyPlan }>('/weekly-plan'),
    regenerate: (availableHours?: number) =>
      request<{ plan: WeeklyPlan; message: string }>('/weekly-plan/regenerate', {
        method: 'POST',
        body: JSON.stringify(availableHours === undefined ? {} : { availableHours })
      })
  },

  // System Health Diagnostics
  health: {
    get: () =>
      request<{
        status: string;
        service: string;
        version: string;
        timestamp: string;
        environment?: string;
        aiProviderConfigured: boolean;
      }>('/health')
  }
};
