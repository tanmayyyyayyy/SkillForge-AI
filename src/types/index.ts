export type ProficiencyLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface ProficiencyLevelInfo {
  level: ProficiencyLevel;
  title: string;
  description: string;
  criteria: string;
}

export const PROFICIENCY_SCALE: Record<ProficiencyLevel, ProficiencyLevelInfo> = {
  0: {
    level: 0,
    title: 'None / Novice',
    description: 'No prior exposure or fundamental theoretical knowledge.',
    criteria: 'Cannot yet write code or answer conceptual questions without fundamental study.'
  },
  1: {
    level: 1,
    title: 'Beginner',
    description: 'Basic awareness of syntax and principles; requires guidance.',
    criteria: 'Can follow guided tutorials and understand elementary code snippets.'
  },
  2: {
    level: 2,
    title: 'Elementary',
    description: 'Can build small scripts and basic workflows with reference documentation.',
    criteria: 'Understands standard library functions and simple debugging practices.'
  },
  3: {
    level: 3,
    title: 'Intermediate',
    description: 'Independently builds functional modules and debugs common errors.',
    criteria: 'Capable of writing production-ready code with appropriate testing and error handling.'
  },
  4: {
    level: 4,
    title: 'Advanced',
    description: 'Deep production understanding; handles optimization and architecture design.',
    criteria: 'Can design scalable sub-systems, profile performance, and architect multi-service components.'
  },
  5: {
    level: 5,
    title: 'Expert',
    description: 'Mastery; sets architectural direction, authors tooling, and mentors engineering teams.',
    criteria: 'Has published packages, led technical strategy, or solved complex distributed/algorithmic edge cases.'
  }
};

export type SkillVerificationStatus = 'unverified' | 'self-reported' | 'assessed' | 'verified_project';
export type SkillEvidenceSource = 'self-reported' | 'assessment' | 'project' | 'course' | 'work_experience' | 'resume';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  createdAt: string;
  isDemo?: boolean;
}

export interface StudentSkill {
  skillId: string;
  name: string;
  category: string;
  proficiency: ProficiencyLevel;
  status: SkillVerificationStatus;
  source?: SkillEvidenceSource;
  lastAssessedAt?: string;
  updatedAt?: string;
  assessmentScore?: number;
  verifiedEvidenceUrl?: string;
}

export interface StudentProject {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  roleAndContributions?: string;
  repoUrl?: string;
  liveUrl?: string;
  skillsDemonstrated: string[];
  projectStatus?: 'completed' | 'in_progress' | 'planned';
  completed: boolean;
  completedAt?: string;
}

export interface StudentExperience {
  id: string;
  organization: string;
  role: string;
  duration: string;
  responsibilities: string;
  skillsDemonstrated: string[];
}

export interface StudentCertification {
  id: string;
  name: string;
  issuer?: string;
  year?: number;
}

export interface StudentProfile {
  userId: string;
  fullName: string;
  educationLevel: 'High School' | 'Undergraduate' | 'Postgraduate' | 'Bootcamp' | 'Self-Taught';
  degree: string;
  branch?: string;
  institution?: string;
  graduationYear: number;
  currentAcademicYear?: string;
  experienceLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  weeklyHours: number;
  preferredLearningStyle: 'Project-based' | 'Theory & Practice' | 'Visual & Video' | 'Documentation & Code';
  targetCompanies: string[];
  targetRole: string; // e.g. 'aiml', 'sde'
  targetCompletionPeriod?: string; // e.g. '3 months', '6 months', '1 year'
  constraints?: string[];
  preferredDomains?: string[];
  currentSkills: StudentSkill[];
  existingProjects: StudentProject[];
  experience?: StudentExperience[];
  certifications?: StudentCertification[];
  interests: string[];
  updatedAt: string;
}

export interface SkillRequirement {
  skillId: string;
  name: string;
  category: string;
  requiredLevel: ProficiencyLevel;
  importance: number; // 0.1 to 1.0 weight
  prerequisites: string[]; // skill IDs
  assessmentCriteria: string[];
  estimatedHours: number;
  learningResources: Array<{
    title: string;
    type: 'doc' | 'course' | 'tutorial';
    url: string;
    free: boolean;
  }>;
  practiceActivity: string;
  projectApplication: string;
}

export interface CareerRole {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  averageStartingSalary: string;
  marketDemand: 'Very High' | 'High' | 'Moderate';
  category: string;
  requiredSkills: SkillRequirement[];
  stages: Array<{
    stageNumber: number;
    name: string;
    description: string;
    skillIds: string[];
  }>;
}

export type PriorityBadge = 'Critical' | 'High' | 'Medium' | 'Low' | 'Mastered';

export interface SkillGapItem {
  skillId: string;
  name: string;
  category: string;
  currentLevel: ProficiencyLevel;
  requiredLevel: ProficiencyLevel;
  gap: number;
  normalizedGap: number;
  importance: number;
  status: SkillVerificationStatus;
  priorityScore: number; // 0 - 100
  priorityBadge: PriorityBadge;
  missingPrerequisites: string[];
  estimatedLearningHours: number;
  reason: string;
  nextRecommendedAction: string;
}

export interface SkillGapAnalysisResult {
  roleId: string;
  roleTitle: string;
  totalSkillsCount: number;
  masteredSkillsCount: number;
  gapSkillsCount: number;
  criticalGapsCount: number;
  totalEstimatedHours: number;
  overallCoveragePercentage: number;
  categoryBreakdown: Record<string, { total: number; current: number; gap: number; percentage: number }>;
  items: SkillGapItem[];
  generatedAt: string;
}

export interface RoadmapTask {
  id: string;
  userId: string;
  skillId: string;
  skillName: string;
  category: string;
  stageNumber: number;
  stageName: string;
  whyItMatters: string;
  currentProficiency: ProficiencyLevel;
  targetProficiency: ProficiencyLevel;
  priority: PriorityBadge;
  priorityScore: number;
  estimatedHours: number;
  prerequisites: string[];
  learningResources: Array<{
    title: string;
    type: string;
    url: string;
    free: boolean;
  }>;
  practiceActivity: string;
  projectApplication: string;
  completionCriteria: string[];
  status: 'not_started' | 'in_progress' | 'completed';
  completionPercentage: number;
  userNotes: string;
  completedAt?: string;
}

export interface RoadmapResult {
  roleId: string;
  roleTitle: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  totalHours: number;
  completedHours: number;
  overallProgressPercentage: number;
  stages: Array<{
    stageNumber: number;
    stageName: string;
    description: string;
    tasks: RoadmapTask[];
  }>;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface ProjectRecommendation {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  skillsDemonstrated: string[];
  whyItMatters: string;
  coreFeatures: string[];
  suggestedTechStack: string[];
  milestones: ProjectMilestone[];
  estimatedEffortHours: number;
  evaluationCriteria: string[];
  requiredEvidence: string;
  isSaved?: boolean;
  userStatus?: 'recommended' | 'in_progress' | 'completed';
  submittedEvidence?: {
    repoUrl?: string;
    demoUrl?: string;
    notes?: string;
    submittedAt: string;
  };
}

export interface AssessmentQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface SkillAssessment {
  skillId: string;
  skillName: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  questionsCount: number;
  passingScorePercentage: number;
  questions: AssessmentQuestion[];
}

export interface AssessmentResult {
  id: string;
  userId: string;
  skillId: string;
  skillName: string;
  scorePercentage: number;
  totalQuestions: number;
  correctAnswersCount: number;
  passed: boolean;
  answers: Array<{
    questionId: string;
    selectedOptionIndex: number;
    isCorrect: boolean;
  }>;
  completedAt: string;
}

export interface CareerReadinessScore {
  overallScore: number; // 0 to 100
  previousScore: number;
  delta: number;
  breakdown: {
    skillCoverageScore: number; // max 50
    assessmentBonus: number;    // max 25
    projectEvidenceBonus: number; // max 25
  };
  positiveFactors: string[];
  criticalGaps: string[];
  improvementSuggestions: Array<{
    action: string;
    potentialGain: number;
    type: 'assessment' | 'project' | 'roadmap';
  }>;
  calculatedAt: string;
  disclaimer: string;
}

export interface LearningActivityLog {
  id: string;
  userId: string;
  activityType: 'roadmap_task' | 'assessment' | 'project_milestone' | 'project_submitted';
  title: string;
  details: string;
  hoursSpent: number;
  timestamp: string;
}

export interface AiCoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  engineUsed: 'Gemini Pro (Live API)' | 'Deterministic Advisory Engine';
  suggestedActions?: string[];
}

/**
 * Resume extraction domain types.
 * Extracted data is always a *draft* — it must be reviewed and explicitly
 * saved by the student, and is never treated as verified evidence.
 */
export type ResumeExtractionSource = 'gemini' | 'deterministic';

export interface ResumeExtractedSkill {
  skillId: string;
  name: string;
  category: string;
  proficiency: ProficiencyLevel;
  evidence?: string;
}

export interface ResumeExtractedProject {
  title: string;
  description: string;
  technologies: string[];
  repoUrl?: string;
  liveUrl?: string;
}

export interface ResumeExtraction {
  fullName?: string;
  degree?: string;
  branch?: string;
  institution?: string;
  graduationYear?: number;
  skills: ResumeExtractedSkill[];
  projects: ResumeExtractedProject[];
  experience: StudentExperience[];
  certifications: StudentCertification[];
  technologies: string[];
}

export interface ResumeExtractionResult {
  extraction: ResumeExtraction;
  source: ResumeExtractionSource;
  warnings: string[];
  pdf: {
    pageCount: number;
    textLength: number;
  };
}

export interface ResumeReviewSelection {
  gradeInfo?: {
    includeEducation: boolean;
    fullName?: string;
    degree?: string;
    branch?: string;
    institution?: string;
    graduationYear?: number;
  };
  skills: ResumeExtractedSkill[];
  projects: ResumeExtractedProject[];
  experience: StudentExperience[];
  certifications: StudentCertification[];
}
