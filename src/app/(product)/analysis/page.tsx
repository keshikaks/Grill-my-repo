import type { Metadata } from "next";
import { PreviewBanner } from "@/components/ui/preview-banner";
import { RepoHeader } from "@/components/repository/repo-header";
import { AnalysisWorkspace } from "@/components/analysis/analysis-workspace";
import { sessionStore } from "@/lib/services/session/session-store";
import {
  SAMPLE_ANALYSIS,
  SAMPLE_CLAIMS,
  SAMPLE_REPOSITORY,
} from "@/lib/preview-data";

export const metadata: Metadata = {
  title: "Repository Analysis",
  description:
    "Inspect repository architecture, technology stack, important files, and Claims vs Reality evidence.",
};

interface AnalysisPageProps {
  searchParams: Promise<{ repo?: string; preview?: string; session?: string }>;
}

export default async function AnalysisPage({
  searchParams,
}: AnalysisPageProps) {
  const params = await searchParams;
  const sessionId = params.session?.trim() || null;
  const isPreviewParam = params.preview === "true";

  // Check if session exists in memory
  const session = sessionId ? sessionStore.getSession(sessionId) : null;

  if (session && !isPreviewParam) {
    return (
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8 animate-page-enter">
        <RepoHeader
          repository={session.metadata}
          sessionId={session.id}
          isPreview={false}
        />

        <AnalysisWorkspace
          analysis={session.analysis}
          claims={session.claims}
        />
      </main>
    );
  }

  const requestedRepo =
    typeof params.repo === "string" && params.repo.trim().length > 0
      ? params.repo.trim()
      : null;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8 animate-page-enter">
      {isPreviewParam && (
        <PreviewBanner
          title="Sample Repository Analysis"
          requestedRepo={requestedRepo}
          description="Displaying verified sample analysis data for acme-eng/pulsequeue. Submit any public GitHub repository on the homepage to cross-examine your own project."
        />
      )}

      <RepoHeader repository={SAMPLE_REPOSITORY} isPreview={true} />

      <AnalysisWorkspace analysis={SAMPLE_ANALYSIS} claims={SAMPLE_CLAIMS} />
    </main>
  );
}
