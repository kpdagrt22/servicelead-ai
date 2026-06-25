import { z } from "zod";
import { URGENCY_LEVELS } from "@/lib/constants";

/**
 * The structured contract every AI provider (mock / OpenAI / Anthropic) must
 * return. Validated with Zod so a misbehaving model never corrupts a lead.
 */

export const extractedFieldsSchema = z.object({
  service_needed: z.string().nullable().optional(),
  urgency: z.enum(URGENCY_LEVELS).nullable().optional(),
  address: z.string().nullable().optional(),
  preferred_time: z.string().nullable().optional(),
  customer_name: z.string().nullable().optional(),
  customer_email: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type ExtractedFields = z.infer<typeof extractedFieldsSchema>;

export const leadIntakeResultSchema = z.object({
  extracted_fields: extractedFieldsSchema,
  next_message_to_customer: z.string().nullable(),
  should_notify_owner: z.boolean(),
  owner_summary: z.string(),
  lead_score: z.number().int().min(0).max(100),
  missing_fields: z.array(z.string()),
  risk_flags: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export type LeadIntakeResult = z.infer<typeof leadIntakeResultSchema>;

/** Input passed to the AI service. */
export const intakeMessageSchema = z.object({
  direction: z.enum(["inbound", "outbound"]),
  body: z.string(),
});
export type IntakeMessage = z.infer<typeof intakeMessageSchema>;

export const intakeContextSchema = z.object({
  businessName: z.string(),
  businessType: z.string().optional(),
  serviceCategories: z.array(z.string()).default([]),
  intakeQuestions: z
    .array(z.object({ key: z.string(), label: z.string(), required: z.boolean() }))
    .default([]),
  emergencyService: z.boolean().default(false),
  messages: z.array(intakeMessageSchema).default([]),
  // Anything already known about the lead (e.g. from a web form submission).
  knownFields: extractedFieldsSchema.default({}),
});
export type IntakeContext = z.infer<typeof intakeContextSchema>;

/**
 * Safe-parse a raw provider response, throwing a descriptive error if invalid.
 * Coerces a few common model mistakes (string score, missing arrays).
 */
export function parseLeadIntakeResult(raw: unknown): LeadIntakeResult {
  const coerced = coerce(raw);
  return leadIntakeResultSchema.parse(coerced);
}

function coerce(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const r = raw as Record<string, unknown>;
  return {
    ...r,
    lead_score:
      typeof r.lead_score === "string"
        ? parseInt(r.lead_score, 10)
        : typeof r.lead_score === "number"
          ? Math.round(r.lead_score)
          : r.lead_score,
    missing_fields: Array.isArray(r.missing_fields) ? r.missing_fields : [],
    risk_flags: Array.isArray(r.risk_flags) ? r.risk_flags : [],
    confidence:
      typeof r.confidence === "string"
        ? parseFloat(r.confidence)
        : (r.confidence ?? 0.5),
    extracted_fields: r.extracted_fields ?? {},
  };
}
