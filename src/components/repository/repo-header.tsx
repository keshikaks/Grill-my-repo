import Link from "next/link";
import {
  ArrowRight,
  FileCode2,
  GitBranch,
  GitCommitHorizontal,
  Layers,
  Sparkles,
} from "lucide-react";
import type { RepositoryMetadata } from "@/lib/contracts/repository";
import { formatShortSha, formatTimestamp } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface RepoHeaderProps {
  repository: RepositoryMetadata;
  sessionId?: string;
  isPreview?: boolean;
}

const LANGUAGE_SWATCH_CLASSES = [
  "bg-accent",
  "bg-info",
  "bg-success",
  "bg-warning",
];

export function RepoHeader({
  repository,
  sessionId,
  isPreview = true,
}: RepoHeaderProps) {
  const grillUrl = sessionId ? `/grill?session=${encodeURIComponent(sessionId)}` : "/grill";
  const reportUrl = sessionId ? `/report?session=${encodeURIComponent(sessionId)}` : "/report";

  return (
    <Card elevated className="border-[#E2DDD3] bg-surface">
      <CardContent className="space-y-5 pt-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted">
                {repository.owner} /
              </span>
              <h1 className="font-mono text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {repository.name}
              </h1>
              <Badge variant={isPreview ? "default" : "accent"}>
                {isPreview ? "Public · Sample Preview" : "Live GitHub Analysis"}
              </Badge>
            </div>
            <p className="max-w-3xl text-sm leading-relaxed text-muted">
              {repository.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href={grillUrl}
              className={buttonClassName({ variant: "primary", size: "md", className: "gap-1.5" })}
            >
              <Sparkles className="h-4 w-4" />
              <span>Practice Interview</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={reportUrl}
              className={buttonClassName({ variant: "secondary", size: "md" })}
            >
              My Feedback
            </Link>
          </div>
        </div>

        {/* Metadata strip */}
        <div className="grid gap-3 border-y border-border py-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-2 text-muted">
            <GitBranch className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            <span>Branch:</span>
            <span className="font-mono font-medium text-foreground">
              {repository.defaultBranch}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted">
            <GitCommitHorizontal
              className="h-3.5 w-3.5 text-accent"
              aria-hidden="true"
            />
            <span>Commit:</span>
            <span className="font-mono font-medium text-foreground">
              {formatShortSha(repository.commitSha)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted">
            <FileCode2 className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            <span>Inspected:</span>
            <span className="font-mono font-medium text-foreground">
              {repository.inspectedFileCount ?? 0} files ·{" "}
              {(repository.totalLinesOfCode ?? 0).toLocaleString()} LOC
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted">
            <Layers className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            <span>Analyzed:</span>
            <span className="font-medium text-foreground">
              {repository.analyzedAt ? formatTimestamp(repository.analyzedAt) : "Recent"}
            </span>
          </div>
        </div>

        {/* Language distribution bar */}
        {repository.languages.length > 0 && (
          <div className="space-y-2">
            <div
              className="flex h-2 w-full overflow-hidden rounded-full bg-subtle"
              role="progressbar"
              aria-label="Language distribution"
            >
              {repository.languages.map((lang, idx) => (
                <div
                  key={lang.name}
                  className={`${LANGUAGE_SWATCH_CLASSES[idx % LANGUAGE_SWATCH_CLASSES.length]}`}
                  style={{ width: `${lang.percentage}%` }}
                  title={`${lang.name}: ${lang.percentage}%`}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
              {repository.languages.map((lang, idx) => (
                <span key={lang.name} className="flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${LANGUAGE_SWATCH_CLASSES[idx % LANGUAGE_SWATCH_CLASSES.length]}`}
                    aria-hidden="true"
                  />
                  <span className="font-medium text-foreground">{lang.name}</span>
                  <span className="font-mono text-[11px] text-muted">
                    {lang.percentage}%
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
