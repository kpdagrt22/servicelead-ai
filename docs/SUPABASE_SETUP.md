# Supabase Setup — ServiceLead AI

This guide walks you through provisioning Supabase (Postgres + Auth + RLS) for
ServiceLead AI. The app runs with **only Supabase configured** — AI defaults to a
deterministic mock (no API key needed), and Twilio/Stripe/Resend are optional.

Follow these steps in order.

---

## 1. Create a Supabase project

1. Go to <https://supabase.com> and sign in.
2. Click **New project**, pick an organization, name it (e.g. `servicelead-ai`),
   set a strong database password, and choose a region close to your users.
3. Wait for the project to finish provisioning (~1–2 minutes).

## 2. Copy the Project URL and anon (public) key

1. In the dashboard, open **Project Settings → API**.
2. Copy the **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`.
3. Copy the **anon public** key → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

The anon key is safe to expose in the browser; Row Level Security (RLS) protects
your data.

## 3. Keep the service_role key server-only

On the same **API** settings page, copy the **service_role** key → this is
`SUPABASE_SERVICE_ROLE_KEY`.

> ⚠️ **Never** put the service_role key in client code and **never** prefix it
> with `NEXT_PUBLIC_`. It bypasses RLS. It is used only by server routes (public
> intake form, Twilio webhooks, etc.). If it leaks, rotate it immediately.

## 4. Add local env to `.env.local`

Create a `.env.local` file in the project root with the three Supabase vars:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

That is enough to run the app locally in mock-AI mode. (Other integrations —
`AI_PROVIDER`, `TWILIO_*`, `STRIPE_*`, `RESEND_*` — are optional and default to
safe/mock behavior when unset.)

Verify what is configured without printing secrets:

```bash
npm run verify:env
```

It prints configured/missing vars and exits non-zero only if a var required for
your current mode is missing.

## 5. Add the same vars to Vercel

In the Vercel project → **Settings → Environment Variables**, add the three
Supabase vars for both **Production** and **Preview**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Redeploy after saving so the new values take effect.

## 6. Run the migrations (in order)

Migrations live in `supabase/migrations/` and **must be applied in order**:

```
0001_init.sql
0002_rls.sql
0003_triggers.sql
0004_subscriptions_unique.sql
0005_lead_status_expand.sql
```

### Option A — Supabase CLI (recommended)

```bash
# Install once: https://supabase.com/docs/guides/cli
supabase login
supabase link --project-ref YOUR-PROJECT-ref
supabase db push
```

`supabase db push` applies the migration files in `supabase/migrations/` in
filename order.

### Option B — SQL Editor (manual)

If you are not using the CLI, open the Supabase dashboard → **SQL Editor** and
paste/run each file **in this exact order**, one at a time:

1. `0001_init.sql` — tables and schema
2. `0002_rls.sql` — Row Level Security policies
3. `0003_triggers.sql` — signup/org triggers and default seeding
4. `0004_subscriptions_unique.sql` — subscriptions uniqueness constraint
5. `0005_lead_status_expand.sql` — expanded lead status values

> Do not skip or reorder — later migrations depend on earlier ones.

### What the triggers (0003) do

- Auto-create a `profiles` row when a user signs up.
- Add the organization owner as a member when an org is created.
- Seed default **service categories** and **intake templates** on org creation.

## 7. Verify the tables exist

In the dashboard → **Table Editor** (or run `select tablename from pg_tables
where schemaname = 'public';` in the SQL Editor), confirm these **12 tables**:

1. `profiles`
2. `organizations`
3. `organization_members`
4. `service_categories`
5. `intake_templates`
6. `leads`
7. `conversations`
8. `messages`
9. `twilio_numbers`
10. `appointments`
11. `ai_intake_logs`
12. `subscriptions`

## 8. Verify RLS is enabled

All tenant tables enforce **Row Level Security**. In **Table Editor**, each table
should show RLS as **enabled** (or check `pg_tables.rowsecurity`).

Access is gated through the `is_org_member()` helper — policies allow a user to
read/write rows only for organizations they belong to. This is why anonymous
clients cannot read tenant data (see Troubleshooting).

## 9. Configure Auth redirect URLs

In **Authentication → URL Configuration**:

- **Site URL**: your primary app URL (e.g. the Vercel production URL, or
  `http://localhost:3000` while developing).
- **Redirect URLs**: add both
  - `http://localhost:3000` (local dev)
  - your Vercel URL (e.g. `https://your-app.vercel.app`)

For smooth local development, go to **Authentication → Providers → Email** and
**disable "Confirm email"** so new sign-ups can log in immediately. Re-enable it
for production if you want verified emails.

## 10. Seed demo data

You generally don't need to write SQL. Org creation **auto-seeds default service
categories** (and intake templates) via the trigger from `0003_triggers.sql`.

The fastest path to a working demo is:

**sign up → onboard → use the simulator.**

This creates a profile, an org with default categories, and lets you generate
realistic leads without any external services.

## 11. Create your first user

Start the app and sign up:

```bash
npm run dev
```

Open <http://localhost:3000/signup> and create an account. The trigger creates
your `profiles` row automatically.

## 12. Test onboarding

Go to <http://localhost:3000/onboarding> and complete the flow. This creates your
organization (which triggers default service categories + intake templates) and
adds you as the org owner/member.

## 13. Test the public intake form

Each org has a public intake form at:

- `/u/[slug]` — **primary** URL
- `/intake/[organizationId]` — alias

Open `/u/your-org-slug` and submit the form. Required fields are **phone** and
**details**; the form also collects name, optional email, a service category
(from the org's active categories), urgency, address/ZIP, preferred time, and a
required consent checkbox. A new lead should appear under `/app/leads`.

> The public intake submission runs server-side and uses
> `SUPABASE_SERVICE_ROLE_KEY`. If that key is missing, submissions will fail
> (see Troubleshooting).

## 14. Troubleshooting

- **Public intake form or webhooks fail to write.** The `SUPABASE_SERVICE_ROLE_KEY`
  is missing or wrong. Server routes need it to insert rows on behalf of
  anonymous visitors. Re-check step 3 and your `.env.local` / Vercel env.
- **Anonymous reads return nothing / "no rows".** This is **expected**. RLS
  blocks anon reads of tenant tables (`is_org_member()`). You must be signed in
  and a member of the org to see its data.
- **Login does nothing / "email not confirmed".** Email confirmation is enabled.
  Either confirm via the email link or disable **Confirm email** for local dev
  (step 9).
- **Not sure what env is set?** Run `npm run verify:env` — it lists
  configured/missing vars without printing secret values and exits non-zero only
  if a var required for your current mode is missing.
- **Migrations errored or partially applied.** Re-check the order
  (`0001 → 0005`). Later files depend on earlier ones; running them out of order
  will fail.
- **Tables missing after `db push`.** Confirm `supabase link` points at the right
  project ref and that all five files are present in `supabase/migrations/`.

---

You now have a working Supabase backend. With only the three Supabase vars set,
ServiceLead AI runs end-to-end using the deterministic mock AI provider.
