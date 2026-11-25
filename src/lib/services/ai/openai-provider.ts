import { z } from "zod";
import type {
  AiCompletionOptions,
  AiProvider,
  AiStructuredResult,
  AiTextResult,
} from "./types";
import {
  SECURITY_SYSTEM_INSTRUCTION,
  validateStructuredResponse,
} from "./prompt-utils";

export class OpenAiProvider implements AiProvider {
  readonly type = "openai";
  readonly modelName: string;
  readonly isConfigured: boolean;
  private apiKey: string | undefined;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey?.trim() || undefined;
    this.modelName = model?.trim() || "gpt-4o-mini";
    this.isConfigured = Boolean(this.apiKey);
  }

  async generateText(
    prompt: string,
    systemPrompt?: string,
    options: AiCompletionOptions = {}
  ): Promise<AiTextResult> {
    if (!this.apiKey) {
      throw new Error(
        "OpenAI API key is not configured. Set AI_API_KEY in your .env file."
      );
    }

    const timeoutMs = options.timeoutMs ?? 30000;
    const url = "https://api.openai.com/v1/chat/completions";

    const effectiveSystemPrompt = [
      SECURITY_SYSTEM_INSTRUCTION,
      systemPrompt,
    ]
      .filter(Boolean)
      .join("\n\n");

    const messages = [
      { role: "system", content: effectiveSystemPrompt },
      { role: "user", content: prompt },
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages,
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens ?? 4096,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(
          `OpenAI API error (${res.status}): ${res.statusText} - ${errorText}`
        );
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
      };

      const text = data.choices?.[0]?.message?.content ?? "";

      return {
        text,
        usage: {
          promptTokens: data.usage?.prompt_tokens,
          completionTokens: data.usage?.completion_tokens,
          totalTokens: data.usage?.total_tokens,
        },
        provider: "openai",
        model: this.modelName,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T>,
    systemPrompt?: string,
    options: AiCompletionOptions = {}
  ): Promise<AiStructuredResult<T>> {
    const jsonInstruction =
      "CRITICAL: Return strictly valid JSON conforming to the requested schema. Do not enclose in markdown blocks.";

    const combinedSystem = [systemPrompt, jsonInstruction]
      .filter(Boolean)
      .join("\n\n");

    const result = await this.generateText(prompt, combinedSystem, options);
    const data = validateStructuredResponse(result.text, schema);

    return {
      data,
      rawText: result.text,
      usage: result.usage,
      provider: "openai",
      model: this.modelName,
    };
  }
}
