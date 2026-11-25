import {
  GitHubRepoMetaSchema,
  GitHubTreeResponseSchema,
  type GitHubIngestionOptions,
  type IngestedFile,
  type RepositorySnapshot,
} from "./types.ts";
import { selectPriorityFiles } from "./file-selector.ts";
import {
  sanitizeNullBytes,
  isBinaryBuffer,
  isBinaryPath,
} from "../../utils/sanitizer.ts";

export class GitHubApiError extends Error {
  statusCode: number;
  isRateLimit: boolean;
  resetTime?: Date;

  constructor(
    message: string,
    statusCode: number,
    isRateLimit = false,
    resetTime?: Date
  ) {
    super(message);
    this.name = "GitHubApiError";
    this.statusCode = statusCode;
    this.isRateLimit = isRateLimit;
    this.resetTime = resetTime;
  }
}

export class GitHubClient {
  private token: string | undefined;

  constructor(options: { token?: string } = {}) {
    this.token = options.token ?? (process.env.GITHUB_TOKEN?.trim() || undefined);
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Grill-My-Repo/1.0",
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  private handleRateLimit(res: Response): never {
    const reset = res.headers.get("x-ratelimit-reset");
    const resetDate = reset ? new Date(parseInt(reset, 10) * 1000) : undefined;
    const resetStr = resetDate ? resetDate.toLocaleTimeString() : "soon";

    const isTokenSet = Boolean(this.token);
    const tip = isTokenSet
      ? `Rate limit reset at ${resetStr}.`
      : `Unauthenticated GitHub rate limit (60 requests/hour) reached. Set GITHUB_TOKEN in your .env file to enable 5,000 requests/hour. (Reset at ${resetStr})`;

    throw new GitHubApiError(
      `GitHub API rate limit exceeded. ${tip}`,
      res.status,
      true,
      resetDate
    );
  }

  async fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      headers: this.getHeaders(),
      cache: "no-store",
    });

    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get("x-ratelimit-remaining");
      if (remaining === "0") {
        this.handleRateLimit(res);
      }
    }

    if (res.status === 404) {
      throw new GitHubApiError(
        "Repository not found. Please ensure the repository is public and the URL is spelled correctly.",
        404
      );
    }

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      throw new GitHubApiError(
        `GitHub API error (${res.status}): ${res.statusText}. ${errorBody}`.trim(),
        res.status
      );
    }

    return (await res.json()) as T;
  }

  async fetchFileContent(
    owner: string,
    repo: string,
    path: string,
    commitSha: string
  ): Promise<string | null> {
    if (isBinaryPath(path)) {
      return null;
    }

    const url = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(commitSha)}/${path}`;

    const headers: Record<string, string> = {
      "User-Agent": "Grill-My-Repo/1.0",
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) {
        // Fallback to GitHub contents API with base64 decoding
        const apiFallbackUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(commitSha)}`;
        const metaRes = await this.fetchJson<{ content?: string; encoding?: string }>(apiFallbackUrl);
        if (metaRes.content && metaRes.encoding === "base64") {
          const buffer = Buffer.from(metaRes.content, "base64");
          if (isBinaryBuffer(buffer)) {
            return null;
          }
          return sanitizeNullBytes(buffer.toString("utf-8"));
        }
        return null;
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (isBinaryBuffer(buffer)) {
        return null;
      }
      return sanitizeNullBytes(buffer.toString("utf-8"));
    } catch {
      return null;
    }
  }

  async ingestRepository(
    owner: string,
    repo: string,
    options: GitHubIngestionOptions = {}
  ): Promise<RepositorySnapshot> {
    // 1. Fetch metadata
    const metaUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const rawMeta = await this.fetchJson<unknown>(metaUrl);
    const meta = GitHubRepoMetaSchema.parse(rawMeta);

    // 2. Fetch language breakdown
    const langUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`;
    const langRecord = await this.fetchJson<Record<string, number>>(langUrl).catch(() => ({}));

    let totalBytes = 0;
    for (const b of Object.values(langRecord)) {
      totalBytes += b;
    }

    const languages: RepositorySnapshot["languages"] = Object.entries(langRecord)
      .map(([name, bytes]) => ({
        name,
        bytes,
        percentage: totalBytes > 0 ? Math.round((bytes / totalBytes) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    if (languages.length === 0 && meta.language) {
      languages.push({ name: meta.language, percentage: 100 });
    }

    // 3. Fetch latest commit on default branch
    const branchUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(meta.default_branch)}`;
    const branchCommit = await this.fetchJson<{ sha: string }>(branchUrl);
    const commitSha = branchCommit.sha;

    // 4. Fetch git tree recursively
    const treeUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(commitSha)}?recursive=1`;
    const rawTree = await this.fetchJson<unknown>(treeUrl);
    const tree = GitHubTreeResponseSchema.parse(rawTree);

    // 5. Select priority files
    const selectedTreeItems = selectPriorityFiles(tree.tree, {
      maxFiles: options.maxFiles ?? 45,
      maxIndividualSizeBytes: options.maxIndividualSizeBytes ?? 100 * 1024,
      maxTotalSizeBytes: options.maxTotalSizeBytes ?? 600 * 1024,
    });

    // 6. Fetch file contents with concurrency limit of 6
    const files: IngestedFile[] = [];
    let readmeContent: string | null = null;
    let totalLinesOfCode = 0;

    const concurrency = 6;
    for (let i = 0; i < selectedTreeItems.length; i += concurrency) {
      const chunk = selectedTreeItems.slice(i, i + concurrency);
      const results = await Promise.all(
        chunk.map(async (item) => {
          try {
            const content = await this.fetchFileContent(owner, repo, item.path, commitSha);
            if (content === null) return null;

            const cleanPath = sanitizeNullBytes(item.path);
            const dotIdx = cleanPath.lastIndexOf(".");
            const extension = dotIdx !== -1 ? cleanPath.slice(dotIdx) : "";
            const cleanContent = sanitizeNullBytes(content);
            const lines = cleanContent.replace(/\r\n/g, "\n").split("\n").map(sanitizeNullBytes);
            const lineCount = lines.length;

            const ingested: IngestedFile = {
              path: cleanPath,
              extension,
              size: Buffer.byteLength(cleanContent, "utf-8"),
              content: cleanContent,
              lines,
              lineCount,
              sha: sanitizeNullBytes(item.sha),
            };

            return ingested;
          } catch {
            // Ensure one problematic file does not crash the entire repository analysis
            return null;
          }
        })
      );

      for (const res of results) {
        if (!res) continue;
        files.push(res);
        totalLinesOfCode += res.lineCount;

        if (res.path.toLowerCase().endsWith("readme.md") && !readmeContent) {
          readmeContent = sanitizeNullBytes(res.content);
        }
      }
    }

    // If README wasn't picked up by file selector, try fetching it directly
    if (!readmeContent) {
      try {
        const directReadme = await this.fetchFileContent(owner, repo, "README.md", commitSha);
        if (directReadme) {
          readmeContent = sanitizeNullBytes(directReadme);
        }
      } catch {
        readmeContent = null;
      }
    }

    // Detect basic frameworks from manifests
    const frameworks = detectBasicFrameworks(files);

    return {
      owner: sanitizeNullBytes(meta.owner.login),
      name: sanitizeNullBytes(meta.name),
      fullName: sanitizeNullBytes(meta.full_name),
      htmlUrl: sanitizeNullBytes(meta.html_url),
      description: sanitizeNullBytes(meta.description ?? "No repository description provided."),
      defaultBranch: sanitizeNullBytes(meta.default_branch),
      commitSha: sanitizeNullBytes(commitSha),
      languages: languages.length > 0 ? languages : [{ name: "Other", percentage: 100 }],
      frameworks,
      readmeContent: readmeContent ? sanitizeNullBytes(readmeContent) : null,
      files,
      totalFileCount: tree.tree.filter((t) => t.type === "blob").length,
      inspectedFileCount: files.length,
      totalLinesOfCode,
      treeTruncated: tree.truncated,
      ingestedAt: new Date().toISOString(),
    };
  }
}

function detectBasicFrameworks(files: IngestedFile[]): string[] {
  const frameworks = new Set<string>();

  for (const file of files) {
    const lowerPath = file.path.toLowerCase();
    const content = file.content;

    if (lowerPath === "package.json") {
      try {
        const pkg = JSON.parse(content);
        const allDeps = {
          ...pkg.dependencies,
          ...pkg.devDependencies,
        };

        if (allDeps["next"]) frameworks.add("Next.js");
        if (allDeps["react"]) frameworks.add("React");
        if (allDeps["vue"]) frameworks.add("Vue.js");
        if (allDeps["@angular/core"]) frameworks.add("Angular");
        if (allDeps["express"]) frameworks.add("Express");
        if (allDeps["fastify"]) frameworks.add("Fastify");
        if (allDeps["nest.js"] || allDeps["@nestjs/core"]) frameworks.add("NestJS");
        if (allDeps["tailwindcss"]) frameworks.add("Tailwind CSS");
        if (allDeps["prisma"] || allDeps["@prisma/client"]) frameworks.add("Prisma");
        if (allDeps["drizzle-orm"]) frameworks.add("Drizzle");
        if (allDeps["ioredis"] || allDeps["redis"]) frameworks.add("Redis");
        if (allDeps["pg"]) frameworks.add("PostgreSQL");
        if (allDeps["zod"]) frameworks.add("Zod");
        if (allDeps["vitest"]) frameworks.add("Vitest");
        if (allDeps["jest"]) frameworks.add("Jest");
      } catch {
        // ignore parse error
      }
    }

    if (lowerPath === "requirements.txt" || lowerPath === "pyproject.toml") {
      if (content.includes("fastapi")) frameworks.add("FastAPI");
      if (content.includes("django")) frameworks.add("Django");
      if (content.includes("flask")) frameworks.add("Flask");
      if (content.includes("sqlalchemy")) frameworks.add("SQLAlchemy");
      if (content.includes("pytest")) frameworks.add("Pytest");
      if (content.includes("celery")) frameworks.add("Celery");
    }

    if (lowerPath === "go.mod") {
      if (content.includes("gin-gonic")) frameworks.add("Gin");
      if (content.includes("fiber")) frameworks.add("Fiber");
      if (content.includes("gorm")) frameworks.add("GORM");
    }

    if (lowerPath === "cargo.toml") {
      if (content.includes("actix-web")) frameworks.add("Actix-web");
      if (content.includes("axum")) frameworks.add("Axum");
      if (content.includes("tokio")) frameworks.add("Tokio");
      if (content.includes("diesel")) frameworks.add("Diesel");
    }
  }

  return Array.from(frameworks);
}
