import type { AiProvider } from "./types";
import { GeminiProvider } from "./gemini-provider";
import { OpenAiProvider } from "./openai-provider";
import { HeuristicProvider } from "./heuristic-provider";

export function getAiProvider(): AiProvider {
  const provider = (process.env.AI_PROVIDER || "").toLowerCase().trim();
  const apiKey = (process.env.AI_API_KEY || "").trim();
  const model = (process.env.AI_MODEL || "").trim() || undefined;

  if (!apiKey) {
    return new HeuristicProvider();
  }

  if (provider === "openai" || (!provider && apiKey.startsWith("sk-proj-")) || (!provider && apiKey.startsWith("sk-") && !apiKey.startsWith("sk-ant-"))) {
    return new OpenAiProvider(apiKey, model);
  }

  // Default to Gemini for general keys or explicit "gemini" / "google"
  return new GeminiProvider(apiKey, model);
}
