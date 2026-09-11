-- ============================================================================
-- Family accounts: Parent supervision + Child sub-accounts (no Supabase user).
-- Fully rerunnable: IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS.
--
-- Model (two independent axes):
--   * profiles.family_role: 'solo' (default) or 'parent'. Any signed-in user
--     becomes a Parent automatically when they create their first Child.
--   * profiles.age_band: 'unknown' (default) | 'kid' | 'teen' | 'adult'.
--     A self-declared band for full accounts: 'kid'/'teen' bands get the
--     same Adults-gating as Kids Mode. Teen and Adult full accounts stay
--     full accounts — the band just separates their content rules.
--   * Child accounts live in kid_accounts (NOT auth.users, NOT profiles):
--     a parent-attested age band (kid/teen/adult — a teen or an adult can
--     still be somebody's child), a Discord-style login handle
--     `username#1234` plus a parent-chosen password (scrypt hash, verified
--     in the API route — never in SQL logs), and their own wallet.
--
-- Efficiency: children reuse the SAME metering math as adults (same rates,
-- same 25/75 split, same game_sessions/game_play_usage rows with user_id =
-- the parent so family spend stays visible in the parent's usage rollups).
-- kid_id columns attribute the child's share. One upsert per heartbeat
-- tracks the daily play budget (kid_play_days) — no new cron, no polling.
--
-- Law-first rules enforced HERE (server-side, not in the client):
--   * Children can only SPEND parent-granted wallet coins (fund_kid_wallet
--     debits the parent's own ledger, so parental budgets/consent gate every
--     cent). No checkout, no tips, no subscriptions from a child session.
--   * Parent controls per child: monthly coin cap (+ hard stop), daily play
--     minutes, and an allowed-hours window in a named timezone.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 0. Parent / Child + Kid / Teen / Adult axes on full accounts.
-- --------------------------------------------------------------------------
alter table public.profiles
  add column if not exists family_role text not null default 'solo'
  check (family_role in ('solo', 'parent'));
alter table public.profiles
  add column if not exists age_band text not null default 'unknown'
  check (age_band in ('unknown', 'kid', 'teen', 'adult'));

-- --------------------------------------------------------------------------
-- 1. Child accounts (no Supabase user) + sessions + controls + wallet + days.
-- --------------------------------------------------------------------------
create table if not exists public.kid_accounts (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  username text not null check (username ~ '^[a-z0-9_-]{3,24}$'),
  discriminator char(4) not null check (discriminator ~ '^[0-9]{4}$'),
  password_hash text not null check (char_length(password_hash) between 20 and 300),
  age_band text not null default 'kid' check (age_band in ('kid', 'teen', 'adult')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  unique (username, discriminator)
);
create index if not exists idx_kid_accounts_parent on public.kid_accounts (parent_id);

create table if not exists public.kid_sessions (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references public.kid_accounts(id) on delete cascade,
  token_hash char(64) not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  last_seen_at timestamptz not null default now()
);
create index if not exists idx_kid_sessions_kid on public.kid_sessions (kid_id);

create table if not exists public.kid_controls (
  kid_id uuid primary key references public.kid_accounts(id) on delete cascade,
  daily_minutes integer check (daily_minutes is null or (daily_minutes between 0 and 1440)),
  allowed_start time not null default time '06:00',
  allowed_end time not null default time '22:00',
  timezone text not null default 'UTC',
  monthly_cap_coins numeric(12, 2) not null default 0 check (monthly_cap_coins >= 0 and monthly_cap_coins <= 100000000),
  hard_stop boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.kid_wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references public.kid_accounts(id) on delete cascade,
  delta numeric(12, 2) not null check (delta <> 0 and delta > -100000000 and delta < 100000000),
  reason varchar(120) not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_kid_wallet_kid on public.kid_wallet_ledger (kid_id, created_at desc);

create table if not exists public.kid_play_days (
  kid_id uuid not null references public.kid_accounts(id) on delete cascade,
  day date not null default CURRENT_DATE,
  seconds integer not null default 0 check (seconds >= 0 and seconds <= 86400),
  primary key (kid_id, day)
);

-- Attribute child play inside the existing metering tables. user_id stays the
-- PARENT (NOT NULL preserved) so every existing rollup keeps working and the
-- family sees one combined spend; kid_id isolates the child's share.
alter table public.game_sessions
  add column if not exists kid_id uuid references public.kid_accounts(id) on delete set null;
create index if not exists idx_game_sessions_kid on public.game_sessions (kid_id, started_at desc);
alter table public.game_play_usage
  add column if not exists kid_id uuid references public.kid_accounts(id) on delete set null;
create index if not exists idx_game_play_usage_kid on public.game_play_usage (kid_id, created_at desc);

-- RLS: deny by default. Children have no auth.jwt, so no client policy can
-- address them — service_role + the SECURITY DEFINER RPCs below are the only
-- access path. (service_role bypasses RLS entirely.)
alter table public.kid_accounts enable row level security;
alter table public.kid_sessions enable row level security;
alter table public.kid_controls enable row level security;
alter table public.kid_wallet_ledger enable row level security;
alter table public.kid_play_days enable row level security;

-- --------------------------------------------------------------------------
-- 2. Helpers (definer; shared by the RPCs below).
-- --------------------------------------------------------------------------
create or replace function public.kid_session_owner(p_token_hash char(64))
returns uuid language sql stable security definer set search_path = public as $$
  select s.kid_id from public.kid_sessions s
  where s.token_hash = p_token_hash and s.expires_at > now()
  limit 1;
$$;

-- Is this child allowed to play RIGHT NOW (status + hours window)?
create or replace function public.kid_in_window(p_kid uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_status text; v_start time; v_end time; v_tz text; v_now time;
begin
  select k.status, c.allowed_start, c.allowed_end, c.timezone
  into v_status, v_start, v_end, v_tz
  from public.kid_accounts k left join public.kid_controls c on c.kid_id = k.id
  where k.id = p_kid;
  if not found then return false; end if;
  if v_status <> 'active' then return false; end if;
  v_start := coalesce(v_start, time '06:00');
  v_end := coalesce(v_end, time '22:00');
  v_tz := coalesce(v_tz, 'UTC');
  begin
    v_now := (now() at time zone v_tz)::time;
  exception when invalid_parameter_value then
    v_now := (now() at time zone 'UTC')::time;
  end;
  if v_start <= v_end then
    return v_now >= v_start and v_now <= v_end;
  else
    -- Overnight window (e.g. 20:00-06:00).
    return v_now >= v_start or v_now <= v_end;
  end if;
end; $$;

create or replace function public.kid_wallet_balance(p_kid uuid)
returns numeric(12, 2) language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::numeric(12, 2)
  from public.kid_wallet_ledger where kid_id = p_kid;
$$;

create or replace function public.kid_seconds_today(p_kid uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce((select seconds from public.kid_play_days where kid_id = p_kid and day = CURRENT_DATE), 0);
$$;

-- --------------------------------------------------------------------------
-- 3. Parent management RPCs (authenticated parent only).
-- --------------------------------------------------------------------------
create or replace function public.create_kid_account(p_username text, p_discriminator char(4), p_password_hash text, p_age_band text)
returns public.kid_accounts language plpgsql security definer set search_path = public as $$
declare v_name text := lower(trim(coalesce(p_username, ''))); v_row public.kid_accounts; v_n integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_name !~ '^[a-z0-9_-]{3,24}$' then raise exception 'invalid username'; end if;
  if coalesce(p_discriminator, '') !~ '^[0-9]{4}$' then raise exception 'invalid discriminator'; end if;
  if char_length(coalesce(p_password_hash, '')) < 20 then raise exception 'invalid password hash'; end if;
  if coalesce(p_age_band, '') not in ('kid', 'teen', 'adult') then raise exception 'invalid age band'; end if;
  -- Server-resource guard: at most 10 children per parent.
  select count(*) into v_n from public.kid_accounts where parent_id = auth.uid();
  if v_n >= 10 then raise exception 'child account limit reached'; end if;
  insert into public.kid_accounts (parent_id, username, discriminator, password_hash, age_band)
  values (auth.uid(), v_name, p_discriminator, p_password_hash, p_age_band)
  returning * into v_row;
  insert into public.kid_controls (kid_id) values (v_row.id) on conflict (kid_id) do nothing;
  -- First child promotes the creator to a Parent account.
  update public.profiles set family_role = 'parent' where id = auth.uid() and family_role = 'solo';
  return v_row;
exception when unique_violation then raise exception 'handle taken';
end; $$;
revoke all on function public.create_kid_account(text, char(4), text, text) from public, anon;
grant execute on function public.create_kid_account(text, char(4), text, text) to authenticated;

create or replace function public.set_kid_controls(
  p_kid uuid, p_daily_minutes integer, p_start time, p_end time, p_tz text,
  p_cap numeric, p_hard_stop boolean, p_age_band text, p_status text)
returns public.kid_controls language plpgsql security definer set search_path = public as $$
declare v_row public.kid_controls;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not exists (select 1 from public.kid_accounts where id = p_kid and parent_id = auth.uid()) then
    raise exception 'not your child account';
  end if;
  if p_daily_minutes is not null and (p_daily_minutes < 0 or p_daily_minutes > 1440) then
    raise exception 'daily minutes must be 0..1440';
  end if;
  if p_cap is not null and (p_cap < 0 or p_cap > 100000000) then raise exception 'invalid budget cap'; end if;
  if p_tz is not null and not exists (select 1 from pg_timezone_names where name = p_tz) then
    raise exception 'unknown timezone';
  end if;
  if p_age_band is not null and p_age_band not in ('kid', 'teen', 'adult') then
    raise exception 'invalid age band';
  end if;
  if p_status is not null and p_status not in ('active', 'suspended') then
    raise exception 'invalid status';
  end if;
  insert into public.kid_controls (kid_id, daily_minutes, allowed_start, allowed_end, timezone, monthly_cap_coins, hard_stop, updated_at)
  values (p_kid,
    p_daily_minutes,
    coalesce(p_start, time '06:00'), coalesce(p_end, time '22:00'), coalesce(p_tz, 'UTC'),
    coalesce(p_cap, 0), coalesce(p_hard_stop, false), now())
  on conflict (kid_id) do update set
    daily_minutes = case when p_daily_minutes is null and excluded.daily_minutes is null then public.kid_controls.daily_minutes else excluded.daily_minutes end,
    allowed_start = excluded.allowed_start, allowed_end = excluded.allowed_end,
    timezone = excluded.timezone, monthly_cap_coins = excluded.monthly_cap_coins,
    hard_stop = excluded.hard_stop, updated_at = now()
  returning * into v_row;
  -- NOTE: NULL daily_minutes means "leave unchanged" here; the API sends the
  -- full control set, and a dedicated clear uses -1 (mapped below).
  if p_daily_minutes = -1 then
    update public.kid_controls set daily_minutes = null, updated_at = now() where kid_id = p_kid returning * into v_row;
  end if;
  if p_age_band is not null then
    update public.kid_accounts set age_band = p_age_band where id = p_kid;
  end if;
  if p_status is not null then
    update public.kid_accounts set status = p_status where id = p_kid;
  end if;
  return v_row;
end; $$;
revoke all on function public.set_kid_controls(uuid, integer, time, time, text, numeric, boolean, text, text) from public, anon;
grant execute on function public.set_kid_controls(uuid, integer, time, time, text, numeric, boolean, text, text) to authenticated;

create or replace function public.set_kid_password(p_kid uuid, p_password_hash text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if char_length(coalesce(p_password_hash, '')) < 20 then raise exception 'invalid password hash'; end if;
  update public.kid_accounts set password_hash = p_password_hash where id = p_kid and parent_id = auth.uid();
  if not found then raise exception 'not your child account'; end if;
  -- Rotating the password kills every live session on shared devices.
  delete from public.kid_sessions where kid_id = p_kid;
  return true;
end; $$;
revoke all on function public.set_kid_password(uuid, text) from public, anon;
grant execute on function public.set_kid_password(uuid, text) to authenticated;

-- Move parent coins into the child's wallet (atomic; the parent debit flows
-- through the normal personal-budget + lot triggers, so parental consent and
-- caps gate every cent). Children can only ever spend what a parent granted.
create or replace function public.fund_kid_wallet(p_kid uuid, p_coins numeric)
returns numeric(12, 2) language plpgsql security definer set search_path = public as $$
declare v_parent uuid; v_bal numeric(12, 2);
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select parent_id into v_parent from public.kid_accounts where id = p_kid;
  if not found or v_parent <> auth.uid() then raise exception 'not your child account'; end if;
  if p_coins is null or p_coins <= 0 or p_coins > 100000 then raise exception 'invalid amount'; end if;
  select coalesce(sum(remaining_coins) filter (where expires_at > now()), 0)::numeric(12, 2)
  into v_bal from public.coin_lots where user_id = auth.uid();
  if v_bal < p_coins then raise exception 'insufficient balance'; end if;
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -p_coins, 'Fund child wallet');
  insert into public.kid_wallet_ledger (kid_id, delta, reason)
  values (p_kid, p_coins, 'Parent funding');
  return public.kid_wallet_balance(p_kid);
end; $$;
revoke all on function public.fund_kid_wallet(uuid, numeric) from public, anon;
grant execute on function public.fund_kid_wallet(uuid, numeric) to authenticated;

-- Close a child account: refund the remaining wallet to the parent, then the
-- row (sessions/controls/ledger/days cascade). Export first via /my/rights.
create or replace function public.close_kid_account(p_kid uuid)
returns numeric(12, 2) language plpgsql security definer set search_path = public as $$
declare v_bal numeric(12, 2);
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not exists (select 1 from public.kid_accounts where id = p_kid and parent_id = auth.uid()) then
    raise exception 'not your child account';
  end if;
  v_bal := public.kid_wallet_balance(p_kid);
  if v_bal > 0 then
    insert into public.coin_ledger (user_id, delta, reason)
    values (auth.uid(), v_bal, 'Child account closed — refund');
  end if;
  delete from public.kid_accounts where id = p_kid;
  return coalesce(v_bal, 0);
end; $$;
revoke all on function public.close_kid_account(uuid) from public, anon;
grant execute on function public.close_kid_account(uuid) to authenticated;

-- --------------------------------------------------------------------------
-- 4. Child play RPCs. The child proves its session TOKEN on every call
--    (kids have no auth.jwt) — the RPC re-validates token, status, hours
--    window, daily minutes, monthly cap, and wallet, all in one round trip.
--    p_min_age is computed by the API route from the server catalog (0/13/18):
--    kid band plays kids titles, teen band adds teens, adult band (parent
--    attested) plays everything — no DOB is ever asked of or stored for kids.
-- --------------------------------------------------------------------------
create or replace function public.start_kid_session(
  p_kid uuid, p_token_hash char(64), p_game text, p_version text, p_new_bytes integer, p_min_age integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid; v_band text; v_parent uuid;
  v_game text; v_version text; v_bytes integer;
  v_load integer := 1; v_hour integer := 1; v_dev uuid;
  v_free boolean := false; v_fee numeric(12, 2) := 0;
  v_cut numeric(12, 2) := 0; v_provider numeric(12, 2) := 0;
  v_capped integer; v_fee_cc integer; v_fee_split record; v_session public.game_sessions;
  v_bal numeric(12, 2); v_cap numeric(12, 2); v_stop boolean; v_spent numeric(12, 2);
  v_limit integer; v_used integer;
begin
  select public.kid_session_owner(p_token_hash) into v_owner;
  if v_owner is null or v_owner <> p_kid then raise exception 'session expired'; end if;
  update public.kid_sessions set last_seen_at = now() where token_hash = p_token_hash;
  select age_band, parent_id into v_band, v_parent from public.kid_accounts where id = p_kid;
  if v_band is null then raise exception 'unknown child account'; end if;
  -- Rating band (parent-attested at creation): kid=0+, teen=13+, adult=18+.
  if (v_band = 'kid' and p_min_age > 0) or (v_band = 'teen' and p_min_age > 13) then
    raise exception 'rating blocked for this child account';
  end if;
  if not public.kid_in_window(p_kid) then raise exception 'outside allowed play hours'; end if;
  select daily_minutes into v_limit from public.kid_controls where kid_id = p_kid;
  v_used := public.kid_seconds_today(p_kid);
  if v_limit is not null and v_used >= v_limit * 60 then raise exception 'daily time limit reached'; end if;

  v_game := lower(trim(coalesce(p_game, '')));
  if v_game !~ '^[a-z0-9-]{1,64}$' then raise exception 'invalid game'; end if;
  v_version := trim(coalesce(nullif(p_version, ''), '1'));
  if v_version !~ '^[A-Za-z0-9._-]{1,32}$' then raise exception 'invalid version'; end if;
  v_bytes := coalesce(p_new_bytes, 0);
  if v_bytes < 0 or v_bytes > 1073741824 then raise exception 'invalid bytes'; end if;

  select r.coins_per_load, r.coins_per_hour, r.dev_user_id into v_load, v_hour, v_dev
  from public.game_rates r where r.game_slug = v_game;
  if not found then v_load := 1; v_hour := 1; v_dev := null; end if;

  if v_bytes <= 0 then
    v_free := true;
  elsif exists (
    select 1 from public.game_sessions s
    where s.kid_id = p_kid and s.game_slug = v_game
      and s.bundle_version = v_version and s.free_load = false
      and s.started_at > now() - interval '24 hours'
  ) then
    v_free := true;
  end if;

  if v_free then
    v_fee := 0;
  elsif v_load <= 0 then
    v_fee := 0;
  else
    v_capped := least(v_bytes, 1048576);
    v_fee_cc := round((v_load * 100.0 * v_capped) / 1048576.0)::integer;
    v_fee_cc := greatest(1, v_fee_cc);
    v_fee := (v_fee_cc::numeric(12, 2)) / 100.0;
  end if;

  -- Monthly cap (cap = 0 or hard_stop = false means monitoring only).
  select monthly_cap_coins, hard_stop into v_cap, v_stop from public.kid_controls where kid_id = p_kid;
  if coalesce(v_stop, false) and coalesce(v_cap, 0) > 0 and v_fee > 0 then
    select coalesce(sum(-delta), 0) into v_spent from public.kid_wallet_ledger
    where kid_id = p_kid and delta < 0 and created_at >= date_trunc('month', now());
    if v_spent + v_fee > v_cap then raise exception 'monthly budget cap reached'; end if;
  end if;

  insert into public.game_sessions (user_id, kid_id, game_slug, bundle_version, new_bytes, load_fee, load_cut, free_load)
  values (v_parent, p_kid, v_game, v_version, v_bytes, v_fee, v_cut, v_free)
  returning * into v_session;

  if v_fee > 0 then
    v_bal := public.kid_wallet_balance(p_kid);
    if v_bal < v_fee then
      raise exception 'insufficient balance: need % coins, have %', v_fee, v_bal;
    end if;
    select * into v_fee_split from public.game_ai_compute_split_numeric(v_fee);
    v_cut := v_fee_split.cut; v_provider := v_fee_split.provider;
    update public.game_sessions set load_cut = v_cut where id = v_session.id;
    insert into public.kid_wallet_ledger (kid_id, delta, reason)
    values (p_kid, -v_fee, substr('Play ' || v_game || ' (load)', 1, 120));
    insert into public.game_play_usage (session_id, user_id, kid_id, game_slug, active_seconds, gross_coins, cut_coins, provider_coins, dev_user_id, source)
    values (v_session.id, v_parent, p_kid, v_game, 0, v_fee, v_cut, v_provider, v_dev, 'load');
  end if;

  return jsonb_build_object(
    'session_id', v_session.id,
    'load_fee', v_fee, 'load_cut', v_cut, 'free_load', v_free,
    'coins_per_load', v_load, 'coins_per_hour', v_hour
  );
end; $$;
revoke all on function public.start_kid_session(uuid, char(64), text, text, integer, integer) from public, anon;
grant execute on function public.start_kid_session(uuid, char(64), text, text, integer, integer) to anon, authenticated;

create or replace function public.heartbeat_kid_session(p_kid uuid, p_token_hash char(64), p_session uuid, p_seconds integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid; v_session public.game_sessions; v_parent uuid;
  v_hour integer := 1; v_dev uuid;
  v_total integer; v_owed numeric(12, 2); v_delta numeric(12, 2);
  v_cut numeric(12, 2) := 0; v_provider numeric(12, 2) := 0;
  v_bal numeric(12, 2); v_fee_split record;
  v_cap numeric(12, 2); v_stop boolean; v_spent numeric(12, 2);
  v_limit integer; v_used integer;
begin
  select public.kid_session_owner(p_token_hash) into v_owner;
  if v_owner is null or v_owner <> p_kid then raise exception 'session expired'; end if;
  if p_seconds is null or p_seconds < 1 or p_seconds > 3600 then raise exception 'seconds must be 1..3600'; end if;
  if not public.kid_in_window(p_kid) then raise exception 'outside allowed play hours'; end if;
  -- Daily minutes are consumed here (authoritative): block the beat that
  -- would cross the line, so a child can never overrun by more than a beat.
  select daily_minutes into v_limit from public.kid_controls where kid_id = p_kid;
  v_used := public.kid_seconds_today(p_kid);
  if v_limit is not null and v_used + p_seconds > v_limit * 60 then
    raise exception 'daily time limit reached';
  end if;

  select * into v_session from public.game_sessions where id = p_session and kid_id = p_kid for update;
  if not found then raise exception 'session not found'; end if;
  if v_session.status <> 'open' then raise exception 'session is not open'; end if;
  v_parent := v_session.user_id;

  select r.coins_per_hour, r.dev_user_id into v_hour, v_dev
  from public.game_rates r where r.game_slug = v_session.game_slug;
  if not found then v_hour := 1; v_dev := null; end if;

  v_total := v_session.active_seconds + p_seconds;
  if v_hour <= 0 then
    v_owed := 0;
  else
    v_owed := round((v_hour * 100.0 * v_total) / 3600.0)::numeric(12, 2) / 100.0;
  end if;
  v_delta := greatest(0::numeric(12, 2), v_owed - coalesce(v_session.billed_hourly, 0));

  select monthly_cap_coins, hard_stop into v_cap, v_stop from public.kid_controls where kid_id = p_kid;
  if coalesce(v_stop, false) and coalesce(v_cap, 0) > 0 and v_delta > 0 then
    select coalesce(sum(-delta), 0) into v_spent from public.kid_wallet_ledger
    where kid_id = p_kid and delta < 0 and created_at >= date_trunc('month', now());
    if v_spent + v_delta > v_cap then raise exception 'monthly budget cap reached'; end if;
  end if;

  if v_delta > 0 then
    v_bal := public.kid_wallet_balance(p_kid);
    if v_bal < v_delta then
      raise exception 'insufficient balance: need % coins, have %', v_delta, v_bal;
    end if;
    select * into v_fee_split from public.game_ai_compute_split_numeric(v_delta);
    v_cut := v_fee_split.cut; v_provider := v_fee_split.provider;
    insert into public.kid_wallet_ledger (kid_id, delta, reason)
    values (p_kid, -v_delta, substr('Play ' || v_session.game_slug || ' (playtime)', 1, 120));
    insert into public.game_play_usage (session_id, user_id, kid_id, game_slug, active_seconds, gross_coins, cut_coins, provider_coins, dev_user_id, source)
    values (p_session, v_parent, p_kid, v_session.game_slug, v_total, v_delta, v_cut, v_provider, v_dev, 'heartbeat');
  end if;

  update public.game_sessions
  set active_seconds = v_total, billed_hourly = coalesce(v_session.billed_hourly, 0) + v_delta
  where id = p_session;
  insert into public.kid_play_days (kid_id, day, seconds)
  values (p_kid, CURRENT_DATE, p_seconds)
  on conflict (kid_id, day) do update set seconds = public.kid_play_days.seconds + excluded.seconds;

  return jsonb_build_object(
    'active_seconds', v_total,
    'billed_hourly', coalesce(v_session.billed_hourly, 0) + v_delta,
    'charged', v_delta
  );
end; $$;
revoke all on function public.heartbeat_kid_session(uuid, char(64), uuid, integer) from public, anon;
grant execute on function public.heartbeat_kid_session(uuid, char(64), uuid, integer) to anon, authenticated;

create or replace function public.end_kid_session(p_kid uuid, p_token_hash char(64), p_session uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select public.kid_session_owner(p_token_hash) into v_owner;
  if v_owner is null or v_owner <> p_kid then raise exception 'session expired'; end if;
  update public.game_sessions set status = 'ended', ended_at = now()
  where id = p_session and kid_id = p_kid and status = 'open';
  return jsonb_build_object('ended', found);
end; $$;
revoke all on function public.end_kid_session(uuid, char(64), uuid) from public, anon;
grant execute on function public.end_kid_session(uuid, char(64), uuid) to anon, authenticated;
