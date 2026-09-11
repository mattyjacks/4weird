-- ============================================================================
-- NewGamePlus metering + game-load visibility.
-- Fully rerunnable (IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS).
--
-- 1. NewGamePlus builds were never charged: POST /api/newgameplus/build
--    computed plan.spend (estimate capped by budget) but debited nothing, so
--    builds left no coin_ledger row and never appeared in /my/usage. This
--    adds the meter ledger (newgameplus_builds, 25% cut INCLUDED per row) +
--    guarded meter RPCs (auth.uid session + service-only `_for` twin) + the
--    my_newgameplus_spend() rollup for /my/usage. Money moves only here.
-- 2. Free game loads were invisible: start_game_session / start_kid_session
--    inserted NO game_play_usage row when the load fee was 0 (cached replay
--    within 24h, 0 bytes, or a free game), so the load never appeared in
--    coin history or usage. Both now record a 0-gross 'load' row so every
--    load is tracked (sessions count + recent list); paid math is untouched.
-- 3. Hours played were unsummarized: my_game_play_usage() now also returns
--    active seconds from game_sessions (totals + per game) so /my/usage can
--    show real hours played, including unmetered-by-coin free sessions.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. NewGamePlus build ledger (25% cut INCLUDED, attributed per row).
-- --------------------------------------------------------------------------
create table if not exists public.newgameplus_builds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  submission_id uuid null references public.code_submissions(id) on delete set null,
  slug text not null check (char_length(slug) between 1 and 64),
  title text not null check (char_length(title) between 1 and 120),
  quality integer not null check (quality >= 0 and quality <= 10),
  budget integer not null check (budget >= 1 and budget <= 10000),
  spend numeric(12,2) not null check (spend >= 0.01),
  cut numeric(12,2) not null check (cut >= 0),
  lane text not null check (lane in ('fast','deluxe')),
  created_at timestamptz not null default now()
);
create index if not exists idx_newgameplus_builds_user
  on public.newgameplus_builds (user_id, created_at desc);

alter table public.newgameplus_builds enable row level security;
revoke all on public.newgameplus_builds from anon, authenticated;

-- --------------------------------------------------------------------------
-- 2. Meter RPCs (guarded; whole-coin debits via coin_ledger with a balance
--    guard, exactly like meter_submission_charge. 25% cut INCLUDED.)
-- --------------------------------------------------------------------------
create or replace function public.meter_newgameplus_build(
  p_submission uuid, p_slug text, p_title text,
  p_quality integer, p_budget integer, p_spend numeric, p_lane text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_gross numeric(12,2); v_cut numeric(12,2); v_bal numeric(12,2);
declare v_slug text; v_title text;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  perform public.coin_spend_lock(auth.uid());
  v_slug := lower(trim(coalesce(p_slug, '')));
  if v_slug !~ '^[a-z0-9-]{1,64}$' then raise exception 'invalid slug'; end if;
  v_title := trim(coalesce(p_title, ''));
  if char_length(v_title) < 1 or char_length(v_title) > 120 then raise exception 'invalid title'; end if;
  if p_quality is null or p_quality < 0 or p_quality > 10 then raise exception 'invalid quality'; end if;
  if p_budget is null or p_budget < 1 or p_budget > 10000 then raise exception 'invalid budget'; end if;
  if p_lane not in ('fast','deluxe') then raise exception 'invalid lane'; end if;
  v_gross := round(coalesce(p_spend, 0), 2);
  if v_gross < 0.01 then raise exception 'invalid spend'; end if;
  v_cut := round(v_gross * 25 / 100.0, 2);
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
    from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_gross then
    raise exception 'insufficient balance: need % coins, have %', v_gross, v_bal;
  end if;
  insert into public.newgameplus_builds (user_id, submission_id, slug, title, quality, budget, spend, cut, lane)
  values (auth.uid(), p_submission, v_slug, v_title, p_quality, p_budget, v_gross, v_cut, p_lane)
  returning id into v_id;
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_gross,
    substr('NewGamePlus ' || v_slug || ' (q' || p_quality::text || ')', 1, 120));
  return jsonb_build_object('id', v_id, 'gross', v_gross, 'cut', v_cut, 'provider', v_gross - v_cut);
end; $$;
revoke all on function public.meter_newgameplus_build(uuid, text, text, integer, integer, numeric, text) from public, anon;
grant execute on function public.meter_newgameplus_build(uuid, text, text, integer, integer, numeric, text) to authenticated;

-- Service-only twin for future server-side builds (no session): same math +
-- balance guard, explicit user. Only the service_role key can call it.
create or replace function public.meter_newgameplus_build_for(
  p_user uuid, p_submission uuid, p_slug text, p_title text,
  p_quality integer, p_budget integer, p_spend numeric, p_lane text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_gross numeric(12,2); v_cut numeric(12,2); v_bal numeric(12,2);
declare v_slug text; v_title text;
begin
  if p_user is null then raise exception 'login required'; end if;
  perform public.coin_spend_lock(p_user);
  v_slug := lower(trim(coalesce(p_slug, '')));
  if v_slug !~ '^[a-z0-9-]{1,64}$' then raise exception 'invalid slug'; end if;
  v_title := trim(coalesce(p_title, ''));
  if char_length(v_title) < 1 or char_length(v_title) > 120 then raise exception 'invalid title'; end if;
  if p_quality is null or p_quality < 0 or p_quality > 10 then raise exception 'invalid quality'; end if;
  if p_budget is null or p_budget < 1 or p_budget > 10000 then raise exception 'invalid budget'; end if;
  if p_lane not in ('fast','deluxe') then raise exception 'invalid lane'; end if;
  v_gross := round(coalesce(p_spend, 0), 2);
  if v_gross < 0.01 then raise exception 'invalid spend'; end if;
  v_cut := round(v_gross * 25 / 100.0, 2);
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
    from public.coin_ledger where user_id = p_user;
  if v_bal < v_gross then
    raise exception 'insufficient balance: need % coins, have %', v_gross, v_bal;
  end if;
  insert into public.newgameplus_builds (user_id, submission_id, slug, title, quality, budget, spend, cut, lane)
  values (p_user, p_submission, v_slug, v_title, p_quality, p_budget, v_gross, v_cut, p_lane)
  returning id into v_id;
  insert into public.coin_ledger (user_id, delta, reason)
  values (p_user, -v_gross,
    substr('NewGamePlus ' || v_slug || ' (q' || p_quality::text || ')', 1, 120));
  return jsonb_build_object('id', v_id, 'gross', v_gross, 'cut', v_cut, 'provider', v_gross - v_cut);
end; $$;
revoke all on function public.meter_newgameplus_build_for(uuid, uuid, text, text, integer, integer, numeric, text) from public, anon, authenticated;

create or replace function public.my_newgameplus_spend()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_gross numeric := 0; v_cut numeric := 0; v_n integer := 0;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select coalesce(sum(spend),0), coalesce(sum(cut),0), count(*)
    into v_gross, v_cut, v_n from public.newgameplus_builds where user_id = auth.uid();
  return jsonb_build_object('gross', v_gross, 'cut', v_cut,
    'provider', round(v_gross - v_cut, 2), 'turns', v_n);
end; $$;
revoke all on function public.my_newgameplus_spend() from public, anon;
grant execute on function public.my_newgameplus_spend() to authenticated;

-- --------------------------------------------------------------------------
-- 3. Free game loads leave a 0-gross 'load' row (paid math untouched).
--    Full-body OR REPLACE of start_game_session (per-second era) + the one
--    added ELSE branch at the end.
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
  else
    -- Free loads are tracked, not billed: a 0-gross row keeps the load in
    -- the sessions count + recent list (coin history stays clean: no debit).
    insert into public.game_play_usage (session_id, user_id, game_slug, active_seconds, gross_coins, cut_coins, provider_coins, dev_user_id, source)
    values (v_session.id, auth.uid(), v_game, 0, 0, 0, 0, v_dev, 'load');
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
-- 4. Same free-load tracking for child sessions (kid wallet ledger untouched:
--    free loads debit nothing, they just record the load).
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
  else
    -- Free loads are tracked, not billed.
    insert into public.game_play_usage (session_id, user_id, kid_id, game_slug, active_seconds, gross_coins, cut_coins, provider_coins, dev_user_id, source)
    values (v_session.id, v_parent, p_kid, v_game, 0, 0, 0, 0, v_dev, 'load');
  end if;

  return jsonb_build_object(
    'session_id', v_session.id,
    'load_fee', v_fee, 'load_cut', v_cut, 'free_load', v_free,
    'coins_per_load', v_load, 'coins_per_hour', v_hour
  );
end; $$;
revoke all on function public.start_kid_session(uuid, char(64), text, text, integer, integer) from public, anon;
grant execute on function public.start_kid_session(uuid, char(64), text, text, integer, integer) to anon, authenticated;

-- --------------------------------------------------------------------------
-- 5. my_game_play_usage: same coin rollup + active seconds/hours from
--    game_sessions (kid rows carry user_id = parent, so family rollups keep
--    working). New keys only; every old key is byte-identical.
-- --------------------------------------------------------------------------
create or replace function public.my_game_play_usage()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_total jsonb; v_hour jsonb; v_day jsonb; v_bygame jsonb; v_recent jsonb;
declare v_sec_total integer; v_sec_hour integer; v_sec_day integer;
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
    select u.game_slug, count(distinct u.session_id)::integer as sessions,
      coalesce(sum(u.gross_coins), 0)::numeric(12, 2) as gross,
      coalesce(sum(u.cut_coins), 0)::numeric(12, 2) as cut,
      coalesce(sum(u.provider_coins), 0)::numeric(12, 2) as provider,
      coalesce((select sum(s.active_seconds) from public.game_sessions s
        where s.user_id = auth.uid() and s.game_slug = u.game_slug), 0)::integer as seconds
    from public.game_play_usage u where u.user_id = auth.uid()
    group by u.game_slug order by gross desc limit 50
  ) t;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_recent from (
    select game_slug, gross_coins, cut_coins, source, created_at
    from public.game_play_usage where user_id = auth.uid()
    order by created_at desc limit 25
  ) t;

  select coalesce(sum(active_seconds), 0)::integer into v_sec_total
  from public.game_sessions where user_id = auth.uid();
  select coalesce(sum(active_seconds), 0)::integer into v_sec_hour
  from public.game_sessions where user_id = auth.uid() and started_at > now() - interval '1 hour';
  select coalesce(sum(active_seconds), 0)::integer into v_sec_day
  from public.game_sessions where user_id = auth.uid() and started_at > now() - interval '24 hours';

  return jsonb_build_object(
    'total', v_total, 'lastHour', v_hour, 'last24h', v_day,
    'byGame', v_bygame, 'recent', v_recent,
    'secondsTotal', v_sec_total, 'secondsHour', v_sec_hour, 'secondsDay', v_sec_day
  );
end; $$;
revoke all on function public.my_game_play_usage() from public, anon, authenticated;
grant execute on function public.my_game_play_usage() to authenticated;
