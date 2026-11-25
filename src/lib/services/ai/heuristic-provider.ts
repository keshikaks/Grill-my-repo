import { z } from "zod";
import type {
  AiCompletionOptions,
  AiProvider,
  AiStructuredResult,
  AiTextResult,
} from "./types";

/**
 * Heuristic fallback provider used when AI_API_KEY is not configured.
 * Performs deterministic rule-based analysis without fabricating AI responses.
 * Sets `isConfigured = false` so UI can clearly inform users.
 */
export class HeuristicProvider implements AiProvider {
  readonly type = "heuristic";
  readonly modelName = "static-heuristic-engine";
  readonly isConfigured = false;

  async generateText(
    prompt: string,
    systemPrompt?: string,
    options?: AiCompletionOptions
  ): Promise<AiTextResult> {
    void prompt;
    void systemPrompt;
    void options;

    return {
      text: "AI Provider is not configured. Set AI_API_KEY in .env to enable live LLM question generation and evaluation.",
      provider: "heuristic",
      model: this.modelName,
    };
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T>,
    systemPrompt?: string,
    options?: AiCompletionOptions
  ): Promise<AiStructuredResult<T>> {
    void prompt;
    void systemPrompt;
    void options;

    throw new Error(
      "AI provider is not configured. Set AI_API_KEY in your .env file to enable structured AI synthesis."
    );
  }
}
