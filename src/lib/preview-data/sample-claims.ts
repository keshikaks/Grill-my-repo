import {
  ClaimVerificationSchema,
  type ClaimVerification,
} from "@/lib/contracts/claims";

export const SAMPLE_CLAIMS: ClaimVerification[] = [
  {
    id: "claim-hmac",
    claim:
      "All outbound webhooks are cryptographically signed with timestamped HMAC-SHA256 headers to prevent tampering and replay attacks.",
    sourceSection: "README.md · Security",
    status: "SUPPORTED",
    explanation:
      "signWebhookPayload() generates a timestamp-prefixed HMAC-SHA256 header (`t=<ts>,v1=<digest>`) and attaches it in WebhookDispatcher before every outbound POST request.",
    evidenceReferences: [
      {
        id: "ev-hmac-1",
        filePath: "src/security/hmac.ts",
        startLine: 12,
        endLine: 26,
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
}`,
        note: "Timestamp is included in the signed input string to support replay-window verification.",
      },
    ],
  },
  {
    id: "claim-backoff",
    claim:
      "Failed deliveries automatically retry with capped exponential backoff, jitter, and dead-letter isolation for permanent 4xx failures.",
    sourceSection: "README.md · Reliability",
    status: "SUPPORTED",
    explanation:
      "computeRetryDelayMs() enforces exponential backoff capped at 300s with up to 35% jitter, and shouldDeadLetter() immediately routes non-429 4xx responses to dead-letter storage.",
    evidenceReferences: [
      {
        id: "ev-retry-1",
        filePath: "src/worker/retry-policy.ts",
        startLine: 1,
        endLine: 18,
        contentReference: "blob:9f4c2b8:src/worker/retry-policy.ts",
        language: "typescript",
        excerpt: `export function computeRetryDelayMs(attempt: number, baseMs = 1_000, capMs = 300_000): number {
  const safeAttempt = Math.max(1, attempt);
  const exponential = Math.min(capMs, baseMs * Math.pow(2, safeAttempt - 1));
  const jitter = Math.floor(Math.random() * exponential * 0.35);
  return Math.min(capMs, exponential + jitter);
}

export function shouldDeadLetter(attempt: number, maxAttempts: number, statusCode?: number): boolean {
  if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
    return true;
  }
  return attempt >= maxAttempts;
}`,
        note: "429 Too Many Requests is explicitly excluded from immediate dead-lettering.",
      },
    ],
  },
  {
    id: "claim-exactly-once",
    claim:
      "Guarantees exactly-once webhook delivery via transactional outbox and idempotency keys.",
    sourceSection: "README.md · Architecture",
    status: "PARTIALLY_SUPPORTED",
    explanation:
      "Ingestion deduplicates client retries via a partial unique index on `idempotency_key`, which prevents duplicate job creation. However, the DB insert and Redis XADD are not atomic, and outbound HTTP webhooks remain at-least-once if a worker crashes after HTTP 200 but before XACK.",
    evidenceReferences: [
      {
        id: "ev-idemp-1",
        filePath: "src/api/routes/jobs.ts",
        startLine: 18,
        endLine: 34,
        contentReference: "blob:9f4c2b8:src/api/routes/jobs.ts",
        language: "typescript",
        excerpt: `    const job = await deps.jobRepo.createQueuedJob({
      targetUrl: payload.targetUrl,
      body: payload.body,
      maxAttempts: payload.maxAttempts ?? 5,
      idempotencyKey: idempotencyKey ? String(idempotencyKey) : null,
    });

    // Note: if process crashes right here, sweeper reconciles stale QUEUED rows
    await deps.broker.enqueue(job.id, payload.priority);`,
        note: "Separate PostgreSQL write and Redis XADD without an atomic outbox relay.",
      },
      {
        id: "ev-idemp-2",
        filePath: "src/db/migrations/001_init.sql",
        startLine: 14,
        endLine: 19,
        contentReference: "blob:9f4c2b8:src/db/migrations/001_init.sql",
        language: "sql",
        excerpt: `CREATE UNIQUE INDEX idx_jobs_idempotency_key
  ON jobs (idempotency_key)
  WHERE idempotency_key IS NOT NULL;`,
        note: "Deduplication is enforced at ingestion, not end-to-end delivery.",
      },
    ],
  },
  {
    id: "claim-ssrf",
    claim:
      "Outbound webhook dispatcher blocks private RFC-1918 and loopback IP addresses to prevent SSRF.",
    sourceSection: "README.md · Security",
    status: "PARTIALLY_SUPPORTED",
    explanation:
      "The Zod schema rejects non-HTTPS URLs and literal `localhost` hostnames, but no DNS resolution check or CIDR IP blocklist exists before executing the outbound fetch(), leaving DNS rebinding and 169.254.169.254 metadata endpoints exposed.",
    evidenceReferences: [
      {
        id: "ev-ssrf-1",
        filePath: "src/api/schemas/job.schema.ts",
        startLine: 6,
        endLine: 16,
        contentReference: "blob:9f4c2b8:src/api/schemas/job.schema.ts",
        language: "typescript",
        excerpt: `export const CreateJobSchema = z.object({
  targetUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith("https://"), "Only HTTPS targets allowed")
    .refine((u) => !u.includes("localhost"), "Localhost is not permitted"),
  body: z.record(z.unknown()),
  maxAttempts: z.number().int().min(1).max(10).optional(),
});`,
        note: "String-level URL check only; does not resolve IP addresses or block private CIDRs.",
      },
    ],
  },
  {
    id: "claim-prometheus",
    claim:
      "Ships with an embedded `/metrics` Prometheus exporter and pre-configured Grafana dashboards for queue lag.",
    sourceSection: "README.md · Observability",
    status: "NOT_FOUND_IN_INSPECTED_FILES",
    explanation:
      "No `/metrics` route, `prom-client` dependency, or Grafana JSON dashboard definitions were found in `package.json`, `src/api/server.ts`, or any inspected directory.",
    evidenceReferences: [
      {
        id: "ev-prom-1",
        filePath: "src/api/server.ts",
        startLine: 18,
        endLine: 30,
        contentReference: "blob:9f4c2b8:src/api/server.ts",
        language: "typescript",
        excerpt: `export async function buildServer(deps: RouteDeps) {
  const app = Fastify({ logger: true });
  app.get("/health", async () => ({ ok: true }));
  await registerJobRoutes(app, deps);
  await registerDeadLetterRoutes(app, deps);
  return app;
}`,
        note: "Only /health, job routes, and dead-letter routes are registered.",
      },
    ],
  },
  {
    id: "claim-throughput",
    claim:
      "Sustains 12,000 webhook dispatches per second at p99 latency under 45ms across a 4-node cluster.",
    sourceSection: "README.md · Benchmarks",
    status: "NOT_STATICALLY_VERIFIABLE",
    explanation:
      "Throughput and tail latency depend on Redis cluster topology, PostgreSQL connection pooling, target webhook response times, and deployment hardware. No reproducible load-test harness or benchmark results exist in the repository to verify statically.",
    evidenceReferences: [
      {
        id: "ev-bench-1",
        filePath: "src/worker/consumer.ts",
        startLine: 14,
        endLine: 30,
        contentReference: "blob:9f4c2b8:src/worker/consumer.ts",
        language: "typescript",
        excerpt: `    const entries = await this.redis.xreadgroup(
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
    );`,
        note: "Static code shows batch pulling via XREADGROUP, but runtime throughput cannot be proven statically.",
      },
    ],
  },
].map((item) => ClaimVerificationSchema.parse(item));
