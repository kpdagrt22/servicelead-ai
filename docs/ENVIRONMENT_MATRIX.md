# Environment Matrix — ServiceLead AI

This document is the canonical reference for every environment variable used by
ServiceLead AI (Next.js App Router + Supabase + Vercel). The application is
designed to **run with only Supabase configured**. Every other integration is
optional and **degrades gracefully** — when an integration is not configured the
app shows a "not configured" notice instead of crashing.

- AI defaults to a **deterministic mock** provider when no AI key is present.
- Verify your environment locally with: `npm run verify:env`
- Confirm a running deployment with the health probe: `/api/health`

> **Security rule of thumb:** Variables prefixed with `NEXT_PUBLIC_` are bundled
> into the browser and are **never secret**. Everything else is **server-only**
> and must never be exposed to the client or committed to source control.

---

## Variable Matrix

| Variable | Required locally? | Required in production? | Public or server-only? | Used by | Example placeholder | Failure behavior if missing | Where to set in Vercel | Security notes |
|---|---|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes | Public | Supabase client (auth, dashboard, intake) | `https://YOUR-PROJECT.supabase.co` | Auth, dashboard, and intake disabled | Project Settings → Environment Variables (all environments) | Public by design; safe to expose. Identifies your project only. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Yes | Public | Supabase client (RLS-scoped access) | `eyJhbGciOi...ANON_KEY_xxx` | Auth, dashboard, and intake disabled | Project Settings → Environment Variables (all environments) | Public by design; protected by Row Level Security. Not a service key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Recommended (required for public intake / webhooks / AI logging) | Yes | Server-only (secret) | Admin Supabase client (bypasses RLS) | `eyJhbGciOi...SERVICE_ROLE_xxx` | Public intake form, Twilio webhooks, and `ai_intake_logs` writes fail | Project Settings → Environment Variables (Production + Preview), mark as Sensitive | **Highly sensitive.** Bypasses RLS. Never expose to client; server routes only. |
| `AI_PROVIDER` | No | No | Public-ish (non-secret) | AI provider selector | `mock` | Defaults to `mock` (deterministic) | Project Settings → Environment Variables | Not secret. Valid values: `mock`, `openai`, `anthropic`. |
| `OPENAI_API_KEY` | Only if `AI_PROVIDER=openai` | Only if `AI_PROVIDER=openai` | Server-only (secret) | OpenAI provider | `sk-proj-xxx` | Falls back to deterministic mock provider | Project Settings → Environment Variables, mark as Sensitive | Secret. Server-only. Billing impact if leaked. |
| `ANTHROPIC_API_KEY` | Only if `AI_PROVIDER=anthropic` | Only if `AI_PROVIDER=anthropic` | Server-only (secret) | Anthropic provider | `sk-ant-xxx` | Falls back to deterministic mock provider | Project Settings → Environment Variables, mark as Sensitive | Secret. Server-only. Billing impact if leaked. |
| `TWILIO_ACCOUNT_SID` | No | No | Server-only | Twilio client + webhook signature validation | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | SMS simulated/logged; webhooks fail closed in prod if auth token also missing | Project Settings → Environment Variables | Identifier, but keep server-side with the auth token. |
| `TWILIO_AUTH_TOKEN` | No | No | Server-only (secret) | Twilio client + webhook signature validation | `your_twilio_auth_token_xxx` | SMS simulated/logged; **webhooks FAIL CLOSED in production (reject)** | Project Settings → Environment Variables, mark as Sensitive | **Secret.** Required to validate inbound webhook signatures. |
| `TWILIO_MESSAGING_SERVICE_SID` | No | No | Server-only | Outbound SMS routing | `MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Outbound SMS routing unavailable; SMS simulated/logged | Project Settings → Environment Variables | Not a secret, but keep server-side. Use this OR a phone number. |
| `TWILIO_PHONE_NUMBER` | No | No | Server-only | Outbound SMS routing | `+15555550123` | Outbound SMS routing unavailable; SMS simulated/logged | Project Settings → Environment Variables | Not a secret, but keep server-side. |
| `RESEND_API_KEY` | No | No | Server-only (secret) | Owner email notifications (Resend) | `re_xxx` | Email logged to console fallback instead of sent | Project Settings → Environment Variables, mark as Sensitive | Secret. Server-only. |
| `FROM_EMAIL` | No | No | Server-only | Resend sender address | `notifications@yourdomain.com` | Resend sender unset; relies on default/console fallback | Project Settings → Environment Variables | Not secret. Must be a verified Resend sender domain to send. |
| `STRIPE_SECRET_KEY` | No | No | Server-only (secret) | Billing / Stripe API | `sk_test_xxx` | App runs in trial mode; no crash | Project Settings → Environment Variables, mark as Sensitive | **Secret.** Server-only. Use `sk_test_` for non-prod. |
| `STRIPE_WEBHOOK_SECRET` | No | No | Server-only (secret) | Verifies `/api/stripe/webhook` | `whsec_xxx` | Stripe webhook verification unavailable | Project Settings → Environment Variables, mark as Sensitive | **Secret.** Server-only. Per-endpoint signing secret. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | No | Public | Client-side Stripe | `pk_test_xxx` | Client Stripe unavailable | Project Settings → Environment Variables | Public by design; safe to expose. |
| `NEXT_PUBLIC_STRIPE_PRICE_STARTER` | No | No | Public (not secret) | Checkout price ID (Starter) | `price_xxxStarter` | Checkout shows a useful "not configured" message | Project Settings → Environment Variables | Public price ID; not secret. |
| `NEXT_PUBLIC_STRIPE_PRICE_PRO` | No | No | Public (not secret) | Checkout price ID (Pro) | `price_xxxPro` | Checkout shows a useful "not configured" message | Project Settings → Environment Variables | Public price ID; not secret. |
| `NEXT_PUBLIC_STRIPE_PRICE_GROWTH` | No | No | Public (not secret) | Checkout price ID (Growth) | `price_xxxGrowth` | Checkout shows a useful "not configured" message | Project Settings → Environment Variables | Public price ID; not secret. |
| `NEXT_PUBLIC_APP_URL` | No (defaults to `http://localhost:3000`) | Yes (must be the prod URL) | Public | Links, redirects, webhook callback URLs | `https://app.yourdomain.com` | Locally defaults to `http://localhost:3000`; in prod links/redirects/webhook callbacks break | Project Settings → Environment Variables (Production = prod URL) | Public. Must exactly match the deployed production URL. |
| `ADMIN_EMAILS` | No | No | Server-only (comma-separated) | Allowlist for `/app/admin` | `you@example.com,ops@example.com` | Non-admins get 404 at `/app/admin` | Project Settings → Environment Variables | Not a credential, but treat as sensitive (controls admin access). |

---

## Environment Profiles

Each profile lists the **minimal** set of variables needed for that scenario.
Anything not listed can be omitted and the app degrades gracefully.

### Profile A — Local Mock

The fastest way to develop. AI uses the deterministic mock provider; no Twilio,
Stripe, or Resend required. Supabase is optional but recommended so auth, the
dashboard, and intake work end-to-end.

```bash
# Supabase (optional but recommended for full local flows)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...ANON_KEY_xxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...SERVICE_ROLE_xxx   # needed for public intake / webhooks / AI logging

# AI — deterministic mock (no key required)
AI_PROVIDER=mock

# NEXT_PUBLIC_APP_URL is optional locally (defaults to http://localhost:3000)
# No Twilio / Stripe / Resend needed.
```

**Notes:**
- Without `SUPABASE_SERVICE_ROLE_KEY`, the public intake form, Twilio webhooks,
  and `ai_intake_logs` writes will fail even locally.
- SMS is simulated/logged; email is logged to the console fallback.
- Run `npm run verify:env` to confirm your setup.

### Profile B — Production Alpha Minimum

The smallest production-viable configuration: Supabase (3 vars) plus the prod
app URL. AI stays on the deterministic mock. Stripe, Twilio, and Resend remain
optional and degrade gracefully.

```bash
# Supabase (all three required in production)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...ANON_KEY_xxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...SERVICE_ROLE_xxx   # mark Sensitive

# Required in production — must be the real prod URL
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com

# AI — deterministic mock
AI_PROVIDER=mock

# Stripe / Twilio / Resend optional:
#   - No Stripe   -> trial mode, checkout shows "not configured" message
#   - No Twilio   -> SMS simulated/logged; webhooks FAIL CLOSED (reject) in prod
#   - No Resend   -> owner email logged to console fallback
```

**Notes:**
- In production, missing `TWILIO_AUTH_TOKEN` makes inbound webhooks **fail closed
  (reject)** — this is intentional and safe.
- Confirm the deploy with `/api/health`.

### Profile C — Production Integrated Test

Full integration test: real AI provider, Twilio (test or prod), Resend, and
Stripe in test mode.

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...ANON_KEY_xxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...SERVICE_ROLE_xxx   # mark Sensitive

# Required in production
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com

# AI — choose ONE provider and supply its key
AI_PROVIDER=openai                # or: anthropic
OPENAI_API_KEY=sk-proj-xxx        # if AI_PROVIDER=openai
# ANTHROPIC_API_KEY=sk-ant-xxx    # if AI_PROVIDER=anthropic

# Twilio (test or prod credentials)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token_xxx           # mark Sensitive
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx   # or TWILIO_PHONE_NUMBER
# TWILIO_PHONE_NUMBER=+15555550123

# Resend (owner email)
RESEND_API_KEY=re_xxx                                  # mark Sensitive
FROM_EMAIL=notifications@yourdomain.com

# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_xxx                          # mark Sensitive
STRIPE_WEBHOOK_SECRET=whsec_xxx                        # mark Sensitive
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
NEXT_PUBLIC_STRIPE_PRICE_STARTER=price_xxxStarter
NEXT_PUBLIC_STRIPE_PRICE_PRO=price_xxxPro
NEXT_PUBLIC_STRIPE_PRICE_GROWTH=price_xxxGrowth

# Optional admin allowlist
ADMIN_EMAILS=you@example.com,ops@example.com
```

**Notes:**
- Supply exactly one AI key matching `AI_PROVIDER`; otherwise the app falls back
  to the deterministic mock.
- Use `sk_test_` / `pk_test_` Stripe keys and Twilio test credentials here to
  avoid real charges or live SMS during testing.
- All example values above are intentionally fake placeholders — replace them
  with your own and never commit real secrets.
