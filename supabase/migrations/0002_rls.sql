-- ════════════════════════════════════════════════════════════════════════════
-- ServiceLead AI — Row Level Security
-- ════════════════════════════════════════════════════════════════════════════
-- Principle:
--   * A user may read/write only organizations they OWN or are a MEMBER of.
--   * All tenant data (leads, messages, conversations, etc.) is scoped to the
--     organization the user belongs to.
--   * The service role (used by webhooks + the public intake endpoint) bypasses
--     RLS entirely, so no policies are needed for it.

-- Helper: is the current auth user a member (or owner) of an org?
-- SECURITY DEFINER avoids infinite recursion between organizations and
-- organization_members policies.
create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organizations o
    where o.id = org_id and o.owner_id = auth.uid()
  ) or exists (
    select 1 from public.organization_members m
    where m.organization_id = org_id and m.user_id = auth.uid()
  );
$$;

-- Enable RLS on every table.
alter table public.profiles              enable row level security;
alter table public.organizations         enable row level security;
alter table public.organization_members  enable row level security;
alter table public.service_categories    enable row level security;
alter table public.intake_templates      enable row level security;
alter table public.leads                 enable row level security;
alter table public.conversations         enable row level security;
alter table public.messages              enable row level security;
alter table public.twilio_numbers        enable row level security;
alter table public.appointments          enable row level security;
alter table public.ai_intake_logs        enable row level security;
alter table public.subscriptions         enable row level security;

-- ── profiles ────────────────────────────────────────────────────────────────
create policy "profiles self select" on public.profiles
  for select using (id = auth.uid());
create policy "profiles self insert" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles self update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ── organizations ───────────────────────────────────────────────────────────
create policy "orgs member select" on public.organizations
  for select using (public.is_org_member(id));
create policy "orgs owner insert" on public.organizations
  for insert with check (owner_id = auth.uid());
create policy "orgs owner update" on public.organizations
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "orgs owner delete" on public.organizations
  for delete using (owner_id = auth.uid());

-- ── organization_members ────────────────────────────────────────────────────
create policy "members select own org" on public.organization_members
  for select using (public.is_org_member(organization_id));
-- Only the org owner can manage membership.
create policy "members owner manage" on public.organization_members
  for all
  using (exists (
    select 1 from public.organizations o
    where o.id = organization_id and o.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.organizations o
    where o.id = organization_id and o.owner_id = auth.uid()
  ));

-- ── Generic tenant tables: full access for members of the org ────────────────
-- service_categories
create policy "svc cat member all" on public.service_categories
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- intake_templates
create policy "intake tmpl member all" on public.intake_templates
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- leads
create policy "leads member all" on public.leads
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- conversations
create policy "conversations member all" on public.conversations
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- messages
create policy "messages member all" on public.messages
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- twilio_numbers
create policy "twilio member all" on public.twilio_numbers
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- appointments
create policy "appointments member all" on public.appointments
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ai_intake_logs (read-only for members; writes happen via service role)
create policy "ai logs member select" on public.ai_intake_logs
  for select using (public.is_org_member(organization_id));

-- subscriptions (read-only for members; writes happen via service role/webhook)
create policy "subscriptions member select" on public.subscriptions
  for select using (public.is_org_member(organization_id));
