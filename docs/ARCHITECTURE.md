# ServiceLead AI — Architecture

This document describes the system architecture of ServiceLead AI: the major
components, the request flows that create and process leads, the AI provider
abstraction, authentication, the service-role boundary, and the design
philosophy that keeps the product runnable with only Supabase configured.

---

## 1. High-Level Overview

ServiceLead AI is a Next.js (App Router) application backed by Supabase, with a
set of **optional** third-party integrations that all degrade gracefully when
not configured.

```
                          +--------------------------------------------------+
                          |                Next.js (App Router)              |
                          |                                                  |
   Customer (web form) -->|  Route Handlers (/api/*)   Server Components     |
   Customer (SMS)      -->|  - /api/intake             - dashboard, lead     |
   Owner (browser)     -->|  - /api/twilio/sms/inbound   detail, settings    |
                          |  - /api/stripe/webhook     Server Actions        |
                          |                            Middleware (session)  |
                          +----------------------+---------------------------+
                                                 |
                          +----------------------v---------------------------+
                          |        Shared domain layer (src/lib)             |
                          |                                                  |
                          |   processIntake()      AiProvider (mock/openai/  |
                          |   (leads/intake.ts)      anthropic)              |
                          |   auth helpers         notifications             |
                          +------+----------------------------+--------------+
                                 |                            |
                  +--------------v-------+      +-------------v--------------+
                  |      Supabase        |      |   Optional integrations    |
                  |  Postgres + RLS      |      |   - Twilio (SMS)           |
                  |  Auth (SSR cookies)  |      |   - Stripe (billing)       |
                  |  Storage             |      |   - Resend (email)         |
                  |                      |      |   - OpenAI / Anthropic     |
                  +----------------------+      +----------------------------+
```

Key principle: **all three intake entry points converge on a single
orchestrator**, `processIntake`, so behavior is consistent no matter how a lead
arrives.

---

## 2. Lead Intake Flows

There are three ways a lead can enter the system. Each gathers a source-specific
payload and then calls the shared orchestrator in
`src/lib/leads/intake.ts`.

### (a) Public Web Intake

1. A customer opens the org's public page at `/u/[slug]` and submits the intake
   form.
2. The browser sends `POST /api/intake` with the org slug, contact info, and
   answers (validated with Zod).
3. The route handler uses the **admin (service-role) client** to look up the org
   and write the lead, because the submitter is unauthenticated.
4. It calls `processIntake(...)`.

### (b) In-App Simulator

1. An authenticated owner opens `/app/simulator`.
2. They submit a simulated missed-call / inbound message.
3. The action runs in the owner's session context and calls
   `processIntake(...)` with a `simulator` source.
4. This lets owners exercise the full pipeline before going live, with no Twilio
   number required.

### (c) Twilio Inbound SMS

1. Twilio delivers an inbound SMS to `POST /api/twilio/sms/inbound` (configured
   webhook).
2. The handler validates the request and extracts the sender, the org's
   destination number, and the message body.
3. It uses the **admin client** (request is unauthenticated, from Twilio) and
   calls `processIntake(...)` with a `twilio` source.
4. If Twilio is not configured, this route is still present and documented but is
   inactive.

### The Shared Orchestrator: `processIntake`

Regardless of source, `processIntake` performs the same sequence:

1. **Find or create** the lead and its conversation (keyed by org + contact).
2. **Handle opt-out** — if the inbound message is a STOP/opt-out keyword, record
   the opt-out, stop automated messaging, and return early.
3. **Build AI context** — assemble org config, the configured intake questions,
   captured fields so far, and the conversation history.
4. **Run the AI** via `src/lib/ai/service.ts` to extract/normalize fields,
   produce a **lead score**, write a **summary**, and draft a **suggested next
   message**.
5. **Persist** the captured fields, score, and summary onto the lead; append the
   inbound/outbound messages to the conversation.
6. **Log** the AI interaction to `ai_intake_logs` (provider, inputs, outputs,
   timing) for auditing and debugging.
7. **Notify the owner** through the notification abstraction (in-app, optional
   email).

This single point of convergence means opt-out, scoring, logging, and
notifications behave identically across all channels.

---

## 3. AI Provider Abstraction

AI work is hidden behind a provider interface so the product can run with no
external AI key.

- **`AiProvider` interface** — defines the operations the intake flow needs
  (e.g., extract fields, score, summarize, draft next message).
- **Implementations:**
  - `mock` — the **default**. Deterministic, no API key, suitable for local dev,
    demos, tests, and "Supabase-only" deployments.
  - `openai` — uses OpenAI when a key and provider selection are configured.
  - `anthropic` — uses Anthropic when configured.
- **Selection** is driven by environment/config; absent configuration falls back
  to `mock`.
- **Resilient fallback:** if a configured external provider errors at runtime,
  the service **falls back to the mock** rather than failing the intake. The lead
  is still captured and the owner is still notified.

This abstraction lives in `src/lib/ai/service.ts`.

---

## 4. Authentication

Authentication is handled by Supabase Auth using the SSR cookie pattern.

- **Supabase SSR cookies** carry the session; the browser, server components,
  route handlers, and server actions all read it.
- **Middleware** refreshes the session on each request so server-rendered pages
  see a valid session and tokens stay fresh.
- **Helpers in `src/lib/auth.ts`:**
  - `getSessionContext()` — resolves the current user and their org membership
    (returns null/anonymous when there is no session).
  - `requireOrg()` — guards protected pages/actions; ensures there is an
    authenticated user with an org and returns the org context, otherwise
    redirects/throws.

All authenticated, owner-facing data access flows through these helpers so org
scoping is consistent.

---

## 5. Supabase Clients & the Service-Role Boundary

There are three Supabase client factories, each with a clear purpose:

| Client | File | Used by | Auth level |
|--------|------|---------|-----------|
| Browser | `src/lib/supabase/client.ts` | Client components | Anon key, user session |
| Server | `src/lib/supabase/server.ts` | Server components, actions, authenticated route handlers | Anon key, user session (RLS enforced) |
| Admin | `src/lib/supabase/admin.ts` | **Webhooks + public intake only** | Service role (bypasses RLS) |

**Boundary rule:** the **service-role / admin client is used only where the
caller is necessarily unauthenticated** — namely the public web intake endpoint
(`/api/intake`), the Twilio inbound webhook, and the Stripe webhook. Everywhere
else uses the session-scoped server/browser client so **Row Level Security**
enforces org isolation. This keeps the powerful, RLS-bypassing key off all
user-facing paths.

### Database & RLS

Schema and policies are defined in ordered migrations under
`supabase/migrations/`:

- `0001_init.sql` — core tables (orgs, members, service categories, intake
  questions, leads, conversations, messages, ai_intake_logs, notifications,
  etc.).
- `0002_rls.sql` — Row Level Security policies scoping every table to the owning
  organization.
- `0003_triggers.sql` — triggers (timestamps, derived fields, and related
  automation).

---

## 6. Graceful Degradation Philosophy

The product is designed to run with **only Supabase configured**. Every other
integration is optional and self-detecting:

- **AI** → defaults to `mock` (no key needed); falls back to mock on error.
- **Twilio** → routes exist and are documented; inactive and clearly marked "not
  configured" when no credentials are present.
- **Stripe** → billing UI shows a "not configured" notice; the app remains fully
  usable without payments.
- **Resend** → email notifications no-op (in-app notifications still fire) when
  no key is present.

The result: a developer can clone, point at a Supabase project, and exercise the
entire lead lifecycle end-to-end without any paid third-party account.

---

## 7. Folder Structure Overview

```
src/
  app/                       # Next.js App Router
    (marketing)/             # landing, pricing
    app/                     # authenticated dashboard, lead detail, settings
      simulator/             # in-app missed-call simulator
    u/[slug]/                # public per-org intake form
    api/
      intake/                # public web intake (POST)
      twilio/sms/inbound/    # Twilio inbound SMS webhook
      stripe/webhook/        # Stripe webhook
  lib/
    constants.ts             # plans, pricing, limits, service categories
    auth.ts                  # getSessionContext, requireOrg
    ai/
      service.ts             # AiProvider interface + mock/openai/anthropic
    leads/
      intake.ts              # processIntake orchestrator
    supabase/
      client.ts              # browser client
      server.ts              # session-scoped server client
      admin.ts               # service-role client (webhooks + public intake)
    notifications/           # owner notification abstraction
  components/                # UI components
supabase/
  migrations/
    0001_init.sql
    0002_rls.sql
    0003_triggers.sql
tests/                       # Vitest (unit) + Playwright (e2e)
docs/                        # PRD, ARCHITECTURE, DEPLOYMENT
```

---

## 8. Key Design Decisions & Tradeoffs

- **Single intake orchestrator.** Convergence on `processIntake` guarantees
  consistent opt-out, scoring, logging, and notification behavior across web,
  simulator, and SMS — at the cost of a slightly heavier shared function.
- **Mock-first AI.** Defaulting to a deterministic mock makes the app demoable
  and testable with zero spend, and makes runtime fallback safe. Tradeoff: mock
  output is illustrative, not production-quality.
- **Strict service-role boundary.** Confining the admin client to unauthenticated
  webhooks/public-intake minimizes blast radius and leans on RLS for everything
  else. Tradeoff: public-intake code must carefully scope writes by org slug.
- **Optional-by-default integrations.** Graceful degradation lowers setup
  friction and keeps the MVP cheap to run, at the cost of extra "is it
  configured?" branching.
- **App Router server-first.** Server components, actions, and route handlers
  keep secrets server-side and reduce client JS. Tradeoff: more attention to the
  SSR cookie/session-refresh flow in middleware.
- **In-memory rate limiting (MVP).** Simple and dependency-free, but
  single-instance only; see `DEPLOYMENT.md` for the multi-instance
  recommendation (Upstash/Redis).
