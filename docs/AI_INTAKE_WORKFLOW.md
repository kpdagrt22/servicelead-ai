# AI intake workflow

The AI intake engine turns an inbound customer contact into a structured,
scored lead and decides the next message to send. It is provider-agnostic and
defaults to a deterministic mock so the product works with no API key.

## Provider abstraction

[`src/lib/ai/providers/types.ts`](../src/lib/ai/providers/types.ts) defines the
contract:

```ts
interface AiProvider {
  name: "mock" | "openai" | "anthropic";
  model: string;
  runIntake(context: IntakeContext): Promise<LeadIntakeResult>;
}
```

Implementations:

- **mock** ([`providers/mock.ts`](../src/lib/ai/providers/mock.ts)) — rule-based
  extraction + scoring, no network. Default.
- **openai** ([`providers/openai.ts`](../src/lib/ai/providers/openai.ts)) — Chat
  Completions via `fetch`, JSON mode.
- **anthropic** ([`providers/anthropic.ts`](../src/lib/ai/providers/anthropic.ts))
  — Messages API via `fetch`.

The selector + fallback lives in
[`src/lib/ai/service.ts`](../src/lib/ai/service.ts):

```ts
runLeadIntake(context) ->
  pick provider from AI_PROVIDER
  try provider.runIntake()           // validated with Zod
  catch (missing key / network / bad JSON) -> MockAiProvider (usedFallback=true)
```

`AI_PROVIDER=mock|openai|anthropic`. If a real provider is selected but its key
is missing, the service falls back to mock and records `usedFallback` +
`error` (logged into `ai_intake_logs.status = 'fallback'`).

## Input: `IntakeContext`

Built by the orchestrator from the org + conversation
([`schemas/lead-intake.ts`](../src/lib/ai/schemas/lead-intake.ts)):

```ts
{
  businessName, businessType, emergencyService,
  serviceCategories: string[],
  intakeQuestions: { key, label, required }[],
  messages: { direction: "inbound"|"outbound", body }[],
  knownFields: ExtractedFields    // e.g. pre-filled from a web form
}
```

## Output: `LeadIntakeResult` (Zod-validated)

```ts
{
  extracted_fields: {
    service_needed, urgency: "emergency"|"high"|"medium"|"low"|null,
    address, preferred_time, customer_name, customer_email, notes
  },
  next_message_to_customer: string | null,
  should_notify_owner: boolean,
  owner_summary: string,
  lead_score: 0..100,
  missing_fields: string[],
  risk_flags: string[],
  confidence: 0..1
}
```

`parseLeadIntakeResult()` coerces common model mistakes (string score, missing
arrays) before validation, so a sloppy model never corrupts a lead.

## What the AI does (and avoids)

- Reads the conversation, **extracts** structured fields.
- Decides the **single next-best question** (asks one thing at a time).
- **Scores urgency** (0–100) via [`lib/leads/scoring.ts`](../src/lib/leads/scoring.ts).
- Produces a concise **owner summary**.
- **Stops** when required fields are collected (`missing_fields` empty).
- **Avoids over-talking** — short, SMS-length replies.
- **Respects opt-out** — opt-out is handled *before* the AI runs (see below).
- **Flags risks** — safety hazards (gas leak, fire, flooding) and out-of-scope
  medical situations; it never gives medical advice.
- Never promises guaranteed bookings, prices, or arrival times.

## Orchestration: `processIntake`

[`src/lib/leads/intake.ts`](../src/lib/leads/intake.ts) is the shared pipeline
used by the public form, simulator, and Twilio inbound:

```
1. Load org + active categories + merged intake questions
2. Find or create lead (reuse by phone for sms/missed_call) + conversation
3. If inbound body present:
     detect STOP/START first-word  ->  opt-out: set opt_out, store confirmation, RETURN
                                   ->  opt-in:  clear opt_out, RETURN
     store inbound message
4. If lead already opted out -> RETURN (never message them)
5. Build IntakeContext from full conversation history + knownFields
6. runLeadIntake() -> result (with mock fallback)
7. Persist extracted fields (only fill blanks), lead_score, ai_summary
8. Store the AI's outbound reply (sending handled by the caller/channel)
9. Insert ai_intake_logs (provider, model, input, output, status)
10. If should_notify_owner && notification_email -> sendOwnerLeadEmail()
```

The caller decides what to do with `outboundMessage`:

- **Twilio inbound** returns it as TwiML so Twilio sends the SMS.
- **Missed-call** sends the first outreach via `sendSms()`.
- **Web form** shows it as the on-page confirmation.
- **Lead detail** surfaces it as a *suggested reply* the owner can edit/send.

## Tuning the prompt

The shared system prompt + user-prompt builder live in
[`src/lib/ai/prompt.ts`](../src/lib/ai/prompt.ts) and are reused by both real
providers so behavior stays consistent. `extractJson()` tolerates code-fenced
responses.

## Observability

Every run is written to `ai_intake_logs` with the full input/output and whether
a fallback occurred — useful for debugging prompt/extraction quality and for the
manual validation in [`VALIDATION_PLAN.md`](VALIDATION_PLAN.md).
