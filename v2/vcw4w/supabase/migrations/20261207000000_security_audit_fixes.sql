-- Security audit fixes (multi-lane sweep): heartbeat caps enforced in the
-- authority (DB), spend-lock TOCTOU guards on remaining spenders, cheat-mark
-- INSERT coverage, privacy filters (leaderboard/love/clan), refund floor,
-- past_due retry. Additive + rerunnable: full-body OR REPLACE only, DROP IF
-- EXISTS guards on triggers, no table creation, no coin-table redesign.

-- 1. Heartbeat caps in the authority: the API caps beats at 300s but the RPC
--    allowed 3600s to any direct RPC caller (12x over-billing per beat).
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
  perform public.coin_spend_lock(auth.uid());
  if p_seconds is null or p_seconds < 1 or p_seconds > 300 then raise exception 'seconds must be 1..300'; end if;
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

-- 1b. start_game_session: same spend-lock idiom (balance check precedes the
--     load-fee debit in one transaction).
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
  perform public.coin_spend_lock(auth.uid());
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

-- 2. Kid heartbeat: same 300s authority cap.
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
  if p_seconds is null or p_seconds < 1 or p_seconds > 300 then raise exception 'seconds must be 1..300'; end if;
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

-- 3. Spend-lock TOCTOU guards on the remaining balance-check-then-debit paths
--    (same one-line idiom as tip_creator/subscribe_to_tier in the hardening
--    migration: serialize concurrent spends from one wallet per transaction).
create or replace function public.meter_clan_posting_fee(
  p_clan_id uuid, p_kind text, p_bytes integer, p_has_image boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_kind text := lower(trim(coalesce(p_kind, '')));
  v_bytes integer := greatest(0, coalesce(p_bytes, 0));
  v_fee numeric(12, 2);
  v_cut numeric(12, 2);
  v_provider numeric(12, 2);
  v_bal numeric(12, 2);
  v_slug text;
  v_status text;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  perform public.coin_spend_lock(auth.uid());
  if v_kind not in ('post', 'comment', 'message') then raise exception 'invalid kind'; end if;
  select slug, upkeep_status into v_slug, v_status
    from public.clans where id = p_clan_id;
  if v_slug is null then raise exception 'clan not found'; end if;
  if v_status = 'delinquent' then raise exception 'clan upkeep delinquent'; end if;
  if not exists (
    select 1 from public.clan_members where clan_id = p_clan_id and user_id = auth.uid()
  ) then
    raise exception 'join the clan first';
  end if;
  v_fee := greatest(0.01, round((ceil(v_bytes / 1024.0) * 0.01)::numeric, 2)
    + case when coalesce(p_has_image, false) then 0.05 else 0 end);
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_fee then
    raise exception 'insufficient balance: need % coins, have %', v_fee, v_bal;
  end if;
  v_cut := round(v_fee * 25 / 100.0, 2);
  v_provider := v_fee - v_cut;
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_fee, substr('Clan ' || v_kind || ' fee: ' || v_slug, 1, 120));
  insert into public.clan_wallets (clan_id, balance)
  values (p_clan_id, v_provider)
  on conflict (clan_id) do update set
    balance = public.clan_wallets.balance + excluded.balance,
    updated_at = now();
  insert into public.clan_cost_ledger (clan_id, kind, qty, gross, cut, provider, note)
  values (p_clan_id, v_kind || '-fee', 1, v_fee, v_cut, v_provider, substr('server cost fee', 1, 200));
  return jsonb_build_object('fee_coins', v_fee, 'cut_coins', v_cut, 'wallet_coins', v_provider);
end; $$;
revoke all on function public.meter_clan_posting_fee(uuid, text, integer, boolean) from public, anon, authenticated;
grant execute on function public.meter_clan_posting_fee(uuid, text, integer, boolean) to authenticated;

create or replace function public.meter_clan_posting_fee_for(
  p_user_id uuid, p_clan_id uuid, p_kind text, p_bytes integer, p_has_image boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_kind text := lower(trim(coalesce(p_kind, '')));
  v_bytes integer := greatest(0, coalesce(p_bytes, 0));
  v_fee numeric(12, 2);
  v_cut numeric(12, 2);
  v_provider numeric(12, 2);
  v_bal numeric(12, 2);
  v_slug text;
  v_status text;
begin
  if p_user_id is null then raise exception 'login required'; end if;
  perform public.coin_spend_lock(p_user_id);
  if v_kind not in ('post', 'comment', 'message') then raise exception 'invalid kind'; end if;
  select slug, upkeep_status into v_slug, v_status
    from public.clans where id = p_clan_id;
  if v_slug is null then raise exception 'clan not found'; end if;
  if v_status = 'delinquent' then raise exception 'clan upkeep delinquent'; end if;
  if not exists (
    select 1 from public.clan_members where clan_id = p_clan_id and user_id = p_user_id
  ) then
    raise exception 'join the clan first';
  end if;
  v_fee := greatest(0.01, round((ceil(v_bytes / 1024.0) * 0.01)::numeric, 2)
    + case when coalesce(p_has_image, false) then 0.05 else 0 end);
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
  from public.coin_ledger where user_id = p_user_id;
  if v_bal < v_fee then
    raise exception 'insufficient balance: need % coins, have %', v_fee, v_bal;
  end if;
  v_cut := round(v_fee * 25 / 100.0, 2);
  v_provider := v_fee - v_cut;
  insert into public.coin_ledger (user_id, delta, reason)
  values (p_user_id, -v_fee, substr('Clan ' || v_kind || ' fee: ' || v_slug, 1, 120));
  insert into public.clan_wallets (clan_id, balance)
  values (p_clan_id, v_provider)
  on conflict (clan_id) do update set
    balance = public.clan_wallets.balance + excluded.balance,
    updated_at = now();
  insert into public.clan_cost_ledger (clan_id, kind, qty, gross, cut, provider, note)
  values (p_clan_id, v_kind || '-fee', 1, v_fee, v_cut, v_provider, substr('server cost fee', 1, 200));
  return jsonb_build_object('fee_coins', v_fee, 'cut_coins', v_cut, 'wallet_coins', v_provider);
end; $$;
revoke all on function public.meter_clan_posting_fee_for(uuid, uuid, text, integer, boolean) from public, anon, authenticated;
grant execute on function public.meter_clan_posting_fee_for(uuid, uuid, text, integer, boolean) to service_role;

create or replace function public.donate_clan_upkeep(p_clan_id uuid, p_coins numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_amount numeric(12, 2) := round(coalesce(p_coins, 0), 2);
  v_bal numeric(12, 2);
  v_total numeric(12, 2);
  v_xp_today integer;
  v_debit_id uuid;
  v_donation_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  perform public.coin_spend_lock(auth.uid());
  if v_amount < 0.01 or v_amount > 100000 then raise exception 'amount must be 0.01..100000'; end if;
  if not exists (select 1 from public.clans where id = p_clan_id) then
    raise exception 'clan not found';
  end if;
  if not exists (
    select 1 from public.clan_members where clan_id = p_clan_id and user_id = auth.uid()
  ) then
    raise exception 'join the clan first';
  end if;
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_amount then
    raise exception 'insufficient balance: need % coins, have %', v_amount, v_bal;
  end if;
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_amount, substr('Clan donation', 1, 120))
  returning id into v_debit_id;
  insert into public.clan_wallets (clan_id, balance)
  values (p_clan_id, v_amount)
  on conflict (clan_id) do update set
    balance = public.clan_wallets.balance + excluded.balance,
    updated_at = now();
  insert into public.clan_cost_ledger (clan_id, kind, qty, gross, cut, provider, note)
  values (p_clan_id, 'donation', 1, v_amount, 0, v_amount, substr('member donation', 1, 200));
  -- Total Clan Support receipt + lot-accurate vintages (mixed lots split).
  insert into public.clan_donations (clan_id, donor_id, coins, kind, debit_ledger_id)
  values (p_clan_id, auth.uid(), v_amount, 'donation', v_debit_id)
  returning id into v_donation_id;
  insert into public.clan_donation_vintages
    (clan_id, donor_id, donation_id, lot_id, coins, remaining, donated_at, expires_at, eligible_at)
  select p_clan_id, auth.uid(), v_donation_id, s.lot_id, s.coins, s.coins,
    now(), l.expires_at, now() + interval '6 months'
  from public.coin_lot_spends s
  join public.coin_lots l on l.id = s.lot_id
  where s.debit_ledger_id = v_debit_id;
  -- Donation XP respects the same 100/day anti-farm cap as award_clan_xp.
  select coalesce(sum(xp), 0)::integer into v_xp_today
  from public.clan_xp_ledger
  where user_id = auth.uid() and clan_id = p_clan_id
    and created_at >= date_trunc('day', now());
  if v_xp_today < 100 then
    insert into public.clan_xp_ledger (user_id, clan_id, xp, reason)
    values (auth.uid(), p_clan_id, least(20, 100 - v_xp_today), 'upkeep-funded');
  end if;
  select coalesce(sum(gross), 0)::numeric(12, 2) into v_total
  from public.clan_cost_ledger where clan_id = p_clan_id and kind = 'donation';
  if v_total >= 100 then
    insert into public.clan_badges (user_id, clan_id, badge)
    values (auth.uid(), p_clan_id, 'patron')
    on conflict do nothing;
  end if;
  return jsonb_build_object('donated_coins', v_amount);
end; $$;
revoke all on function public.donate_clan_upkeep(uuid, numeric) from public, anon, authenticated;
grant execute on function public.donate_clan_upkeep(uuid, numeric) to authenticated;

create or replace function public.fund_clan_wallet(p_clan_id uuid, p_coins numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_amount numeric(12, 2) := round(coalesce(p_coins, 0), 2);
  v_bal numeric(12, 2);
  v_owner uuid;
  v_debit_id uuid;
  v_donation_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  perform public.coin_spend_lock(auth.uid());
  if v_amount < 0.01 or v_amount > 100000 then raise exception 'amount must be 0.01..100000'; end if;
  select owner_id into v_owner from public.clans where id = p_clan_id;
  if v_owner is null then raise exception 'clan not found'; end if;
  if v_owner <> auth.uid() then raise exception 'not the owner'; end if;
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_amount then
    raise exception 'insufficient balance: need % coins, have %', v_amount, v_bal;
  end if;
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_amount, substr('Clan funding', 1, 120))
  returning id into v_debit_id;
  insert into public.clan_wallets (clan_id, balance)
  values (p_clan_id, v_amount)
  on conflict (clan_id) do update set
    balance = public.clan_wallets.balance + excluded.balance,
    updated_at = now();
  insert into public.clan_cost_ledger (clan_id, kind, qty, gross, cut, provider, note)
  values (p_clan_id, 'owner-funding', 1, v_amount, 0, v_amount, substr('owner funding', 1, 200));
  insert into public.clan_donations (clan_id, donor_id, coins, kind, debit_ledger_id)
  values (p_clan_id, auth.uid(), v_amount, 'funding', v_debit_id)
  returning id into v_donation_id;
  insert into public.clan_donation_vintages
    (clan_id, donor_id, donation_id, lot_id, coins, remaining, donated_at, expires_at, eligible_at)
  select p_clan_id, auth.uid(), v_donation_id, s.lot_id, s.coins, s.coins,
    now(), l.expires_at, now() + interval '6 months'
  from public.coin_lot_spends s
  join public.coin_lots l on l.id = s.lot_id
  where s.debit_ledger_id = v_debit_id;
  insert into public.clan_xp_ledger (user_id, clan_id, xp, reason)
  values (auth.uid(), p_clan_id, 20, 'upkeep-funded');
  if v_amount >= 100 then
    insert into public.clan_badges (user_id, clan_id, badge)
    values (auth.uid(), p_clan_id, 'patron')
    on conflict do nothing;
  end if;
  return jsonb_build_object('funded_coins', v_amount);
end; $$;
revoke all on function public.fund_clan_wallet(uuid, numeric) from public, anon, authenticated;
grant execute on function public.fund_clan_wallet(uuid, numeric) to authenticated;

-- 4. Cheat-mark coverage on INSERT (the old trigger was UPDATE-only, so a
--    direct INSERT of a clean row after cheating laundered the mark; the API
--    same-kind re-mark also missed the auto/manual companion). The trigger
--    consults cheat_settings (source of truth) and preserves marks already
--    present; slot 0 stays stripped.
create or replace function public.enforce_cheat_save_marker()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.slot = 0 then
   new.data := new.data - 'cheat_mode';
   return new;
 end if;
 if coalesce((old.data->>'cheat_mode')::boolean,false) then
   new.data := new.data || jsonb_build_object('cheat_mode',true);
 end if;
 if coalesce((new.data->>'cheat_mode')::boolean,false) then
   return new;
 end if;
 if exists (
   select 1 from public.cheat_settings
   where user_id = new.user_id and game_slug = new.game_slug
     and slot = new.slot and enabled
 ) then
   new.data := new.data || jsonb_build_object('cheat_mode',true);
 end if;
 return new;
end; $$;
drop trigger if exists trg_enforce_cheat_save_marker on public.game_saves;
create trigger trg_enforce_cheat_save_marker before insert or update on public.game_saves for each row execute function public.enforce_cheat_save_marker();

-- 5. Privacy filters.
-- Public leaderboard: skip shy/private profiles (handles only, unchanged).
create or replace function public.leaderboard_top(p_game text, p_metric text)
returns table(player text, value bigint) language plpgsql security definer set search_path=public as $$
begin
 if p_game !~ '^[a-z0-9-]{1,64}$' or p_metric not in ('kills','actions','active_seconds') then raise exception 'invalid leaderboard'; end if;
 return query execute format(
  'select coalesce(nullif(p.public_handle,''''), nullif(p.display_name,''''), ''Player''), sum(e.%I)::bigint from public.game_stat_events e join public.profiles p on p.id=e.user_id where e.game_slug=$1 and coalesce(p.is_profile_public,true) group by p.public_handle, p.display_name having sum(e.%I) > 0 order by sum(e.%I) desc limit 100',
  p_metric, p_metric, p_metric) using p_game;
end; $$;
revoke all on function public.leaderboard_top(text,text) from public,anon,authenticated;
grant execute on function public.leaderboard_top(text,text) to anon,authenticated;

-- Love profile: handle-only lookup (no UUID enumeration oracle) and fully
-- zeroed hidden branch (no display-name leak).
create or replace function public.love_profile_stats(p_handle text)
returns table(display_name text, public_handle text, earned integer, received integer, given integer, is_public boolean)
language plpgsql security definer set search_path = public as $$
declare v_row record;
begin
  if p_handle is null or length(trim(p_handle)) = 0 then raise exception 'invalid handle'; end if;
  select p.display_name, p.public_handle, p.ll_earned, p.ll_received, p.ll_given, p.is_profile_public
    into v_row from public.profiles p
   where lower(p.public_handle) = lower(trim(p_handle))
   limit 1;
  if not found then raise exception 'player not found'; end if;
  if v_row.is_profile_public then
    return query select v_row.display_name::text, v_row.public_handle::text,
      v_row.ll_earned::integer, v_row.ll_received::integer, v_row.ll_given::integer, true;
  else
    return query select null::text, null::text, 0, 0, 0, false;
  end if;
end; $$;
revoke all on function public.love_profile_stats(text) from public, anon, authenticated;
grant execute on function public.love_profile_stats(text) to anon, authenticated;

-- Clan leaderboard: handles only, never raw user UUIDs (same pattern as
-- clan_supporter_status).
create or replace function public.clan_leaderboard(p_clan_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_rows jsonb;
begin
  if not exists (select 1 from public.clans where id = p_clan_id) then
    raise exception 'clan not found';
  end if;
  select coalesce(jsonb_agg(t order by t.xp desc), '[]'::jsonb) into v_rows
  from (
    select case when coalesce(p.is_profile_public, true)
      then coalesce(nullif(p.public_handle, ''), nullif(p.display_name, ''), 'member')
      else 'member' end as handle,
      sum(x.xp)::integer as xp, count(*)::integer as events
    from public.clan_xp_ledger x
    left join public.profiles p on p.id = x.user_id
    where x.clan_id = p_clan_id
    group by x.user_id, p.public_handle, p.display_name, p.is_profile_public
    order by sum(x.xp) desc
    limit 25
  ) t;
  return jsonb_build_object('leaders', v_rows);
end; $$;
revoke all on function public.clan_leaderboard(uuid) from public, anon, authenticated;
grant execute on function public.clan_leaderboard(uuid) to anon, authenticated;

-- 5b. love_gifts graph to authenticated-only: the public totals surface is
--     the love_post_totals() aggregate RPC (used by /api/love/post/[id]),
--     so direct anon table reads only exposed the giver->receiver graph.
drop policy if exists love_gifts_public_read on public.love_gifts;
create policy love_gifts_public_read on public.love_gifts
  for select to authenticated using (true);
revoke select on public.love_gifts from anon;
grant select on public.love_gifts to authenticated;

-- 6. Sub-dollar refunds: floor(<1 coin) = 0 violated the usd_cents > 0 CHECK
--    and made every partial refund under a coin unrefundable (500). Allow 0
--    (buyer never gains an unearned cent) instead of aborting the refund.
alter table public.coin_refunds drop constraint if exists coin_refunds_usd_cents_check;
alter table public.coin_refunds add constraint coin_refunds_usd_cents_check check (usd_cents >= 0);

-- 7. past_due retry: the renew loop only selected active rows, so a topped-up
--    past_due account lapsed forever. Retry past_due too; success flips back
--    to active alongside the period bump.
create or replace function public.renew_support_subscriptions()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_tier public.support_tiers%rowtype;
  v_bal numeric(12, 2);
  v_split record;
  v_net numeric(12, 2);
  v_ok integer := 0;
  v_due integer := 0;
begin
  for r in select * from public.support_subscriptions
    where status in ('active', 'past_due') and current_period_end <= now()
  loop
    v_due := v_due + 1;
    begin
      perform public.coin_spend_lock(r.supporter_id);
      select * into v_tier from public.support_tiers where id = r.tier_id and active;
      if not found then
        update public.support_subscriptions set status = 'cancelled', cancelled_at = now() where id = r.id;
        continue;
      end if;
      select * into v_split from public.support_split(v_tier.coins_monthly);
      select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
      from public.coin_ledger where user_id = r.supporter_id;
      if v_bal < v_split.gross then
        update public.support_subscriptions set status = 'past_due' where id = r.id;
        continue;
      end if;
      insert into public.coin_ledger (user_id, delta, reason)
      values (r.supporter_id, -v_split.gross, substr('Support renewal', 1, 120));
      v_net := public.support_credit(r.supporter_id, v_tier.owner_user_id, v_tier.clan_id, v_split.gross, 'support-subscription', 'Support renewal');
      update public.support_subscriptions
      set current_period_start = current_period_end,
          current_period_end = current_period_end + interval '30 days',
          status = 'active'
      where id = r.id;
      insert into public.support_payments (kind, supporter_id, recipient_user_id, clan_id, subscription_id, gross, cut, net)
      values ('subscription', r.supporter_id, v_tier.owner_user_id, v_tier.clan_id, r.id, v_split.gross, v_split.cut, v_net);
      perform public.record_platform_cut('support-cut', v_split.gross, v_split.cut, 'support_payments', null);
      v_ok := v_ok + 1;
    exception when others then
      insert into public.support_renewal_failures (subscription_id, supporter_id, error)
      values (r.id, r.supporter_id, substr(SQLERRM, 1, 500));
      continue;
    end;
  end loop;
  return jsonb_build_object('due', v_due, 'renewed', v_ok);
end; $$;
revoke all on function public.renew_support_subscriptions() from public, anon, authenticated;
grant execute on function public.renew_support_subscriptions() to service_role;
