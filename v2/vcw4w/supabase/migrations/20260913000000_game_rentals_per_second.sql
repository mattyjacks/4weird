-- ============================================================================
-- Game rentals, per-second billing — proportional load + per-second running.
-- Fully rerunnable: IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS.
--
-- Model (mirrors lib/game-rent.ts):
--   * Rates stay whole coins 0..100 quoted in "per hour" terms
--     (coins_per_load = price for 1 MiB of fresh bytes, coins_per_hour =
--     price per hour of play). Developers may set up to 100 (0 = free).
--   * First load: proportional to FRESH bytes, capped at 1 MiB:
--       load_fee = round(load_rate * 100 * least(new_bytes, 1MiB) / 1MiB) / 100
--     Integer-centicentcoin math, so no float drift. 0 bytes = 0; any
--     positive load on a priced game costs at least 1 centicentcoin (0.01).
--     Same bundle version billed in the last 24h is still free (refresh
--     protection). The old "< 1 MiB free" rule is gone.
--   * Running play: per second from the FIRST second (no included hour):
--       owed = round(hourly_rate * 100 * total_active_seconds / 3600) / 100
--     Default 1 coin/hr = exactly 100 centicentcoins over 60*60 seconds.
--     Heartbeats debit only the delta since the last beat (row lock kept).
--   * Every gross splits 25/75 via game_ai_compute_split_numeric(), so
--     cut + provider ALWAYS equals gross (CHECK constraint kept).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 0. Numeric 25/75 split (idempotent; also defined in the fractional-coins
--    migration — repeated here so this file is safe to run on its own).
-- --------------------------------------------------------------------------
create or replace function public.game_ai_compute_split_numeric(p_gross numeric)
returns table(gross numeric, cut numeric, provider numeric)
language plpgsql immutable set search_path = public as $$
begin
  if p_gross is null or p_gross < 0 then raise exception 'invalid gross'; end if;
  gross := round(p_gross, 2);
  cut := round(p_gross * 25 / 100.0, 2);
  provider := gross - cut;
  return next;
end; $$;
grant execute on function public.game_ai_compute_split_numeric(numeric) to authenticated;

-- --------------------------------------------------------------------------
-- 1. Widen integer coin columns to numeric(12, 2) (centicentcoin resolution).
-- --------------------------------------------------------------------------
alter table public.game_sessions
  alter column load_fee type numeric(12, 2) using load_fee::numeric(12, 2),
  alter column load_cut type numeric(12, 2) using load_cut::numeric(12, 2),
  alter column billed_hourly type numeric(12, 2) using billed_hourly::numeric(12, 2);

alter table public.game_sessions drop constraint if exists game_sessions_load_fee_check;
alter table public.game_sessions
  add constraint game_sessions_load_fee_check
  check (load_fee >= 0 and load_fee <= 1000000);
alter table public.game_sessions drop constraint if exists game_sessions_load_cut_check;
alter table public.game_sessions
  add constraint game_sessions_load_cut_check
  check (load_cut >= 0 and load_cut <= 1000000);
alter table public.game_sessions drop constraint if exists game_sessions_billed_hourly_check;
alter table public.game_sessions
  add constraint game_sessions_billed_hourly_check
  check (billed_hourly >= 0 and billed_hourly <= 1000000);

drop view if exists public.v_game_play_spend;

alter table public.game_play_usage
  alter column gross_coins type numeric(12, 2) using gross_coins::numeric(12, 2),
  alter column cut_coins type numeric(12, 2) using cut_coins::numeric(12, 2),
  alter column provider_coins type numeric(12, 2) using provider_coins::numeric(12, 2);

alter table public.game_play_usage drop constraint if exists game_play_usage_gross_coins_check;
alter table public.game_play_usage
  add constraint game_play_usage_gross_coins_check
  check (gross_coins >= 0 and gross_coins <= 1000000);
alter table public.game_play_usage drop constraint if exists game_play_usage_cut_coins_check;
alter table public.game_play_usage
  add constraint game_play_usage_cut_coins_check
  check (cut_coins >= 0 and cut_coins <= 1000000);
alter table public.game_play_usage drop constraint if exists game_play_usage_provider_coins_check;
alter table public.game_play_usage
  add constraint game_play_usage_provider_coins_check
  check (provider_coins >= 0 and provider_coins <= 1000000);

create or replace view public.v_game_play_spend as
select
  user_id,
  game_slug,
  count(distinct session_id)::integer as sessions,
  coalesce(sum(gross_coins), 0)::numeric(12, 2) as gross_coins,
  coalesce(sum(cut_coins), 0)::numeric(12, 2) as cut_coins,
  coalesce(sum(provider_coins), 0)::numeric(12, 2) as provider_coins
from public.game_play_usage
group by user_id, game_slug;

-- --------------------------------------------------------------------------
-- 2. start_game_session: proportional load fee (per-second era).
-- --------------------------------------------------------------------------
create or replace function public.start_game_session(p_game text, p_version text, p_new_bytes integer)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_game text; v_version text; v_bytes integer;
  v_load integer := 1; v_hour integer := 1; v_dev uuid;
  v_free boolean := false; v_fee numeric(12, 2) := 0;
  v_cut numeric(12, 2) := 0; v_provider numeric(12, 2) := 0;
  v_capped integer; v_fee_cc integer;
  v_bal numeric(12, 2); v_fee_split record; v_session public.game_sessions;
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

  -- Same bundle version billed in the last 24h is free (refresh protection).
  -- Zero-byte loads are free. Everything else pays the proportional fee.
  if v_bytes <= 0 then
    v_free := true;
  elsif exists (
    select 1 from public.game_sessions s
    where s.user_id = auth.uid() and s.game_slug = v_game
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
    -- Proportional to fresh bytes, capped at 1 MiB = full load rate.
    -- Integer-centicentcoin math: round(rate_cc * capped / 1MiB), min 1cc.
    v_capped := least(v_bytes, 1048576);
    v_fee_cc := round((v_load * 100.0 * v_capped) / 1048576.0)::integer;
    v_fee_cc := greatest(1, v_fee_cc);
    v_fee := (v_fee_cc::numeric(12, 2)) / 100.0;
  end if;

  -- Parent first: game_play_usage.session_id references game_sessions(id),
  -- so the session row must exist before any child row. (One function = one
  -- transaction either way, so this ordering loses no atomicity.)
  insert into public.game_sessions (user_id, game_slug, bundle_version, new_bytes, load_fee, load_cut, free_load)
  values (auth.uid(), v_game, v_version, v_bytes, v_fee, v_cut, v_free)
  returning * into v_session;

  if v_fee > 0 then
    select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
    from public.coin_ledger where user_id = auth.uid();
    if v_bal < v_fee then
      raise exception 'insufficient balance: need % coins, have %', v_fee, v_bal;
    end if;
    select * into v_fee_split from public.game_ai_compute_split_numeric(v_fee);
    v_cut := v_fee_split.cut; v_provider := v_fee_split.provider;
    -- Keep the session's recorded cut in sync with the final split.
    update public.game_sessions set load_cut = v_cut where id = v_session.id;
    insert into public.coin_ledger (user_id, delta, reason)
    values (auth.uid(), -v_fee, substr('Play ' || v_game || ' (load)', 1, 120));
    insert into public.game_play_usage (session_id, user_id, game_slug, active_seconds, gross_coins, cut_coins, provider_coins, dev_user_id, source)
    values (v_session.id, auth.uid(), v_game, 0, v_fee, v_cut, v_provider, v_dev, 'load');
  end if;

  return jsonb_build_object(
    'session_id', v_session.id,
    'load_fee', v_fee, 'load_cut', v_cut, 'free_load', v_free,
    'coins_per_load', v_load, 'coins_per_hour', v_hour
  );
end; $$;
revoke all on function public.start_game_session(text, text, integer) from public, anon, authenticated;
grant execute on function public.start_game_session(text, text, integer) to authenticated;

-- --------------------------------------------------------------------------
-- 3. heartbeat_game_session: per-second running ledger (no included hour).
--    owed = round(rate * 100 * total_seconds / 3600) / 100; delta debited.
-- --------------------------------------------------------------------------
create or replace function public.heartbeat_game_session(p_session uuid, p_seconds integer)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_session public.game_sessions;
  v_hour integer := 1; v_dev uuid;
  v_total integer; v_owed numeric(12, 2); v_delta numeric(12, 2);
  v_cut numeric(12, 2) := 0; v_provider numeric(12, 2) := 0;
  v_bal numeric(12, 2); v_fee_split record;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_seconds is null or p_seconds < 1 or p_seconds > 3600 then raise exception 'seconds must be 1..3600'; end if;
  -- Lock the session row: concurrent beats (client retries, two tabs) must
  -- serialize on billed_hourly, or both read the same counter and double-bill.
  select * into v_session from public.game_sessions where id = p_session and user_id = auth.uid() for update;
  if not found then raise exception 'session not found'; end if;
  if v_session.status <> 'open' then raise exception 'session is not open'; end if;

  select r.coins_per_hour, r.dev_user_id into v_hour, v_dev
  from public.game_rates r where r.game_slug = v_session.game_slug;
  if not found then v_hour := 1; v_dev := null; end if;

  v_total := v_session.active_seconds + p_seconds;
  -- Per-second ledger from the first second: 1 coin/hr = 100cc / 3600s.
  if v_hour <= 0 then
    v_owed := 0;
  else
    v_owed := round((v_hour * 100.0 * v_total) / 3600.0)::numeric(12, 2) / 100.0;
  end if;
  v_delta := greatest(0::numeric(12, 2), v_owed - coalesce(v_session.billed_hourly, 0));

  if v_delta > 0 then
    select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
    from public.coin_ledger where user_id = auth.uid();
    if v_bal < v_delta then
      raise exception 'insufficient balance: need % coins, have %', v_delta, v_bal;
    end if;
    select * into v_fee_split from public.game_ai_compute_split_numeric(v_delta);
    v_cut := v_fee_split.cut; v_provider := v_fee_split.provider;
    insert into public.coin_ledger (user_id, delta, reason)
    values (auth.uid(), -v_delta, substr('Play ' || v_session.game_slug || ' (playtime)', 1, 120));
    insert into public.game_play_usage (session_id, user_id, game_slug, active_seconds, gross_coins, cut_coins, provider_coins, dev_user_id, source)
    values (p_session, auth.uid(), v_session.game_slug, v_total, v_delta, v_cut, v_provider, v_dev, 'heartbeat');
  end if;

  update public.game_sessions
  set active_seconds = v_total, billed_hourly = coalesce(v_session.billed_hourly, 0) + v_delta
  where id = p_session;

  return jsonb_build_object(
    'active_seconds', v_total,
    'billed_hourly', coalesce(v_session.billed_hourly, 0) + v_delta,
    'charged', v_delta
  );
end; $$;
revoke all on function public.heartbeat_game_session(uuid, integer) from public, anon, authenticated;
grant execute on function public.heartbeat_game_session(uuid, integer) to authenticated;

-- --------------------------------------------------------------------------
-- 4. my_game_play_usage: numeric rollup (loads + per-second heartbeats).
-- --------------------------------------------------------------------------
create or replace function public.my_game_play_usage()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_total jsonb; v_hour jsonb; v_day jsonb; v_bygame jsonb; v_recent jsonb;
begin
  if auth.uid() is null then raise exception 'login required'; end if;

  select jsonb_build_object(
    'gross', coalesce(sum(gross_coins), 0)::numeric(12, 2),
    'cut', coalesce(sum(cut_coins), 0)::numeric(12, 2),
    'provider', coalesce(sum(provider_coins), 0)::numeric(12, 2),
    'sessions', count(distinct session_id)::integer
  ) into v_total from public.game_play_usage where user_id = auth.uid();

  select jsonb_build_object(
    'gross', coalesce(sum(gross_coins), 0)::numeric(12, 2),
    'cut', coalesce(sum(cut_coins), 0)::numeric(12, 2),
    'provider', coalesce(sum(provider_coins), 0)::numeric(12, 2),
    'sessions', count(distinct session_id)::integer
  ) into v_hour from public.game_play_usage
  where user_id = auth.uid() and created_at > now() - interval '1 hour';

  select jsonb_build_object(
    'gross', coalesce(sum(gross_coins), 0)::numeric(12, 2),
    'cut', coalesce(sum(cut_coins), 0)::numeric(12, 2),
    'provider', coalesce(sum(provider_coins), 0)::numeric(12, 2),
    'sessions', count(distinct session_id)::integer
  ) into v_day from public.game_play_usage
  where user_id = auth.uid() and created_at > now() - interval '24 hours';

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_bygame from (
    select game_slug, count(distinct session_id)::integer as sessions,
      coalesce(sum(gross_coins), 0)::numeric(12, 2) as gross,
      coalesce(sum(cut_coins), 0)::numeric(12, 2) as cut,
      coalesce(sum(provider_coins), 0)::numeric(12, 2) as provider
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
