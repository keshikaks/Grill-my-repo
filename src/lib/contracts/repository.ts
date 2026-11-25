import { z } from "zod";

export const LanguageShareSchema = z.object({
  name: z.string().min(1),
  percentage: z.number().min(0).max(100),
  bytes: z.number().int().nonnegative().optional(),
});

export const RepositoryMetadataSchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  defaultBranch: z.string().min(1),
  commitSha: z.string().min(7).max(40),
  languages: z.array(LanguageShareSchema).min(1),
  url: z.string().url().optional(),
  frameworks: z.array(z.string()).default([]),
  inspectedFileCount: z.number().int().nonnegative().optional(),
  totalLinesOfCode: z.number().int().nonnegative().optional(),
  analyzedAt: z.string().datetime().optional(),
});

export const RepositoryFileSchema = z.object({
  path: z.string().min(1),
  extension: z.string(),
  size: z.number().int().nonnegative(),
  contentReference: z.string().min(1),
  role: z.string().optional(),
  summary: z.string().optional(),
  language: z.string().optional(),
  snippet: z.string().optional(),
  lineCount: z.number().int().positive().optional(),
});

export const EvidenceReferenceSchema = z.object({
  id: z.string().min(1),
  filePath: z.string().min(1),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  contentReference: z.string().min(1),
  language: z.string().min(1),
  excerpt: z.string().min(1),
  note: z.string().optional(),
});

export type LanguageShare = z.infer<typeof LanguageShareSchema>;
export type RepositoryMetadata = z.infer<typeof RepositoryMetadataSchema>;
export type RepositoryFile = z.infer<typeof RepositoryFileSchema>;
export type EvidenceReference = z.infer<typeof EvidenceReferenceSchema>;
