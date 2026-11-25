import { NextResponse } from "next/server";
import { z } from "zod";
import { sessionStore } from "@/lib/services/session/session-store";
import { generateFollowUpResponse } from "@/lib/services/grill";
import { getAiProvider } from "@/lib/services/ai";
import { getCurrentUser } from "@/lib/services/auth/session";
import {
  getSessionQuestions,
  recordPersistentFollowUp,
  OwnershipError,
} from "@/lib/services/persistence/persistence-service";
import type { AnswerEvaluation } from "@/lib/contracts/grill";

const FollowUpRequestSchema = z.object({
  questionId: z.string().min(1),
  candidateQuery: z
    .string()
    .trim()
    .min(5, "Query must be at least 5 characters.")
    .max(1000, "Query is too long."),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params;
    const user = await getCurrentUser();

    const body = await req.json().catch(() => null);
    const parsed = FollowUpRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid follow-up payload." },
        { status: 400 }
      );
    }

    const { questionId, candidateQuery } = parsed.data;

    let targetQuestion = null;
    let evaluation: AnswerEvaluation | null = null;

    // 1. Check DB
    if (user) {
      try {
        const dbSession = await getSessionQuestions(sessionId, user.id);
        if (dbSession) {
          targetQuestion = dbSession.questions.find((q) => q.id === questionId);
          evaluation = dbSession.evaluations[questionId] ?? null;
        }
      } catch (err) {
        if (err instanceof OwnershipError) {
          return NextResponse.json(
            { error: "Session not found or access denied." },
            { status: 404 }
          );
        }
      }
    }

    // 2. Check memory store
    if (!targetQuestion) {
      const memSession = sessionStore.getSession(sessionId);
      if (memSession) {
        targetQuestion = memSession.questions.find((q) => q.id === questionId) ?? null;
        evaluation = memSession.evaluations[questionId] ?? null;
      }
    }

    if (!targetQuestion) {
      return NextResponse.json(
        { error: `Question ${questionId} not found in this grilling session.` },
        { status: 404 }
      );
    }

    const effectiveEvaluation: AnswerEvaluation = evaluation || {
      correctness: 75,
      codeUnderstanding: 75,
      clarity: 75,
      reasoning: 70,
      feedback: "Previous response recorded.",
      suggestedImprovements: [],
    };

    const aiProvider = getAiProvider();
    const followUpItem = await generateFollowUpResponse(
      targetQuestion,
      effectiveEvaluation,
      candidateQuery,
      aiProvider
    );

    if (user) {
      try {
        await recordPersistentFollowUp({
          sessionId,
          questionId,
          userId: user.id,
          followUp: followUpItem,
        });
      } catch (e) {
        console.error("Failed to record follow-up in DB:", e);
      }
    }

    sessionStore.recordFollowUp(sessionId, questionId, followUpItem);

    return NextResponse.json({
      success: true,
      followUp: followUpItem,
      aiConfigured: aiProvider.isConfigured,
      aiProvider: aiProvider.type,
      aiModel: aiProvider.modelName,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate follow-up.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
