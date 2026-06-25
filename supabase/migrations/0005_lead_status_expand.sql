-- ════════════════════════════════════════════════════════════════════════════
-- ServiceLead AI — expand lead status set (+ spam, archived)
-- ════════════════════════════════════════════════════════════════════════════
-- Adds 'spam' and 'archived' to the allowed lead.status values so owners can
-- triage junk and clear out old leads. Non-destructive: existing rows are
-- unaffected (the new values are additive).

alter table public.leads
  drop constraint if exists leads_status_check;

alter table public.leads
  add constraint leads_status_check
  check (status in ('new', 'contacted', 'booked', 'won', 'lost', 'spam', 'archived'));
