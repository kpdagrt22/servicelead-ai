# ServiceLead AI — Final Alpha Adversarial Audit

This is the closing audit for the `servicelead-alpha-hardening-validation`
branch, after the hardening + validation-readiness pass. It complements the
pre-work assessment in [SERVICELEAD_ALPHA_AUDIT.md](SERVICELEAD_ALPHA_AUDIT.md).

**Method.** Three independent multi-agent adversarial review passes were run over
the diffs, each with a separate skeptic verifying every finding before it
counted:

1. **MVP review** — 9 findings confirmed and **all fixed** (opt-out per-phone,
   Twilio fail-closed, Stripe unique constraint, status-transition guard,
   opt-in keyword scope, float score coercion).
2. **Hardening review** — **0 findings** (CI, integration-test fake fidelity,
   infra runtime).
3. **Alpha review** — 1 candidate raised (the lead-search `.or()` filter),
   **verified safe → 0 confirmed**.

Severity legend: LOW · MED · HIGH · CRITICAL. "Blocks validation?" = would this
stop you putting it in front of 5–10 real businesses.

---

| # | Category | Status | Evidence | Remaining risk | Blocks validation? |
|---|----------|--------|----------|----------------|--------------------|
| 1 | Security | PASS | `next.config.mjs` security headers; service-role confined to `src/lib/supabase/admin.ts` (webhooks + `/api/intake` only); `src/lib/auth/organizations.ts` asserts | None material | No |
| 2 | RLS / data isolation | PASS | `supabase/migrations/0002_rls.sql` (RLS on all tables, `is_org_member()`); `tests/unit/ownership.test.ts` proves cross-org denial | Live cross-tenant test against a real project recommended (manual) | No |
| 3 | Messaging compliance | PASS | `src/lib/twilio/optout.ts`; per-phone enforcement + regression in `tests/unit/intake.test.ts`; `docs/COMPLIANCE.md` | None | No |
| 4 | AI safety | PASS | `src/lib/ai/prompt.ts` (no triage/guarantees, risk flags); Zod validation + mock fallback in `src/lib/ai/service.ts` | Real-provider output quality unmeasured until keys added | No |
| 5 | Public intake workflow | PASS | `/api/intake` (Zod + IP rate-limit + server-side org resolve); `/u/[slug]` form with required consent | In-memory rate limit is single-instance | No |
| 6 | Missed-call simulator | PASS | `/app/simulator` (scenarios + service category); never sends real SMS unless Twilio configured | None | No |
| 7 | Lead dashboard / detail | PASS | `/app`, `/app/leads` (filters/search/sort), `/app/leads/[id]` | None | No |
| 8 | STOP / opt-out handling | PASS | first-word keyword detection; opt-out persisted before any reply; opted-out leads blocked from outbound | None | No |
| 9 | Twilio readiness | PASS | three webhook routes; **fail-closed** signature validation in prod; `docs/TWILIO_SETUP.md` | Requires A2P 10DLC before prod SMS (documented) | No |
| 10 | Owner notification | PASS | `src/lib/email/resend.ts` (Resend + console fallback, now incl. risk flags) | Deliverability depends on verified `FROM_EMAIL` | No |
| 11 | Usage limits / billing | PASS (soft) | `src/lib/billing/usage.ts` (tested); billing + dashboard surfaces; Stripe optional | Caps are **soft by design** — never drop inbound leads | No |
| 12 | Supabase readiness | PASS | migrations `0001→0005`; `docs/SUPABASE_SETUP.md` | None | No |
| 13 | Vercel deployment readiness | PASS | builds with no integrations; `docs/DEPLOYMENT.md`; `npm run verify:env`; `/api/health` | None | No |
| 14 | Demo readiness | PASS | `docs/DEMO_SCRIPT.md` (< 5 min via simulator) | None | No |
| 15 | Validation readiness | PASS | `docs/VALIDATION_PLAN.md` (niche, 7/30-day, outreach, metrics) | Outcomes depend on execution | No |
| 16 | Test coverage | PASS | 56 unit/integration tests (scoring, opt-out, status, schema, mock AI, intake pipeline, ownership, usage, validation) + Playwright smoke | Full sign-up→dashboard E2E documented, not automated | No |
| 17 | Git hygiene | PASS | feature branch off `main`; no secrets/`.env`/`node_modules`/`.next` tracked; no force-push; not merged to main | None | No |
| 18 | Scope discipline | PASS | no voice receptionist, no CRM, no calendar, no native app, no cold outreach | None | No |

---

## Confirmed issues remaining

**None.** All confirmed findings from the review passes were fixed prior to this
commit.

## Notable verified-safe item

- **Lead search `.or()` filter** (`src/app/app/leads/page.tsx`): user input is
  sanitized (strips `%`, `,`, `(`, `)`) and, because commas are removed, the
  whole query becomes a single bounded `ilike` value — no filter-grammar
  injection. The adversarial verifier refuted the raised concern. (Defense in
  depth: a server-side length cap and the org `eq` filter also apply.)

## Accepted limitations (do not block validation)

- **Soft usage caps** — capturing an inbound lead always wins over a billing
  cap; over-limit shows an upgrade prompt. (Intended.)
- **Single-instance rate limiter** — swap for Upstash/Redis for multi-instance
  production.
- **Full E2E not automated** — needs a live Supabase test project; smoke E2E
  runs on a fresh checkout.
- **Real-AI quality** — only the deterministic mock is exercised by tests; add
  provider keys to evaluate live output.

## Verdict

**Ready for founder-led alpha validation with 5–10 service businesses.** No
blocking security, compliance, or correctness issues remain. The remaining items
are documented, intentional, or post-validation scaling concerns.
