import test from "node:test";
import assert from "node:assert";
import {
  normalizeDifficulty,
  DIFFICULTY_META,
  GrillQuestionSchema,
} from "../src/lib/contracts/grill.ts";
import { FinalReportSchema } from "../src/lib/contracts/report.ts";
import { generateGroundedStaticQuestions } from "../src/lib/services/grill/question-generator.ts";
import { evaluateWithHeuristics } from "../src/lib/services/grill/answer-evaluator.ts";
import { generateReportFromAnswers } from "../src/lib/services/session/session-store.ts";

test("Difficulty System - Normalization and Metadata", () => {
  assert.strictEqual(normalizeDifficulty("EASY"), "EASY");
  assert.strictEqual(normalizeDifficulty("MEDIUM"), "MEDIUM");
  assert.strictEqual(normalizeDifficulty("HARD"), "HARD");

  // Backward compatibility with legacy tiers
  assert.strictEqual(normalizeDifficulty("FOUNDATIONAL"), "EASY");
  assert.strictEqual(normalizeDifficulty("INTERMEDIATE"), "MEDIUM");
  assert.strictEqual(normalizeDifficulty("DEEP_DIVE"), "HARD");

  // Metadata verification
  assert.strictEqual(DIFFICULTY_META.EASY.level, 1);
  assert.strictEqual(DIFFICULTY_META.EASY.sublabel, "Know what you built");
  assert.strictEqual(DIFFICULTY_META.MEDIUM.level, 2);
  assert.strictEqual(DIFFICULTY_META.MEDIUM.sublabel, "Understand how it works");
  assert.strictEqual(DIFFICULTY_META.HARD.level, 3);
  assert.strictEqual(DIFFICULTY_META.HARD.sublabel, "Defend your decisions");
});

test("Question Generator - Generates Easy, Medium, and Hard repository-aware questions", () => {
  const snapshotWithDb = {
    owner: "student-dev",
    name: "task-tracker",
    fullName: "student-dev/task-tracker",
    htmlUrl: "https://github.com/student-dev/task-tracker",
    description: "Fullstack task manager with PostgreSQL",
    defaultBranch: "main",
    commitSha: "sha111222333",
    languages: [{ name: "TypeScript", percentage: 100 }],
    frameworks: ["Next.js", "Prisma"],
    readmeContent: "# Task Tracker\nA full-stack task manager.",
    files: [
      {
        path: "src/app/page.tsx",
        extension: ".tsx",
        size: 400,
        content: "export default function Home() { return <div>Tasks</div>; }",
        lines: ["export default function Home() { return <div>Tasks</div>; }"],
        lineCount: 1,
        sha: "s1",
      },
      {
        path: "src/app/api/tasks/route.ts",
        extension: ".ts",
        size: 600,
        content: "export async function POST() { return Response.json({ ok: true }); }",
        lines: ["export async function POST() { return Response.json({ ok: true }); }"],
        lineCount: 1,
        sha: "s2",
      },
      {
        path: "prisma/schema.prisma",
        extension: ".prisma",
        size: 500,
        content: "model Task { id String @id }",
        lines: ["model Task { id String @id }"],
        lineCount: 1,
        sha: "s3",
      },
    ],
    totalFileCount: 3,
    inspectedFileCount: 3,
    totalLinesOfCode: 3,
    treeTruncated: false,
    ingestedAt: new Date().toISOString(),
  };

  const analysis = {
    isPreview: false,
    projectSummary: {
      headline: "Task Manager",
      overview: "Allows users to create, update, and manage tasks.",
      primaryUseCase: "Productivity",
      complexityLevel: "Moderate",
      observations: ["Clean layout"],
    },
    technologies: [
      { name: "Next.js", category: "Framework", version: "15" },
      { name: "Prisma", category: "Database ORM" },
      { name: "PostgreSQL", category: "Database" },
    ],
    architecture: {
      pattern: "Fullstack Next.js App Router",
      summary: "Client and Server API Routes",
      dataFlow: ["Client -> API Route -> Prisma -> DB"],
      layers: [],
    },
    importantFiles: [],
    stages: [],
  };

  const claims = [
    {
      id: "c-1",
      claim: "Tasks are persisted safely in PostgreSQL.",
      sourceSection: "README.md",
      status: "SUPPORTED",
      explanation: "Schema verified",
      evidenceReferences: [
        {
          id: "ev-1",
          filePath: "prisma/schema.prisma",
          startLine: 1,
          endLine: 1,
          contentReference: "blob:sha111:prisma/schema.prisma",
          language: "prisma",
          excerpt: "model Task { id String @id }",
        },
      ],
    },
  ];

  const questions = generateGroundedStaticQuestions(snapshotWithDb, analysis, claims);

  // Must generate across all 3 levels
  const easyQs = questions.filter((q) => q.difficulty === "EASY");
  const medQs = questions.filter((q) => q.difficulty === "MEDIUM");
  const hardQs = questions.filter((q) => q.difficulty === "HARD");

  assert.ok(easyQs.length >= 2, `Expected at least 2 Easy questions, got ${easyQs.length}`);
  assert.ok(medQs.length >= 2, `Expected at least 2 Medium questions, got ${medQs.length}`);
  assert.ok(hardQs.length >= 2, `Expected at least 2 Hard questions, got ${hardQs.length}`);

  // Database question check: should be present since schema.prisma exists
  const dbQuestion = easyQs.find((q) => q.category === "Data Modeling");
  assert.ok(dbQuestion !== undefined, "Expected an easy database question when a database is detected.");
  assert.ok(dbQuestion.text.toLowerCase().includes("database"));

  // Verify "Explain this question" data is present on every question
  for (const q of questions) {
    assert.ok(q.explanation !== undefined, `Question ${q.id} missing explanation object.`);
    assert.ok(q.explanation.whatItIsAsking.length > 5);
    assert.ok(q.explanation.whyInterviewerAsks.length > 5);
    assert.ok(q.explanation.conceptsToThinkAbout.length >= 1);

    // Validate with GrillQuestionSchema
    const parsed = GrillQuestionSchema.safeParse(q);
    assert.ok(parsed.success, `Schema validation failed for question: ${parsed.error}`);
  }
});

test("Question Generator - Never asks about database when project has none", () => {
  const snapshotNoDb = {
    owner: "frontend-dev",
    name: "calculator-app",
    fullName: "frontend-dev/calculator-app",
    htmlUrl: "https://github.com/frontend-dev/calculator-app",
    description: "Pure frontend calculator tool",
    defaultBranch: "main",
    commitSha: "sha444555666",
    languages: [{ name: "TypeScript", percentage: 100 }],
    frameworks: ["React"],
    readmeContent: "# Calculator App\nA simple calculator.",
    files: [
      {
        path: "src/App.tsx",
        extension: ".tsx",
        size: 300,
        content: "export function App() { return <button>+</button>; }",
        lines: ["export function App() { return <button>+</button>; }"],
        lineCount: 1,
        sha: "s1",
      },
    ],
    totalFileCount: 1,
    inspectedFileCount: 1,
    totalLinesOfCode: 1,
    treeTruncated: false,
    ingestedAt: new Date().toISOString(),
  };

  const analysisNoDb = {
    isPreview: false,
    projectSummary: {
      headline: "Calculator",
      overview: "Frontend math utility",
      primaryUseCase: "Calculation",
      complexityLevel: "Basic",
      observations: [],
    },
    technologies: [{ name: "React", category: "UI Library" }],
    architecture: {
      pattern: "Single Page Application",
      summary: "React SPA",
      dataFlow: ["UI -> State"],
      layers: [],
    },
    importantFiles: [],
    stages: [],
  };

  const questions = generateGroundedStaticQuestions(snapshotNoDb, analysisNoDb, []);

  // Ensure NO question asks about a database
  const dbQuestions = questions.filter(
    (q) => q.category === "Data Modeling" || q.text.toLowerCase().includes("database")
  );
  assert.strictEqual(
    dbQuestions.length,
    0,
    "Should never generate database questions when repository does not use a database."
  );
});

test("Report Card - Difficulty Breakdown and Unanswered Questions Policy", () => {
  const questions = [
    {
      id: "q-easy-1",
      order: 1,
      text: "What does this project do?",
      category: "Architecture",
      difficulty: "EASY",
      evidenceReferences: [
        {
          id: "ev-1",
          filePath: "src/index.ts",
          startLine: 1,
          endLine: 5,
          contentReference: "blob:1:src/index.ts",
          language: "typescript",
          excerpt: "// entry",
        },
      ],
      expectedConcepts: ["Project Purpose", "Target audience"],
    },
    {
      id: "q-med-1",
      order: 2,
      text: "How does frontend communicate with backend?",
      category: "Architecture",
      difficulty: "MEDIUM",
      evidenceReferences: [
        {
          id: "ev-2",
          filePath: "src/api.ts",
          startLine: 1,
          endLine: 5,
          contentReference: "blob:2:src/api.ts",
          language: "typescript",
          excerpt: "// api",
        },
      ],
      expectedConcepts: ["HTTP POST", "JSON formatting"],
    },
    {
      id: "q-hard-1",
      order: 3,
      text: "What happens if 1,000 users access simultaneously?",
      category: "Concurrency",
      difficulty: "HARD",
      evidenceReferences: [
        {
          id: "ev-3",
          filePath: "src/server.ts",
          startLine: 1,
          endLine: 5,
          contentReference: "blob:3:src/server.ts",
          language: "typescript",
          excerpt: "// server",
        },
      ],
      expectedConcepts: ["Connection limit", "Memory saturation"],
    },
  ];

  // User only answers the Easy question and skips Medium and Hard
  const answers = {
    "q-easy-1": {
      questionId: "q-easy-1",
      answerText: "This project manages personal expenses and budget planning for students.",
      submittedAt: new Date().toISOString(),
    },
  };

  const evaluations = {
    "q-easy-1": {
      rubricScore: 4,
      correctness: 85,
      codeUnderstanding: 85,
      clarity: 80,
      reasoning: 70,
      feedback: "Clear project overview.",
      suggestedImprovements: ["Mention recurring expenses."],
    },
  };

  const report = generateReportFromAnswers("sess_test", questions, answers, evaluations);

  // Overall score must be calculated ONLY from answered questions (80 avg, not dragged down by 0 for skipped)
  assert.ok(report.overallScore >= 75, `Expected score ~80 from answered Easy question, got ${report.overallScore}`);
  assert.strictEqual(report.questionResults.length, 1);

  // Verify difficultyBreakdown exists and accurately records answered vs total
  assert.ok(report.difficultyBreakdown !== undefined);
  assert.strictEqual(report.difficultyBreakdown.easy.total, 1);
  assert.strictEqual(report.difficultyBreakdown.easy.answered, 1);
  assert.strictEqual(report.difficultyBreakdown.easy.averageScore, 80);

  assert.strictEqual(report.difficultyBreakdown.medium.total, 1);
  assert.strictEqual(report.difficultyBreakdown.medium.answered, 0);
  assert.strictEqual(report.difficultyBreakdown.medium.averageScore, 0);

  assert.strictEqual(report.difficultyBreakdown.hard.total, 1);
  assert.strictEqual(report.difficultyBreakdown.hard.answered, 0);
  assert.strictEqual(report.difficultyBreakdown.hard.averageScore, 0);

  // Schema validation
  const validated = FinalReportSchema.safeParse(report);
  assert.ok(validated.success, "Report must conform to FinalReportSchema.");
});
