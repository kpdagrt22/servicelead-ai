import type { AiProvider } from "@/lib/ai/providers/types";
import {
  type ExtractedFields,
  type IntakeContext,
  type LeadIntakeResult,
} from "@/lib/ai/schemas/lead-intake";
import { scoreLead, urgencyFromText } from "@/lib/leads/scoring";

/**
 * Mock AI provider — fully deterministic, no API key required.
 *
 * This is what powers the MVP demo, local development, and tests. It performs
 * lightweight rule-based extraction over the conversation, decides the single
 * next-best question, and writes a clean owner summary. It never "over-talks":
 * it asks at most one question per turn and stops once core fields are known.
 */

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const ZIP_RE = /\b\d{5}(?:-\d{4})?\b/;

function joinInbound(ctx: IntakeContext): string {
  return ctx.messages
    .filter((m) => m.direction === "inbound")
    .map((m) => m.body)
    .join("\n");
}

function extractFields(ctx: IntakeContext): ExtractedFields {
  const text = joinInbound(ctx);
  const known = ctx.knownFields ?? {};
  const fields: ExtractedFields = { ...known };

  if (!fields.customer_email) {
    fields.customer_email = text.match(EMAIL_RE)?.[0] ?? null;
  }

  if (!fields.urgency && text.trim()) {
    fields.urgency = urgencyFromText(text);
  }

  // Address: prefer an explicit known value; otherwise look for a ZIP or a
  // line that looks like a street address.
  if (!fields.address) {
    const zip = text.match(ZIP_RE)?.[0];
    const streetLine = text
      .split("\n")
      .find((l) => /\d+\s+\w+.*(st|street|ave|avenue|rd|road|blvd|dr|lane|ln|way|ct)\b/i.test(l));
    fields.address = streetLine?.trim() ?? (zip ? zip : null);
  }

  // Postal code: pull a standalone ZIP if present.
  if (!fields.postal_code) {
    fields.postal_code = text.match(ZIP_RE)?.[0] ?? null;
  }

  // Service needed: use the first inbound line if not already known, matched
  // against configured categories when possible.
  if (!fields.service_needed && text.trim()) {
    const matchedCategory = ctx.serviceCategories.find((c) =>
      text.toLowerCase().includes(c.toLowerCase().split(" ")[0]),
    );
    fields.service_needed =
      matchedCategory ?? firstSentence(text) ?? null;
  }

  // Preferred time
  if (!fields.preferred_time) {
    const timeMatch = text.match(
      /\b(today|tomorrow|tonight|this (morning|afternoon|evening|week)|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}(:\d{2})?\s?(am|pm))\b/i,
    );
    fields.preferred_time = timeMatch?.[0] ?? null;
  }

  // Notes: keep the raw customer description for the owner.
  if (!fields.notes && text.trim()) {
    fields.notes = text.slice(0, 500);
  }

  return fields;
}

function firstSentence(text: string): string | null {
  const s = text.split(/[.!?\n]/)[0]?.trim();
  return s && s.length > 0 ? s.slice(0, 120) : null;
}

function computeMissing(
  fields: ExtractedFields,
  ctx: IntakeContext,
): string[] {
  const missing: string[] = [];
  const required = ctx.intakeQuestions.filter((q) => q.required);
  const checks: Record<string, boolean> = {
    service_needed: Boolean(fields.service_needed),
    urgency: Boolean(fields.urgency),
    address: Boolean(fields.address),
    issue: Boolean(fields.notes),
    preferred_time: Boolean(fields.preferred_time),
  };
  for (const q of required) {
    if (q.key in checks && !checks[q.key]) missing.push(q.key);
  }
  // Always want at least service + a way to act on it.
  if (!fields.service_needed && !missing.includes("service_needed")) {
    missing.push("service_needed");
  }
  return missing;
}

const QUESTION_TEXT: Record<string, string> = {
  service_needed: "What type of service do you need help with?",
  urgency: "Is this an emergency, or can it wait a day or two?",
  address: "What's the address or ZIP code for the job?",
  issue: "Can you briefly describe the problem you're seeing?",
  preferred_time: "What day and time works best for you?",
  customer_name: "And who should we ask for when we follow up?",
};

function nextMessage(
  missing: string[],
  ctx: IntakeContext,
  fields: ExtractedFields,
): string | null {
  if (missing.length === 0) {
    const name = fields.customer_name ? ` ${fields.customer_name}` : "";
    return `Thanks${name}! We've got what we need and someone from ${ctx.businessName} will reach out shortly. Reply STOP to opt out.`;
  }
  const key = missing[0];
  const q = QUESTION_TEXT[key] ?? "Could you share a few more details?";
  // First-turn greeting includes the business name + opt-out footer.
  const isFirstTurn = ctx.messages.filter((m) => m.direction === "outbound").length === 0;
  if (isFirstTurn) {
    return `Hi, thanks for contacting ${ctx.businessName}! Sorry we missed you. ${q} (Reply STOP to opt out.)`;
  }
  return q;
}

function buildSummary(
  fields: ExtractedFields,
  ctx: IntakeContext,
  score: number,
): string {
  const lines = [
    `New lead for ${ctx.businessName}`,
    `Service: ${fields.service_needed ?? "Unknown"}`,
    `Urgency: ${fields.urgency ?? "unknown"}`,
    fields.address ? `Location: ${fields.address}` : null,
    fields.preferred_time ? `Preferred time: ${fields.preferred_time}` : null,
    fields.customer_name ? `Name: ${fields.customer_name}` : null,
    fields.customer_email ? `Email: ${fields.customer_email}` : null,
    `Lead score: ${score}/100`,
    fields.notes ? `Details: ${fields.notes}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

function detectRiskFlags(ctx: IntakeContext, fields: ExtractedFields): string[] {
  const flags: string[] = [];
  const text = joinInbound(ctx).toLowerCase();
  if (/\b(gas leak|carbon monoxide|fire|smoke|sparking|electrocut)\b/.test(text)) {
    flags.push("possible_safety_hazard_advise_emergency_services");
  }
  if (/\b(chest pain|injur|bleeding|medical|ambulance|911)\b/.test(text)) {
    flags.push("possible_medical_situation_not_in_scope");
  }
  if (!fields.customer_email && !ctx.knownFields.customer_email) {
    // not a risk, omitted
  }
  return flags;
}

export class MockAiProvider implements AiProvider {
  readonly name = "mock" as const;
  readonly model = "mock-rules-v1";

  async runIntake(context: IntakeContext): Promise<LeadIntakeResult> {
    const fields = extractFields(context);
    const missing = computeMissing(fields, context);
    const inboundCount = context.messages.filter(
      (m) => m.direction === "inbound",
    ).length;
    const score = scoreLead({
      fields,
      inboundMessageCount: inboundCount,
      emergencyService: context.emergencyService,
    });
    const enough = missing.length === 0;
    const riskFlags = detectRiskFlags(context, fields);

    return {
      extracted_fields: fields,
      next_message_to_customer: nextMessage(missing, context, fields),
      should_notify_owner: enough || score >= 70 || riskFlags.length > 0,
      owner_summary: buildSummary(fields, context, score),
      lead_score: score,
      missing_fields: missing,
      risk_flags: riskFlags,
      confidence: enough ? 0.85 : 0.55,
    };
  }
}
