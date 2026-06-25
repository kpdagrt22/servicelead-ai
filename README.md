# ServiceLead AI

**Stop losing customers when you miss a call.**

ServiceLead AI is a missed-call recovery and AI lead-intake system for local
service businesses (plumbers, HVAC, electricians, cleaners, pest control,
salons, auto repair). When a business misses a call, ServiceLead AI texts the
caller, qualifies the job with an AI intake assistant, and hands the owner a
clean, scored lead summary.

This is **not** a generic chatbot — it's a revenue-recovery tool. The MVP
deliberately ships **missed-call SMS + form-based AI intake** (no full voice AI),
and is designed to run end-to-end with **only Supabase configured**. Twilio,
Stripe, Resend, and real AI providers are all optional and degrade gracefully.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Supabase setup & migrations](#supabase-setup--migrations)
- [Using the mock AI](#using-the-mock-ai)
- [Simulating a missed call](#simulating-a-missed-call)
- [Configuring Twilio later](#configuring-twilio-later)
- [Tests](#tests)
- [Project structure](#project-structure)
- [Docs](#docs)
- [Compliance](#compliance)

---

## Features

- **Conversion landing page** + pricing & FAQ
- **Supabase auth** + multi-step **onboarding**
- **Organization-scoped** data with **Row Level Security**
- **AI intake** abstraction: `mock` (default, no key), `openai`, `anthropic`
- **Public web intake form** at `/u/[slug]` (works with zero telephony)
- **In-app simulator** for missed call / inbound SMS / web form
- **Dashboard** with metrics, status board, recent leads
- **Lead detail** with conversation, AI summary, scoring, owner notes, replies
- **STOP / opt-out** handling baked into every messaging path
- **Twilio** inbound SMS, status callback, and missed-call placeholder webhooks
- **Owner email notifications** via Resend (console fallback)
- **Stripe** subscription billing abstraction (trial mode without keys)

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres, Auth,
Storage, RLS) · Zod · React Hook Form · Stripe · Twilio · Resend · Vitest ·
Playwright.

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure env (Supabase only is enough to start)
cp .env.example .env.local
#   -> fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#      SUPABASE_SERVICE_ROLE_KEY

# 3. Apply the database migrations (see below)

# 4. Run
npm run dev
# open http://localhost:3000
```

> You can boot the app and view the marketing pages with **no env at all**.
> Auth, dashboard, and intake require Supabase.

---

## Environment variables

See [`.env.example`](.env.example) for the full annotated list. The essentials:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key (browser/server, RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role for webhooks + public intake |
| `AI_PROVIDER` | – | `mock` (default) \| `openai` \| `anthropic` |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | – | Real AI (falls back to mock) |
| `TWILIO_*` | – | SMS (simulated if absent) |
| `RESEND_API_KEY` | – | Owner emails (console fallback) |
| `STRIPE_*` | – | Billing (trial mode if absent) |
| `NEXT_PUBLIC_APP_URL` | – | Public URL, default `http://localhost:3000` |

The app never crashes on a missing optional integration — it shows a
"not configured" notice and continues.

---

## Supabase setup & migrations

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the **Project URL**, **anon key**, and **service_role key** into
   `.env.local`.
3. Apply the migrations in [`supabase/migrations`](supabase/migrations), **in
   order**:

**Option A — Supabase CLI**

```bash
supabase link --project-ref <your-ref>
supabase db push
```

**Option B — SQL editor (copy/paste, in order)**

```
supabase/migrations/0001_init.sql      # tables + indexes
supabase/migrations/0002_rls.sql       # row level security
supabase/migrations/0003_triggers.sql  # profile/org triggers + seed defaults
```

4. (Auth) In **Authentication → Providers → Email**, enable email/password. For
   the smoothest local dev you can **disable "Confirm email"** so signup logs you
   straight in.

What the triggers do automatically:

- create a `profiles` row when a user signs up;
- add the owner as an `organization_members` row on org creation;
- **seed default service categories + intake templates** for each new org;
- keep `updated_at` and `conversations.last_message_at` fresh.

See [`docs/DATABASE.md`](docs/DATABASE.md) for the full schema & RLS model.

---

## Using the mock AI

`AI_PROVIDER=mock` (the default) uses a **deterministic, rule-based** intake
engine — no API key, no network, no cost. It extracts fields, scores urgency,
picks the next question, and writes the owner summary. This powers tests and the
demo.

To use a real model, set `AI_PROVIDER=openai` (+ `OPENAI_API_KEY`) or
`AI_PROVIDER=anthropic` (+ `ANTHROPIC_API_KEY`). If the key is missing or the
call fails, the service **automatically falls back to mock** and records the
fallback in `ai_intake_logs`. See [`docs/AI_INTAKE_WORKFLOW.md`](docs/AI_INTAKE_WORKFLOW.md).

---

## Simulating a missed call

No telephony required:

1. Sign up → complete onboarding.
2. Go to **Simulator** (`/app/simulator`).
3. Pick **Missed call**, **Inbound SMS**, or **Web form**, enter a phone number
   (and a message for SMS/form), and run it.
4. You'll land on the **lead detail** page with the AI summary, score, extracted
   fields, conversation, and suggested reply.

You can also use the **public intake form** at `/u/<your-org-slug>` (shown on the
Service & intake page and Settings).

---

## Configuring Twilio later

Twilio is optional. When `TWILIO_*` env vars are absent, outbound sends are
simulated (logged) and inbound is exercised via the simulator. When ready:

1. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and either
   `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_PHONE_NUMBER`.
2. In **Settings → Configure SMS**, register your Twilio number.
3. Point the Twilio webhooks at:
   - Inbound SMS → `/api/twilio/sms/inbound`
   - Status callback → `/api/twilio/sms/status`
   - Missed call (voice) → `/api/twilio/voice/missed-call-placeholder`

Full walkthrough: [`docs/TWILIO_SETUP.md`](docs/TWILIO_SETUP.md).

---

## Tests

```bash
npm run test        # vitest unit tests (scoring, opt-out, status, schema, mock AI)
npm run typecheck   # tsc --noEmit
npm run test:e2e    # Playwright smoke tests (no backend needed)
```

Unit tests cover: AI intake schema validation, lead scoring, STOP/opt-out
handling, lead status transitions, and owner-summary/next-message generation.
See [`docs/VALIDATION_PLAN.md`](docs/VALIDATION_PLAN.md) for the manual
validation checklist and the documented full-flow E2E.

---

## Project structure

```
src/
  app/
    page.tsx                     landing
    pricing/                     pricing page
    login/ signup/               auth
    onboarding/                  business setup (+ server action)
    u/[slug]/                    public intake form (by slug)
    intake/[organizationId]/     public intake form (by id, alias)
    app/                         authenticated dashboard
      page.tsx                   dashboard metrics + board
      leads/                     list + [id] detail (+ actions)
      intake/                    service categories & questions
      simulator/                 missed-call / SMS / form simulator
      billing/  settings/        billing + settings
    api/
      intake/                    public form submission
      twilio/sms/inbound|status  webhooks
      twilio/voice/...           missed-call placeholder
      stripe/checkout|webhook    billing
  lib/
    ai/                          service + providers (mock/openai/anthropic) + schema
    leads/                       scoring, status, intake orchestration
    twilio/                      client + opt-out
    supabase/                    client/server/admin
    email/  stripe/              integrations
  components/                    UI (marketing, app, public, auth)
  types/database.ts              hand-maintained DB types
supabase/migrations/            0001 schema, 0002 RLS, 0003 triggers
tests/unit/  tests/e2e/         vitest + playwright
docs/                           PRD, architecture, DB, Twilio, AI, compliance, etc.
```

## Docs

- [PRD](docs/PRD.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [Twilio setup](docs/TWILIO_SETUP.md)
- [AI intake workflow](docs/AI_INTAKE_WORKFLOW.md)
- [Compliance](docs/COMPLIANCE.md)
- [Validation plan](docs/VALIDATION_PLAN.md)
- [Deployment](docs/DEPLOYMENT.md)

## Compliance

ServiceLead AI responds **only** to inbound, customer-initiated requests (missed
calls, SMS replies, form submissions). It is **not** for cold outbound. STOP /
opt-out is always honored. It does **not** provide medical advice or emergency
triage. The business owner is responsible for the final service response. See
[`docs/COMPLIANCE.md`](docs/COMPLIANCE.md).
