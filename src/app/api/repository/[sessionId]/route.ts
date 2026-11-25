import { NextResponse } from "next/server";
import { sessionStore } from "@/lib/services/session/session-store";
import { getAiProvider } from "@/lib/services/ai";
import { getCurrentUser } from "@/lib/services/auth/session";
import {
  getSessionAnalysis,
  OwnershipError,
} from "@/lib/services/persistence/persistence-service";

export async function GET(
  req: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;
  const user = await getCurrentUser();

  try {
    // 1. Try PostgreSQL persistent store first
    if (user) {
      const persistentSession = await getSessionAnalysis(sessionId, user.id);
      if (persistentSession) {
        const aiProvider = getAiProvider();
        return NextResponse.json({
          sessionId: persistentSession.sessionId,
          metadata: persistentSession.metadata,
          analysis: persistentSession.analysis,
          claims: persistentSession.claims,
          questionCount: persistentSession.questionCount,
          aiConfigured: aiProvider.isConfigured,
          aiProvider: aiProvider.type,
          aiModel: aiProvider.modelName,
        });
      }
    }

    // 2. Fallback to in-memory session (for preview / demo / dev)
    const memSession = sessionStore.getSession(sessionId);
    if (memSession) {
      const aiProvider = getAiProvider();
      return NextResponse.json({
        sessionId: memSession.id,
        metadata: memSession.metadata,
        analysis: memSession.analysis,
        claims: memSession.claims,
        questionCount: memSession.questions.length,
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
      { error: "Failed to retrieve session analysis." },
      { status: 500 }
    );
  }
}
