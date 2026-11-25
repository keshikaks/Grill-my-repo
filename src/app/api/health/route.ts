import { NextResponse } from "next/server";
import { getAiProvider } from "@/lib/services/ai";

export async function GET() {
  const aiProvider = getAiProvider();
  const hasGitHubToken = Boolean(process.env.GITHUB_TOKEN?.trim());

  return NextResponse.json({
    service: "grill-my-repo",
    phase: 2,
    status: "ok",
    capabilities: {
      githubIngestion: true,
      hasGitHubToken,
      claimVerification: true,
      aiGrillEngine: true,
      aiProvider: aiProvider.type,
      aiConfigured: aiProvider.isConfigured,
      aiModel: aiProvider.modelName,
      previewInterface: true,
    },
    timestamp: new Date().toISOString(),
  });
}
