# Validation plan

The goal of v1 is to **validate demand and usefulness before building more**.
Resist adding features until real service businesses confirm value.

## Hypotheses to test

1. Service businesses lose meaningful revenue from missed calls.
2. An instant SMS + AI intake captures leads they would otherwise lose.
3. A clean owner summary is genuinely useful for fast follow-up.
4. Owners will pay **$29–$79/month** for this.

## Concierge / manual validation (do this first)

Before scaling any automation:

1. **Manually onboard 5 service businesses.** Use the in-app onboarding, or set
   them up for them (the $99 concierge setup).
2. Have them use the **public intake form** (`/u/[slug]`) and the
   **simulator** (`/app/simulator`) with realistic scenarios.
3. Show them the **lead summaries** and ask: *"Is this summary useful? Would you
   act on it?"*
4. Ask directly: *"Would you pay $29–$79/month for this?"* Record answers.
5. Track whether they actually follow up on the captured leads.

## Gates (do NOT build until met)

- **Full voice AI** — do not build until **at least 3 paying users** explicitly
  ask for it.
- **Calendar integration** — do not build until manual booking demand is proven
  (owners repeatedly asking to schedule from the app).
- **Multi-channel (WhatsApp, web chat widget, etc.)** — only after SMS + form
  intake is validated.

## Functional acceptance checklist

Run through this on a fresh Supabase project to confirm the MVP works:

- [ ] Sign up and log in (Supabase auth).
- [ ] Complete onboarding → organization is created.
- [ ] Default service categories + intake templates are seeded (Service & intake
      page).
- [ ] Configure a service category and edit its intake questions; changes save.
- [ ] Submit the **public intake form** at `/u/<slug>` → a lead is created.
- [ ] **Mock AI** produces an owner summary + next message + score.
- [ ] Dashboard shows the lead, metrics, and status board.
- [ ] Lead detail shows the conversation, AI summary, missing fields, and a
      suggested reply.
- [ ] Update lead status (e.g. new → contacted → booked); transitions persist.
- [ ] Send an owner email (Resend or console fallback) from the lead.
- [ ] Run the simulator for **missed call**, **SMS**, and **web form**.
- [ ] Text/simulate **STOP** → lead is `opt_out=true` and further sends are
      blocked; **START** re-subscribes.
- [ ] Data is org-scoped: a second account cannot see the first account's leads.

## RLS verification (manual)

With two separate accounts (Org A, Org B):

1. As Org B, attempt to query Org A's `leads` via the Supabase client → expect 0
   rows.
2. As a non-owner member, attempt to update the organization row → expect denial.
3. Confirm anonymous (anon key) reads of `organizations`/`leads` return nothing,
   which is why the public intake page uses the service role.

## Automated tests

```bash
npm run test       # unit: scoring, opt-out, status transitions, schema, mock AI
npm run typecheck
npm run test:e2e   # smoke: landing + pricing + signup render
```

### Full-flow E2E (future)

The complete vertical slice (sign up → onboard → configure category → public
intake → lead in dashboard → AI summary) requires a live Supabase test project
with email confirmation disabled and seeded test credentials. Once those are
available, automate it in `tests/e2e/` mirroring the functional checklist above.
It is intentionally excluded from the default `npm run test:e2e` so a fresh
checkout passes.

## Metrics to watch (once live)

- Leads captured per business per week.
- % of missed calls that reply to the recovery SMS.
- Time-to-first-owner-action on a lead.
- Conversion: lead → contacted → booked → won.
- Trial → paid conversion and churn.
