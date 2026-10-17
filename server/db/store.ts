import fs from 'node:fs';
import path from 'node:path';
import {
  User,
  StudentProfile,
  RoadmapTask,
  ProjectRecommendation,
  AssessmentResult,
  AssessmentAttempt,
  LearningActivityLog,
  AiCoachMessage
} from '../../src/types/index.js';
import { DEFAULT_PROJECTS } from '../data/defaultProjects.js';
import { resolveCurrentEvidence } from '../engine/assessmentEngine.js';

interface DatabaseSchema {
  users: User[];
  profiles: Record<string, StudentProfile>;
  roadmaps: Record<string, RoadmapTask[]>;
  projects: Record<string, ProjectRecommendation[]>;
  assessments: Record<string, AssessmentResult[]>;
  assessmentAttempts: Record<string, AssessmentAttempt[]>;
  activities: Record<string, LearningActivityLog[]>;
  readinessHistory: Record<string, number[]>;
  aiMessages: Record<string, AiCoachMessage[]>;
}

const DEFAULT_DB_FILE = path.resolve(process.cwd(), 'server/db/data.json');

/**
 * Raised when the JSON store cannot be read, parsed, or durably written.
 *
 * Route handlers let this propagate so a full or unwritable disk surfaces as a
 * 5xx instead of being reported to the client as a successful mutation.
 */
export class StorageError extends Error {
  public readonly detail?: unknown;
  constructor(message: string, detail?: unknown) {
    super(message);
    this.name = 'StorageError';
    this.detail = detail;
  }
}

// Realistic Demo Seed Profile
export const DEMO_USER_ID = 'demo_student_aarav';

export function getDemoSeedData(): DatabaseSchema {
  const demoUser: User = {
    id: DEMO_USER_ID,
    email: 'demo.evaluator@skillforge.ai',
    name: 'Aarav Sharma',
    createdAt: new Date().toISOString(),
    isDemo: true
  };

  const demoProfile: StudentProfile = {
    userId: DEMO_USER_ID,
    fullName: 'Aarav Sharma',
    educationLevel: 'Undergraduate',
    degree: 'B.Tech in Computer Science & Engineering',
    branch: 'Computer Science & Artificial Intelligence',
    institution: 'National Institute of Technology',
    graduationYear: 2026,
    currentAcademicYear: 'Year 3',
    experienceLevel: 'Beginner',
    weeklyHours: 14,
    preferredLearningStyle: 'Project-based',
    targetCompanies: ['Google', 'DeepMind', 'Microsoft Research', 'NVIDIA'],
    targetRole: 'aiml',
    targetCompletionPeriod: '6 Months',
    preferredDomains: ['Agentic Systems', 'Multimodal LLMs', 'Distributed Model Serving'],
    constraints: ['14-16 hours weekly availability', 'Focus on open-source frameworks'],
    currentSkills: [
      {
        skillId: 'python',
        name: 'Python Programming',
        category: 'Programming Languages',
        proficiency: 3,
        status: 'assessed',
        lastAssessedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        assessmentScore: 85
      },
      {
        skillId: 'sql',
        name: 'SQL & Relational Databases',
        category: 'Data Management',
        proficiency: 2,
        status: 'self-reported'
      },
      {
        skillId: 'math_stats',
        name: 'Linear Algebra & Statistics',
        category: 'Mathematics',
        proficiency: 2,
        status: 'self-reported'
      },
      {
        skillId: 'data_manipulation',
        name: 'Data Wrangling (NumPy & Pandas)',
        category: 'Data Engineering',
        proficiency: 3,
        status: 'self-reported'
      },
      {
        skillId: 'scikit_learn',
        name: 'Classical ML (Scikit-Learn)',
        category: 'Machine Learning',
        proficiency: 2,
        status: 'self-reported'
      },
      {
        skillId: 'pytorch',
        name: 'Deep Learning with PyTorch',
        category: 'Deep Learning',
        proficiency: 1,
        status: 'unverified'
      },
      {
        skillId: 'fastapi',
        name: 'FastAPI & REST Model Serving',
        category: 'API Development',
        proficiency: 0,
        status: 'unverified'
      },
      {
        skillId: 'llm_rag',
        name: 'LLMs, Prompting & RAG Pipelines',
        category: 'Generative AI',
        proficiency: 0,
        status: 'unverified'
      },
      {
        skillId: 'docker',
        name: 'Docker & Containerization',
        category: 'DevOps & Deployment',
        proficiency: 0,
        status: 'unverified'
      },
      {
        skillId: 'mlops',
        name: 'MLOps & Experiment Tracking',
        category: 'DevOps & Deployment',
        proficiency: 0,
        status: 'unverified'
      }
    ],
    existingProjects: [
      {
        id: 'proj_demo_cli',
        title: 'Modular Automated Exploratory Data Analysis Tool',
        description: 'Command line interface parsing tabular CSV files and generating HTML statistical summary reports with missing value alerts.',
        technologies: ['Python', 'Pandas', 'NumPy', 'Click'],
        roleAndContributions: 'Sole developer: architected the parsing pipeline, wrote unit tests, and packaged as a CLI application.',
        repoUrl: 'https://github.com/aaravsharma/eda-cli-tool',
        skillsDemonstrated: ['python', 'data_manipulation'],
        projectStatus: 'completed',
        completed: true,
        completedAt: new Date(Date.now() - 86400000 * 7).toISOString()
      }
    ],
    experience: [
      {
        id: 'exp_demo_1',
        organization: 'SaarthiX Labs',
        role: 'Machine Learning Research Intern',
        duration: 'May 2024 - July 2024 (3 mos)',
        responsibilities: 'Implemented data preprocessing pipelines and evaluated baseline Scikit-Learn classifiers for tabular anomaly detection.',
        skillsDemonstrated: ['Python Programming', 'Data Wrangling (NumPy & Pandas)', 'Classical ML (Scikit-Learn)']
      }
    ],
    interests: ['Neural Networks', 'Agentic Systems', 'Distributed Computing', 'FinTech Analytics'],
    updatedAt: new Date().toISOString()
  };

  const demoAssessmentResult: AssessmentResult = {
    id: 'demo_assess_py',
    userId: DEMO_USER_ID,
    skillId: 'python',
    skillName: 'Python Programming',
    scorePercentage: 85,
    totalQuestions: 5,
    correctAnswersCount: 4,
    passed: true,
    answers: [
      { questionId: 'py_q1', selectedOptionIndex: 1, isCorrect: true },
      { questionId: 'py_q2', selectedOptionIndex: 0, isCorrect: true },
      { questionId: 'py_q3', selectedOptionIndex: 1, isCorrect: true },
      { questionId: 'py_q4', selectedOptionIndex: 2, isCorrect: true },
      { questionId: 'py_q5', selectedOptionIndex: 0, isCorrect: false }
    ],
    completedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  };

  // Demo user projects: Copy defaults and customize first one
  const demoProjects: ProjectRecommendation[] = DEFAULT_PROJECTS.map(p => {
    if (p.id === 'proj_aiml_rag') {
      return {
        ...p,
        isSaved: true,
        userStatus: 'in_progress',
        milestones: p.milestones.map((m, idx) => ({
          ...m,
          completed: idx < 2 // Milestones 1 & 2 completed
        }))
      };
    }
    return { ...p, isSaved: false, userStatus: 'recommended' };
  });

  const demoActivities: LearningActivityLog[] = [
    {
      id: 'act_1',
      userId: DEMO_USER_ID,
      activityType: 'assessment',
      title: 'Passed Python Verification Assessment',
      details: 'Scored 85% on 5 advanced Python architecture questions.',
      hoursSpent: 1.5,
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: 'act_2',
      userId: DEMO_USER_ID,
      activityType: 'project_milestone',
      title: 'Completed RAG Pipeline Milestone 1',
      details: 'Implemented recursive text chunking and vector storage with ChromaDB.',
      hoursSpent: 3.5,
      timestamp: new Date(Date.now() - 86400000 * 1).toISOString()
    },
    {
      id: 'act_3',
      userId: DEMO_USER_ID,
      activityType: 'roadmap_task',
      title: 'Advanced Linear Algebra Exercises',
      details: 'Solved matrix decomposition and gradient descent vector equations.',
      hoursSpent: 2.0,
      timestamp: new Date().toISOString()
    }
  ];

  return {
    users: [demoUser],
    profiles: { [DEMO_USER_ID]: demoProfile },
    roadmaps: {},
    projects: { [DEMO_USER_ID]: demoProjects },
    assessments: { [DEMO_USER_ID]: [demoAssessmentResult] },
    assessmentAttempts: {},
    activities: { [DEMO_USER_ID]: demoActivities },
    readinessHistory: { [DEMO_USER_ID]: [] },
    aiMessages: {
      [DEMO_USER_ID]: [
        {
          id: 'msg_welcome',
          role: 'assistant',
          content: 'Hello Aarav! I am your SkillForge Career Intelligence Coach. You are targeting the **AI/ML Engineer** role. Based on your profile, you already have solid Python foundations (85% verified) and basic SQL. Your top immediate priority is completing your **PyTorch deep learning foundations** and finishing Milestone 3 of your **Enterprise RAG Pipeline**. What would you like guidance on today?',
          timestamp: new Date().toISOString(),
          engineUsed: 'Deterministic Advisory Engine',
          suggestedActions: [
            'What should I learn next?',
            'Which project will best prove my missing skills?',
            'How should I structure my 14 hours this week?'
          ]
        }
      ]
    }
  };
}

export class DatabaseStore {
  private data: DatabaseSchema;
  private readonly filePath: string;
  private readonly seedFactory: () => DatabaseSchema;
  /** > 0 while a transaction is open; nested writes defer to one final flush. */
  private txDepth = 0;

  constructor(options: { filePath?: string; seed?: () => DatabaseSchema } = {}) {
    this.filePath = options.filePath
      ? path.resolve(options.filePath)
      : process.env.SKILLFORGE_DB_FILE
        ? path.resolve(process.env.SKILLFORGE_DB_FILE)
        : DEFAULT_DB_FILE;
    this.seedFactory = options.seed ?? getDemoSeedData;
    this.data = this.load();
  }

  /** Diagnostics only: the file this store instance reads and writes. */
  public getStoragePath(): string {
    return this.filePath;
  }

  /**
   * Loads persisted state, or seeds a fresh store on genuine first run. A file
   * that exists but cannot be read or parsed is **never** silently overwritten —
   * doing so would destroy potentially recoverable student data — so we fail fast
   * with an actionable {@link StorageError} instead.
   */
  private load(): DatabaseSchema {
    if (!fs.existsSync(this.filePath)) {
      const seed = this.seedFactory();
      this.save(seed);
      return seed;
    }

    let raw: string;
    try {
      raw = fs.readFileSync(this.filePath, 'utf-8');
    } catch (err) {
      throw new StorageError(
        `Unable to read the database file at ${this.filePath}. Refusing to reinitialize over it.`,
        err
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new StorageError(
        `The database file at ${this.filePath} contains invalid JSON. ` +
          'Refusing to overwrite it; restore a backup or remove the file to re-seed.',
        err
      );
    }

    return this.normalize(parsed);
  }

  /**
   * Guarantees every expected collection exists with the correct container type,
   * so corrupt or legacy files cannot crash the engines at runtime. Existing
   * containers — including empty ones — are preserved verbatim; the demo seed is
   * used only to fill keys that are entirely absent, never to replace real data.
   */
  private normalize(parsed: unknown): DatabaseSchema {
    const seed = getDemoSeedData();
    const source = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as Partial<DatabaseSchema>;

    const asArray = <T>(value: unknown, fallback: T[]): T[] =>
      Array.isArray(value) ? (value as T[]) : fallback;
    const asRecord = <T>(value: unknown): Record<string, T> =>
      typeof value === 'object' && value !== null && !Array.isArray(value)
        ? (value as Record<string, T>)
        : {};

    return {
      users: asArray<User>(source.users, seed.users),
      profiles: asRecord<StudentProfile>(source.profiles),
      roadmaps: asRecord<RoadmapTask[]>(source.roadmaps),
      projects: asRecord<ProjectRecommendation[]>(source.projects),
      assessments: asRecord<AssessmentResult[]>(source.assessments),
      assessmentAttempts: asRecord<AssessmentAttempt[]>(source.assessmentAttempts),
      activities: asRecord<LearningActivityLog[]>(source.activities),
      readinessHistory: asRecord<number[]>(source.readinessHistory),
      aiMessages: asRecord<AiCoachMessage[]>(source.aiMessages)
    };
  }

  /**
   * Atomically persists the full dataset: writes a sibling temp file and renames
   * it over the target, so a crash mid-write can never truncate or corrupt the
   * existing store. Throws {@link StorageError} on any failure, so callers never
   * report success for a write that did not reach disk.
   */
  private save(dataToSave: DatabaseSchema = this.data): void {
    const dir = path.dirname(this.filePath);
    const tmp = `${this.filePath}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(tmp, JSON.stringify(dataToSave, null, 2), 'utf-8');
      fs.renameSync(tmp, this.filePath);
    } catch (err) {
      try {
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      } catch {
        /* best-effort temp cleanup; preserve the original failure */
      }
      throw new StorageError(`Failed to persist the database to ${this.filePath}.`, err);
    }
  }

  /**
   * Runs several mutations as one durable unit: nothing is written until every
   * step succeeds, and any failure (including the final flush) restores the
   * in-memory state and rethrows — so a partial write is impossible.
   *
   * Only wrap synchronous work. Awaiting inside a transaction would let other
   * requests interleave mid-unit and be discarded by this unit's rollback.
   */
  public transaction<T>(fn: () => T): T {
    const backup = structuredClone(this.data);
    this.txDepth += 1;

    let result: T;
    try {
      result = fn();
    } catch (err) {
      this.txDepth -= 1;
      this.data = backup;
      throw err;
    }
    this.txDepth -= 1;

    try {
      this.save();
    } catch (err) {
      this.data = backup;
      throw err;
    }

    return result;
  }

  /**
   * Applies a single mutation and persists it. On write failure the in-memory
   * state is reverted so memory and disk never disagree about what succeeded.
   */
  private commit(mutation: () => void): void {
    if (this.txDepth > 0) {
      mutation();
      return;
    }
    const backup = structuredClone(this.data);
    mutation();
    try {
      this.save();
    } catch (err) {
      this.data = backup;
      throw err;
    }
  }

  public resetDemoData(): void {
    this.transaction(() => {
      const freshSeed = this.seedFactory();
      // Preserve any real (non-demo) accounts that happen to share the store.
      const nonDemoUsers = this.data.users.filter(u => !u.isDemo);
      for (const u of nonDemoUsers) {
        freshSeed.users.push(u);
        if (this.data.profiles[u.id]) freshSeed.profiles[u.id] = this.data.profiles[u.id];
        if (this.data.roadmaps[u.id]) freshSeed.roadmaps[u.id] = this.data.roadmaps[u.id];
        if (this.data.projects[u.id]) freshSeed.projects[u.id] = this.data.projects[u.id];
        if (this.data.assessments[u.id]) freshSeed.assessments[u.id] = this.data.assessments[u.id];
        if (this.data.assessmentAttempts[u.id]) freshSeed.assessmentAttempts[u.id] = this.data.assessmentAttempts[u.id];
        if (this.data.activities[u.id]) freshSeed.activities[u.id] = this.data.activities[u.id];
        if (this.data.readinessHistory[u.id]) freshSeed.readinessHistory[u.id] = this.data.readinessHistory[u.id];
        if (this.data.aiMessages[u.id]) freshSeed.aiMessages[u.id] = this.data.aiMessages[u.id];
      }
      this.data = freshSeed;
    });
  }

  // User operations
  public findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public createUser(user: User): User {
    this.commit(() => {
      this.data.users.push(user);
    });
    return user;
  }

  // Profile operations
  public getProfile(userId: string): StudentProfile | undefined {
    return this.data.profiles[userId];
  }

  public saveProfile(profile: StudentProfile): StudentProfile {
    this.commit(() => {
      this.data.profiles[profile.userId] = profile;
    });
    return profile;
  }

  // Roadmap operations
  public getRoadmapTasks(userId: string): RoadmapTask[] {
    const tasks = this.data.roadmaps[userId];
    return Array.isArray(tasks) ? tasks : [];
  }

  public saveRoadmapTasks(userId: string, tasks: RoadmapTask[]): void {
    this.commit(() => {
      this.data.roadmaps[userId] = tasks;
    });
  }

  public updateRoadmapTask(userId: string, taskId: string, updates: Partial<RoadmapTask>): RoadmapTask | undefined {
    const tasks = this.data.roadmaps[userId];
    if (!Array.isArray(tasks)) return undefined;
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) return undefined;

    const updated: RoadmapTask = { ...tasks[index], ...updates };
    this.commit(() => {
      const list = this.data.roadmaps[userId];
      if (Array.isArray(list) && list[index]?.id === taskId) {
        list[index] = updated;
      }
    });
    return updated;
  }

  // Project operations
  public getProjects(userId: string): ProjectRecommendation[] {
    const projects = this.data.projects[userId];
    if (Array.isArray(projects)) return projects;

    // Initialize (or repair) with default projects for this user
    this.commit(() => {
      this.data.projects[userId] = DEFAULT_PROJECTS.map(p => ({
        ...p,
        isSaved: false,
        userStatus: 'recommended'
      }));
    });
    return this.data.projects[userId];
  }

  public saveProjects(userId: string, projects: ProjectRecommendation[]): void {
    this.commit(() => {
      this.data.projects[userId] = projects;
    });
  }

  public updateProject(userId: string, projectId: string, updates: Partial<ProjectRecommendation>): ProjectRecommendation | undefined {
    const list = this.getProjects(userId);
    const index = list.findIndex(p => p.id === projectId);
    if (index === -1) return undefined;

    const updated: ProjectRecommendation = { ...list[index], ...updates };
    this.commit(() => {
      const current = this.data.projects[userId];
      if (Array.isArray(current) && current[index]?.id === projectId) {
        current[index] = updated;
      }
    });
    return updated;
  }

  // Assessments operations

  /**
   * Returns the *current verified evidence* per skill (one result per skill id):
   * the highest-scoring pass, or the most recent attempt when a skill was never
   * passed. This is what the readiness engine and reports consume, so repeated
   * attempts never double-count and a lower retake never downgrades evidence.
   */
  public getAssessments(userId: string): AssessmentResult[] {
    return resolveCurrentEvidence(this.getAssessmentHistory(userId));
  }

  /** Full, append-only attempt/result history for a user (newest last). */
  public getAssessmentHistory(userId: string): AssessmentResult[] {
    const results = this.data.assessments[userId];
    return Array.isArray(results) ? results : [];
  }

  /**
   * Appends a graded result to history. History is append-only so retakes never
   * overwrite earlier graded attempts.
   */
  public saveAssessmentResult(result: AssessmentResult): void {
    this.commit(() => {
      if (!Array.isArray(this.data.assessments[result.userId])) {
        this.data.assessments[result.userId] = [];
      }
      this.data.assessments[result.userId].push(result);
    });
  }

  // Assessment attempt operations (lifecycle: in_progress -> graded)

  public getAssessmentAttempts(userId: string): AssessmentAttempt[] {
    const attempts = this.data.assessmentAttempts[userId];
    return Array.isArray(attempts) ? attempts : [];
  }

  public getAssessmentAttempt(userId: string, attemptId: string): AssessmentAttempt | undefined {
    return this.getAssessmentAttempts(userId).find(a => a.id === attemptId);
  }

  /** Upserts an attempt by id (used to create, then transition, an attempt). */
  public saveAssessmentAttempt(attempt: AssessmentAttempt): void {
    this.commit(() => {
      if (!Array.isArray(this.data.assessmentAttempts[attempt.userId])) {
        this.data.assessmentAttempts[attempt.userId] = [];
      }
      const list = this.data.assessmentAttempts[attempt.userId];
      const index = list.findIndex(a => a.id === attempt.id);
      if (index !== -1) {
        list[index] = attempt;
      } else {
        list.push(attempt);
      }
    });
  }

  // Activities operations
  public getActivities(userId: string): LearningActivityLog[] {
    const activities = this.data.activities[userId];
    return Array.isArray(activities) ? activities : [];
  }

  public logActivity(activity: LearningActivityLog): void {
    this.commit(() => {
      if (!Array.isArray(this.data.activities[activity.userId])) {
        this.data.activities[activity.userId] = [];
      }
      this.data.activities[activity.userId].unshift(activity); // Newest first
    });
  }

  // Readiness history
  public getReadinessHistory(userId: string): number[] {
    const history = this.data.readinessHistory[userId];
    return Array.isArray(history) ? history : [];
  }

  public recordReadinessScore(userId: string, score: number): void {
    const history = Array.isArray(this.data.readinessHistory[userId]) ? this.data.readinessHistory[userId] : [];
    // No-op when the observed score is unchanged (dedupe consecutive duplicates).
    if (history.length > 0 && history[history.length - 1] === score) return;

    this.commit(() => {
      if (!Array.isArray(this.data.readinessHistory[userId])) {
        this.data.readinessHistory[userId] = [];
      }
      const list = this.data.readinessHistory[userId];
      list.push(score);
      // Keep last 10 points
      if (list.length > 10) list.shift();
    });
  }

  // AI chat messages
  public getAiMessages(userId: string): AiCoachMessage[] {
    const messages = this.data.aiMessages[userId];
    return Array.isArray(messages) ? messages : [];
  }

  public addAiMessage(userId: string, message: AiCoachMessage): void {
    this.commit(() => {
      if (!Array.isArray(this.data.aiMessages[userId])) {
        this.data.aiMessages[userId] = [];
      }
      this.data.aiMessages[userId].push(message);
    });
  }
}

export const db = new DatabaseStore();
