import { ProjectRecommendation } from '../../src/types/index.js';

export const DEFAULT_PROJECTS: ProjectRecommendation[] = [
  {
    id: 'proj_aiml_rag',
    title: 'Enterprise Document RAG & QA Pipeline',
    difficulty: 'Intermediate',
    skillsDemonstrated: ['python', 'llm_rag', 'fastapi', 'docker'],
    whyItMatters: 'Demonstrates modern GenAI production engineering: chunking, embedding generation, vector similarity search, and citation-backed answer generation with sub-second API latency.',
    coreFeatures: [
      'Document parsing and recursive character chunking with token overlap',
      'Vector embeddings stored in ChromaDB/pgvector with cosine similarity indexing',
      'FastAPI async inference endpoint returning answers and source document page citations',
      'Docker Compose orchestration with automated health checks'
    ],
    suggestedTechStack: ['Python 3.11+', 'FastAPI', 'ChromaDB / pgvector', 'HuggingFace / OpenAI Embeddings', 'Docker'],
    milestones: [
      { id: 'm1', title: 'Dataset & Ingestion Pipeline', description: 'Implement PDF/Markdown chunking and vector storage with metadata.', completed: false },
      { id: 'm2', title: 'Similarity Retrieval Engine', description: 'Build top-k similarity retrieval with re-ranking and prompt injection guardrails.', completed: false },
      { id: 'm3', title: 'FastAPI Serving & Streaming', description: 'Create asynchronous SSE/WebSocket streaming response endpoint.', completed: false },
      { id: 'm4', title: 'Containerization & Validation', description: 'Containerize with Docker Compose and verify benchmark latency < 800ms.', completed: false }
    ],
    estimatedEffortHours: 25,
    evaluationCriteria: [
      'Clean modular architecture separating ingestion, retrieval, and API layers',
      'Correct citations with page numbers and zero hallucinated references',
      'Passing unit tests and reproducible Docker execution'
    ],
    requiredEvidence: 'Public GitHub repository URL with README architecture diagram and live deployed demo or CLI test screencast.'
  },
  {
    id: 'proj_sde_ratelimiter',
    title: 'Distributed Token-Bucket Rate Limiter & Telemetry',
    difficulty: 'Advanced',
    skillsDemonstrated: ['dsa', 'core_oop', 'system_design', 'testing_qa', 'docker'],
    whyItMatters: 'Proves high-throughput concurrency design, low-latency in-memory data structures, thread safety, and resilience against DDoS or traffic spikes.',
    coreFeatures: [
      'Token-bucket and sliding-window rate limiting algorithms',
      'Thread-safe atomic counters or Redis-backed distributed synchronization',
      'Configurable client tiers (e.g. Free: 60 req/min, Premium: 1000 req/min)',
      'Telemetry metrics exporting request drop rates and p99 latency'
    ],
    suggestedTechStack: ['Java / Go / Node.js', 'Redis', 'Docker Compose', 'k6 or Artillery for Load Testing'],
    milestones: [
      { id: 'm1', title: 'In-Memory Sliding Window Algorithm', description: 'Implement token bucket and sliding log algorithms with microsecond precision.', completed: false },
      { id: 'm2', title: 'Middleware & HTTP Response Headers', description: 'Expose X-RateLimit-Limit, Remaining, and Retry-After headers.', completed: false },
      { id: 'm3', title: 'Distributed State Synchronization', description: 'Integrate Redis Lua scripting to prevent race conditions across server nodes.', completed: false },
      { id: 'm4', title: 'Load Stress Testing & Dockerization', description: 'Benchmark with k6 under 5,000 req/sec and confirm zero double-grants.', completed: false }
    ],
    estimatedEffortHours: 30,
    evaluationCriteria: [
      'Accurate rate limiting under high concurrency without race conditions',
      'Comprehensive unit and integration test coverage (> 85%)',
      'Clean architectural documentation with sequence diagrams'
    ],
    requiredEvidence: 'GitHub repository with automated GitHub Action test run and load test report.'
  },
  {
    id: 'proj_frontend_kanban',
    title: 'Collaborative Kanban & State Management Engine',
    difficulty: 'Intermediate',
    skillsDemonstrated: ['html_css', 'javascript', 'typescript', 'react', 'web_perf'],
    whyItMatters: 'Demonstrates deep mastery of complex client-side state, accessible drag-and-drop interactions, optimistic UI updates, and responsive component design without bloat.',
    coreFeatures: [
      'Multi-column drag-and-drop task reordering with accessible keyboard fallback',
      'Optimistic updates with automated rollback on network failure',
      'Search, tag filtering, custom labels, and inline rich markdown editing',
      '100% WCAG 2.1 AA accessible with dark/light theme tokens'
    ],
    suggestedTechStack: ['React 18/19', 'TypeScript', 'CSS Modules / Pure CSS Tokens', 'Vite', 'Vitest'],
    milestones: [
      { id: 'm1', title: 'Design System & Accessible Columns', description: 'Create accessible card layout, semantic markup, and theme variables.', completed: false },
      { id: 'm2', title: 'Drag-and-Drop & Keyboard Navigation', description: 'Build smooth drag reordering with complete keyboard arrow support.', completed: false },
      { id: 'm3', title: 'Optimistic State & Local Storage', description: 'Handle local caching, undo/redo history, and optimistic mutations.', completed: false },
      { id: 'm4', title: 'Performance Optimization & Lighthouse Audit', description: 'Virtualize long columns and achieve 95+ score on Lighthouse.', completed: false }
    ],
    estimatedEffortHours: 20,
    evaluationCriteria: [
      'Zero layout shifts (CLS < 0.05) and snappy 60fps drag operations',
      'Full keyboard operability and screen-reader accessibility',
      'Strict TypeScript typings with no `any` escapes'
    ],
    requiredEvidence: 'Live URL on Vercel/Netlify and public GitHub repository.'
  },
  {
    id: 'proj_fullstack_saas',
    title: 'Secure Multi-Tenant Task & Auth API Service',
    difficulty: 'Advanced',
    skillsDemonstrated: ['node_backend', 'sql', 'backend_security', 'docker', 'react'],
    whyItMatters: 'Covers the full enterprise stack: authentication with token refresh, role-based authorization, ACID relational schema design, and seamless client integration.',
    coreFeatures: [
      'JWT access token and HTTP-only cookie refresh rotation with bcrypt passwords',
      'Role-Based Access Control (Admin, Member, Viewer permissions)',
      'Relational PostgreSQL schema with foreign key cascades and audit logs',
      'Interactive client dashboard with session expiration handling'
    ],
    suggestedTechStack: ['Node.js / Express', 'PostgreSQL', 'React', 'TypeScript', 'Docker Compose'],
    milestones: [
      { id: 'm1', title: 'Auth Service & Security Hardening', description: 'Implement registration, login, rate limiting, and token rotation.', completed: false },
      { id: 'm2', title: 'Relational Schema & Migrations', description: 'Build database schema with foreign keys, indexes, and transactional queries.', completed: false },
      { id: 'm3', title: 'RBAC Authorization Middleware', description: 'Enforce resource ownership and permissions at the route layer.', completed: false },
      { id: 'm4', title: 'Full Stack Integration & Deployment', description: 'Hook up React client, add end-to-end tests, and containerize.', completed: false }
    ],
    estimatedEffortHours: 35,
    evaluationCriteria: [
      'Demonstrated protection against SQL injection, XSS, and broken auth',
      'Reliable session management across tab refreshes',
      'Clean automated test suite for positive and negative authorization cases'
    ],
    requiredEvidence: 'GitHub repository with clear setup guide, ER diagram, and working live deployment link.'
  },
  {
    id: 'proj_data_churn',
    title: 'Customer Churn Prediction & Feature Pipeline',
    difficulty: 'Intermediate',
    skillsDemonstrated: ['python', 'data_manipulation', 'math_stats', 'scikit_learn', 'sql'],
    whyItMatters: 'Showcases practical end-to-end data science: exploratory data analysis, feature engineering, class imbalance mitigation, and business revenue impact translation.',
    coreFeatures: [
      'Automated data cleaning and missing value imputation pipeline',
      'Feature engineering: customer tenure, recency-frequency-monetary (RFM) metrics',
      'Trained ensemble model (Random Forest / XGBoost) with PR-AUC evaluation',
      'SHAP value interpretability explanations for high-risk customer accounts'
    ],
    suggestedTechStack: ['Python', 'Pandas', 'Scikit-Learn', 'SHAP', 'Matplotlib / Seaborn'],
    milestones: [
      { id: 'm1', title: 'Data Cleaning & Cohort EDA', description: 'Analyze distributions, identify multicollinearity, and encode features.', completed: false },
      { id: 'm2', title: 'Feature Pipeline & Cross-Validation', description: 'Build leakage-free Scikit-Learn Pipeline with stratified 5-fold CV.', completed: false },
      { id: 'm3', title: 'Model Tuning & Calibration', description: 'Tune hyperparameters and calibrate predicted probabilities for business thresholds.', completed: false },
      { id: 'm4', title: 'Explainability & Executive Summary', description: 'Generate SHAP feature importance plots and write actionable retention recommendations.', completed: false }
    ],
    estimatedEffortHours: 25,
    evaluationCriteria: [
      'Strict adherence to zero data leakage practices',
      'Focus on Precision-Recall curves over raw accuracy on imbalanced data',
      'Executive-ready summary explaining which customer behaviors trigger churn'
    ],
    requiredEvidence: 'GitHub repository containing reproducible Jupyter Notebook, packaged Python pipeline, and executive summary PDF/markdown.'
  }
];
