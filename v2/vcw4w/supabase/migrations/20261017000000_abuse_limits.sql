-- Distributed abuse limits: Postgres-backed fixed-window counters shared by
-- every serverless instance.
--
-- The in-process rateLimit() helper is per-instance memory: a caller spraying
-- N instances (Fluid/scale-out), rotating IPs, or fanning one account across
-- edge nodes gets ~N x every local limit. These buckets are the
-- cross-instance backstop for anonymous endpoints (signup, login, kid-login,
-- guest-pass) and high-value authed endpoints (daily/claim/referrals,
-- uploads). Server routes check memory first (fast reject, zero I/O) and the
-- shared bucket second; EITHER layer denying rejects the request.
--
-- RLS is enabled with NO client policies (service_role only, like the
-- privacy/desktop/vault tables). The SECURITY DEFINER RPC below is granted
-- to nobody: server routes call it through serviceClient(), which bypasses
-- grants and RLS. It touches only abuse_buckets, so it leaks nothing.

create table if not exists public.abuse_buckets (
  bucket_key text primary key,
  window_start timestamptz not null default now(),
  hits integer not null default 0,
  constraint abuse_buckets_key_check check (bucket_key <> '' and char_length(bucket_key) <= 200),
  constraint abuse_buckets_hits_check check (hits >= 0)
);

alter table public.abuse_buckets enable row level security;

drop policy if exists abuse_buckets_no_client_access on public.abuse_buckets;

create or replace function public.check_abuse_bucket(p_key text, p_limit integer, p_window_seconds integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := substr(trim(coalesce(p_key, '')), 1, 200);
  v_limit integer := greatest(1, least(coalesce(p_limit, 30), 1000000));
  v_window integer := greatest(1, least(coalesce(p_window_seconds, 60), 86400));
  v_now timestamptz := now();
  v_start timestamptz;
  v_hits integer;
  v_allowed boolean;
  v_retry integer := 0;
begin
  if v_key = '' then
    return jsonb_build_object('allowed', false, 'retry_after', v_window, 'hits', 0);
  end if;
  -- Serialize increments per key across instances and connections: a
  -- distributed burst against one bucket cannot slip through one window.
  perform pg_advisory_xact_lock(hashtext('abuse-bucket-v1'), hashtext(v_key));
  select window_start, hits into v_start, v_hits
  from public.abuse_buckets
  where bucket_key = v_key;
  if not found or v_start < v_now - make_interval(secs => v_window) then
    v_start := v_now;
    v_hits := 1;
    insert into public.abuse_buckets (bucket_key, window_start, hits)
    values (v_key, v_start, v_hits)
    on conflict (bucket_key)
    do update set window_start = excluded.window_start, hits = excluded.hits;
  else
    v_hits := v_hits + 1;
    update public.abuse_buckets set hits = v_hits where bucket_key = v_key;
  end if;
  v_allowed := v_hits <= v_limit;
  if not v_allowed then
    v_retry := greatest(1, ceil(extract(epoch from (v_start + make_interval(secs => v_window) - v_now)))::integer);
  end if;
  -- Opportunistic prune (bounded): expired rows are recycled in place by the
  -- upsert above, so this only reaps keys that went quiet; no cron needed.
  delete from public.abuse_buckets
  where bucket_key in (
    select bucket_key
    from public.abuse_buckets
    where window_start < v_now - interval '1 day'
    limit 25
  );
  return jsonb_build_object('allowed', v_allowed, 'retry_after', v_retry, 'hits', v_hits);
end;
$$;

-- Locked down: no grants to anon/authenticated/public. service_role (server
-- routes via serviceClient) bypasses grants and RLS entirely.
revoke all on function public.check_abuse_bucket(text, integer, integer) from public, anon, authenticated;
revoke all on table public.abuse_buckets from public, anon, authenticated;
