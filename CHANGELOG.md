# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
