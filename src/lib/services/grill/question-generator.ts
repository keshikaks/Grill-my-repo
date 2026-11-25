import { z } from "zod";
import {
  normalizeDifficulty,
  type GrillQuestion,
  type QuestionExplanation,
} from "../../contracts/grill.ts";
import type { EvidenceReference } from "../../contracts/repository.ts";
import type { ClaimVerification } from "../../contracts/claims.ts";
import type { AnalysisResult } from "../../contracts/analysis.ts";
import type { RepositorySnapshot, IngestedFile } from "../github/types.ts";
import type { AiProvider } from "../ai/types.ts";
import { formatUntrustedFileForPrompt } from "../ai/prompt-utils.ts";

export async function generateQuestionsForRepository(
  snapshot: RepositorySnapshot,
  analysis: AnalysisResult,
  claims: ClaimVerification[],
  aiProvider?: AiProvider
): Promise<GrillQuestion[]> {
  if (aiProvider && aiProvider.isConfigured) {
    try {
      const questions = await generateQuestionsWithAi(snapshot, analysis, claims, aiProvider);
      if (questions.length >= 5) {
        return questions;
      }
    } catch {
      // Fallback to grounded static generation if AI fails or times out
    }
  }

  return generateGroundedStaticQuestions(snapshot, analysis, claims);
}

const AiQuestionListSchema = z.object({
  questions: z
    .array(
      z.object({
        order: z.number().int().positive(),
        text: z.string().min(10),
        followUpContext: z.string().optional(),
        category: z.enum([
          "Architecture",
          "Concurrency",
          "Security",
          "Claims & Trade-offs",
          "Data Modeling",
          "Reliability",
        ]),
        difficulty: z.enum([
          "EASY",
          "MEDIUM",
          "HARD",
          "FOUNDATIONAL",
          "INTERMEDIATE",
          "DEEP_DIVE",
        ]),
        filePath: z.string(),
        startLine: z.number().int().positive(),
        endLine: z.number().int().positive(),
        expectedConcepts: z.array(z.string().min(1)).min(2),
        explanation: z
          .object({
            whatItIsAsking: z.string().min(1),
            whyInterviewerAsks: z.string().min(1),
            conceptsToThinkAbout: z.array(z.string().min(1)).min(1),
          })
          .optional(),
      })
    )
    .min(4)
    .max(12),
});

async function generateQuestionsWithAi(
  snapshot: RepositorySnapshot,
  analysis: AnalysisResult,
  claims: ClaimVerification[],
  aiProvider: AiProvider
): Promise<GrillQuestion[]> {
  const topFiles = snapshot.files
    .filter((f) => !f.path.toLowerCase().endsWith("readme.md"))
    .slice(0, 8);

  const formattedFiles = topFiles
    .map((f) => formatUntrustedFileForPrompt(f.path, f.content, 120))
    .join("\n\n");

  const formattedClaims = claims
    .slice(0, 5)
    .map((c) => `- Claim: "${c.claim}" | Status: ${c.status}`)
    .join("\n");

  // Detect whether repository actually has a database
  const hasDatabase = detectHasDatabase(snapshot, analysis);

  const prompt = `
Generate 6 to 9 project viva questions for repository "${snapshot.fullName}" across three distinct difficulty levels:
Target audience: College students, fresh graduates, and junior engineers preparing to defend their project in technical interviews.

DIFFICULTY LEVEL SPECIFICATIONS:
1. EASY — Know what you built (2-3 questions):
   - Check if the student understands the basic purpose, technologies, and features of their project.
   - Example questions: "What does your project do and what problem does it solve?", "Which technologies did you use and why did you choose them?"${
     hasDatabase
       ? ', "What is the purpose of your database and what does it store?"'
       : ""
   }.
   - CRITICAL: Never ask about a database if the project does not use one (${hasDatabase ? "Project uses database" : "NO database detected - DO NOT ask about database"}).
   - Use simple, direct language. Avoid convoluted jargon.

2. MEDIUM — Understand how it works (2-3 questions):
   - Check if the student understands how different parts of their application work together.
   - Example questions: "How does your frontend communicate with your backend?", "How does your application retrieve or process information?", "What happens when an API request fails?"
   - Ground questions in actual files and real implementation logic.

3. HARD — Defend your decisions (2-3 questions):
   - Test deeper technical understanding, decision-making, trade-offs, and limitations.
   - Example questions: "What would happen if 1,000 users accessed your application simultaneously?", "What are the limitations of your current approach?", "How would you improve the performance or debug a production issue?"
   - Must relate to the actual technologies and architecture used by this repository.

RULES:
- Never ask about technologies that the project does not use.
- Never invent files or implementation details.
- Each question must cite a real file from the inspected files below.
- Provide "explanation" with:
  * whatItIsAsking: Plain English explanation of what the question asks.
  * whyInterviewerAsks: Why an interviewer or examiner asks this question.
  * conceptsToThinkAbout: 2-3 key concepts or hints the student should consider (WITHOUT giving away the full answer).

Repository Summary:
${analysis.projectSummary.overview}

Architecture Pattern:
${analysis.architecture.pattern}

Technologies Detected:
${analysis.technologies.map((t) => `${t.name} (${t.category})`).join(", ")}

Documented Claims vs Reality:
${formattedClaims}

Inspected Repository Files:
${formattedFiles}

Return JSON in the format:
{
  "questions": [
    {
      "order": 1,
      "text": "...",
      "followUpContext": "What the interviewer is testing: ...",
      "category": "Architecture",
      "difficulty": "EASY",
      "filePath": "...",
      "startLine": 1,
      "endLine": 20,
      "expectedConcepts": ["concept 1", "concept 2", "concept 3"],
      "explanation": {
        "whatItIsAsking": "...",
        "whyInterviewerAsks": "...",
        "conceptsToThinkAbout": ["concept 1", "concept 2"]
      }
    }
  ]
}
`.trim();

  const systemPrompt =
    "You are a supportive senior engineering mentor and technical viva examiner preparing students for real project interviews. Ask realistic, clear, grounded interview questions based directly on their actual repository code. Never invent files or ask about technologies the repository does not use.";

  const result = await aiProvider.generateStructured(prompt, AiQuestionListSchema, systemPrompt, {
    temperature: 0.3,
    maxTokens: 5000,
  });

  const fileMap = new Map<string, IngestedFile>();
  for (const f of snapshot.files) {
    fileMap.set(f.path, f);
  }

  return result.data.questions.map((q, idx) => {
    const file = fileMap.get(q.filePath) || topFiles[0];
    const safeFile = file || {
      path: q.filePath,
      lines: ["// Code reference"],
      lineCount: 1,
      extension: ".ts",
    };

    const maxLine = Math.max(1, safeFile.lineCount);
    const startLine = Math.min(Math.max(1, q.startLine), maxLine);
    const endLine = Math.min(Math.max(startLine, q.endLine), maxLine);

    const excerpt =
      safeFile.lines.slice(startLine - 1, endLine).join("\n") ||
      safeFile.lines[0] ||
      "// source snippet";

    const evidenceReference: EvidenceReference = {
      id: `gq-ev-${idx + 1}`,
      filePath: safeFile.path,
      startLine,
      endLine,
      contentReference: `blob:${snapshot.commitSha.slice(0, 7)}:${safeFile.path}`,
      language: safeFile.extension.replace(/^\./, "") || "typescript",
      excerpt,
      note: `Cited in Question ${idx + 1}`,
    };

    const normalizedDiff = normalizeDifficulty(q.difficulty);

    const explanation: QuestionExplanation = q.explanation || {
      whatItIsAsking: `This question asks you to explain the behaviour and purpose of ${safeFile.path.split("/").pop()}.`,
      whyInterviewerAsks:
        q.followUpContext ||
        "The interviewer wants to check whether you understand your own code rather than memorising answers.",
      conceptsToThinkAbout: q.expectedConcepts.slice(0, 3),
    };

    return {
      id: `q-${idx + 1}`,
      order: idx + 1,
      text: q.text,
      followUpContext: q.followUpContext,
      category: q.category,
      difficulty: normalizedDiff,
      evidenceReferences: [evidenceReference],
      expectedConcepts: q.expectedConcepts,
      explanation,
    };
  });
}

function detectHasDatabase(
  snapshot: RepositorySnapshot,
  analysis: AnalysisResult
): boolean {
  // Check technologies detected
  const hasDbTech = analysis.technologies.some(
    (t) =>
      t.category.toLowerCase().includes("database") ||
      t.category.toLowerCase().includes("persistence") ||
      ["prisma", "mongodb", "postgres", "mysql", "sqlite", "redis", "typeorm", "mongoose", "supabase"].includes(
        t.name.toLowerCase()
      )
  );
  if (hasDbTech) return true;

  // Check files for database definitions
  const dbFilePatterns = [
    "schema.prisma",
    "prisma/",
    "migration",
    "models/",
    "database",
    "db.ts",
    "db.js",
    "sqlite",
    "postgres",
    "mysql",
  ];
  return snapshot.files.some((f) =>
    dbFilePatterns.some((p) => f.path.toLowerCase().includes(p))
  );
}

function detectHasFrontend(snapshot: RepositorySnapshot): boolean {
  const feExtensions = [".tsx", ".jsx", ".vue", ".svelte", ".html"];
  const fePaths = ["components/", "pages/", "app/", "views/", "frontend/", "client/"];
  return snapshot.files.some(
    (f) =>
      feExtensions.some((ext) => f.path.toLowerCase().endsWith(ext)) ||
      fePaths.some((p) => f.path.toLowerCase().includes(p))
  );
}

function detectHasBackend(snapshot: RepositorySnapshot): boolean {
  const bePaths = ["api/", "routes/", "controllers/", "server/", "backend/", "services/"];
  return snapshot.files.some((f) => bePaths.some((p) => f.path.toLowerCase().includes(p)));
}

export function generateGroundedStaticQuestions(
  snapshot: RepositorySnapshot,
  analysis: AnalysisResult,
  claims: ClaimVerification[]
): GrillQuestion[] {
  const questions: GrillQuestion[] = [];
  const files = snapshot.files.filter((f) => !f.path.toLowerCase().endsWith("readme.md"));

  const hasDatabase = detectHasDatabase(snapshot, analysis);
  const hasFrontend = detectHasFrontend(snapshot);
  const hasBackend = detectHasBackend(snapshot);

  const topTechnologies = analysis.technologies.map((t) => t.name).slice(0, 4);
  const techNames = topTechnologies.length > 0 ? topTechnologies.join(", ") : "your chosen stack";

  // Identify key files
  const entryFile =
    files.find(
      (f) =>
        f.path.includes("page.tsx") ||
        f.path.includes("App.") ||
        f.path.includes("index.") ||
        f.path.includes("main.") ||
        f.path.includes("server.")
    ) || files[0] || {
      path: "src/index.ts",
      lines: ["// Application entry point"],
      lineCount: 1,
      extension: ".ts",
    };

  const routeOrApiFile =
    files.find(
      (f) =>
        f.path.includes("route") ||
        f.path.includes("api/") ||
        f.path.includes("controller") ||
        f.path.includes("service")
    ) || files[1] || entryFile;

  const dbOrModelFile = hasDatabase
    ? files.find(
        (f) =>
          f.path.includes("schema.prisma") ||
          f.path.includes("model") ||
          f.path.includes("db") ||
          f.path.includes("migration")
      ) || files[0]
    : null;

  const componentOrFeatureFile =
    files.find(
      (f) =>
        (f.path.includes("component") || f.path.includes("lib/") || f.path.includes("src/")) &&
        f.path !== entryFile.path &&
        f.path !== routeOrApiFile.path
    ) || files[2] || files[0] || entryFile;

  function makeEvidence(
    f:
      | { path: string; lineCount?: number; lines?: string[]; extension?: string }
      | undefined,
    id: string,
    note: string
  ): EvidenceReference {
    const safePath = f?.path || "src/index.ts";
    const lineCount = f?.lineCount || 1;
    const lines = f?.lines || ["// Code reference"];
    const ext = f?.extension || ".ts";
    const startLine = 1;
    const endLine = Math.min(25, lineCount);
    return {
      id,
      filePath: safePath,
      startLine,
      endLine,
      contentReference: `blob:${snapshot.commitSha.slice(0, 7)}:${safePath}`,
      language: ext.replace(/^\./, "") || "typescript",
      excerpt: lines.slice(startLine - 1, endLine).join("\n") || lines[0] || "// code snippet",
      note,
    };
  }

  // =========================================================================
  // EASY LEVEL (Know what you built)
  // Purpose: Basic purpose, technologies, and features of their project.
  // =========================================================================

  // Easy Q1: Project Purpose & Problem Solved
  questions.push({
    id: "q-1",
    order: 1,
    category: "Architecture",
    difficulty: "EASY",
    text: `What does this project do, and what specific problem does it solve for its users?`,
    followUpContext:
      "Explain the main goal of your application in simple words without technical buzzwords.",
    evidenceReferences: [makeEvidence(entryFile, "ev-easy-1", "Application entry point")],
    expectedConcepts: [
      `Articulate the core problem solved: ${analysis.projectSummary.overview}`,
      "Explain who the target audience or user of this project is.",
      "Summarise the primary user workflow from start to finish.",
    ],
    explanation: {
      whatItIsAsking:
        "The interviewer wants to hear you describe what your project is, who uses it, and why you built it.",
      whyInterviewerAsks:
        "In every interview or viva, examiners start here to see if you can explain your work clearly to a non-technical stakeholder.",
      conceptsToThinkAbout: [
        "What does a user do when they open the app?",
        "What problem was hard before this project existed?",
        "What is the single most important feature?",
      ],
    },
  });

  // Easy Q2: Technology Stack & Selection
  questions.push({
    id: "q-2",
    order: 2,
    category: "Architecture",
    difficulty: "EASY",
    text: `Which technologies did you choose for this project (${techNames}), and why did you pick them?`,
    followUpContext:
      "Mention 2 or 3 of the main libraries or frameworks you used and why they suited this project.",
    evidenceReferences: [
      makeEvidence(
        files.find((f) => f.path.includes("package.json") || f.path.includes("requirements")) || entryFile,
        "ev-easy-2",
        "Project dependency definitions"
      ),
    ],
    expectedConcepts: [
      `Identify the primary technologies: ${techNames}.`,
      "Give a practical reason for choosing this stack (e.g. speed, type safety, component reuse).",
      "Explain how the stack supported the requirements of your application.",
    ],
    explanation: {
      whatItIsAsking:
        "The interviewer wants to know if you made conscious technology choices or just followed a tutorial blindly.",
      whyInterviewerAsks:
        "Examiners want to see that you can justify your tools based on real developer benefits.",
      conceptsToThinkAbout: [
        "Why did you use this framework instead of plain HTML/JS or another framework?",
        "What made building this project faster or safer?",
        "Are there features in these tools that your project directly relies on?",
      ],
    },
  });

  // Easy Q3: Database purpose (ONLY if project uses database) OR Core Feature Workflow
  if (hasDatabase && dbOrModelFile) {
    questions.push({
      id: "q-3",
      order: 3,
      category: "Data Modeling",
      difficulty: "EASY",
      text: `Looking at \`${dbOrModelFile.path}\`, what is the purpose of your database, and what kind of information does it store?`,
      followUpContext:
        "Describe the main records or entities stored in your database in plain English.",
      evidenceReferences: [makeEvidence(dbOrModelFile, "ev-easy-3", "Database schema definition")],
      expectedConcepts: [
        "Explain what data entities or tables are saved in the database.",
        "Clarify why persistent storage was needed instead of temporary memory.",
        "Describe how data is created or updated by user actions.",
      ],
      explanation: {
        whatItIsAsking:
          "The interviewer is asking what information is saved permanently in your application.",
        whyInterviewerAsks:
          "Database questions are common in college vivas. Examiners check if you understand your data models.",
        conceptsToThinkAbout: [
          "What tables, collections, or records exist?",
          "What happens if the server restarts — what data is preserved?",
          "How does user activity generate database rows?",
        ],
      },
    });
  } else {
    questions.push({
      id: "q-3",
      order: 3,
      category: "Architecture",
      difficulty: "EASY",
      text: `In \`${componentOrFeatureFile.path}\`, how does a user interact with this feature, and what is its main responsibility?`,
      followUpContext:
        "Walk through the primary action a user takes when using this part of your project.",
      evidenceReferences: [
        makeEvidence(componentOrFeatureFile, "ev-easy-3", "Core feature implementation"),
      ],
      expectedConcepts: [
        "Explain what this component or module is responsible for.",
        "Describe how user input or triggers are handled.",
        "Clarify where the output is displayed or delivered.",
      ],
      explanation: {
        whatItIsAsking:
          "The interviewer is asking you to walk through a core feature of your code step-by-step.",
        whyInterviewerAsks:
          "Examiners want to confirm you wrote or understand the specific features in your repository.",
        conceptsToThinkAbout: [
          "What user event starts this feature?",
          "What code executes in response?",
          "What does the user see when it finishes?",
        ],
      },
    });
  }

  // =========================================================================
  // MEDIUM LEVEL (Understand how it works)
  // Purpose: Data flow, API communication, application logic, component interactions.
  // =========================================================================

  // Medium Q1: Communication & Data Flow
  if (hasFrontend && hasBackend) {
    questions.push({
      id: "q-4",
      order: 4,
      category: "Architecture",
      difficulty: "MEDIUM",
      text: `In \`${routeOrApiFile.path}\`, how does your frontend send requests to your backend, and how is the response returned to the user?`,
      followUpContext:
        "Explain the request-response lifecycle between the client and server.",
      evidenceReferences: [makeEvidence(routeOrApiFile, "ev-med-1", "API boundary route")],
      expectedConcepts: [
        "Describe the HTTP method (GET, POST, etc.) and payload sent by the frontend.",
        "Explain how the backend receives and validates the incoming request.",
        "Clarify how the client receives and renders the returned response.",
      ],
      explanation: {
        whatItIsAsking:
          "The interviewer wants you to trace a complete request from the browser/client to the backend server and back.",
        whyInterviewerAsks:
          "Client-server communication is a fundamental interview topic. They want to see that you understand data flow.",
        conceptsToThinkAbout: [
          "What endpoint does the client call?",
          "What format is the data sent in (JSON, query params)?",
          "What status code is returned on success?",
        ],
      },
    });
  } else {
    questions.push({
      id: "q-4",
      order: 4,
      category: "Architecture",
      difficulty: "MEDIUM",
      text: `In \`${routeOrApiFile.path}\`, how does data flow through your application logic when an important action is triggered?`,
      followUpContext:
        "Trace what functions are called and how state is updated from start to finish.",
      evidenceReferences: [makeEvidence(routeOrApiFile, "ev-med-1", "Core execution logic")],
      expectedConcepts: [
        "Identify the entry function or handler that receives the trigger.",
        "Explain how internal state or data structures are updated.",
        "Describe the output or side effects generated by this operation.",
      ],
      explanation: {
        whatItIsAsking:
          "The interviewer wants you to explain the step-by-step execution path inside your code.",
        whyInterviewerAsks:
          "They want to ensure you know how functions call each other and where data travels inside your app.",
        conceptsToThinkAbout: [
          "What is the first function called?",
          "What data does it receive as arguments?",
          "Where is the result stored or returned?",
        ],
      },
    });
  }

  // Medium Q2: Error Handling & Edge Cases
  questions.push({
    id: "q-5",
    order: 5,
    category: "Reliability",
    difficulty: "MEDIUM",
    text: `Looking at \`${routeOrApiFile.path}\`, what happens when an unexpected error or bad input occurs? How does your application prevent crashing?`,
    followUpContext:
      "Explain your error handling approach: try/catch blocks, error boundaries, or status codes.",
    evidenceReferences: [makeEvidence(routeOrApiFile, "ev-med-2", "Error handling implementation")],
    expectedConcepts: [
      "Explain how errors or rejected promises are caught.",
      "Describe the feedback or error message provided to the caller.",
      "Identify whether the application state remains safe after the error.",
    ],
    explanation: {
      whatItIsAsking:
        "The interviewer wants to know what happens when things go wrong instead of the happy path.",
      whyInterviewerAsks:
        "Real systems fail frequently. Interviewers look for developers who think about error handling.",
      conceptsToThinkAbout: [
        "Do you have a try/catch block or error handler?",
        "Does the user get a friendly error message or does the screen freeze?",
        "Does the server crash if bad data is sent?",
      ],
    },
  });

  // =========================================================================
  // HARD LEVEL (Defend your decisions)
  // Purpose: Scalability, limitations, performance, production debugging, trade-offs.
  // =========================================================================

  // Hard Q1: Scalability & Concurrent Load
  questions.push({
    id: "q-6",
    order: 6,
    category: "Concurrency",
    difficulty: "HARD",
    text: `What would happen if 1,000 users accessed your application at the exact same second? What would be your primary bottleneck?`,
    followUpContext:
      "Analyze connection limits, memory usage, API rate limits, or database locks under high load.",
    evidenceReferences: [makeEvidence(entryFile, "ev-hard-1", "System architecture boundary")],
    expectedConcepts: [
      "Identify the primary resource bottleneck (e.g. database connections, memory, CPU, or network).",
      "Discuss how concurrent requests affect response times.",
      "Propose a practical architectural improvement (e.g. caching, rate limiting, connection pooling).",
    ],
    explanation: {
      whatItIsAsking:
        "The interviewer is asking you to stress-test your system theoretically under sudden heavy traffic.",
      whyInterviewerAsks:
        "Senior examiners test how well you understand the physical and software limits of your architecture.",
      conceptsToThinkAbout: [
        "What resource will run out first — memory, database connections, or API quota?",
        "Will requests wait in a queue or fail immediately with 500/504 errors?",
        "How would a cache (like Redis) or a CDN help?",
      ],
    },
  });

  // Hard Q2: Limitations & Architectural Trade-offs
  const firstClaim = claims[0];
  const claimText = firstClaim ? `Regarding "${firstClaim.claim}"` : "Regarding your current architecture";

  questions.push({
    id: "q-7",
    order: 7,
    category: "Claims & Trade-offs",
    difficulty: "HARD",
    text: `${claimText}, what are the biggest technical limitations of your current approach, and how would you redesign it for production?`,
    followUpContext:
      "Be honest about shortcuts taken during development and how a production system would differ.",
    evidenceReferences: [
      makeEvidence(
        firstClaim?.evidenceReferences[0]
          ? files.find((f) => f.path === firstClaim.evidenceReferences[0]?.filePath) || componentOrFeatureFile
          : componentOrFeatureFile,
        "ev-hard-2",
        "Architectural trade-off reference"
      ),
    ],
    expectedConcepts: [
      "Acknowledge real technical trade-offs made in the implementation.",
      "Identify specific edge cases or scale limits not currently handled.",
      "Articulate what changes would be required for high availability and monitoring in production.",
    ],
    explanation: {
      whatItIsAsking:
        "The interviewer wants you to critique your own code honestly and explain what you would do better with more time.",
      whyInterviewerAsks:
        "Mature engineers know that all code has trade-offs. Pretending a student project is 100% flawless is a red flag.",
      conceptsToThinkAbout: [
        "What shortcuts did you take to finish the project?",
        "What security or performance features are missing?",
        "How would you monitor and debug failures that happen only in production?",
      ],
    },
  });

  return questions;
}
