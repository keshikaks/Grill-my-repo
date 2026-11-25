import { z } from "zod";

export const GitHubRepoMetaSchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  owner: z.object({
    login: z.string(),
    avatar_url: z.string().optional(),
  }),
  private: z.boolean(),
  html_url: z.string(),
  description: z.string().nullable().default(""),
  default_branch: z.string().default("main"),
  stargazers_count: z.number().default(0),
  forks_count: z.number().default(0),
  open_issues_count: z.number().default(0),
  language: z.string().nullable().default(null),
  topics: z.array(z.string()).default([]),
  created_at: z.string(),
  updated_at: z.string(),
  pushed_at: z.string(),
  size: z.number().default(0), // KB
});

export const GitHubTreeItemSchema = z.object({
  path: z.string(),
  mode: z.string(),
  type: z.enum(["blob", "tree", "commit"]),
  sha: z.string(),
  size: z.number().optional(),
  url: z.string().optional(),
});

export const GitHubTreeResponseSchema = z.object({
  sha: z.string(),
  url: z.string(),
  tree: z.array(GitHubTreeItemSchema),
  truncated: z.boolean().default(false),
});

export interface IngestedFile {
  path: string;
  extension: string;
  size: number;
  content: string;
  lines: string[];
  lineCount: number;
  sha: string;
}

export interface RepositorySnapshot {
  owner: string;
  name: string;
  fullName: string;
  htmlUrl: string;
  description: string;
  defaultBranch: string;
  commitSha: string;
  languages: { name: string; percentage: number; bytes?: number }[];
  frameworks: string[];
  readmeContent: string | null;
  files: IngestedFile[];
  totalFileCount: number;
  inspectedFileCount: number;
  totalLinesOfCode: number;
  treeTruncated: boolean;
  ingestedAt: string;
}

export interface GitHubIngestionOptions {
  token?: string;
  maxFiles?: number;
  maxIndividualSizeBytes?: number;
  maxTotalSizeBytes?: number;
}
