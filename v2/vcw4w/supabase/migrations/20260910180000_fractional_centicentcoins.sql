-- ============================================================================
-- Fractional Vibe Coin spending: Centicentcoins (0.01 coin = 0.01 cent = $0.0001)
-- 100 centicentcoins = 1 Vibe Coin.
-- Re-runnable: every statement uses IF EXISTS / OR REPLACE guards.
-- ============================================================================

-- 1. Alter coin_ledger.delta from integer to numeric(12, 2)
alter table public.coin_ledger
  alter column delta type numeric(12, 2) using delta::numeric(12, 2);

-- Update check constraint on coin_ledger delta to allow fractional coins down to 0.01
alter table public.coin_ledger drop constraint if exists coin_ledger_delta_check;
alter table public.coin_ledger
  add constraint coin_ledger_delta_check
  check (delta <> 0 and delta >= -1000000 and delta <= 1000000);

-- 2. Convenience balance function returning numeric balance (preserving centicentcoins)
-- Drop first because PostgreSQL does not allow changing the return type via CREATE OR REPLACE FUNCTION.
drop function if exists public.get_my_coin_balance();
create or replace function public.get_my_coin_balance()
returns numeric
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(delta), 0)::numeric(12, 2) from public.coin_ledger where user_id = auth.uid();
$$;
grant execute on function public.get_my_coin_balance() to authenticated;

-- 3. Update game_ai_usage and dependent view
-- In Postgres, altering a column type requires dropping dependent views first.
drop view if exists public.v_game_ai_spend;

alter table public.game_ai_usage
  alter column gross_coins type numeric(12, 2) using gross_coins::numeric(12, 2),
  alter column cut_coins type numeric(12, 2) using cut_coins::numeric(12, 2),
  alter column provider_coins type numeric(12, 2) using provider_coins::numeric(12, 2);

alter table public.buddy_sessions
  alter column gross_coins type numeric(12, 2) using gross_coins::numeric(12, 2),
  alter column cut_coins type numeric(12, 2) using cut_coins::numeric(12, 2);

-- Recreate view with numeric sums
create or replace view public.v_game_ai_spend as
select
  user_id,
  game_slug,
  kind,
  count(*)::integer as turns,
  coalesce(sum(gross_coins), 0)::numeric(12, 2) as gross_coins,
  coalesce(sum(cut_coins), 0)::numeric(12, 2) as cut_coins,
  coalesce(sum(provider_coins), 0)::numeric(12, 2) as provider_coins
from public.game_ai_usage
group by user_id, game_slug, kind;

-- Update split function to accept numeric or provide numeric version
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

-- meter_game_ai_usage supporting fractional coins (centicentcoins resolution 0.01)
create or replace function public.meter_game_ai_usage(
  p_game text,
  p_kind text,
  p_qty numeric,
  p_session uuid default null,
  p_source text default 'meter'
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_game text; v_mode text := 'optional'; v_gross numeric(12, 2); v_cut numeric(12, 2);
  v_provider numeric(12, 2); v_bal numeric(12, 2); v_fee record;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  v_game := lower(trim(coalesce(p_game, '')));
  if v_game !~ '^[a-z0-9-]{1,64}$' then raise exception 'invalid game'; end if;
  if p_kind not in ('dialogue','director','tts','runpod-gpu','inference','buddy-chat','buddy-tts') then
    raise exception 'invalid kind';
  end if;
  if p_qty is null or p_qty <= 0 or p_qty > 100000000 then raise exception 'invalid qty'; end if;
  if p_source not in ('meter','chat','tts','heartbeat','manual') then raise exception 'invalid source'; end if;
  if p_session is not null and not exists (
    select 1 from public.buddy_sessions s
    where s.id = p_session and s.user_id = auth.uid() and s.status = 'open'
  ) then raise exception 'session not found'; end if;

  -- Mode comes from operator catalog or defaults to optional
  select f.mode into v_mode from public.game_ai_features f
  where f.game_slug = v_game and f.kind = p_kind and f.enabled = true;
  if not found then v_mode := 'optional'; end if;

  -- Gross price by kind in coins (0.01 coin minimum = 1 centicentcoin)
  v_gross := case p_kind
    when 'dialogue' then greatest(0.01, round(3.0 * p_qty, 2))
    when 'buddy-chat' then greatest(0.01, round(3.0 * p_qty, 2))
    when 'tts' then greatest(0.01, round(2.0 * p_qty, 2))
    when 'buddy-tts' then greatest(0.01, round(2.0 * p_qty, 2))
    when 'director' then greatest(0.01, round(2.0 * p_qty, 2))
    when 'runpod-gpu' then greatest(0.01, round(12.0 * p_qty, 2))
    when 'inference' then greatest(0.01, round(6.0 * p_qty, 2))
    else 0.01 end;

  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_gross then
    raise exception 'insufficient balance: need % coins, have %', v_gross, v_bal;
  end if;

  select * into v_fee from public.game_ai_compute_split_numeric(v_gross);
  v_cut := v_fee.cut; v_provider := v_fee.provider;

  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_gross, substr('Game AI (' || v_game || '/' || p_kind || ')', 1, 120));

  insert into public.game_ai_usage
    (user_id, game_slug, kind, mode, session_id, qty, gross_coins, cut_coins, provider_coins, source)
  values
    (auth.uid(), v_game, p_kind, v_mode, p_session, p_qty, v_gross, v_cut, v_provider, p_source);

  if p_session is not null then
    update public.buddy_sessions
    set gross_coins = gross_coins + v_gross,
        cut_coins = cut_coins + v_cut,
        turns = turns + 1
    where id = p_session;
  end if;

  return jsonb_build_object(
    'gross_coins', v_gross,
    'cut_coins', v_cut,
    'provider_coins', v_provider,
    'mode', v_mode,
    'gross_centicentcoins', round(v_gross * 100)::integer
  );
end; $$;
revoke all on function public.meter_game_ai_usage(text, text, numeric, uuid, text) from public, anon, authenticated;
grant execute on function public.meter_game_ai_usage(text, text, numeric, uuid, text) to authenticated;
