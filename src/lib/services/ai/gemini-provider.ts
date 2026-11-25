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

export class GeminiProvider implements AiProvider {
  readonly type = "gemini";
  readonly modelName: string;
  readonly isConfigured: boolean;
  private apiKey: string | undefined;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey?.trim() || undefined;
    this.modelName = model?.trim() || "gemini-2.0-flash";
    this.isConfigured = Boolean(this.apiKey);
  }

  async generateText(
    prompt: string,
    systemPrompt?: string,
    options: AiCompletionOptions = {}
  ): Promise<AiTextResult> {
    if (!this.apiKey) {
      throw new Error(
        "Gemini API key is not configured. Set AI_API_KEY in your .env file."
      );
    }

    const timeoutMs = options.timeoutMs ?? 30000;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.modelName)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const effectiveSystemPrompt = [
      SECURITY_SYSTEM_INSTRUCTION,
      systemPrompt,
    ]
      .filter(Boolean)
      .join("\n\n");

    const payload = {
      systemInstruction: {
        parts: [{ text: effectiveSystemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxTokens ?? 4096,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(
          `Gemini API error (${res.status}): ${res.statusText} - ${errorText}`
        );
      }

      const data = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
        usageMetadata?: {
          promptTokenCount?: number;
          candidatesTokenCount?: number;
          totalTokenCount?: number;
        };
      };

      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text ?? "";

      return {
        text,
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount,
          completionTokens: data.usageMetadata?.candidatesTokenCount,
          totalTokens: data.usageMetadata?.totalTokenCount,
        },
        provider: "gemini",
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
      "CRITICAL: You must return strictly valid JSON conforming to the requested schema. Do not include markdown code fences, comments, or any extraneous text outside the JSON structure.";

    const combinedSystem = [systemPrompt, jsonInstruction]
      .filter(Boolean)
      .join("\n\n");

    const result = await this.generateText(prompt, combinedSystem, options);
    const data = validateStructuredResponse(result.text, schema);

    return {
      data,
      rawText: result.text,
      usage: result.usage,
      provider: "gemini",
      model: this.modelName,
    };
  }
}
