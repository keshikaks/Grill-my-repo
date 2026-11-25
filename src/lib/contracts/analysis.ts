import { z } from "zod";
import { RepositoryFileSchema } from "./repository.ts";

export const AnalysisStageStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
]);

export const AnalysisStageSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  detail: z.string().min(1),
  status: AnalysisStageStatusSchema,
  durationMs: z.number().int().nonnegative().optional(),
});

export const TechnologyItemSchema = z.object({
  name: z.string().min(1),
  category: z.enum([
    "Runtime & Language",
    "Framework & API",
    "Data & Messaging",
    "Testing & Tooling",
    "Infrastructure",
  ]),
  detectedIn: z.string().min(1),
  purpose: z.string().min(1),
});

export const ArchitectureLayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  responsibility: z.string().min(1),
  keyFiles: z.array(z.string().min(1)).min(1),
  tradeOffs: z.string().min(1),
});

export const ArchitectureOverviewSchema = z.object({
  pattern: z.string().min(1),
  summary: z.string().min(1),
  dataFlow: z.array(z.string().min(1)).min(1),
  layers: z.array(ArchitectureLayerSchema).min(1),
});

export const AnalysisResultSchema = z.object({
  projectSummary: z.object({
    headline: z.string().min(1),
    overview: z.string().min(1),
    primaryUseCase: z.string().min(1),
    complexityLevel: z.enum(["Foundational", "Intermediate", "Production-Oriented"]),
    observations: z.array(z.string().min(1)).min(1),
  }),
  technologies: z.array(TechnologyItemSchema).min(1),
  architecture: ArchitectureOverviewSchema,
  importantFiles: z.array(RepositoryFileSchema).min(1),
  stages: z.array(AnalysisStageSchema).min(1),
  isPreview: z.boolean(),
});

export type AnalysisStageStatus = z.infer<typeof AnalysisStageStatusSchema>;
export type AnalysisStage = z.infer<typeof AnalysisStageSchema>;
export type TechnologyItem = z.infer<typeof TechnologyItemSchema>;
export type ArchitectureLayer = z.infer<typeof ArchitectureLayerSchema>;
export type ArchitectureOverview = z.infer<typeof ArchitectureOverviewSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
