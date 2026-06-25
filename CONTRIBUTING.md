# Contributing to ServiceLead AI

Thanks for helping build ServiceLead AI. This guide keeps changes consistent and
safe.

## Prerequisites

- Node 20+ and npm
- A Supabase project (for anything beyond the marketing pages)

## Setup

```bash
npm install
cp .env.example .env.local   # fill at least the Supabase keys
# apply supabase/migrations/0001 → 0004 (CLI: supabase db push, or SQL editor)
npm run dev
```

The app runs with **only Supabase configured**. Twilio, Stripe, Resend, and real
AI are optional and degrade gracefully — never hard-require them in new code.

## Workflow

1. Branch from `main`: `git checkout -b feat/short-description`.
2. Make focused changes with tests.
3. Run the full check suite locally (below) — it must be green.
4. Open a PR into `main`. CI runs typecheck, lint, test, and build.
5. Never force-push `main` or rewrite shared history.

## Checks (all must pass)

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run test        # vitest unit/integration
npm run build       # next build
npm run test:e2e    # optional: Playwright smoke
```

## Conventions

- **TypeScript** everywhere; prefer explicit types at module boundaries.
- **Validation**: validate external input with Zod (`src/lib/validation`,
  `src/lib/ai/schemas`).
- **Supabase clients**: use the user-scoped server client in pages/actions; the
  service-role admin client (`src/lib/supabase/admin.ts`) is for webhooks and
  the public intake endpoint ONLY — never import it into client components.
- **AI**: add providers behind the `AiProvider` interface; the mock must always
  work without an API key, and real providers must fall back to mock on failure.
- **Tests**: cover new business logic. Compliance-sensitive paths (opt-out,
  consent, org isolation) require regression tests — see
  `tests/unit/intake.test.ts` and its in-memory Supabase fake.

## Compliance — non-negotiable

ServiceLead AI only responds to inbound, customer-initiated contact. Any change
that could:

- send a message to an opted-out contact,
- weaken STOP/UNSUBSCRIBE/CANCEL handling,
- enable cold/outbound messaging, or
- leak data across organizations

…must be rejected. See [docs/COMPLIANCE.md](docs/COMPLIANCE.md).

## Commit messages

Use clear, imperative summaries (e.g. "Add per-phone opt-out enforcement").
Group related changes; keep unrelated changes in separate commits/PRs.
