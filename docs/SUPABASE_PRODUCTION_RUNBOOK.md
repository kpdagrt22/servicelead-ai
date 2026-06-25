# Supabase Production Runbook (ServiceLead AI)

Production, checklist-style runbook for standing up the Supabase backend for
ServiceLead AI. Work top to bottom. This is the authoritative production version;
`docs/SUPABASE_SETUP.md` is the longer-form background guide.

App facts you need while following this runbook:
- Stack: Next.js (App Router) + TypeScript + Supabase (Postgres / Auth / RLS) + Tailwind.
- The app runs with ONLY Supabase configured. AI defaults to a deterministic mock
  (no key required). Twilio / Stripe / Resend / real-AI are optional and degrade gracefully.
- Dashboard route is `/app` (NOT `/app/dashboard`).
- Public intake form is `/u/[slug]` (primary) with `/intake/[organizationId]` as an alias.
- Env checker: `npm run verify:env` (prints configured / missing, no secrets;
  exits non-zero if a required-for-mode var is missing).

---

## 1. Create the Supabase project

- [ ] Sign in at https://supabase.com and open the dashboard.
- [ ] Click **New project**.
- [ ] Pick (or create) an organization.
- [ ] Name the project (e.g. `servicelead-prod`).
- [ ] Set a strong database password and store it in your password manager.
- [ ] Choose the region closest to your users / Vercel region.
- [ ] Click **Create new project** and wait for provisioning to finish.

---

## 2. Copy Project URL + anon key + service_role key

- [ ] Open **Project Settings -> API**.
- [ ] Copy **Project URL** -> maps to `NEXT_PUBLIC_SUPABASE_URL` (safe to expose; public).
- [ ] Copy **anon public** key -> maps to `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe to expose; public).
- [ ] Copy **service_role** key -> maps to `SUPABASE_SERVICE_ROLE_KEY`.

> WARNING: `SUPABASE_SERVICE_ROLE_KEY` is **server-only**. It bypasses RLS.
> Never prefix it with `NEXT_PUBLIC_`, never log it, never ship it to the browser.
> The two `NEXT_PUBLIC_*` values are public by design; the service role key is a secret.

---

## 3. Local env setup (`.env.local`)

- [ ] Create a `.env.local` file in the repo root (it is gitignored).
- [ ] Add the 3 Supabase vars plus the mock AI provider:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
AI_PROVIDER=mock
```

- [ ] (Optional) Set `NEXT_PUBLIC_APP_URL=http://localhost:3000` for local link generation.
- [ ] Run `npm run verify:env` and confirm the 3 Supabase vars show as configured.
- [ ] Confirm the command exits 0 (no required-for-mode vars missing).

---

## 4. Vercel env setup (same vars)

- [ ] Open the Vercel project -> **Settings -> Environment Variables**.
- [ ] Add the same 3 Supabase vars (and `AI_PROVIDER=mock` unless using a real provider):
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (mark as a Production/Preview secret; do NOT make public)
  - [ ] `AI_PROVIDER` (`mock` by default)
- [ ] Add `NEXT_PUBLIC_APP_URL` set to your production URL (see Vercel runbook section 11).
- [ ] Apply to the environments you deploy (Production, and Preview if you use previews).
- [ ] Redeploy so the new env vars take effect.

---

## 5. Apply migrations - Option A: Supabase CLI (recommended)

Migrations live in `supabase/migrations/`. Apply them in order. The CLI does this for you.

- [ ] Install the Supabase CLI (https://supabase.com/docs/guides/cli).
- [ ] Authenticate:

```bash
supabase login
```

- [ ] Link the local repo to the project (find `<ref>` in the dashboard URL / Project Settings):

```bash
supabase link --project-ref <ref>
```

- [ ] Push all pending migrations in order:

```bash
supabase db push
```

- [ ] Confirm the CLI reports each of `0001` -> `0008` applied with no errors.

---

## 6. Apply migrations - Option B: SQL editor (manual)

Use this if you cannot run the CLI. Apply files **strictly in order**.

- [ ] Open **SQL Editor** in the Supabase dashboard.
- [ ] Paste and run `supabase/migrations/0001_init.sql`.
- [ ] Paste and run `supabase/migrations/0002_rls.sql`.
- [ ] Paste and run `supabase/migrations/0003_triggers.sql`.
- [ ] Paste and run `supabase/migrations/0004_subscriptions_unique.sql`.
- [ ] Paste and run `supabase/migrations/0005_lead_status_expand.sql`.
- [ ] Paste and run `supabase/migrations/0006_constraints_and_indexes.sql`.
- [ ] Paste and run `supabase/migrations/0007_webhook_events.sql`.
- [ ] Paste and run `supabase/migrations/0008_rate_limits.sql`.
- [ ] Run each one to completion before starting the next; do not batch them out of order.

---

## 7. Migration order (what each one does)

Apply in this exact sequence. All migrations are **additive / non-destructive**.

- [ ] `0001_init.sql` - Base schema: creates the 12 tables and supporting types.
- [ ] `0002_rls.sql` - Enables Row Level Security on all tables and adds policies
      (includes the `is_org_member()` helper used by policies).
- [ ] `0003_triggers.sql` - Triggers that auto-create a profile on signup, add the
      owner as an organization member, and seed default service categories + intake templates.
- [ ] `0004_subscriptions_unique.sql` - Adds a UNIQUE constraint on
      `subscriptions.organization_id` (one subscription per org).
- [ ] `0005_lead_status_expand.sql` - Expands the `leads.status` CHECK constraint to
      add `'spam'` and `'archived'`.
- [ ] `0006_constraints_and_indexes.sql` - De-dupes then adds UNIQUE on
      `twilio_numbers.phone_number` and `service_categories(organization_id, name)`,
      a unique open-conversation index, a `lead_score` range check, and missing
      indexes (provider_message_id, appointments.lead_id, leads org+email).
- [ ] `0007_webhook_events.sql` - Idempotency ledger for Twilio/Stripe webhook
      retries (service-role only; RLS enabled, no policies).
- [ ] `0008_rate_limits.sql` - Durable cross-instance rate-limit table +
      `rate_limit_hit()` function (service-role only).

---

## 8. Verify tables (Table Editor)

- [ ] Open **Table Editor** and confirm all 12 tables exist:
  - [ ] `profiles`
  - [ ] `organizations`
  - [ ] `organization_members`
  - [ ] `service_categories`
  - [ ] `intake_templates`
  - [ ] `leads`
  - [ ] `conversations`
  - [ ] `messages`
  - [ ] `twilio_numbers`
  - [ ] `appointments`
  - [ ] `ai_intake_logs`
  - [ ] `subscriptions`
  - [ ] `webhook_events` (added in `0007`)
  - [ ] `rate_limits` (added in `0008`)
- [ ] Spot-check `leads.status` allows `spam` and `archived` (proves `0005` applied).
- [ ] Spot-check `subscriptions` has a unique constraint on `organization_id` (proves `0004`).
- [ ] Spot-check `twilio_numbers` has a unique constraint on `phone_number` (proves `0006`).

---

## 9. Verify RLS is enabled

- [ ] In **Table Editor**, open each table and confirm RLS shows as **Enabled**
      (RLS is enabled on all 12 tables).
- [ ] In **Authentication -> Policies** (or the table's Policies tab), confirm policies exist
      and reference the `is_org_member()` helper for org-scoped access.
- [ ] Sanity note: with RLS on, the anon key cannot read org-scoped data directly.
      That is expected. The public intake path uses the **service role** on the server.

---

## 10. Auth redirect URL setup

- [ ] Open **Authentication -> URL Configuration**.
- [ ] Add your allowed redirect URLs (one per environment). These are the URLs Supabase
      is permitted to redirect back to after auth.
- [ ] Save and confirm they appear in the redirect allow-list.

---

## 11. Site URL setup

- [ ] In **Authentication -> URL Configuration**, set **Site URL** to your production URL
      (e.g. `https://your-app.vercel.app` or your custom domain).
- [ ] This must match `NEXT_PUBLIC_APP_URL` used by the app.

---

## 12. Production callback URL

- [ ] Add the production callback to the redirect allow-list:
      `https://<your-production-domain>/login` (the auth entry route).
- [ ] If you use a custom domain, add that domain's callback too.
- [ ] Re-confirm Site URL (section 11) points at the same production domain.

---

## 13. Local callback URL

- [ ] Add `http://localhost:3000` to the redirect allow-list for local development.
- [ ] Add the local login callback `http://localhost:3000/login` if your flow requires it.
- [ ] Keep these alongside the production URLs; both can coexist.

---

## 14. Create the first test user

- [ ] Start the app (local: `npm run dev`; prod: the deployed URL).
- [ ] Go to `/signup` and create an account.
- [ ] For fast local testing, disable email confirmation:
      **Authentication -> Providers -> Email -> turn OFF "Confirm email"**.
      (Re-enable it for real production sign-ups.)
- [ ] Confirm you can log in at `/login` and land on the dashboard at `/app`.
- [ ] Confirm a row was auto-created in `profiles` (proves the `0003` signup trigger fired).

---

## 15. Create the first organization

- [ ] After first login you should be routed to `/onboarding` (or visit it directly).
- [ ] Complete onboarding to create an organization.
- [ ] Confirm a row appears in `organizations`.
- [ ] Confirm the creator appears in `organization_members` as the owner
      (proves the `0003` owner-membership trigger fired).
- [ ] Confirm default rows appear in `service_categories` and `intake_templates`
      (proves the `0003` seed logic fired).

---

## 16. Test the public intake form (`/u/[slug]`)

- [ ] Find your organization's slug (from settings / onboarding output).
- [ ] Open `/u/<slug>` in a normal (non-logged-in) browser session.
- [ ] Confirm the public intake form renders and lists the seeded service categories.
- [ ] Submit a test lead.
- [ ] Confirm a new row appears in `leads` for the organization.
- [ ] (Alias check) `/intake/<organizationId>` should resolve to the same intake experience.

> The public form works without a logged-in user because the server uses the
> service role key. If submissions fail, the service role key is almost certainly missing/wrong.

---

## 17. Test the simulator (`/app/simulator`)

- [ ] Log in and open `/app/simulator`.
- [ ] Run a simulated inbound conversation.
- [ ] Confirm AI responses are generated (deterministic mock output when `AI_PROVIDER=mock`).
- [ ] Confirm rows appear in `conversations` and `messages`.
- [ ] Confirm `ai_intake_logs` records the intake activity.

---

## 18. Test opt-out (inbound STOP)

- [ ] In the simulator (or via a simulated inbound webhook), send the keyword `STOP`.
- [ ] Confirm the lead / conversation is flagged opted-out (`opt_out` set).
- [ ] Confirm NO further outbound messages are generated for that contact after opt-out.
- [ ] Re-send a normal message and confirm the system still suppresses outbound while opted out.

---

## 19. Troubleshooting common errors

- [ ] **Public intake or webhooks fail / return errors** ->
      `SUPABASE_SERVICE_ROLE_KEY` is missing or wrong. The server needs it to write
      leads and process webhook inserts. Re-copy from **Project Settings -> API**.
- [ ] **Anon role cannot read organizations / org data directly** -> this is EXPECTED
      under RLS. The public intake path intentionally uses the service role server-side.
      Do not "fix" this by loosening RLS policies.
- [ ] **Cannot log in right after signup** -> email confirmation is enabled and the
      confirmation email was not clicked. For local/testing, disable
      **Authentication -> Providers -> Email -> Confirm email** (section 14).
- [ ] **Not sure which env vars are set** -> run `npm run verify:env`. It prints
      configured vs missing (no secrets) and exits non-zero if a required var is absent.
- [ ] **Migrations seem half-applied** -> verify table list (section 8) and confirm
      `0001` -> `0008` all ran in order; re-run any missing file (they are additive).

---

## 20. Rollback strategy

- [ ] **App rollback (fastest):** use Vercel **Deployments -> promote a previous
      good deployment** (instant rollback). Never force-push to roll back.
- [ ] **Migrations are additive / non-destructive**, so re-applying or moving forward
      is safe; there is no destructive down-migration to run.
- [ ] **Database safety:** keep automated backups enabled in Supabase
      (**Project Settings -> Database / Backups**). Take a manual snapshot before any
      schema work beyond these migrations.
- [ ] **Avoid destructive DDL** (`DROP`, `ALTER ... DROP COLUMN`, etc.) in production.
      If a schema change is needed, write a new additive migration instead.
- [ ] If data was corrupted, restore from the most recent backup rather than hand-editing.

---

### Quick reference

| Item | Value |
| --- | --- |
| Dashboard route | `/app` (NOT `/app/dashboard`) |
| Public intake | `/u/[slug]` (alias `/intake/[organizationId]`) |
| Health check | `/api/health` (JSON booleans, no secrets) |
| Env checker | `npm run verify:env` |
| Required vars | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Migrations | `0001` -> `0002` -> `0003` -> `0004` -> `0005` -> `0006` -> `0007` -> `0008` (in order) |
