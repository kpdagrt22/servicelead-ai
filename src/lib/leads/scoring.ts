import type { ExtractedFields } from "@/lib/ai/schemas/lead-intake";
import {
  HOT_LEAD_SCORE_THRESHOLD,
  WARM_LEAD_SCORE_THRESHOLD,
  type Urgency,
} from "@/lib/constants";

/**
 * Deterministic lead scoring used by the mock AI provider and as a fallback /
 * sanity check elsewhere. Pure function — easy to unit test.
 *
 * Score is 0-100. Higher = hotter lead worth contacting immediately.
 */

const URGENCY_WEIGHT: Record<Urgency, number> = {
  emergency: 40,
  high: 30,
  medium: 18,
  low: 8,
};

export interface ScoreInput {
  fields: ExtractedFields;
  /** Number of inbound messages from the customer (engagement signal). */
  inboundMessageCount?: number;
  emergencyService?: boolean;
}

export function scoreLead(input: ScoreInput): number {
  const { fields, inboundMessageCount = 0, emergencyService = false } = input;
  let score = 20; // baseline for any inbound lead

  if (fields.urgency) {
    score += URGENCY_WEIGHT[fields.urgency];
    if (fields.urgency === "emergency" && emergencyService) score += 5;
  }

  // Completeness signals — a lead we can act on scores higher.
  if (fields.service_needed) score += 12;
  if (fields.address) score += 10;
  if (fields.preferred_time) score += 6;
  if (fields.customer_name) score += 4;
  if (fields.customer_email) score += 3;

  // Engagement — replies indicate a real, reachable person.
  score += Math.min(inboundMessageCount * 3, 12);

  return clamp(Math.round(score), 0, 100);
}

export function urgencyFromText(text: string): Urgency {
  const t = text.toLowerCase();
  if (
    /\b(emergency|flood|flooding|burst|no heat|no power|gas leak|sparking|sewage|overflow)\b/.test(
      t,
    )
  ) {
    return "emergency";
  }
  if (/\b(today|asap|urgent|right away|now|immediately|leaking)\b/.test(t)) {
    return "high";
  }
  if (/\b(this week|soon|tomorrow|quote|estimate)\b/.test(t)) return "medium";
  return "low";
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

export function scoreLabel(score: number): "hot" | "warm" | "cold" {
  if (score >= HOT_LEAD_SCORE_THRESHOLD) return "hot";
  if (score >= WARM_LEAD_SCORE_THRESHOLD) return "warm";
  return "cold";
}
