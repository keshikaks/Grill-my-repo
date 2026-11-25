import type { GitHubTreeItemSchema } from "./types";
import { z } from "zod";
import { isBinaryPath } from "../../utils/sanitizer.ts";

type GitHubTreeItem = z.infer<typeof GitHubTreeItemSchema>;

const EXCLUDED_DIR_PATTERNS = [
  /(?:^|\/)\.git\//i,
  /(?:^|\/)node_modules\//i,
  /(?:^|\/)\.next\//i,
  /(?:^|\/)dist\//i,
  /(?:^|\/)build\//i,
  /(?:^|\/)out\//i,
  /(?:^|\/)target\//i,
  /(?:^|\/)vendor\//i,
  /(?:^|\/)\.?venv\//i,
  /(?:^|\/)__pycache__\//i,
  /(?:^|\/)coverage\//i,
  /(?:^|\/)\.yarn\//i,
  /(?:^|\/)\.vscode\//i,
  /(?:^|\/)\.idea\//i,
];

const EXCLUDED_FILE_PATTERNS = [
  /package-lock\.json$/i,
  /yarn\.lock$/i,
  /pnpm-lock\.yaml$/i,
  /bun\.lockb?$/i,
  /poetry\.lock$/i,
  /Cargo\.lock$/i,
  /\.min\.(js|css)$/i,
  /\.map$/i,
  /\.(png|jpe?g|gif|svg|ico|webp|mp4|webm|mp3|wav|pdf|zip|tar|gz|exe|dll|so|dylib|bin|woff2?|eot|ttf)$/i,
];

const SUPPORTED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".py",
  ".go",
  ".mod",
  ".rs",
  ".java",
  ".kt",
  ".rb",
  ".php",
  ".cs",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".sql",
  ".prisma",
  ".proto",
  ".yaml",
  ".yml",
  ".toml",
  ".md",
  ".dockerfile",
  ".sh",
  ".bash",
]);

const SPECIAL_FILES = new Set([
  "dockerfile",
  "makefile",
  "gemfile",
  "procfile",
  ".env.example",
  "go.mod",
  "go.sum",
]);

export function isInspectableFile(item: GitHubTreeItem): boolean {
  if (item.type !== "blob") return false;

  const path = item.path;

  // 1. Immediately reject known binary file extensions
  if (isBinaryPath(path)) return false;

  for (const pattern of EXCLUDED_DIR_PATTERNS) {
    if (pattern.test(path)) return false;
  }

  for (const pattern of EXCLUDED_FILE_PATTERNS) {
    if (pattern.test(path)) return false;
  }

  const basename = path.split("/").pop()?.toLowerCase() ?? "";
  if (SPECIAL_FILES.has(basename)) return true;

  const dotIdx = basename.lastIndexOf(".");
  if (dotIdx === -1) return false;

  const ext = basename.slice(dotIdx);
  return SUPPORTED_EXTENSIONS.has(ext);
}

function computeFilePriority(path: string): number {
  const lower = path.toLowerCase();
  const basename = lower.split("/").pop() ?? "";

  // Tier 1: Documentation & Core manifest/config files
  if (basename === "readme.md" || basename === "readme") return 1000;
  if (
    basename === "package.json" ||
    basename === "tsconfig.json" ||
    basename === "requirements.txt" ||
    basename === "pyproject.toml" ||
    basename === "go.mod" ||
    basename === "cargo.toml" ||
    basename === "pom.xml" ||
    basename === "dockerfile" ||
    basename === "docker-compose.yml" ||
    basename === "schema.prisma"
  ) {
    return 900;
  }

  // Tier 2: Entry points & server bootstraps
  if (
    basename === "server.ts" ||
    basename === "server.js" ||
    basename === "app.ts" ||
    basename === "app.js" ||
    basename === "main.py" ||
    basename === "main.go" ||
    basename === "main.rs" ||
    basename === "index.ts" ||
    basename === "index.js"
  ) {
    return 800;
  }

  // Tier 3: Security, auth, permissions
  if (
    lower.includes("auth") ||
    lower.includes("security") ||
    lower.includes("crypto") ||
    lower.includes("middleware")
  ) {
    return 750;
  }

  // Tier 4: Routes, controllers, API endpoints
  if (
    lower.includes("route") ||
    lower.includes("controller") ||
    lower.includes("api/") ||
    lower.includes("handler") ||
    lower.includes("endpoints")
  ) {
    return 700;
  }

  // Tier 5: Database, migrations, schemas, queries
  if (
    lower.includes("db/") ||
    lower.includes("database") ||
    lower.includes("migration") ||
    lower.includes("schema") ||
    lower.includes("model") ||
    lower.includes("repository")
  ) {
    return 650;
  }

  // Tier 6: Services, queue, background workers
  if (
    lower.includes("service") ||
    lower.includes("worker") ||
    lower.includes("queue") ||
    lower.includes("job") ||
    lower.includes("consumer")
  ) {
    return 600;
  }

  // Tier 7: Core logic / lib / domain
  if (
    lower.includes("src/") ||
    lower.includes("lib/") ||
    lower.includes("core/") ||
    lower.includes("domain/")
  ) {
    return 400;
  }

  // Tier 8: Tests & utilities
  if (
    lower.includes("test") ||
    lower.includes("spec") ||
    lower.includes("util") ||
    lower.includes("helper")
  ) {
    return 200;
  }

  return 100;
}

export interface FileSelectionOptions {
  maxFiles?: number;
  maxIndividualSizeBytes?: number;
  maxTotalSizeBytes?: number;
}

export function selectPriorityFiles(
  items: GitHubTreeItem[],
  options: FileSelectionOptions = {}
): GitHubTreeItem[] {
  const maxFiles = options.maxFiles ?? 45;
  const maxIndividualBytes = options.maxIndividualSizeBytes ?? 100 * 1024; // 100 KB
  const maxTotalBytes = options.maxTotalSizeBytes ?? 600 * 1024; // 600 KB

  const inspectable = items.filter(isInspectableFile);

  const scored = inspectable.map((item) => ({
    item,
    priority: computeFilePriority(item.path),
    size: item.size ?? 0,
  }));

  // Sort by priority descending; if tied, smaller files first
  scored.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.size - b.size;
  });

  const selected: GitHubTreeItem[] = [];
  let accumulatedBytes = 0;

  for (const entry of scored) {
    if (selected.length >= maxFiles) break;

    // Skip excessively large individual files unless it's README
    const isReadme = entry.item.path.toLowerCase().endsWith("readme.md");
    if (!isReadme && entry.size > maxIndividualBytes) {
      continue;
    }

    if (accumulatedBytes + entry.size > maxTotalBytes && selected.length >= 10) {
      // If we already have at least 10 high-priority files, don't exceed total size limit
      break;
    }

    selected.push(entry.item);
    accumulatedBytes += entry.size;
  }

  return selected;
}
