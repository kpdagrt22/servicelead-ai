# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Production hardening (post-alpha roadmap)

#### Added

- **Phone normalization to E.164** (`src/lib/phone.ts`) applied at every
  boundary (intake, opt-out matching, Twilio routing, settings, onboarding) so a
  contact is one identity regardless of format — making the per-phone STOP
  guarantee robust.
- **Webhook idempotency** (`webhook_events`, migration `0007`): Twilio
  `MessageSid`/`CallSid` and Stripe `event.id` are deduped, so retries no longer
  create duplicate leads, AI runs, or billing updates.
- **Durable rate limiting** (`rate_limits` + `rate_limit_hit()`, migration
  `0008`): public intake (per-IP and per-org) and inbound SMS now rate-limit
  across instances via Postgres, with an in-memory fallback.
- **Real-provider AI timeout + retry** (`src/lib/ai/http.ts`): a hung LLM can no
  longer block the inbound webhook.
- **Stripe billing portal** (`/api/stripe/portal` + "Manage billing" button) so
  customers can update payment method or cancel.
- **Role enforcement**: `requireOrgOwnerOrAdmin` now gates settings, number
  registration, destructive config, and billing (previously dead helpers).
- **Mobile navigation** for the dashboard (drawer) and marketing header
  (hamburger); lead rows show urgency/score on phones.
- **Mutation feedback**: settings/number/simulator success+error states;
  confirmation prompt before deleting a service category.
- Migration `0006`: `unique(twilio_numbers.phone_number)`,
  `unique(service_categories org,name)`, unique open-conversation index,
  `lead_score` range check, and missing indexes.
- Node runtime pinned (`engines` + `.nvmrc`); new tests for phone, Twilio
  routing, and env predicates (71 unit tests total).

#### Fixed

- **Critical (lead loss / cross-tenant):** inbound Twilio routing no longer
  silently drops or mis-routes a lead when a number is duplicated or unmapped;
  registering a number already claimed by another org is rejected.
- **Critical (webhook outage):** Twilio signature validation now checks the
  actual request URL (forwarded headers) with env fallback, instead of relying
  solely on `NEXT_PUBLIC_APP_URL` (a host mismatch 403'd every webhook).
- **Outbound SMS delivery tracking:** `sendSms` attaches a `statusCallback` and
  stores the SID; SMS AI replies are stored as `sent` (not perpetually
  `queued`) and always carry the opt-out footer.
- **`sendReplyAction`** asserts the supplied conversation belongs to the org
  before writing (closes a cross-tenant write).
- **Stripe webhook reliability:** subscription metadata is propagated to the
  Subscription object, `current_period_end` is read tolerant of API-version
  drift, `invoice.payment_failed` → `past_due`, and the `apiVersion` cast was
  removed.
- **Dashboard metrics** use exact `COUNT` queries instead of a 200-row slice
  (correct past 200 leads); removed the hardcoded "Avg first response: Instant".
- **Truthful config signals:** `isResendConfigured()` is false when the sender
  is still the `example.com` placeholder; startup warns on a non-https/localhost
  `NEXT_PUBLIC_APP_URL` in production.
- Onboarding retries on a slug collision instead of surfacing a raw DB error.

### Added

- **Alpha validation readiness**: env hardening (`scripts/verify-env.ts` +
  `npm run verify:env`, canonical `FROM_EMAIL` / `NEXT_PUBLIC_STRIPE_PRICE_*` /
  `ADMIN_EMAILS`); centralized authorization helpers
  (`src/lib/auth/organizations.ts`); `spam`/`archived` lead statuses + status
  helpers (migration `0005`); lead list filters (urgency/source/search/sort);
  service-category edit + quick-add + empty states; AI `city`/`state`/
  `postal_code` extraction; soft usage limits (`src/lib/billing/usage.ts`);
  risk flags in owner emails; protected internal `/app/admin` (ADMIN_EMAILS);
  expanded dashboard metrics + CTA cards. New docs: `SERVICELEAD_ALPHA_AUDIT`,
  `FINAL_SERVICELEAD_ALPHA_AUDIT`, `SUPABASE_SETUP`, `DEMO_SCRIPT`, and expanded
  `VALIDATION_PLAN` / `COMPLIANCE` / `DEPLOYMENT`. New tests: usage, validation,
  ownership, expanded status (56 total).
- Continuous Integration (GitHub Actions): typecheck, lint, test, and build on
  every push/PR to `main`.
- Integration tests for the `processIntake` orchestration using an in-memory
  Supabase fake, locking in opt-out compliance behavior.
- Health/configuration probe at `/api/health` (booleans only — no secrets).
- Startup configuration logging via `instrumentation.ts` (warns, never throws,
  on missing config).
- App Router robustness: dashboard `error`/`loading` boundaries, global `404`,
  and a top-level `global-error` boundary.
- Security response headers (nosniff, frame options, referrer-policy,
  permissions-policy, HSTS).
- `robots.txt` and `sitemap.xml` route handlers.
- Repo hygiene: `LICENSE` (MIT), `CONTRIBUTING.md`, PR template, this changelog.

### Fixed

- **Critical (compliance):** opt-out is now authoritative per phone/email across
  an organization. STOP opts out every lead for the number, and newly created
  leads (incl. web-form) inherit a prior opt-out, so an unsubscribed contact can
  never be messaged again.
- Twilio webhooks now **fail closed**: requests are rejected when the signature
  cannot be verified, and the voice/missed-call route now validates signatures.
- Stripe subscription upsert is backed by a unique constraint on
  `subscriptions.organization_id` (migration `0004`).
- `bookAppointmentAction` respects allowed status transitions instead of forcing
  `booked`.
- Opt-in keywords no longer match a normal reply (`"yes"` removed; opt-in must be
  a sole-word message).
- Real-model float `lead_score` is rounded instead of rejected by the schema.

## [0.1.0] - 2026-06-26

### Added

- Initial MVP: missed-call recovery + AI lead-intake for local service
  businesses. Landing/pricing, Supabase auth + onboarding, organization &
  service-category setup, intake templates, public intake form, missed-call/SMS/
  form simulator, lead dashboard + detail, mock-first AI intake (OpenAI/Anthropic
  providers with mock fallback), STOP/opt-out handling, Twilio webhook
  placeholders, owner email notifications (Resend), Stripe billing abstraction,
  RLS-protected multi-tenant schema, unit tests, and full documentation.
