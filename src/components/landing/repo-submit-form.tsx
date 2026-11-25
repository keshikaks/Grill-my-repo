"use client";

import { useState, useEffect, Suspense, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  GitBranch,
  Loader2,
  Lock,
} from "lucide-react";
import { analyzeRepositoryApi } from "@/lib/contracts";
import { validateGitHubRepoUrl } from "@/lib/validation/github-url";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

interface RepoSubmitFormProps {
  idPrefix?: string;
}

function RepoSubmitFormInner({ idPrefix = "hero" }: RepoSubmitFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notify } = useToast();

  const [repoUrl, setRepoUrl] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState<string>("");

  const [rateLimitInfo, setRateLimitInfo] = useState<{
    message: string;
    resetTime?: string;
  } | null>(null);

  const [authRequiredOpen, setAuthRequiredOpen] = useState(false);

  // Pre-fill repo from query param if returning from login
  useEffect(() => {
    const prefill = searchParams.get("repo");
    if (prefill) {
      setRepoUrl(prefill);
    }
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateGitHubRepoUrl(repoUrl);
    if (!validation.success) {
      setError(validation.error);
      notify({
        title: "Invalid repository URL",
        description: validation.error,
        tone: "error",
      });
      return;
    }

    setError(undefined);
    setRateLimitInfo(null);
    setAuthRequiredOpen(false);
    setLoading(true);
    setProgressStep("Connecting to GitHub and reading files safely...");

    try {
      const stepTimer1 = setTimeout(() => {
        setProgressStep("Understanding project architecture and technologies...");
      }, 1200);

      const stepTimer2 = setTimeout(() => {
        setProgressStep("Checking README claims and preparing interview questions...");
      }, 2600);

      const result = await analyzeRepositoryApi(validation.data.normalizedUrl);

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      notify({
        title: `Ingested ${result.metadata.owner}/${result.metadata.name}`,
        description: `Inspected ${result.metadata.inspectedFileCount} files and prepared ${result.questionCount} interview questions.`,
        tone: "success",
      });

      router.push(`/analysis?session=${encodeURIComponent(result.sessionId)}`);
    } catch (err: unknown) {
      setLoading(false);
      const errMsg = err instanceof Error ? err.message : "Failed to analyze repository.";

      if (
        errMsg.toLowerCase().includes("authentication required") ||
        errMsg.toLowerCase().includes("unauthorized") ||
        errMsg.toLowerCase().includes("please sign in") ||
        errMsg.toLowerCase().includes("log in")
      ) {
        setAuthRequiredOpen(true);
        return;
      }

      if (errMsg.toLowerCase().includes("rate limit") || errMsg.toLowerCase().includes("403")) {
        setRateLimitInfo({
          message:
            "GitHub's public API rate limit was reached. You can explore the full interview workflow with our sample repository or add a GITHUB_TOKEN.",
        });
        return;
      }

      setError(errMsg);
      notify({
        title: "Analysis Error",
        description: errMsg,
        tone: "error",
      });
    }
  }

  function handleOpenSamplePreview() {
    setAuthRequiredOpen(false);
    setRateLimitInfo(null);
    router.push("/analysis?preview=true");
  }

  const redirectUrl = repoUrl ? `/?repo=${encodeURIComponent(repoUrl)}` : "/";

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Input
              id={`${idPrefix}-repo-url`}
              type="url"
              value={repoUrl}
              onChange={(event) => {
                setRepoUrl(event.target.value);
                if (error) setError(undefined);
                if (rateLimitInfo) setRateLimitInfo(null);
              }}
              placeholder="https://github.com/owner/repository"
              aria-label="Public GitHub repository URL"
              leadingIcon={<GitBranch className="h-4 w-4" />}
              error={error}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            loading={loading}
            className="sm:w-auto shrink-0 shadow-xs"
          >
            <span>Analyse my repository</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Live progress indicator during real GitHub ingestion */}
        {loading && (
          <div className="flex items-center gap-2.5 rounded-lg border border-accent/30 bg-accent-soft p-3 text-xs text-accent-text">
            <Loader2 className="h-4 w-4 animate-spin shrink-0 text-accent" />
            <span className="font-medium">{progressStep}</span>
          </div>
        )}
      </form>

      {/* Authentication Required Dialog */}
      <Dialog
        open={authRequiredOpen}
        onClose={() => setAuthRequiredOpen(false)}
        title="Sign in Required"
        description="Please sign in or create an account to save your interview practice sessions and feedback."
        footer={
          <div className="flex w-full flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
            <Button
              variant="secondary"
              onClick={handleOpenSamplePreview}
            >
              <span>Explore Demo Preview</span>
            </Button>
            <Link
              href={`/login?redirect=${encodeURIComponent(redirectUrl)}`}
              className={buttonClassName({ variant: "outline" })}
            >
              Sign In
            </Link>
            <Link
              href={`/register?redirect=${encodeURIComponent(redirectUrl)}`}
              className={buttonClassName({ variant: "primary" })}
            >
              Create Account
            </Link>
          </div>
        }
      >
        <div className="space-y-4 text-sm text-muted">
          <div className="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent-soft p-3.5">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-foreground">
                Save Your Interview Preparation
              </p>
              <p className="leading-relaxed">
                An account keeps your repository analyses, practice questions, and personalised report cards securely saved so you can revisit them anytime before your viva or placement interview.
              </p>
            </div>
          </div>
          <p className="text-xs leading-relaxed">
            Free accounts give you full access to repository breakdowns, one-by-one interview practice, and model answers.
          </p>
        </div>
      </Dialog>

      {/* Rate Limit Notice Dialog */}
      <Dialog
        open={Boolean(rateLimitInfo)}
        onClose={() => setRateLimitInfo(null)}
        title="GitHub API Rate Limit"
        description="Public unauthenticated requests are rate-limited by GitHub"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setRateLimitInfo(null)}
            >
              Dismiss
            </Button>
            <Button variant="primary" onClick={handleOpenSamplePreview}>
              <span>Explore Demo Preview</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm text-muted">
          <div className="flex items-start gap-3 rounded-lg border border-warning-border bg-warning-soft p-3.5">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-warning-text"
              aria-hidden="true"
            />
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-foreground">
                GitHub rate limit reached
              </p>
              <p className="leading-relaxed">
                {rateLimitInfo?.message}
              </p>
            </div>
          </div>

          <p className="text-xs leading-relaxed">
            GitHub limits anonymous requests to 60 per hour per IP. You can explore the complete walkthrough using the sample repository below, or add a <code className="font-mono text-foreground">GITHUB_TOKEN</code> to increase limits.
          </p>
        </div>
      </Dialog>
    </>
  );
}

export function RepoSubmitForm(props: RepoSubmitFormProps) {
  return (
    <Suspense fallback={<div className="h-10 animate-pulse rounded-lg bg-subtle" />}>
      <RepoSubmitFormInner {...props} />
    </Suspense>
  );
}
