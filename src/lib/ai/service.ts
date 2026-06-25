import { env } from "@/lib/env";
import type { AiProvider } from "@/lib/ai/providers/types";
import { MockAiProvider } from "@/lib/ai/providers/mock";
import { OpenAiProvider } from "@/lib/ai/providers/openai";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic";
import {
  intakeContextSchema,
  parseLeadIntakeResult,
  type IntakeContext,
  type LeadIntakeResult,
} from "@/lib/ai/schemas/lead-intake";

/**
 * AI service abstraction.
 *
 * Chooses a provider based on AI_PROVIDER (mock | openai | anthropic). If a real
 * provider is selected but its key is missing OR the call fails, we fall back to
 * the deterministic mock provider so the product never breaks. The chosen
 * provider name/model is returned alongside the result for logging into
 * `ai_intake_logs`.
 */

function selectProvider(): AiProvider {
  switch (env.ai.provider) {
    case "openai":
      return env.ai.openaiKey ? new OpenAiProvider() : new MockAiProvider();
    case "anthropic":
      return env.ai.anthropicKey
        ? new AnthropicProvider()
        : new MockAiProvider();
    case "mock":
    default:
      return new MockAiProvider();
  }
}

export interface RunIntakeResult {
  result: LeadIntakeResult;
  provider: string;
  model: string;
  usedFallback: boolean;
  error?: string;
}

export async function runLeadIntake(
  rawContext: IntakeContext,
): Promise<RunIntakeResult> {
  const context = intakeContextSchema.parse(rawContext);
  const primary = selectProvider();

  try {
    const result = parseLeadIntakeResult(await primary.runIntake(context));
    return {
      result,
      provider: primary.name,
      model: primary.model,
      usedFallback: false,
    };
  } catch (err) {
    // Any failure (missing key, network, bad JSON) → deterministic mock.
    if (primary.name === "mock") throw err;
    const fallback = new MockAiProvider();
    const result = await fallback.runIntake(context);
    return {
      result,
      provider: fallback.name,
      model: fallback.model,
      usedFallback: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export { type IntakeContext, type LeadIntakeResult };
