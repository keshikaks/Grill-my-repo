import { z } from "zod";

const GITHUB_OWNER_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
const GITHUB_REPO_REGEX = /^[a-zA-Z0-9._-]{1,100}$/;

const RESERVED_OWNER_SEGMENTS = new Set([
  "features",
  "explore",
  "topics",
  "collections",
  "events",
  "sponsors",
  "settings",
  "notifications",
  "marketplace",
  "pricing",
  "login",
  "signup",
  "orgs",
  "search",
]);

export interface ParsedGitHubRepoUrl {
  owner: string;
  name: string;
  normalizedUrl: string;
  fullName: string;
}

export function parseGitHubRepoUrl(rawInput: string): ParsedGitHubRepoUrl | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  let candidate = trimmed;
  if (/^github\.com\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  if (host !== "github.com" && host !== "www.github.com") {
    return null;
  }

  const segments = parsed.pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length < 2) {
    return null;
  }

  const rawOwner = segments[0];
  const rawRepo = segments[1];
  if (!rawOwner || !rawRepo) {
    return null;
  }

  const repoName = rawRepo.replace(/\.git$/i, "");

  if (RESERVED_OWNER_SEGMENTS.has(rawOwner.toLowerCase())) {
    return null;
  }

  if (!GITHUB_OWNER_REGEX.test(rawOwner) || !GITHUB_REPO_REGEX.test(repoName)) {
    return null;
  }

  if (repoName === "." || repoName === "..") {
    return null;
  }

  return {
    owner: rawOwner,
    name: repoName,
    normalizedUrl: `https://github.com/${rawOwner}/${repoName}`,
    fullName: `${rawOwner}/${repoName}`,
  };
}

export const GitHubRepoUrlInputSchema = z
  .string()
  .trim()
  .min(1, "Enter a public GitHub repository URL to get started.")
  .max(300, "Repository URL is too long.")
  .refine(
    (value) => {
      try {
        const candidate = /^github\.com\//i.test(value) ? `https://${value}` : value;
        const url = new URL(candidate);
        const host = url.hostname.toLowerCase();
        return host === "github.com" || host === "www.github.com";
      } catch {
        return false;
      }
    },
    {
      message: "Enter a valid GitHub URL (for example: https://github.com/owner/repository).",
    }
  )
  .refine((value) => parseGitHubRepoUrl(value) !== null, {
    message:
      "URL must point to a public repository in the format https://github.com/owner/repository.",
  });

export function validateGitHubRepoUrl(
  rawInput: string
):
  | { success: true; data: ParsedGitHubRepoUrl }
  | { success: false; error: string } {
  const result = GitHubRepoUrlInputSchema.safeParse(rawInput);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Enter a valid public GitHub repository URL.",
    };
  }

  const parsed = parseGitHubRepoUrl(result.data);
  if (!parsed) {
    return {
      success: false,
      error: "Unable to parse repository owner and name from URL.",
    };
  }

  return { success: true, data: parsed };
}
