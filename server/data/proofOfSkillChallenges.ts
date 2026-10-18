import type { ProofOfSkillChallenge } from '../../src/types/index.js';

export const PROOF_OF_SKILL_CHALLENGES: ProofOfSkillChallenge[] = [
  {
    id: 'pos_algo_lru',
    title: 'LRU Cache Eviction Algorithm',
    description: 'Implement a Least Recently Used (LRU) Cache data structure supporting get(key) and put(key, value) in O(1) time complexity.',
    targetSkillId: 'dsa',
    targetSkillName: 'Data Structures & Algorithms',
    category: 'Algorithms & Core CS',
    difficulty: 'Intermediate',
    type: 'algorithmic_code',
    instructions: 'Define an LRUCache class with capacity, get(key), and put(key, value). When capacity is exceeded, evict the least recently accessed item.',
    constraints: [
      'Capacity is positive integer between 1 and 3000',
      'Keys and values are integers',
      'Both get and put operations must run in O(1) average time'
    ],
    starterCode: `class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return -1;
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }
}`,
    timeEstimateMinutes: 25,
    submissionFormat: 'JavaScript / TypeScript class or function implementation',
    evaluationCriteria: [
      'Correct insertion, retrieval, and eviction order',
      'Proper eviction when capacity is reached',
      'Updating existing key refreshes recency without increasing size'
    ],
    maxScore: 100,
    passingScorePercentage: 75,
    testCases: [
      {
        id: 'tc_lru_1',
        description: 'Basic put and get functionality within capacity',
        inputDescription: 'capacity=2; put(1, 1); put(2, 2); get(1);',
        expectedOutput: '1'
      },
      {
        id: 'tc_lru_2',
        description: 'Eviction of least recently used item',
        inputDescription: 'capacity=2; put(1, 1); put(2, 2); get(1); put(3, 3); get(2);',
        expectedOutput: '-1'
      },
      {
        id: 'tc_lru_3',
        description: 'Updating existing key does not evict early',
        inputDescription: 'capacity=2; put(1, 1); put(2, 2); put(1, 10); put(3, 3); get(2); get(1);',
        expectedOutput: '-1, 10',
        isHidden: true
      }
    ],
    explanation: 'A Map in JavaScript maintains insertion order. By deleting and re-inserting a key on access/update, the front of keys() iterator is always the least recently used key.'
  },
  {
    id: 'pos_sql_window',
    title: 'Top Performers by Department (Window Functions)',
    description: 'Write a SQL query that retrieves the top 2 highest-earning employees per department along with their salary rank.',
    targetSkillId: 'sql',
    targetSkillName: 'SQL & Relational Databases',
    category: 'Data Management',
    difficulty: 'Intermediate',
    type: 'sql_query',
    instructions: 'Given tables employees(id, name, salary, department_id) and departments(id, name), write a query returning department_name, employee_name, salary, and rank using DENSE_RANK() or ROW_NUMBER().',
    constraints: [
      'Must use window function (DENSE_RANK() OVER (PARTITION BY ... ORDER BY ...))',
      'Filter for rank <= 2',
      'Order results by department_name ASC, salary DESC'
    ],
    starterCode: `WITH RankedEmployees AS (
  SELECT 
    d.name AS department_name,
    e.name AS employee_name,
    e.salary,
    DENSE_RANK() OVER (PARTITION BY e.department_id ORDER BY e.salary DESC) AS salary_rank
  FROM employees e
  JOIN departments d ON e.department_id = d.id
)
SELECT department_name, employee_name, salary, salary_rank
FROM RankedEmployees
WHERE salary_rank <= 2
ORDER BY department_name ASC, salary DESC;`,
    timeEstimateMinutes: 20,
    submissionFormat: 'Standard SQL Query (CTE / Window function)',
    evaluationCriteria: [
      'Correct partitioning by department',
      'Proper ordering within window by salary descending',
      'Accurate top-2 rank filtering'
    ],
    maxScore: 100,
    passingScorePercentage: 75,
    testCases: [
      {
        id: 'tc_sql_1',
        description: 'DENSE_RANK window specification syntax and partition',
        inputDescription: 'PARTITION BY department_id ORDER BY salary DESC',
        expectedOutput: 'DENSE_RANK window applied'
      },
      {
        id: 'tc_sql_2',
        description: 'Filtering rank <= 2 in outer query / CTE',
        inputDescription: 'Ranked CTE with WHERE salary_rank <= 2',
        expectedOutput: 'Top 2 rank filter present'
      }
    ],
    explanation: 'Window functions calculate ranks across partitions without collapsing rows, enabling safe top-N per group queries.'
  },
  {
    id: 'pos_api_idempotency',
    title: 'Idempotent Payment Webhook Endpoint Design',
    description: 'Design a resilient Express route handler for a payment webhook that prevents double-charging and handles network retries gracefully.',
    targetSkillId: 'backend_dev',
    targetSkillName: 'Backend Engineering',
    category: 'Backend & System Design',
    difficulty: 'Advanced',
    type: 'api_design',
    instructions: 'Implement a webhook handler that extracts idempotency-key or event_id, verifies event signature, checks if the event was already processed in a database transaction, and responds with appropriate status codes (200 for processed/already-handled, 400 for bad signature).',
    constraints: [
      'Handle duplicate webhook events without re-executing credit/debit logic',
      'Enforce signature verification before processing body',
      'Return 200 immediately for known already-completed events'
    ],
    starterCode: `async function handlePaymentWebhook(req, res, db) {
  const signature = req.headers['x-webhook-signature'];
  const event = req.body;

  if (!verifySignature(signature, req.rawBody)) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const existingEvent = await db.processedEvents.findOne({ eventId: event.id });
  if (existingEvent) {
    return res.status(200).json({ status: 'already_processed', eventId: event.id });
  }

  await db.transaction(async (tx) => {
    await tx.processedEvents.insert({ eventId: event.id, processedAt: new Date() });
    await tx.accounts.updateBalance(event.userId, event.amount);
  });

  return res.status(200).json({ status: 'success', eventId: event.id });
}`,
    timeEstimateMinutes: 30,
    submissionFormat: 'Node.js / Express Route Handler',
    evaluationCriteria: [
      'Signature verification check exists before state mutation',
      'Idempotency check checks for duplicate event IDs',
      'Atomic transaction for state update and processed event logging'
    ],
    maxScore: 100,
    passingScorePercentage: 80,
    testCases: [
      {
        id: 'tc_api_1',
        description: 'Signature verification validation',
        inputDescription: 'Missing or invalid signature header',
        expectedOutput: '400 Bad Request error returned'
      },
      {
        id: 'tc_api_2',
        description: 'Idempotency check for duplicate webhook delivery',
        inputDescription: 'Duplicate event id re-delivered',
        expectedOutput: '200 OK with already_processed status, no double deduction'
      }
    ],
    explanation: 'Payment webhooks are at-least-once delivery systems. Safe handlers must check an idempotency registry and execute accounting changes in an atomic transaction.'
  },
  {
    id: 'pos_debug_race_condition',
    title: 'Async Race Condition & Deadlock Debugging',
    description: 'Identify and fix a critical concurrency defect in an async fund transfer operation where concurrent requests cause negative balances.',
    targetSkillId: 'debugging',
    targetSkillName: 'Debugging & Code Diagnostics',
    category: 'Software Engineering',
    difficulty: 'Advanced',
    type: 'debugging',
    instructions: 'Review the buggy transferBalance function. Explain the root cause of the race condition and provide the fixed code using mutex locks or database row locking.',
    constraints: [
      'Prevent simultaneous reads before write completes',
      'Prevent negative balance overdraft',
      'Maintain transaction atomicity across sender and recipient'
    ],
    starterCode: `// BUGGY IMPLEMENTATION:
// async function transfer(fromId, toId, amount) {
//   const fromAcc = await getAccount(fromId);
//   if (fromAcc.balance < amount) throw new Error('Insufficient funds');
//   await updateBalance(fromId, fromAcc.balance - amount);
//   const toAcc = await getAccount(toId);
//   await updateBalance(toId, toAcc.balance + amount);
// }

// FIXED IMPLEMENTATION:
async function transfer(fromId, toId, amount, db) {
  return db.transaction(async (tx) => {
    // Acquire row-level locks in deterministic order to prevent deadlock
    const [firstId, secondId] = fromId < toId ? [fromId, toId] : [toId, fromId];
    await tx.query('SELECT * FROM accounts WHERE id = $1 FOR UPDATE', [firstId]);
    await tx.query('SELECT * FROM accounts WHERE id = $1 FOR UPDATE', [secondId]);

    const fromAcc = await tx.getAccount(fromId);
    if (fromAcc.balance < amount) {
      throw new Error('Insufficient balance');
    }

    await tx.updateBalance(fromId, fromAcc.balance - amount);
    await tx.updateBalance(toId, toAcc.balance + amount);
    return { success: true };
  });
}`,
    timeEstimateMinutes: 25,
    submissionFormat: 'Code fix + Root cause analysis',
    evaluationCriteria: [
      'Identifies Time-Of-Check to Time-Of-Use (TOCTOU) vulnerability',
      'Implements row locking (SELECT FOR UPDATE) or atomic conditional update',
      'Orders lock acquisition to prevent deadlock'
    ],
    maxScore: 100,
    passingScorePercentage: 75,
    testCases: [
      {
        id: 'tc_dbg_1',
        description: 'Detects TOCTOU race condition in un-locked read',
        inputDescription: 'Two concurrent transfers of $60 on an account with $100',
        expectedOutput: 'Locking ensures second transfer rejects with Insufficient balance'
      }
    ],
    explanation: 'Without row-level locks or atomic compare-and-swap, concurrent requests read the balance before either write completes, leading to double-spending.'
  },
  {
    id: 'pos_ml_cosine',
    title: 'Vector Cosine Similarity & Embedding Search',
    description: 'Implement a vectorized cosine similarity function to find the top-K most similar document embeddings to a query embedding without external libraries.',
    targetSkillId: 'aiml',
    targetSkillName: 'Machine Learning Fundamentals',
    category: 'AI & Data Science',
    difficulty: 'Intermediate',
    type: 'ml_pipeline',
    instructions: 'Compute cosine similarity between query vector Q and a matrix of document embeddings D. Cosine similarity = dot(A, B) / (norm(A) * norm(B)). Return top-K document indices sorted by descending similarity.',
    constraints: [
      'Vectors have equal dimensionality (e.g., 768-d or 1536-d)',
      'Handle zero-norm edge cases safely (return 0 similarity instead of NaN)',
      'Sort indices in descending order of similarity score'
    ],
    starterCode: `function dotProduct(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function vectorNorm(v) {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  return Math.sqrt(sum);
}

function topKEmbeddings(query, documents, k = 3) {
  const qNorm = vectorNorm(query);
  if (qNorm === 0) return [];

  const scores = documents.map((doc, index) => {
    const dNorm = vectorNorm(doc);
    const similarity = dNorm === 0 ? 0 : dotProduct(query, doc) / (qNorm * dNorm);
    return { index, similarity };
  });

  scores.sort((a, b) => b.similarity - a.similarity);
  return scores.slice(0, k);
}`,
    timeEstimateMinutes: 20,
    submissionFormat: 'JavaScript / Python vector computation function',
    evaluationCriteria: [
      'Correct dot product and Euclidean norm calculation',
      'Zero-division protection for zero vectors',
      'Correct top-K ranking and descending order'
    ],
    maxScore: 100,
    passingScorePercentage: 80,
    testCases: [
      {
        id: 'tc_ml_1',
        description: 'Identical vectors have cosine similarity of 1.0',
        inputDescription: 'query=[1, 0, 0], doc=[1, 0, 0]',
        expectedOutput: 'similarity: 1.0'
      },
      {
        id: 'tc_ml_2',
        description: 'Orthogonal vectors have cosine similarity of 0.0',
        inputDescription: 'query=[1, 0], doc=[0, 1]',
        expectedOutput: 'similarity: 0.0'
      }
    ],
    explanation: 'Cosine similarity normalizes vectors by their magnitudes, measuring the angle rather than the euclidean distance, which is fundamental to semantic search.'
  }
];
