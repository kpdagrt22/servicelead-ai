-- ════════════════════════════════════════════════════════════════════════════
-- ServiceLead AI — webhook idempotency (T-07)
-- ════════════════════════════════════════════════════════════════════════════
-- Records the id of every processed inbound webhook so retries (Twilio resends
-- on timeout, Stripe redelivers events) are no-ops instead of creating
-- duplicate leads / AI runs / billing updates.
--
-- Only the service role writes/reads this table (webhook handlers). RLS is
-- enabled with NO policies so user-scoped clients can never touch it; the
-- service-role client bypasses RLS.

create table if not exists public.webhook_events (
  id text primary key,            -- e.g. 'stripe:evt_123', 'twilio:SMxxxxxxxx'
  provider text not null,         -- 'stripe' | 'twilio'
  event_type text,
  created_at timestamptz not null default now()
);

alter table public.webhook_events enable row level security;
