import test from "node:test";
import assert from "node:assert";
import { z } from "zod";
import {
  extractJsonFromResponse,
  validateStructuredResponse,
} from "../src/lib/services/ai/prompt-utils.ts";
import { HeuristicProvider } from "../src/lib/services/ai/heuristic-provider.ts";
import { evaluateWithHeuristics } from "../src/lib/services/grill/answer-evaluator.ts";
import { generateGroundedStaticQuestions } from "../src/lib/services/grill/question-generator.ts";

test("AI Prompt Utils - Robust JSON Extraction", () => {
  // Direct JSON
  const raw1 = '{"status": "ok", "count": 42}';
  const parsed1 = extractJsonFromResponse(raw1);
  assert.strictEqual(parsed1.status, "ok");
  assert.strictEqual(parsed1.count, 42);

  // Markdown code block with preamble and trailing text
  const raw2 = `
Here is your structured output:
\`\`\`json
{
  "name": "pulsequeue",
  "score": 85
}
\`\`\`
Hope this helps!
  `;
  const parsed2 = extractJsonFromResponse(raw2);
  assert.strictEqual(parsed2.name, "pulsequeue");
  assert.strictEqual(parsed2.score, 85);

  // Zod schema validation
  const Schema = z.object({
    name: z.string(),
    score: z.number(),
  });
  const validated = validateStructuredResponse(raw2, Schema);
  assert.strictEqual(validated.name, "pulsequeue");
});

test("Heuristic Provider - Reports unconfigured status", async () => {
  const provider = new HeuristicProvider();
  assert.strictEqual(provider.isConfigured, false);
  assert.strictEqual(provider.type, "heuristic");

  const textRes = await provider.generateText("hello");
  assert.ok(textRes.text.includes("AI Provider is not configured"));
});

test("Answer Evaluator - 5-Point Rubric and 4 Dimensions", () => {
  const mockQuestion = {
    id: "q-1",
    order: 1,
    text: "Explain how HMAC signatures protect against replay attacks.",
    category: "Security",
    difficulty: "INTERMEDIATE",
    evidenceReferences: [
      {
        id: "ev-1",
        filePath: "src/security/hmac.ts",
        startLine: 1,
        endLine: 10,
        contentReference: "blob:123:src/security/hmac.ts",
        language: "typescript",
        excerpt: "const digest = hmac(secret, payload);",
      },
    ],
    expectedConcepts: [
      "Include timestamp in the signed payload to bound validity.",
      "Check clock skew tolerance window on the receiver.",
      "Use timing-safe comparison to prevent timing attacks.",
    ],
  };

  // 1. Strong answer covering expected concepts
  const strongAnswer = `
We prefix the payload with an explicit timestampSec and compute HMAC-SHA256 over timestamp.payload.
The receiver checks that the timestamp is within a 5-minute clock skew tolerance window to bound validity and prevent replay attacks.
Finally, we compare digests using timingSafeEqual to avoid timing side channels.
  `;
  const strongEval = evaluateWithHeuristics(mockQuestion, strongAnswer);
  assert.ok(strongEval.rubricScore !== undefined && strongEval.rubricScore >= 4);
  assert.ok(strongEval.correctness >= 75);
  assert.ok(strongEval.codeUnderstanding >= 75);
  assert.ok(strongEval.correctPoints && strongEval.correctPoints.length > 0);

  // 2. Weak/incomplete answer
  const weakAnswer = "We just hash the secret with md5 and hope for the best.";
  const weakEval = evaluateWithHeuristics(mockQuestion, weakAnswer);
  assert.ok(weakEval.rubricScore !== undefined && weakEval.rubricScore <= 2);
  assert.ok(weakEval.correctness < 60);
  assert.ok(weakEval.missingConcepts && weakEval.missingConcepts.length > 0);
});

test("Question Generator - Generates 5 grounded questions from repo snapshot", () => {
  const mockSnapshot = {
    owner: "test-org",
    name: "test-app",
    fullName: "test-org/test-app",
    htmlUrl: "https://github.com/test-org/test-app",
    description: "Test application",
    defaultBranch: "main",
    commitSha: "sha123456789",
    languages: [{ name: "TypeScript", percentage: 100 }],
    frameworks: ["Fastify", "Zod"],
    readmeContent: "# Test App\n- All requests are strictly validated with Zod.",
    files: [
      {
        path: "src/routes/api.ts",
        extension: ".ts",
        size: 500,
        content: "export const api = true;",
        lines: ["export const api = true;"],
        lineCount: 1,
        sha: "s1",
      },
      {
        path: "src/auth/token.ts",
        extension: ".ts",
        size: 500,
        content: "export const auth = true;",
        lines: ["export const auth = true;"],
        lineCount: 1,
        sha: "s2",
      },
      {
        path: "src/worker/queue.ts",
        extension: ".ts",
        size: 500,
        content: "export const queue = true;",
        lines: ["export const queue = true;"],
        lineCount: 1,
        sha: "s3",
      },
      {
        path: "src/db/schema.sql",
        extension: ".sql",
        size: 500,
        content: "CREATE TABLE users ();",
        lines: ["CREATE TABLE users ();"],
        lineCount: 1,
        sha: "s4",
      },
    ],
    totalFileCount: 5,
    inspectedFileCount: 4,
    totalLinesOfCode: 4,
    treeTruncated: false,
    ingestedAt: new Date().toISOString(),
  };

  const claims = [
    {
      id: "c-1",
      claim: "All requests are strictly validated with Zod.",
      sourceSection: "README.md",
      status: "SUPPORTED",
      explanation: "Verified",
      evidenceReferences: [
        {
          id: "ev-1",
          filePath: "src/routes/api.ts",
          startLine: 1,
          endLine: 1,
          contentReference: "blob:sha123:src/routes/api.ts",
          language: "typescript",
          excerpt: "export const api = true;",
        },
      ],
    },
  ];

  const analysis = {
    isPreview: false,
    projectSummary: {
      headline: "Test",
      overview: "Test",
      primaryUseCase: "Test",
      complexityLevel: "Intermediate",
      observations: ["Obs"],
    },
    technologies: [],
    architecture: {
      pattern: "Layered",
      summary: "Test",
      dataFlow: ["Step 1"],
      layers: [],
    },
    importantFiles: [],
    stages: [],
  };

  const questions = generateGroundedStaticQuestions(mockSnapshot, analysis, claims);
  assert.ok(questions.length >= 4, `Expected at least 4 questions, got ${questions.length}`);
  for (const q of questions) {
    assert.ok(q.text.length >= 10);
    assert.ok(q.expectedConcepts.length >= 2);
    assert.ok(q.evidenceReferences.length >= 1);
    assert.ok(q.evidenceReferences[0]?.filePath);
  }
});
