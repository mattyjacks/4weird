-- ============================================================================
-- Coin refunds: unspent purchased lots refundable within 90 days.
-- Re-runnable: every statement uses IF NOT EXISTS / OR REPLACE / DROP guards.
--
-- Rules (enforced in SQL, not client code):
--  * Only PURCHASED lots refund: the lot's source ledger row must link via
--    grant_id to a coin_grants row whose sku contains 'VIBE-COINS-' (the paid
--    Shopify packs + custom). Free lots (trial VIBE-TRIAL, daily, referral,
--    alpha, clan/family credits with no grant) are never refundable.
--  * Only within 90 days of receipt: received_at >= now() - interval '90 days'.
--  * Only unspent remainder: refund amount <= remaining_coins. Partial /
--    pro-rated refunds are the norm once FIFO spending has eaten part of the
--    lot (original 500, spent 200 -> 300 refundable). Fully unspent lots
--    refund in full.
--  * Lots are MARKED as refunded: coin_lots.refunded_coins accumulates every
--    refunded centicentcoin and refunded_at records the last refund. Remaining
--    drops by the same amount so get_my_coin_balance() (lots-based) reflects
--    the refund immediately.
--  * Every refund writes an audit row in coin_refunds + a negative
--    coin_ledger debit (reason 'Coin refund: ...'). The FIFO trigger skips
--    refund debits (they already debited their exact lot) to avoid
--    double-spending the remainder.
-- ============================================================================

-- 1. Mark refunded state on the lot itself.
alter table public.coin_lots
  add column if not exists refunded_coins numeric(12,2) not null default 0
    check (refunded_coins >= 0);
alter table public.coin_lots
  add column if not exists refunded_at timestamptz;

-- Guard: refunded can never exceed what was originally granted.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'coin_lots_refunded_cap'
  ) then
    alter table public.coin_lots
      add constraint coin_lots_refunded_cap
      check (refunded_coins <= original_coins);
  end if;
end $$;

create index if not exists idx_coin_lots_refundable
  on public.coin_lots (user_id, received_at desc)
  where remaining_coins > 0;

-- 2. Audit trail: one row per refund (partial refunds = multiple rows).
create table if not exists public.coin_refunds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lot_id uuid not null references public.coin_lots(id) on delete restrict,
  ledger_id uuid references public.coin_ledger(id) on delete set null,
  coins numeric(12,2) not null check (coins > 0 and coins <= 1000000),
  usd_cents integer not null check (usd_cents > 0),
  created_at timestamptz not null default now()
);
create index if not exists idx_coin_refunds_user on public.coin_refunds (user_id, created_at desc);
create index if not exists idx_coin_refunds_lot on public.coin_refunds (lot_id, created_at desc);

alter table public.coin_refunds enable row level security;
drop policy if exists coin_refunds_select_own on public.coin_refunds;
create policy coin_refunds_select_own on public.coin_refunds
  for select to authenticated using (user_id = auth.uid());
-- No INSERT/UPDATE/DELETE policies: only the refund RPC (security definer)
-- writes here. Client writes are denied.
revoke all on public.coin_refunds from anon, authenticated;
grant select on public.coin_refunds to authenticated;

-- 3. FIFO trigger must skip refund debits: the refund RPC already debited its
-- exact lot, so FIFO re-allocation would double-spend the remainder.
create or replace function public.apply_coin_lot_to_ledger()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_needed numeric(12,2); v_lot record; v_used numeric(12,2);
begin
  if new.delta > 0 then
    insert into public.coin_lots (user_id, source_ledger_id, original_coins, remaining_coins, received_at, expires_at)
    values (new.user_id, new.id, new.delta, new.delta, new.created_at, new.created_at + interval '1 year');
    return new;
  end if;
  if new.delta >= 0 then return new; end if;
  -- Refund debits carry reason 'Coin refund: ...' and are pre-allocated to
  -- their lot by refund_coin_lot(). Skipping FIFO here is what keeps the
  -- remaining balance exact after a partial refund.
  if new.reason ilike 'Coin refund:%' then return new; end if;
  v_needed := -new.delta;
  -- Lock candidate lots so simultaneous spends cannot consume the same cents.
  for v_lot in select id, remaining_coins from public.coin_lots
    where user_id = new.user_id and expires_at > new.created_at and remaining_coins > 0
    order by expires_at asc, received_at asc, id asc for update
  loop
    exit when v_needed <= 0;
    v_used := least(v_needed, v_lot.remaining_coins);
    update public.coin_lots set remaining_coins = remaining_coins - v_used where id = v_lot.id;
    insert into public.coin_lot_spends (debit_ledger_id, lot_id, coins) values (new.id, v_lot.id, v_used);
    v_needed := v_needed - v_used;
  end loop;
  if v_needed > 0 then raise exception 'insufficient unexpired Vibe Coins'; end if;
  return new;
end; $$;
drop trigger if exists trg_coin_ledger_lots on public.coin_ledger;
create trigger trg_coin_ledger_lots after insert on public.coin_ledger
  for each row execute function public.apply_coin_lot_to_ledger();

-- 4. Eligibility view: purchased + within 90 days + still has remainder.
-- Purchased = source ledger grant links to a paid VIBE-COINS-* sku.
create or replace function public.get_my_refundable_lots()
returns table (
  lot_id uuid,
  original_coins numeric,
  remaining_coins numeric,
  spent_coins numeric,
  refunded_coins numeric,
  refundable_coins numeric,
  refundable_usd_cents integer,
  received_at timestamptz,
  expires_at timestamptz,
  refund_deadline timestamptz,
  days_left integer,
  order_name text,
  sku text
)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  return query
  select
    l.id,
    l.original_coins,
    l.remaining_coins,
    (l.original_coins - l.remaining_coins - l.refunded_coins)::numeric(12,2) as spent_coins,
    l.refunded_coins,
    l.remaining_coins as refundable_coins,
    round(l.remaining_coins)::integer as refundable_usd_cents,
    l.received_at,
    l.expires_at,
    (l.received_at + interval '90 days') as refund_deadline,
    greatest(0, floor(extract(epoch from ((l.received_at + interval '90 days') - now())) / 86400))::integer as days_left,
    g.shopify_order_name,
    g.sku
  from public.coin_lots l
  join public.coin_ledger src on src.id = l.source_ledger_id
  join public.coin_grants g on g.id = src.grant_id
  where l.user_id = auth.uid()
    and l.remaining_coins > 0
    and l.expires_at > now()
    and l.received_at >= now() - interval '90 days'
    and g.sku ilike '%VIBE-COINS-%'
  order by l.received_at desc, l.id;
end; $$;
revoke all on function public.get_my_refundable_lots() from public, anon;
grant execute on function public.get_my_refundable_lots() to authenticated;

-- 5. Refund executor: full or partial refund of one lot's unspent remainder.
-- p_coins null/omitted = refund everything still remaining (the pro-rated
-- remainder after FIFO spending). p_coins set = partial refund of that much.
create or replace function public.refund_coin_lot(p_lot_id uuid, p_coins numeric default null)
returns public.coin_refunds
language plpgsql security definer set search_path = public as $$
declare
  v_lot public.coin_lots%rowtype;
  v_grant public.coin_grants%rowtype;
  v_src public.coin_ledger%rowtype;
  v_amount numeric(12,2);
  v_ledger_id uuid;
  v_refund public.coin_refunds%rowtype;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_lot_id is null then raise exception 'lot required'; end if;

  select * into v_lot from public.coin_lots where id = p_lot_id for update;
  if not found then raise exception 'lot not found'; end if;
  if v_lot.user_id <> auth.uid() then raise exception 'forbidden'; end if;
  if v_lot.remaining_coins <= 0 then raise exception 'lot already spent or refunded'; end if;
  if v_lot.received_at < now() - interval '90 days' then
    raise exception 'refund window expired (90 days)';
  end if;
  if v_lot.expires_at <= now() then raise exception 'lot expired'; end if;

  select * into v_src from public.coin_ledger where id = v_lot.source_ledger_id;
  if not found or v_src.grant_id is null then raise exception 'free coins cannot be refunded'; end if;
  select * into v_grant from public.coin_grants where id = v_src.grant_id;
  if not found or v_grant.sku not ilike '%VIBE-COINS-%' then
    raise exception 'free coins cannot be refunded';
  end if;

  if p_coins is null then
    v_amount := v_lot.remaining_coins;
  else
    v_amount := round(p_coins, 2);
    if v_amount <= 0 then raise exception 'invalid refund amount'; end if;
    if v_amount > v_lot.remaining_coins then raise exception 'refund exceeds unspent remainder'; end if;
  end if;
  -- Centicentcoin resolution: never refund fractional cents below 0.01 coin.
  v_amount := round(v_amount, 2);
  if v_amount < 0.01 then raise exception 'refund below minimum (0.01 coins)'; end if;

  -- Mark the lot refunded first so concurrent refunds serialize on the row
  -- lock and cannot over-refund the same remainder.
  update public.coin_lots
  set remaining_coins = round(remaining_coins - v_amount, 2),
      refunded_coins = round(refunded_coins + v_amount, 2),
      refunded_at = now()
  where id = v_lot.id;

  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_amount, substr('Coin refund: lot ' || left(v_lot.id::text, 8), 1, 120))
  returning id into v_ledger_id;

  insert into public.coin_refunds (user_id, lot_id, ledger_id, coins, usd_cents)
  values (auth.uid(), v_lot.id, v_ledger_id, v_amount, round(v_amount)::integer)
  returning * into v_refund;
  return v_refund;
end; $$;
revoke all on function public.refund_coin_lot(uuid, numeric) from public, anon;
grant execute on function public.refund_coin_lot(uuid, numeric) to authenticated;

-- 6. Refund history for the account page (refunded lots marked + past refunds).
create or replace function public.get_my_coin_refunds()
returns table (
  refund_id uuid,
  lot_id uuid,
  coins numeric,
  usd_cents integer,
  created_at timestamptz,
  order_name text,
  sku text
)
language sql security definer set search_path = public as $$
  select r.id, r.lot_id, r.coins, r.usd_cents, r.created_at,
    g.shopify_order_name, g.sku
  from public.coin_refunds r
  left join public.coin_lots l on l.id = r.lot_id
  left join public.coin_ledger src on src.id = l.source_ledger_id
  left join public.coin_grants g on g.id = src.grant_id
  where r.user_id = auth.uid()
  order by r.created_at desc
  limit 100;
$$;
revoke all on function public.get_my_coin_refunds() from public, anon;
grant execute on function public.get_my_coin_refunds() to authenticated;
