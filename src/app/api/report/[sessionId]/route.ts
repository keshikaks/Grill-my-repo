import { NextResponse } from "next/server";
import { sessionStore } from "@/lib/services/session/session-store";
import { getCurrentUser } from "@/lib/services/auth/session";
import {
  getSessionReport,
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
    // 1. Try DB first
    if (user) {
      const report = await getSessionReport(sessionId, user.id);
      if (report) {
        const sessionMeta = await getSessionAnalysis(sessionId, user.id);
        return NextResponse.json({
          sessionId,
          metadata: sessionMeta?.metadata,
          report,
        });
      }
    }

    // 2. Fallback to memory store
    const session = sessionStore.getSession(sessionId);
    if (session) {
      const report = sessionStore.generateOrGetReport(sessionId);
      return NextResponse.json({
        sessionId: session.id,
        metadata: session.metadata,
        report,
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
      { error: "Failed to generate report." },
      { status: 500 }
    );
  }
}
