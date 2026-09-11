-- ============================================================================
-- 👑 Crowns (earn) vs 🪙 Coins (spend) split.
--
-- MODEL:
--   * Coins (coin_ledger / coin_lots): SPEND ONLY. Bought, gifted as tips,
--     metered for play/compute. Never cash-out, never payout-eligible.
--     Unchanged by this file.
--   * Crowns (crown_ledger / crown_lots): EARN ONLY. Cannot be bought, cannot
--     be sent, cannot be spent on-site. Minted ONLY when Coins are gifted:
--     support tips/subs (net), launch backing (net, creator-direct),
--     compute escrow settlement (provider share). The ONLY exit is a fiat
--     payout via a licensed payout provider (Stripe/Hyperwallet/Tipalti) after
--     KYC + allowlisted country. No on-chain token, no reverse conversion.
--
-- TIME LOCKS (enforced here, not in client code):
--   * unlocks_at = received_at + 30 days (fraud/chargeback clearing).
--     Before that the lot counts as LOCKED, never payout-eligible.
--   * clawback window = 90 days (mirrors COIN_REFUND_WINDOW_DAYS). If the
--     source Coin lot refunds inside 90 days, crowns are clawed back from the
--     source lot first, then oldest lots, then carried as ledger debt.
--   * expires_at = received_at + 1 year (same as coin lots). Expired crowns
--     vanish without a payout row.
--   * Cutover: NO retroactive port. Old coin_ledger support credits stay as Coins
--     (spendable, never payout-eligible). Only mints after this migration
--     create Crowns. This keeps the old "never cash-out" promise intact.
--
-- Fully rerunnable: IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS.
-- Never ALTER/CREATE/DROP coin tables (inserts/selects only on them).
-- ============================================================================

-- 0. Earn ledger (append-only, no client writes) ------------------------------
create table if not exists public.crown_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta numeric(12,2) not null check (delta <> 0 and delta >= -1000000 and delta <= 1000000),
  reason varchar(120) not null check (char_length(reason) <= 120),
  ref_table text not null default '' check (char_length(ref_table) <= 60),
  ref_id uuid null,
  created_at timestamptz not null default now()
);
create index if not exists idx_crown_ledger_user on public.crown_ledger (user_id, created_at desc);
create index if not exists idx_crown_ledger_ref on public.crown_ledger (ref_table, ref_id);

-- 1. Earn lots (time-locked, FIFO payout, clawback-aware) ---------------------
create table if not exists public.crown_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_ledger_id uuid unique references public.crown_ledger(id) on delete cascade,
  original_crowns numeric(12,2) not null check (original_crowns > 0),
  remaining_crowns numeric(12,2) not null check (remaining_crowns >= 0),
  paid_crowns numeric(12,2) not null default 0 check (paid_crowns >= 0),
  clawed_crowns numeric(12,2) not null default 0 check (clawed_crowns >= 0),
  received_at timestamptz not null,
  unlocks_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (unlocks_at = received_at + interval '30 days'),
  check (expires_at = received_at + interval '1 year')
);
create index if not exists idx_crown_lots_eligible on public.crown_lots(user_id, unlocks_at, expires_at, id)
  where remaining_crowns > 0;
create index if not exists idx_crown_lots_received on public.crown_lots(user_id, received_at desc);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'crown_lots_paid_cap') then
    alter table public.crown_lots
      add constraint crown_lots_paid_cap check (paid_crowns + clawed_crowns <= original_crowns);
  end if;
end $$;

-- 2. Payout requests (fiat provider fulfills out-of-band) ---------------------
create table if not exists public.crown_payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  crowns numeric(12,2) not null check (crowns >= 1 and crowns <= 1000000),
  usd_cents integer not null check (usd_cents >= 0),
  status text not null default 'pending' check (status in ('pending','paid','rejected','cancelled')),
  ledger_id uuid null references public.crown_ledger(id) on delete set null,
  provider text not null default '' check (char_length(provider) <= 60),
  provider_ref text not null default '' check (char_length(provider_ref) <= 200),
  created_at timestamptz not null default now(),
  decided_at timestamptz null
);
create index if not exists idx_crown_payouts_user on public.crown_payouts (user_id, created_at desc);
create index if not exists idx_crown_payouts_status on public.crown_payouts (status, created_at desc);

-- 3. RLS: deny-by-default, self-read only, no client writes -------------------
alter table public.crown_ledger enable row level security;
alter table public.crown_lots enable row level security;
alter table public.crown_payouts enable row level security;

drop policy if exists crown_ledger_select_own on public.crown_ledger;
create policy crown_ledger_select_own on public.crown_ledger
  for select to authenticated using (user_id = auth.uid());
drop policy if exists crown_lots_select_own on public.crown_lots;
create policy crown_lots_select_own on public.crown_lots
  for select to authenticated using (user_id = auth.uid());
drop policy if exists crown_payouts_select_own on public.crown_payouts;
create policy crown_payouts_select_own on public.crown_payouts
  for select to authenticated using (user_id = auth.uid());

revoke all on public.crown_ledger from anon, authenticated;
revoke all on public.crown_lots from anon, authenticated;
revoke all on public.crown_payouts from anon, authenticated;
grant select on public.crown_ledger to authenticated;
grant select on public.crown_lots to authenticated;
grant select on public.crown_payouts to authenticated;

-- 4. Mint: the ONLY way Crowns come into existence -----------------------------
-- Called by support_credit / launch / escrow settlement AFTER the spender's
-- Coin debit succeeded (debit-first ordering). Never callable with a Coin
-- purchase, trial, daily, referral, or admin grant as source.
create or replace function public.mint_crown(
  p_user uuid, p_amount numeric, p_reason text, p_ref_table text default '', p_ref_id uuid default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_amt numeric(12,2) := round(coalesce(p_amount, 0), 2); v_id uuid;
begin
  if p_user is null then raise exception 'recipient required'; end if;
  if v_amt < 0.01 or v_amt > 1000000 then raise exception 'crown amount must be 0.01..1000000'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'recipient not found'; end if;
  insert into public.crown_ledger (user_id, delta, reason, ref_table, ref_id)
  values (p_user, v_amt, substr(coalesce(p_reason, 'Creator earnings'), 1, 120),
    substr(coalesce(p_ref_table, ''), 1, 60), p_ref_id)
  returning id into v_id;
  insert into public.crown_lots (user_id, source_ledger_id, original_crowns, remaining_crowns, received_at, unlocks_at, expires_at)
  values (p_user, v_id, v_amt, v_amt, now(), now() + interval '30 days', now() + interval '1 year');
  return v_id;
end; $$;
revoke all on function public.mint_crown(uuid, numeric, text, text, uuid) from public, anon, authenticated;
grant execute on function public.mint_crown(uuid, numeric, text, text, uuid) to authenticated, service_role;

-- 5. Balances: locked vs eligible vs lifetime ----------------------------------
create or replace function public.get_my_crown_balances()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_locked numeric(12,2); v_eligible numeric(12,2); v_earned numeric(12,2); v_paid numeric(12,2);
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select coalesce(sum(remaining_crowns), 0)::numeric(12,2) into v_locked from public.crown_lots
  where user_id = auth.uid() and remaining_crowns > 0 and expires_at > now() and unlocks_at > now();
  select coalesce(sum(remaining_crowns), 0)::numeric(12,2) into v_eligible from public.crown_lots
  where user_id = auth.uid() and remaining_crowns > 0 and expires_at > now() and unlocks_at <= now();
  select coalesce(sum(delta), 0)::numeric(12,2) into v_earned from public.crown_ledger
  where user_id = auth.uid() and delta > 0;
  select coalesce(sum(crowns), 0)::numeric(12,2) into v_paid from public.crown_payouts
  where user_id = auth.uid() and status in ('pending', 'paid');
  return jsonb_build_object(
    'locked_crowns', coalesce(v_locked, 0),
    'eligible_crowns', coalesce(v_eligible, 0),
    'lifetime_earned', coalesce(v_earned, 0),
    'lifetime_payout_requested', coalesce(v_paid, 0),
    'usd_per_100_crowns_cents', 100,
    'eligible_usd_cents', round(coalesce(v_eligible, 0))::integer
  );
end; $$;
revoke all on function public.get_my_crown_balances() from public, anon;
grant execute on function public.get_my_crown_balances() to authenticated;

create or replace function public.get_my_eligible_crown_lots()
returns table (lot_id uuid, remaining_crowns numeric, received_at timestamptz, unlocks_at timestamptz, expires_at timestamptz)
language sql security definer set search_path = public as $$
  select id, remaining_crowns, received_at, unlocks_at, expires_at from public.crown_lots
  where user_id = auth.uid() and remaining_crowns > 0 and unlocks_at <= now() and expires_at > now()
  order by unlocks_at asc, received_at asc, id asc limit 200;
$$;
revoke all on function public.get_my_eligible_crown_lots() from public, anon;
grant execute on function public.get_my_eligible_crown_lots() to authenticated;

-- 6. Payout request: FIFO-consume ELIGIBLE lots only, min 5000 crowns ($50) ----
-- Writes the payout row first (row lock for idempotency), then consumes lots,
-- then writes the negative crown_ledger debit. A provider webhook / ops
-- dashboard flips pending -> paid out-of-band. No crypto, no on-site spend,
-- adult-verified recipients enforced at the API layer.
create table if not exists public.crown_lot_payouts (
  payout_id uuid not null references public.crown_payouts(id) on delete cascade,
  lot_id uuid not null references public.crown_lots(id) on delete restrict,
  crowns numeric(12,2) not null check (crowns > 0),
  created_at timestamptz not null default now(),
  primary key (payout_id, lot_id)
);
alter table public.crown_lot_payouts enable row level security;
revoke all on public.crown_lot_payouts from anon, authenticated;

create or replace function public.request_crown_payout(p_crowns numeric)
returns public.crown_payouts language plpgsql security definer set search_path = public as $$
declare
  v_amt numeric(12,2) := round(coalesce(p_crowns, 0), 2);
  v_need numeric(12,2); v_lot record; v_used numeric(12,2);
  v_ledger_id uuid; v_row public.crown_payouts%rowtype;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_amt < 5000 then raise exception 'minimum payout is 5000 crowns ($50)'; end if;
  if v_amt > 1000000 then raise exception 'payout exceeds maximum'; end if;
  perform pg_advisory_xact_lock(hashtext('crown-payout-v1'), hashtext(auth.uid()::text));
  insert into public.crown_payouts (user_id, crowns, usd_cents, status)
  values (auth.uid(), v_amt, round(v_amt)::integer, 'pending') returning * into v_row;
  v_need := v_amt;
  for v_lot in select id, remaining_crowns from public.crown_lots
    where user_id = auth.uid() and remaining_crowns > 0 and unlocks_at <= now() and expires_at > now()
    order by unlocks_at asc, received_at asc, id asc for update
  loop
    exit when v_need <= 0;
    v_used := least(v_need, v_lot.remaining_crowns);
    update public.crown_lots set remaining_crowns = round(remaining_crowns - v_used, 2),
      paid_crowns = round(paid_crowns + v_used, 2) where id = v_lot.id;
    insert into public.crown_lot_payouts (payout_id, lot_id, crowns) values (v_row.id, v_lot.id, v_used);
    v_need := round(v_need - v_used, 2);
  end loop;
  if v_need > 0 then raise exception 'insufficient eligible crowns (locked or expired crowns do not count)'; end if;
  insert into public.crown_ledger (user_id, delta, reason, ref_table, ref_id)
  values (auth.uid(), -v_amt, 'Crown payout request', 'crown_payouts', v_row.id) returning id into v_ledger_id;
  update public.crown_payouts set ledger_id = v_ledger_id where id = v_row.id;
  select * into v_row from public.crown_payouts where id = v_row.id;
  return v_row;
end; $$;
revoke all on function public.request_crown_payout(numeric) from public, anon;
grant execute on function public.request_crown_payout(numeric) to authenticated;

-- 7. Clawback: reverse fraud/refund-sourced Crowns (service_role / ops only) ---
-- Tries the source lot first, then oldest remaining, then carries ledger debt
-- (future earnings offset it). Called when a source Coin lot refunds inside
-- 90 days or a chargeback lands.
create or replace function public.clawback_crown(p_user uuid, p_amount numeric, p_reason text default 'Fraud/refund clawback')
returns numeric language plpgsql security definer set search_path = public as $$
declare
  v_amt numeric(12,2) := round(coalesce(p_amount, 0), 2);
  v_need numeric(12,2) := v_amt; v_lot record; v_used numeric(12,2);
begin
  if p_user is null then raise exception 'user required'; end if;
  if v_amt < 0.01 then raise exception 'invalid clawback amount'; end if;
  perform pg_advisory_xact_lock(hashtext('crown-payout-v1'), hashtext(p_user::text));
  for v_lot in select id, remaining_crowns from public.crown_lots
    where user_id = p_user and remaining_crowns > 0 and expires_at > now()
    order by received_at asc, id asc for update
  loop
    exit when v_need <= 0;
    v_used := least(v_need, v_lot.remaining_crowns);
    update public.crown_lots set remaining_crowns = round(remaining_crowns - v_used, 2),
      clawed_crowns = round(clawed_crowns + v_used, 2) where id = v_lot.id;
    v_need := round(v_need - v_used, 2);
  end loop;
  insert into public.crown_ledger (user_id, delta, reason, ref_table)
  values (p_user, -v_amt, substr(coalesce(p_reason, 'Fraud/refund clawback'), 1, 120), 'clawback');
  return v_amt - v_need;
end; $$;
revoke all on function public.clawback_crown(uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.clawback_crown(uuid, numeric, text) to service_role;

-- 8. Reroute USER earnings from Coins to Crowns --------------------------------
-- Clan-wallet paths are untouched (clan balances are shared spend pools, not
-- personal earn balances). Debit-first ordering + spend locks preserved.
create or replace function public.support_credit(
  p_supporter uuid, p_recipient_user uuid, p_clan uuid, p_gross numeric, p_kind text, p_note text
)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  v_split record;
  v_owner uuid;
begin
  select * into v_split from public.support_split(p_gross);
  if p_recipient_user is not null and p_clan is not null then
    raise exception 'one recipient only';
  end if;
  if p_recipient_user is not null then
    if p_recipient_user = p_supporter then raise exception 'you cannot support yourself'; end if;
    if not exists (select 1 from public.profiles where id = p_recipient_user and is_verified) then
      raise exception 'recipient is not a verified creator';
    end if;
    -- 👑 EARN: user recipients mint time-locked Crowns (never Coins).
    perform public.mint_crown(p_recipient_user, v_split.net,
      substr(coalesce(p_note, 'Creator support'), 1, 120), 'support_payments', null);
  else
    if p_clan is null then raise exception 'no recipient'; end if;
    select owner_id into v_owner from public.clans where id = p_clan;
    if v_owner is null then raise exception 'clan not found'; end if;
    if v_owner = p_supporter then raise exception 'owners fund their clan via the wallet, not tips'; end if;
    insert into public.clan_wallets (clan_id, balance)
    values (p_clan, v_split.net)
    on conflict (clan_id) do update set
      balance = public.clan_wallets.balance + excluded.balance,
      updated_at = now();
    insert into public.clan_cost_ledger (clan_id, kind, qty, gross, cut, provider, note)
    values (p_clan, p_kind, 1, v_split.gross, v_split.cut, v_split.net, substr(coalesce(p_note, 'support'), 1, 200));
  end if;
  return v_split.net;
end; $$;
revoke all on function public.support_credit(uuid, uuid, uuid, numeric, text, text) from public, anon, authenticated;
grant execute on function public.support_credit(uuid, uuid, uuid, numeric, text, text) to authenticated, service_role;

-- Creator-direct launch backing now mints Crowns (clan-campaign path unchanged).
create or replace function public.contribute_launch_campaign(p_campaign_id uuid, p_coins numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_camp public.launch_campaigns%rowtype;
  v_gross numeric(12, 2) := round(coalesce(p_coins, 0), 2);
  v_bal numeric(12, 2);
  v_split record;
  v_net numeric(12, 2);
  v_raised numeric(12, 2);
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  perform public.coin_spend_lock(auth.uid());
  select * into v_camp from public.launch_campaigns where id = p_campaign_id;
  if not found then raise exception 'campaign not found'; end if;
  if v_camp.status <> 'open' or v_camp.moderation <> 'visible' then raise exception 'campaign is not open'; end if;
  if v_camp.ends_at is not null and v_camp.ends_at <= now() then raise exception 'campaign has ended'; end if;
  if v_camp.creator_id = auth.uid() then raise exception 'you cannot back your own campaign'; end if;
  select * into v_split from public.support_split(v_gross);
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_split.gross then
    raise exception 'insufficient balance: need % coins, have %', v_split.gross, v_bal;
  end if;
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_split.gross, substr('Launch campaign backing', 1, 120));
  if v_camp.clan_id is not null then
    insert into public.clan_wallets (clan_id, balance)
    values (v_camp.clan_id, v_split.net)
    on conflict (clan_id) do update set
      balance = public.clan_wallets.balance + excluded.balance,
      updated_at = now();
    insert into public.clan_cost_ledger (clan_id, kind, qty, gross, cut, provider, note)
    values (v_camp.clan_id, 'launch-contribution', 1, v_split.gross, v_split.cut, v_split.net, substr('launch campaign backing', 1, 200));
  else
    -- 👑 EARN: creator-direct backing mints time-locked Crowns.
    perform public.mint_crown(v_camp.creator_id, v_split.net, substr('Launch campaign backing', 1, 120), 'launch_contributions', null);
  end if;
  insert into public.launch_contributions (campaign_id, supporter_id, gross, cut, net)
  values (p_campaign_id, auth.uid(), v_split.gross, v_split.cut, v_split.net);
  perform public.record_platform_cut('launch-cut', v_split.gross, v_split.cut, 'launch_contributions', null);
  select coalesce(sum(gross), 0)::numeric(12, 2) into v_raised
  from public.launch_contributions where campaign_id = p_campaign_id;
  if v_raised >= v_camp.goal_coins then
    update public.launch_campaigns set status = 'funded' where id = p_campaign_id and status = 'open';
  end if;
  return jsonb_build_object('gross_coins', v_split.gross, 'net_coins', v_split.net, 'raised_gross', v_raised);
end; $$;
revoke all on function public.contribute_launch_campaign(uuid, numeric) from public, anon, authenticated;
grant execute on function public.contribute_launch_campaign(uuid, numeric) to authenticated;

-- Compute escrow settlement: provider share mints Crowns (renter refund stays Coins).
create or replace function public.settle_booking_escrow(p_booking uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_booking public.rental_bookings;
  v_owner uuid;
  v_listing_name text;
  v_metered integer := 0;
  v_provider integer := 0;
  v_cut integer := 0;
  v_refund integer := 0;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_booking from public.rental_bookings where id = p_booking for update;
  if not found then raise exception 'booking not found'; end if;
  select l.owner_id, l.name into v_owner, v_listing_name
  from public.agent_listings l where l.id = v_booking.listing_id;
  if v_booking.renter_id <> auth.uid() and coalesce(v_owner, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid() then
    raise exception 'not authorized';
  end if;
  if v_booking.status <> 'active' then raise exception 'booking is not active'; end if;
  if exists (select 1 from public.booking_settlements where booking_id = p_booking) then
    raise exception 'booking already settled';
  end if;
  perform public.coin_spend_lock(v_booking.renter_id);
  select coalesce(sum(gross_cents), 0)::integer,
         coalesce(sum(provider_cents), 0)::integer,
         coalesce(sum(cut_cents), 0)::integer
  into v_metered, v_provider, v_cut
  from public.compute_usage where booking_id = p_booking;
  if v_metered > v_booking.escrow_coins then
    raise exception 'metered usage exceeds escrow';
  end if;
  v_refund := v_booking.escrow_coins - v_metered;
  -- 👑 EARN FIRST (owed), then refund remainder in Coins.
  if v_provider > 0 then
    perform public.mint_crown(v_owner, v_provider,
      substring('Compute payout: ' || coalesce(v_listing_name, 'rental') from 1 for 120),
      'rental_bookings', p_booking);
  end if;
  if v_refund > 0 then
    insert into public.coin_ledger (user_id, delta, reason)
    values (v_booking.renter_id, v_refund, substring('Compute escrow refund' from 1 for 120));
  end if;
  if v_cut > 0 then
    perform public.record_platform_cut('compute-cut', v_metered, v_cut, 'rental_bookings', p_booking);
  end if;
  insert into public.booking_settlements (booking_id, metered_gross, provider_coins, refunded_coins, settled_by)
  values (p_booking, v_metered, v_provider, v_refund, auth.uid());
  update public.rental_bookings set status = 'ended', ended_at = now() where id = p_booking;
  return jsonb_build_object(
    'metered_gross', v_metered, 'provider_coins', v_provider,
    'refunded_coins', v_refund, 'cut_coins', v_cut
  );
end; $$;
revoke all on function public.settle_booking_escrow(uuid) from public, anon, authenticated;
grant execute on function public.settle_booking_escrow(uuid) to authenticated;

-- 9. Reconciliation: Crowns must trace to a Coin gift --------------------------
-- NOTE: extended in §10 below with convert-aware checks (kept as OR REPLACE).
create or replace function public.crown_pairing_check()
returns table(check_name text, violations bigint) language plpgsql security definer set search_path = public as $$
begin
  return query
  select 'crown_lots_without_ledger'::text, count(*)::bigint from public.crown_lots l
  where not exists (select 1 from public.crown_ledger s where s.id = l.source_ledger_id)
  union all
  select 'crown_lots_bad_timelock'::text, count(*)::bigint from public.crown_lots
  where unlocks_at <> received_at + interval '30 days' or expires_at <> received_at + interval '1 year'
  union all
  select 'crown_payouts_without_ledger'::text, count(*)::bigint from public.crown_payouts p
  where p.ledger_id is not null and not exists (select 1 from public.crown_ledger l where l.id = p.ledger_id)
  union all
  select 'negative_crown_lots'::text, count(*)::bigint from public.crown_lots where remaining_crowns < 0;
end; $$;
revoke all on function public.crown_pairing_check() from public, anon, authenticated;
grant execute on function public.crown_pairing_check() to service_role;

-- 10. Crowns -> Coins convert (earn -> spend, on-site only) --------------------
-- LEGAL MODEL: this is the SAFE direction (closed-loop retention, not money
-- transmission). Rules enforced here:
--   * ELIGIBLE lots only: unlocks_at <= now(), expires_at > now(). Locked
--     crowns can never buy Coins, so the 30-day fraud/chargeback hold holds.
--   * 1:1, no fee, no premium: 100 Crowns = 100 Coins. The 25% platform cut
--     was already taken when the Coins were gifted, so no second cut here.
--     A bonus rate would look like interest and is rejected by design.
--   * Own account only, non-transferable: converts credit the caller's OWN
--     coin_ledger (fresh 1-year coin lot via the existing coin trigger).
--     Crowns themselves are never sent, sold, or gifted.
--   * Final, non-refundable, non-payout-eligible once converted: converted
--     Coins are ordinary spend Coins (giftable with a fresh 25% haircut if
--     re-gifted, never directly cashable). Tax event stays at EARN time.
--   * Serialized with payouts on the same advisory lock so concurrent
--     payout + convert calls cannot double-spend the same eligible lot.
alter table public.crown_lots add column if not exists converted_crowns numeric(12,2) not null default 0
  check (converted_crowns >= 0);
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'crown_lots_paid_cap') then
    alter table public.crown_lots drop constraint crown_lots_paid_cap;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'crown_lots_spent_cap') then
    alter table public.crown_lots
      add constraint crown_lots_spent_cap check (paid_crowns + clawed_crowns + converted_crowns <= original_crowns);
  end if;
end $$;

create table if not exists public.crown_converts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  crowns numeric(12,2) not null check (crowns >= 1 and crowns <= 1000000),
  coins numeric(12,2) not null check (coins >= 1 and coins <= 1000000),
  crown_ledger_id uuid null references public.crown_ledger(id) on delete set null,
  coin_ledger_id uuid null references public.coin_ledger(id) on delete set null,
  created_at timestamptz not null default now(),
  check (crowns = coins)
);
create index if not exists idx_crown_converts_user on public.crown_converts (user_id, created_at desc);

create table if not exists public.crown_lot_converts (
  convert_id uuid not null references public.crown_converts(id) on delete cascade,
  lot_id uuid not null references public.crown_lots(id) on delete restrict,
  crowns numeric(12,2) not null check (crowns > 0),
  created_at timestamptz not null default now(),
  primary key (convert_id, lot_id)
);

alter table public.crown_converts enable row level security;
alter table public.crown_lot_converts enable row level security;
drop policy if exists crown_converts_select_own on public.crown_converts;
create policy crown_converts_select_own on public.crown_converts
  for select to authenticated using (user_id = auth.uid());
revoke all on public.crown_converts from anon, authenticated;
revoke all on public.crown_lot_converts from anon, authenticated;
grant select on public.crown_converts to authenticated;

create or replace function public.convert_crown_to_coins(p_crowns numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_amt numeric(12,2) := round(coalesce(p_crowns, 0), 2);
  v_need numeric(12,2); v_lot record; v_used numeric(12,2);
  v_crown_ledger_id uuid; v_coin_ledger_id uuid; v_convert_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_amt < 1 then raise exception 'minimum convert is 1 crown'; end if;
  if v_amt > 1000000 then raise exception 'convert exceeds maximum'; end if;
  -- Serialize with payouts: same eligible pool, one spender at a time.
  perform pg_advisory_xact_lock(hashtext('crown-payout-v1'), hashtext(auth.uid()::text));
  insert into public.crown_converts (user_id, crowns, coins)
  values (auth.uid(), v_amt, v_amt) returning id into v_convert_id;
  v_need := v_amt;
  for v_lot in select id, remaining_crowns from public.crown_lots
    where user_id = auth.uid() and remaining_crowns > 0 and unlocks_at <= now() and expires_at > now()
    order by unlocks_at asc, received_at asc, id asc for update
  loop
    exit when v_need <= 0;
    v_used := least(v_need, v_lot.remaining_crowns);
    update public.crown_lots set remaining_crowns = round(remaining_crowns - v_used, 2),
      converted_crowns = round(converted_crowns + v_used, 2) where id = v_lot.id;
    insert into public.crown_lot_converts (convert_id, lot_id, crowns) values (v_convert_id, v_lot.id, v_used);
    v_need := round(v_need - v_used, 2);
  end loop;
  if v_need > 0 then raise exception 'insufficient eligible crowns (locked or expired crowns do not count)'; end if;
  -- Burn Crowns first, then mint own Coins (fresh 1-year coin lot via trigger).
  insert into public.crown_ledger (user_id, delta, reason, ref_table, ref_id)
  values (auth.uid(), -v_amt, 'Crown convert to Coins', 'crown_converts', v_convert_id)
  returning id into v_crown_ledger_id;
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), v_amt, substr('Crown conversion', 1, 120))
  returning id into v_coin_ledger_id;
  update public.crown_converts set crown_ledger_id = v_crown_ledger_id, coin_ledger_id = v_coin_ledger_id
  where id = v_convert_id;
  return jsonb_build_object('crowns', v_amt, 'coins', v_amt, 'convert_id', v_convert_id);
end; $$;
revoke all on function public.convert_crown_to_coins(numeric) from public, anon;
grant execute on function public.convert_crown_to_coins(numeric) to authenticated;

create or replace function public.get_my_crown_converts()
returns table (convert_id uuid, crowns numeric, coins numeric, created_at timestamptz)
language sql security definer set search_path = public as $$
  select id, crowns, coins, created_at from public.crown_converts
  where user_id = auth.uid() order by created_at desc limit 100;
$$;
revoke all on function public.get_my_crown_converts() from public, anon;
grant execute on function public.get_my_crown_converts() to authenticated;

-- Convert-aware reconciliation (replaces §9 body, same signature).
create or replace function public.crown_pairing_check()
returns table(check_name text, violations bigint) language plpgsql security definer set search_path = public as $$
begin
  return query
  select 'crown_lots_without_ledger'::text, count(*)::bigint from public.crown_lots l
  where not exists (select 1 from public.crown_ledger s where s.id = l.source_ledger_id)
  union all
  select 'crown_lots_bad_timelock'::text, count(*)::bigint from public.crown_lots
  where unlocks_at <> received_at + interval '30 days' or expires_at <> received_at + interval '1 year'
  union all
  select 'crown_lots_over_spent'::text, count(*)::bigint from public.crown_lots
  where paid_crowns + clawed_crowns + converted_crowns > original_crowns
  union all
  select 'crown_payouts_without_ledger'::text, count(*)::bigint from public.crown_payouts p
  where p.ledger_id is not null and not exists (select 1 from public.crown_ledger l where l.id = p.ledger_id)
  union all
  select 'crown_converts_without_ledgers'::text, count(*)::bigint from public.crown_converts c
  where c.crown_ledger_id is null or c.coin_ledger_id is null
     or not exists (select 1 from public.crown_ledger l where l.id = c.crown_ledger_id)
     or not exists (select 1 from public.coin_ledger l where l.id = c.coin_ledger_id)
  union all
  select 'crown_converts_off_par'::text, count(*)::bigint from public.crown_converts where crowns <> coins
  union all
  select 'negative_crown_lots'::text, count(*)::bigint from public.crown_lots where remaining_crowns < 0;
end; $$;
revoke all on function public.crown_pairing_check() from public, anon, authenticated;
grant execute on function public.crown_pairing_check() to service_role;
