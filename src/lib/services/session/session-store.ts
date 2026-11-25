import type { RepositoryMetadata } from "../../contracts/repository.ts";
import type { AnalysisResult } from "../../contracts/analysis.ts";
import type { ClaimVerification } from "../../contracts/claims.ts";
import type {
  AnswerEvaluation,
  FollowUpItem,
  GrillAnswer,
  GrillQuestion,
} from "../../contracts/grill.ts";
import { normalizeDifficulty } from "../../contracts/grill.ts";
import type {
  DifficultyBreakdown,
  FinalReport,
  QuestionResult,
  ReportInsight,
  RevisionTopic,
} from "../../contracts/report.ts";
import type { RepositorySnapshot } from "../github/types.ts";

export interface GrillingSession {
  id: string;
  createdAt: number;
  updatedAt: number;
  snapshot: RepositorySnapshot;
  metadata: RepositoryMetadata;
  analysis: AnalysisResult;
  claims: ClaimVerification[];
  questions: GrillQuestion[];
  answers: Record<string, GrillAnswer>;
  evaluations: Record<string, AnswerEvaluation>;
  followUps: Record<string, FollowUpItem[]>;
  cachedReport?: FinalReport;
}

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

class SessionStore {
  private sessions = new Map<string, GrillingSession>();

  private cleanupExpired() {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.updatedAt > SESSION_TTL_MS) {
        this.sessions.delete(id);
      }
    }
  }

  createSession(data: {
    snapshot: RepositorySnapshot;
    metadata: RepositoryMetadata;
    analysis: AnalysisResult;
    claims: ClaimVerification[];
    questions: GrillQuestion[];
  }): GrillingSession {
    this.cleanupExpired();

    const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();

    const session: GrillingSession = {
      id,
      createdAt: now,
      updatedAt: now,
      snapshot: data.snapshot,
      metadata: data.metadata,
      analysis: data.analysis,
      claims: data.claims,
      questions: data.questions,
      answers: {},
      evaluations: {},
      followUps: {},
    };

    this.sessions.set(id, session);
    return session;
  }

  createSessionWithId(
    id: string,
    data: {
      snapshot: RepositorySnapshot;
      metadata: RepositoryMetadata;
      analysis: AnalysisResult;
      claims: ClaimVerification[];
      questions: GrillQuestion[];
    }
  ): GrillingSession {
    this.cleanupExpired();
    const now = Date.now();
    const session: GrillingSession = {
      id,
      createdAt: now,
      updatedAt: now,
      snapshot: data.snapshot,
      metadata: data.metadata,
      analysis: data.analysis,
      claims: data.claims,
      questions: data.questions,
      answers: {},
      evaluations: {},
      followUps: {},
    };
    this.sessions.set(id, session);
    return session;
  }

  getSession(id: string): GrillingSession | null {
    this.cleanupExpired();
    const session = this.sessions.get(id);
    if (!session) return null;
    session.updatedAt = Date.now();
    return session;
  }

  recordAnswer(
    sessionId: string,
    questionId: string,
    answer: GrillAnswer,
    evaluation: AnswerEvaluation
  ): GrillingSession | null {
    const session = this.getSession(sessionId);
    if (!session) return null;

    session.answers[questionId] = answer;
    session.evaluations[questionId] = evaluation;
    session.updatedAt = Date.now();
    delete session.cachedReport; // Invalidate report cache

    return session;
  }

  recordFollowUp(
    sessionId: string,
    questionId: string,
    followUp: FollowUpItem
  ): GrillingSession | null {
    const session = this.getSession(sessionId);
    if (!session) return null;

    if (!session.followUps[questionId]) {
      session.followUps[questionId] = [];
    }
    session.followUps[questionId]!.push(followUp);
    session.updatedAt = Date.now();

    return session;
  }

  generateOrGetReport(sessionId: string): FinalReport | null {
    const session = this.getSession(sessionId);
    if (!session) return null;

    if (session.cachedReport) {
      return session.cachedReport;
    }

    const report = generateReportFromAnswers(
      sessionId,
      session.questions,
      session.answers,
      session.evaluations
    );

    session.cachedReport = report;
    return report;
  }
}

export function generateReportFromAnswers(
  sessionId: string,
  questions: GrillQuestion[],
  answers: Record<string, GrillAnswer>,
  evaluations: Record<string, AnswerEvaluation>
): FinalReport {
  const questionResults: QuestionResult[] = [];
  let totalCorrectness = 0;
  let totalCodeUnderstanding = 0;
  let totalClarity = 0;
  let totalReasoning = 0;

  for (const q of questions) {
    const ans = answers[q.id];
    const ev = evaluations[q.id];

    if (ans && ev) {
      questionResults.push({
        question: q,
        answer: ans,
        evaluation: ev,
        evidenceReferences: q.evidenceReferences,
      });

      totalCorrectness += ev.correctness;
      totalCodeUnderstanding += ev.codeUnderstanding;
      totalClarity += ev.clarity;
      totalReasoning += ev.reasoning;
    }
  }

  // Compute difficulty-level stats (Easy, Medium, Hard)
  const diffStats = {
    EASY: { total: 0, answered: 0, scoreSum: 0 },
    MEDIUM: { total: 0, answered: 0, scoreSum: 0 },
    HARD: { total: 0, answered: 0, scoreSum: 0 },
  };

  for (const q of questions) {
    const normDiff = normalizeDifficulty(q.difficulty);
    diffStats[normDiff].total++;
    const ev = evaluations[q.id];
    if (answers[q.id] && ev) {
      diffStats[normDiff].answered++;
      const avgQScore = Math.round(
        (ev.correctness + ev.codeUnderstanding + ev.clarity + ev.reasoning) / 4
      );
      diffStats[normDiff].scoreSum += avgQScore;
    }
  }

  const difficultyBreakdown: DifficultyBreakdown = {
    easy: {
      total: diffStats.EASY.total,
      answered: diffStats.EASY.answered,
      averageScore:
        diffStats.EASY.answered > 0
          ? Math.round(diffStats.EASY.scoreSum / diffStats.EASY.answered)
          : 0,
    },
    medium: {
      total: diffStats.MEDIUM.total,
      answered: diffStats.MEDIUM.answered,
      averageScore:
        diffStats.MEDIUM.answered > 0
          ? Math.round(diffStats.MEDIUM.scoreSum / diffStats.MEDIUM.answered)
          : 0,
    },
    hard: {
      total: diffStats.HARD.total,
      answered: diffStats.HARD.answered,
      averageScore:
        diffStats.HARD.answered > 0
          ? Math.round(diffStats.HARD.scoreSum / diffStats.HARD.answered)
          : 0,
    },
  };

  const count = questionResults.length;
  const catScores =
    count > 0
      ? {
          correctness: Math.round(totalCorrectness / count),
          codeUnderstanding: Math.round(totalCodeUnderstanding / count),
          clarity: Math.round(totalClarity / count),
          reasoning: Math.round(totalReasoning / count),
        }
      : {
          correctness: 0,
          codeUnderstanding: 0,
          clarity: 0,
          reasoning: 0,
        };

  const overallScore =
    count > 0
      ? Math.round(
          (catScores.correctness +
            catScores.codeUnderstanding +
            catScores.clarity +
            catScores.reasoning) /
            4
        )
      : 0;

  // Build strengths and weaknesses from real question results
  const strengths: ReportInsight[] = [];
  const weaknesses: ReportInsight[] = [];
  const revisionTopics: RevisionTopic[] = [];

  for (let i = 0; i < questionResults.length; i++) {
    const qr = questionResults[i]!;
    const q = qr.question;
    const ev = qr.evaluation;
    const firstEv = q.evidenceReferences[0];

    if (ev.correctness >= 75) {
      strengths.push({
        id: `str-${i + 1}`,
        title: `Strong defence on ${q.category}`,
        detail: ev.feedback,
        evidenceFile: firstEv?.filePath,
      });
    } else {
      weaknesses.push({
        id: `wk-${i + 1}`,
        title: `Gap identified in ${q.category}`,
        detail: ev.feedback,
        evidenceFile: firstEv?.filePath,
      });

      revisionTopics.push({
        id: `rev-${i + 1}`,
        topic: `${q.category}: ${firstEv ? firstEv.filePath.split("/").pop() : "Implementation"}`,
        priority: ev.correctness < 60 ? "HIGH" : "MEDIUM",
        reason: ev.suggestedImprovements[0] ?? "Review edge cases and failure modes.",
        relatedFiles: [firstEv?.filePath ?? "src/"],
        studyPrompt: `Practice explaining how ${firstEv?.filePath ?? "the module"} behaves under failure conditions.`,
      });
    }
  }

  // Ensure at least one strength and one weakness/revision topic
  if (strengths.length === 0) {
    strengths.push({
      id: "str-base",
      title: "Active participation in project defence",
      detail: "Submitted responses to technical cross-examination prompts.",
      evidenceFile: questions[0]?.evidenceReferences[0]?.filePath,
    });
  }

  if (weaknesses.length === 0) {
    weaknesses.push({
      id: "wk-base",
      title: "Deeper trade-off exploration",
      detail: "Expand on architectural alternatives and edge-case testing.",
      evidenceFile: questions[0]?.evidenceReferences[0]?.filePath,
    });
  }

  if (revisionTopics.length === 0) {
    revisionTopics.push({
      id: "rev-base",
      topic: "End-to-End System Failure Modes",
      priority: "MEDIUM",
      reason: "Review how downstream outages and timeouts affect service guarantees.",
      relatedFiles: questions[0]?.evidenceReferences.map((e) => e.filePath) ?? ["README.md"],
      studyPrompt: "Prepare a 60-second summary explaining your design trade-offs.",
    });
  }

  const report: FinalReport = {
    overallScore,
    categoryScores: catScores,
    difficultyBreakdown,
    strengths,
    weaknesses,
    revisionTopics,
    questionResults:
      questionResults.length > 0
        ? questionResults
        : [
            {
              question: questions[0] ?? {
                id: "q-default",
                order: 1,
                text: "Default Question",
                category: "Architecture",
                difficulty: "FOUNDATIONAL",
                evidenceReferences: [],
                expectedConcepts: ["Architecture"],
              },
              answer: {
                questionId: questions[0]?.id ?? "q-default",
                answerText: "Candidate draft answer awaiting evaluation.",
                submittedAt: new Date().toISOString(),
              },
              evaluation: {
                correctness: 75,
                codeUnderstanding: 80,
                clarity: 70,
                reasoning: 70,
                feedback: "Session in progress. Complete remaining questions to finalize report scores.",
                suggestedImprovements: ["Answer all questions in the Grill Room."],
              },
              evidenceReferences: questions[0]?.evidenceReferences ?? [],
            },
          ],
    generatedAt: new Date().toISOString(),
    isPreview: false,
  };

  return report;
}

// Global singleton across server invocations
const globalForSessionStore = globalThis as unknown as {
  sessionStoreInstance?: SessionStore;
};

export const sessionStore =
  globalForSessionStore.sessionStoreInstance ?? new SessionStore();

if (process.env.NODE_ENV !== "production") {
  globalForSessionStore.sessionStoreInstance = sessionStore;
}
