# Compliance & responsible use

ServiceLead AI is a **revenue-recovery tool for inbound customer requests**. It
is deliberately designed *not* to enable spam or cold outreach. This document
states the product's guardrails and the business owner's responsibilities.

## Core principles

1. **Inbound only.** The product responds only to customer-initiated contact:
   missed calls, SMS replies, and form submissions. It **never** initiates cold
   outbound and **never** auto-DMs random people.
2. **Opt-out is sacred.** STOP / UNSUBSCRIBE / CANCEL / END / QUIT are always
   honored. Once a customer opts out, the system never messages them again.
3. **Consent is logged.** Every lead records `consent_status` and
   `consent_source` (e.g. `web_form`, `sms_reply`, `missed_call`,
   `simulator:...`).
4. **No guarantees.** The product never claims guaranteed bookings or guaranteed
   revenue. Results depend on call volume and follow-up.
5. **Not medical.** No medical diagnosis, healthcare advice, or emergency triage.
   Messages describing medical emergencies are flagged and the customer is told
   to call emergency services.
6. **Owner in control.** The business owner can see and control every
   conversation, edit AI suggestions, and send their own replies.

## What the product will NOT do

- Send unsolicited / cold marketing messages.
- Message a number that has opted out.
- Promise outcomes ("guaranteed booking", "guaranteed revenue").
- Provide medical, legal, or safety-critical advice.
- Act as a full AI voice receptionist (out of scope for v1).

## SMS / TCPA & carrier compliance

- **Prior consent**: the business owner is responsible for ensuring they have a
  lawful basis to text a given customer. Replying to your own missed call or
  submitting your intake form constitutes inbound, customer-initiated contact.
- **Opt-out keywords** are detected on the first word of an inbound message and
  set `leads.opt_out = true`. See
  [`src/lib/twilio/optout.ts`](../src/lib/twilio/optout.ts).
- **Opt-out footer**: outbound messages include `Reply STOP to opt out.`
- **Identification**: the first outreach identifies the business by name.
- **A2P 10DLC**: for production US SMS you must register your brand/campaign with
  Twilio. ServiceLead AI's use case is "customer care / lead follow-up".

## Consent capture in the UI

- **Onboarding** requires the owner to confirm they will only respond to inbound
  customers and that they are responsible for required consent.
- **Public intake form** requires the customer to check a consent box agreeing
  to be contacted (incl. SMS) about *their* request, with STOP guidance.

## Data & privacy

- Customer data is **organization-scoped** and protected by Postgres RLS (see
  [`DATABASE.md`](DATABASE.md)).
- The service-role key bypasses RLS and is used only server-side in webhooks and
  the public intake endpoint — never in the browser.
- AI runs are logged to `ai_intake_logs` for auditability. If you send data to a
  real AI provider (OpenAI/Anthropic), that data leaves your infrastructure;
  review their data-use terms. The default `mock` provider sends nothing
  externally.
- Consider documenting retention and providing deletion on request per GDPR /
  CCPA / PIPEDA / Australian Privacy Principles, depending on your market
  (US/EU/Canada/Australia).

## Safety flags

The AI emits `risk_flags` for:

- Possible safety hazards (gas leak, fire, sparking, flooding) → advise calling
  emergency services / the utility.
- Possible medical situations → out of scope; advise emergency services.

These appear on the lead detail page so the owner can respond appropriately.

## Owner responsibility

The business owner is responsible for the **final service response** and for
complying with the laws of their jurisdiction. ServiceLead AI is a tool to
capture and qualify inbound leads — not a substitute for professional judgment,
emergency services, or licensed advice.

## In-product compliance copy

This language appears across the UI (landing FAQ, onboarding consent, public
form, settings):

> ServiceLead AI responds only to inbound customer requests. Users must have
> proper customer consent. STOP/opt-out is respected. Do not use this for cold
> outbound spam. Do not use for medical emergency triage. The business owner is
> responsible for the final service response.
