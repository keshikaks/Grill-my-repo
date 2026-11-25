import { prisma } from "../../db.ts";
import { sanitizeNullBytes, sanitizeForPostgres } from "../../utils/sanitizer.ts";
import type { RepositorySnapshot } from "../github/types.ts";
import type { RepositoryMetadata } from "../../contracts/repository.ts";
import type { AnalysisResult } from "../../contracts/analysis.ts";
import type { ClaimVerification } from "../../contracts/claims.ts";
import type {
  AnswerEvaluation,
  FollowUpItem,
  GrillAnswer,
  GrillQuestion,
} from "../../contracts/grill.ts";
import type { FinalReport } from "../../contracts/report.ts";
import { generateReportFromAnswers } from "../session/session-store.ts";

export class OwnershipError extends Error {
  constructor(message = "Resource not found or unauthorized.") {
    super(message);
    this.name = "OwnershipError";
  }
}

export async function saveRepositoryAndAnalysis(params: {
  userId: string;
  snapshot: RepositorySnapshot;
  metadata: RepositoryMetadata;
  analysis: AnalysisResult;
  claims: ClaimVerification[];
  questions: GrillQuestion[];
}): Promise<{ sessionId: string; repositoryId: string; analysisId: string }> {
  // Sanitize all inputs to prevent PostgreSQL null-byte \u0000 rejection
  const userId = sanitizeNullBytes(params.userId);
  const snapshot = sanitizeForPostgres(params.snapshot);
  const metadata = sanitizeForPostgres(params.metadata);
  const analysis = sanitizeForPostgres(params.analysis);
  const claims = sanitizeForPostgres(params.claims);
  const questions = sanitizeForPostgres(params.questions);

  // 1. Upsert repository for this user
  const repository = await prisma.repository.upsert({
    where: {
      userId_ownerName_repoName: {
        userId,
        ownerName: metadata.owner,
        repoName: metadata.name,
      },
    },
    update: {
      defaultBranch: metadata.defaultBranch,
      latestCommitSha: metadata.commitSha,
      primaryLanguage: metadata.languages[0]?.name ?? null,
      githubUrl: snapshot.htmlUrl,
      updatedAt: new Date(),
    },
    create: {
      userId,
      ownerName: metadata.owner,
      repoName: metadata.name,
      defaultBranch: metadata.defaultBranch,
      latestCommitSha: metadata.commitSha,
      primaryLanguage: metadata.languages[0]?.name ?? null,
      githubUrl: snapshot.htmlUrl,
    },
  });

  // 2. Create Analysis snapshot record
  const analysisRecord = await prisma.analysis.create({
    data: {
      userId,
      repositoryId: repository.id,
      repositorySnapshot: snapshot as unknown as object,
      technologyStack: analysis.technologies as unknown as object,
      architectureFindings: analysis as unknown as object,
      readmeClaims: claims as unknown as object,
      analysisStatus: "COMPLETED",
    },
  });

  // 3. Create GrillSession
  const grillSession = await prisma.grillSession.create({
    data: {
      userId,
      analysisId: analysisRecord.id,
      sessionStatus: "ACTIVE",
      currentProgress: 0,
    },
  });

  // 4. Create Question records
  for (const q of questions) {
    const rawConcepts = q.explanation
      ? { concepts: q.expectedConcepts, explanation: q.explanation }
      : q.expectedConcepts;

    await prisma.question.create({
      data: {
        grillSessionId: grillSession.id,
        order: q.order,
        questionContent: q.text,
        difficulty: q.difficulty,
        category: q.category,
        sourceEvidence: q.evidenceReferences as unknown as object,
        expectedConcepts: rawConcepts as unknown as object,
        followUpContext: q.followUpContext ?? null,
      },
    });
  }

  return {
    sessionId: grillSession.id,
    repositoryId: repository.id,
    analysisId: analysisRecord.id,
  };
}

export async function getSessionAnalysis(
  sessionId: string,
  userId?: string
) {
  const session = await prisma.grillSession.findUnique({
    where: { id: sessionId },
    include: {
      analysis: {
        include: {
          repository: true,
        },
      },
      questions: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!session) {
    return null;
  }

  // IDOR check: if userId provided, verify ownership
  if (userId && session.userId !== userId) {
    throw new OwnershipError();
  }

  const analysis = session.analysis.architectureFindings as unknown as AnalysisResult;
  const claims = session.analysis.readmeClaims as unknown as ClaimVerification[];
  const repo = session.analysis.repository;
  const snapshot = session.analysis.repositorySnapshot as unknown as RepositorySnapshot;

  const metadata: RepositoryMetadata = {
    owner: repo.ownerName,
    name: repo.repoName,
    description: snapshot?.description ?? "Repository analysis snapshot",
    defaultBranch: repo.defaultBranch,
    commitSha: repo.latestCommitSha,
    languages: snapshot?.languages ?? [{ name: repo.primaryLanguage ?? "Code", percentage: 100 }],
    url: repo.githubUrl,
    frameworks: snapshot?.frameworks ?? [],
    inspectedFileCount: snapshot?.inspectedFileCount ?? 0,
    totalLinesOfCode: snapshot?.totalLinesOfCode ?? 0,
  };

  return {
    sessionId: session.id,
    userId: session.userId,
    status: session.sessionStatus,
    progress: session.currentProgress,
    createdAt: session.createdAt.toISOString(),
    metadata,
    analysis,
    claims,
    questionCount: session.questions.length,
  };
}

export async function getSessionQuestions(
  sessionId: string,
  userId?: string
) {
  const session = await prisma.grillSession.findUnique({
    where: { id: sessionId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: {
          answers: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (userId && session.userId !== userId) {
    throw new OwnershipError();
  }

  const questions: GrillQuestion[] = session.questions.map((q) => {
    let expectedConcepts: string[] = [];
    let explanation = undefined;

    if (Array.isArray(q.expectedConcepts)) {
      expectedConcepts = q.expectedConcepts as string[];
    } else if (q.expectedConcepts && typeof q.expectedConcepts === "object") {
      const obj = q.expectedConcepts as Record<string, unknown>;
      expectedConcepts = (obj.concepts as string[]) || [];
      explanation = obj.explanation as GrillQuestion["explanation"];
    }

    return {
      id: q.id,
      order: q.order,
      text: q.questionContent,
      category: q.category as GrillQuestion["category"],
      difficulty: q.difficulty as GrillQuestion["difficulty"],
      evidenceReferences: q.sourceEvidence as unknown as GrillQuestion["evidenceReferences"],
      expectedConcepts,
      explanation,
      followUpContext: q.followUpContext ?? undefined,
    };
  });

  const answers: Record<string, GrillAnswer> = {};
  const evaluations: Record<string, AnswerEvaluation> = {};

  for (const q of session.questions) {
    const ans = q.answers[0];
    if (ans) {
      answers[q.id] = {
        questionId: q.id,
        answerText: ans.submittedAnswer,
        submittedAt: ans.createdAt.toISOString(),
      };

      const details = (ans.evaluationDetails ?? {}) as Record<string, unknown>;

      evaluations[q.id] = {
        rubricScore: ans.rubricScore ?? 3,
        correctness: ans.correctness,
        codeUnderstanding: ans.codeUnderstanding,
        clarity: ans.clarity,
        reasoning: ans.reasoning,
        feedback: ans.evaluationFeedback,
        correctPoints: (details.correctPoints as string[]) ?? [],
        missingConcepts: (details.missingConcepts as string[]) ?? [],
        technicalInaccuracies: (details.technicalInaccuracies as string[]) ?? [],
        improvedExplanation: (details.improvedExplanation as string) ?? "",
        suggestedImprovements: (details.suggestedImprovements as string[]) ?? [],
      };
    }
  }

  return {
    sessionId: session.id,
    status: session.sessionStatus,
    questions,
    answers,
    evaluations,
  };
}

export async function recordPersistentAnswer(params: {
  sessionId: string;
  questionId: string;
  userId: string;
  answerText: string;
  evaluation: AnswerEvaluation;
}) {
  const sessionId = sanitizeNullBytes(params.sessionId);
  const questionId = sanitizeNullBytes(params.questionId);
  const userId = sanitizeNullBytes(params.userId);
  const answerText = sanitizeNullBytes(params.answerText);
  const evaluation = sanitizeForPostgres(params.evaluation);

  // 1. Verify session ownership
  const session = await prisma.grillSession.findUnique({
    where: { id: sessionId },
    include: { questions: true },
  });

  if (!session || session.userId !== userId) {
    throw new OwnershipError();
  }

  // 2. Verify question belongs to session
  const questionBelongs = session.questions.some((q) => q.id === questionId);
  if (!questionBelongs) {
    throw new OwnershipError("Question does not belong to this grilling session.");
  }

  // 3. Upsert answer
  const existingAnswer = await prisma.answer.findFirst({
    where: { questionId, userId },
  });

  const evaluationDetails = {
    correctPoints: evaluation.correctPoints ?? [],
    missingConcepts: evaluation.missingConcepts ?? [],
    technicalInaccuracies: evaluation.technicalInaccuracies ?? [],
    improvedExplanation: evaluation.improvedExplanation ?? "",
    suggestedImprovements: evaluation.suggestedImprovements ?? [],
  };

  const compositeScore = Math.round(
    evaluation.correctness * 0.3 +
    evaluation.codeUnderstanding * 0.3 +
    evaluation.clarity * 0.2 +
    evaluation.reasoning * 0.2
  );

  let answerRecord;
  if (existingAnswer) {
    answerRecord = await prisma.answer.update({
      where: { id: existingAnswer.id },
      data: {
        submittedAnswer: answerText,
        rubricScore: evaluation.rubricScore ?? 3,
        evaluationScore: compositeScore,
        evaluationFeedback: evaluation.feedback,
        correctness: evaluation.correctness,
        codeUnderstanding: evaluation.codeUnderstanding,
        clarity: evaluation.clarity,
        reasoning: evaluation.reasoning,
        evaluationDetails: evaluationDetails as unknown as object,
        createdAt: new Date(),
      },
    });
  } else {
    answerRecord = await prisma.answer.create({
      data: {
        questionId,
        userId,
        submittedAnswer: answerText,
        rubricScore: evaluation.rubricScore ?? 3,
        evaluationScore: compositeScore,
        evaluationFeedback: evaluation.feedback,
        correctness: evaluation.correctness,
        codeUnderstanding: evaluation.codeUnderstanding,
        clarity: evaluation.clarity,
        reasoning: evaluation.reasoning,
        evaluationDetails: evaluationDetails as unknown as object,
      },
    });
  }

  // 4. Update session progress
  const answeredCount = await prisma.answer.count({
    where: {
      question: { grillSessionId: sessionId },
      userId,
    },
  });

  await prisma.grillSession.update({
    where: { id: sessionId },
    data: {
      currentProgress: answeredCount,
      updatedAt: new Date(),
    },
  });

  return answerRecord;
}

export async function recordPersistentFollowUp(params: {
  sessionId: string;
  questionId: string;
  userId: string;
  followUp: FollowUpItem;
}) {
  const sessionId = sanitizeNullBytes(params.sessionId);
  const questionId = sanitizeNullBytes(params.questionId);
  const userId = sanitizeNullBytes(params.userId);
  const followUp = sanitizeForPostgres(params.followUp);

  const session = await prisma.grillSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.userId !== userId) {
    throw new OwnershipError();
  }

  const answer = await prisma.answer.findFirst({
    where: { questionId, userId },
  });

  if (answer) {
    const details = (answer.evaluationDetails ?? {}) as Record<string, unknown>;
    const existingFollowUps = (details.followUps as FollowUpItem[]) ?? [];
    existingFollowUps.push(followUp);
    details.followUps = existingFollowUps;

    await prisma.answer.update({
      where: { id: answer.id },
      data: {
        evaluationDetails: details as unknown as object,
      },
    });
  }

  return followUp;
}

export async function getSessionReport(
  sessionId: string,
  userId?: string
): Promise<FinalReport | null> {
  const session = await prisma.grillSession.findUnique({
    where: { id: sessionId },
    include: {
      reports: true,
      analysis: {
        include: { repository: true },
      },
      questions: {
        orderBy: { order: "asc" },
        include: { answers: true },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (userId && session.userId !== userId) {
    throw new OwnershipError();
  }

  // Check if report already exists in DB
  const existingReport = session.reports[0];
  if (existingReport) {
    const details = (existingReport.rubricBreakdown ?? {}) as Record<string, unknown>;
    return {
      overallScore: existingReport.finalScore,
      categoryScores: existingReport.rubricBreakdown as unknown as FinalReport["categoryScores"],
      difficultyBreakdown: details.difficultyBreakdown as FinalReport["difficultyBreakdown"],
      strengths: existingReport.strengths as unknown as FinalReport["strengths"],
      weaknesses: existingReport.weaknesses as unknown as FinalReport["weaknesses"],
      revisionTopics: existingReport.recommendations as unknown as FinalReport["revisionTopics"],
      questionResults: existingReport.questionResults as unknown as FinalReport["questionResults"],
      generatedAt: existingReport.createdAt.toISOString(),
      isPreview: false,
    };
  }

  // Generate on-demand report from answers
  const questions: GrillQuestion[] = session.questions.map((q) => {
    let expectedConcepts: string[] = [];
    let explanation = undefined;

    if (Array.isArray(q.expectedConcepts)) {
      expectedConcepts = q.expectedConcepts as string[];
    } else if (q.expectedConcepts && typeof q.expectedConcepts === "object") {
      const obj = q.expectedConcepts as Record<string, unknown>;
      expectedConcepts = (obj.concepts as string[]) || [];
      explanation = obj.explanation as GrillQuestion["explanation"];
    }

    return {
      id: q.id,
      order: q.order,
      text: q.questionContent,
      category: q.category as GrillQuestion["category"],
      difficulty: q.difficulty as GrillQuestion["difficulty"],
      evidenceReferences: q.sourceEvidence as unknown as GrillQuestion["evidenceReferences"],
      expectedConcepts,
      explanation,
    };
  });

  const answers: Record<string, GrillAnswer> = {};
  const evaluations: Record<string, AnswerEvaluation> = {};

  for (const q of session.questions) {
    const ans = q.answers[0];
    if (ans) {
      answers[q.id] = {
        questionId: q.id,
        answerText: ans.submittedAnswer,
        submittedAt: ans.createdAt.toISOString(),
      };
      evaluations[q.id] = {
        rubricScore: ans.rubricScore ?? 3,
        correctness: ans.correctness,
        codeUnderstanding: ans.codeUnderstanding,
        clarity: ans.clarity,
        reasoning: ans.reasoning,
        feedback: ans.evaluationFeedback,
        suggestedImprovements: [],
      };
    }
  }

  const generated = generateReportFromAnswers(sessionId, questions, answers, evaluations);
  const cleanReport = sanitizeForPostgres(generated);

  // Persist report in database
  await prisma.report.create({
    data: {
      userId: session.userId,
      analysisId: session.analysisId,
      grillSessionId: session.id,
      finalScore: cleanReport.overallScore,
      rubricBreakdown: cleanReport.categoryScores as unknown as object,
      strengths: cleanReport.strengths as unknown as object,
      weaknesses: cleanReport.weaknesses as unknown as object,
      recommendations: cleanReport.revisionTopics as unknown as object,
      questionResults: cleanReport.questionResults as unknown as object,
    },
  });

  await prisma.grillSession.update({
    where: { id: sessionId },
    data: { sessionStatus: "COMPLETED" },
  });

  return generated;
}

export async function getUserDashboardData(userId: string) {
  // Aggregate stats
  const totalRepositories = await prisma.repository.count({
    where: { userId },
  });

  const totalSessions = await prisma.grillSession.count({
    where: { userId },
  });

  const avgScoreResult = await prisma.report.aggregate({
    where: { userId },
    _avg: { finalScore: true },
  });

  const averageScore = avgScoreResult._avg.finalScore
    ? Math.round(avgScoreResult._avg.finalScore)
    : 0;

  // Recent repositories
  const recentRepositories = await prisma.repository.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 6,
    include: {
      analyses: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          grillSessions: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  // Recent grilling sessions
  const recentSessions = await prisma.grillSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 6,
    include: {
      analysis: {
        include: { repository: true },
      },
      reports: true,
      _count: { select: { questions: true } },
    },
  });

  // Recent reports
  const recentReports = await prisma.report.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: {
      analysis: {
        include: { repository: true },
      },
    },
  });

  return {
    stats: {
      totalRepositories,
      totalSessions,
      averageScore,
    },
    recentRepositories: recentRepositories.map((r) => ({
      id: r.id,
      name: r.repoName,
      owner: r.ownerName,
      githubUrl: r.githubUrl,
      language: r.primaryLanguage,
      updatedAt: r.updatedAt.toISOString(),
      latestSessionId: r.analyses[0]?.grillSessions[0]?.id ?? null,
    })),
    recentSessions: recentSessions.map((s) => ({
      id: s.id,
      repoName: s.analysis.repository.repoName,
      owner: s.analysis.repository.ownerName,
      status: s.sessionStatus,
      progress: s.currentProgress,
      totalQuestions: s._count.questions,
      score: s.reports[0]?.finalScore ?? null,
      updatedAt: s.updatedAt.toISOString(),
    })),
    recentReports: recentReports.map((rep) => ({
      id: rep.id,
      sessionId: rep.grillSessionId,
      repoName: rep.analysis.repository.repoName,
      owner: rep.analysis.repository.ownerName,
      score: rep.finalScore,
      createdAt: rep.createdAt.toISOString(),
    })),
  };
}

export async function deleteUserRepository(repositoryId: string, userId: string) {
  const repository = await prisma.repository.findUnique({
    where: { id: repositoryId },
  });

  if (!repository || repository.userId !== userId) {
    throw new OwnershipError("Repository not found or access denied.");
  }

  await prisma.repository.delete({
    where: { id: repositoryId },
  });

  return { success: true };
}
