-- ════════════════════════════════════════════════════════════════════════════
-- ServiceLead AI — triggers & automation
-- ════════════════════════════════════════════════════════════════════════════

-- ── updated_at maintenance ──────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','organizations','intake_templates','leads',
    'conversations','twilio_numbers','subscriptions'
  ]
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;', t
    );
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();', t
    );
  end loop;
end $$;

-- ── auto-create a profile when a new auth user signs up ─────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── when an org is created: add owner as member + seed defaults ─────────────
create or replace function public.handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_questions jsonb := '[
    {"key":"service_needed","label":"What service do you need?","required":true},
    {"key":"urgency","label":"Is it urgent or an emergency?","required":true},
    {"key":"address","label":"What is the address or ZIP code?","required":false},
    {"key":"issue","label":"Can you describe the issue?","required":true},
    {"key":"preferred_time","label":"What time works best for you?","required":false},
    {"key":"property_type","label":"Is this residential or commercial?","required":false}
  ]'::jsonb;
  cat record;
  cat_names text[] := array[
    'Plumbing repair','HVAC repair','Electrical work',
    'Cleaning quote','Pest control','Salon booking','Custom'
  ];
  n text;
begin
  -- Owner is always a member with role 'owner'.
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (organization_id, user_id) do nothing;

  -- Seed default service categories + a default intake template each.
  foreach n in array cat_names loop
    insert into public.service_categories (organization_id, name)
    values (new.id, n)
    returning id into cat;

    insert into public.intake_templates
      (organization_id, service_category_id, name, questions)
    values (new.id, cat.id, n || ' intake', default_questions);
  end loop;

  return new;
end;
$$;

drop trigger if exists on_organization_created on public.organizations;
create trigger on_organization_created
  after insert on public.organizations
  for each row execute function public.handle_new_organization();

-- ── keep conversation.last_message_at fresh on new messages ─────────────────
create or replace function public.touch_conversation()
returns trigger
language plpgsql
as $$
begin
  if new.conversation_id is not null then
    update public.conversations
      set last_message_at = new.created_at, updated_at = now()
      where id = new.conversation_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_message_insert on public.messages;
create trigger on_message_insert
  after insert on public.messages
  for each row execute function public.touch_conversation();
