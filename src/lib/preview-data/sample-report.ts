import {
  FinalReportSchema,
  type FinalReport,
} from "@/lib/contracts/report";
import { SAMPLE_GRILL_QUESTIONS } from "./sample-grill";

const [q1, q2, q3, q4, q5, q6] = SAMPLE_GRILL_QUESTIONS;

if (!q1 || !q2 || !q3 || !q4 || !q5 || !q6) {
  throw new Error("Sample grill questions must contain 6 entries.");
}

export const SAMPLE_REPORT: FinalReport = FinalReportSchema.parse({
  isPreview: true,
  generatedAt: "2026-10-14T11:12:00.000Z",
  overallScore: 82,
  categoryScores: {
    correctness: 84,
    codeUnderstanding: 88,
    clarity: 80,
    reasoning: 76,
  },
  difficultyBreakdown: {
    easy: {
      total: 2,
      answered: 2,
      averageScore: 88,
    },
    medium: {
      total: 2,
      answered: 2,
      averageScore: 82,
    },
    hard: {
      total: 2,
      answered: 2,
      averageScore: 76,
    },
  },
  strengths: [
    {
      id: "str-1",
      title: "Strong project purpose & architecture explanation",
      detail:
        "Clearly articulated the problem pulsequeue solves and justified using Redis for transient queueing alongside PostgreSQL for permanent job records.",
      evidenceFile: "src/api/routes/jobs.ts",
    },
    {
      id: "str-2",
      title: "Accurate understanding of webhook signature verification",
      detail:
        "Demonstrated clear understanding of timestamp extraction, replay tolerance windows, and constant-time cryptographic digest comparisons.",
      evidenceFile: "src/security/hmac.ts",
    },
    {
      id: "str-3",
      title: "Recognized concurrency bottlenecks under high load",
      detail:
        "Correctly diagnosed head-of-line blocking in concurrent promise batches and identified unique index constraints against duplicate submissions.",
      evidenceFile: "src/worker/consumer.ts",
    },
  ],
  weaknesses: [
    {
      id: "wk-1",
      title: "Crash recovery window in dual writes",
      detail:
        "Overstated delivery guarantees without addressing the post-HTTP 200 crash window before Redis queueing completes.",
      evidenceFile: "src/api/routes/jobs.ts",
    },
    {
      id: "wk-2",
      title: "Incomplete remediation for batch worker throughput",
      detail:
        "Identified that slow webhooks stall `Promise.all`, but did not specify per-destination concurrency limits or circuit breakers.",
      evidenceFile: "src/worker/consumer.ts",
    },
  ],
  revisionTopics: [
    {
      id: "rev-1",
      topic: "Transactional Outbox vs Dual Writes",
      priority: "HIGH",
      reason:
        "Resolves the consistency gap between PostgreSQL job creation and Redis Streams publishing under server crash conditions.",
      relatedFiles: ["src/api/routes/jobs.ts", "src/worker/consumer.ts"],
      studyPrompt:
        "Practice explaining in 60 seconds how a background sweeper or transactional outbox ensures at-least-once job delivery.",
    },
    {
      id: "rev-2",
      topic: "Per-Host Concurrency Limits & Circuit Breakers",
      priority: "HIGH",
      reason:
        "Prevents a single degraded external webhook receiver from starving unrelated jobs in worker batches.",
      relatedFiles: ["src/worker/consumer.ts"],
      studyPrompt:
        "Sketch how a worker pool with bounded concurrency behaves when one target endpoint hangs for 8 seconds.",
    },
    {
      id: "rev-3",
      topic: "Database Unique Violations & Idempotency",
      priority: "MEDIUM",
      reason:
        "Understand error 23505 handling when concurrent requests race with identical idempotency keys.",
      relatedFiles: ["src/db/migrations/001_init.sql"],
      studyPrompt:
        "Review how PostgreSQL handles unique index conflicts and how your API can return the existing job gracefully.",
    },
  ],
  questionResults: [
    {
      question: q1,
      answer: {
        questionId: q1.id,
        answerText:
          "pulsequeue is a reliable background task queue for webhook delivery. It allows web applications to offload slow HTTP requests to background workers instead of making users wait for external servers to respond.",
        submittedAt: "2026-10-14T10:35:00.000Z",
      },
      evaluation: {
        correctness: 90,
        codeUnderstanding: 92,
        clarity: 88,
        reasoning: 82,
        feedback:
          "Excellent high-level summary of the application's core purpose and user benefit.",
        suggestedImprovements: [
          "Mention how status codes like 202 Accepted indicate that a job was queued.",
        ],
      },
      evidenceReferences: q1.evidenceReferences,
    },
    {
      question: q2,
      answer: {
        questionId: q2.id,
        answerText:
          "We picked Fastify for low-overhead HTTP ingestion, Redis for in-memory queueing speed, PostgreSQL for persistent audit history, and TypeScript with Zod to enforce strict schema validation at compile and runtime.",
        submittedAt: "2026-10-14T10:42:00.000Z",
      },
      evaluation: {
        correctness: 88,
        codeUnderstanding: 86,
        clarity: 84,
        reasoning: 80,
        feedback:
          "Clear justification for each component in the technology stack.",
        suggestedImprovements: [
          "Briefly mention how Redis Streams compare to simpler Redis lists.",
        ],
      },
      evidenceReferences: q2.evidenceReferences,
    },
    {
      question: q3,
      answer: {
        questionId: q3.id,
        answerText:
          "If the server dies right after inserting the job into PostgreSQL but before calling Redis enqueue, the job remains in QUEUED status. A background sweeper process periodically queries for stale QUEUED rows and re-enqueues them, preventing lost tasks.",
        submittedAt: "2026-10-14T10:49:00.000Z",
      },
      evaluation: {
        correctness: 82,
        codeUnderstanding: 85,
        clarity: 80,
        reasoning: 78,
        feedback:
          "Strong explanation of the dual-write recovery window and how the sweeper reconciles stale rows.",
        suggestedImprovements: [
          "Mention how the sweeper avoids racing with active workers using locks or timestamps.",
        ],
      },
      evidenceReferences: q3.evidenceReferences,
    },
    {
      question: q4,
      answer: {
        questionId: q4.id,
        answerText:
          "A valid signature alone can be captured and replayed by an attacker. By including a timestamp in the signed payload and verifying that it falls within a 5-minute tolerance window, we reject old captured packets.",
        submittedAt: "2026-10-14T10:56:00.000Z",
      },
      evaluation: {
        correctness: 85,
        codeUnderstanding: 88,
        clarity: 82,
        reasoning: 75,
        feedback:
          "Accurate explanation of replay attack vectors and tolerance window checks.",
        suggestedImprovements: [
          "Mention using timingSafeEqual to prevent side-channel timing leaks.",
        ],
      },
      evidenceReferences: q4.evidenceReferences,
    },
    {
      question: q5,
      answer: {
        questionId: q5.id,
        answerText:
          "Because Promise.all waits for the slowest operation in a batch, an 8-second webhook blocks the entire worker batch from finishing. Under 1,000 concurrent jobs, worker throughput drops drastically due to head-of-line blocking.",
        submittedAt: "2026-10-14T11:02:00.000Z",
      },
      evaluation: {
        correctness: 78,
        codeUnderstanding: 80,
        clarity: 75,
        reasoning: 72,
        feedback:
          "Correctly diagnosed head-of-line blocking in promise batches.",
        suggestedImprovements: [
          "Propose continuous slot-based queue polling instead of rigid batches.",
        ],
      },
      evidenceReferences: q5.evidenceReferences,
    },
    {
      question: q6,
      answer: {
        questionId: q6.id,
        answerText:
          "PostgreSQL enforces a unique index on idempotency_key. The first request succeeds while the concurrent duplicate hits a unique constraint error (23505). Our code catches this error and returns the existing job record.",
        submittedAt: "2026-10-14T11:09:00.000Z",
      },
      evaluation: {
        correctness: 82,
        codeUnderstanding: 86,
        clarity: 76,
        reasoning: 74,
        feedback:
          "Good understanding of database constraint enforcement against race conditions.",
        suggestedImprovements: [
          "Discuss how payload hashing ensures the duplicate request didn't send contradictory parameters.",
        ],
      },
      evidenceReferences: q6.evidenceReferences,
    },
  ],
});
