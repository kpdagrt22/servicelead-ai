-- ════════════════════════════════════════════════════════════════════════════
-- ServiceLead AI — enforce one subscription row per organization
-- ════════════════════════════════════════════════════════════════════════════
-- The Stripe webhook upserts with `onConflict: "organization_id"` and the
-- billing page reads with `.maybeSingle()`, both of which assume a 1:1
-- organization→subscription relationship. Postgres/PostgREST require a UNIQUE
-- (or exclusion) constraint to back an ON CONFLICT target, so add it here.

-- De-duplicate first (keep the most recent row per org) in case any duplicates
-- already exist, so the constraint can be added safely.
delete from public.subscriptions s
using public.subscriptions newer
where s.organization_id = newer.organization_id
  and s.created_at < newer.created_at;

-- The non-unique index from 0001 is now redundant with the unique constraint.
drop index if exists public.subscriptions_org_idx;

alter table public.subscriptions
  add constraint subscriptions_organization_id_key unique (organization_id);
