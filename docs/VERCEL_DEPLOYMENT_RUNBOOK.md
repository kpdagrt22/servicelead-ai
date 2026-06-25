# Vercel Deployment Runbook (ServiceLead AI)

Production, checklist-style runbook for deploying ServiceLead AI to Vercel.
Work top to bottom. This is the authoritative production version;
`docs/DEPLOYMENT.md` is the longer-form background guide.

App facts you need while following this runbook:
- Stack: Next.js (App Router) + TypeScript + Supabase + Tailwind, deployed to Vercel.
- The app runs with ONLY Supabase configured. AI defaults to a deterministic mock
  (no key). Twilio / Stripe / Resend / real-AI are optional and degrade gracefully.
- Install command: `npm ci`. Build: `next build`. Framework preset: Next.js (auto-detected).
- Dashboard route is `/app` (NOT `/app/dashboard`).
- Health endpoint: `/api/health` returns JSON booleans about configured integrations (no secrets).
- Env checker: `npm run verify:env` (configured vs missing, no secrets; non-zero exit if missing).

---

## 1. Import the GitHub repo into Vercel

- [ ] Sign in at https://vercel.com.
- [ ] Click **Add New... -> Project**.
- [ ] Connect the GitHub account / org that owns the repo (authorize Vercel if prompted).
- [ ] Find the ServiceLead AI repository in the import list and click **Import**.

---

## 2. Select the project

- [ ] Confirm the correct repository is selected.
- [ ] Choose the Vercel team / scope to deploy under.
- [ ] If the app lives in a subdirectory, set the **Root Directory**; otherwise leave it default.

---

## 3. Framework preset: Next.js

- [ ] Confirm **Framework Preset = Next.js** (Vercel auto-detects this).
- [ ] Do not override it to "Other".

---

## 4. Install command: `npm ci`

- [ ] Set **Install Command** to `npm ci`.
- [ ] Confirm a `package-lock.json` exists in the repo (required by `npm ci`).

---

## 5. Build command: `next build`

- [ ] Set **Build Command** to `next build` (or leave it on the Next.js default, which runs `next build`).
- [ ] Do not add custom postbuild steps unless required.

---

## 6. Output settings (Next.js default)

- [ ] Leave **Output Directory** on the Next.js default (Vercel manages `.next` automatically).
- [ ] Do not set a custom output directory.

---

## 7. Required env vars

These are the minimum needed to run (Supabase-only mode, AI on the mock):

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (server-only secret; never `NEXT_PUBLIC_`)
- [ ] `NEXT_PUBLIC_APP_URL` (must equal the production URL - see section 11)

> With just these set, AI runs on the deterministic mock and Twilio / Stripe / Resend
> features degrade gracefully. Run `npm run verify:env` locally to confirm the set.

---

## 8. Optional env vars

Add only what you need; each integration degrades gracefully when absent.

- [ ] **AI provider:** `AI_PROVIDER` (`mock` default | `openai` | `anthropic`),
      `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`.
- [ ] **Twilio:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
      `TWILIO_MESSAGING_SERVICE_SID`, `TWILIO_PHONE_NUMBER`, `TWILIO_VALIDATE_SIGNATURE`.
- [ ] **Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
      `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PRICE_STARTER`,
      `NEXT_PUBLIC_STRIPE_PRICE_PRO`, `NEXT_PUBLIC_STRIPE_PRICE_GROWTH`.
- [ ] **Resend (email):** `RESEND_API_KEY`, `FROM_EMAIL`.
- [ ] **Internal admin gate:** `ADMIN_EMAILS` (comma-separated; gates `/app/admin`).
- [ ] Keep all `NEXT_PUBLIC_*` values as the only browser-exposed vars; everything else is server-only.

---

## 9. Preview deployments

- [ ] Confirm Vercel creates a Preview deployment for each pull request / non-production branch.
- [ ] Ensure required env vars (section 7) are also set for the **Preview** environment,
      or previews will fail to talk to Supabase.
- [ ] Use the unique preview URL to smoke test before promoting.

---

## 10. Production deployment

- [ ] Merge / push to the production branch (default `main`) to trigger a Production deploy,
      or click **Deploy** in the Vercel dashboard.
- [ ] Wait for the build to finish (Next.js preset, `npm ci` + `next build`).
- [ ] Confirm the deployment is marked **Production** and the production domain resolves.

---

## 11. `NEXT_PUBLIC_APP_URL` setup

- [ ] Set `NEXT_PUBLIC_APP_URL` to the exact production URL
      (e.g. `https://your-app.vercel.app` or your custom domain).
- [ ] It MUST equal the production URL - it is used to build absolute links
      (intake links, callbacks, etc.).
- [ ] After changing it, redeploy so the new value is baked in.

---

## 12. Update Supabase callback / Site URL after the Vercel URL is known

Once you know the final Vercel (or custom) production URL:

- [ ] In Supabase, set **Authentication -> URL Configuration -> Site URL** to the production URL.
- [ ] Add the production callback to the redirect allow-list
      (e.g. `https://<your-domain>/login`).
- [ ] Confirm `NEXT_PUBLIC_APP_URL` and the Supabase Site URL match exactly.
- [ ] (See `docs/SUPABASE_PRODUCTION_RUNBOOK.md` sections 10-12 for details.)

---

## 13. Health endpoint test

- [ ] `GET /api/health` on the deployed URL.
- [ ] Confirm it returns JSON with boolean flags for configured integrations
      (e.g. supabase / ai / twilio / stripe / resend) and an overall `ok`.
- [ ] Confirm NO secrets appear in the response (it only reports booleans).
- [ ] Use this as your first post-deploy signal that env wiring is correct.

---

## 14. Smoke test checklist

- [ ] Run the full smoke test: see `docs/PRODUCTION_SMOKE_TEST.md`.
- [ ] At minimum, verify the "Exact smoke test URLs" section below before declaring the deploy healthy.

---

## 15. Rollback to a previous deployment

- [ ] Open the Vercel project -> **Deployments**.
- [ ] Find the last known-good deployment.
- [ ] Click **... -> Promote to Production** (instant rollback).
- [ ] NEVER force-push to roll back. Use Vercel's promote/rollback instead.
- [ ] Note: rolling back the app does not roll back the database. Supabase migrations
      are additive, so this is generally safe (see Supabase runbook section 20).

---

## 16. Common build errors

- [ ] **`npm ci` fails** -> `package-lock.json` missing or out of sync with `package.json`.
      Commit an up-to-date lockfile.
- [ ] **TypeScript / `next build` fails** -> type errors. Reproduce locally with
      `npm ci && next build` and fix before redeploying.
- [ ] **Wrong framework detected** -> set Framework Preset back to **Next.js** (section 3).
- [ ] **Custom output directory set** -> remove it; use the Next.js default (section 6).

---

## 17. Common Supabase env errors

- [ ] **App cannot reach Supabase / auth broken** -> `NEXT_PUBLIC_SUPABASE_URL` or
      `NEXT_PUBLIC_SUPABASE_ANON_KEY` missing/wrong, or not set for the deployed environment.
- [ ] **Public intake (`/u/[slug]`) or webhooks fail** -> `SUPABASE_SERVICE_ROLE_KEY`
      missing/wrong. It is required server-side for those write paths.
- [ ] **Service role exposed warning** -> never prefix it with `NEXT_PUBLIC_`; it is server-only.
- [ ] **Unsure what is set** -> run `npm run verify:env` (prints configured vs missing, no secrets).

---

## 18. Common Twilio env errors

- [ ] **Inbound webhooks rejected in production** -> Twilio signatures **fail closed**
      in production, so `TWILIO_AUTH_TOKEN` is REQUIRED in prod. Without it, signed
      webhook verification fails and requests are rejected.
- [ ] **Signature validation toggling** -> `TWILIO_VALIDATE_SIGNATURE` controls validation;
      in production the secure (fail-closed) behavior requires `TWILIO_AUTH_TOKEN` present.
- [ ] **Outbound SMS not sending** -> check `TWILIO_ACCOUNT_SID`,
      `TWILIO_MESSAGING_SERVICE_SID` / `TWILIO_PHONE_NUMBER`. Missing Twilio config
      degrades gracefully (no send), it does not crash the app.

---

## 19. Common Stripe env errors

- [ ] **Checkout shows a useful "not configured" message** -> price IDs missing.
      Set `NEXT_PUBLIC_STRIPE_PRICE_STARTER`, `NEXT_PUBLIC_STRIPE_PRICE_PRO`,
      `NEXT_PUBLIC_STRIPE_PRICE_GROWTH`.
- [ ] **Checkout server call fails** -> `STRIPE_SECRET_KEY` missing/wrong.
- [ ] **Webhook events not processed** -> `STRIPE_WEBHOOK_SECRET` missing/wrong;
      verify the endpoint in the Stripe dashboard points at `/api/stripe/webhook`.
- [ ] Pricing reference: Starter $29/mo (50 leads), Pro $79/mo (250), Growth $149/mo (1000),
      plus a $99 one-time setup fee.

---

## 20. Common AI provider errors

- [ ] **Real provider selected but key missing** -> if `AI_PROVIDER=openai`/`anthropic`
      but the matching key (`OPENAI_API_KEY` / `ANTHROPIC_API_KEY`) is absent, the app
      falls back to the deterministic **mock** rather than failing.
- [ ] **Want deterministic behavior** -> set `AI_PROVIDER=mock` (the default) and omit keys.
- [ ] **Responses look canned in production** -> you are on the mock; set `AI_PROVIDER`
      and the corresponding key to use a real provider.

---

## Exact smoke test URLs

Replace `<slug>` with a real organization slug. Test against the production URL.

- [ ] `/` - landing page renders.
- [ ] `/login` - auth page renders; can sign in.
- [ ] `/app` - dashboard loads after login.
      **Note: the dashboard is `/app`, NOT `/app/dashboard`.**
- [ ] `/app/simulator` - simulator runs an AI intake conversation (mock output when on `mock`).
- [ ] `/u/<slug>` - public intake form renders and accepts a test lead submission.
- [ ] `/api/health` - returns JSON booleans, overall `ok`, no secrets.
- [ ] `/pricing` - pricing page renders (Starter / Pro / Growth + $99 setup).
- [ ] `/app/admin` - an authorized `ADMIN_EMAILS` user sees the internal admin page;
      an unauthorized user gets a **404** (the route is hidden, not just forbidden).

---

### Quick reference

| Item | Value |
| --- | --- |
| Framework preset | Next.js (auto-detected) |
| Install command | `npm ci` |
| Build command | `next build` |
| Output | Next.js default (`.next`) |
| Required vars | 3 Supabase vars + `NEXT_PUBLIC_APP_URL` |
| Health check | `/api/health` |
| Dashboard route | `/app` (NOT `/app/dashboard`) |
| Rollback | Vercel Deployments -> promote previous (never force-push) |
