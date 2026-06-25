-- ════════════════════════════════════════════════════════════════════════════
-- ServiceLead AI — durable, multi-instance rate limiting (T-09)
-- ════════════════════════════════════════════════════════════════════════════
-- The in-memory limiter (src/lib/rate-limit.ts) is per-process and ineffective
-- on serverless. This table + atomic function provide a shared limiter across
-- all instances using the database the app already depends on. Called from the
-- service-role client via rpc('rate_limit_hit', ...). RLS enabled, no policies
-- (service-role only).

create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null
);

alter table public.rate_limits enable row level security;

-- Atomic check-and-increment. Returns true when the hit is allowed (count is
-- within the limit for the current window), false when the limit is exceeded.
-- A single upsert keeps the operation race-free.
create or replace function public.rate_limit_hit(
  p_key text,
  p_limit integer,
  p_window_ms integer
)
returns boolean
language plpgsql
as $$
declare
  v_now timestamptz := now();
  v_count integer;
begin
  insert into public.rate_limits (key, count, reset_at)
  values (p_key, 1, v_now + make_interval(secs => p_window_ms / 1000.0))
  on conflict (key) do update
    set count = case
                  when public.rate_limits.reset_at < v_now then 1
                  else public.rate_limits.count + 1
                end,
        reset_at = case
                  when public.rate_limits.reset_at < v_now
                    then v_now + make_interval(secs => p_window_ms / 1000.0)
                  else public.rate_limits.reset_at
                end
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

-- Opportunistic cleanup of expired buckets (call occasionally; not required for
-- correctness since expired rows are reset in place on the next hit).
create or replace function public.prune_rate_limits()
returns void
language sql
as $$
  delete from public.rate_limits where reset_at < now();
$$;
