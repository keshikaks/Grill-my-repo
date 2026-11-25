import { NextResponse } from "next/server";
import { z } from "zod";
import { sessionStore } from "@/lib/services/session/session-store";
import { evaluateCandidateAnswer } from "@/lib/services/grill";
import { getAiProvider } from "@/lib/services/ai";
import { getCurrentUser } from "@/lib/services/auth/session";
import {
  getSessionQuestions,
  recordPersistentAnswer,
  OwnershipError,
} from "@/lib/services/persistence/persistence-service";
import type { GrillAnswer } from "@/lib/contracts/grill";

const SubmitAnswerSchema = z.object({
  questionId: z.string().min(1),
  answerText: z
    .string()
    .trim()
    .min(15, "Answer must be at least 15 characters.")
    .max(5000, "Answer must be under 5,000 characters."),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params;
    const user = await getCurrentUser();

    const body = await req.json().catch(() => null);
    const parsed = SubmitAnswerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid answer payload." },
        { status: 400 }
      );
    }

    const { questionId, answerText } = parsed.data;

    // 1. Try finding question in DB
    let targetQuestion = null;
    if (user) {
      try {
        const dbSession = await getSessionQuestions(sessionId, user.id);
        if (dbSession) {
          targetQuestion = dbSession.questions.find((q) => q.id === questionId);
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

    // 2. Fallback to memory store if not found in DB
    if (!targetQuestion) {
      const memSession = sessionStore.getSession(sessionId);
      targetQuestion = memSession?.questions.find((q) => q.id === questionId) ?? null;
    }

    if (!targetQuestion) {
      return NextResponse.json(
        { error: `Question ${questionId} not found in this grilling session.` },
        { status: 404 }
      );
    }

    // 3. Evaluate answer
    const aiProvider = getAiProvider();
    const evaluation = await evaluateCandidateAnswer(
      targetQuestion,
      answerText,
      aiProvider
    );

    const grillAnswer: GrillAnswer = {
      questionId,
      answerText,
      submittedAt: new Date().toISOString(),
    };

    // 4. Persist to DB if user is authenticated
    if (user) {
      try {
        await recordPersistentAnswer({
          sessionId,
          questionId,
          userId: user.id,
          answerText,
          evaluation,
        });
      } catch (e) {
        // Log error without blocking response
        console.error("Failed to persist answer to DB:", e);
      }
    }

    // Also update in-memory session if present
    if (sessionStore.getSession(sessionId)) {
      sessionStore.recordAnswer(sessionId, questionId, grillAnswer, evaluation);
    }

    return NextResponse.json({
      success: true,
      questionId,
      answer: grillAnswer,
      evaluation,
      aiConfigured: aiProvider.isConfigured,
      aiProvider: aiProvider.type,
      aiModel: aiProvider.modelName,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to evaluate answer.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
