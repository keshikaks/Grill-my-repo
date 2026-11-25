import test from "node:test";
import assert from "node:assert";
import {
  parseRawClaimsFromReadme,
  verifyClaimAgainstFiles,
} from "../src/lib/services/analysis/claims-extractor.ts";
import { extractTechnologies } from "../src/lib/services/analysis/tech-analyzer.ts";
import { synthesizeArchitecture } from "../src/lib/services/analysis/architecture-synthesizer.ts";

test("Claims Extraction - Parses claims from README", () => {
  const sampleReadme = `
# PulseQueue
Distributed job queue.

## Features
- All outbound webhooks are cryptographically signed with HMAC-SHA256 headers.
- Failed deliveries automatically retry with capped exponential backoff.
- Sustains 12,000 webhook dispatches per second at p99 latency under 45ms.
- Built-in Prometheus exporter at /metrics endpoint.
- Exactly-once delivery guarantee across worker restarts.
- Install with npm install
  `;

  const claims = parseRawClaimsFromReadme(sampleReadme);
  assert.ok(claims.length >= 4, `Expected at least 4 claims, got ${claims.length}`);

  const hmacClaim = claims.find((c) => c.claim.includes("HMAC-SHA256"));
  assert.ok(hmacClaim, "Expected HMAC claim to be extracted");

  const benchClaim = claims.find((c) => c.claim.includes("12,000"));
  assert.ok(benchClaim, "Expected benchmark claim to be extracted");
});

test("Claims Verification - Classifies claim statuses accurately", () => {
  const files = [
    {
      path: "src/security/hmac.ts",
      extension: ".ts",
      size: 500,
      content: `export function signWebhookPayload(payload: string, secret: string): string {\n  const digest = createHmac("sha256", secret).update(payload).digest("hex");\n  return digest;\n}`,
      lines: [
        "export function signWebhookPayload(payload: string, secret: string): string {",
        '  const digest = createHmac("sha256", secret).update(payload).digest("hex");',
        "  return digest;",
        "}",
      ],
      lineCount: 4,
      sha: "sha123",
    },
    {
      path: "src/worker/retry.ts",
      extension: ".ts",
      size: 400,
      content: `export function computeRetryDelay(attempt: number): number {\n  return Math.pow(2, attempt) * 1000;\n}`,
      lines: [
        "export function computeRetryDelay(attempt: number): number {",
        "  return Math.pow(2, attempt) * 1000;",
        "}",
      ],
      lineCount: 3,
      sha: "sha456",
    },
  ];

  // 1. Supported claim
  const hmacClaim = {
    id: "c1",
    claim: "All outbound webhooks are cryptographically signed with HMAC-SHA256 headers.",
    sourceSection: "README.md · Security",
  };
  const hmacResult = verifyClaimAgainstFiles(hmacClaim, files, "commit999");
  assert.ok(
    hmacResult.status === "SUPPORTED" || hmacResult.status === "PARTIALLY_SUPPORTED"
  );
  assert.ok(hmacResult.evidenceReferences.length > 0);
  assert.strictEqual(hmacResult.evidenceReferences[0]?.filePath, "src/security/hmac.ts");

  // 2. Unverifiable runtime benchmark claim
  const benchClaim = {
    id: "c2",
    claim: "Sustains 12,000 req/s throughput at p99 latency under 45ms.",
    sourceSection: "README.md · Benchmarks",
  };
  const benchResult = verifyClaimAgainstFiles(benchClaim, files, "commit999");
  assert.strictEqual(benchResult.status, "NOT_STATICALLY_VERIFIABLE");

  // 3. Not found claim
  const missingClaim = {
    id: "c3",
    claim: "Built-in Prometheus exporter and metrics dashboard at /metrics.",
    sourceSection: "README.md · Metrics",
  };
  const missingResult = verifyClaimAgainstFiles(missingClaim, files, "commit999");
  assert.strictEqual(missingResult.status, "NOT_FOUND_IN_INSPECTED_FILES");
  assert.strictEqual(missingResult.evidenceReferences.length, 0);
});

test("Technology Extraction & Architecture Synthesis", () => {
  const files = [
    {
      path: "package.json",
      extension: ".json",
      size: 300,
      content: JSON.stringify({
        dependencies: {
          fastify: "^5.0.0",
          ioredis: "^5.3.0",
          zod: "^3.24.0",
        },
        devDependencies: {
          vitest: "^2.0.0",
        },
      }),
      lines: [],
      lineCount: 10,
      sha: "sha1",
    },
    {
      path: "src/server.ts",
      extension: ".ts",
      size: 400,
      content: "import fastify from 'fastify';",
      lines: ["import fastify from 'fastify';"],
      lineCount: 1,
      sha: "sha2",
    },
  ];

  const techs = extractTechnologies(files);
  const techNames = techs.map((t) => t.name);
  assert.ok(techNames.includes("Fastify"));
  assert.ok(techNames.includes("Redis (ioredis)"));
  assert.ok(techNames.includes("Zod"));
  assert.ok(techNames.includes("Vitest"));

  const arch = synthesizeArchitecture(files, "TestRepo");
  assert.ok(arch.pattern.length > 0);
  assert.ok(arch.layers.length > 0);
  assert.ok(arch.dataFlow.length > 0);
});
