-- ============================================================================
-- Game rentals ("renting games") — per-load + per-hour play metering.
-- Fully rerunnable: IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS.
--
-- Model (mirrors lib/game-rent.ts):
--   * Each game load costs coins_per_load (default 1) and INCLUDES the first
--     hour of play. Continued play costs coins_per_hour per extra hour
--     (default 1). A plain 5-hour session on defaults = exactly 5 coins, so
--     even a day-1 daily bonus (5 coins) covers 5 hours of play.
--   * Cached loads are free: < 1 MiB of NEW bytes, or the same bundle
--     version already billed in the last 24h (refresh protection).
--   * Developers set their own rates 0..100 (0 = free). Only mapped
--     developers (game_developers, onboarded by an admin) or admins may
--     change rates — nobody else can grief a game's price.
--   * Every gross coin INCLUDES the 25% platform cut (cut + provider = gross,
--     computed by game_ai_compute_split). The provider share is attributed to
--     the mapped developer when one exists (dev_user_id); payouts settle
--     later, exactly like agent-rental escrow accounting.
--   * Guests never touch this ledger: unsigned play is IP-quota + house ads
--     (see /api/games/guest-pass), with no saves / multiplayer / AI.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Per-game rates (defaults 1 load / 1 hour; dev-settable 0..100).
-- --------------------------------------------------------------------------
create table if not exists public.game_rates (
  game_slug text primary key check (game_slug ~ '^[a-z0-9-]{1,64}$'),
  coins_per_load integer not null default 1 check (coins_per_load between 0 and 100),
  coins_per_hour integer not null default 1 check (coins_per_hour between 0 and 100),
  dev_user_id uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- 2. Developer mapping (who may price a game). Managed by admins only.
-- --------------------------------------------------------------------------
create table if not exists public.game_developers (
  game_slug text not null check (game_slug ~ '^[a-z0-9-]{1,64}$'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (game_slug, user_id)
);
create index if not exists idx_game_developers_user on public.game_developers (user_id);

-- --------------------------------------------------------------------------
-- 3. Play sessions + metered hourly usage.
-- --------------------------------------------------------------------------
create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_slug text not null check (game_slug ~ '^[a-z0-9-]{1,64}$'),
  bundle_version text not null default '1' check (char_length(bundle_version) between 1 and 32),
  new_bytes integer not null default 0 check (new_bytes >= 0 and new_bytes <= 1073741824),
  load_fee integer not null default 0 check (load_fee >= 0 and load_fee <= 100),
  load_cut integer not null default 0 check (load_cut >= 0 and load_cut <= 100),
  free_load boolean not null default false,
  active_seconds integer not null default 0 check (active_seconds >= 0 and active_seconds <= 864000),
  billed_hourly integer not null default 0 check (billed_hourly >= 0 and billed_hourly <= 1000000),
  status text not null default 'open' check (status in ('open', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists idx_game_sessions_user on public.game_sessions (user_id, started_at desc);
create index if not exists idx_game_sessions_game on public.game_sessions (game_slug, started_at desc);

create table if not exists public.game_play_usage (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_slug text not null check (game_slug ~ '^[a-z0-9-]{1,64}$'),
  active_seconds integer not null check (active_seconds >= 0 and active_seconds <= 864000),
  gross_coins integer not null check (gross_coins >= 0 and gross_coins <= 1000000),
  cut_coins integer not null check (cut_coins >= 0 and cut_coins <= 1000000),
  provider_coins integer not null check (provider_coins >= 0 and provider_coins <= 1000000),
  dev_user_id uuid references public.profiles (id) on delete set null,
  source text not null default 'heartbeat' check (source in ('load', 'heartbeat', 'manual')),
  created_at timestamptz not null default now(),
  check (cut_coins + provider_coins = gross_coins)
);
create index if not exists idx_game_play_usage_user on public.game_play_usage (user_id, created_at desc);
create index if not exists idx_game_play_usage_session on public.game_play_usage (session_id, created_at desc);
create index if not exists idx_game_play_usage_game on public.game_play_usage (game_slug, created_at desc);

-- --------------------------------------------------------------------------
-- 4. RLS — deny by default. Rates are public (badges/pricing render them);
--    dev mapping is member-visible; sessions/usage are self-only.
-- --------------------------------------------------------------------------
alter table public.game_rates enable row level security;
alter table public.game_developers enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_play_usage enable row level security;

drop policy if exists game_rates_read on public.game_rates;
create policy game_rates_read on public.game_rates
  for select to anon, authenticated using (true);

drop policy if exists game_developers_read on public.game_developers;
create policy game_developers_read on public.game_developers
  for select to authenticated using (true);

drop policy if exists game_sessions_own on public.game_sessions;
create policy game_sessions_own on public.game_sessions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists game_play_usage_own on public.game_play_usage;
create policy game_play_usage_own on public.game_play_usage
  for select to authenticated using (user_id = auth.uid());

revoke all on public.game_rates from anon, authenticated;
revoke all on public.game_developers from anon, authenticated;
revoke all on public.game_sessions from anon, authenticated;
revoke all on public.game_play_usage from anon, authenticated;
grant select on public.game_rates to anon, authenticated;
grant select on public.game_developers to authenticated;
grant select on public.game_sessions to authenticated;
grant select on public.game_play_usage to authenticated;

-- --------------------------------------------------------------------------
-- 5. RPCs — the ONLY writers. Money moves only here.
-- --------------------------------------------------------------------------

-- Admin-only: map a developer to a game (onboarding path: email
-- matt@mattyjacks.com like other elevated grants).
create or replace function public.add_game_developer(p_game text, p_user uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if (auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' then raise exception 'not authorized'; end if;
  if p_game !~ '^[a-z0-9-]{1,64}$' then raise exception 'invalid game'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'player not found'; end if;
  insert into public.game_developers (game_slug, user_id, added_by)
  values (p_game, p_user, auth.uid())
  on conflict do nothing;
  return true;
end; $$;
revoke all on function public.add_game_developer(text, uuid) from public, anon, authenticated;
grant execute on function public.add_game_developer(text, uuid) to authenticated;

-- set_game_rate: mapped developers + admins only. Rates 0..100 each.
create or replace function public.set_game_rate(p_game text, p_load integer, p_hour integer)
returns public.game_rates
language plpgsql security definer set search_path = public as $$
declare
  v_row public.game_rates;
  v_dev uuid;
  v_admin boolean;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_game !~ '^[a-z0-9-]{1,64}$' then raise exception 'invalid game'; end if;
  if p_load is null or p_load < 0 or p_load > 100 then raise exception 'load rate must be 0..100'; end if;
  if p_hour is null or p_hour < 0 or p_hour > 100 then raise exception 'hourly rate must be 0..100'; end if;
  v_admin := (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';
  select d.user_id into v_dev from public.game_developers d
  where d.game_slug = p_game and d.user_id = auth.uid();
  if not v_admin and v_dev is null then raise exception 'not authorized'; end if;
  -- Attribute the provider share to the mapped dev (first mapped wins).
  if v_dev is null then
    select d.user_id into v_dev from public.game_developers d
    where d.game_slug = p_game order by d.created_at asc limit 1;
  end if;
  insert into public.game_rates (game_slug, coins_per_load, coins_per_hour, dev_user_id, updated_by, updated_at)
  values (p_game, p_load, p_hour, v_dev, auth.uid(), now())
  on conflict (game_slug) do update set
    coins_per_load = excluded.coins_per_load,
    coins_per_hour = excluded.coins_per_hour,
    dev_user_id = excluded.dev_user_id,
    updated_by = excluded.updated_by,
    updated_at = now()
  returning * into v_row;
  return v_row;
end; $$;
revoke all on function public.set_game_rate(text, integer, integer) from public, anon, authenticated;
grant execute on function public.set_game_rate(text, integer, integer) to authenticated;

-- start_game_session: charge the load fee (or waive it) and open a session.
-- p_new_bytes = fresh network bytes for this load (client-measured via the
-- performance API; service-worker + HTTP cache hits report ~0). Loads under
-- 1 MiB of new data are cached loads: free. Same bundle version billed in
-- the last 24h is also free (refresh protection). The load INCLUDES the
-- first hour of play; hourly billing starts after 3600 active seconds.
create or replace function public.start_game_session(p_game text, p_version text, p_new_bytes integer)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_game text; v_version text; v_bytes integer;
  v_load integer := 1; v_hour integer := 1; v_dev uuid;
  v_free boolean := false; v_fee integer := 0;
  v_cut integer := 0; v_provider integer := 0;
  v_bal integer; v_fee_split record; v_session public.game_sessions;
  v_usage_id uuid := null;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  v_game := lower(trim(coalesce(p_game, '')));
  if v_game !~ '^[a-z0-9-]{1,64}$' then raise exception 'invalid game'; end if;
  v_version := trim(coalesce(nullif(p_version, ''), '1'));
  if v_version !~ '^[A-Za-z0-9._-]{1,32}$' then raise exception 'invalid version'; end if;
  v_bytes := coalesce(p_new_bytes, 0);
  if v_bytes < 0 or v_bytes > 1073741824 then raise exception 'invalid bytes'; end if;

  select r.coins_per_load, r.coins_per_hour, r.dev_user_id into v_load, v_hour, v_dev
  from public.game_rates r where r.game_slug = v_game;
  if not found then v_load := 1; v_hour := 1; v_dev := null; end if;

  -- Cached / recently-billed loads are free.
  if v_bytes < 1048576 then
    v_free := true;
  elsif exists (
    select 1 from public.game_sessions s
    where s.user_id = auth.uid() and s.game_slug = v_game
      and s.bundle_version = v_version and s.free_load = false
      and s.started_at > now() - interval '24 hours'
  ) then
    v_free := true;
  end if;
  v_fee := case when v_free then 0 else v_load end;

  if v_fee > 0 then
    select coalesce(sum(delta), 0)::integer into v_bal
    from public.coin_ledger where user_id = auth.uid();
    if v_bal < v_fee then
      raise exception 'insufficient balance: need % coins, have %', v_fee, v_bal;
    end if;
    select * into v_fee_split from public.game_ai_compute_split(v_fee);
    v_cut := v_fee_split.cut; v_provider := v_fee_split.provider;
    insert into public.coin_ledger (user_id, delta, reason)
    values (auth.uid(), -v_fee, substr('Play ' || v_game || ' (load)', 1, 120));
    -- Placeholder session id: re-pointed at the real session below so the
    -- debit + session stay atomic (tracked by row id, race-safe).
    insert into public.game_play_usage (session_id, user_id, game_slug, active_seconds, gross_coins, cut_coins, provider_coins, dev_user_id, source)
    values ('00000000-0000-0000-0000-000000000000', auth.uid(), v_game, 0, v_fee, v_cut, v_provider, v_dev, 'load')
    returning id into v_usage_id;
  end if;

  insert into public.game_sessions (user_id, game_slug, bundle_version, new_bytes, load_fee, load_cut, free_load)
  values (auth.uid(), v_game, v_version, v_bytes, v_fee, v_cut, v_free)
  returning * into v_session;

  -- Re-point the load row at the real session (it was inserted with a
  -- placeholder above so the debit + session stay atomic).
  if v_fee > 0 then
    update public.game_play_usage
    set session_id = v_session.id
    where id = v_usage_id;
  end if;

  return jsonb_build_object(
    'session_id', v_session.id,
    'load_fee', v_fee, 'load_cut', v_cut, 'free_load', v_free,
    'coins_per_load', v_load, 'coins_per_hour', v_hour
  );
end; $$;
revoke all on function public.start_game_session(text, text, integer) from public, anon, authenticated;
grant execute on function public.start_game_session(text, text, integer) to authenticated;

-- heartbeat_game_session: bill extra hours beyond the included first hour.
-- owed = rate * ceil((total_active - 3600) / 3600); only the delta since the
-- last beat is debited, so beats are idempotent-ish and never double-bill.
create or replace function public.heartbeat_game_session(p_session uuid, p_seconds integer)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_session public.game_sessions;
  v_hour integer := 1; v_dev uuid;
  v_total integer; v_owed integer; v_delta integer;
  v_cut integer := 0; v_provider integer := 0;
  v_bal integer; v_fee_split record;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_seconds is null or p_seconds < 1 or p_seconds > 3600 then raise exception 'seconds must be 1..3600'; end if;
  select * into v_session from public.game_sessions where id = p_session and user_id = auth.uid();
  if not found then raise exception 'session not found'; end if;
  if v_session.status <> 'open' then raise exception 'session is not open'; end if;

  select r.coins_per_hour, r.dev_user_id into v_hour, v_dev
  from public.game_rates r where r.game_slug = v_session.game_slug;
  if not found then v_hour := 1; v_dev := null; end if;

  v_total := v_session.active_seconds + p_seconds;
  -- First 3600 active seconds rode along with the load fee.
  v_owed := case when v_total <= 3600 then 0
    else ceil((v_total - 3600) / 3600.0)::integer * v_hour end;
  v_delta := greatest(0, v_owed - v_session.billed_hourly);

  if v_delta > 0 then
    select coalesce(sum(delta), 0)::integer into v_bal
    from public.coin_ledger where user_id = auth.uid();
    if v_bal < v_delta then
      raise exception 'insufficient balance: need % coins, have %', v_delta, v_bal;
    end if;
    select * into v_fee_split from public.game_ai_compute_split(v_delta);
    v_cut := v_fee_split.cut; v_provider := v_fee_split.provider;
    insert into public.coin_ledger (user_id, delta, reason)
    values (auth.uid(), -v_delta, substr('Play ' || v_session.game_slug || ' (hourly)', 1, 120));
    insert into public.game_play_usage (session_id, user_id, game_slug, active_seconds, gross_coins, cut_coins, provider_coins, dev_user_id, source)
    values (p_session, auth.uid(), v_session.game_slug, v_total, v_delta, v_cut, v_provider, v_dev, 'heartbeat');
  end if;

  update public.game_sessions
  set active_seconds = v_total, billed_hourly = v_session.billed_hourly + v_delta
  where id = p_session;

  return jsonb_build_object(
    'active_seconds', v_total,
    'billed_hourly', v_session.billed_hourly + v_delta,
    'charged', v_delta
  );
end; $$;
revoke all on function public.heartbeat_game_session(uuid, integer) from public, anon, authenticated;
grant execute on function public.heartbeat_game_session(uuid, integer) to authenticated;

-- end_game_session: close your own open session.
create or replace function public.end_game_session(p_session uuid)
returns public.game_sessions
language plpgsql security definer set search_path = public as $$
declare v_row public.game_sessions;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select * into v_row from public.game_sessions where id = p_session and user_id = auth.uid();
  if not found then raise exception 'session not found'; end if;
  if v_row.status <> 'open' then raise exception 'session is not open'; end if;
  update public.game_sessions
  set status = 'ended', ended_at = now()
  where id = p_session
  returning * into v_row;
  return v_row;
end; $$;
revoke all on function public.end_game_session(uuid) from public, anon, authenticated;
grant execute on function public.end_game_session(uuid) to authenticated;

-- my_game_play_usage: rollup for /my/usage — total + last hour + last 24h +
-- per-game, over game_play_usage (loads + heartbeats, 25% split recorded).
create or replace function public.my_game_play_usage()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_total jsonb; v_hour jsonb; v_day jsonb; v_bygame jsonb; v_recent jsonb;
begin
  if auth.uid() is null then raise exception 'login required'; end if;

  select jsonb_build_object(
    'gross', coalesce(sum(gross_coins), 0)::integer,
    'cut', coalesce(sum(cut_coins), 0)::integer,
    'provider', coalesce(sum(provider_coins), 0)::integer,
    'sessions', count(distinct session_id)::integer
  ) into v_total from public.game_play_usage where user_id = auth.uid();

  select jsonb_build_object(
    'gross', coalesce(sum(gross_coins), 0)::integer,
    'cut', coalesce(sum(cut_coins), 0)::integer,
    'provider', coalesce(sum(provider_coins), 0)::integer,
    'sessions', count(distinct session_id)::integer
  ) into v_hour from public.game_play_usage
  where user_id = auth.uid() and created_at > now() - interval '1 hour';

  select jsonb_build_object(
    'gross', coalesce(sum(gross_coins), 0)::integer,
    'cut', coalesce(sum(cut_coins), 0)::integer,
    'provider', coalesce(sum(provider_coins), 0)::integer,
    'sessions', count(distinct session_id)::integer
  ) into v_day from public.game_play_usage
  where user_id = auth.uid() and created_at > now() - interval '24 hours';

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_bygame from (
    select game_slug, count(distinct session_id)::integer as sessions,
      coalesce(sum(gross_coins), 0)::integer as gross,
      coalesce(sum(cut_coins), 0)::integer as cut,
      coalesce(sum(provider_coins), 0)::integer as provider
    from public.game_play_usage where user_id = auth.uid()
    group by game_slug order by gross desc limit 50
  ) t;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_recent from (
    select game_slug, gross_coins, cut_coins, source, created_at
    from public.game_play_usage where user_id = auth.uid()
    order by created_at desc limit 25
  ) t;

  return jsonb_build_object(
    'total', v_total, 'lastHour', v_hour, 'last24h', v_day,
    'byGame', v_bygame, 'recent', v_recent
  );
end; $$;
revoke all on function public.my_game_play_usage() from public, anon, authenticated;
grant execute on function public.my_game_play_usage() to authenticated;

-- --------------------------------------------------------------------------
-- 6. Spend view (per user + game; RLS still applies via base table).
-- --------------------------------------------------------------------------
create or replace view public.v_game_play_spend as
select
  user_id,
  game_slug,
  count(distinct session_id)::integer as sessions,
  coalesce(sum(gross_coins), 0)::integer as gross_coins,
  coalesce(sum(cut_coins), 0)::integer as cut_coins,
  coalesce(sum(provider_coins), 0)::integer as provider_coins
from public.game_play_usage
group by user_id, game_slug;
