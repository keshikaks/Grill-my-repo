import {
  GrillQuestionSchema,
  type GrillQuestion,
} from "@/lib/contracts/grill";

export const SAMPLE_GRILL_QUESTIONS: GrillQuestion[] = [
  // EASY LEVEL — Know what you built
  {
    id: "q-01",
    order: 1,
    category: "Architecture",
    difficulty: "EASY",
    text: "What does pulsequeue do, and what specific problem does it solve for background job processing?",
    followUpContext:
      "Explain the main goal of pulsequeue in simple words without technical buzzwords.",
    evidenceReferences: [
      {
        id: "gq-ev-1a",
        filePath: "src/api/routes/jobs.ts",
        startLine: 1,
        endLine: 25,
        contentReference: "blob:9f4c2b8:src/api/routes/jobs.ts",
        language: "typescript",
        excerpt: `export async function registerJobRoutes(server: FastifyInstance, deps: ServiceDeps) {
  server.post("/jobs", async (request, reply) => {
    const payload = JobPayloadSchema.parse(request.body);
    const job = await deps.jobRepo.createQueuedJob({
      targetUrl: payload.targetUrl,
      body: payload.body,
    });
    return reply.code(202).send({ jobId: job.id, status: "QUEUED" });
  });
}`,
        note: "Job ingestion HTTP endpoint",
      },
    ],
    expectedConcepts: [
      "pulsequeue is a reliable background task queue for webhook delivery and HTTP dispatch.",
      "It decouples slow API requests from user-facing request loops so web apps do not freeze.",
      "Tasks are queued first and executed asynchronously in the background.",
    ],
    explanation: {
      whatItIsAsking:
        "The interviewer wants you to explain what pulsequeue is, who uses it, and what problem it solves.",
      whyInterviewerAsks:
        "Every interview starts with high-level comprehension. They want to see if you can explain the core purpose clearly.",
      conceptsToThinkAbout: [
        "Why do we need a queue instead of sending webhooks immediately in the web request?",
        "What happens to the user when a slow request is moved to the background?",
        "What is the core user benefit?",
      ],
    },
  },
  {
    id: "q-02",
    order: 2,
    category: "Architecture",
    difficulty: "EASY",
    text: "Which technologies did you use in pulsequeue (TypeScript, Fastify, Redis, PostgreSQL), and why did you choose them?",
    followUpContext:
      "Explain why you selected this technology stack for a queueing engine.",
    evidenceReferences: [
      {
        id: "gq-ev-2a",
        filePath: "package.json",
        startLine: 1,
        endLine: 20,
        contentReference: "blob:9f4c2b8:package.json",
        language: "json",
        excerpt: `{
  "name": "@acme-eng/pulsequeue",
  "dependencies": {
    "fastify": "^4.26.2",
    "ioredis": "^5.3.2",
    "pg": "^8.11.3",
    "zod": "^3.22.4"
  }
}`,
        note: "Project dependencies",
      },
    ],
    expectedConcepts: [
      "Fastify provides low overhead, high HTTP throughput for queue ingestion.",
      "Redis Streams provide fast, in-memory pub/sub message dispatch.",
      "PostgreSQL guarantees ACID durability and permanent audit logs of all jobs.",
      "TypeScript and Zod ensure runtime schema validation and compile-time type safety.",
    ],
    explanation: {
      whatItIsAsking:
        "The interviewer is asking why you selected each tool in your stack and how they fit together.",
      whyInterviewerAsks:
        "Examiners want to see that you chose tools deliberately based on technical requirements.",
      conceptsToThinkAbout: [
        "Why Redis for queueing and PostgreSQL for permanent history?",
        "Why Fastify over Express?",
        "What benefits does TypeScript provide for queue payloads?",
      ],
    },
  },

  // MEDIUM LEVEL — Understand how it works
  {
    id: "q-03",
    order: 3,
    category: "Reliability",
    difficulty: "MEDIUM",
    text: "How does pulsequeue handle an error or server crash when saving a job to the database before pushing it to the queue?",
    followUpContext:
      "Explain what happens if the server process dies between database insertion and message queuing, and how state is preserved.",
    evidenceReferences: [
      {
        id: "gq-ev-3a",
        filePath: "src/api/routes/jobs.ts",
        startLine: 16,
        endLine: 33,
        contentReference: "blob:9f4c2b8:src/api/routes/jobs.ts",
        language: "typescript",
        excerpt: `    const job = await deps.jobRepo.createQueuedJob({
      targetUrl: payload.targetUrl,
      body: payload.body,
      maxAttempts: payload.maxAttempts ?? 5,
      idempotencyKey: idempotencyKey ? String(idempotencyKey) : null,
    });

    // Note: if process crashes right here, sweeper reconciles stale QUEUED rows
    await deps.broker.enqueue(job.id, payload.priority);
    return reply.code(202).send({ jobId: job.id, status: "QUEUED" });`,
        note: "Dual-write boundary in job creation",
      },
    ],
    expectedConcepts: [
      "Explain the boundary between database transaction commit and message queuing.",
      "Identify the dual-write recovery window if a process dies between steps.",
      "Mention background sweeper / outbox pattern as the reconciliation mechanism.",
    ],
    explanation: {
      whatItIsAsking:
        "The interviewer wants you to explain what happens when the server dies halfway through saving a job.",
      whyInterviewerAsks:
        "Distributed systems often crash mid-execution. Examiners check if you know how data remains consistent.",
      conceptsToThinkAbout: [
        "What is saved to PostgreSQL first?",
        "What happens if Redis is unreachable?",
        "How does a background sweeper find jobs that were never enqueued?",
      ],
    },
  },
  {
    id: "q-04",
    order: 4,
    category: "Security",
    difficulty: "MEDIUM",
    text: "When verifying an incoming webhook signature, why is checking the timestamp header important for preventing replay attacks?",
    followUpContext:
      "Inspect how timestamp header validation prevents forged or replayed packets from being accepted.",
    evidenceReferences: [
      {
        id: "gq-ev-4a",
        filePath: "src/security/hmac.ts",
        startLine: 1,
        endLine: 24,
        contentReference: "blob:9f4c2b8:src/security/hmac.ts",
        language: "typescript",
        excerpt: `export function signWebhookPayload(
  payload: string,
  secret: string,
  timestampSec = Math.floor(Date.now() / 1000)
): string {
  const signedContent = \`\${timestampSec}.\${payload}\`;
  const digest = createHmac("sha256", secret).update(signedContent).digest("hex");
  return \`t=\${timestampSec},v1=\${digest}\`;
}

export function verifyWebhookSignature(
  payload: string,
  header: string,
  secret: string
): boolean {
  const expected = Buffer.from(signWebhookPayload(payload, secret));
  const actual = Buffer.from(header);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}`,
        note: "HMAC signature verification with timestamp",
      },
    ],
    expectedConcepts: [
      "An attacker could capture a valid signed request and resend it later unless bounded by an expiry window.",
      "The timestamp must be extracted from the incoming header and validated against current server time.",
      "Timing-safe comparisons are necessary to avoid side-channel timing leaks during cryptographic validation.",
    ],
    explanation: {
      whatItIsAsking:
        "The interviewer is asking why a signature alone isn't enough to prevent someone from reusing old requests.",
      whyInterviewerAsks:
        "Security in web APIs is a frequent topic. They want to see if you understand replay attack vectors.",
      conceptsToThinkAbout: [
        "What is a replay attack?",
        "How does checking that the request was sent in the last 5 minutes stop replay attacks?",
        "Why is timingSafeEqual used instead of standard === ?",
      ],
    },
  },

  // HARD LEVEL — Defend your decisions
  {
    id: "q-05",
    order: 5,
    category: "Concurrency",
    difficulty: "HARD",
    text: "What would happen if 1,000 jobs arrived simultaneously while one downstream server takes 8 seconds to respond? How does this affect worker throughput?",
    followUpContext:
      "Analyze head-of-line blocking and connection pool limits under heavy concurrent load.",
    evidenceReferences: [
      {
        id: "gq-ev-5a",
        filePath: "src/worker/consumer.ts",
        startLine: 18,
        endLine: 40,
        contentReference: "blob:9f4c2b8:src/worker/consumer.ts",
        language: "typescript",
        excerpt: `    if (!entries) return;

    await Promise.all(
      entries.map(async ([entryId, fields]) => {
        const jobId = fields.jobId;
        const outcome = await this.dispatcher.deliver(jobId);

        if (outcome.ok) {
          await this.jobRepo.markDelivered(jobId, outcome.statusCode);
          await this.redis.xack(this.streamKey, this.groupName, entryId);
          return;
        }

        await this.scheduleRetryOrDeadLetter(jobId, entryId, outcome.error);
      })
    );`,
        note: "Concurrent worker consumer batch",
      },
    ],
    expectedConcepts: [
      "Promise.all waits for the slowest operation before the batch completes, creating head-of-line blocking.",
      "Individual fast jobs are delayed from acknowledgment until the slow destination finishes.",
      "Per-destination concurrency limits or isolated worker pools prevent one slow endpoint from saturating the queue.",
    ],
    explanation: {
      whatItIsAsking:
        "The interviewer wants you to analyze the performance bottleneck when multiple tasks are grouped together.",
      whyInterviewerAsks:
        "Senior examiners test whether you understand async batch concurrency and the danger of head-of-line blocking.",
      conceptsToThinkAbout: [
        "What does Promise.all do if 9 tasks take 10ms and 1 takes 8,000ms?",
        "Are other fast jobs delayed from finishing?",
        "How could we process jobs independently instead of in rigid batches?",
      ],
    },
  },
  {
    id: "q-06",
    order: 6,
    category: "Data Modeling",
    difficulty: "HARD",
    text: "If two identical requests with the same idempotency key arrive at the exact same millisecond, how does your database prevent duplicate writes, and what are the limitations?",
    followUpContext:
      "Explain how unique indexes prevent race conditions and what happens to the second request.",
    evidenceReferences: [
      {
        id: "gq-ev-6a",
        filePath: "src/db/migrations/001_init.sql",
        startLine: 1,
        endLine: 20,
        contentReference: "blob:9f4c2b8:src/db/migrations/001_init.sql",
        language: "sql",
        excerpt: `CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_url TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('QUEUED', 'DELIVERED', 'RETRYING', 'DEAD_LETTER')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_jobs_idempotency_key
  ON jobs (idempotency_key)
  WHERE idempotency_key IS NOT NULL;`,
        note: "Idempotency unique constraint in database",
      },
    ],
    expectedConcepts: [
      "Application-level SELECT then INSERT checks suffer from TOCTOU race conditions.",
      "A database-level unique constraint guarantees atomicity across concurrent transactions.",
      "The second conflicting transaction receives error 23505 and must retrieve the existing record instead of crashing.",
    ],
    explanation: {
      whatItIsAsking:
        "The interviewer is asking how you handle race conditions when two identical requests hit the server at the exact same moment.",
      whyInterviewerAsks:
        "Race condition prevention is a hallmark of strong backend engineering. They want to see if you rely on the DB.",
      conceptsToThinkAbout: [
        "Why can't you just do `if (!jobExists) { createJob() }` in Node.js?",
        "What does the UNIQUE index in PostgreSQL guarantee?",
        "How should the API respond to the second request?",
      ],
    },
  },
].map((item) => GrillQuestionSchema.parse(item));
