import type {
  IntakeContext,
  LeadIntakeResult,
} from "@/lib/ai/schemas/lead-intake";

export interface AiProvider {
  readonly name: "mock" | "openai" | "anthropic";
  readonly model: string;
  /**
   * Given the conversation + business context, decide the next question to ask,
   * extract structured fields, score the lead, and produce an owner summary.
   */
  runIntake(context: IntakeContext): Promise<LeadIntakeResult>;
}
