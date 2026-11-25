import { z } from "zod";
import { EvidenceReferenceSchema } from "./repository.ts";
import { AnswerEvaluationSchema, GrillAnswerSchema, GrillQuestionSchema } from "./grill.ts";

export const CategoryScoresSchema = z.object({
  correctness: z.number().min(0).max(100),
  codeUnderstanding: z.number().min(0).max(100),
  clarity: z.number().min(0).max(100),
  reasoning: z.number().min(0).max(100),
});

export const ReportInsightSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().min(1),
  evidenceFile: z.string().optional(),
});

export const QuestionResultSchema = z.object({
  question: GrillQuestionSchema,
  answer: GrillAnswerSchema,
  evaluation: AnswerEvaluationSchema,
  evidenceReferences: z.array(EvidenceReferenceSchema).min(1),
});

export const RevisionTopicSchema = z.object({
  id: z.string().min(1),
  topic: z.string().min(1),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  reason: z.string().min(1),
  relatedFiles: z.array(z.string().min(1)).min(1),
  studyPrompt: z.string().min(1),
});

export const DifficultyLevelStatsSchema = z.object({
  total: z.number().int().min(0),
  answered: z.number().int().min(0),
  averageScore: z.number().min(0).max(100),
});

export const DifficultyBreakdownSchema = z.object({
  easy: DifficultyLevelStatsSchema,
  medium: DifficultyLevelStatsSchema,
  hard: DifficultyLevelStatsSchema,
});

export const FinalReportSchema = z.object({
  overallScore: z.number().min(0).max(100),
  categoryScores: CategoryScoresSchema,
  difficultyBreakdown: DifficultyBreakdownSchema.optional(),
  strengths: z.array(ReportInsightSchema).min(1),
  weaknesses: z.array(ReportInsightSchema).min(1),
  revisionTopics: z.array(RevisionTopicSchema).min(1),
  questionResults: z.array(QuestionResultSchema).min(1),
  generatedAt: z.string().datetime(),
  isPreview: z.boolean(),
});

export type CategoryScores = z.infer<typeof CategoryScoresSchema>;
export type ReportInsight = z.infer<typeof ReportInsightSchema>;
export type QuestionResult = z.infer<typeof QuestionResultSchema>;
export type RevisionTopic = z.infer<typeof RevisionTopicSchema>;
export type DifficultyLevelStats = z.infer<typeof DifficultyLevelStatsSchema>;
export type DifficultyBreakdown = z.infer<typeof DifficultyBreakdownSchema>;
export type FinalReport = z.infer<typeof FinalReportSchema>;
