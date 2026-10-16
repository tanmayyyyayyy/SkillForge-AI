import { CareerRole } from '../../src/types/index.js';

export const CAREER_ROLES: CareerRole[] = [
  {
    id: 'aiml',
    title: 'AI/ML Engineer',
    category: 'Artificial Intelligence & Data',
    shortDescription: 'Build, optimize, and deploy machine learning models and intelligent LLM-driven applications.',
    fullDescription: 'AI/ML Engineers bridge data science and software engineering by designing predictive models, training deep neural networks, and deploying robust AI systems at scale into production pipelines.',
    averageStartingSalary: '$115,000 / ₹14 - 24 LPA',
    marketDemand: 'Very High',
    stages: [
      {
        stageNumber: 1,
        name: 'Mathematical & Programming Foundations',
        description: 'Master core Python, linear algebra, vector calculus, and data manipulation.',
        skillIds: ['python', 'math_stats', 'data_manipulation']
      },
      {
        stageNumber: 2,
        name: 'Classical Machine Learning',
        description: 'Understand feature engineering, supervised/unsupervised algorithms, and evaluation metrics.',
        skillIds: ['scikit_learn', 'sql']
      },
      {
        stageNumber: 3,
        name: 'Deep Learning & Neural Networks',
        description: 'Build neural architectures, computer vision, and NLP models with PyTorch.',
        skillIds: ['pytorch', 'deep_learning']
      },
      {
        stageNumber: 4,
        name: 'Modern GenAI & LLM Engineering',
        description: 'Leverage LLMs, prompt engineering, RAG pipelines, and vector databases.',
        skillIds: ['llm_rag', 'fastapi']
      },
      {
        stageNumber: 5,
        name: 'MLOps & Production Deployment',
        description: 'Containerize models, setup CI/CD for ML, and monitor inference endpoints.',
        skillIds: ['docker', 'mlops']
      }
    ],
    requiredSkills: [
      {
        skillId: 'python',
        name: 'Python Programming',
        category: 'Programming Languages',
        requiredLevel: 4,
        importance: 0.95,
        prerequisites: [],
        assessmentCriteria: [
          'Proficient with list comprehensions, generators, and decorators',
          'Object-oriented design and modular packaging',
          'Async programming and memory profiling'
        ],
        estimatedHours: 40,
        learningResources: [
          { title: 'Official Python Documentation & Tutorial', type: 'doc', url: 'https://docs.python.org/3/tutorial/', free: true },
          { title: 'Fluent Python (Core concepts)', type: 'tutorial', url: 'https://realpython.com/', free: true }
        ],
        practiceActivity: 'Solve 25 algorithmic problems and write modular data processing scripts with unit tests.',
        projectApplication: 'Write a high-performance CLI tool for dataset parsing with multithreading.'
      },
      {
        skillId: 'math_stats',
        name: 'Linear Algebra & Statistics',
        category: 'Mathematics',
        requiredLevel: 3,
        importance: 0.85,
        prerequisites: [],
        assessmentCriteria: [
          'Matrix operations, eigenvalues, and SVD',
          'Probability distributions and Bayes theorem',
          'Hypothesis testing, p-values, and confidence intervals'
        ],
        estimatedHours: 35,
        learningResources: [
          { title: '3Blue1Brown Essence of Linear Algebra', type: 'tutorial', url: 'https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab', free: true },
          { title: 'Khan Academy Statistics & Probability', type: 'course', url: 'https://www.khanacademy.org/math/statistics-probability', free: true }
        ],
        practiceActivity: 'Implement matrix multiplication and gradient descent from scratch in pure Python.',
        projectApplication: 'Build a statistical hypothesis testing engine for A/B experiment evaluation.'
      },
      {
        skillId: 'data_manipulation',
        name: 'Data Wrangling (NumPy & Pandas)',
        category: 'Data Engineering',
        requiredLevel: 4,
        importance: 0.9,
        prerequisites: ['python'],
        assessmentCriteria: [
          'Vectorized operations and multidimensional broadcasting in NumPy',
          'Data cleaning, group-by aggregations, and pivot tables in Pandas',
          'Handling missing values, outliers, and time-series indexing'
        ],
        estimatedHours: 30,
        learningResources: [
          { title: 'Pandas User Guide & Cookbook', type: 'doc', url: 'https://pandas.pydata.org/docs/user_guide/', free: true },
          { title: 'NumPy Quickstart Guide', type: 'doc', url: 'https://numpy.org/doc/stable/user/quickstart.html', free: true }
        ],
        practiceActivity: 'Clean a messy 100k-row e-commerce dataset, impute values, and compute cohort retention.',
        projectApplication: 'Create an automated exploratory data analysis (EDA) pipeline generating summary reports.'
      },
      {
        skillId: 'sql',
        name: 'SQL & Relational Databases',
        category: 'Data Management',
        requiredLevel: 3,
        importance: 0.8,
        prerequisites: [],
        assessmentCriteria: [
          'Complex joins, window functions, and CTEs',
          'Query optimization and indexing strategies',
          'Data aggregation for business intelligence queries'
        ],
        estimatedHours: 25,
        learningResources: [
          { title: 'PostgreSQL Tutorial & Reference', type: 'doc', url: 'https://www.postgresqltutorial.com/', free: true },
          { title: 'Mode Analytics SQL Tutorial', type: 'tutorial', url: 'https://mode.com/sql-tutorial/', free: true }
        ],
        practiceActivity: 'Write analytical SQL queries with window functions (RANK, ROW_NUMBER, LAG) on sample schemas.',
        projectApplication: 'Design a feature store schema to query customer behavior metrics for ML inference.'
      },
      {
        skillId: 'scikit_learn',
        name: 'Classical ML (Scikit-Learn)',
        category: 'Machine Learning',
        requiredLevel: 4,
        importance: 0.9,
        prerequisites: ['python', 'data_manipulation', 'math_stats'],
        assessmentCriteria: [
          'Classification, regression, and clustering algorithms',
          'Cross-validation, hyperparameter tuning (Grid/Random Search)',
          'Evaluation metrics (ROC-AUC, Precision/Recall, F1-Score, Confusion Matrix)'
        ],
        estimatedHours: 45,
        learningResources: [
          { title: 'Scikit-Learn User Guide', type: 'doc', url: 'https://scikit-learn.org/stable/user_guide.html', free: true },
          { title: 'Hands-On Machine Learning (Scikit-Learn & PyTorch)', type: 'course', url: 'https://github.com/ageron/handson-ml3', free: true }
        ],
        practiceActivity: 'Train and compare 5 classification models on Kaggle datasets with feature importance analysis.',
        projectApplication: 'Build a customer churn prediction engine with probability calibration and explanation.'
      },
      {
        skillId: 'pytorch',
        name: 'Deep Learning with PyTorch',
        category: 'Deep Learning',
        requiredLevel: 4,
        importance: 0.92,
        prerequisites: ['python', 'math_stats', 'scikit_learn'],
        assessmentCriteria: [
          'Tensors, autograd, computational graphs, and GPU acceleration',
          'Custom Dataset and DataLoader pipelines',
          'Building CNNs, RNNs, and Transformer building blocks from scratch'
        ],
        estimatedHours: 50,
        learningResources: [
          { title: 'Official PyTorch Tutorials', type: 'doc', url: 'https://pytorch.org/tutorials/', free: true },
          { title: 'Deep Learning with PyTorch: A 60 Minute Blitz', type: 'tutorial', url: 'https://pytorch.org/tutorials/beginner/blitz/tensor_tutorial.html', free: true }
        ],
        practiceActivity: 'Train an image classification ResNet model on GPU with data augmentation and early stopping.',
        projectApplication: 'Train a multimodal embedding classifier to match product images with text queries.'
      },
      {
        skillId: 'fastapi',
        name: 'FastAPI & REST Model Serving',
        category: 'API Development',
        requiredLevel: 3,
        importance: 0.78,
        prerequisites: ['python'],
        assessmentCriteria: [
          'Asynchronous route handlers and Pydantic validation schemas',
          'Model loading, caching, batching, and inference latency profiling',
          'API error handling, OpenAPI docs, and authentication'
        ],
        estimatedHours: 25,
        learningResources: [
          { title: 'FastAPI Official Documentation', type: 'doc', url: 'https://fastapi.tiangolo.com/tutorial/', free: true }
        ],
        practiceActivity: 'Expose a pre-trained ML model via async POST endpoint with request schema validation.',
        projectApplication: 'Build a high-throughput sentiment classification API with health checks and batching.'
      },
      {
        skillId: 'llm_rag',
        name: 'LLMs, Prompting & RAG Pipelines',
        category: 'Generative AI',
        requiredLevel: 3,
        importance: 0.88,
        prerequisites: ['python', 'fastapi'],
        assessmentCriteria: [
          'Vector embeddings, semantic search, and cosine similarity',
          'Vector database integration (ChromaDB / Pinecone / pgvector)',
          'Chunking strategies, retrieval evaluation, and hallucination reduction'
        ],
        estimatedHours: 35,
        learningResources: [
          { title: 'LangChain / LlamaIndex Retrieval Guides', type: 'doc', url: 'https://docs.llamaindex.ai/en/stable/', free: true },
          { title: 'Hugging Face NLP Course', type: 'course', url: 'https://huggingface.co/learn/nlp-course', free: true }
        ],
        practiceActivity: 'Implement a retrieval-augmented question answering pipeline over customized PDF docs.',
        projectApplication: 'Develop an intelligent developer documentation assistant with citation links.'
      },
      {
        skillId: 'docker',
        name: 'Docker & Containerization',
        category: 'DevOps & Deployment',
        requiredLevel: 3,
        importance: 0.8,
        prerequisites: [],
        assessmentCriteria: [
          'Writing efficient multi-stage Dockerfiles for Python/ML environments',
          'Managing CUDA dependencies, volumes, and network ports',
          'Docker Compose orchestration for API + database + vector store'
        ],
        estimatedHours: 20,
        learningResources: [
          { title: 'Docker Official Get Started Guide', type: 'doc', url: 'https://docs.docker.com/get-started/', free: true }
        ],
        practiceActivity: 'Containerize a PyTorch inference service with minimal image size and non-root user.',
        projectApplication: 'Create a full Docker Compose setup linking an AI API service, PostgreSQL, and Redis cache.'
      },
      {
        skillId: 'mlops',
        name: 'MLOps & Experiment Tracking',
        category: 'DevOps & Deployment',
        requiredLevel: 3,
        importance: 0.82,
        prerequisites: ['scikit_learn', 'docker'],
        assessmentCriteria: [
          'Experiment logging with MLflow or Weights & Biases',
          'Model registry, versioning, and artifact storage',
          'Data drift detection and automated CI/CD retraining triggers'
        ],
        estimatedHours: 30,
        learningResources: [
          { title: 'MLflow Documentation & Quickstart', type: 'doc', url: 'https://mlflow.org/docs/latest/index.html', free: true },
          { title: 'Made With ML (MLOps Course)', type: 'course', url: 'https://madewithml.com/', free: true }
        ],
        practiceActivity: 'Log metrics, hyperparameters, and ROC curves across 10 training runs in an MLflow server.',
        projectApplication: 'Build an automated GitHub Action that trains a baseline model and logs evaluation artifacts.'
      },
      {
        skillId: 'deep_learning',
        name: 'Neural Networks & Deep Learning',
        category: 'Deep Learning',
        requiredLevel: 4,
        importance: 0.9,
        prerequisites: ['pytorch'],
        assessmentCriteria: [
          'Forward and backward propagation, loss functions, and gradient-based optimization',
          'CNN, RNN, and Transformer architecture design tradeoffs',
          'Regularization techniques (dropout, batch normalization, weight decay)',
          'Transfer learning and fine-tuning of pre-trained models'
        ],
        estimatedHours: 45,
        learningResources: [
          { title: 'Deep Learning Book (Goodfellow et al.)', type: 'doc', url: 'https://www.deeplearningbook.org/', free: true },
          { title: 'fast.ai: Practical Deep Learning for Coders', type: 'course', url: 'https://course.fast.ai/', free: true }
        ],
        practiceActivity: 'Implement a convolutional network from scratch and train it on CIFAR-10 with data augmentation.',
        projectApplication: 'Fine-tune a pre-trained vision transformer for a domain-specific image classification task.'
      }
    ]
  },
  {
    id: 'sde',
    title: 'Software Development Engineer',
    category: 'Core Software Engineering',
    shortDescription: 'Master algorithms, object-oriented design, system architecture, and robust enterprise software.',
    fullDescription: 'Software Development Engineers (SDEs) build reliable, scalable distributed systems and applications using foundational computer science concepts, object-oriented principles, and rigorous engineering practices.',
    averageStartingSalary: '$110,000 / ₹12 - 22 LPA',
    marketDemand: 'Very High',
    stages: [
      {
        stageNumber: 1,
        name: 'Data Structures & Algorithms',
        description: 'Core problem-solving, time & space complexities, graphs, trees, and dynamic programming.',
        skillIds: ['dsa', 'clean_code']
      },
      {
        stageNumber: 2,
        name: 'Core Programming & OOP',
        description: 'Deep understanding of OOP patterns, concurrency, and memory management in Java/C++/Go.',
        skillIds: ['core_oop', 'git_versioning']
      },
      {
        stageNumber: 3,
        name: 'Databases & Storage',
        description: 'ACID properties, transaction isolation, relational indexing, and NoSQL tradeoffs.',
        skillIds: ['sql', 'nosql_redis']
      },
      {
        stageNumber: 4,
        name: 'System Design Fundamentals',
        description: 'Scalability, caching, load balancing, message queues, and API design.',
        skillIds: ['system_design', 'api_architecture']
      },
      {
        stageNumber: 5,
        name: 'Testing, CI/CD & Production Engineering',
        description: 'Unit testing, integration testing, containerization, and monitoring.',
        skillIds: ['testing_qa', 'docker']
      }
    ],
    requiredSkills: [
      {
        skillId: 'dsa',
        name: 'Data Structures & Algorithms',
        category: 'Computer Science Core',
        requiredLevel: 4,
        importance: 0.98,
        prerequisites: [],
        assessmentCriteria: [
          'Binary trees, graphs (BFS/DFS, Dijkstra), heaps, and hash maps',
          'Dynamic programming, recursion, and backtracking strategies',
          'Asymptotic Big-O analysis of time and auxiliary space'
        ],
        estimatedHours: 60,
        learningResources: [
          { title: 'Algorithms by Robert Sedgewick', type: 'course', url: 'https://algs4.cs.princeton.edu/home/', free: true },
          { title: 'NeetCode Algorithms Roadmap', type: 'tutorial', url: 'https://neetcode.io/roadmap', free: true }
        ],
        practiceActivity: 'Solve 100 categorized LeetCode medium/hard problems covering trees, graphs, and DP.',
        projectApplication: 'Implement an in-memory graph search engine finding shortest routing paths in street networks.'
      },
      {
        skillId: 'core_oop',
        name: 'Object-Oriented Design & Design Patterns',
        category: 'Software Design',
        requiredLevel: 4,
        importance: 0.9,
        prerequisites: [],
        assessmentCriteria: [
          'SOLID design principles and practical refactoring',
          'Factory, Observer, Strategy, and Singleton design patterns',
          'Inheritance vs composition tradeoffs and dependency injection'
        ],
        estimatedHours: 35,
        learningResources: [
          { title: 'Refactoring Guru: Design Patterns', type: 'doc', url: 'https://refactoring.guru/design-patterns', free: true }
        ],
        practiceActivity: 'Refactor a tightly-coupled monolithic calculator into a strategy-pattern extensible evaluator.',
        projectApplication: 'Design a simulation of an automated elevator dispatching system using OOP design patterns.'
      },
      {
        skillId: 'system_design',
        name: 'Distributed Systems & System Design',
        category: 'Architecture',
        requiredLevel: 3,
        importance: 0.92,
        prerequisites: ['dsa', 'sql'],
        assessmentCriteria: [
          'Horizontal vs vertical scaling, load balancers, and reverse proxies',
          'Caching strategies (Cache-Aside, Write-Through, LRU eviction)',
          'Message queues (Kafka/RabbitMQ) for asynchronous decoupling and eventual consistency'
        ],
        estimatedHours: 40,
        learningResources: [
          { title: 'System Design Primer by Donne Martin', type: 'doc', url: 'https://github.com/donnemartin/system-design-primer', free: true }
        ],
        practiceActivity: 'Sketch and write architectural RFC specifications for a high-traffic URL shortening service.',
        projectApplication: 'Build a distributed rate limiter using token-bucket algorithm and Redis.'
      },
      {
        skillId: 'sql',
        name: 'Relational Database Design & SQL',
        category: 'Data Management',
        requiredLevel: 3,
        importance: 0.85,
        prerequisites: [],
        assessmentCriteria: [
          'Database normalization (3NF) and foreign key constraints',
          'B-Tree indexing and query execution plan analysis (EXPLAIN ANALYZE)',
          'Transactions, ACID compliance, and concurrency locking mechanisms'
        ],
        estimatedHours: 30,
        learningResources: [
          { title: 'Use The Index, Luke (SQL Indexing Guide)', type: 'tutorial', url: 'https://use-the-index-luke.com/', free: true }
        ],
        practiceActivity: 'Design an e-commerce schema with inventory locking, optimize slow queries with proper indexes.',
        projectApplication: 'Develop a transactional banking ledger API ensuring zero double-spending under concurrent loads.'
      },
      {
        skillId: 'testing_qa',
        name: 'Automated Testing (Unit & Integration)',
        category: 'Software Quality',
        requiredLevel: 3,
        importance: 0.82,
        prerequisites: ['core_oop'],
        assessmentCriteria: [
          'Unit testing with mocks, stubs, and assertions',
          'Integration testing of database and network boundaries',
          'Test-Driven Development (TDD) workflow and code coverage goals'
        ],
        estimatedHours: 25,
        learningResources: [
          { title: 'Martin Fowler: Practical Test Pyramid', type: 'doc', url: 'https://martinfowler.com/articles/practical-test-pyramid.html', free: true }
        ],
        practiceActivity: 'Write 100% test coverage suite with edge-case mocks for an order processing service.',
        projectApplication: 'Build a robust authentication microservice with comprehensive unit and integration test suites.'
      },
      {
        skillId: 'git_versioning',
        name: 'Git & Collaborative Workflow',
        category: 'Developer Tools',
        requiredLevel: 4,
        importance: 0.8,
        prerequisites: [],
        assessmentCriteria: [
          'Branching strategies, interactive rebasing, and resolving complex merge conflicts',
          'Pull requests, peer code reviews, and semantic commit conventions',
          'Git cherry-pick, stash, and bisect for debugging regressions'
        ],
        estimatedHours: 15,
        learningResources: [
          { title: 'Pro Git Book (Free)', type: 'doc', url: 'https://git-scm.com/book/en/v2', free: true }
        ],
        practiceActivity: 'Execute an interactive git rebase, squash commits, and resolve deliberate three-way conflicts.',
        projectApplication: 'Establish a production GitHub repository with branch protection rules and automated lint checks.'
      },
      {
        skillId: 'docker',
        name: 'Docker & Containerization',
        category: 'DevOps & Deployment',
        requiredLevel: 3,
        importance: 0.78,
        prerequisites: [],
        assessmentCriteria: [
          'Multi-stage container builds for compiled languages',
          'Container networking and persistent volume mounts',
          'Docker Compose multi-service orchestration'
        ],
        estimatedHours: 20,
        learningResources: [
          { title: 'Docker Official Get Started Guide', type: 'doc', url: 'https://docs.docker.com/get-started/', free: true }
        ],
        practiceActivity: 'Package a backend application into a sub-100MB production alpine container.',
        projectApplication: 'Compose an entire local development stack consisting of backend API, PostgreSQL, and Redis.'
      },
      {
        skillId: 'clean_code',
        name: 'Clean Code & Refactoring',
        category: 'Software Design',
        requiredLevel: 3,
        importance: 0.8,
        prerequisites: ['core_oop'],
        assessmentCriteria: [
          'Meaningful naming, single-responsibility functions, and small cohesive modules',
          'Identifying and eliminating code smells and duplication',
          'Safe refactoring techniques backed by a regression test suite',
          'Static analysis, linting, and formatting enforcement in CI'
        ],
        estimatedHours: 20,
        learningResources: [
          { title: 'Refactoring.guru: Refactoring Catalog', type: 'doc', url: 'https://refactoring.guru/refactoring', free: true },
          { title: 'Google Engineering Practices', type: 'doc', url: 'https://google.github.io/eng-practices/', free: true }
        ],
        practiceActivity: 'Refactor a legacy, tightly-coupled module into clean, tested units without changing behavior.',
        projectApplication: 'Publish a well-documented utility library enforcing lint rules with 90%+ test coverage.'
      },
      {
        skillId: 'nosql_redis',
        name: 'NoSQL & Redis Caching',
        category: 'Data Management',
        requiredLevel: 3,
        importance: 0.75,
        prerequisites: ['sql'],
        assessmentCriteria: [
          'Key-value, document, and columnar store tradeoffs vs relational databases',
          'Redis data structures (strings, hashes, sets, sorted sets)',
          'Cache-aside, write-through strategies, and TTL/eviction policies'
        ],
        estimatedHours: 25,
        learningResources: [
          { title: 'Redis University & Documentation', type: 'doc', url: 'https://redis.io/docs/', free: true },
          { title: 'MongoDB University Basics', type: 'course', url: 'https://learn.mongodb.com/', free: true }
        ],
        practiceActivity: 'Add a Redis caching layer to an existing query path and measure the latency improvement.',
        projectApplication: 'Build a distributed session store and rate limiter using Redis with graceful cache-miss fallback.'
      },
      {
        skillId: 'api_architecture',
        name: 'API Design & Architecture',
        category: 'API Development',
        requiredLevel: 3,
        importance: 0.82,
        prerequisites: ['core_oop'],
        assessmentCriteria: [
          'REST resource modeling, HTTP semantics, status codes, and versioning',
          'Pagination, filtering, idempotency, and error response contracts',
          'GraphQL vs REST tradeoffs and schema-driven design',
          'API documentation (OpenAPI) and contract testing'
        ],
        estimatedHours: 25,
        learningResources: [
          { title: 'Microsoft REST API Design Guidelines', type: 'doc', url: 'https://github.com/microsoft/api-guidelines', free: true },
          { title: 'OpenAPI Specification', type: 'doc', url: 'https://spec.openapis.org/oas/latest.html', free: true }
        ],
        practiceActivity: 'Design and document a versioned REST API with consistent error handling and pagination.',
        projectApplication: 'Build a public REST API with OpenAPI-generated docs and automated contract tests.'
      }
    ]
  },
  {
    id: 'frontend',
    title: 'Frontend Developer',
    category: 'Web & Client Development',
    shortDescription: 'Craft intuitive, accessible, high-performance web applications and design systems.',
    fullDescription: 'Frontend Developers specialize in modern user interfaces, browser architecture, web performance, reactive state management, and accessible UI component engineering.',
    averageStartingSalary: '$98,000 / ₹10 - 18 LPA',
    marketDemand: 'High',
    stages: [
      {
        stageNumber: 1,
        name: 'Web Fundamentals & Styling',
        description: 'Semantic HTML5, CSS layout engines (Flexbox, Grid), and responsive design.',
        skillIds: ['html_css', 'javascript']
      },
      {
        stageNumber: 2,
        name: 'Modern TypeScript & Component Engineering',
        description: 'Strongly typed UI logic, React hooks, and component lifecycle.',
        skillIds: ['typescript', 'react']
      },
      {
        stageNumber: 3,
        name: 'State Architecture & API Integration',
        description: 'Global state management, cache invalidation, and REST/GraphQL fetching.',
        skillIds: ['state_management', 'rest_apis']
      },
      {
        stageNumber: 4,
        name: 'Performance, Accessibility & Testing',
        description: 'Core Web Vitals, WCAG 2.1 accessibility, and end-to-end component testing.',
        skillIds: ['web_perf', 'frontend_testing']
      }
    ],
    requiredSkills: [
      {
        skillId: 'html_css',
        name: 'Semantic HTML5 & Modern CSS',
        category: 'Frontend Core',
        requiredLevel: 4,
        importance: 0.92,
        prerequisites: [],
        assessmentCriteria: [
          'Semantic HTML elements for document structure and screen readers',
          'Advanced CSS Grid, Flexbox, and responsive media queries',
          'CSS Custom Properties (tokens), transitions, and fluid typography'
        ],
        estimatedHours: 30,
        learningResources: [
          { title: 'MDN Web Docs: HTML & CSS', type: 'doc', url: 'https://developer.mozilla.org/en-US/docs/Learn', free: true },
          { title: 'CSS-Tricks Flexbox & Grid Guides', type: 'tutorial', url: 'https://css-tricks.com/', free: true }
        ],
        practiceActivity: 'Build a pixel-perfect, fully responsive landing page without any CSS frameworks.',
        projectApplication: 'Develop a responsive component UI library featuring buttons, cards, modals, and toasts.'
      },
      {
        skillId: 'javascript',
        name: 'Modern JavaScript (ES6+)',
        category: 'Frontend Core',
        requiredLevel: 4,
        importance: 0.95,
        prerequisites: ['html_css'],
        assessmentCriteria: [
          'Event loop, microtasks, promises, and async/await mechanisms',
          'Closures, prototypes, hoisting, and scope isolation',
          'DOM manipulation, event delegation, and performance optimizations'
        ],
        estimatedHours: 40,
        learningResources: [
          { title: 'JavaScript.info (Modern Tutorial)', type: 'tutorial', url: 'https://javascript.info/', free: true }
        ],
        practiceActivity: 'Build a vanilla JavaScript drag-and-drop Kanban board with local storage persistence.',
        projectApplication: 'Code a lightweight reactive state store and DOM rendering engine from scratch.'
      },
      {
        skillId: 'typescript',
        name: 'TypeScript for Frontend',
        category: 'Programming Languages',
        requiredLevel: 4,
        importance: 0.9,
        prerequisites: ['javascript'],
        assessmentCriteria: [
          'Generics, mapped types, utility types, and union discrimination',
          'Typing React component props, ref targets, and event handlers',
          'Strict compiler settings and runtime boundary type validation'
        ],
        estimatedHours: 35,
        learningResources: [
          { title: 'Official TypeScript Handbook', type: 'doc', url: 'https://www.typescriptlang.org/docs/handbook/', free: true },
          { title: 'Total TypeScript Essentials', type: 'tutorial', url: 'https://www.totaltypescript.com/', free: true }
        ],
        practiceActivity: 'Convert an untyped React application to strict TypeScript with zero any assertions.',
        projectApplication: 'Create a strongly typed form management library with schema validation inference.'
      },
      {
        skillId: 'react',
        name: 'React.js & Component Architecture',
        category: 'UI Libraries',
        requiredLevel: 4,
        importance: 0.95,
        prerequisites: ['javascript', 'typescript'],
        assessmentCriteria: [
          'Custom hooks for reusable business logic',
          'Memoization techniques (useMemo, useCallback, React.memo) to prevent unnecessary renders',
          'Compound component patterns and context API architecture'
        ],
        estimatedHours: 45,
        learningResources: [
          { title: 'Official React Documentation (react.dev)', type: 'doc', url: 'https://react.dev/', free: true }
        ],
        practiceActivity: 'Build a dynamic data grid with column sorting, filtering, and row virtualization.',
        projectApplication: 'Develop an interactive project management dashboard with real-time analytics widgets.'
      },
      {
        skillId: 'web_perf',
        name: 'Web Performance & Accessibility (a11y)',
        category: 'Frontend Quality',
        requiredLevel: 3,
        importance: 0.85,
        prerequisites: ['html_css', 'react'],
        assessmentCriteria: [
          'Lighthouse audit score optimization (LCP, FID/INP, CLS)',
          'Lazy loading, code splitting (React.lazy), and bundle size analysis',
          'ARIA roles, keyboard navigability, and focus trap management'
        ],
        estimatedHours: 25,
        learningResources: [
          { title: 'web.dev (Core Web Vitals Guide)', type: 'doc', url: 'https://web.dev/explore/metrics', free: true }
        ],
        practiceActivity: 'Audit and optimize an existing web app to score 95+ across all Lighthouse categories.',
        projectApplication: 'Implement an accessible modal dialog system featuring complete keyboard navigation and ARIA attributes.'
      },
      {
        skillId: 'state_management',
        name: 'State Management (Redux / Zustand)',
        category: 'Frontend Architecture',
        requiredLevel: 3,
        importance: 0.85,
        prerequisites: ['react'],
        assessmentCriteria: [
          'Local vs global state, lifting state, and prop-drilling avoidance',
          'Reducers, stores, actions, and immutable update patterns',
          'Server-state caching and invalidation with TanStack Query',
          'Performance: selector memoization and render minimization'
        ],
        estimatedHours: 25,
        learningResources: [
          { title: 'Redux Toolkit Overview', type: 'doc', url: 'https://redux-toolkit.js.org/', free: true },
          { title: 'Zustand Documentation', type: 'doc', url: 'https://zustand.docs.pmnd.rs/', free: true }
        ],
        practiceActivity: 'Migrate prop-drilled component state into a centralized store with memoized selectors.',
        projectApplication: 'Build a collaborative dashboard where shared state syncs across multiple complex widgets.'
      },
      {
        skillId: 'rest_apis',
        name: 'API Integration (REST & GraphQL)',
        category: 'API Development',
        requiredLevel: 3,
        importance: 0.82,
        prerequisites: ['javascript'],
        assessmentCriteria: [
          'Fetching, loading, and error states with abort/cancellation handling',
          'Authentication headers, token refresh, and request interceptors',
          'Caching, optimistic updates, and pagination strategies',
          'Consuming GraphQL queries and mutations with typed clients'
        ],
        estimatedHours: 25,
        learningResources: [
          { title: 'MDN: Fetch API & Async JavaScript', type: 'doc', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API', free: true },
          { title: 'Apollo Client Tutorial', type: 'tutorial', url: 'https://www.apollographql.com/tutorials/', free: true }
        ],
        practiceActivity: 'Build a data-fetching layer with retries, cancellation, and optimistic UI updates.',
        projectApplication: 'Develop a real-time analytics dashboard consuming both REST and GraphQL endpoints.'
      },
      {
        skillId: 'frontend_testing',
        name: 'Frontend Testing (Jest / RTL / Cypress)',
        category: 'Frontend Quality',
        requiredLevel: 3,
        importance: 0.8,
        prerequisites: ['react', 'javascript'],
        assessmentCriteria: [
          'Component testing with React Testing Library and user-event',
          'Mocking network requests and testing async UI flows',
          'End-to-end testing with Cypress or Playwright',
          'Test coverage strategy and CI integration'
        ],
        estimatedHours: 25,
        learningResources: [
          { title: 'Testing Library Documentation', type: 'doc', url: 'https://testing-library.com/docs/', free: true },
          { title: 'Playwright End-to-End Testing', type: 'doc', url: 'https://playwright.dev/docs/intro', free: true }
        ],
        practiceActivity: 'Write component tests for a form with validation plus an end-to-end happy-path test.',
        projectApplication: 'Add a CI pipeline that runs unit and end-to-end suites on every pull request.'
      }
    ]
  },
  {
    id: 'backend',
    title: 'Backend Developer',
    category: 'Server & Systems',
    shortDescription: 'Architect robust REST/GraphQL APIs, distributed data pipelines, and microservices.',
    fullDescription: 'Backend Developers engineer server-side logic, database schemas, secure authentication mechanisms, caching tiers, and scalable API services that power client applications.',
    averageStartingSalary: '$105,000 / ₹11 - 20 LPA',
    marketDemand: 'Very High',
    stages: [
      {
        stageNumber: 1,
        name: 'Server Foundations & Node/Go/Python',
        description: 'HTTP protocol, async I/O, server lifecycle, and runtime internals.',
        skillIds: ['node_backend', 'rest_apis']
      },
      {
        stageNumber: 2,
        name: 'Database Architecture & Data Modeling',
        description: 'PostgreSQL, query planning, indexing, migrations, and ORMs.',
        skillIds: ['sql', 'nosql_redis']
      },
      {
        stageNumber: 3,
        name: 'Security & Authentication',
        description: 'JWT, OAuth2, password hashing, role-based access control, and sanitization.',
        skillIds: ['backend_security']
      },
      {
        stageNumber: 4,
        name: 'Scalability, Caching & Deployment',
        description: 'Redis caching, background workers, Docker, and monitoring.',
        skillIds: ['system_design', 'docker']
      }
    ],
    requiredSkills: [
      {
        skillId: 'node_backend',
        name: 'Node.js & Express / Fastify',
        category: 'Backend Runtimes',
        requiredLevel: 4,
        importance: 0.94,
        prerequisites: [],
        assessmentCriteria: [
          'Node.js event loop, streams, and cluster module',
          'Middleware pipeline design, error handling, and request validation',
          'Graceful server shutdown, logging, and environment management'
        ],
        estimatedHours: 40,
        learningResources: [
          { title: 'Node.js Official Documentation & Guides', type: 'doc', url: 'https://nodejs.org/en/docs/', free: true }
        ],
        practiceActivity: 'Build a streaming file processing server capable of transforming multi-gigabyte CSVs.',
        projectApplication: 'Construct a modular enterprise REST API with automated OpenAPI Swagger documentation.'
      },
      {
        skillId: 'sql',
        name: 'PostgreSQL & Database Modeling',
        category: 'Data Management',
        requiredLevel: 4,
        importance: 0.92,
        prerequisites: [],
        assessmentCriteria: [
          'Schema design, foreign key cascades, and check constraints',
          'Composite indexing, EXPLAIN ANALYZE, and execution plan optimization',
          'Database transactions, row-level locking, and rollback handling'
        ],
        estimatedHours: 35,
        learningResources: [
          { title: 'PostgreSQL Tutorial', type: 'doc', url: 'https://www.postgresqltutorial.com/', free: true }
        ],
        practiceActivity: 'Design and benchmark relational schemas under 10,000 concurrent write operations.',
        projectApplication: 'Build a multi-tenant database architecture with automated tenant schema isolation.'
      },
      {
        skillId: 'backend_security',
        name: 'Backend Security & Auth (JWT/OAuth)',
        category: 'Application Security',
        requiredLevel: 4,
        importance: 0.9,
        prerequisites: ['node_backend'],
        assessmentCriteria: [
          'JWT access/refresh token rotation with secure HTTP-only cookies',
          'Password hashing using bcrypt/Argon2 with proper salting',
          'Protection against OWASP Top 10 (SQL injection, XSS, CSRF, rate limiting)'
        ],
        estimatedHours: 30,
        learningResources: [
          { title: 'OWASP Top 10 Security Risks', type: 'doc', url: 'https://owasp.org/www-project-top-ten/', free: true }
        ],
        practiceActivity: 'Implement a complete token rotation auth flow with IP/user-agent fingerprinting.',
        projectApplication: 'Build a reusable Role-Based Access Control (RBAC) authentication microservice.'
      },
      {
        skillId: 'nosql_redis',
        name: 'Redis Caching & Pub/Sub',
        category: 'Data Management',
        requiredLevel: 3,
        importance: 0.84,
        prerequisites: [],
        assessmentCriteria: [
          'Redis data structures (strings, hashes, sets, sorted sets)',
          'TTL cache expiration, cache eviction policies, and cache stampede protection',
          'Redis Pub/Sub and stream processing for event-driven decoupled systems'
        ],
        estimatedHours: 25,
        learningResources: [
          { title: 'Redis University & Documentation', type: 'doc', url: 'https://redis.io/docs/', free: true }
        ],
        practiceActivity: 'Build a distributed leaderboard and API response caching layer using Redis.',
        projectApplication: 'Develop a real-time notification service utilizing Redis Pub/Sub channels.'
      },
      {
        skillId: 'docker',
        name: 'Docker & Containerization',
        category: 'DevOps & Deployment',
        requiredLevel: 3,
        importance: 0.8,
        prerequisites: [],
        assessmentCriteria: [
          'Writing efficient multi-stage Dockerfiles',
          'Docker Compose multi-service environment setup',
          'Container health checks and non-root execution security'
        ],
        estimatedHours: 20,
        learningResources: [
          { title: 'Docker Official Get Started Guide', type: 'doc', url: 'https://docs.docker.com/get-started/', free: true }
        ],
        practiceActivity: 'Containerize a Node.js backend with PostgreSQL and Redis via Docker Compose.',
        projectApplication: 'Set up reproducible local development and CI testing environments with Docker.'
      },
      {
        skillId: 'rest_apis',
        name: 'RESTful API Design',
        category: 'API Development',
        requiredLevel: 4,
        importance: 0.9,
        prerequisites: ['node_backend'],
        assessmentCriteria: [
          'Resource-oriented routing and correct HTTP methods and status codes',
          'Input validation, sanitization, and consistent error contracts',
          'Pagination, filtering, sorting, and idempotent write operations',
          'API versioning and OpenAPI documentation'
        ],
        estimatedHours: 30,
        learningResources: [
          { title: 'MDN: HTTP Reference', type: 'doc', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP', free: true },
          { title: 'Microsoft REST API Guidelines', type: 'doc', url: 'https://github.com/microsoft/api-guidelines', free: true }
        ],
        practiceActivity: 'Build a validated, versioned CRUD API with pagination and standardized error responses.',
        projectApplication: 'Design a production REST API with OpenAPI docs and automated integration tests.'
      },
      {
        skillId: 'system_design',
        name: 'Distributed Systems & System Design',
        category: 'Architecture',
        requiredLevel: 3,
        importance: 0.85,
        prerequisites: ['sql', 'node_backend'],
        assessmentCriteria: [
          'Horizontal vs vertical scaling, load balancing, and reverse proxies',
          'Caching tiers and message queues for asynchronous decoupling',
          'Consistency, availability, and partition-tolerance tradeoffs',
          'Observability: metrics, logging, and distributed tracing'
        ],
        estimatedHours: 40,
        learningResources: [
          { title: 'System Design Primer (Donne Martin)', type: 'doc', url: 'https://github.com/donnemartin/system-design-primer', free: true }
        ],
        practiceActivity: 'Write an architectural RFC for a high-traffic service with caching and queue-based workers.',
        projectApplication: 'Build a horizontally scalable background job processing service with idempotent retries.'
      }
    ]
  },
  {
    id: 'fullstack',
    title: 'Full-Stack Developer',
    category: 'Full Stack Engineering',
    shortDescription: 'Bridge client and server to deliver end-to-end scalable web applications.',
    fullDescription: 'Full-Stack Developers command the entire web ecosystem: responsive interactive frontends, secure backend API services, relational databases, cloud hosting, and continuous deployment.',
    averageStartingSalary: '$108,000 / ₹11 - 21 LPA',
    marketDemand: 'Very High',
    stages: [
      {
        stageNumber: 1,
        name: 'Web & Programming Fundamentals',
        description: 'Modern JavaScript/TypeScript, responsive HTML/CSS, and Git.',
        skillIds: ['javascript', 'typescript', 'html_css']
      },
      {
        stageNumber: 2,
        name: 'Modern Frontend Development',
        description: 'React, component design systems, and client routing.',
        skillIds: ['react']
      },
      {
        stageNumber: 3,
        name: 'Backend Architecture & Databases',
        description: 'Node.js, Express, PostgreSQL, and secure authentication.',
        skillIds: ['node_backend', 'sql', 'backend_security']
      },
      {
        stageNumber: 4,
        name: 'DevOps & End-to-End Delivery',
        description: 'Docker containerization, CI/CD pipelines, and cloud deployment.',
        skillIds: ['docker']
      }
    ],
    requiredSkills: [
      {
        skillId: 'javascript',
        name: 'Modern JavaScript (ES6+)',
        category: 'Core',
        requiredLevel: 4,
        importance: 0.95,
        prerequisites: [],
        assessmentCriteria: ['Async/await', 'Closures', 'ES modules', 'Event loop'],
        estimatedHours: 35,
        learningResources: [{ title: 'JavaScript.info', type: 'tutorial', url: 'https://javascript.info/', free: true }],
        practiceActivity: 'Build complex stateful logic in vanilla JS.',
        projectApplication: 'Reactive state management engine.'
      },
      {
        skillId: 'react',
        name: 'React.js & Component Architecture',
        category: 'Frontend',
        requiredLevel: 4,
        importance: 0.92,
        prerequisites: ['javascript'],
        assessmentCriteria: ['Custom hooks', 'State lifting', 'Performance tuning'],
        estimatedHours: 40,
        learningResources: [{ title: 'React.dev', type: 'doc', url: 'https://react.dev/', free: true }],
        practiceActivity: 'Build a multi-step interactive workflow with validation.',
        projectApplication: 'Interactive web application dashboard.'
      },
      {
        skillId: 'node_backend',
        name: 'Node.js & Express Backend',
        category: 'Backend',
        requiredLevel: 4,
        importance: 0.92,
        prerequisites: ['javascript'],
        assessmentCriteria: ['RESTful routing', 'Middleware architecture', 'Error handling'],
        estimatedHours: 35,
        learningResources: [{ title: 'Node.js Docs', type: 'doc', url: 'https://nodejs.org/', free: true }],
        practiceActivity: 'Develop a REST API with CRUD operations and authentication.',
        projectApplication: 'SaaS platform API service.'
      },
      {
        skillId: 'sql',
        name: 'SQL & Relational Databases',
        category: 'Data Management',
        requiredLevel: 3,
        importance: 0.88,
        prerequisites: [],
        assessmentCriteria: ['Schema modeling', 'Foreign keys', 'Query optimization'],
        estimatedHours: 30,
        learningResources: [{ title: 'PostgreSQL Tutorial', type: 'doc', url: 'https://www.postgresqltutorial.com/', free: true }],
        practiceActivity: 'Design a normalized e-commerce database schema.',
        projectApplication: 'Full-stack application database layer.'
      },
      {
        skillId: 'backend_security',
        name: 'Authentication & Security',
        category: 'Security',
        requiredLevel: 3,
        importance: 0.86,
        prerequisites: ['node_backend'],
        assessmentCriteria: ['JWT tokens', 'Password hashing', 'Input sanitization'],
        estimatedHours: 25,
        learningResources: [{ title: 'OWASP Guide', type: 'doc', url: 'https://owasp.org/', free: true }],
        practiceActivity: 'Implement token auth with bcrypt password encryption.',
        projectApplication: 'Secure user onboarding and session management.'
      },
      {
        skillId: 'docker',
        name: 'Docker & Deployment',
        category: 'DevOps',
        requiredLevel: 3,
        importance: 0.8,
        prerequisites: [],
        assessmentCriteria: ['Dockerfile creation', 'Docker Compose', 'Deployment configs'],
        estimatedHours: 20,
        learningResources: [{ title: 'Docker Get Started', type: 'doc', url: 'https://docs.docker.com/', free: true }],
        practiceActivity: 'Containerize frontend and backend into unified compose file.',
        projectApplication: 'Production cloud container deployment.'
      },
      {
        skillId: 'typescript',
        name: 'TypeScript',
        category: 'Programming Languages',
        requiredLevel: 4,
        importance: 0.88,
        prerequisites: ['javascript'],
        assessmentCriteria: [
          'Static typing, interfaces, generics, and utility types',
          'Typing async flows and API boundaries end-to-end',
          'Strict compiler configuration and narrowing',
          'Shared types between client and server'
        ],
        estimatedHours: 30,
        learningResources: [
          { title: 'Official TypeScript Handbook', type: 'doc', url: 'https://www.typescriptlang.org/docs/handbook/', free: true },
          { title: 'Total TypeScript Essentials', type: 'tutorial', url: 'https://www.totaltypescript.com/', free: true }
        ],
        practiceActivity: 'Convert a JavaScript full-stack app to strict TypeScript with shared request/response types.',
        projectApplication: 'Ship a type-safe API client and server SDK generated from shared type definitions.'
      },
      {
        skillId: 'html_css',
        name: 'Semantic HTML5 & Modern CSS',
        category: 'Frontend Core',
        requiredLevel: 3,
        importance: 0.8,
        prerequisites: [],
        assessmentCriteria: [
          'Semantic document structure and accessibility basics',
          'Responsive layout with Flexbox, Grid, and media queries',
          'CSS custom properties, transitions, and component-scoped styling',
          'Cross-browser compatibility and mobile-first design'
        ],
        estimatedHours: 25,
        learningResources: [
          { title: 'MDN Web Docs: HTML & CSS', type: 'doc', url: 'https://developer.mozilla.org/en-US/docs/Learn', free: true },
          { title: 'CSS-Tricks Flexbox & Grid Guides', type: 'tutorial', url: 'https://css-tricks.com/', free: true }
        ],
        practiceActivity: 'Build a fully responsive, accessible marketing page without any CSS framework.',
        projectApplication: 'Create a reusable responsive layout and component kit used across the full-stack app.'
      }
    ]
  },
  {
    id: 'data_analyst',
    title: 'Data Analyst',
    category: 'Analytics & Business Intelligence',
    shortDescription: 'Transform raw data into actionable business intelligence, dashboards, and growth insights.',
    fullDescription: 'Data Analysts bridge business strategy and data engineering by inspecting metrics, extracting trends using SQL, building executive dashboards in BI tools, and answering strategic questions.',
    averageStartingSalary: '$85,000 / ₹8 - 15 LPA',
    marketDemand: 'High',
    stages: [
      {
        stageNumber: 1,
        name: 'Spreadsheets & Analytical Foundations',
        description: 'Advanced Excel/Sheets modeling, pivot tables, and statistical summaries.',
        skillIds: ['math_stats', 'sql']
      },
      {
        stageNumber: 2,
        name: 'Data Manipulation with Python',
        description: 'Automating extraction, cleaning, and EDA with Pandas and NumPy.',
        skillIds: ['python', 'data_manipulation']
      },
      {
        stageNumber: 3,
        name: 'Data Visualization & Storytelling',
        description: 'Designing high-impact visual narratives, dashboards, and executive reporting.',
        skillIds: ['data_viz', 'business_metrics']
      }
    ],
    requiredSkills: [
      {
        skillId: 'sql',
        name: 'Advanced SQL for Analytics',
        category: 'Data Extraction',
        requiredLevel: 4,
        importance: 0.98,
        prerequisites: [],
        assessmentCriteria: ['Window functions', 'Aggregations', 'Cohort retention analysis'],
        estimatedHours: 35,
        learningResources: [{ title: 'Mode Analytics SQL Tutorial', type: 'tutorial', url: 'https://mode.com/sql-tutorial/', free: true }],
        practiceActivity: 'Calculate monthly recurring revenue (MRR) and churn rates with window functions.',
        projectApplication: 'Executive SaaS revenue analytics engine.'
      },
      {
        skillId: 'python',
        name: 'Python for Data Analysis',
        category: 'Programming',
        requiredLevel: 3,
        importance: 0.85,
        prerequisites: [],
        assessmentCriteria: ['Pandas syntax', 'Data cleansing', 'Automated data pipelines'],
        estimatedHours: 30,
        learningResources: [{ title: 'Python for Data Analysis Book', type: 'doc', url: 'https://wesmckinney.com/book/', free: true }],
        practiceActivity: 'Scrape and clean tabular datasets into standardized schemas.',
        projectApplication: 'Automated data audit script detecting missing and corrupted records.'
      },
      {
        skillId: 'data_manipulation',
        name: 'Data Wrangling (Pandas & NumPy)',
        category: 'Data Science',
        requiredLevel: 4,
        importance: 0.9,
        prerequisites: ['python'],
        assessmentCriteria: ['Reshaping datasets', 'Merging tables', 'Time-series analysis'],
        estimatedHours: 35,
        learningResources: [{ title: 'Pandas Guide', type: 'doc', url: 'https://pandas.pydata.org/', free: true }],
        practiceActivity: 'Merge disparate transactional logs into a single analytical dataframe.',
        projectApplication: 'Customer lifetime value (LTV) predictive feature table.'
      },
      {
        skillId: 'math_stats',
        name: 'Applied Business Statistics',
        category: 'Mathematics',
        requiredLevel: 3,
        importance: 0.82,
        prerequisites: [],
        assessmentCriteria: ['Descriptive statistics', 'A/B testing', 'Correlation vs causation'],
        estimatedHours: 25,
        learningResources: [{ title: 'Khan Academy Stats', type: 'course', url: 'https://www.khanacademy.org/math/statistics-probability', free: true }],
        practiceActivity: 'Calculate statistical significance for a 2-variant marketing experiment.',
        projectApplication: 'A/B test evaluation report with confidence intervals.'
      },
      {
        skillId: 'data_viz',
        name: 'Data Visualization & Dashboards',
        category: 'Analytics',
        requiredLevel: 4,
        importance: 0.9,
        prerequisites: ['data_manipulation'],
        assessmentCriteria: [
          'Choosing appropriate chart types for the data and audience',
          'Building interactive dashboards in BI tools (Tableau / Power BI / Looker)',
          'Visualization design principles: clarity, color, and narrative',
          'Reproducible reporting with Python (Matplotlib / Seaborn / Plotly)'
        ],
        estimatedHours: 30,
        learningResources: [
          { title: 'Storytelling with Data', type: 'doc', url: 'https://www.storytellingwithdata.com/', free: true },
          { title: 'Tableau Free Training Videos', type: 'course', url: 'https://www.tableau.com/learn/training', free: true }
        ],
        practiceActivity: 'Design an executive dashboard answering three key business questions from raw data.',
        projectApplication: 'Deliver a multi-page interactive BI dashboard with drill-downs and automated refreshes.'
      },
      {
        skillId: 'business_metrics',
        name: 'Business Metrics & Analytics',
        category: 'Analytics',
        requiredLevel: 3,
        importance: 0.85,
        prerequisites: ['sql'],
        assessmentCriteria: [
          'Defining and tracking KPIs (retention, churn, CAC, LTV)',
          'Cohort and funnel analysis for product decisions',
          'Designing and interpreting A/B tests with guardrail metrics',
          'Translating data findings into business recommendations'
        ],
        estimatedHours: 25,
        learningResources: [
          { title: 'Google Analytics Academy', type: 'course', url: 'https://analytics.google.com/analytics/academy/', free: true },
          { title: 'Amplitude: Product Analytics Playbook', type: 'doc', url: 'https://amplitude.com/blog/category/product-analytics', free: true }
        ],
        practiceActivity: 'Build a KPI tracker with cohort retention and funnel conversion metrics.',
        projectApplication: 'Produce a growth analysis report with prioritized recommendations for a product team.'
      }
    ]
  },
  {
    id: 'data_scientist',
    title: 'Data Scientist',
    category: 'Analytics & Predictive Modeling',
    shortDescription: 'Uncover deep patterns, build predictive statistical models, and drive data strategy.',
    fullDescription: 'Data Scientists formulate hypothesis tests, build predictive models, discover hidden trends in complex multimodal data, and turn ambiguous business questions into measurable empirical results.',
    averageStartingSalary: '$112,000 / ₹13 - 23 LPA',
    marketDemand: 'High',
    stages: [
      {
        stageNumber: 1,
        name: 'Mathematics, Probability & Python',
        description: 'Linear algebra, calculus, probability theory, and Python data manipulation.',
        skillIds: ['python', 'math_stats', 'data_manipulation']
      },
      {
        stageNumber: 2,
        name: 'Database Querying & Statistical Modeling',
        description: 'SQL for analytical datasets and hypothesis testing.',
        skillIds: ['sql', 'scikit_learn']
      },
      {
        stageNumber: 3,
        name: 'Deep Learning & Advanced Analytics',
        description: 'PyTorch, neural networks, and business impact storytelling.',
        skillIds: ['pytorch']
      }
    ],
    requiredSkills: [
      {
        skillId: 'python',
        name: 'Python for Scientific Computing',
        category: 'Programming',
        requiredLevel: 4,
        importance: 0.95,
        prerequisites: [],
        assessmentCriteria: ['NumPy array operations', 'Pandas pipelines', 'Object-oriented data pipelines'],
        estimatedHours: 40,
        learningResources: [{ title: 'Scientific Python', type: 'doc', url: 'https://scipy-lectures.org/', free: true }],
        practiceActivity: 'Vectorize computational statistical formulas in pure NumPy.',
        projectApplication: 'High-speed Monte Carlo financial simulation.'
      },
      {
        skillId: 'math_stats',
        name: 'Statistical Inference & Probability',
        category: 'Mathematics',
        requiredLevel: 4,
        importance: 0.94,
        prerequisites: [],
        assessmentCriteria: ['Bayesian reasoning', 'Hypothesis testing', 'Regression diagnostics'],
        estimatedHours: 40,
        learningResources: [{ title: 'StatQuest with Josh Starmer', type: 'tutorial', url: 'https://statquest.org/', free: true }],
        practiceActivity: 'Conduct power analysis and calculate sample sizes for multi-arm bandit tests.',
        projectApplication: 'Statistical anomaly detection model on real-time transaction streams.'
      },
      {
        skillId: 'scikit_learn',
        name: 'Machine Learning (Scikit-Learn)',
        category: 'Modeling',
        requiredLevel: 4,
        importance: 0.92,
        prerequisites: ['python', 'math_stats'],
        assessmentCriteria: ['Cross-validation', 'Ensemble methods (Random Forests, XGBoost)', 'Feature engineering'],
        estimatedHours: 45,
        learningResources: [{ title: 'Scikit-Learn Guide', type: 'doc', url: 'https://scikit-learn.org/', free: true }],
        practiceActivity: 'Train an ensemble gradient boosting regressor predicting property values.',
        projectApplication: 'Automated credit risk assessment scoring model.'
      },
      {
        skillId: 'sql',
        name: 'SQL & Analytical Querying',
        category: 'Data Management',
        requiredLevel: 3,
        importance: 0.85,
        prerequisites: [],
        assessmentCriteria: ['Complex subqueries', 'Window partitions', 'Data warehousing queries'],
        estimatedHours: 30,
        learningResources: [{ title: 'PostgreSQL Tutorial', type: 'doc', url: 'https://www.postgresqltutorial.com/', free: true }],
        practiceActivity: 'Write complex window queries to extract user cohort behavioral patterns.',
        projectApplication: 'Feature store data extraction pipeline.'
      },
      {
        skillId: 'data_manipulation',
        name: 'Data Wrangling (Pandas & NumPy)',
        category: 'Data Engineering',
        requiredLevel: 4,
        importance: 0.9,
        prerequisites: ['python'],
        assessmentCriteria: [
          'Vectorized operations and multidimensional broadcasting in NumPy',
          'Cleaning, grouping, merging, and reshaping with Pandas',
          'Handling missing values, outliers, and time-series indexing',
          'Building reproducible feature-engineering pipelines'
        ],
        estimatedHours: 35,
        learningResources: [
          { title: 'Pandas User Guide & Cookbook', type: 'doc', url: 'https://pandas.pydata.org/docs/user_guide/', free: true },
          { title: 'NumPy Quickstart Guide', type: 'doc', url: 'https://numpy.org/doc/stable/user/quickstart.html', free: true }
        ],
        practiceActivity: 'Clean and reshape a large messy dataset into a modeling-ready feature table.',
        projectApplication: 'Build an automated feature-engineering pipeline feeding a predictive model.'
      },
      {
        skillId: 'pytorch',
        name: 'Deep Learning with PyTorch',
        category: 'Deep Learning',
        requiredLevel: 3,
        importance: 0.85,
        prerequisites: ['scikit_learn'],
        assessmentCriteria: [
          'Tensors, autograd, and computational graphs',
          'Custom Dataset and DataLoader pipelines',
          'Training loops, loss curves, and overfitting diagnosis',
          'Building CNNs and Transformer blocks'
        ],
        estimatedHours: 45,
        learningResources: [
          { title: 'Official PyTorch Tutorials', type: 'doc', url: 'https://pytorch.org/tutorials/', free: true },
          { title: 'Deep Learning with PyTorch: 60 Minute Blitz', type: 'tutorial', url: 'https://pytorch.org/tutorials/beginner/blitz/tensor_tutorial.html', free: true }
        ],
        practiceActivity: 'Train a neural network on a real dataset with proper train/validation splits and early stopping.',
        projectApplication: 'Develop a deep learning model with an experiment-tracking report on model performance.'
      }
    ]
  },
  {
    id: 'devops',
    title: 'DevOps & Cloud Engineer',
    category: 'Infrastructure & Cloud',
    shortDescription: 'Automate infrastructure, CI/CD delivery pipelines, and cloud platform resilience.',
    fullDescription: 'DevOps Engineers design resilient cloud infrastructure, configure continuous integration and continuous deployment pipelines, enforce security guardrails, and maintain 99.99% system availability.',
    averageStartingSalary: '$110,000 / ₹12 - 22 LPA',
    marketDemand: 'Very High',
    stages: [
      {
        stageNumber: 1,
        name: 'Linux Systems & Shell Scripting',
        description: 'Linux internals, permissions, process management, and Bash automation.',
        skillIds: ['linux_bash', 'git_versioning']
      },
      {
        stageNumber: 2,
        name: 'Containerization & Networking',
        description: 'Docker container packaging, layers, and networking fundamentals.',
        skillIds: ['docker']
      },
      {
        stageNumber: 3,
        name: 'Infrastructure as Code & CI/CD',
        description: 'Automated GitHub Actions, Terraform, and cloud deployment pipelines.',
        skillIds: ['cicd_pipelines', 'iac_terraform']
      },
      {
        stageNumber: 4,
        name: 'Kubernetes & Observability',
        description: 'Container orchestration, Prometheus metrics, and distributed tracing.',
        skillIds: ['kubernetes', 'monitoring_observability']
      }
    ],
    requiredSkills: [
      {
        skillId: 'docker',
        name: 'Docker & Containerization',
        category: 'Containers',
        requiredLevel: 4,
        importance: 0.95,
        prerequisites: [],
        assessmentCriteria: ['Multi-stage Docker builds', 'Layer caching optimization', 'Volume mounts and security'],
        estimatedHours: 30,
        learningResources: [{ title: 'Docker Official Docs', type: 'doc', url: 'https://docs.docker.com/', free: true }],
        practiceActivity: 'Build optimized multi-stage images reducing size by 70%.',
        projectApplication: 'Multi-container local microservice orchestration with Docker Compose.'
      },
      {
        skillId: 'git_versioning',
        name: 'Git & Version Control',
        category: 'Developer Tools',
        requiredLevel: 4,
        importance: 0.85,
        prerequisites: [],
        assessmentCriteria: ['Branching conventions', 'Rebase vs merge', 'Hooks and CI triggers'],
        estimatedHours: 20,
        learningResources: [{ title: 'Pro Git Book', type: 'doc', url: 'https://git-scm.com/book/en/v2', free: true }],
        practiceActivity: 'Setup automated git pre-commit hooks running linting and secret scanning.',
        projectApplication: 'Monorepo versioning workflow with automated changelog generation.'
      },
      {
        skillId: 'linux_bash',
        name: 'Linux Administration & Shell Scripting',
        category: 'Systems',
        requiredLevel: 3,
        importance: 0.85,
        prerequisites: [],
        assessmentCriteria: [
          'Filesystem navigation, permissions, and process management',
          'Shell scripting with variables, loops, conditionals, and pipes',
          'Package management, systemd services, and log inspection',
          'Networking basics: SSH, ports, DNS, and firewalls'
        ],
        estimatedHours: 30,
        learningResources: [
          { title: 'Linux Command Line Basics (Ubuntu)', type: 'doc', url: 'https://ubuntu.com/tutorials/command-line-for-beginners', free: true },
          { title: 'The Linux Command Line (William Shotts)', type: 'doc', url: 'https://linuxcommand.org/tlcl.php', free: true }
        ],
        practiceActivity: 'Write an idempotent Bash script that provisions and hardens a fresh Linux server.',
        projectApplication: 'Automate application deployment and log rotation on a remote Linux host.'
      },
      {
        skillId: 'cicd_pipelines',
        name: 'CI/CD Pipelines',
        category: 'DevOps',
        requiredLevel: 4,
        importance: 0.9,
        prerequisites: ['git_versioning', 'docker'],
        assessmentCriteria: [
          'Building multi-stage pipelines (build, test, scan, deploy)',
          'GitHub Actions / GitLab CI workflow syntax and secret management',
          'Artifact versioning and environment promotion strategies',
          'Blue-green and canary deployment rollouts'
        ],
        estimatedHours: 35,
        learningResources: [
          { title: 'GitHub Actions Documentation', type: 'doc', url: 'https://docs.github.com/en/actions', free: true },
          { title: 'GitLab CI/CD Documentation', type: 'doc', url: 'https://docs.gitlab.com/ee/ci/', free: true }
        ],
        practiceActivity: 'Create a pipeline that tests, builds a Docker image, and deploys to staging on merge.',
        projectApplication: 'Build a full delivery pipeline with automated rollback triggered by failed smoke tests.'
      },
      {
        skillId: 'iac_terraform',
        name: 'Infrastructure as Code (Terraform)',
        category: 'DevOps',
        requiredLevel: 3,
        importance: 0.85,
        prerequisites: ['linux_bash'],
        assessmentCriteria: [
          'Declarative resources, providers, and state management',
          'Variables, modules, and environment separation',
          'Planning, applying, and drift detection safely',
          'Managing secrets and remote backends'
        ],
        estimatedHours: 35,
        learningResources: [
          { title: 'HashiCorp Terraform Tutorials', type: 'tutorial', url: 'https://developer.hashicorp.com/terraform/tutorials', free: true },
          { title: 'Terraform Registry Documentation', type: 'doc', url: 'https://registry.terraform.io/', free: true }
        ],
        practiceActivity: 'Provision a repeatable cloud environment with reusable Terraform modules.',
        projectApplication: 'Codify a full staging stack in Terraform with remote state and automated plan checks in CI.'
      },
      {
        skillId: 'kubernetes',
        name: 'Kubernetes Orchestration',
        category: 'DevOps',
        requiredLevel: 3,
        importance: 0.88,
        prerequisites: ['docker', 'cicd_pipelines'],
        assessmentCriteria: [
          'Pods, deployments, services, and ingress primitives',
          'ConfigMaps, secrets, and persistent volumes',
          'Scaling, rolling updates, and health probes',
          'Debugging workloads with logs, events, and exec'
        ],
        estimatedHours: 45,
        learningResources: [
          { title: 'Kubernetes Official Documentation', type: 'doc', url: 'https://kubernetes.io/docs/home/', free: true },
          { title: 'Kubernetes Basics Tutorial', type: 'tutorial', url: 'https://kubernetes.io/docs/tutorials/kubernetes-basics/', free: true }
        ],
        practiceActivity: 'Deploy a multi-service app to a local cluster with ingress and rolling updates.',
        projectApplication: 'Ship a production-grade Kubernetes deployment with autoscaling and health-based rollouts.'
      },
      {
        skillId: 'monitoring_observability',
        name: 'Monitoring & Observability',
        category: 'Reliability',
        requiredLevel: 3,
        importance: 0.82,
        prerequisites: ['kubernetes'],
        assessmentCriteria: [
          'Metrics collection with Prometheus and dashboarding in Grafana',
          'Centralized logging and structured log queries',
          'Alerting rules, thresholds, and on-call runbooks',
          'Distributed tracing and SLI/SLO definition'
        ],
        estimatedHours: 30,
        learningResources: [
          { title: 'Prometheus Documentation', type: 'doc', url: 'https://prometheus.io/docs/introduction/overview/', free: true },
          { title: 'Grafana Fundamentals', type: 'tutorial', url: 'https://grafana.com/tutorials/grafana-fundamentals/', free: true }
        ],
        practiceActivity: 'Instrument an application with metrics and build an alerting dashboard with thresholds.',
        projectApplication: 'Deploy a full observability stack (metrics, logs, traces) with actionable SLO-based alerts.'
      }
    ]
  }
];
