import type { Metadata } from "next";
import { PreviewBanner } from "@/components/ui/preview-banner";
import { GrillRoomWorkspace } from "@/components/grill/grill-room-workspace";
import { sessionStore } from "@/lib/services/session/session-store";
import { getAiProvider } from "@/lib/services/ai";
import { SAMPLE_GRILL_QUESTIONS, SAMPLE_REPOSITORY } from "@/lib/preview-data";

export const metadata: Metadata = {
  title: "Grill Room",
  description:
    "Interactive technical defence session with pinned repository source code and expected engineering rubrics.",
};

interface GrillRoomPageProps {
  searchParams: Promise<{ session?: string; preview?: string }>;
}

export default async function GrillRoomPage({
  searchParams,
}: GrillRoomPageProps) {
  const params = await searchParams;
  const sessionId = params.session?.trim() || null;
  const isPreviewParam = params.preview === "true";

  const session = sessionId ? sessionStore.getSession(sessionId) : null;
  const aiProvider = getAiProvider();

  if (session && !isPreviewParam) {
    const fullName = `${session.metadata.owner}/${session.metadata.name}`;
    const aiNote = aiProvider.isConfigured
      ? `AI Grilling Engine: ${aiProvider.type} (${aiProvider.modelName})`
      : "Heuristic Grilling Engine (Configure AI_API_KEY for live LLM)";

    return (
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8 animate-page-enter">
        <PreviewBanner
          title={`Grill Room — Live Defence for ${fullName}`}
          description={`Defend your architecture across ${session.questions.length} questions grounded in real source files. ${aiNote}.`}
        />

        <GrillRoomWorkspace
          sessionId={session.id}
          repositoryFullName={fullName}
          questions={session.questions}
          initialAnswers={session.answers}
          initialEvaluations={session.evaluations}
          initialFollowUps={session.followUps}
        />
      </main>
    );
  }

  const fullName = `${SAMPLE_REPOSITORY.owner}/${SAMPLE_REPOSITORY.name}`;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8 animate-page-enter">
      <PreviewBanner
        title="Grill Room — Interactive Design Preview"
        description="Practice defending 5 repository-specific questions for acme-eng/pulsequeue. Submitting records your draft locally and unlocks expected concepts; submit a public repository on the home page for live grilling."
      />

      <GrillRoomWorkspace
        repositoryFullName={fullName}
        questions={SAMPLE_GRILL_QUESTIONS}
      />
    </main>
  );
}
