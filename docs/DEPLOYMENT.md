# ServiceLead AI — Deployment Guide

This guide walks through deploying ServiceLead AI to **Vercel** (app hosting) and
**Supabase** (database, auth, storage). The app is designed to run with **only
Supabase configured** — every other integration (Twilio, Stripe, Resend, AI
providers) is optional and can be added later.

---

## 1. Prerequisites

- A [Vercel](https://vercel.com) account.
- A [Supabase](https://supabase.com) account.
- Node.js (LTS) and the package manager used by the repo installed locally.
- (Optional) The [Supabase CLI](https://supabase.com/docs/guides/cli) for
  applying migrations from your machine.
- (Optional, only if enabling those features) Twilio, Stripe, Resend, and/or an
  OpenAI/Anthropic account.

---

## 2. Create the Supabase Project

1. In the Supabase dashboard, **New project**. Choose a name, a strong database
   password, and a region close to your users.
2. Wait for provisioning to finish.
3. From **Project Settings → API**, copy these values (you'll need them for env
   vars):
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret;
     server-only)

---

## 3. Apply Database Migrations

Migrations live in `supabase/migrations/` and **must be applied in order**:

1. `0001_init.sql`
2. `0002_rls.sql`
3. `0003_triggers.sql`
4. `0004_subscriptions_unique.sql`

### Option A — Supabase CLI (recommended)

```bash
# Authenticate and link to your project (run once)
supabase login
supabase link --project-ref <your-project-ref>

# Push all migrations in order
supabase db push
```

### Option B — SQL Editor (manual)

In the Supabase dashboard, open **SQL Editor** and run each migration's contents
**in order**: `0001_init.sql`, `0002_rls.sql`, `0003_triggers.sql`, then
`0004_subscriptions_unique.sql`. Do
not skip or reorder — RLS policies and triggers depend on the tables created in
`0001`.

After applying, confirm in **Table Editor** that the core tables exist and that
**RLS is enabled** on them.

---

## 4. Enable Email Authentication

1. In Supabase, go to **Authentication → Providers** and ensure **Email** is
   enabled.
2. Under **Authentication → URL Configuration**, set the **Site URL** to your
   production URL (the same value you'll use for `NEXT_PUBLIC_APP_URL`), and add
   it to the list of allowed redirect URLs.
3. (Optional) Configure email templates / SMTP if you want branded auth emails.

---

## 5. Configure Environment Variables in Vercel

In the Vercel project, go to **Settings → Environment Variables** and add the
following. Set them for **Production** (and Preview/Development as needed).

### Required (Supabase — minimum to run)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only; used by webhooks + public intake) |
| `NEXT_PUBLIC_APP_URL` | **Must be the production URL** (e.g. `https://app.yourdomain.com`). Used for links, redirects, and webhook callbacks. |

### Optional (AI provider)

| Variable | Description |
|----------|-------------|
| `AI_PROVIDER` | `mock` (default), `openai`, or `anthropic`. Omit to use the mock provider — no key needed. |
| `OPENAI_API_KEY` | Required only if `AI_PROVIDER=openai`. |
| `ANTHROPIC_API_KEY` | Required only if `AI_PROVIDER=anthropic`. |

### Optional (Twilio — inbound SMS)

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID. |
| `TWILIO_AUTH_TOKEN` | Twilio auth token (used to validate inbound webhooks). |
| `TWILIO_PHONE_NUMBER` | The number customers text. |

### Optional (Stripe — billing)

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the `/api/stripe/webhook` endpoint. |
| `STRIPE_PRICE_STARTER` | Price ID for the Starter plan. |
| `STRIPE_PRICE_PRO` | Price ID for the Pro plan. |
| `STRIPE_PRICE_GROWTH` | Price ID for the Growth plan. |

### Optional (Resend — email notifications)

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Enables owner email notifications. Without it, in-app notifications still work. |

> If an optional integration's variables are omitted, the related feature shows a
> "not configured" notice and the rest of the app continues to work.

---

## 6. Deploy to Vercel

1. Import the repository into Vercel (**New Project → Import Git Repository**).
2. Vercel auto-detects Next.js; keep the default build settings.
3. Ensure the environment variables from Section 5 are set for **Production**.
4. Click **Deploy**.
5. After the first deploy, set up a custom domain if desired, and make sure
   `NEXT_PUBLIC_APP_URL` and the Supabase **Site URL** match the final
   production URL. Redeploy if you change either.

---

## 7. Wire Twilio Webhooks (only if using Twilio)

After the app is live and you know the production URL:

1. In the Twilio console, open your phone number's **Messaging** configuration.
2. Set **A message comes in** to **Webhook**, method **POST**, URL:
   ```
   https://<your-production-url>/api/twilio/sms/inbound
   ```
3. Save. Send a test SMS to the number and confirm a lead appears.

> Twilio webhooks must point at the deployed production URL, not localhost. For
> local testing, use a tunnel (e.g. ngrok) and the tunnel URL.

---

## 8. Configure Stripe (only if using billing)

1. In the Stripe dashboard, create products/prices for the **Starter**, **Pro**,
   and **Growth** plans and copy each **Price ID** into the corresponding
   `STRIPE_PRICE_*` env var.
2. Create a **webhook endpoint** pointing to:
   ```
   https://<your-production-url>/api/stripe/webhook
   ```
3. Copy the endpoint's **signing secret** into `STRIPE_WEBHOOK_SECRET`.
4. Redeploy so the new env vars take effect.
5. Use Stripe test mode and the CLI (`stripe listen` / `stripe trigger`) to
   verify the webhook before going live.

---

## 9. Post-Deploy Smoke Test Checklist

Run through this after every production deploy:

- [ ] Landing page loads at the production URL.
- [ ] Sign up with a new email, then log in.
- [ ] Complete onboarding: create an organization.
- [ ] Configure a service category and at least one intake question.
- [ ] Open the public form at `/u/<your-org-slug>` and submit a test lead.
- [ ] Confirm the lead appears on the dashboard with a status and score.
- [ ] Open the lead detail and verify the conversation + AI summary + suggested
      next message (mock provider is fine).
- [ ] Run the in-app **simulator** (`/app/simulator`) and confirm a lead is
      created.
- [ ] Confirm an owner notification fires (in-app; email if Resend configured).
- [ ] Send a STOP/opt-out reply (or simulate one) and confirm it is honored.
- [ ] (If Twilio) Text the number and confirm a lead is created.
- [ ] (If Stripe) Run a test checkout and confirm the webhook updates the plan.
- [ ] Verify data is org-scoped (a second org cannot see the first org's leads).

---

## 10. Rate Limiting Note (Important for Scale)

The MVP ships with an **in-memory rate limiter**. This is **single-instance
only** — each serverless instance keeps its own counters, so on Vercel (where
requests fan out across many instances) the limits are not enforced globally.

For multi-instance / production scale, replace the in-memory limiter with a
shared store such as **Upstash Redis** (or another Redis-compatible service) so
limits are enforced consistently across all instances. Until then, treat the
in-memory limiter as a best-effort safeguard, not a hard guarantee.

---

*For product scope see `PRD.md`; for system internals see `ARCHITECTURE.md`.*
