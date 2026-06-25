-- ════════════════════════════════════════════════════════════════════════════
-- ServiceLead AI — initial schema
-- ════════════════════════════════════════════════════════════════════════════
-- Run with the Supabase CLI (`supabase db push` / `supabase migration up`) or
-- paste into the SQL editor in order: 0001 -> 0002 -> 0003.

create extension if not exists "pgcrypto";

-- ── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── organizations ───────────────────────────────────────────────────────────
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  slug text not null unique,
  business_type text,
  country text,
  state text,
  city text,
  timezone text,
  website text,
  phone text,
  notification_email text,
  notification_phone text,
  booking_link text,
  review_link text,
  business_hours jsonb,
  emergency_service boolean not null default false,
  default_response_delay text,
  sms_consent boolean not null default false,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists organizations_owner_id_idx on public.organizations (owner_id);

-- ── organization_members ────────────────────────────────────────────────────
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index if not exists org_members_user_idx on public.organization_members (user_id);
create index if not exists org_members_org_idx on public.organization_members (organization_id);

-- ── service_categories ──────────────────────────────────────────────────────
create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists service_categories_org_idx on public.service_categories (organization_id);

-- ── intake_templates ────────────────────────────────────────────────────────
create table if not exists public.intake_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  service_category_id uuid references public.service_categories (id) on delete set null,
  name text,
  questions jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists intake_templates_org_idx on public.intake_templates (organization_id);

-- ── leads ───────────────────────────────────────────────────────────────────
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  source text not null check (source in ('missed_call', 'sms', 'web_form', 'manual', 'test')),
  customer_name text,
  customer_phone text,
  customer_email text,
  service_needed text,
  urgency text,
  address text,
  city text,
  state text,
  postal_code text,
  preferred_time text,
  status text not null default 'new' check (status in ('new', 'contacted', 'booked', 'won', 'lost')),
  lead_score integer,
  ai_summary text,
  owner_notes text,
  consent_status text,
  consent_source text,
  opt_out boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_org_idx on public.leads (organization_id);
create index if not exists leads_org_status_idx on public.leads (organization_id, status);
create index if not exists leads_phone_idx on public.leads (organization_id, customer_phone);

-- ── conversations ───────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete cascade,
  channel text not null check (channel in ('sms', 'web', 'manual')),
  status text not null default 'open',
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists conversations_org_idx on public.conversations (organization_id);
create index if not exists conversations_lead_idx on public.conversations (lead_id);

-- ── messages ────────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  channel text,
  from_number text,
  to_number text,
  body text not null,
  provider_message_id text,
  ai_generated boolean not null default false,
  status text,
  created_at timestamptz not null default now()
);
create index if not exists messages_org_idx on public.messages (organization_id);
create index if not exists messages_conversation_idx on public.messages (conversation_id);
create index if not exists messages_lead_idx on public.messages (lead_id);

-- ── twilio_numbers ──────────────────────────────────────────────────────────
create table if not exists public.twilio_numbers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  phone_number text not null,
  twilio_sid text,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists twilio_numbers_org_idx on public.twilio_numbers (organization_id);
create index if not exists twilio_numbers_phone_idx on public.twilio_numbers (phone_number);

-- ── appointments ────────────────────────────────────────────────────────────
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete cascade,
  scheduled_for timestamptz,
  status text not null default 'requested',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists appointments_org_idx on public.appointments (organization_id);

-- ── ai_intake_logs ──────────────────────────────────────────────────────────
create table if not exists public.ai_intake_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  conversation_id uuid references public.conversations (id) on delete set null,
  provider text,
  model text,
  input_json jsonb,
  output_json jsonb,
  status text,
  error_message text,
  created_at timestamptz not null default now()
);
create index if not exists ai_intake_logs_org_idx on public.ai_intake_logs (organization_id);

-- ── subscriptions ───────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text,
  status text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_org_idx on public.subscriptions (organization_id);
