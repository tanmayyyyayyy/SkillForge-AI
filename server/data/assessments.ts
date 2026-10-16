import { SkillAssessment } from '../../src/types/index.js';

export const ASSESSMENTS: SkillAssessment[] = [
  {
    skillId: 'python',
    skillName: 'Python Programming',
    category: 'Programming Languages',
    difficulty: 'Intermediate',
    questionsCount: 5,
    passingScorePercentage: 75,
    questions: [
      {
        id: 'py_q1',
        question: 'What is the primary difference between a generator function (using yield) and a regular function returning a list?',
        options: [
          'Generators can only yield numbers, while lists can store any object',
          'Generators produce items lazily on demand without loading the entire collection into memory',
          'Generators run in a separate OS thread automatically',
          'Generators are faster at random indexing by key'
        ],
        correctOptionIndex: 1,
        explanation: 'Generators yield values one by one using lazy evaluation (generator iterator protocol), conserving memory and allowing processing of infinite or massive streams.'
      },
      {
        id: 'py_q2',
        question: 'How does Python\'s Global Interpreter Lock (GIL) impact multithreading?',
        options: [
          'It prevents CPU-bound threads from executing Python bytecode in parallel across multiple CPU cores',
          'It stops I/O-bound operations like network requests from running asynchronously',
          'It forces all functions to be pure without side effects',
          'It doubles the memory consumed by every variable allocation'
        ],
        correctOptionIndex: 0,
        explanation: 'The GIL allows only one native thread to execute Python bytecode at a time, meaning multithreading accelerates I/O-bound tasks but requires multiprocessing for CPU-bound parallelism.'
      },
      {
        id: 'py_q3',
        question: 'What will be the output of evaluating default mutable arguments: `def add_item(item, target=[]): target.append(item); return target` called twice as `add_item(1)` then `add_item(2)`?',
        options: [
          '[1] and then [2]',
          '[1] and then [1, 2]',
          '[1, 2] on both calls',
          'A TypeError exception is raised'
        ],
        correctOptionIndex: 1,
        explanation: 'Default parameter values in Python are evaluated once when the function definition is executed, so the same mutable list object is reused across repeated invocations.'
      },
      {
        id: 'py_q4',
        question: 'Which built-in module provides high-performance container datatypes such as deque, Counter, and defaultdict?',
        options: [
          'itertools',
          'functools',
          'collections',
          'dataclasses'
        ],
        correctOptionIndex: 2,
        explanation: 'The `collections` module provides specialized container datatypes including `deque` (O(1) appends and pops on both ends), `Counter`, `OrderedDict`, and `defaultdict`.'
      },
      {
        id: 'py_q5',
        question: 'What is the purpose of the `__enter__` and `__exit__` magic methods in a Python class?',
        options: [
          'To define constructor and destructor behavior',
          'To implement Context Managers used with the `with` statement for deterministic resource management',
          'To handle serializing instances to JSON strings',
          'To override binary addition and subtraction operators'
        ],
        correctOptionIndex: 1,
        explanation: 'Classes defining `__enter__` and `__exit__` implement the context manager protocol, guaranteeing setup and teardown (such as closing files or database connections) even when exceptions occur.'
      }
    ]
  },
  {
    skillId: 'react',
    skillName: 'React.js & Component Architecture',
    category: 'UI Libraries',
    difficulty: 'Intermediate',
    questionsCount: 5,
    passingScorePercentage: 75,
    questions: [
      {
        id: 'react_q1',
        question: 'When should you use `useCallback` instead of declaring a plain inline function inside a React component?',
        options: [
          'On every single event handler without exception',
          'When passing a callback to an optimized child component that relies on reference equality (like React.memo) to avoid unnecessary re-renders',
          'To store state across browser sessions',
          'To trigger synchronous DOM updates before browser paint'
        ],
        correctOptionIndex: 1,
        explanation: '`useCallback` caches a function definition between renders. It is useful when passing callbacks to optimized children wrapped in React.memo or when the function is a dependency of `useEffect`.'
      },
      {
        id: 'react_q2',
        question: 'Why must React keys in mapped lists be stable, unique identifiers rather than array indices?',
        options: [
          'Using array indices triggers a compile-time TypeScript error',
          'React uses keys during reconciliation to identify which items have changed, moved, or deleted; unstable index keys cause render glitches and state loss when reordering',
          'Array index keys make network requests take longer',
          'Keys are directly displayed to users in the browser DOM inspector'
        ],
        correctOptionIndex: 1,
        explanation: 'If an item is inserted, removed, or sorted, index-based keys change for subsequent elements, misleading React’s reconciliation algorithm and causing input state bugs.'
      },
      {
        id: 'react_q3',
        question: 'What is the cleanup function returned inside `useEffect` used for?',
        options: [
          'To clear component props from memory',
          'To abort subscriptions, remove event listeners, or cancel ongoing fetch requests before unmounting or re-running the effect',
          'To reset component state to initial values',
          'To trigger a browser page reload'
        ],
        correctOptionIndex: 1,
        explanation: 'React executes the cleanup function before running the effect again and when the component unmounts, preventing memory leaks, dangling listeners, and race conditions.'
      },
      {
        id: 'react_q4',
        question: 'What is the main advantage of the `useId` hook in modern React?',
        options: [
          'Generating unique, collision-free accessibility IDs that match between server-side rendering and client hydration',
          'Creating cryptographic UUIDs for database primary keys',
          'Measuring component render duration',
          'Assigning unique CSS class names for styling'
        ],
        correctOptionIndex: 0,
        explanation: '`useId` generates unique IDs that are consistent between SSR and client hydration, essential for linking accessibility attributes like `htmlFor` and `aria-describedby`.'
      },
      {
        id: 'react_q5',
        question: 'What problem does React "Compound Components" pattern primarily solve?',
        options: [
          'Faster network data fetching',
          'Providing an expressive, declarative API where multiple related components share implicit state without prop drilling (e.g. `<Select><Option /></Select>`)',
          'Automatic translation of text into multiple languages',
          'Encrypting component props during rendering'
        ],
        correctOptionIndex: 1,
        explanation: 'Compound components communicate via React Context under the hood, allowing developers to compose clean, flexible component hierarchies without having to pass props through multiple layers.'
      }
    ]
  },
  {
    skillId: 'sql',
    skillName: 'SQL & Relational Databases',
    category: 'Data Management',
    difficulty: 'Intermediate',
    questionsCount: 5,
    passingScorePercentage: 75,
    questions: [
      {
        id: 'sql_q1',
        question: 'What is the key difference between `WHERE` and `HAVING` clauses in SQL?',
        options: [
          '`WHERE` filters rows before any grouping or aggregations occur, whereas `HAVING` filters aggregated groups after `GROUP BY`',
          '`HAVING` can only be used with PostgreSQL, while `WHERE` works in all databases',
          '`WHERE` is used exclusively with primary keys',
          '`HAVING` operates strictly on subqueries'
        ],
        correctOptionIndex: 0,
        explanation: 'The `WHERE` clause filters individual records before aggregation. The `HAVING` clause filters aggregate results (e.g., `HAVING COUNT(*) > 5`) generated by `GROUP BY`.'
      },
      {
        id: 'sql_q2',
        question: 'What happens during a "Dirty Read" under low transaction isolation levels?',
        options: [
          'A transaction reads uncommitted data written by another concurrent transaction that may later be rolled back',
          'A query encounters corrupted disk sectors',
          'Two transactions deadlock simultaneously on the same table index',
          'A deleted column is queried from cache'
        ],
        correctOptionIndex: 0,
        explanation: 'Under the `READ UNCOMMITTED` isolation level, Transaction A can read changes made by Transaction B before Transaction B commits. If B rolls back, A processed phantom, uncommitted data.'
      },
      {
        id: 'sql_q3',
        question: 'Which window function calculates a ranking without leaving gaps in ranking values for ties (e.g. 1, 2, 2, 3)?',
        options: [
          'RANK()',
          'DENSE_RANK()',
          'ROW_NUMBER()',
          'NTILE()'
        ],
        correctOptionIndex: 1,
        explanation: '`DENSE_RANK()` assigns consecutive integers to tied values without skipping rank positions, whereas `RANK()` would yield 1, 2, 2, 4.'
      },
      {
        id: 'sql_q4',
        question: 'Why should you avoid using `SELECT *` in production application database queries?',
        options: [
          'It violates SQL-92 standards compliance',
          'It causes unnecessary network I/O, prevents covering index optimizations, and breaks code if columns are added or reordered',
          'SQL engines refuse to cache plans for asterisk queries',
          'It locks the entire table against write operations'
        ],
        correctOptionIndex: 1,
        explanation: 'Querying only the necessary columns minimizes serialized network payload and enables the database query optimizer to fulfill queries strictly from secondary indexes without table lookups.'
      },
      {
        id: 'sql_q5',
        question: 'What is a database Common Table Expression (CTE) defined with `WITH`?',
        options: [
          'A permanent table stored on disk for fast lookup',
          'A temporary, named result set existing only during the execution of a single query, improving readability and enabling recursion',
          'A database trigger that runs on every insert',
          'An encrypted column storage engine'
        ],
        correctOptionIndex: 1,
        explanation: 'CTEs (`WITH cte_name AS (...)`) provide temporary named result sets that make complex multi-step queries readable, maintainable, and support recursive graph traversal.'
      }
    ]
  },
  {
    skillId: 'scikit_learn',
    skillName: 'Classical Machine Learning (Scikit-Learn)',
    category: 'Machine Learning',
    difficulty: 'Intermediate',
    questionsCount: 5,
    passingScorePercentage: 75,
    questions: [
      {
        id: 'ml_q1',
        question: 'Why is standard accuracy often a misleading metric on imbalanced datasets (e.g., 99% negative, 1% fraud)?',
        options: [
          'Because a trivial model predicting negative for every sample achieves 99% accuracy while detecting zero fraud cases',
          'Because accuracy cannot be calculated using floating point math',
          'Because accuracy only applies to regression problems',
          'Because decision trees cannot calculate accuracy'
        ],
        correctOptionIndex: 0,
        explanation: 'In highly imbalanced distributions, a model predicting the majority class exclusively shows deceptive high accuracy. Precision, Recall, PR-AUC, and F1-score provide true insight into minority class detection.'
      },
      {
        id: 'ml_q2',
        question: 'What is "Data Leakage" in a machine learning training pipeline?',
        options: [
          'Unencrypted dataset storage accessible to third parties',
          'When information from outside the training dataset (such as test set statistics) inadvertently contaminates the model training process',
          'Memory consumption exceeding GPU RAM',
          'Missing records dropped during data cleaning'
        ],
        correctOptionIndex: 1,
        explanation: 'Data leakage happens when test set information (such as computing scaling mean/variance on the whole dataset before train/test splitting) leaks into training, causing unrealistically optimistic metrics that fail in production.'
      },
      {
        id: 'ml_q3',
        question: 'What distinguishes Random Forest from a single Decision Tree?',
        options: [
          'Random Forest fits a single tree with infinite depth',
          'Random Forest is an ensemble of diverse decision trees trained on bootstrap samples with random feature subsets, reducing variance and overfitting',
          'Random Forest only supports linear regression targets',
          'Random Forest does not support categorical features'
        ],
        correctOptionIndex: 1,
        explanation: 'Random Forest applies bagging (bootstrap aggregating) and random feature selection across an ensemble of decorrelated trees, substantially dampening individual tree variance.'
      },
      {
        id: 'ml_q4',
        question: 'What is the purpose of L1 Regularization (Lasso) compared to L2 Regularization (Ridge)?',
        options: [
          'L1 adds the squared sum of weights to the loss',
          'L1 penalizes absolute weights, driving uninformative feature weights to exact zero and performing automatic feature selection',
          'L1 speeds up GPU matrix operations',
          'L1 is only used in unsupervised clustering algorithms'
        ],
        correctOptionIndex: 1,
        explanation: 'L1 regularization applies a penalty proportional to the absolute values of coefficients, producing sparse models where non-contributing features are zeroed out.'
      },
      {
        id: 'ml_q5',
        question: 'In Scikit-Learn, why should feature transformations be chained inside a `Pipeline`?',
        options: [
          'To ensure transformers fit only on training folds during cross-validation, strictly preventing test fold leakage',
          'To convert Python code to C++ for faster execution',
          'To plot matplotlib graphs automatically',
          'Pipelines are required to enable GPU support'
        ],
        correctOptionIndex: 0,
        explanation: '`Pipeline` encapsulates transformations (e.g. StandardScalar, Imputer) and estimators together, ensuring that during k-fold cross-validation transformers are fit strictly on training splits.'
      }
    ]
  },
  {
    skillId: 'docker',
    skillName: 'Docker & Containerization',
    category: 'DevOps & Deployment',
    difficulty: 'Intermediate',
    questionsCount: 5,
    passingScorePercentage: 75,
    questions: [
      {
        id: 'dock_q1',
        question: 'What is the chief benefit of using multi-stage builds in a Dockerfile?',
        options: [
          'It lets a container run across multiple physical machines at once',
          'It separates build tools and SDKs from the final runtime image, drastically reducing container size and attack surface',
          'It bypasses Docker daemon authentication',
          'It automatically writes unit tests for the container'
        ],
        correctOptionIndex: 1,
        explanation: 'Multi-stage builds permit using hefty compilers and build artifacts in earlier stages (`FROM node:20 AS builder`) while copying only the final distribution files into a lean production image (`FROM alpine`).'
      },
      {
        id: 'dock_q2',
        question: 'Why should instructions like `COPY package*.json ./` and `RUN npm install` be placed before `COPY . .` in a Dockerfile?',
        options: [
          'To leverage Docker layer caching, avoiding redundant dependency reinstalls when only application source code changes',
          'Because npm requires package.json to be located at root /',
          'To encrypt dependency licenses',
          'Docker rejects Dockerfiles written in any other sequence'
        ],
        correctOptionIndex: 0,
        explanation: 'Docker caches layers sequentially. If source files change but `package.json` remains identical, Docker reuses the cached `npm install` layer, accelerating build times from minutes to seconds.'
      },
      {
        id: 'dock_q3',
        question: 'What is the difference between a Docker Image and a Docker Container?',
        options: [
          'An image is a running instance; a container is the static blueprint',
          'An image is a read-only immutable template with application code and dependencies; a container is an isolated, running instance with a writable layer',
          'Images are for Linux; containers are for macOS',
          'Containers are stored on Docker Hub; images are stored locally'
        ],
        correctOptionIndex: 1,
        explanation: 'An image is the immutable package of layers. A container is the instantiated execution environment with its own process space, network namespace, and thin copy-on-write filesystem layer.'
      },
      {
        id: 'dock_q4',
        question: 'What is the purpose of Docker volumes compared to container filesystem storage?',
        options: [
          'Volumes compress images into zip archives',
          'Volumes persist data outside the container lifecycle on the host, ensuring database data is preserved across container restarts and updates',
          'Volumes allow containers to execute with root privileges',
          'Volumes are only used for logging error traces'
        ],
        correctOptionIndex: 1,
        explanation: 'Container filesystems are ephemeral and destroyed when a container is removed. Docker volumes manage persistent storage decoupled from container lifecycle.'
      },
      {
        id: 'dock_q5',
        question: 'Why is it a security best practice to include `USER nonroot` before the CMD instruction in production Dockerfiles?',
        options: [
          'To avoid executing the application as the root user, limiting damage if an attacker exploits a code vulnerability to gain container shell access',
          'Because cloud providers charge double for root containers',
          'To prevent the container from consuming system RAM',
          'To force the container into dark mode'
        ],
        correctOptionIndex: 0,
        explanation: 'By default, Docker containers run as root (UID 0). Running as a dedicated unprivileged user adheres to the principle of least privilege and prevents container breakouts onto the host.'
      }
    ]
  }
];
