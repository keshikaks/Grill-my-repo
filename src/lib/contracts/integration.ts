import { validateGitHubRepoUrl, type ParsedGitHubRepoUrl } from "@/lib/validation/github-url";
import {
  GrillAnswerSchema,
  type AnswerEvaluation,
  type FollowUpItem,
  type GrillAnswer,
  type GrillQuestion,
} from "./grill";
import type { AnalysisResult } from "./analysis";
import type { ClaimVerification } from "./claims";
import type { FinalReport } from "./report";
import type { RepositoryMetadata } from "./repository";

export interface RepositoryAnalysisGateway {
  submitRepositoryUrl(rawUrl: string): Promise<RepositorySubmissionOutcome>;
  fetchAnalysis(sessionId: string): Promise<RepositoryAnalysisPayload>;
}

export interface GrillSessionGateway {
  fetchQuestions(sessionId: string): Promise<GrillQuestion[]>;
  submitAnswer(
    sessionId: string,
    answer: GrillAnswer
  ): Promise<AnswerEvaluation>;
  fetchReport(sessionId: string): Promise<FinalReport>;
}

export type DraftAnswerSubmissionOutcome =
  | {
      status: "VALIDATION_ERROR";
      message: string;
    }
  | {
      status: "RECORDED_PREVIEW_DRAFT";
      answer?: GrillAnswer;
      message: string;
    };

export interface RepositoryAnalysisPayload {
  metadata: RepositoryMetadata;
  analysis: AnalysisResult;
  claims: ClaimVerification[];
}

export interface AnalyzeApiResponse {
  success: boolean;
  sessionId: string;
  metadata: RepositoryMetadata;
  analysis: AnalysisResult;
  claims: ClaimVerification[];
  questionCount: number;
  aiConfigured: boolean;
  aiProvider: string;
  aiModel: string;
  error?: string;
  isRateLimit?: boolean;
}

export interface GrillQuestionsApiResponse {
  sessionId: string;
  repositoryFullName: string;
  questions: GrillQuestion[];
  answers: Record<string, GrillAnswer>;
  evaluations: Record<string, AnswerEvaluation>;
  followUps: Record<string, FollowUpItem[]>;
  aiConfigured: boolean;
  aiProvider: string;
  aiModel: string;
}

export interface AnswerApiResponse {
  success: boolean;
  questionId: string;
  answer: GrillAnswer;
  evaluation: AnswerEvaluation;
  aiConfigured: boolean;
  aiProvider: string;
  aiModel: string;
}

export interface FollowUpApiResponse {
  success: boolean;
  followUp: FollowUpItem;
}

export interface ReportApiResponse {
  sessionId: string;
  metadata: RepositoryMetadata;
  report: FinalReport;
}

/**
 * Phase 2 Client Integration Methods
 */
export async function analyzeRepositoryApi(
  url: string
): Promise<AnalyzeApiResponse> {
  const res = await fetch("/api/repository/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Analysis failed (${res.status})`);
  }

  return data as AnalyzeApiResponse;
}

export async function fetchRepositorySessionApi(
  sessionId: string
): Promise<AnalyzeApiResponse> {
  const res = await fetch(`/api/repository/${encodeURIComponent(sessionId)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to fetch session (${res.status})`);
  }
  return data as AnalyzeApiResponse;
}

export async function fetchGrillQuestionsApi(
  sessionId: string
): Promise<GrillQuestionsApiResponse> {
  const res = await fetch(`/api/grill/${encodeURIComponent(sessionId)}/questions`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to fetch questions (${res.status})`);
  }
  return data as GrillQuestionsApiResponse;
}

export async function submitGrillAnswerApi(
  sessionId: string,
  questionId: string,
  answerText: string
): Promise<AnswerApiResponse> {
  const res = await fetch(`/api/grill/${encodeURIComponent(sessionId)}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId, answerText }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to submit answer (${res.status})`);
  }
  return data as AnswerApiResponse;
}

export async function submitGrillFollowUpApi(
  sessionId: string,
  questionId: string,
  candidateQuery: string
): Promise<FollowUpApiResponse> {
  const res = await fetch(`/api/grill/${encodeURIComponent(sessionId)}/followup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId, candidateQuery }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to process follow-up (${res.status})`);
  }
  return data as FollowUpApiResponse;
}

export async function fetchSessionReportApi(
  sessionId: string
): Promise<ReportApiResponse> {
  const res = await fetch(`/api/report/${encodeURIComponent(sessionId)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to fetch report (${res.status})`);
  }
  return data as ReportApiResponse;
}

/**
 * Phase 1 Preview fallback helpers
 */
export type RepositorySubmissionOutcome =
  | {
      status: "VALIDATION_ERROR";
      message: string;
    }
  | {
      status: "PHASE_2_PENDING";
      repository: ParsedGitHubRepoUrl;
      message: string;
      previewRoute: string;
    };

export function submitRepositoryForAnalysis(
  rawUrl: string
): RepositorySubmissionOutcome {
  const validation = validateGitHubRepoUrl(rawUrl);

  if (!validation.success) {
    return {
      status: "VALIDATION_ERROR",
      message: validation.error,
    };
  }

  const encodedRepo = encodeURIComponent(validation.data.fullName);

  return {
    status: "PHASE_2_PENDING",
    repository: validation.data,
    message: "Repository URL validated.",
    previewRoute: `/analysis?repo=${encodedRepo}&preview=true`,
  };
}

export function submitDraftAnswerInPreview(
  questionId: string,
  answerText: string
): {
  status: "VALIDATION_ERROR" | "RECORDED_PREVIEW_DRAFT";
  answer?: GrillAnswer;
  message: string;
} {
  const parsed = GrillAnswerSchema.safeParse({
    questionId,
    answerText,
    submittedAt: new Date().toISOString(),
  });

  if (!parsed.success) {
    return {
      status: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Please refine your answer.",
    };
  }

  return {
    status: "RECORDED_PREVIEW_DRAFT",
    answer: parsed.data,
    message: "Draft saved locally.",
  };
}
