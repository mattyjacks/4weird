-- ============================================================================
-- Refund USD-cents rounding fix.
--
-- At 1 coin = 1 cent, refundable_usd_cents used round(), so 10.50 coins
-- reported 11 cents - overstating fractional refunds. Both spots now use
-- floor(): the buyer never sees a cent they were not owed. These re-issue
-- get_my_refundable_lots() and refund_coin_lot() from 20261012000000 with
-- only that change; later file wins by migration order. Fully rerunnable.
-- ============================================================================

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
    floor(l.remaining_coins)::integer as refundable_usd_cents,
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
  values (auth.uid(), v_lot.id, v_ledger_id, v_amount, floor(v_amount)::integer)
  returning * into v_refund;
  return v_refund;
end; $$;
revoke all on function public.refund_coin_lot(uuid, numeric) from public, anon;
grant execute on function public.refund_coin_lot(uuid, numeric) to authenticated;
