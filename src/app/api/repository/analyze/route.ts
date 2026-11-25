import { NextResponse } from "next/server";
import { z } from "zod";
import { parseGitHubRepoUrl } from "@/lib/validation/github-url";
import { GitHubClient, GitHubApiError } from "@/lib/services/github";
import { performRepositoryAnalysis } from "@/lib/services/analysis";
import { generateQuestionsForRepository } from "@/lib/services/grill";
import { getAiProvider } from "@/lib/services/ai";
import { sessionStore } from "@/lib/services/session/session-store";
import { getCurrentUser } from "@/lib/services/auth/session";
import { saveRepositoryAndAnalysis } from "@/lib/services/persistence/persistence-service";
import type { RepositoryMetadata } from "@/lib/contracts/repository";

const AnalyzeRequestSchema = z.object({
  url: z.string().min(1, "Repository URL is required"),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          error: "Authentication required to analyze repository. Please log in or create an account.",
          requiresAuth: true,
        },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = AnalyzeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
        { status: 400 }
      );
    }

    const parsedRepo = parseGitHubRepoUrl(parsed.data.url);
    if (!parsedRepo) {
      return NextResponse.json(
        {
          error:
            "Invalid GitHub repository URL. Must be in the format https://github.com/owner/repository.",
        },
        { status: 400 }
      );
    }

    // 1. Ingest repository via GitHub API
    const client = new GitHubClient();
    const snapshot = await client.ingestRepository(
      parsedRepo.owner,
      parsedRepo.name
    );

    // 2. Perform intelligence analysis & claims verification
    const aiProvider = getAiProvider();
    const { analysis, claims } = await performRepositoryAnalysis(
      snapshot,
      aiProvider
    );

    // 3. Generate questions for grilling session
    const questions = await generateQuestionsForRepository(
      snapshot,
      analysis,
      claims,
      aiProvider
    );

    // 4. Build RepositoryMetadata
    const metadata: RepositoryMetadata = {
      owner: snapshot.owner,
      name: snapshot.name,
      description: snapshot.description,
      defaultBranch: snapshot.defaultBranch,
      commitSha: snapshot.commitSha,
      languages: snapshot.languages,
      frameworks: snapshot.frameworks,
      url: snapshot.htmlUrl,
      inspectedFileCount: snapshot.inspectedFileCount,
      totalLinesOfCode: snapshot.totalLinesOfCode,
      analyzedAt: snapshot.ingestedAt,
    };

    // 5. Persist to PostgreSQL via Prisma
    const { sessionId } = await saveRepositoryAndAnalysis({
      userId: user.id,
      snapshot,
      metadata,
      analysis,
      claims,
      questions,
    });

    // Also mirror to memory cache for fast local access
    sessionStore.createSessionWithId(sessionId, {
      snapshot,
      metadata,
      analysis,
      claims,
      questions,
    });

    return NextResponse.json({
      success: true,
      sessionId,
      metadata,
      analysis,
      claims,
      questionCount: questions.length,
      aiConfigured: aiProvider.isConfigured,
      aiProvider: aiProvider.type,
      aiModel: aiProvider.modelName,
    });
  } catch (error) {
    if (error instanceof GitHubApiError) {
      return NextResponse.json(
        {
          error: error.message,
          isRateLimit: error.isRateLimit,
          rateLimitReset: error.resetTime,
        },
        { status: error.statusCode }
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to analyze repository.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
