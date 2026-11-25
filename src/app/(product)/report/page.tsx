import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, ArrowRight } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { ReportWorkspace } from "@/components/report/report-workspace";
import { sessionStore } from "@/lib/services/session/session-store";
import { SAMPLE_REPORT, SAMPLE_REPOSITORY } from "@/lib/preview-data";

export const metadata: Metadata = {
  title: "Final Report Card",
  description:
    "Structured project defence report card with rubric scores, strengths, gaps, question results, and revision topics.",
};

interface ReportPageProps {
  searchParams: Promise<{ session?: string; preview?: string }>;
}

export default async function ReportPage({
  searchParams,
}: ReportPageProps) {
  const params = await searchParams;
  const sessionId = params.session?.trim() || null;
  const isPreviewParam = params.preview === "true";

  const session = sessionId ? sessionStore.getSession(sessionId) : null;

  if (session && !isPreviewParam) {
    const fullName = `${session.metadata.owner}/${session.metadata.name}`;
    const answeredCount = Object.keys(session.answers).length;
    const totalQuestions = session.questions.length;

    if (answeredCount === 0) {
      return (
        <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 animate-page-enter">
          <div className="rounded-2xl border border-border bg-surface/70 p-12 text-center max-w-xl mx-auto space-y-4 shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-accent/30 bg-accent-soft text-accent">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                No Questions Answered Yet
              </h1>
              <p className="text-sm text-muted leading-relaxed">
                Your performance report card is generated after cross-examining implementation decisions in the Grill Room. You have not submitted any answers for <span className="font-mono text-foreground font-medium">{fullName}</span> yet.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href={`/grill?session=${encodeURIComponent(session.id)}`}
                className={buttonClassName({ variant: "primary", size: "md", className: "gap-2" })}
              >
                <span>Start Interview Practice</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </main>
      );
    }

    const report = sessionStore.generateOrGetReport(session.id);

    if (report) {
      return (
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8 animate-page-enter">
          <ReportWorkspace
            sessionId={session.id}
            repositoryFullName={fullName}
            report={report}
            isIncomplete={answeredCount < totalQuestions}
            answeredCount={answeredCount}
            totalQuestions={totalQuestions}
          />
        </main>
      );
    }
  }

  const fullName = `${SAMPLE_REPOSITORY.owner}/${SAMPLE_REPOSITORY.name}`;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8 animate-page-enter">
      <ReportWorkspace
        repositoryFullName={fullName}
        report={SAMPLE_REPORT}
      />
    </main>
  );
}
