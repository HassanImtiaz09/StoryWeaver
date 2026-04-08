/**
 * AI Provider Abstraction Layer
 * Enables provider-agnostic AI operations (Claude, Forge, Forge API, etc.)
 */

import { ENV } from "./env";

/**
 * Options for AI text/JSON generation
 */
export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

/**
 * Provider-agnostic AI interface
 */
export interface AIProvider {
  name: string;
  generateText(prompt: string, options?: GenerateOptions): Promise<string>;
  generateJSON<T>(prompt: string, schema: string, options?: GenerateOptions): Promise<T>;
}

/**
 * Claude provider wrapping Anthropic SDK
 */
class ClaudeProvider implements AIProvider {
  name = "claude";
  private apiKey: string;
  private model = "claude-sonnet-4-20250514";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    if (!apiKey) {
      throw new Error("ClaudeProvider requires ANTHROPIC_API_KEY");
    }
  }

  async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
    const maxTokens = options?.maxTokens ?? 16000;
    const model = options?.model ?? this.model;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error ${response.status}: ${error}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";
    return text;
  }

  async generateJSON<T>(
    prompt: string,
    schema: string,
    options?: GenerateOptions
  ): Promise<T> {
    const fullPrompt = `${prompt}\n\nExpected JSON schema:\n${schema}\n\nRespond with ONLY valid JSON.`;
    const raw = await this.generateText(fullPrompt, options);

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = raw;
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      // Try to find raw JSON object/array
      const rawMatch = raw.match(/[\[\{][\s\S]*[\]\}]/);
      if (rawMatch) {
        jsonStr = rawMatch[0];
      }
    }

    try {
      return JSON.parse(jsonStr) as T;
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${raw.substring(0, 200)}`);
    }
  }
}

/**
 * Factory function to get AI provider
 */
export function getAIProvider(providerName: string = "claude"): AIProvider {
  switch (providerName.toLowerCase()) {
    case "claude":
      return new ClaudeProvider(ENV.anthropicApiKey);
    default:
      throw new Error(`Unknown AI provider: ${providerName}`);
  }
}

/**
 * Get default provider (Claude)
 */
export function getDefaultProvider(): AIProvider {
  return getAIProvider("claude");
}
