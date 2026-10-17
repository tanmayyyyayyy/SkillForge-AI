import { SkillAssessment } from '../../src/types/index.js';

export const ASSESSMENTS: SkillAssessment[] = [
  {
    skillId: 'python',
    skillName: 'Python Programming',
    category: 'Programming Languages',
    difficulty: 'Intermediate',
    questionsCount: 5,
    passingScorePercentage: 75,
    estimatedMinutes: 12,
    contentVersion: 1,
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
    estimatedMinutes: 12,
    contentVersion: 1,
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
    estimatedMinutes: 12,
    contentVersion: 1,
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
    estimatedMinutes: 12,
    contentVersion: 1,
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
    estimatedMinutes: 12,
    contentVersion: 1,
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
  },
  {
    skillId: 'javascript',
    skillName: 'Modern JavaScript (ES6+)',
    category: 'Frontend Core',
    difficulty: 'Intermediate',
    questionsCount: 5,
    passingScorePercentage: 75,
    estimatedMinutes: 12,
    contentVersion: 1,
    questions: [
      {
        id: 'js_q1',
        question: 'In the event loop, in what order are microtasks (promise callbacks) and macrotasks (setTimeout) processed relative to the current call stack?',
        options: [
          'All pending macrotasks run to completion before any microtask',
          'The entire microtask queue is drained after the current stack clears, then the next macrotask runs',
          'Microtasks and macrotasks interleave one-for-one by insertion order',
          'Microtasks run only after every macrotask has finished'
        ],
        correctOptionIndex: 1,
        explanation: 'When the call stack empties, the event loop drains the microtask queue completely (promise jobs, queueMicrotask) before proceeding to the next macrotask (timers, I/O), which is why promise callbacks appear to run "before" a setTimeout queued earlier.'
      },
      {
        id: 'js_q2',
        question: 'How does `this` behave inside an arrow function compared with a regular function expression?',
        options: [
          'Arrow functions capture `this` lexically from the enclosing scope; regular functions get `this` from how they are called',
          'Arrow functions always bind `this` to the global object',
          'Regular functions cannot access `this` at all',
          'Both always resolve `this` to the object that defines them'
        ],
        correctOptionIndex: 0,
        explanation: 'Arrow functions do not have their own `this`; they close over the `this` of the definition context. Regular functions receive `this` dynamically at call time (method call, `.call`, `new`, etc.).'
      },
      {
        id: 'js_q3',
        question: 'What is the key difference between `Promise.all` and `Promise.allSettled`?',
        options: [
          '`Promise.all` rejects immediately if any promise rejects; `Promise.allSettled` always waits for every promise and reports each outcome',
          '`Promise.all` runs promises sequentially while `Promise.allSettled` runs them in parallel',
          '`Promise.allSettled` rejects if any promise rejects',
          '`Promise.all` only accepts exactly two promises'
        ],
        correctOptionIndex: 0,
        explanation: '`Promise.all` short-circuits on the first rejection. `Promise.allSettled` never rejects; it resolves with an array describing the fulfilled/rejected status of every input promise.'
      },
      {
        id: 'js_q4',
        question: 'Given `const user = { name: "Ada" }`, which statement is true?',
        options: [
          '`const` makes the object deeply immutable',
          'The binding cannot be reassigned, but the object\'s properties can still be mutated',
          'Attempting `user.name = "Grace"` throws a TypeError',
          '`const` objects are frozen automatically'
        ],
        correctOptionIndex: 1,
        explanation: '`const` prevents reassigning the binding, not mutating the referenced value. To prevent mutation you need `Object.freeze` (which is itself shallow).'
      },
      {
        id: 'js_q5',
        question: 'Why do closures created inside a `for` loop with a `var` declaration capture the same final value, while `let` captures per-iteration values?',
        options: [
          '`var` is hoisted and shared across all iterations, whereas `let` creates a new binding scoped to each iteration',
          '`let` copies the value into the heap while `var` stores it on the stack',
          '`var` closures are garbage-collected immediately',
          '`let` prevents closures from being created'
        ],
        correctOptionIndex: 0,
        explanation: 'A single `var` binding is shared by every closure produced in the loop, so they all see the last value. `let` creates a fresh lexical binding per iteration, so each closure captures its own value.'
      }
    ]
  },
  {
    skillId: 'typescript',
    skillName: 'TypeScript for Frontend',
    category: 'Programming Languages',
    difficulty: 'Intermediate',
    questionsCount: 5,
    passingScorePercentage: 75,
    estimatedMinutes: 12,
    contentVersion: 1,
    questions: [
      {
        id: 'ts_q1',
        question: 'What is the practical difference between the `any` and `unknown` types?',
        options: [
          '`unknown` disables type checking just like `any`',
          '`any` opts out of type checking, while `unknown` still requires you to narrow the value before using it',
          '`unknown` can only hold strings and numbers',
          '`any` is assignable to `never`'
        ],
        correctOptionIndex: 1,
        explanation: 'A value typed `unknown` can hold anything, but you must perform a type guard / assertion before operating on it. `any` gives up all checking, which silently propagates unsoundness.'
      },
      {
        id: 'ts_q2',
        question: 'TypeScript uses structural typing. Which statement best describes what that means?',
        options: [
          'Types are compared by their declared name, not their shape',
          'Compatibility is determined by the shape (members) of a value, so objects with the required members are assignable even without a shared declaration',
          'Only classes can be used as types',
          'Structural typing requires explicit `implements` clauses everywhere'
        ],
        correctOptionIndex: 1,
        explanation: 'Structural (duck) typing compares the structure of types. If a value has the required properties with compatible types, it is assignable regardless of nominal class/interface names.'
      },
      {
        id: 'ts_q3',
        question: 'Given `function fmt(value: string | number)`, why is `value.toFixed(2)` a compile error before narrowing?',
        options: [
          'Because `toFixed` does not exist on `number`',
          'Because `toFixed` only exists on the `number` branch, and TypeScript only allows member access common to every union member until you narrow',
          'Because unions cannot be used as parameters',
          'Because `string | number` is invalid syntax'
        ],
        correctOptionIndex: 1,
        explanation: 'Inside a union you may only access members present on all constituents. A `typeof value === "number"` guard narrows the type so the `number`-only method becomes accessible.'
      },
      {
        id: 'ts_q4',
        question: 'Which statement about `interface` versus `type` aliases is correct?',
        options: [
          '`interface` declarations can be merged (declaration merging) and reopened; a `type` alias cannot be reopened',
          '`type` aliases can represent unions and computed types; `interface` cannot represent a union directly',
          'Both are exactly interchangeable with no differences',
          'Only `type` can describe object shapes'
        ],
        correctOptionIndex: 0,
        explanation: 'Interfaces support declaration merging (useful for augmenting library types) and can be reopened. Type aliases can express unions/intersections/mapped/conditional types but cannot be merged. (Option B is also a true fact, but the question asks specifically about reopening/merging, which is uniquely an interface capability.)'
      },
      {
        id: 'ts_q5',
        question: 'What does a generic constraint such as `<T extends { id: string }>` guarantee?',
        options: [
          'That `T` is always exactly `{ id: string }`',
          'That `T` must have at least the members of `{ id: string }`, allowing safe access to `T.id` inside the function',
          'That `T` is limited to primitive types',
          'That the function runs at compile time'
        ],
        correctOptionIndex: 1,
        explanation: 'A constraint narrows what type arguments are acceptable, so the body may safely rely on those members while callers may still pass richer, more specific types.'
      }
    ]
  },
  {
    skillId: 'data_manipulation',
    skillName: 'Data Wrangling (NumPy & Pandas)',
    category: 'Data Engineering',
    difficulty: 'Intermediate',
    questionsCount: 5,
    passingScorePercentage: 75,
    estimatedMinutes: 12,
    contentVersion: 1,
    questions: [
      {
        id: 'dw_q1',
        question: 'What is the difference between `pandas.concat` and `pandas.merge`?',
        options: [
          '`concat` stacks DataFrames along an axis; `merge` performs SQL-style joins on key columns',
          '`concat` joins on keys; `merge` stacks rows',
          'They are aliases for the same operation',
          '`merge` can only combine two DataFrames, `concat` only one'
        ],
        correctOptionIndex: 0,
        explanation: '`concat` is a stacking operation along rows or columns, while `merge` is a relational join (`how="inner"/"left"/...`) on matching columns/indices.'
      },
      {
        id: 'dw_q2',
        question: 'Why is chained assignment like `df[df.a > 0]["b"] = 1` problematic in pandas?',
        options: [
          'It always raises a SyntaxError',
          'It may operate on a temporary copy, so the assignment silently does not persist in `df` (the SettingWithCopyWarning)',
          'It deletes the `b` column',
          'It converts `b` to strings'
        ],
        correctOptionIndex: 1,
        explanation: 'Chained indexing can create a copy, so writes target the copy and are lost. Use a single `.loc[df.a > 0, "b"] = 1` to assign unambiguously on the original frame.'
      },
      {
        id: 'dw_q3',
        question: 'In NumPy, what does broadcasting allow when adding an array of shape `(3, 1)` to one of shape `(3, 4)`?',
        options: [
          'It raises a shape mismatch error',
          'It stretches the size-1 dimension across the other array, producing a `(3, 4)` result without copying data explicitly',
          'It flattens both arrays to 1-D first',
          'It only works when shapes are identical'
        ],
        correctOptionIndex: 1,
        explanation: 'Broadcasting aligns trailing dimensions and expands size-1 axes virtually, enabling vectorized operations between compatible shapes without materializing loops.'
      },
      {
        id: 'dw_q4',
        question: 'When is `groupby(...).transform(...)` preferable to `groupby(...).apply(...)`?',
        options: [
          'When you need a result aligned row-by-row to the original index (e.g. group-mean subtraction), since `transform` returns same-shaped output',
          'When you must return an arbitrarily-shaped custom object per group',
          '`transform` and `apply` are identical in behavior',
          '`transform` can only compute a sum'
        ],
        correctOptionIndex: 0,
        explanation: '`transform` returns a same-length, same-index object suitable for row-wise combination with the original frame; `apply` is more flexible but may return arbitrary shapes and is generally slower per group.'
      },
      {
        id: 'dw_q5',
        question: 'What is the difference between `df.dropna()` and `df.fillna(value)`?',
        options: [
          '`dropna` removes rows/columns containing missing values; `fillna` replaces missing values with a provided value or strategy',
          '`dropna` replaces values with a default; `fillna` deletes rows',
          'Both only affect the index',
          '`fillna` can only accept column names'
        ],
        correctOptionIndex: 0,
        explanation: '`dropna` filters out rows/columns with NaNs (optionally with thresholds), while `fillna` imputes NaNs using a scalar, mapping, or strategy such as forward-fill.'
      }
    ]
  },
  {
    skillId: 'kubernetes',
    skillName: 'Kubernetes Orchestration',
    category: 'DevOps',
    difficulty: 'Intermediate',
    questionsCount: 5,
    passingScorePercentage: 75,
    estimatedMinutes: 12,
    contentVersion: 1,
    questions: [
      {
        id: 'k8s_q1',
        question: 'Why is a Deployment generally preferred over managing bare Pods directly?',
        options: [
          'A Deployment manages a ReplicaSet to keep the desired number of pods running and supports declarative rolling updates and rollbacks',
          'Deployments run on the control plane instead of worker nodes',
          'Bare Pods cannot mount volumes',
          'Deployments eliminate the need for a container image'
        ],
        correctOptionIndex: 0,
        explanation: 'A Deployment reconciles Pods through a ReplicaSet, providing self-healing (restart/reschedule), scaling, and controlled rollout/rollback of versions.'
      },
      {
        id: 'k8s_q2',
        question: 'A Service of type `ClusterIP` compared with `NodePort` and `LoadBalancer` — what best characterizes the default?',
        options: [
          '`ClusterIP` exposes the Service on an internal cluster IP reachable only within the cluster; `NodePort` opens a port on every node and `LoadBalancer` provisions an external load balancer',
          '`ClusterIP` exposes the Service to the public internet by default',
          '`NodePort` is only reachable inside the cluster',
          '`LoadBalancer` requires no cloud provider'
        ],
        correctOptionIndex: 0,
        explanation: 'ClusterIP is the default internal-only virtual IP. NodePort additionally exposes a static port on each node, and LoadBalancer (cloud-dependent) builds on NodePort with an external load balancer.'
      },
      {
        id: 'k8s_q3',
        question: 'What is the difference between a liveness probe and a readiness probe?',
        options: [
          'A failing liveness probe restarts the container; a failing readiness probe removes the pod from Service endpoints without restarting it',
          'A failing readiness probe restarts the container; a failing liveness probe does nothing',
          'Both restart the container when they fail',
          'Liveness probes only run at startup'
        ],
        correctOptionIndex: 0,
        explanation: 'Liveness determines whether the container is alive (restart on failure). Readiness determines whether it can serve traffic (excluded from endpoints until it succeeds), which is how traffic is withheld during startup or temporary unavailability.'
      },
      {
        id: 'k8s_q4',
        question: 'What distinguishes a Secret from a ConfigMap?',
        options: [
          'Secrets are intended for sensitive data and are base64-encoded (and can be encrypted at rest), while ConfigMaps hold non-sensitive configuration',
          'ConfigMaps are encrypted and Secrets are plain text',
          'Secrets can only store integers',
          'ConfigMaps cannot be mounted as files'
        ],
        correctOptionIndex: 0,
        explanation: 'Both are key-value stores mountable as env vars or files, but Secrets are meant for credentials/material and receive handling protections (base64 in manifests, optional encryption at rest), whereas ConfigMaps are for ordinary configuration.'
      },
      {
        id: 'k8s_q5',
        question: 'How do resource `requests` and `limits` differ for a container?',
        options: [
          '`requests` are the guaranteed minimum used for scheduling; `limits` are the maximum the container may consume before being throttled or OOM-killed',
          '`requests` cap usage; `limits` reserve capacity for scheduling',
          'They are interchangeable synonyms',
          'Only CPU supports requests and limits'
        ],
        correctOptionIndex: 0,
        explanation: 'The scheduler places pods based on `requests`, so a node must have that capacity free. `limits` bound runtime usage: exceeding a CPU limit throttles the container, and exceeding a memory limit can trigger an OOM kill.'
      }
    ]
  }
];
