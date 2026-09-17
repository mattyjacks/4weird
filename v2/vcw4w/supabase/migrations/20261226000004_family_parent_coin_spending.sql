-- Parent-owned child spending. Child accounts hold no spendable coin balance;
-- all debits remain on the parent's ledger and carry child attribution.
alter table public.coin_ledger add column if not exists kid_account_id uuid;
create index if not exists idx_coin_ledger_kid_account on public.coin_ledger(kid_account_id, created_at desc) where kid_account_id is not null;

create table if not exists public.kid_wallet_reconciliations (
  kid_id uuid primary key,
  parent_id uuid not null,
  returned_coins numeric(12,2) not null,
  created_at timestamptz not null default now()
);
alter table public.kid_wallet_reconciliations enable row level security;

-- Return only unspent legacy balances to the parent's own ledger. A unique
-- reconciliation row makes reruns safe and preserves the historical child ledger.
do $$
declare r record;
begin
  for r in
    select k.id as kid_id, k.parent_id, coalesce(sum(l.delta),0)::numeric(12,2) as balance
    from public.kid_accounts k left join public.kid_wallet_ledger l on l.kid_id = k.id
    group by k.id, k.parent_id having coalesce(sum(l.delta),0) > 0
  loop
    insert into public.kid_wallet_reconciliations(kid_id,parent_id,returned_coins)
      values(r.kid_id,r.parent_id,r.balance) on conflict(kid_id) do nothing;
    if found then
      insert into public.coin_ledger(user_id,delta,reason)
        values(r.parent_id,r.balance,'Return unused legacy child wallet balance');
    end if;
  end loop;
end $$;

create or replace function public.spend_parent_coins_for_kid(p_kid uuid,p_amount numeric,p_reason text)
returns numeric(12,2) language plpgsql security definer set search_path = public, pg_temp as $$
declare v_parent uuid; v_balance numeric(12,2); v_month numeric(12,2); v_hour numeric(12,2); v_month_cap numeric(12,2); v_hour_cap numeric(12,2); v_stop boolean;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'invalid child spend'; end if;
  select parent_id into v_parent from public.kid_accounts where id=p_kid and status='active';
  if v_parent is null then raise exception 'unknown child account'; end if;
  -- Serialize this child's budget checks and debit; the coin-lot trigger locks
  -- and consumes the parent's actual unexpired lots atomically.
  select monthly_cap_coins,hourly_cap_coins,hard_stop into v_month_cap,v_hour_cap,v_stop
    from public.kid_controls where kid_id=p_kid for update;
  select coalesce(sum(-delta),0)::numeric(12,2) into v_month from public.coin_ledger
    where kid_account_id=p_kid and delta<0 and created_at>=date_trunc('month',now());
  select v_month + coalesce(sum(-delta),0)::numeric(12,2) into v_month from public.kid_wallet_ledger
    where kid_id=p_kid and delta<0 and created_at>=date_trunc('month',now());
  select coalesce(sum(-delta),0)::numeric(12,2) into v_hour from public.coin_ledger
    where kid_account_id=p_kid and delta<0 and created_at>=now()-interval '1 hour';
  if coalesce(v_stop,false) and coalesce(v_month_cap,0)>0 and v_month+p_amount>v_month_cap then raise exception 'monthly budget cap reached'; end if;
  if coalesce(v_hour_cap,0)>0 and v_hour+p_amount>v_hour_cap then raise exception 'hourly spend cap reached'; end if;
  select coalesce(sum(remaining_coins) filter(where expires_at>now()),0)::numeric(12,2) into v_balance
    from public.coin_lots where user_id=v_parent;
  if v_balance<p_amount then raise exception 'insufficient parent balance'; end if;
  insert into public.coin_ledger(user_id,delta,kid_account_id,reason)
    values(v_parent,-p_amount,p_kid,left(coalesce(p_reason,'Child spend'),120));
  return v_balance-p_amount;
end; $$;
revoke all on function public.spend_parent_coins_for_kid(uuid,numeric,text) from public,anon,authenticated;

create or replace function public.fund_kid_wallet(p_kid uuid,p_coins numeric)
returns numeric(12,2) language plpgsql security definer set search_path=public as $$
begin raise exception 'Child accounts do not hold coins. Spending is authorized directly against the parent balance.'; end; $$;
revoke all on function public.fund_kid_wallet(uuid,numeric) from public,anon;
grant execute on function public.fund_kid_wallet(uuid,numeric) to authenticated;

create or replace function public.close_kid_account(p_kid uuid)
returns numeric(12,2) language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not exists(select 1 from public.kid_accounts where id=p_kid and parent_id=auth.uid()) then raise exception 'not your child account'; end if;
  -- Child-attributed parent debits stay in coin_ledger for audit. Legacy
  -- unused balances were already returned by the migration reconciliation.
  delete from public.kid_accounts where id=p_kid;
  return 0;
end; $$;
revoke all on function public.close_kid_account(uuid) from public,anon;
grant execute on function public.close_kid_account(uuid) to authenticated;

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
  if exists (select 1 from public.kid_controls c where c.kid_id=p_kid and cardinality(c.allowed_games)>0 and not (v_game=any(c.allowed_games))) then raise exception 'game not allowed by parent'; end if;
  if exists (select 1 from public.kid_controls c where c.kid_id=p_kid and exists (select 1 from unnest(c.allowed_features) as f(value) where f.value like 'game:%') and not (('game:' || v_game)=any(c.allowed_features))) then raise exception 'feature not allowed by parent'; end if;
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
    select v_spent + coalesce(sum(-delta),0) into v_spent from public.coin_ledger
    where kid_account_id = p_kid and delta < 0 and created_at >= date_trunc('month', now());
    if v_spent + v_fee > v_cap then raise exception 'monthly budget cap reached'; end if;
  end if;

  insert into public.game_sessions (user_id, kid_id, game_slug, bundle_version, new_bytes, load_fee, load_cut, free_load)
  values (v_parent, p_kid, v_game, v_version, v_bytes, v_fee, v_cut, v_free)
  returning * into v_session;

  if v_fee > 0 then
    v_bal := public.spend_parent_coins_for_kid(p_kid, v_fee, substr('Play ' || v_game || ' (load)', 1, 120));
    select * into v_fee_split from public.game_ai_compute_split_numeric(v_fee);
    v_cut := v_fee_split.cut; v_provider := v_fee_split.provider;
    update public.game_sessions set load_cut = v_cut where id = v_session.id;
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
    select v_spent + coalesce(sum(-delta),0) into v_spent from public.coin_ledger
    where kid_account_id = p_kid and delta < 0 and created_at >= date_trunc('month', now());
    if v_spent + v_delta > v_cap then raise exception 'monthly budget cap reached'; end if;
  end if;

  if v_delta > 0 then
    v_bal := public.spend_parent_coins_for_kid(p_kid, v_delta, substr('Play ' || v_session.game_slug || ' (playtime)', 1, 120));
    select * into v_fee_split from public.game_ai_compute_split_numeric(v_delta);
    v_cut := v_fee_split.cut; v_provider := v_fee_split.provider;
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
