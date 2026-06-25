# ServiceLead AI — Alpha Readiness Audit

Audit performed on branch `servicelead-alpha-hardening-validation`. Each item is
marked **PASS / WARN / FAIL** with severity, file references, the fix, and
whether it was addressed in this hardening pass.

Legend — Severity: LOW · MED · HIGH · CRITICAL.

---

## 1. Feature completeness

| Feature | Status | Evidence |
| --- | --- | --- |
| Landing page | PASS | [src/app/page.tsx](../src/app/page.tsx) |
| Auth (Supabase) | PASS | [auth-form.tsx](../src/components/auth/auth-form.tsx), [login](../src/app/login/page.tsx) |
| Onboarding | PASS | [onboarding](../src/app/onboarding/page.tsx), [actions](../src/app/onboarding/actions.ts) |
| Organization/business setup | PASS | onboarding action creates org; settings edit [settings](../src/app/app/settings/page.tsx) |
| Service categories | PASS | [/app/intake](../src/app/app/intake/page.tsx) — add/edit/toggle/delete + quick-add |
| Intake templates | PASS | [questions-editor.tsx](../src/components/app/questions-editor.tsx) |
| Public intake form | PASS | [/u/[slug]](../src/app/u/[slug]/page.tsx), [/intake/[organizationId]](../src/app/intake/[organizationId]/page.tsx) |
| Lead creation | PASS | [processIntake](../src/lib/leads/intake.ts) via form/simulator/twilio |
| AI / mock AI lead summary | PASS | [ai/service.ts](../src/lib/ai/service.ts), [mock.ts](../src/lib/ai/providers/mock.ts) |
| Lead scoring | PASS | [scoring.ts](../src/lib/leads/scoring.ts) |
| Lead dashboard | PASS | [/app](../src/app/app/page.tsx) — metrics, board, recent |
| Lead detail page | PASS | [/app/leads/[id]](../src/app/app/leads/[id]/page.tsx) |
| Conversations | PASS | `conversations` table + per-channel reuse |
| Messages | PASS | `messages` table + thread UI |
| Missed-call simulator | PASS | [/app/simulator](../src/app/app/simulator/page.tsx) |
| STOP / opt-out | PASS | [optout.ts](../src/lib/twilio/optout.ts), enforced in intake |
| Owner notification placeholder | PASS | [email/resend.ts](../src/lib/email/resend.ts) (console fallback) |
| Twilio placeholders | PASS | [/api/twilio/*](../src/app/api/twilio) |
| Pricing page | PASS | [/pricing](../src/app/pricing/page.tsx) |
| Stripe placeholders | PASS | [/api/stripe/*](../src/app/api/stripe), trial mode if unset |
| Docs | PASS | [docs/](.) — PRD, ARCHITECTURE, DATABASE, AI, TWILIO, COMPLIANCE, SUPABASE_SETUP, DEPLOYMENT, DEMO_SCRIPT, VALIDATION_PLAN, audits |
| Tests | PASS | 56 unit/integration tests + Playwright smoke |

**Verdict: PASS.** All MVP/alpha features are present.

---

## 2. Lead intake workflow readiness

| Question | Status | Notes |
| --- | --- | --- |
| Create organization? | PASS | onboarding |
| Add service categories? | PASS | add/edit/quick-add on /app/intake |
| Define intake questions? | PASS | per-category JSON editor |
| Public form creates lead? | PASS | POST /api/intake → processIntake |
| Simulator creates missed-call lead? | PASS | scenario `missed_call`, source persisted |
| AI summarizes lead? | PASS | owner_summary persisted to lead |
| AI suggests next question? | PASS | `next_message_to_customer`, shown as suggested reply |
| Owner views lead details? | PASS | /app/leads/[id] |
| Owner updates status? | PASS | status update action (validated transitions) |
| Owner copies follow-up? | PASS | CopyButton + suggested reply textarea |
| Owner sees urgency? | PASS | urgency + score badges |

**Verdict: PASS.**

---

## 3. Messaging compliance readiness

| Check | Status | Severity | Evidence / Fix |
| --- | --- | --- | --- |
| No cold outbound | PASS | — | Only responds to inbound (form/SMS/missed-call). No outbound initiation anywhere. |
| No spam automation | PASS | — | No bulk/scheduled send paths exist. |
| STOP/opt-out support | PASS | — | [optout.ts](../src/lib/twilio/optout.ts) keywords; first-word detection. |
| No messaging opted-out users | PASS | CRITICAL (fixed) | Opt-out now enforced **per phone across all leads/channels**; new leads inherit prior opt-out — [intake.ts](../src/lib/leads/intake.ts) `findOrgOptOut`. Regression test in [intake.test.ts](../tests/unit/intake.test.ts). Fixed in prior hardening pass. |
| Consent stored | PASS | — | `leads.consent_status` + `consent_source` on every path. |
| Inbound basis documented | PASS | — | [COMPLIANCE.md](COMPLIANCE.md). |
| Owner responsibility documented | PASS | — | COMPLIANCE.md + onboarding consent copy. |
| No medical emergency claims | PASS | — | AI prompt forbids triage; risk flags advise emergency services. |
| No auto-calling | PASS | — | No voice dialing; voice route only triggers SMS recovery on inbound missed-call webhook. |
| No "guaranteed revenue" claims | PASS | — | Pricing/landing avoid guarantees; explicit disclaimer. |

**Verdict: PASS.**

---

## 4. Security readiness

| Check | Status | Severity | Evidence / Fix |
| --- | --- | --- | --- |
| RLS policies | PASS | — | [0002_rls.sql](../supabase/migrations/0002_rls.sql), all tables. |
| Organization membership checks | PASS | — | `is_org_member()`; [auth/organizations.ts](../src/lib/auth/organizations.ts) helpers. |
| Service category ownership | PASS | — | RLS + `assertServiceCategoryBelongsToOrg`. |
| Intake template ownership | PASS | — | RLS + `assertIntakeTemplateBelongsToOrg`. |
| Lead ownership | PASS | — | RLS + `assertLeadBelongsToOrg` (adopted in lead actions). |
| Conversation/message ownership | PASS | — | RLS + assert helpers. |
| Internal admin route protection | PASS | MED (added) | [/app/admin](../src/app/app/admin/page.tsx) gated by `ADMIN_EMAILS`; non-admins get 404. |
| No cross-org leakage | PASS | — | RLS + ownership tests ([ownership.test.ts](../tests/unit/ownership.test.ts)). |
| No service role in client | PASS | — | `admin.ts` server-only; never imported client-side. |
| No open redirects | PASS | LOW | Auth redirect uses internal `redirect` param only. |
| Public write routes limited | PASS | — | Only `/api/intake` (rate-limited, Zod-validated, org resolved server-side). |
| Webhook auth | PASS | HIGH (fixed) | Twilio signature validation **fails closed** in production; voice route now validated — [twilio/client.ts](../src/lib/twilio/client.ts). |

**Verdict: PASS.** Note: RLS invariants are documented and asserted in code + unit tests; a live cross-tenant RLS test against a real Supabase project is a recommended manual step ([VALIDATION_PLAN.md](VALIDATION_PLAN.md)).

---

## 5. AI readiness

| Check | Status | Evidence |
| --- | --- | --- |
| Mock provider works | PASS | [mock.ts](../src/lib/ai/providers/mock.ts), deterministic |
| Real provider placeholders | PASS | [openai.ts](../src/lib/ai/providers/openai.ts), [anthropic.ts](../src/lib/ai/providers/anthropic.ts) |
| Zod validates AI output | PASS | [lead-intake.ts](../src/lib/ai/schemas/lead-intake.ts) |
| Malformed output doesn't crash | PASS | `parseLeadIntakeResult` coerces; service falls back to mock |
| User-friendly fallback | PASS | lead saved even if AI fails; "AI summary failed" handled |
| AI doesn't over-message | PASS | one question/turn; stops when fields collected |
| No medical/legal/emergency claims | PASS | system prompt rules + risk flags |
| No API key required for tests | PASS | mock default; tests never call network |

**Verdict: PASS.**

---

## 6. Supabase readiness

| Check | Status | Notes |
| --- | --- | --- |
| Migrations exist + ordered | PASS | 0001→0005 |
| RLS enabled | PASS | 0002 |
| Local setup documented | PASS | [SUPABASE_SETUP.md](SUPABASE_SETUP.md), README |
| Production setup documented | PASS | SUPABASE_SETUP.md, [DEPLOYMENT.md](DEPLOYMENT.md) |
| Seed/demo flow | PASS | trigger seeds default categories; simulator seeds demo leads |

**Verdict: PASS.**

---

## 7. Deployment readiness

| Check | Status | Notes |
| --- | --- | --- |
| Vercel build readiness | PASS | `next build` green; CI runs it |
| Env vars documented | PASS | [.env.example](../.env.example), `npm run verify:env` |
| Optional env truly optional | PASS | graceful degradation throughout |
| Build works with mock AI | PASS | no keys required |
| No server secrets to client | PASS | only `NEXT_PUBLIC_*` exposed |
| No `.env` committed | PASS | `.gitignore`; only `.env.example` tracked |

**Verdict: PASS.**

---

## 8. Validation readiness

| Check | Status | Notes |
| --- | --- | --- |
| Founder can demo in < 5 min | PASS | [DEMO_SCRIPT.md](DEMO_SCRIPT.md) + simulator |
| Demo data exists/seedable | PASS | simulator + public form |
| Validation plan exists | PASS | [VALIDATION_PLAN.md](VALIDATION_PLAN.md) |
| Outreach script exists | PASS | VALIDATION_PLAN.md (email + FB DM) |
| Pricing / willingness-to-pay test | PASS | VALIDATION_PLAN.md |
| Success/kill metrics | PASS | VALIDATION_PLAN.md |

**Verdict: PASS.**

---

## Gaps closed in this task

1. **Env hardening** — canonical names (`FROM_EMAIL`, `NEXT_PUBLIC_STRIPE_PRICE_*`, `ADMIN_EMAILS`), `scripts/verify-env.ts` + `npm run verify:env`, updated `.env.example`.
2. **Authorization helpers** — `src/lib/auth/organizations.ts` (member/owner + per-resource ownership asserts), adopted in lead actions, unit-tested.
3. **Lead statuses** — added `spam`/`archived`, full `status.ts` helper set, migration `0005`.
4. **Dashboard** — urgent/leads-this-month/AI-summary metrics, CTA cards, lead list filters (urgency/source/search/sort).
5. **Service setup** — category edit, more default categories, quick-add, empty states, active-without-questions warning.
6. **AI fields** — `city`/`state`/`postal_code` added to extracted fields and persisted.
7. **Usage limits** — `src/lib/billing/usage.ts` (soft caps that never drop inbound leads), surfaced on billing + dashboard, unit-tested.
8. **Owner email** — now includes risk flags.
9. **Internal admin/debug** — `/app/admin` gated by `ADMIN_EMAILS`.
10. **Docs** — this audit, SUPABASE_SETUP, DEMO_SCRIPT, expanded VALIDATION_PLAN + COMPLIANCE + DEPLOYMENT, final adversarial audit.
11. **Integration tests** — `processIntake` opt-out-per-phone regression coverage (prior pass) + ownership/usage/validation/status tests.

## Known limitations (acceptable for alpha)

- Usage limits are **soft** by design — we never drop an inbound lead for billing reasons; over-cap shows an upgrade prompt. (MED — intended.)
- Full sign-up→dashboard **E2E is documented but not automated** (needs a live Supabase test project); smoke E2E runs on a fresh checkout. (LOW)
- In-memory rate limiter is **single-instance**; use Upstash/Redis for multi-instance production. (LOW)
- No calendar integration, no voice AI, no full CRM — intentionally out of scope for v1.
