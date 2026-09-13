-- ============================================================================
-- MMO per-minute coin settlement (economy lane, DS-MMO-14 slice).
-- File: supabase/migrations/20261203000003_mmo_coin_settle.sql
--
-- Owns ALL ledger writes for the MMO settlement slice. Version slots
-- 20261203000000-00002 belong to DS-MMO-10 (infra: servers, membership,
-- meter/presence tables); this 00003 slot is the economy-owned settlement
-- layer on top. Presence intake (`presence_minutes` rows) is owned by
-- DS-MMO-09/DS-MMO-10 — this file NEVER creates or alters presence/meter
-- tables, it only CONSUMES a (match, minute, player) minute.
--
-- Rules (enforced in SQL, not client code):
--  * Idempotency key is match + minute + player:
--    UNIQUE(match_id, minute_idx, player_id). A retried tick converges to
--    the stored row and never double-charges.
--  * Paired ledger entries, debit-FIRST (taking money FROM the player):
--    debit the player gross via a plain `coin_ledger` insert, then credit
--    the host net, then book the 25% cut in `platform_ledger` (kind
--    'compute-cut', already in the allowed set — no platform table ALTER).
--    If the debit fails (FIFO trigger raises 'insufficient unexpired Vibe
--    Coins') nothing is ever credited out of thin air: the whole call rolls
--    back and the tick retries the minute later.
--  * FIFO/expiry reuse, refund-safe: the debit is a plain insert so the
--    existing `trg_coin_ledger_lots` trigger allocates the OLDEST unexpired
--    lots first. Refunds pre-decrement `coin_lots.remaining_coins`
--    (`refund_coin_lot()`), so refunded cents are never re-spent here; only
--    PAID lots with unspent remainder settle, free lots spend identically
--    to every other lane (no special-casing, no new columns).
--  * Insufficient balance yields a `due` settlement row — never a negative
--    balance, never a partial debit. Dues are retryable: a later tick with
--    the same key re-attempts settlement while the row is still `due`.
--  * No parallel balance column: the only balance read is
--    SUM(remaining_coins) over unexpired `coin_lots` (the lots-based
--    balance behind `get_my_coin_balance()`).
--
-- Rerunnable: every CREATE TABLE / CREATE INDEX carries IF NOT EXISTS; the
-- UNIQUE guard is added via a pg_constraint check; the RPC is OR REPLACE.
-- RLS: table is service_role-only (REVOKE ALL from anon/authenticated, no
-- client policies — the tick job calls the RPC through the service client).
-- ============================================================================

-- 1. Settlement ledger: one row per (match, minute, player). ---------------
create table if not exists public.mmo_minute_settlements (
  id uuid primary key default gen_random_uuid(),
  match_id text not null check (char_length(match_id) between 1 and 200),
  minute_idx integer not null check (minute_idx >= 0),
  player_id uuid not null references public.profiles(id) on delete cascade,
  host_id uuid null references public.profiles(id) on delete set null,
  share_coins numeric(12, 2) not null check (share_coins >= 0.01 and share_coins <= 10000),
  cut_coins numeric(12, 2) not null default 0 check (cut_coins >= 0),
  host_coins numeric(12, 2) not null default 0 check (host_coins >= 0),
  status text not null default 'settled' check (status in ('settled', 'due')),
  debit_ledger_id uuid null references public.coin_ledger(id) on delete set null,
  credit_ledger_id uuid null references public.coin_ledger(id) on delete set null,
  due_coins numeric(12, 2) not null default 0 check (due_coins >= 0),
  settled_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Idempotency key: match + minute + player (one settlement per minute each).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'mmo_minute_settlements_idem_key'
  ) then
    alter table public.mmo_minute_settlements
      add constraint mmo_minute_settlements_idem_key
      unique (match_id, minute_idx, player_id);
  end if;
end $$;

create index if not exists idx_mmo_settlements_match_minute
  on public.mmo_minute_settlements (match_id, minute_idx);
create index if not exists idx_mmo_settlements_due
  on public.mmo_minute_settlements (status, match_id, minute_idx)
  where status = 'due';

alter table public.mmo_minute_settlements enable row level security;
-- No client policies: only the service_role RPC below writes here.
revoke all on public.mmo_minute_settlements from anon, authenticated;

-- 2. Settlement executor: idempotent per-minute paired ledger write. --------
-- p_share is the player's per-minute gross (cut INCLUDED, 25% platform).
-- Returns jsonb { settled, status, debit, credit, cut, host_net, due }.
create or replace function public.settle_mmo_minute(
  p_match text,
  p_minute integer,
  p_player uuid,
  p_share numeric,
  p_host uuid default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_match text := substr(trim(coalesce(p_match, '')), 1, 200);
  v_share numeric(12, 2) := round(coalesce(p_share, 0), 2);
  v_cut numeric(12, 2);
  v_host_net numeric(12, 2);
  v_bal numeric(12, 2);
  v_existing public.mmo_minute_settlements%rowtype;
  v_debit_id uuid;
  v_credit_id uuid;
  v_row public.mmo_minute_settlements%rowtype;
begin
  if v_match = '' then raise exception 'match required'; end if;
  if p_minute is null or p_minute < 0 then raise exception 'invalid minute'; end if;
  if p_player is null then raise exception 'player required'; end if;
  if v_share < 0.01 or v_share > 10000 then raise exception 'invalid share'; end if;
  if p_host is null then raise exception 'host required'; end if;

  -- Serialize retries on the idempotency key: concurrent ticks for the same
  -- minute converge instead of double-charging.
  perform pg_advisory_xact_lock(
    hashtext('mmo-settle-v1'),
    hashtext(v_match || '#' || p_minute::text || '#' || p_player::text)
  );

  -- Idempotent replay: a settled row returns as-is; a due row re-attempts
  -- below only when the player has since topped up (else it stays due).
  select * into v_existing from public.mmo_minute_settlements
  where match_id = v_match and minute_idx = p_minute and player_id = p_player;
  if found and v_existing.status = 'settled' then
    return jsonb_build_object(
      'settled', true, 'status', 'settled',
      'debit', v_existing.debit_ledger_id, 'credit', v_existing.credit_ledger_id,
      'cut', v_existing.cut_coins, 'host_net', v_existing.host_coins, 'due', 0
    );
  end if;

  -- 25% platform cut INCLUDED in the gross (same rule as every other lane).
  v_cut := round((v_share * 25) / 100, 2);
  v_host_net := round(v_share - v_cut, 2);

  -- Lots-based balance: unexpired remainder only. Refunded cents already
  -- left `remaining_coins` via refund_coin_lot(), so this read is
  -- refund-safe by construction — no new columns, no special-casing.
  select coalesce(sum(remaining_coins) filter (where expires_at > now()), 0)::numeric(12, 2)
  into v_bal from public.coin_lots where user_id = p_player;

  if v_bal < v_share then
    -- Short balance: record (or refresh) a due row. Never a negative
    -- balance, never a partial debit — the minute is retryable.
    insert into public.mmo_minute_settlements
      (match_id, minute_idx, player_id, host_id, share_coins, cut_coins, host_coins,
       status, due_coins)
    values
      (v_match, p_minute, p_player, p_host, v_share, v_cut, v_host_net,
       'due', v_share)
    on conflict on constraint mmo_minute_settlements_idem_key do update set
      host_id = excluded.host_id, share_coins = excluded.share_coins,
      cut_coins = excluded.cut_coins, host_coins = excluded.host_coins,
      due_coins = excluded.due_coins, settled_at = now()
    returning * into v_row;
    return jsonb_build_object(
      'settled', false, 'status', 'due',
      'debit', null, 'credit', null,
      'cut', v_cut, 'host_net', v_host_net, 'due', v_share
    );
  end if;

  -- Debit the player FIRST (plain insert: the FIFO/expiry trigger allocates
  -- the oldest unexpired lots and raises when short — that raise rolls back
  -- the whole call, so the host is never credited out of thin air).
  insert into public.coin_ledger (user_id, delta, reason)
  values (p_player, -v_share, substr('MMO minute ' || v_match || '#' || p_minute::text, 1, 120))
  returning id into v_debit_id;

  -- Then credit the host net (same user when the host plays its own room:
  -- net effect is the platform cut, consistently).
  insert into public.coin_ledger (user_id, delta, reason)
  values (p_host, v_host_net, substr('MMO host payout ' || v_match || '#' || p_minute::text, 1, 120))
  returning id into v_credit_id;

  -- Book the platform cut as a real accounting row (burn-pairing rule:
  -- every cut lands in platform_ledger so reconciliation can pair it).
  if v_cut > 0 then
    perform public.record_platform_cut('compute-cut', v_share, v_cut, 'mmo_minute_settlements', null);
  end if;

  -- Settle (or converge a prior due row for this key into settled).
  insert into public.mmo_minute_settlements
    (match_id, minute_idx, player_id, host_id, share_coins, cut_coins, host_coins,
     status, debit_ledger_id, credit_ledger_id, due_coins)
  values
    (v_match, p_minute, p_player, p_host, v_share, v_cut, v_host_net,
     'settled', v_debit_id, v_credit_id, 0)
  on conflict on constraint mmo_minute_settlements_idem_key do update set
    host_id = excluded.host_id, share_coins = excluded.share_coins,
    cut_coins = excluded.cut_coins, host_coins = excluded.host_coins,
    status = 'settled', debit_ledger_id = excluded.debit_ledger_id,
    credit_ledger_id = excluded.credit_ledger_id, due_coins = 0,
    settled_at = now()
  returning * into v_row;

  return jsonb_build_object(
    'settled', true, 'status', 'settled',
    'debit', v_debit_id, 'credit', v_credit_id,
    'cut', v_cut, 'host_net', v_host_net, 'due', 0
  );
end; $$;
revoke all on function public.settle_mmo_minute(text, integer, uuid, numeric, uuid) from public, anon, authenticated;
grant execute on function public.settle_mmo_minute(text, integer, uuid, numeric, uuid) to service_role;
