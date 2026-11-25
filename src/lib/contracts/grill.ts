import { z } from "zod";
import { EvidenceReferenceSchema } from "./repository.ts";

export const QuestionDifficultySchema = z.enum([
  "EASY",
  "MEDIUM",
  "HARD",
  // Backward compatibility aliases
  "FOUNDATIONAL",
  "INTERMEDIATE",
  "DEEP_DIVE",
]);

export const QuestionCategorySchema = z.enum([
  "Architecture",
  "Concurrency",
  "Security",
  "Claims & Trade-offs",
  "Data Modeling",
  "Reliability",
]);

export const QuestionExplanationSchema = z.object({
  whatItIsAsking: z.string().min(1),
  whyInterviewerAsks: z.string().min(1),
  conceptsToThinkAbout: z.array(z.string().min(1)).min(1),
});

export const GrillQuestionSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().positive(),
  text: z.string().min(10),
  followUpContext: z.string().optional(),
  category: QuestionCategorySchema,
  difficulty: QuestionDifficultySchema,
  evidenceReferences: z.array(EvidenceReferenceSchema).min(1),
  expectedConcepts: z.array(z.string().min(1)).min(1),
  explanation: QuestionExplanationSchema.optional(),
});

export const GrillAnswerSchema = z.object({
  questionId: z.string().min(1),
  answerText: z
    .string()
    .trim()
    .min(15, "Write at least 15 characters explaining your reasoning before submitting.")
    .max(5000, "Answer must be under 5,000 characters."),
  submittedAt: z.string().datetime(),
});

export const AnswerEvaluationSchema = z.object({
  correctness: z.number().min(0).max(100),
  codeUnderstanding: z.number().min(0).max(100),
  clarity: z.number().min(0).max(100),
  reasoning: z.number().min(0).max(100),
  feedback: z.string().min(1),
  suggestedImprovements: z.array(z.string().min(1)),
  // Extended Phase 2 & 3 evaluation metrics
  rubricScore: z.number().min(1).max(5).optional(),
  correctPoints: z.array(z.string()).optional(),
  missingConcepts: z.array(z.string()).optional(),
  technicalInaccuracies: z.array(z.string()).optional(),
  improvedExplanation: z.string().optional(),
});

export const FollowUpItemSchema = z.object({
  id: z.string().min(1),
  questionId: z.string().min(1),
  candidateQuery: z.string().min(1),
  response: z.string().min(1),
  suggestedFollowUp: z.string().optional(),
  timestamp: z.string().datetime(),
});

export type QuestionDifficulty = z.infer<typeof QuestionDifficultySchema>;
export type QuestionCategory = z.infer<typeof QuestionCategorySchema>;
export type QuestionExplanation = z.infer<typeof QuestionExplanationSchema>;
export type GrillQuestion = z.infer<typeof GrillQuestionSchema>;
export type GrillAnswer = z.infer<typeof GrillAnswerSchema>;
export type AnswerEvaluation = z.infer<typeof AnswerEvaluationSchema>;
export type FollowUpItem = z.infer<typeof FollowUpItemSchema>;

export type StandardDifficulty = "EASY" | "MEDIUM" | "HARD";

/**
 * Normalizes any difficulty string into the standard three levels:
 * EASY, MEDIUM, or HARD.
 */
export function normalizeDifficulty(diff: QuestionDifficulty | string): StandardDifficulty {
  switch (diff?.toUpperCase()) {
    case "EASY":
    case "FOUNDATIONAL":
      return "EASY";
    case "MEDIUM":
    case "INTERMEDIATE":
      return "MEDIUM";
    case "HARD":
    case "DEEP_DIVE":
      return "HARD";
    default:
      return "EASY";
  }
}

export const DIFFICULTY_META: Record<
  QuestionDifficulty,
  {
    label: string;
    sublabel: string;
    badgeText: string;
    tone: "info" | "warning" | "error";
    level: 1 | 2 | 3;
  }
> = {
  EASY: {
    label: "Easy",
    sublabel: "Know what you built",
    badgeText: "EASY · Beginner",
    tone: "info",
    level: 1,
  },
  MEDIUM: {
    label: "Medium",
    sublabel: "Understand how it works",
    badgeText: "MEDIUM · Intermediate",
    tone: "warning",
    level: 2,
  },
  HARD: {
    label: "Hard",
    sublabel: "Defend your decisions",
    badgeText: "HARD · Advanced",
    tone: "error",
    level: 3,
  },
  // Aliases for backward compatibility
  FOUNDATIONAL: {
    label: "Easy",
    sublabel: "Know what you built",
    badgeText: "EASY · Beginner",
    tone: "info",
    level: 1,
  },
  INTERMEDIATE: {
    label: "Medium",
    sublabel: "Understand how it works",
    badgeText: "MEDIUM · Intermediate",
    tone: "warning",
    level: 2,
  },
  DEEP_DIVE: {
    label: "Hard",
    sublabel: "Defend your decisions",
    badgeText: "HARD · Advanced",
    tone: "error",
    level: 3,
  },
};
