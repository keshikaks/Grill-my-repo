import test from "node:test";
import assert from "node:assert";
import { sessionStore } from "../src/lib/services/session/session-store.ts";

test("Session Store - Lifecycle and Report Generation", () => {
  const mockSnapshot = {
    owner: "demo",
    name: "service",
    fullName: "demo/service",
    htmlUrl: "https://github.com/demo/service",
    description: "Demo",
    defaultBranch: "main",
    commitSha: "sha999",
    languages: [{ name: "TypeScript", percentage: 100 }],
    frameworks: ["Fastify"],
    readmeContent: "# Demo",
    files: [],
    totalFileCount: 1,
    inspectedFileCount: 1,
    totalLinesOfCode: 100,
    treeTruncated: false,
    ingestedAt: new Date().toISOString(),
  };

  const mockMeta = {
    owner: "demo",
    name: "service",
    description: "Demo",
    defaultBranch: "main",
    commitSha: "sha999",
    languages: [{ name: "TypeScript", percentage: 100 }],
    frameworks: ["Fastify"],
  };

  const mockQuestion = {
    id: "q-1",
    order: 1,
    text: "Explain your error handling strategy.",
    category: "Architecture",
    difficulty: "INTERMEDIATE",
    evidenceReferences: [
      {
        id: "ev-1",
        filePath: "src/server.ts",
        startLine: 1,
        endLine: 10,
        contentReference: "blob:sha:src/server.ts",
        language: "typescript",
        excerpt: "app.setErrorHandler()",
      },
    ],
    expectedConcepts: ["Central error handler", "No leaking stack traces"],
  };

  // 1. Create Session
  const session = sessionStore.createSession({
    snapshot: mockSnapshot,
    metadata: mockMeta,
    analysis: {},
    claims: [],
    questions: [mockQuestion],
  });

  assert.ok(session.id.startsWith("sess_"));
  const retrieved = sessionStore.getSession(session.id);
  assert.ok(retrieved !== null);
  assert.strictEqual(retrieved?.metadata.name, "service");

  // 2. Record Answer
  const answer = {
    questionId: "q-1",
    answerText: "We use Fastify setErrorHandler to wrap errors cleanly.",
    submittedAt: new Date().toISOString(),
  };
  const evaluation = {
    rubricScore: 4,
    correctness: 80,
    codeUnderstanding: 85,
    clarity: 75,
    reasoning: 70,
    feedback: "Solid explanation.",
    suggestedImprovements: ["Discuss 500 alerting."],
  };

  const updated = sessionStore.recordAnswer(session.id, "q-1", answer, evaluation);
  assert.ok(updated !== null);
  assert.strictEqual(updated?.answers["q-1"]?.answerText, answer.answerText);
  assert.strictEqual(updated?.evaluations["q-1"]?.correctness, 80);

  // 3. Record Follow-Up
  const followUp = {
    id: "fu-1",
    questionId: "q-1",
    candidateQuery: "What about unhandled rejections?",
    response: "Use process.on('unhandledRejection') as a last resort.",
    timestamp: new Date().toISOString(),
  };
  const withFollowUp = sessionStore.recordFollowUp(session.id, "q-1", followUp);
  assert.ok(withFollowUp?.followUps["q-1"]?.length === 1);

  // 4. Generate Final Report
  const report = sessionStore.generateOrGetReport(session.id);
  assert.ok(report !== null);
  assert.strictEqual(report?.overallScore, 78);
  assert.strictEqual(report?.questionResults.length, 1);
  assert.strictEqual(report?.questionResults[0]?.evaluation.correctness, 80);
});
