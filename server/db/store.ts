import fs from 'node:fs';
import path from 'node:path';
import {
  User,
  StudentProfile,
  RoadmapTask,
  ProjectRecommendation,
  AssessmentResult,
  LearningActivityLog,
  AiCoachMessage
} from '../../src/types/index.js';
import { DEFAULT_PROJECTS } from '../data/defaultProjects.js';

interface DatabaseSchema {
  users: User[];
  profiles: Record<string, StudentProfile>;
  roadmaps: Record<string, RoadmapTask[]>;
  projects: Record<string, ProjectRecommendation[]>;
  assessments: Record<string, AssessmentResult[]>;
  activities: Record<string, LearningActivityLog[]>;
  readinessHistory: Record<string, number[]>;
  aiMessages: Record<string, AiCoachMessage[]>;
}

const DB_FILE = path.resolve(process.cwd(), 'server/db/data.json');

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
    activities: { [DEMO_USER_ID]: demoActivities },
    readinessHistory: { [DEMO_USER_ID]: [36, 42, 48] },
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

class DatabaseStore {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return this.normalize(JSON.parse(raw));
      }
    } catch (err) {
      console.warn('Could not read existing database file, initializing with fresh seed data.', err);
    }
    const seed = getDemoSeedData();
    this.save(seed);
    return seed;
  }

  /**
   * Guarantees every expected collection exists with the correct container type.
   * This prevents corrupt or legacy data files from crashing the engines at runtime.
   */
  private normalize(parsed: unknown): DatabaseSchema {
    const seed = getDemoSeedData();
    const source = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as Partial<DatabaseSchema>;

    const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
    const asRecord = <T>(value: unknown): Record<string, T> =>
      typeof value === 'object' && value !== null && !Array.isArray(value)
        ? (value as Record<string, T>)
        : {};

    return {
      users: asArray<User>(source.users).length > 0 ? asArray<User>(source.users) : seed.users,
      profiles: asRecord<StudentProfile>(source.profiles),
      roadmaps: asRecord<RoadmapTask[]>(source.roadmaps),
      projects: asRecord<ProjectRecommendation[]>(source.projects),
      assessments: asRecord<AssessmentResult[]>(source.assessments),
      activities: asRecord<LearningActivityLog[]>(source.activities),
      readinessHistory: asRecord<number[]>(source.readinessHistory),
      aiMessages: asRecord<AiCoachMessage[]>(source.aiMessages)
    };
  }

  private save(dataToSave: DatabaseSchema = this.data): void {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  public resetDemoData(): void {
    const freshSeed = getDemoSeedData();
    // Keep non-demo users if any
    const nonDemoUsers = this.data.users.filter(u => !u.isDemo);
    for (const u of nonDemoUsers) {
      freshSeed.users.push(u);
      if (this.data.profiles[u.id]) freshSeed.profiles[u.id] = this.data.profiles[u.id];
      if (this.data.roadmaps[u.id]) freshSeed.roadmaps[u.id] = this.data.roadmaps[u.id];
      if (this.data.projects[u.id]) freshSeed.projects[u.id] = this.data.projects[u.id];
      if (this.data.assessments[u.id]) freshSeed.assessments[u.id] = this.data.assessments[u.id];
      if (this.data.activities[u.id]) freshSeed.activities[u.id] = this.data.activities[u.id];
      if (this.data.readinessHistory[u.id]) freshSeed.readinessHistory[u.id] = this.data.readinessHistory[u.id];
      if (this.data.aiMessages[u.id]) freshSeed.aiMessages[u.id] = this.data.aiMessages[u.id];
    }
    this.data = freshSeed;
    this.save();
  }

  // User operations
  public findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public createUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  // Profile operations
  public getProfile(userId: string): StudentProfile | undefined {
    return this.data.profiles[userId];
  }

  public saveProfile(profile: StudentProfile): StudentProfile {
    this.data.profiles[profile.userId] = profile;
    this.save();
    return profile;
  }

  // Roadmap operations
  public getRoadmapTasks(userId: string): RoadmapTask[] {
    const tasks = this.data.roadmaps[userId];
    return Array.isArray(tasks) ? tasks : [];
  }

  public saveRoadmapTasks(userId: string, tasks: RoadmapTask[]): void {
    this.data.roadmaps[userId] = tasks;
    this.save();
  }

  public updateRoadmapTask(userId: string, taskId: string, updates: Partial<RoadmapTask>): RoadmapTask | undefined {
    const tasks = Array.isArray(this.data.roadmaps[userId]) ? this.data.roadmaps[userId] : [];
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) return undefined;

    tasks[index] = { ...tasks[index], ...updates };
    this.data.roadmaps[userId] = tasks;
    this.save();
    return tasks[index];
  }

  // Project operations
  public getProjects(userId: string): ProjectRecommendation[] {
    const projects = this.data.projects[userId];
    if (!Array.isArray(projects)) {
      // Initialize (or repair) with default projects for this user
      this.data.projects[userId] = DEFAULT_PROJECTS.map(p => ({
        ...p,
        isSaved: false,
        userStatus: 'recommended'
      }));
      this.save();
    }
    return this.data.projects[userId];
  }

  public saveProjects(userId: string, projects: ProjectRecommendation[]): void {
    this.data.projects[userId] = projects;
    this.save();
  }

  public updateProject(userId: string, projectId: string, updates: Partial<ProjectRecommendation>): ProjectRecommendation | undefined {
    const list = this.getProjects(userId);
    const index = list.findIndex(p => p.id === projectId);
    if (index === -1) return undefined;

    list[index] = { ...list[index], ...updates };
    this.data.projects[userId] = list;
    this.save();
    return list[index];
  }

  // Assessments operations
  public getAssessments(userId: string): AssessmentResult[] {
    const results = this.data.assessments[userId];
    return Array.isArray(results) ? results : [];
  }

  public saveAssessmentResult(result: AssessmentResult): void {
    if (!Array.isArray(this.data.assessments[result.userId])) {
      this.data.assessments[result.userId] = [];
    }
    // Replace if already assessed, else append
    const existingIndex = this.data.assessments[result.userId].findIndex(a => a.skillId === result.skillId);
    if (existingIndex !== -1) {
      this.data.assessments[result.userId][existingIndex] = result;
    } else {
      this.data.assessments[result.userId].push(result);
    }
    this.save();
  }

  // Activities operations
  public getActivities(userId: string): LearningActivityLog[] {
    const activities = this.data.activities[userId];
    return Array.isArray(activities) ? activities : [];
  }

  public logActivity(activity: LearningActivityLog): void {
    if (!Array.isArray(this.data.activities[activity.userId])) {
      this.data.activities[activity.userId] = [];
    }
    this.data.activities[activity.userId].unshift(activity); // Newest first
    this.save();
  }

  // Readiness history
  public getReadinessHistory(userId: string): number[] {
    const history = this.data.readinessHistory[userId];
    return Array.isArray(history) ? history : [0];
  }

  public recordReadinessScore(userId: string, score: number): void {
    if (!Array.isArray(this.data.readinessHistory[userId])) {
      this.data.readinessHistory[userId] = [];
    }
    const history = this.data.readinessHistory[userId];
    if (history.length === 0 || history[history.length - 1] !== score) {
      history.push(score);
      // Keep last 10 points
      if (history.length > 10) history.shift();
      this.save();
    }
  }

  // AI chat messages
  public getAiMessages(userId: string): AiCoachMessage[] {
    const messages = this.data.aiMessages[userId];
    return Array.isArray(messages) ? messages : [];
  }

  public addAiMessage(userId: string, message: AiCoachMessage): void {
    if (!Array.isArray(this.data.aiMessages[userId])) {
      this.data.aiMessages[userId] = [];
    }
    this.data.aiMessages[userId].push(message);
    this.save();
  }
}

export const db = new DatabaseStore();
