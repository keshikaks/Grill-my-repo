"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GitBranch,
  Trash2,
  Plus,
  Clock,
  FileText,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button, buttonClassName } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

export interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
  };
  stats: {
    totalRepositories: number;
    totalSessions: number;
    averageScore: number;
  };
  recentRepositories: Array<{
    id: string;
    name: string;
    owner: string;
    githubUrl: string;
    language: string | null;
    updatedAt: string;
    latestSessionId: string | null;
  }>;
  recentSessions: Array<{
    id: string;
    repoName: string;
    owner: string;
    status: string;
    progress: number;
    totalQuestions: number;
    score: number | null;
    updatedAt: string;
  }>;
  recentReports: Array<{
    id: string;
    sessionId: string;
    repoName: string;
    owner: string;
    score: number;
    createdAt: string;
  }>;
}

export function DashboardView({ initialData }: { initialData: DashboardData }) {
  const router = useRouter();
  const { notify } = useToast();

  const [data, setData] = useState<DashboardData>(initialData);
  const [repoToDelete, setRepoToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDeleteRepository() {
    if (!repoToDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/repository/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repositoryId: repoToDelete.id }),
      });

      const resData = await res.json().catch(() => ({}));
      setIsDeleting(false);

      if (!res.ok) {
        notify({
          title: "Failed to delete repository",
          description: resData.error || "An error occurred while deleting.",
          tone: "error",
        });
        return;
      }

      notify({
        title: "Repository removed",
        description: `Successfully removed ${repoToDelete.name}.`,
        tone: "success",
      });

      setData((prev) => ({
        ...prev,
        stats: {
          ...prev.stats,
          totalRepositories: Math.max(0, prev.stats.totalRepositories - 1),
        },
        recentRepositories: prev.recentRepositories.filter((r) => r.id !== repoToDelete.id),
      }));

      setRepoToDelete(null);
      router.refresh();
    } catch {
      setIsDeleting(false);
      notify({
        title: "Network error",
        description: "Failed to reach server. Please try again.",
        tone: "error",
      });
    }
  }

  const hasRepositories = data.recentRepositories.length > 0;
  const hasReports = data.recentReports.length > 0;
  const latestSession = data.recentRepositories[0]?.latestSessionId;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-page-enter">
      {/* 1. Header & Welcome Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#EAE5DC] pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            My Learning Dashboard
          </h1>
          <p className="text-sm text-muted">
            Welcome back, <span className="font-semibold text-foreground">{data.user.name}</span>. Your project analysis and interview preparation history.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className={buttonClassName({ variant: "primary", size: "md", className: "gap-2 shadow-xs shrink-0" })}
          >
            <Plus className="h-4 w-4" />
            <span>Analyse New Repository</span>
          </Link>
        </div>
      </div>

      {/* 2. Key Metrics & Continue Preparation */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Repositories Analysed */}
        <div className="rounded-2xl border border-[#DCD6CA] bg-surface p-5 space-y-1 shadow-xs">
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">
            Repositories Analysed
          </p>
          <p className="font-mono text-3xl font-bold text-foreground">
            {data.stats.totalRepositories}
          </p>
          <p className="text-xs text-muted">Active projects in your workspace</p>
        </div>

        {/* Sessions Completed */}
        <div className="rounded-2xl border border-[#DCD6CA] bg-surface p-5 space-y-1 shadow-xs">
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">
            Sessions Completed
          </p>
          <p className="font-mono text-3xl font-bold text-foreground">
            {data.stats.totalSessions}
          </p>
          <p className="text-xs text-muted">Interview viva sessions taken</p>
        </div>

        {/* Learning Progress / Readiness */}
        <div className="rounded-2xl border border-[#DCD6CA] bg-surface p-5 space-y-1 shadow-xs">
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">
            Average Readiness
          </p>
          <p className="font-mono text-3xl font-bold text-accent">
            {data.stats.averageScore > 0 ? `${data.stats.averageScore}%` : "—"}
          </p>
          <p className="text-xs text-muted">
            {data.stats.averageScore >= 80 ? "Interview Ready" : data.stats.averageScore >= 60 ? "Solid Foundation" : "In Progress"}
          </p>
        </div>

        {/* Continue Preparation CTA Card */}
        <div className="rounded-2xl border border-accent/30 bg-accent-soft p-5 flex flex-col justify-between space-y-3 shadow-xs">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
              Continue Preparation
            </p>
            <p className="text-xs text-muted leading-relaxed mt-1">
              {latestSession ? "Resume your active interview practice session." : "Submit your repository to begin."}
            </p>
          </div>
          <Link
            href={latestSession ? `/grill?session=${encodeURIComponent(latestSession)}` : "/"}
            className={buttonClassName({ variant: "primary", size: "sm", className: "w-full gap-1.5 justify-center" })}
          >
            <span>{latestSession ? "Resume Practice" : "Start New Analysis"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* 3. Repositories Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold tracking-tight text-foreground">
            Your Analysed Repositories
          </h2>
          {hasRepositories && (
            <span className="text-xs text-muted font-mono">
              {data.recentRepositories.length} repositories
            </span>
          )}
        </div>

        {!hasRepositories ? (
          <div className="rounded-2xl border border-dashed border-[#DCD6CA] bg-surface/50 p-10 text-center space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-subtle text-muted">
              <GitBranch className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">No repositories analysed yet</h3>
              <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                Submit any public GitHub repository to examine architecture, check README claims, and practice viva defence questions.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/"
                className={buttonClassName({ variant: "primary", size: "sm", className: "gap-1.5" })}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Analyse Your First Repository</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.recentRepositories.map((repo) => (
              <div
                key={repo.id}
                className="flex flex-col justify-between rounded-2xl border border-[#DCD6CA] bg-surface p-5 shadow-xs transition-colors hover:border-[#CDC5B7]"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11px] font-mono text-muted block truncate">
                        {repo.owner} /
                      </span>
                      <h3 className="text-sm font-bold text-foreground truncate">
                        {repo.name}
                      </h3>
                    </div>
                    {repo.language && (
                      <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                        {repo.language}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>Updated {new Date(repo.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-[#EAE5DC] pt-3">
                  <div className="flex items-center gap-2">
                    {repo.latestSessionId && (
                      <>
                        <Link
                          href={`/analysis?session=${encodeURIComponent(repo.latestSessionId)}`}
                          className={buttonClassName({ variant: "secondary", size: "sm", className: "h-7 text-xs px-2.5" })}
                        >
                          Analysis
                        </Link>
                        <Link
                          href={`/grill?session=${encodeURIComponent(repo.latestSessionId)}`}
                          className={buttonClassName({ variant: "primary", size: "sm", className: "h-7 text-xs px-2.5 gap-1" })}
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>Practice</span>
                        </Link>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setRepoToDelete({ id: repo.id, name: `${repo.owner}/${repo.name}` })}
                    className="p-1.5 text-muted hover:text-error-text transition-colors rounded-md hover:bg-error-soft cursor-pointer"
                    title={`Delete ${repo.name}`}
                    aria-label={`Delete ${repo.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Recent Reports Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold tracking-tight text-foreground">
            Interview Readiness Reports
          </h2>
          {hasReports && (
            <span className="text-xs text-muted font-mono">
              {data.recentReports.length} completed
            </span>
          )}
        </div>

        {!hasReports ? (
          <div className="rounded-2xl border border-dashed border-[#DCD6CA] bg-surface/50 p-8 text-center">
            <p className="text-xs text-muted leading-relaxed max-w-sm mx-auto">
              No interview report cards generated yet. Complete questions in the Grill Room to generate your first feedback report card.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.recentReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#DCD6CA] bg-surface p-4 shadow-xs"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-accent shrink-0" />
                    <span className="text-sm font-bold text-foreground truncate">
                      {report.owner}/{report.repoName}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="font-mono text-sm font-bold text-foreground">
                    {report.score}/100
                  </span>
                  <Link
                    href={`/report?session=${encodeURIComponent(report.sessionId)}`}
                    className={buttonClassName({ variant: "outline", size: "sm", className: "h-7 text-xs px-2.5" })}
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(repoToDelete)}
        onClose={() => setRepoToDelete(null)}
        title="Remove Repository"
        description={`Are you sure you want to remove ${repoToDelete?.name}?`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setRepoToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteRepository}
              loading={isDeleting}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="text-xs text-muted leading-relaxed">
          This will permanently delete the ingested repository snapshot, analyses, and past interview sessions for this repository.
        </p>
      </Dialog>
    </div>
  );
}
