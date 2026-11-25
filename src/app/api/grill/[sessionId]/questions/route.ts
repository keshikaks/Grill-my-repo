import { NextResponse } from "next/server";
import { sessionStore } from "@/lib/services/session/session-store";
import { getAiProvider } from "@/lib/services/ai";
import { getCurrentUser } from "@/lib/services/auth/session";
import {
  getSessionQuestions,
  OwnershipError,
} from "@/lib/services/persistence/persistence-service";

export async function GET(
  req: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;
  const user = await getCurrentUser();

  try {
    // 1. Check PostgreSQL first
    if (user) {
      const dbQuestions = await getSessionQuestions(sessionId, user.id);
      if (dbQuestions) {
        const aiProvider = getAiProvider();
        return NextResponse.json({
          sessionId: dbQuestions.sessionId,
          questions: dbQuestions.questions,
          answers: dbQuestions.answers,
          evaluations: dbQuestions.evaluations,
          followUps: {},
          aiConfigured: aiProvider.isConfigured,
          aiProvider: aiProvider.type,
          aiModel: aiProvider.modelName,
        });
      }
    }

    // 2. Fallback to memory store
    const session = sessionStore.getSession(sessionId);
    if (session) {
      const aiProvider = getAiProvider();
      return NextResponse.json({
        sessionId: session.id,
        repositoryFullName: `${session.metadata.owner}/${session.metadata.name}`,
        questions: session.questions,
        answers: session.answers,
        evaluations: session.evaluations,
        followUps: session.followUps,
        aiConfigured: aiProvider.isConfigured,
        aiProvider: aiProvider.type,
        aiModel: aiProvider.modelName,
      });
    }

    return NextResponse.json(
      { error: "Session not found or expired. Please submit repository again." },
      { status: 404 }
    );
  } catch (err) {
    if (err instanceof OwnershipError) {
      return NextResponse.json(
        { error: "Session not found or access denied." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to retrieve questions." },
      { status: 500 }
    );
  }
}
