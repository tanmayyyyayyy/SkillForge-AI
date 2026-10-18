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

export type AssessmentQuestionType = 'single-choice';

export interface AssessmentQuestion {
  id: string;
  /** Canonical skill this question verifies (mirrors the parent assessment). */
  skillId?: string;
  /** Question type. Only server-graded single-choice is supported today. */
  type?: AssessmentQuestionType;
  question: string;
  options: string[];
  /** Server-only answer key. Never serialized to the client before submission. */
  correctOptionIndex: number;
  explanation: string;
  /** Human-readable competency/topic the question probes. */
  topic?: string;
  /** Relative grading weight (defaults to 1). */
  points?: number;
}

export interface SkillAssessment {
  skillId: string;
  skillName: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  questionsCount: number;
  passingScorePercentage: number;
  /** Authored, expected completion time for the whole assessment (minutes). */
  estimatedMinutes?: number;
  /** Incremented when questions change so historical attempts stay interpretable. */
  contentVersion?: number;
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
  /** Attempt that produced this result (absent on legacy/seed records). */
  attemptId?: string;
  /** Assessment content version the attempt was graded against. */
  contentVersion?: number;
}

export type AssessmentAttemptStatus = 'in_progress' | 'graded';

/**
 * A single sitting of an assessment. Attempts are the unit of history: a retake
 * creates a new attempt rather than overwriting a previous graded result.
 */
export interface AssessmentAttempt {
  id: string;
  userId: string;
  skillId: string;
  skillName: string;
  status: AssessmentAttemptStatus;
  /** Question ids served when the attempt started (validates submissions). */
  questionIds: string[];
  startedAt: string;
  gradedAt?: string;
  /** Present only once the attempt has been graded. */
  result?: AssessmentResult;
}

export interface AssessmentAttemptSummary {
  id: string;
  skillId: string;
  skillName: string;
  status: AssessmentAttemptStatus;
  startedAt: string;
  gradedAt?: string;
  scorePercentage: number | null;
  passed: boolean;
}

/** A question as served to the client — no answer key, no explanation. */
export interface SecureAssessmentQuestion {
  id: string;
  question: string;
  options: string[];
  topic?: string;
}

/** The client-facing view of an in-progress attempt. */
export interface AssessmentAttemptView {
  id: string;
  skillId: string;
  skillName: string;
  status: AssessmentAttemptStatus;
  startedAt: string;
  passingScorePercentage: number;
  questions: SecureAssessmentQuestion[];
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

/**
 * Subphase 2G: downloadable Career Readiness Report.
 *
 * The payload is produced exclusively by the server from the canonical
 * readiness/gap/roadmap engines. The browser never computes readiness and the
 * PDF renderer only formats this payload, so the on-screen report, the JSON
 * API, and the downloadable PDF can never disagree.
 */
export interface EvidenceProvenance {
  unverified: number;
  selfReported: number;
  assessed: number;
  projectVerified: number;
}

export interface SkillProfileGroups {
  selfReported: string[];
  assessed: string[];
  projectBacked: string[];
  unverified: string[];
}

export interface ReportPortfolioItem {
  id: string;
  title: string;
  userStatus?: ProjectRecommendation['userStatus'];
  hasEvidence: boolean;
}

/** A single recommended focus item in the next-seven-days plan. */
export interface NextSevenDaysFocusItem {
  title: string;
  detail: string;
  hours: number;
  skillId?: string;
  kind: 'skill-gap' | 'project-milestone' | 'maintenance';
}

export interface NextSevenDaysPlan {
  availableHours: number;
  focusItems: NextSevenDaysFocusItem[];
  totalPlannedHours: number;
  unallocatedHours: number;
  note: string;
}

/**
 * Subphase 2I: Intelligent Weekly Learning Planner.
 *
 * A week-long, day-by-day schedule derived deterministically from the student's
 * canonical data: prioritized skill gaps, the dependency-ordered roadmap, the
 * next incomplete project milestone, and their declared weekly availability.
 *
 * Scheduled items are *references* to canonical records (a roadmap task or a
 * project milestone), never copies — so a task marked complete through the
 * existing endpoints is genuinely persisted and can never be lost by
 * regenerating the plan, and a task is only ever "completed" because the store
 * says so, never because it was scheduled or viewed.
 */
export type WeeklyTaskKind = 'skill-gap' | 'project-milestone';
export type WeeklyTaskSource = 'roadmap' | 'project';
export type WeeklyTaskStatus = 'scheduled' | 'completed';

export interface WeeklyPlanResource {
  title: string;
  type: string;
  url: string;
  free: boolean;
}

export interface WeeklyPlanTask {
  /** Canonical reference id: roadmap task id, or `ms_<projectId>_<milestoneId>`. */
  id: string;
  title: string;
  description: string;
  kind: WeeklyTaskKind;
  source: WeeklyTaskSource;
  /** Roadmap task id (for 'roadmap') or project id (for 'project'). */
  sourceId: string;
  /** Milestone id, only present for 'project' tasks. */
  milestoneId?: string;
  skillId?: string;
  skillName?: string;
  priority: PriorityBadge;
  priorityScore: number;
  /** Hours reserved for this session (clamped to a sensible session length). */
  estimatedHours: number;
  /** Full remaining effort of the underlying task, for honest context. */
  originalEstimatedHours: number;
  /** 1 (Monday) … 7 (Sunday). */
  day: number;
  dayLabel: string;
  status: WeeklyTaskStatus;
  completedAt?: string;
  prerequisites: string[];
  resource?: WeeklyPlanResource;
}

export interface WeeklyPlanUnscheduledItem {
  id: string;
  title: string;
  kind: WeeklyTaskKind;
  skillId?: string;
  priority: PriorityBadge;
  priorityScore: number;
  estimatedHours: number;
  /** Why this item could not be placed within the available week. */
  reason: string;
}

export interface WeeklyPlanDay {
  /** 1 (Monday) … 7 (Sunday). */
  day: number;
  label: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  hours: number;
  tasks: WeeklyPlanTask[];
}

export interface WeeklyPlanCompletedItem {
  id: string;
  title: string;
  skillName?: string;
  hours: number;
  completedAt: string;
}

export type WeeklyPlanState = 'ready' | 'no-availability' | 'no-work' | 'no-target-role';

export interface WeeklyPlan {
  userId: string;
  /** ISO date (YYYY-MM-DD) of the Monday that starts the plan week. */
  weekStart: string;
  /** ISO date (YYYY-MM-DD) of the Sunday that ends the plan week. */
  weekEnd: string;
  targetRole: { id: string; title: string };
  availableHours: number;
  /** Sum of hours reserved by scheduled tasks (never exceeds availableHours). */
  totalScheduledHours: number;
  /** Hours credited for tasks actually completed within this week (from the store). */
  completedHours: number;
  /** Scheduled hours that are not yet completed. */
  remainingScheduledHours: number;
  days: WeeklyPlanDay[];
  tasks: WeeklyPlanTask[];
  unscheduled: WeeklyPlanUnscheduledItem[];
  completedThisWeek: WeeklyPlanCompletedItem[];
  totalCandidates: number;
  state: WeeklyPlanState;
  message: string;
  generatedAt: string;
}

/**
 * Subphase 2H: Job Description Analyzer.
 *
 * A pasted job posting is parsed into structured skill requirements, then
 * compared against the authenticated student's own profile. The comparison is
 * presence-based (the posting almost never states a proficiency level) and is
 * computed by a dedicated engine — it never feeds the readiness score.
 */
export type JobRequirementKind = 'required' | 'preferred' | 'tool' | 'responsibility';

export type JobSkillConfidence = 'high' | 'medium' | 'low';

/** One skill mention detected in the pasted job description. */
export interface JobDescriptionSkillMention {
  skillId: string;
  name: string;
  category: string;
  kind: JobRequirementKind;
  /** Every section heading the skill was found under (e.g. "Requirements"). */
  sections: string[];
  /** Short snippet of the posting where the skill was detected. */
  evidence: string;
  /**
   * True when the skill was only inferred from surrounding prose rather than
   * being explicitly listed under a skills/requirements heading.
   */
  inferred: boolean;
  confidence: JobSkillConfidence;
}

/** Structured result of parsing the raw posting text. */
export interface JobDescriptionExtraction {
  jobTitle?: string;
  companyName?: string;
  skills: JobDescriptionSkillMention[];
  /** Free-text bullets captured under qualifications/requirements headings. */
  qualifications: string[];
  /** Free-text bullets captured under responsibilities headings. */
  responsibilities: string[];
  warnings: string[];
}

export type JobMatchState = 'matched' | 'partial' | 'missing';

/** How one extracted posting requirement compares to the student's profile. */
export interface JobDescriptionMatch {
  skillId: string;
  name: string;
  category: string;
  kind: JobRequirementKind;
  /** Importance weight used by the scoring formula (0-1). */
  weight: number;
  state: JobMatchState;
  profileProficiency?: ProficiencyLevel;
  profileStatus?: SkillVerificationStatus;
  /** Career-catalog bar for this skill, when the catalog defines one. */
  roleRequiredLevel?: number;
  evidence: string;
  inferred: boolean;
  confidence: JobSkillConfidence;
  /** Human-readable explanation of the state. */
  reason: string;
}

export interface JobDescriptionSummary {
  extractedSkillCount: number;
  requiredSkillCount: number;
  preferredSkillCount: number;
  matchedCount: number;
  partialCount: number;
  missingCount: number;
  /** Weighted coverage of required-group skills (0-100), or null when not calculable. */
  requiredCoverage: number | null;
  /** Weighted coverage of preferred skills (0-100), or null when none are listed. */
  preferredCoverage: number | null;
  /** Headline match score (0-100), or null when the posting yielded no scorable skills. */
  matchScore: number | null;
  /** Plain-language statement of the exact formula used for this analysis. */
  methodology: string;
  /** Populated only when `matchScore` could not be calculated. */
  note?: string;
}

export interface JobDescriptionNextStep {
  skillId: string;
  name: string;
  state: JobMatchState;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  action: string;
  resource?: { title: string; url: string; type: string; free: boolean };
  estimatedHours?: number;
  /** True when the skill belongs to the student's target career track's engine items. */
  inTargetTrack: boolean;
}

export interface JobDescriptionAnalysis {
  extraction: JobDescriptionExtraction;
  source: 'gemini' | 'deterministic';
  matches: JobDescriptionMatch[];
  summary: JobDescriptionSummary;
  nextSteps: JobDescriptionNextStep[];
  /** Career track whose requirements overlap this posting the most. */
  closestRole?: { id: string; title: string; overlap: number };
  targetRole?: { id: string; title: string };
  generatedAt: string;
}

export interface JobAnalysis {
  id: string;
  userId: string;
  title: string;
  company?: string;
  location?: string;
  url?: string;
  description: string;
  analysis: JobDescriptionAnalysis;
  createdAt: string;
  updatedAt: string;
}

/** Lightweight list item returned by the saved-analyses endpoint. */
export interface JobAnalysisSummary {
  id: string;
  title: string;
  company?: string;
  location?: string;
  url?: string;
  matchScore: number | null;
  createdAt: string;
  updatedAt: string;
}

export type ResumeAlignmentClassification = 'evidence-found' | 'partial' | 'gap' | 'not-enough-info';

export interface ResumeAlignmentItem {
  skillId: string;
  skillName: string;
  kind: JobRequirementKind;
  importance: number;
  jdExpectation: string;
  classification: ResumeAlignmentClassification;
  alignmentNote: string;
  profileEvidence: string[];
  resumeVerdict?: ResumeClaimVerdict;
  nextAction: string;
}

export interface ResumeAlignmentSummary {
  evidenceFound: number;
  partial: number;
  gap: number;
  notEnoughInfo: number;
}

export interface ResumeAlignment {
  targetTitle: string;
  usedResumeDraft: boolean;
  items: ResumeAlignmentItem[];
  summary: ResumeAlignmentSummary;
  generatedAt: string;
  disclaimer: string;
}

export interface JobPreparationStep {
  skillId: string;
  skillName: string;
  kind: JobRequirementKind;
  state: JobMatchState;
  reason: string;
  whyItMatters: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  estimatedHours?: number;
  resource?: { title: string; url: string; type: string; free: boolean };
  roadmapTaskId?: string;
  route: string;
}

export interface JobPreparationPlan {
  targetTitle: string;
  targetCompany?: string;
  coverage: number;
  coveredSkills: number;
  steps: JobPreparationStep[];
  generatedAt: string;
  disclaimer: string;
}

/** Normalized shape produced by either extractor before scoring. */
export interface JobDescriptionExtractionResult {
  extraction: JobDescriptionExtraction;
  source: 'gemini' | 'deterministic';
  warnings: string[];
}

export interface ReadinessReportPayload {
  student: {
    fullName: string;
    degree: string;
    educationLevel: string;
    graduationYear: number;
    weeklyHours: number;
    learningStyle: string;
    targetCompanies: string[];
  };
  targetCareer: {
    id: string;
    title: string;
    category: string;
    salaryRange: string;
    marketDemand: string;
  };
  readiness: CareerReadinessScore;
  evidenceBreakdown: EvidenceProvenance;
  skillProfile: SkillProfileGroups;
  gapSummary: {
    totalSkills: number;
    masteredSkills: number;
    criticalGaps: number;
    estimatedHours: number;
    coveragePercentage: number;
    topGaps: SkillGapItem[];
  };
  /** All unmet skills (gap > 0), highest priority first, for the full gap table. */
  allGaps: SkillGapItem[];
  roadmapProgress: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    totalHours: number;
    completedHours: number;
    progressPercentage: number;
    stages: RoadmapResult['stages'];
  };
  verifiedAssessments: AssessmentResult[];
  portfolioProjects: ReportPortfolioItem[];
  nextSevenDays: NextSevenDaysPlan;
  generatedAt: string;
}

/* ============================================================================
 * Feature 1 — Career Twin AI (Subphase 3A)
 *
 * A derived, evidence-based model of a student's capabilities. The twin is
 * assembled on demand from existing records (profile, assessments, projects)
 * and the canonical gap/readiness engines — it is never a second source of
 * truth and never introduces a competing readiness formula.
 * ========================================================================== */

export type CareerEvidenceKind = 'self-reported' | 'assessment' | 'project' | 'none';

/** A concrete artefact that supports (or is relevant to) a skill. */
export interface CareerTwinEvidenceRef {
  kind: 'assessment' | 'project';
  id: string;
  label: string;
  detail?: string;
  url?: string;
}

export interface CareerTwinSkill {
  skillId: string;
  name: string;
  category: string;
  currentLevel: ProficiencyLevel;
  /** Bar defined by the student's target role, or null when the role doesn't require it. */
  requiredLevel: ProficiencyLevel | null;
  gap: number;
  status: SkillVerificationStatus;
  /** How the proficiency estimate is currently backed. */
  evidenceKind: 'self-reported' | 'assessment' | 'project' | 'none';
  /** Confidence in the *current* estimate given available evidence. */
  confidence: 'high' | 'medium' | 'low';
  evidence: CareerTwinEvidenceRef[];
  lastUpdated?: string;
  nextAction: string;
  inTargetRole: boolean;
}

export interface CareerTwinIdentity {
  userId: string;
  fullName: string;
  targetRoleId: string;
  targetRoleTitle: string;
  educationLevel: string;
  academicStanding?: string;
  graduationYear: number;
  weeklyHours: number;
  learningStyle: string;
  targetCompanies: string[];
  interests: string[];
}

export interface CareerTwinSummary {
  identity: CareerTwinIdentity;
  readiness: CareerReadinessScore;
  evidenceBreakdown: EvidenceProvenance;
  strengths: string[];
  majorGaps: Array<{
    skillId: string;
    name: string;
    gap: number;
    priority: PriorityBadge;
    nextAction: string;
  }>;
  missingEvidence: string[];
  skills: CareerTwinSkill[];
  generatedAt: string;
  disclaimer: string;
}

/* ===== Scenario simulation (explicit, deterministic estimates) ===== */

export interface CareerTwinScenarioInput {
  label: string;
  focusSkillIds: string[];
  weeklyHours: number;
  horizonWeeks: number;
}

export interface CareerTwinScenarioSkillProjection {
  skillId: string;
  name: string;
  fromLevel: ProficiencyLevel;
  toLevel: ProficiencyLevel;
  targetLevel: ProficiencyLevel;
  weeksNeeded: number;
}

export interface CareerTwinScenarioResult {
  label: string;
  assumptions: string[];
  focusSkillIds: string[];
  focusSkillNames: string[];
  projectedReadiness: number;
  readinessDelta: number;
  skillsTouched: CareerTwinScenarioSkillProjection[];
  remainingGapSkills: number;
  notes: string[];
}

export interface CareerTwinScenarioComparison {
  baseReadiness: number;
  scenarios: CareerTwinScenarioResult[];
  recommendation: string;
  /** Every scenario is a heuristic projection of the student's own data. */
  disclaimer: string;
  generatedAt: string;
}

/* ===== Career War Room ===== */

export type WarRoomTaskKind = 'learn' | 'assess' | 'project' | 'practice';

export interface WarRoomTask {
  id: string;
  kind: WarRoomTaskKind;
  title: string;
  explanation: string;
  estimatedMinutes: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  priorityScore: number;
  skillId?: string;
  skillName?: string;
  completionCriteria: string;
  /** Client route that carries out the real action (never a duplicate task system). */
  route: string;
  actionLabel: string;
  status: 'todo' | 'in_progress' | 'done';
  /** Id of the underlying entity (roadmap task, project, milestone, skill). */
  sourceId?: string;
}

export interface WarRoomPendingAssessment {
  skillId: string;
  name: string;
  priority: PriorityBadge;
}

export interface WarRoomProjectMilestone {
  projectId: string;
  projectTitle: string;
  milestoneId: string;
  milestoneTitle: string;
  milestoneDescription: string;
}

export interface WarRoomAchievement {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
}

export interface WarRoomWeeklyProgress {
  completedThisWeek: number;
  scheduledHours: number;
  completedHours: number;
  readinessScore: number;
  readinessDelta: number;
}

export interface WarRoomActiveGoal {
  roleId: string;
  roleTitle: string;
  currentReadiness: number;
  horizon: string | null;
  targetCompanies: string[];
  remainingCriticalGaps: number;
}

export interface WarRoomCriticalGap {
  skillId: string;
  name: string;
  currentLevel: ProficiencyLevel;
  requiredLevel: ProficiencyLevel;
  gap: number;
  priority: PriorityBadge;
}

export interface WarRoomMilestone {
  taskId: string;
  skillId: string;
  skillName: string;
  stageName: string;
  estimatedHours: number;
  completionPercentage: number;
}

export interface WarRoomNextAction {
  taskId: string;
  title: string;
  explanation: string;
  route: string;
  actionLabel: string;
}

export interface CareerWarRoom {
  userId: string;
  targetRole: { id: string; title: string } | null;
  todaysMission: WarRoomTask | null;
  /** The three highest-priority unfinished items, in order. */
  topPriorities: WarRoomTask[];
  activeGoal: WarRoomActiveGoal | null;
  criticalGaps: WarRoomCriticalGap[];
  incompleteMilestones: WarRoomMilestone[];
  completedTasks: WarRoomTask[];
  recommendedNextAction: WarRoomNextAction | null;
  priorityTasks: WarRoomTask[];
  pendingAssessments: WarRoomPendingAssessment[];
  projectMilestones: WarRoomProjectMilestone[];
  achievements: WarRoomAchievement[];
  weeklyProgress: WarRoomWeeklyProgress;
  generatedAt: string;
  /** Explains how priorities were derived (transparent, no black box). */
  prioritizationNotes: string[];
}

/* ============================================================================
 * Feature 7 — Resume Truth Engine (Subphase 3C)
 *
 * Evaluates the *claims* made on a resume draft against the evidence actually
 * stored in the student's profile. It never fabricates endorsements and never
 * silently rewrites the resume — it only reports, per claim, what is verifiable
 * and what would need evidence before it can be treated as proven.
 * ========================================================================== */

export type ResumeClaimVerdict = 'verified' | 'project-backed' | 'in-profile' | 'unsupported';

export interface ResumeSkillClaimAssessment {
  skillId: string;
  name: string;
  /** Proficiency the resume draft asserts. */
  resumeLevel: ProficiencyLevel;
  /** Proficiency independently supported by stored evidence (0 when none). */
  evidencedLevel: ProficiencyLevel;
  verdict: ResumeClaimVerdict;
  /** True when the resume claims a higher level than the evidence supports. */
  levelOverstated: boolean;
  evidence: CareerTwinEvidenceRef[];
  suggestion: string;
}

export interface ResumeProjectClaimAssessment {
  title: string;
  hasLink: boolean;
  matchedProfileProject: boolean;
  suggestion: string;
}

export interface ResumeExperienceClaimAssessment {
  organization: string;
  role: string;
  note: string;
}

export interface ResumeMissingClaim {
  skillId: string;
  name: string;
  requiredLevel: ProficiencyLevel;
  /** True when the student already has evidence that could support this line. */
  hasEvidence: boolean;
}

export interface ResumeTruthSummary {
  totalClaims: number;
  verified: number;
  projectBacked: number;
  inProfile: number;
  unsupported: number;
  /** Percentage of claims backed by independent (assessment/project) evidence. */
  evidenceBackedRatio: number;
}

export interface ResumeTruthReport {
  summary: ResumeTruthSummary;
  skills: ResumeSkillClaimAssessment[];
  projects: ResumeProjectClaimAssessment[];
  experience: ResumeExperienceClaimAssessment[];
  missingFromResume: ResumeMissingClaim[];
  advisories: string[];
  disclaimer: string;
  generatedAt: string;
}

/** Untrusted draft submitted for a truth check; never persisted. */
export interface ResumeTruthDraft {
  skills: ResumeExtractedSkill[];
  projects?: ResumeExtractedProject[];
  experience?: StudentExperience[];
}

/* ============================================================================
 * Feature 9 — Career Evidence Graph (Subphase 3D)
 *
 * A derived graph of how skills connect to the role they target and to the
 * assessments/projects that substantiate them. Built from the same evidence
 * index as the Career Twin, so provenance labels always agree.
 * ========================================================================== */

export type EvidenceNodeKind = 'skill' | 'assessment' | 'project' | 'role' | 'milestone';

export interface EvidenceGraphNode {
  id: string;
  kind: EvidenceNodeKind;
  label: string;
  /** Skill nodes only. */
  status?: SkillVerificationStatus;
  proficiency?: ProficiencyLevel;
  requiredLevel?: ProficiencyLevel | null;
  requiredByRole?: boolean;
  /** Assessment / project / milestone nodes only. */
  detail?: string;
  /** Milestone (roadmap task) nodes only. */
  completed?: boolean;
  estimatedHours?: number;
  /** Source id of the underlying record, when one exists. */
  sourceId?: string;
}

export interface EvidenceGraphEdge {
  from: string;
  to: string;
  kind: 'verified-by' | 'demonstrated-by' | 'requires' | 'improves';
}

export interface CareerEvidenceGraph {
  role: { id: string; title: string } | null;
  nodes: EvidenceGraphNode[];
  edges: EvidenceGraphEdge[];
  summary: EvidenceProvenance;
  generatedAt: string;
  disclaimer: string;
}

/* ============================================================================
 * Feature 6 — Trajectory Simulator (Subphase 3E)
 *
 * Projects plausible readiness changes under different effort scenarios using the
 * same canonical readiness concept. Projections are explicitly conservative and
 * never fabricated; the UI must show assumptions.
 * ========================================================================== */

export interface TrajectoryPoint {
  timestamp: string;
  overallScore: number;
  criticalGaps: number;
  verifiedSkills: number;
}

export interface TrajectoryScenario {
  label: string;
  focusSkillIds: string[];
  weeklyHours: number;
  horizonWeeks: number;
  projectedScore: number;
  delta: number;
  assumptions: string[];
}

export interface TrajectorySimulation {
  baseScore: number;
  history: number[];
  points: TrajectoryPoint[];
  scenarios: TrajectoryScenario[];
  generatedAt: string;
  disclaimer: string;
}



