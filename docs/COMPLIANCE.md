# Compliance & Responsible Use — ServiceLead AI

> **This is not legal advice.** This document explains, in plain English, how
> ServiceLead AI is designed to behave and what the business owner is responsible
> for. Laws vary by country, state, and industry. For your own legal obligations,
> consult a qualified attorney.

ServiceLead AI is a **revenue-recovery tool for inbound customer requests** for
local service businesses (plumbers, HVAC, electricians, cleaners, pest control,
salons, auto repair/detailing, handyman). It is deliberately built **not** to
enable spam or cold outreach.

---

## 1. Inbound-only positioning

ServiceLead AI responds **only** to customer-initiated contact. It never starts
conversations with people who haven't reached out first, and it never auto-DMs
random numbers or scrapes lists.

In practice, the product reacts to inbound events such as:

- a **missed call** to the business,
- an **SMS reply** from a customer, or
- a **form submission** on the public intake form.

If a contact has not initiated one of these, the product does nothing.

---

## 2. Consent basics (what counts as an inbound basis)

A customer establishes an inbound basis to be contacted back when they:

1. **Call the business** (a missed call you're following up on),
2. **Reply by SMS** to the business, or
3. **Submit the public intake form**, which has a **required consent checkbox**
   agreeing to be contacted (including by SMS) about *their own* request.

Every lead stores `consent_status` and `consent_source` (for example
`web_form`, `sms_reply`, `missed_call`) so there is a record of *why* the
business has a basis to reply.

> The owner is still responsible for confirming they have a **lawful basis** to
> contact a given customer in their jurisdiction. Inbound contact is the basis;
> the product records it, but the owner owns the obligation.

---

## 3. STOP / opt-out behavior

Opt-out is treated as absolute.

- **Opt-out keywords:** **STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT** are
  detected when they appear as the **first word** of an inbound message.
- **Per-phone enforcement:** an opt-out applies to the **phone number**, across
  **all of that contact's leads and channels** — not just the single
  conversation it arrived on.
- **Never message opted-out contacts:** once a number has opted out, the system
  **never** sends to it again.
- **Optional one-time confirmation:** a single confirmation message (e.g.
  "You've been unsubscribed and won't receive further messages") may be sent
  once; after that, silence.

---

## 4. SMS compliance basics

For US SMS in particular:

- **A2P 10DLC registration:** to send application-to-person SMS at production
  volume in the US, you must register your **brand and campaign** with the
  carriers via Twilio. ServiceLead AI's use case is **customer care / lead
  follow-up** (inbound-triggered), not marketing blasts.
- **Identify the business:** outbound messages identify the business by name so
  the recipient knows who is texting them.
- **Opt-out footer:** outbound messages include clear opt-out guidance such as
  `Reply STOP to opt out.`

Carrier rules and registration requirements change; check Twilio's current
guidance for your region.

---

## 5. No cold outbound

The product does **not** and will **not**:

- send unsolicited / cold marketing messages,
- text or DM people who never contacted the business,
- import a purchased list and blast it.

If you (the owner or founder) do outreach to *prospects* — e.g. emailing local
businesses to sell the service — that is **your** activity as a person, separate
from the product. The product itself stays inbound-only.

---

## 6. No medical or emergency triage

ServiceLead AI does **not** provide medical diagnosis, healthcare advice, or
emergency triage. The AI is instructed never to triage emergencies.

When a message describes a **risky situation** — for example a **gas leak**,
**fire**, or **flooding** — the AI flags it (via `risk_flags`) and advises the
customer to contact **emergency services** or the relevant utility. These flags
appear on the lead detail page so the owner can respond appropriately. The
product is a lead-capture tool, not a safety or medical service.

---

## 7. No legal advice (disclaimer)

Nothing in this document or in the product is legal advice. The AI does not give
legal advice, and this guide does not substitute for counsel. Compliance
obligations (TCPA, CAN-SPAM, GDPR, CCPA, PIPEDA, state and local rules, and
industry-specific regulations) depend on your situation. Talk to a lawyer.

---

## 8. Owner responsibility

The business owner is responsible for:

- the **final service response** to every customer — the AI suggests, the owner
  decides and acts;
- having a **lawful basis to contact** each customer in their jurisdiction;
- the accuracy and appropriateness of what they ultimately send;
- complying with the laws that apply to their business.

ServiceLead AI captures and qualifies inbound leads. It is **not** a substitute
for professional judgment, emergency services, or licensed advice.

---

## 9. Twilio compliance notes

- **Fail-closed webhook signatures:** in **production**, Twilio webhook
  signatures are verified and requests that cannot be verified are **rejected**
  (fail closed). The product will not act on an unverifiable inbound webhook.
- **Auth token required in production:** `TWILIO_AUTH_TOKEN` must be set in
  production so signatures can be validated. Without it, inbound Twilio webhooks
  are not trusted.
- **Endpoints:** inbound SMS hits `/api/twilio/sms/inbound`, delivery status
  hits `/api/twilio/sms/status`, and the missed-call placeholder is
  `/api/twilio/voice/missed-call-placeholder`.

---

## 10. Data minimization

Store only what's needed to do the job:

- Capture the customer's request details and contact info needed to follow up —
  no more.
- Customer data is **organization-scoped** and protected by Postgres RLS (see
  [`DATABASE.md`](DATABASE.md)). The service-role key bypasses RLS and is used
  **only** server-side (webhooks, public intake) — never in the browser.
- AI runs are logged to `ai_intake_logs` for auditability. The default `mock`
  provider sends nothing externally; if you switch to a real AI provider, that
  data leaves your infrastructure, so review their data-use terms.
- **`ai_intake_logs` contains PII.** `input_json` stores the full intake context
  including the customer's name, email, address, and message content, retained
  indefinitely by default. Before paid/production use, set a retention policy:
  periodically purge or redact old `ai_intake_logs` rows (e.g. older than 30-90
  days) and honor deletion requests for a contact across `leads`, `messages`,
  `conversations`, and `ai_intake_logs`.
- **Phone numbers are normalized to E.164** on capture so opt-out and
  de-duplication are reliable across formats (`+1 (555) 123-4567` and
  `555-123-4567` are the same contact). This makes the per-phone STOP guarantee
  robust rather than format-dependent.
- Consider documenting retention and offering deletion on request, per the
  privacy laws of your market.

---

## 11. Safe customer messaging

Messages the product sends to customers should be:

- **Short and professional** — a quick intake or acknowledgment, not a sales
  pitch.
- **Honest about identity** — clearly from the named business.
- **Free of guarantees** — the product makes **no** guaranteed-booking or
  guaranteed-revenue claims. Results depend on call volume and the owner's
  follow-up.
- **Easy to opt out of** — every outbound message includes STOP guidance.

---

## 12. In-product compliance copy

This language appears across the UI (landing FAQ, onboarding consent, public
form, settings):

> ServiceLead AI responds only to inbound customer requests. Users must have
> proper customer consent. STOP/opt-out is respected. Do not use this for cold
> outbound spam. Do not use for medical emergency triage. The business owner is
> responsible for the final service response.

---

*For deployment specifics see `DEPLOYMENT.md`; for data model and RLS see
`DATABASE.md`; for product scope see `PRD.md`.*
