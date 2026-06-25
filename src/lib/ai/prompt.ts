import type { IntakeContext } from "@/lib/ai/schemas/lead-intake";

/**
 * Shared prompt construction for real LLM providers (OpenAI / Anthropic).
 * Keeping this in one place means both providers behave identically and the
 * mock provider's behavior stays close to production.
 */

export const SYSTEM_PROMPT = `You are the lead-intake assistant for a local service business (plumbing, HVAC, electrical, cleaning, pest control, salon, auto, etc.). Your job is to qualify an INBOUND customer who contacted the business (missed call, SMS reply, or web form).

Rules:
- Be warm, brief, and professional. SMS-length replies. Ask ONE question at a time.
- Only respond to inbound, customer-initiated conversations. Never solicit.
- Collect: what service is needed, urgency, address/ZIP, a short description, and a preferred time. Capture name/email if offered.
- Stop asking once you have enough to dispatch the lead. Do not over-talk.
- Never promise a guaranteed booking, price, or arrival time.
- For safety hazards (gas leak, fire, sparking, flooding) advise the customer to call emergency services / the utility, and flag it.
- This is NOT medical triage. If someone describes a medical emergency, tell them to call emergency services and flag it.
- Always allow opt-out; the platform appends "Reply STOP to opt out." where required.

Return ONLY a JSON object matching this exact shape (no markdown, no prose):
{
  "extracted_fields": {
    "service_needed": string|null,
    "urgency": "emergency"|"high"|"medium"|"low"|null,
    "address": string|null,
    "city": string|null,
    "state": string|null,
    "postal_code": string|null,
    "preferred_time": string|null,
    "customer_name": string|null,
    "customer_email": string|null,
    "notes": string|null
  },
  "next_message_to_customer": string|null,
  "should_notify_owner": boolean,
  "owner_summary": string,
  "lead_score": number (0-100),
  "missing_fields": string[],
  "risk_flags": string[],
  "confidence": number (0-1)
}`;

export function buildUserPrompt(ctx: IntakeContext): string {
  const transcript =
    ctx.messages.length > 0
      ? ctx.messages
          .map(
            (m) =>
              `${m.direction === "inbound" ? "Customer" : "Assistant"}: ${m.body}`,
          )
          .join("\n")
      : "(no messages yet — this is the first outreach after a missed call)";

  const questions = ctx.intakeQuestions
    .map((q) => `- ${q.label}${q.required ? " (required)" : ""}`)
    .join("\n");

  return `Business: ${ctx.businessName}${ctx.businessType ? ` (${ctx.businessType})` : ""}
Emergency service offered: ${ctx.emergencyService ? "yes" : "no"}
Service categories: ${ctx.serviceCategories.join(", ") || "general"}
Intake questions to satisfy:
${questions || "- (use sensible defaults)"}

Already known fields: ${JSON.stringify(ctx.knownFields)}

Conversation so far:
${transcript}

Decide the single next-best message (or null if no further message is needed), extract fields, score the lead, and write a concise owner_summary. Respond with the JSON object only.`;
}

/** Extract a JSON object from a model response that may include code fences. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("No JSON object found in model response");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}
