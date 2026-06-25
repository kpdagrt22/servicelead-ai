# ServiceLead AI — Product Requirements Document (PRD)

> **Tagline:** Stop losing customers when you miss a call.

ServiceLead AI is a missed-call recovery and AI lead-intake system for small
local service businesses. When a call goes unanswered or a customer reaches out
through a web form, ServiceLead AI automatically engages the customer, captures
the details of the job, scores the lead, and hands the business owner a clean,
ready-to-act lead summary.

---

## 1. Problem Statement

Small local service businesses (plumbers, HVAC techs, electricians, cleaners,
pest control, salons, auto repair shops) live and die by inbound calls. The
owner is usually the technician — on a roof, under a sink, or driving between
jobs — so a large share of calls go unanswered. A missed call is frequently a
lost customer: the caller simply dials the next business in the search results.

These owners do not have a receptionist, a CRM, or time to build one. They need
something that:

- Responds instantly when they cannot.
- Collects the basic facts of the job (what, where, when, how urgent).
- Tells them which leads are worth calling back first.
- Requires almost no setup and runs on a small monthly budget.

ServiceLead AI exists to recover those leads automatically without changing how
the owner already works.

---

## 2. Target Users

**Primary:** Owner-operators and very small teams (1–10 people) in local,
appointment-driven service trades:

- Plumbing
- HVAC / heating & cooling
- Electrical
- Cleaning (residential & commercial)
- Pest control
- Salons & barbershops
- Auto repair

**Secondary:** Office managers or a single dispatcher at these businesses who
triage incoming work.

Common traits: mobile-first, non-technical, price-sensitive, time-starved, and
already losing money to missed calls.

---

## 3. Goals & Non-Goals

### Goals

- Recover missed-call leads via automatic SMS + a structured AI intake flow.
- Produce a **scored lead summary** plus a suggested next message for the owner.
- Work out of the box with **only Supabase configured** — no other paid service
  is required to demo or run the MVP.
- Keep the owner in control: ServiceLead AI gathers information; the owner
  decides whether and how to follow up.
- Be deployable by a non-expert in an afternoon.

### Non-Goals (explicitly out of scope for v1)

- **No full voice AI.** v1 does missed-call SMS + form-based intake only. No
  live AI phone answering, no call transcription, no IVR.
- **No medical or emergency triage.** The system never advises on safety,
  medical, or life-threatening situations and always directs such cases to call
  emergency services.
- **No calendar / booking integration** until customer demand is proven. v1 does
  not schedule appointments or sync with Google/Outlook calendars.
- No cold outbound marketing. The system only responds to inbound,
  customer-initiated contact.
- No guaranteed-booking or guaranteed-revenue claims anywhere in the product.

---

## 4. Personas

### Persona A — "Mike the Plumber" (owner-operator)
Runs a one-man plumbing business. Misses 30–40% of calls because he is working.
Wants more booked jobs without hiring. Checks his phone between jobs. Will not
read a manual.

> "If something can text the customer back and tell me what they need, I'll pay
> for it."

### Persona B — "Dana the Dispatcher" (small-team office manager)
Handles the phones for a 6-person HVAC company. Drowning in voicemails. Needs to
know which callers are real, urgent jobs versus tire-kickers.

> "Just tell me who to call back first and what they want."

### Persona C — "Sam the Solo Stylist" (salon / appointment based)
Cannot answer the phone while with a client. Loses booking requests constantly.
Wants a simple way to capture "who wants what, and when."

---

## 5. Core User Stories

1. As an owner, I can sign up and log in securely.
2. As an owner, I can create my business (organization) during onboarding.
3. As an owner, I can choose my service category and configure the intake
   questions customers are asked.
4. As a customer, when I fill out the public web form, a lead is created and I
   receive a relevant follow-up.
5. As an owner, I see a dashboard of all my leads with their status and score.
6. As an owner, I can open a lead and see the full conversation, captured fields,
   AI summary, and score.
7. As an owner, I get notified when a new lead comes in.
8. As a customer, I can reply STOP to opt out of any further messages.
9. As an owner, I can simulate a missed call inside the app to see how the system
   behaves before going live.
10. As an owner, I can upgrade my plan to unlock more leads and features.

---

## 6. MVP Feature List

| Area | Description |
|------|-------------|
| **Landing page** | Marketing page explaining the problem, the promise, pricing, and a clear sign-up CTA. |
| **Auth & onboarding** | Supabase email auth; guided creation of the organization and first intake config. |
| **Database schema** | Org-scoped tables for orgs, members, service categories, intake questions, leads, conversations, messages, AI intake logs, notifications. Enforced with Row Level Security. |
| **Dashboard** | List of leads with status, score, source, and timestamp; quick filters. |
| **Service categories & intake config** | Owner selects a category and customizes the questions asked during intake. |
| **AI intake flow** | Shared orchestrator builds context, runs the AI provider, captures fields, scores the lead, writes a summary and a suggested next message. |
| **Web form intake** | Public per-org form (`/u/[slug]`) that creates a lead via `POST /api/intake`. |
| **Twilio integration (optional)** | Inbound SMS webhook (`/api/twilio/sms/inbound`) routes into the same intake pipeline. Scaffolded and documented; mockable. |
| **Missed-call simulation** | In-app simulator (`/app/simulator`) to generate a test lead end-to-end. |
| **Lead detail** | Full conversation thread, captured fields, AI summary, score, and status controls. |
| **Owner notifications** | Notification abstraction (in-app + optional email via Resend) when a new lead arrives. |
| **Pricing / billing** | Plan definitions and (optional) Stripe checkout & webhook. |
| **Compliance copy** | Opt-out handling, inbound-only policy, no-triage and no-guarantee disclaimers surfaced in UI and messaging. |

### Plans (source of truth: `src/lib/constants.ts`)

| Plan | Price | Lead cap | Highlights |
|------|-------|----------|-----------|
| Starter | $29/mo | 50 leads/mo | Missed-call SMS + form intake, basic dashboard |
| Pro | $79/mo | 250 leads/mo | AI summaries, custom intake questions |
| Growth | $149/mo | Higher volume | Multi-user, priority alerts, advanced reports |
| Concierge setup | $99 one-time | — | Done-for-you onboarding & configuration |

---

## 7. Success Metrics

- **Activation:** % of new signups that complete onboarding and create at least
  one lead (target: > 60%).
- **Lead recovery:** Number of leads captured per org per week.
- **Response latency:** Time from inbound contact to first automated response
  (target: near-instant, < 30s).
- **Owner engagement:** % of leads the owner opens / acts on within 24h.
- **Conversion to paid:** % of trial orgs that subscribe.
- **Retention:** Month-2 and month-3 logo retention.

---

## 8. Acceptance Criteria

The MVP is considered complete when all of the following are demonstrably true:

- [ ] A new user can **sign up and log in**.
- [ ] A logged-in user can **create an organization**.
- [ ] An owner can **configure service categories and intake questions**.
- [ ] Submitting the **public web form creates a lead** in the owner's org.
- [ ] The **mock AI provider** produces a lead **summary and a suggested next
      message** with no API key configured.
- [ ] The **dashboard lists leads** with their **statuses** and scores.
- [ ] The **lead detail page shows the conversation and the AI summary**.
- [ ] **STOP / opt-out** handling exists and is honored.
- [ ] **Twilio routes are scaffolded and documented** (work when configured,
      degrade gracefully when not).
- [ ] An **owner notification abstraction exists** (in-app, optional email).
- [ ] All data is **org-scoped** and protected by RLS.
- [ ] **Documentation is complete** (PRD, Architecture, Deployment).
- [ ] **Tests pass** (Vitest unit tests, Playwright end-to-end).

---

## 9. Compliance Requirements

ServiceLead AI must operate within messaging and consumer-protection norms:

- **Inbound-only.** The system responds only to contact the customer initiates
  (a missed call, a form submission, or an inbound SMS). It never sends cold or
  unsolicited outbound messages.
- **Opt-out always honored.** Replying STOP (or equivalent) immediately halts
  automated messaging for that contact and is recorded.
- **No medical / emergency triage.** The system does not assess safety or medical
  urgency and directs emergencies to call the appropriate emergency number.
- **No guarantees.** No copy may promise guaranteed bookings, guaranteed revenue,
  or specific outcomes.
- **Owner controls conversations.** Automation assists; the human owner remains
  responsible for and in control of all customer communication.

---

## 10. Out-of-Scope / Future Roadmap

These are intentionally deferred and may be revisited once demand is validated:

- Full **voice AI** (live call answering, transcription, IVR).
- **Calendar / booking** integration and self-scheduling.
- **Two-way live SMS console** for the owner inside the app.
- **Advanced analytics** and revenue attribution reporting.
- **Multi-channel intake** (WhatsApp, web chat widget, Facebook/Google
  Messages).
- **Team roles & permissions** beyond basic multi-user.
- **CRM / field-service software integrations** (Jobber, Housecall Pro, etc.).
- **Localization / multi-language** intake.

---

*This document is the product source of truth for the ServiceLead AI MVP.
Engineering details are described in `ARCHITECTURE.md`; operational setup is in
`DEPLOYMENT.md`.*
