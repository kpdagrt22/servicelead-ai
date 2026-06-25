import type { AiProvider } from "@/lib/ai/providers/types";
import {
  parseLeadIntakeResult,
  type IntakeContext,
  type LeadIntakeResult,
} from "@/lib/ai/schemas/lead-intake";
import { buildUserPrompt, extractJson, SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { aiFetch } from "@/lib/ai/http";
import { env } from "@/lib/env";

/**
 * Anthropic provider. Implemented with `fetch` against the Messages API so no
 * extra SDK dependency is required. The service layer falls back to the mock
 * provider if this throws (e.g. missing key).
 */
export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic" as const;
  readonly model = env.ai.anthropicModel;

  async runIntake(context: IntakeContext): Promise<LeadIntakeResult> {
    if (!env.ai.anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const res = await aiFetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ai.anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        temperature: 0.3,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(context) }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Anthropic request failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text =
      data.content?.find((c) => c.type === "text")?.text ?? "";
    return parseLeadIntakeResult(extractJson(text));
  }
}
