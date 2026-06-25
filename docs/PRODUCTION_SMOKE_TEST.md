# Production Smoke Test — ServiceLead AI

A manual, end-to-end smoke test for ServiceLead AI (Next.js App Router +
Supabase + Vercel). Work through each section in order, check off each item, and
record pass/fail inline.

## How to use this

- Walk the sections top to bottom; many later steps depend on data created in
  earlier ones (e.g. a lead created in the simulator is verified in the dashboard).
- For each item, replace the blank in `(pass/fail: ___)` with `pass` or `fail`.
- For any **fail**, capture: the URL, what you did, what you expected, what
  actually happened, and a screenshot or console log.
- Keep the browser devtools console open the whole time to catch errors.
- Before starting, confirm the environment with `npm run verify:env` (locally)
  and the health probe `/api/health` (any deployment).
- Replace `[slug]` and `[id]` with real values from your test org/leads.

## Test run record

- Tester name: ___________________________
- Environment (Local / Preview / Production): ___________________________
- Base URL under test: ___________________________
- Build / commit / deployment ID: ___________________________
- Date / time (and timezone): ___________________________
- Active env profile (A / B / C): ___________________________
- Notes / known caveats: ___________________________

---

## 1. Public routes

- [ ] Open landing page `/` — page renders fully, primary CTA visible (pass/fail: ___)
- [ ] Open pricing page `/pricing` — plans/tiers render (pass/fail: ___)
- [ ] Open health probe `/api/health` — returns OK JSON (e.g. `{ "status": "ok" }` or equivalent) (pass/fail: ___)
- [ ] No errors in the browser console on `/` and `/pricing` (pass/fail: ___)
- [ ] No 4xx/5xx in the network tab for first-party requests on these pages (pass/fail: ___)

## 2. Authentication

- [ ] Open `/signup` and create a new account with a fresh email (pass/fail: ___)
- [ ] Open `/login` and sign in with the new credentials (pass/fail: ___)
- [ ] Log out — session ends and you return to a public/login view (pass/fail: ___)
- [ ] While logged out, visit a protected route (e.g. `/app`) — you are redirected to `/login` (pass/fail: ___)
- [ ] The post-login redirect target is safe/internal (no open-redirect to an external URL) (pass/fail: ___)
- [ ] After logging back in, you land in the authenticated app (`/app`) (pass/fail: ___)

## 3. Onboarding

- [ ] As a fresh user, complete `/onboarding` (pass/fail: ___)
- [ ] Create an organization (org) (pass/fail: ___)
- [ ] Enter business info (name, contact details, etc.) (pass/fail: ___)
- [ ] Add at least one service offering (pass/fail: ___)
- [ ] Set the notification email for the org (pass/fail: ___)
- [ ] On completion you land in the dashboard at `/app` (NOT `/app/dashboard`) (pass/fail: ___)

## 4. Public intake

- [ ] Open the public intake page `/u/[slug]` for your org's slug (pass/fail: ___)
- [ ] Submit a valid lead (name, phone, message) — confirmation shown (pass/fail: ___)
- [ ] Submit an invalid form (e.g. missing/blank required field) — clear validation error shown, no submit (pass/fail: ___)
- [ ] Open `/app/leads` — the valid lead from above now appears (pass/fail: ___)
- [ ] Org scoping is correct: the lead belongs to the right org and is not visible to other orgs (pass/fail: ___)
- [ ] (If `SUPABASE_SERVICE_ROLE_KEY` is unset) public intake fails safely with a "not configured" notice rather than crashing (pass/fail: ___)

## 5. Simulator

- [ ] Open `/app/simulator` (pass/fail: ___)
- [ ] Run a simulated missed call (pass/fail: ___)
- [ ] A new lead is created from the missed call (pass/fail: ___)
- [ ] A conversation/thread is generated for the lead (pass/fail: ___)
- [ ] An AI summary is produced (deterministic mock is fine if no AI key) (pass/fail: ___)
- [ ] An urgency score is assigned to the lead (pass/fail: ___)

## 6. Lead dashboard

- [ ] Open `/app/leads` — list renders with the leads created above (pass/fail: ___)
- [ ] Filters work (e.g. by status / urgency) and update the list (pass/fail: ___)
- [ ] Search works (find a lead by name/phone/keyword) (pass/fail: ___)
- [ ] Update a lead's status — change persists after refresh (pass/fail: ___)
- [ ] Open lead detail `/app/leads/[id]` — detail view opens with conversation + summary (pass/fail: ___)

## 7. Opt-out (STOP / compliance)

- [ ] Simulate an inbound `STOP` for a lead's phone number (pass/fail: ___)
- [ ] The lead is marked opted out (consent withdrawn) (pass/fail: ___)
- [ ] Outbound messaging to that phone is prevented (opted-out numbers are never messaged) (pass/fail: ___)
- [ ] An opted-out badge/indicator is shown in the UI for that lead (pass/fail: ___)
- [ ] Opt-out is enforced per-phone (other leads/phones unaffected) (pass/fail: ___)

## 8. Owner notification

- [ ] With Resend configured (`RESEND_API_KEY` + `FROM_EMAIL`): a new lead triggers an owner email to the notification address (pass/fail: ___)
- [ ] With Resend NOT configured: the notification falls back to a visible console/log entry (no crash, no silent drop) (pass/fail: ___)
- [ ] The notification content references the correct lead/org (pass/fail: ___)

## 9. Twilio placeholders

- [ ] With Twilio env missing: outbound SMS is simulated/logged rather than sent, and the app does not crash (pass/fail: ___)
- [ ] In production with `TWILIO_AUTH_TOKEN` missing: inbound webhooks fail closed (reject) instead of processing unverified requests (pass/fail: ___)
- [ ] No Twilio secret (`TWILIO_AUTH_TOKEN`, account SID) is exposed in page source, network responses, or client bundle (pass/fail: ___)

## 10. Billing / pricing

- [ ] `/pricing` loads and shows the plan tiers (pass/fail: ___)
- [ ] With Stripe NOT configured: app stays in trial mode, no crash (pass/fail: ___)
- [ ] With price IDs unconfigured: starting checkout shows a useful "not configured" message (not a stack trace) (pass/fail: ___)
- [ ] With Stripe configured (test mode): checkout reaches the Stripe-hosted page using the correct price ID (pass/fail: ___)
- [ ] Visit `/app/billing` while authenticated — billing state renders correctly for the current config (pass/fail: ___)

## 11. Admin

- [ ] As a user NOT in `ADMIN_EMAILS`, open `/app/admin` — access is blocked / returns 404 (pass/fail: ___)
- [ ] As a user IN `ADMIN_EMAILS`, open `/app/admin` — page loads (pass/fail: ___)
- [ ] No secrets (API keys, service role key, auth tokens) are displayed anywhere on the admin page (pass/fail: ___)

## 12. Mobile responsiveness

Test on a narrow viewport (e.g. ~375px wide) or a real phone.

- [ ] Dashboard `/app` is usable: nav, lists, and key actions are reachable (pass/fail: ___)
- [ ] Public intake form `/u/[slug]` is usable: fields, labels, and submit button fit and work (pass/fail: ___)
- [ ] Lead detail `/app/leads/[id]` is readable: conversation and summary lay out correctly (pass/fail: ___)
- [ ] No horizontal overflow, overlapping controls, or cut-off text on these pages (pass/fail: ___)

## 13. Error handling

- [ ] Trigger a not-found route (e.g. `/app/leads/does-not-exist`) — a friendly not-found/error page shows, not a raw stack trace (pass/fail: ___)
- [ ] Force a missing-integration path (e.g. checkout without price IDs) — a friendly "not configured" message appears (pass/fail: ___)
- [ ] No raw stack traces, internal file paths, or secret values are exposed in any error state (pass/fail: ___)
- [ ] Server/console logs during the run contain no unhandled exceptions for normal flows (pass/fail: ___)

---

## Compliance checks (cross-cutting)

Confirm these hold throughout the run; they are non-negotiable for alpha.

- [ ] Messaging is inbound-only — no unsolicited outbound campaigns are sent (pass/fail: ___)
- [ ] STOP / opt-out is enforced per-phone and opted-out numbers are never messaged (pass/fail: ___)
- [ ] Consent is stored for leads who provide contact info (pass/fail: ___)
- [ ] No medical triage or diagnosis is performed or implied in AI output (pass/fail: ___)
- [ ] No guaranteed-revenue or guaranteed-results claims appear in product copy (pass/fail: ___)

## Sign-off

- Overall result (Pass / Pass-with-issues / Fail): ___________________________
- Blocking issues found: ___________________________
- Non-blocking issues / follow-ups: ___________________________
- Tester signature & date: ___________________________
