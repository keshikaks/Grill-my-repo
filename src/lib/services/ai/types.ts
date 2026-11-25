import { z } from "zod";

export type AiProviderType = "gemini" | "openai" | "anthropic" | "heuristic";

export interface AiCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  retries?: number;
}

export interface AiUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface AiTextResult {
  text: string;
  usage?: AiUsage;
  provider: AiProviderType;
  model: string;
}

export interface AiStructuredResult<T> {
  data: T;
  rawText: string;
  usage?: AiUsage;
  provider: AiProviderType;
  model: string;
}

export interface AiProvider {
  readonly type: AiProviderType;
  readonly modelName: string;
  readonly isConfigured: boolean;

  generateText(
    prompt: string,
    systemPrompt?: string,
    options?: AiCompletionOptions
  ): Promise<AiTextResult>;

  generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T>,
    systemPrompt?: string,
    options?: AiCompletionOptions
  ): Promise<AiStructuredResult<T>>;
}
