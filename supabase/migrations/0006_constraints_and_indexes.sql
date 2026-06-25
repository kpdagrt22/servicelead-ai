-- ════════════════════════════════════════════════════════════════════════════
-- ServiceLead AI — uniqueness & index hardening
-- ════════════════════════════════════════════════════════════════════════════
-- Additive and safe. De-duplicates defensively (keeping the newest row) BEFORE
-- adding each unique constraint, mirroring 0004. No destructive column changes.
-- Apply after 0005.
--
-- Covers:
--   T-01  unique(twilio_numbers.phone_number)  — stop cross-tenant number
--         capture and the maybeSingle() inbound lead-drop on duplicate rows.
--   T-07  index on messages.provider_message_id — status callbacks + idempotency.
--   DB correctness — unique(service_categories org,name), open-conversation
--         uniqueness, lead_score range, and missing indexes for real queries.

-- ── twilio_numbers: one organization per phone number ───────────────────────
delete from public.twilio_numbers
where id in (
  select id from (
    select id,
           row_number() over (
             partition by phone_number
             order by updated_at desc, created_at desc
           ) as rn
    from public.twilio_numbers
  ) ranked
  where ranked.rn > 1
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'twilio_numbers_phone_key'
  ) then
    alter table public.twilio_numbers
      add constraint twilio_numbers_phone_key unique (phone_number);
  end if;
end $$;

-- ── service_categories: no duplicate category names within an org ────────────
delete from public.service_categories
where id in (
  select id from (
    select id,
           row_number() over (
             partition by organization_id, name
             order by created_at desc
           ) as rn
    from public.service_categories
  ) ranked
  where ranked.rn > 1
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'service_categories_org_name_key'
  ) then
    alter table public.service_categories
      add constraint service_categories_org_name_key unique (organization_id, name);
  end if;
end $$;

-- ── leads: bound the AI-supplied score; index the opt-out email lookup ───────
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leads_score_range'
  ) then
    -- NOT VALID: enforce on new/updated rows without failing on any legacy data.
    alter table public.leads
      add constraint leads_score_range
      check (lead_score is null or (lead_score >= 0 and lead_score <= 100))
      not valid;
  end if;
end $$;

create index if not exists leads_org_email_idx
  on public.leads (organization_id, customer_email);

-- ── messages: provider_message_id lookup (delivery callbacks + idempotency) ──
create index if not exists messages_provider_msg_idx
  on public.messages (provider_message_id)
  where provider_message_id is not null;

-- ── appointments: lead detail page queries appointments by lead ─────────────
create index if not exists appointments_lead_idx
  on public.appointments (lead_id);

-- ── conversations: at most one OPEN conversation per (lead, channel) ─────────
update public.conversations
set status = 'closed'
where status = 'open'
  and id in (
    select id from (
      select id,
             row_number() over (
               partition by lead_id, channel
               order by created_at desc
             ) as rn
      from public.conversations
      where status = 'open' and lead_id is not null
    ) ranked
    where ranked.rn > 1
  );

create unique index if not exists conversations_open_lead_channel_uidx
  on public.conversations (lead_id, channel)
  where status = 'open' and lead_id is not null;
