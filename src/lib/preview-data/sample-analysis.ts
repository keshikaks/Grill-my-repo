import {
  AnalysisResultSchema,
  type AnalysisResult,
} from "@/lib/contracts/analysis";

export const SAMPLE_ANALYSIS: AnalysisResult = AnalysisResultSchema.parse({
  isPreview: true,
  stages: [
    {
      id: "fetch-tree",
      label: "Inspect repository tree",
      detail: "Indexed 42 source and configuration files on branch main (9f4c2b8).",
      status: "COMPLETED",
      durationMs: 420,
    },
    {
      id: "detect-stack",
      label: "Detect stack & architecture",
      detail: "Mapped Fastify API ingestion, Redis Streams workers, and PostgreSQL persistence.",
      status: "COMPLETED",
      durationMs: 680,
    },
    {
      id: "extract-claims",
      label: "Extract README claims",
      detail: "Parsed 6 technical guarantees from README.md sections.",
      status: "COMPLETED",
      durationMs: 540,
    },
    {
      id: "verify-evidence",
      label: "Cross-check source evidence",
      detail: "Matched claims against worker, retry, webhook signer, and migration files.",
      status: "COMPLETED",
      durationMs: 910,
    },
  ],
  projectSummary: {
    headline: "Event-driven job broker with retry orchestration and webhook signing",
    overview:
      "PulseQueue ingests asynchronous delivery requests over a Fastify HTTP API, persists job metadata in PostgreSQL, and enqueues dispatch messages onto Redis Streams consumer groups. Worker processes poll stream batches, sign outbound HTTP payloads with HMAC-SHA256, and schedule exponential retries on non-2xx responses.",
    primaryUseCase:
      "Decoupling latency-sensitive API endpoints from unreliable third-party webhook destinations while maintaining delivery auditability.",
    complexityLevel: "Production-Oriented",
    observations: [
      "Clean separation between HTTP ingestion routes, queue producer, and stream consumer workers.",
      "Webhook signatures use timing-safe comparison and SHA-256 digests, but secret rotation is not yet wired.",
      "Idempotency keys are stored in PostgreSQL with a unique constraint, though worker crash recovery still relies on manual XAUTOCLAIM intervals.",
      "README mentions built-in Prometheus metrics and multi-region failover, which require closer verification against inspected files.",
    ],
  },
  technologies: [
    {
      name: "TypeScript 5.7",
      category: "Runtime & Language",
      detectedIn: "tsconfig.json",
      purpose: "Strict static typing across API schemas, queue payloads, and database rows.",
    },
    {
      name: "Fastify 5",
      category: "Framework & API",
      detectedIn: "src/api/server.ts",
      purpose: "Low-overhead HTTP server for job enqueue, status lookup, and dead-letter replay.",
    },
    {
      name: "Redis Streams (ioredis)",
      category: "Data & Messaging",
      detectedIn: "src/queue/stream-broker.ts",
      purpose: "Ordered append-only event log with consumer groups for distributed worker dispatch.",
    },
    {
      name: "PostgreSQL (pg)",
      category: "Data & Messaging",
      detectedIn: "src/db/migrations/001_init.sql",
      purpose: "Durable job ledger, idempotency key uniqueness, and delivery attempt audit trail.",
    },
    {
      name: "Zod",
      category: "Framework & API",
      detectedIn: "src/api/schemas/job.schema.ts",
      purpose: "Runtime validation of incoming webhook payloads and retry policies.",
    },
    {
      name: "Vitest",
      category: "Testing & Tooling",
      detectedIn: "tests/retry-policy.test.ts",
      purpose: "Unit tests covering exponential backoff jitter and HMAC signing helpers.",
    },
  ],
  architecture: {
    pattern: "Transactional Outbox + Redis Streams Consumer Group",
    summary:
      "API requests validate payloads and write durable job records before publishing message IDs into Redis Streams. Stateless worker pools pull from a shared consumer group, execute outbound webhooks with bounded timeouts, and acknowledge completed entries via XACK.",
    dataFlow: [
      "Client POST /v1/jobs -> Zod schema validation & Idempotency-Key check",
      "PostgreSQL INSERT into jobs table with status = QUEUED",
      "Broker XADD publishes jobId to pulsequeue:dispatch stream",
      "Worker pool reads via XREADGROUP, signs payload (HMAC-SHA256), and dispatches HTTP POST",
      "On failure, retry scheduler calculates jittered backoff or routes to dead_letter_jobs",
    ],
    layers: [
      {
        id: "ingestion",
        name: "HTTP Ingestion Layer",
        responsibility:
          "Authenticates producer API keys, validates request bodies, enforces idempotency keys, and persists initial job records.",
        keyFiles: ["src/api/server.ts", "src/api/routes/jobs.ts"],
        tradeOffs:
          "Writes to PostgreSQL before XADD to preserve audit records, creating a narrow window where a crash between DB commit and Redis publish leaves an unscheduled row until the sweeper runs.",
      },
      {
        id: "broker",
        name: "Stream Broker & Worker Pool",
        responsibility:
          "Manages consumer group subscriptions, batch polling, pending entry reclamation, and bounded concurrency per worker instance.",
        keyFiles: ["src/queue/stream-broker.ts", "src/worker/consumer.ts"],
        tradeOffs:
          "Redis Streams gives simple operational footprint compared to Kafka, but relies on explicit XAUTOCLAIM tuning to avoid duplicate deliveries on slow webhooks.",
      },
      {
        id: "delivery",
        name: "Webhook Dispatcher & Security",
        responsibility:
          "Constructs timestamped HMAC-SHA256 signatures, enforces outbound timeouts, and evaluates retry eligibility.",
        keyFiles: ["src/worker/webhook-dispatcher.ts", "src/security/hmac.ts"],
        tradeOffs:
          "Synchronous per-attempt timeout of 8 seconds protects worker slots, though no SSRF IP-range blocklist is applied before fetch().",
      },
    ],
  },
  importantFiles: [
    {
      path: "src/api/routes/jobs.ts",
      extension: ".ts",
      size: 4620,
      contentReference: "blob:9f4c2b8:src/api/routes/jobs.ts",
      role: "API Ingestion & Idempotency",
      language: "typescript",
      lineCount: 148,
      summary:
        "Handles POST /v1/jobs, validates payloads with Zod, enforces idempotency key lookup, and enqueues work.",
      snippet: `export async function registerJobRoutes(app: FastifyInstance, deps: RouteDeps) {
  app.post("/v1/jobs", async (request, reply) => {
    const idempotencyKey = request.headers["idempotency-key"];
    const payload = CreateJobSchema.parse(request.body);

    const existing = idempotencyKey
      ? await deps.jobRepo.findByIdempotencyKey(String(idempotencyKey))
      : null;

    if (existing) {
      return reply.code(200).send({ jobId: existing.id, deduplicated: true });
    }

    const job = await deps.jobRepo.createQueuedJob({
      targetUrl: payload.targetUrl,
      body: payload.body,
      maxAttempts: payload.maxAttempts ?? 5,
      idempotencyKey: idempotencyKey ? String(idempotencyKey) : null,
    });

    // Note: if process crashes right here, sweeper reconciles stale QUEUED rows
    await deps.broker.enqueue(job.id, payload.priority);
    return reply.code(202).send({ jobId: job.id, status: "QUEUED" });
  });
}`,
    },
    {
      path: "src/worker/consumer.ts",
      extension: ".ts",
      size: 6180,
      contentReference: "blob:9f4c2b8:src/worker/consumer.ts",
      role: "Redis Streams Worker Loop",
      language: "typescript",
      lineCount: 194,
      summary:
        "Polls Redis Streams consumer groups, dispatches jobs with bounded concurrency, and handles XACK / retry transitions.",
      snippet: `export class StreamWorker {
  async pollBatch(): Promise<void> {
    const entries = await this.redis.xreadgroup(
      "GROUP",
      this.groupName,
      this.consumerId,
      "COUNT",
      this.batchSize,
      "BLOCK",
      2500,
      "STREAMS",
      this.streamKey,
      ">"
    );

    if (!entries) return;

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
    );
  }
}`,
    },
    {
      path: "src/worker/retry-policy.ts",
      extension: ".ts",
      size: 2140,
      contentReference: "blob:9f4c2b8:src/worker/retry-policy.ts",
      role: "Exponential Backoff & Jitter",
      language: "typescript",
      lineCount: 68,
      summary:
        "Computes capped exponential backoff with full jitter and decides when jobs move to the dead-letter table.",
      snippet: `export function computeRetryDelayMs(attempt: number, baseMs = 1_000, capMs = 300_000): number {
  const safeAttempt = Math.max(1, attempt);
  const exponential = Math.min(capMs, baseMs * Math.pow(2, safeAttempt - 1));
  const jitter = Math.floor(Math.random() * exponential * 0.35);
  return Math.min(capMs, exponential + jitter);
}

export function shouldDeadLetter(attempt: number, maxAttempts: number, statusCode?: number): boolean {
  if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
    return true; // Do not retry permanent client errors
  }
  return attempt >= maxAttempts;
}`,
    },
    {
      path: "src/security/hmac.ts",
      extension: ".ts",
      size: 1890,
      contentReference: "blob:9f4c2b8:src/security/hmac.ts",
      role: "Webhook Payload Signing",
      language: "typescript",
      lineCount: 54,
      summary:
        "Generates timestamped HMAC-SHA256 signatures and verifies digests using crypto.timingSafeEqual.",
      snippet: `export function signWebhookPayload(
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
    },
    {
      path: "src/db/migrations/001_init.sql",
      extension: ".sql",
      size: 2780,
      contentReference: "blob:9f4c2b8:src/db/migrations/001_init.sql",
      role: "Database Schema & Constraints",
      language: "sql",
      lineCount: 72,
      summary:
        "Defines jobs, delivery_attempts, and dead_letter_jobs tables with partial unique index for idempotency keys.",
      snippet: `CREATE TABLE jobs (
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
    },
  ],
});
