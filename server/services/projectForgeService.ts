import { db } from '../db/store.js';
import { CAREER_ROLES } from '../data/careers.js';
import { callGeminiText, isGeminiConfigured } from './geminiClient.js';
import { normalizeSkillKey } from './evidenceIndex.js';
import type {
  ForgedProject,
  ForgedProjectMilestone,
  StudentProfile
} from '../../src/types/index.js';

export interface ProjectGenerationInput {
  targetRole?: string;
  targetedGapSkills?: string[];
  preferredStack?: string[];
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Industry-Grade';
}

export async function generateForgedProject(
  userId: string,
  input: ProjectGenerationInput = {}
): Promise<ForgedProject | null> {
  const profile = db.getProfile(userId);
  if (!profile) return null;

  const role = CAREER_ROLES.find(r => r.id === (input.targetRole || profile.targetRole)) || CAREER_ROLES[0];

  // Identify real skill gaps from profile vs role requirements
  const userSkillMap = new Map(profile.currentSkills.map(s => [normalizeSkillKey(s.skillId), s.proficiency]));
  const detectedGaps: string[] = [];

  for (const req of role.requiredSkills) {
    const prof = userSkillMap.get(normalizeSkillKey(req.skillId)) ?? 0;
    if (prof < req.requiredLevel) {
      detectedGaps.push(req.name);
    }
  }

  const gapSkillsToTarget = (input.targetedGapSkills && input.targetedGapSkills.length > 0)
    ? input.targetedGapSkills
    : detectedGaps.slice(0, 3);

  if (gapSkillsToTarget.length === 0) {
    gapSkillsToTarget.push(role.requiredSkills[0]?.name || 'Core Software Engineering');
  }

  const difficulty = input.difficulty || (profile.experienceLevel === 'Advanced' ? 'Industry-Grade' : 'Advanced');

  let forged: ForgedProject | null = null;

  if (isGeminiConfigured()) {
    forged = await generateProjectWithGemini(userId, role.title, gapSkillsToTarget, difficulty, input.preferredStack);
  }

  if (!forged) {
    forged = generateDeterministicForgedProject(userId, role.id, role.title, gapSkillsToTarget, difficulty);
  }

  db.saveForgedProject(forged);
  return forged;
}

export function listForgedProjects(userId: string): ForgedProject[] {
  return db.getForgedProjects(userId).sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

export function getForgedProject(userId: string, projectId: string): ForgedProject | undefined {
  return db.getForgedProject(userId, projectId);
}

export function submitForgedProjectMilestoneEvidence(
  userId: string,
  projectId: string,
  milestoneId: string,
  evidence: { repoUrl?: string; artifactUrl?: string; notes?: string }
): { project: ForgedProject; milestone: ForgedProjectMilestone; awarded: boolean } | null {
  const project = db.getForgedProject(userId, projectId);
  if (!project) return null;

  const milestone = project.milestones.find(m => m.id === milestoneId);
  if (!milestone) return null;

  const submittedEvidence = {
    repoUrl: evidence.repoUrl?.trim(),
    artifactUrl: evidence.artifactUrl?.trim(),
    notes: evidence.notes?.trim(),
    submittedAt: new Date().toISOString()
  };

  const updatedMilestone: ForgedProjectMilestone = {
    ...milestone,
    completed: true,
    completedAt: new Date().toISOString(),
    submittedEvidence
  };

  const updatedProject = db.updateForgedProjectMilestone(userId, projectId, milestoneId, updatedMilestone);
  if (!updatedProject) return null;

  // Log learning activity
  db.logActivity({
    id: `act_${Date.now()}_forged_ms`,
    userId,
    activityType: 'project_milestone',
    title: `Forged Project Milestone: ${milestone.title}`,
    details: `Project: ${project.title}. Demonstrates: ${milestone.skillsDemonstrated.join(', ')}`,
    hoursSpent: milestone.estimatedHours,
    timestamp: new Date().toISOString()
  });

  return { project: updatedProject, milestone: updatedMilestone, awarded: true };
}

async function generateProjectWithGemini(
  userId: string,
  roleTitle: string,
  gapSkills: string[],
  difficulty: string,
  preferredStack?: string[]
): Promise<ForgedProject | null> {
  const prompt = `You are an expert AI systems architect designing a high-impact engineering portfolio project for a student targeting the role of "${roleTitle}".
The project must specifically close and prove these demonstrated skill gaps: ${gapSkills.join(', ')}.
Difficulty: ${difficulty}.
${preferredStack?.length ? `Preferred stack: ${preferredStack.join(', ')}` : ''}

Generate a comprehensive engineering specification in JSON format matching this schema:
{
  "title": "string (innovative, specific, engineering-focused title, NO generic todo/weather apps)",
  "problemStatement": "string (concrete industry or systems problem)",
  "targetUsers": "string",
  "targetedGapSkills": ["string"],
  "recommendedStack": {
    "frontend": ["string"],
    "backend": ["string"],
    "database": ["string"],
    "infrastructure": ["string"],
    "testing": ["string"]
  },
  "architectureOutline": "string (3-4 sentences detailing data flow, APIs, and scaling)",
  "difficulty": "${difficulty}",
  "estimatedTotalHours": number,
  "milestones": [
    {
      "id": "ms_1",
      "order": 1,
      "title": "string",
      "objective": "string",
      "tasks": [
        { "id": "t_1_1", "title": "string", "description": "string", "estimatedHours": number, "completed": false }
      ],
      "acceptanceCriteria": ["string"],
      "skillsDemonstrated": ["string"],
      "estimatedHours": number,
      "requiredDependencies": ["string"],
      "expectedEvidence": "string",
      "completed": false
    }
  ],
  "testingRequirements": ["string"],
  "securityConsiderations": ["string"],
  "deploymentPlan": "string",
  "readmeChecklist": ["string"],
  "evaluationRubric": [
    { "criterion": "string", "weight": number }
  ]
}`;

  const text = await callGeminiText(prompt, { responseMimeType: 'application/json', temperature: 0.3 });
  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    if (!parsed.title || !Array.isArray(parsed.milestones) || parsed.milestones.length === 0) return null;

    return {
      id: `forge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      title: parsed.title,
      targetRole: roleTitle,
      problemStatement: parsed.problemStatement || 'Production systems problem statement',
      targetUsers: parsed.targetUsers || 'Developers and engineering teams',
      targetedGapSkills: gapSkills,
      recommendedStack: parsed.recommendedStack || { backend: ['Node.js'], database: ['PostgreSQL'] },
      architectureOutline: parsed.architectureOutline || 'Distributed modular service architecture.',
      difficulty: parsed.difficulty || difficulty,
      estimatedTotalHours: parsed.estimatedTotalHours || 40,
      milestones: parsed.milestones.map((m: any, idx: number) => ({
        id: `ms_${idx + 1}`,
        order: idx + 1,
        title: m.title || `Milestone ${idx + 1}`,
        objective: m.objective || 'Complete engineering deliverable',
        tasks: Array.isArray(m.tasks) ? m.tasks : [],
        acceptanceCriteria: Array.isArray(m.acceptanceCriteria) ? m.acceptanceCriteria : ['Pass automated tests'],
        skillsDemonstrated: Array.isArray(m.skillsDemonstrated) ? m.skillsDemonstrated : gapSkills,
        estimatedHours: m.estimatedHours || 10,
        requiredDependencies: Array.isArray(m.requiredDependencies) ? m.requiredDependencies : [],
        expectedEvidence: m.expectedEvidence || 'Git commit hash and test log',
        completed: false
      })),
      testingRequirements: Array.isArray(parsed.testingRequirements) ? parsed.testingRequirements : ['Unit test coverage >= 80%'],
      securityConsiderations: Array.isArray(parsed.securityConsiderations) ? parsed.securityConsiderations : ['JWT auth', 'Input sanitization'],
      deploymentPlan: parsed.deploymentPlan || 'Containerized Docker deployment on cloud PaaS.',
      readmeChecklist: Array.isArray(parsed.readmeChecklist) ? parsed.readmeChecklist : ['Architecture diagram', 'Setup instructions', 'API contract'],
      evaluationRubric: Array.isArray(parsed.evaluationRubric) ? parsed.evaluationRubric : [{ criterion: 'System correctness', weight: 0.5 }, { criterion: 'Code quality', weight: 0.5 }],
      status: 'planned',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  } catch {
    return null;
  }
}

function generateDeterministicForgedProject(
  userId: string,
  roleId: string,
  roleTitle: string,
  gapSkills: string[],
  difficulty: ForgedProject['difficulty']
): ForgedProject {
  const isAi = roleId === 'aiml';

  const title = isAi
    ? 'Distributed RAG Pipeline with Semantic Caching & Evaluation Harness'
    : 'High-Throughput Event-Driven Task Engine with Transactional Outbox';

  const problemStatement = isAi
    ? 'Standard LLM retrieval workflows suffer from high latency and hallucinated context. Build an enterprise semantic retrieval engine with sub-100ms vector lookup, hybrid BM25 re-ranking, and automated faithfulness evaluations.'
    : 'Microservices frequently experience lost updates and inconsistent states during asynchronous messaging. Build a resilient event-driven execution engine utilizing the Transactional Outbox pattern with idempotency and dead-letter queues.';

  const recommendedStack = isAi
    ? {
        backend: ['FastAPI / Python', 'Node.js orchestrator'],
        database: ['Qdrant / ChromaDB', 'PostgreSQL (pgvector)'],
        infrastructure: ['Docker', 'Redis (Semantic Cache)'],
        testing: ['PyTest', 'Ragas evaluation framework']
      }
    : {
        backend: ['Node.js', 'Express', 'TypeScript'],
        database: ['PostgreSQL', 'Redis'],
        infrastructure: ['Docker Compose', 'RabbitMQ / Kafka'],
        testing: ['Vitest', 'Supertest', 'Testcontainers']
      };

  return {
    id: `forge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    title,
    targetRole: roleTitle,
    problemStatement,
    targetUsers: 'Production engineering teams handling high-scale workloads',
    targetedGapSkills: gapSkills,
    recommendedStack,
    architectureOutline: 'Tiered client-facing API gateway routing through an asynchronous worker pool backed by durable relational persistence and low-latency cache invalidation.',
    difficulty,
    estimatedTotalHours: 35,
    milestones: [
      {
        id: 'ms_1',
        order: 1,
        title: 'Core Schema & Deterministic Data Contract',
        objective: 'Establish persistent storage models, migration harnesses, and domain validations.',
        tasks: [
          { id: 't_1_1', title: 'Design database schema with transactional locking', description: 'Write DDL migrations with foreign keys and unique constraints.', estimatedHours: 4, completed: false },
          { id: 't_1_2', title: 'Implement domain validation suite', description: 'Write unit tests asserting payload validation rules.', estimatedHours: 4, completed: false }
        ],
        acceptanceCriteria: ['Migrations execute cleanly', '100% passing schema validation unit tests'],
        skillsDemonstrated: [gapSkills[0] || 'Database Design', 'Data Structures & Algorithms'],
        estimatedHours: 8,
        requiredDependencies: ['PostgreSQL', 'TypeScript'],
        expectedEvidence: 'Schema migration files and passing unit test suite',
        completed: false
      },
      {
        id: 'ms_2',
        order: 2,
        title: 'High-Concurrency Processing Engine',
        objective: 'Implement the core business logic with idempotency and concurrency locks.',
        tasks: [
          { id: 't_2_1', title: 'Implement concurrency control and idempotency registry', description: 'Prevent race conditions using row locks and idempotency keys.', estimatedHours: 6, completed: false },
          { id: 't_2_2', title: 'Build worker queue consumer', description: 'Process messages with exponential backoff retry mechanism.', estimatedHours: 6, completed: false }
        ],
        acceptanceCriteria: ['Zero lost updates under concurrent stress tests', 'Dead-letter queue captures poison messages'],
        skillsDemonstrated: [gapSkills[1] || 'Backend Engineering', 'Concurrency'],
        estimatedHours: 12,
        requiredDependencies: ['Redis / Message Queue'],
        expectedEvidence: 'Concurrency test runner output and queue handler implementation',
        completed: false
      },
      {
        id: 'ms_3',
        order: 3,
        title: 'Observability, Security & Production Deployment',
        objective: 'Add distributed tracing, health telemetry, and containerized deployment.',
        tasks: [
          { id: 't_3_1', title: 'Add structured logging and OpenTelemetry spans', description: 'Correlate incoming requests with correlation IDs.', estimatedHours: 5, completed: false },
          { id: 't_3_2', title: 'Author Dockerfile and multi-service docker-compose', description: 'Create production-grade multi-stage container build.', estimatedHours: 5, completed: false }
        ],
        acceptanceCriteria: ['Docker container builds with zero security vulnerabilities', 'Health endpoint returns component diagnostics'],
        skillsDemonstrated: [gapSkills[2] || 'System Architecture', 'DevOps & Reliability'],
        estimatedHours: 10,
        requiredDependencies: ['Docker', 'OpenTelemetry'],
        expectedEvidence: 'Dockerfile, compose file, and healthy local run log',
        completed: false
      }
    ],
    testingRequirements: [
      'Unit test coverage >= 80%',
      'Integration tests for persistent database transactions',
      'End-to-end stress tests with concurrent requests'
    ],
    securityConsiderations: [
      'Enforce TLS and strict request body size limits',
      'Validate inputs against schema to prevent SQL/command injection',
      'Prevent sensitive credentials from being logged'
    ],
    deploymentPlan: 'Containerized microservice deployed with automated health probes and rolling restart capability.',
    readmeChecklist: [
      'Architectural diagrams explaining component interaction',
      'Local environment setup with docker-compose',
      'Step-by-step API curl examples',
      'Benchmark results and latency distributions'
    ],
    evaluationRubric: [
      { criterion: 'Architectural separation and modularity', weight: 0.35 },
      { criterion: 'Concurrency and failure resilience', weight: 0.35 },
      { criterion: 'Automated test suite comprehensiveness', weight: 0.30 }
    ],
    status: 'planned',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
