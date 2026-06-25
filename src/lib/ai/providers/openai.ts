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
 * OpenAI provider. Implemented with `fetch` against the Chat Completions API so
 * no extra SDK dependency is required. Falls back to throwing if no key is set
 * (the service layer catches this and routes to the mock provider).
 *
 * This is intentionally a thin, swappable placeholder — wire in the official
 * SDK or the Responses API later if you prefer.
 */
export class OpenAiProvider implements AiProvider {
  readonly name = "openai" as const;
  readonly model = env.ai.openaiModel;

  async runIntake(context: IntakeContext): Promise<LeadIntakeResult> {
    if (!env.ai.openaiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const res = await aiFetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.ai.openaiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.3,
        max_tokens: 1024,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(context) },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI request failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    return parseLeadIntakeResult(extractJson(content));
  }
}
