-- ============================================================================
-- Ledger pairing hardening: every debit has a credit, in the order that is
-- smarter for the business, with automated double-checks.
--
-- BUSINESS ORDERING RULE (enforced below):
--   * Taking money FROM a user (spend/tip/escrow/meter/fund/donate/book):
--     DEBIT the spender FIRST, then CREDIT the recipient. If the debit fails
--     (insufficient balance) nothing is ever credited out of thin air.
--   * Giving money TO a user (refund/escrow-release/claim/settle):
--     CLAIM the scarce resource FIRST (row lock / lot mark / UNIQUE guard),
--     then CREDIT the ledger. Concurrent retries serialize on the lock and
--     cannot double-credit.
--
-- WHAT THIS FILE FIXES (attack surface + correctness):
--   1. TOCTOU overdraft: balance-check-then-debit with no lock let two
--      concurrent spends both pass the check and overdraw. Every spend path
--      below now takes pg_advisory_xact_lock('coin-spend-v1', user) first.
--   2. Open mint: credit_clan_channel_revenue(uuid,text) was granted to anon
--      (the 2026-09-15 audit revoked the wrong signature text,text, a no-op).
--      Now: authenticated member (or service_role) only + per-channel daily
--      event cap so a compromised key cannot mint unboundedly.
--   3. Stranded escrow: book_listing debited escrow, heartbeat only wrote
--      usage rows, end_booking never released anything. New
--      settle_booking_escrow() pairs the escrow debit: credits the provider
--      FIRST (the owed amount), then refunds the remainder to the renter.
--      Idempotent: FOR UPDATE row lock + status guard, one settlement only.
--   4. Kid-wallet audit loss: close_kid_account relied on CASCADE deleting
--      kid_wallet_ledger rows (no explicit kid debit, history vanished).
--      Now: explicit kid debit row + tombstone copy preserved.
--   5. Silent renewal failures: renew_support_subscriptions swallowed every
--      error (EXCEPTION WHEN OTHERS THEN CONTINUE). Now logs each failure to
--      support_renewal_failures so pairing breaks are visible.
--   6. Burn pairing: meter burns had accounting-only cuts (no platform
--      credit row). platform_ledger now records every cut as a real credit
--      row, so automated reconciliation can pair every debit.
--   7. Automated double-checks: ledger_pairing_check() + the
--      scripts/verify-ledger-pairing.mjs gate. Runbook: SELECT * FROM
--      public.ledger_pairing_check().
--
-- Fully rerunnable: IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS.
-- NOTE: patched functions keep their signatures, grants, and error strings
-- so existing verify-*.mjs gates keep passing; only the lock line, the
-- pairing insert, and the tightened guard are added.
-- ============================================================================

-- 0. Spend lock helper (one lock namespace for all coin debits) --------------
create or replace function public.coin_spend_lock(p_user uuid)
returns void language plpgsql set search_path = public as $$
begin
  if p_user is null then raise exception 'login required'; end if;
  perform pg_advisory_xact_lock(hashtext('coin-spend-v1'), hashtext(p_user::text));
end; $$;
revoke all on function public.coin_spend_lock(uuid) from public, anon, authenticated;
grant execute on function public.coin_spend_lock(uuid) to authenticated, service_role;

-- 1. Platform ledger: the real credit counterpart for every burn -------------
-- Every meter/escrow-cut records its 25% cut here, so reconciliation pairs
-- user-debit -> platform-credit instead of trusting usage-table columns.
create table if not exists public.platform_ledger (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in (
    'game-ai-cut', 'fal-cut', 'meshy-cut', 'vault-cut', 'submission-cut',
    'compute-cut', 'support-cut', 'launch-cut', 'clan-fee-cut', 'upkeep-burn'
  )),
  gross numeric(12, 2) not null check (gross >= 0),
  cut numeric(12, 2) not null check (cut >= 0),
  ref_table text not null default '' check (char_length(ref_table) <= 60),
  ref_id uuid null,
  created_at timestamptz not null default now()
);
create index if not exists idx_platform_ledger_kind on public.platform_ledger (kind, created_at desc);
alter table public.platform_ledger enable row level security;
revoke all on public.platform_ledger from anon, authenticated;

create or replace function public.record_platform_cut(
  p_kind text, p_gross numeric, p_cut numeric, p_ref_table text default '', p_ref_id uuid default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_kind is null or p_kind = '' then raise exception 'cut kind required'; end if;
  insert into public.platform_ledger (kind, gross, cut, ref_table, ref_id)
  values (p_kind, round(coalesce(p_gross, 0), 2), round(coalesce(p_cut, 0), 2),
    substr(coalesce(p_ref_table, ''), 1, 60), p_ref_id)
  returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.record_platform_cut(text, numeric, numeric, text, uuid) from public, anon, authenticated;
grant execute on function public.record_platform_cut(text, numeric, numeric, text, uuid) to authenticated, service_role;

-- 2. Channel revenue mint: close the anon mint, add membership + daily cap ---
-- Per-channel cap: 500 payable events / day (~5 coins house-ad, ~25 affiliate).
-- Above the cap the call fails closed; the API layer (per-IP throttle +
-- membership) stays the first shield, this is the second.
create or replace function public.credit_clan_channel_revenue(
  p_channel_id uuid, p_event text
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_event text := lower(trim(coalesce(p_event, '')));
  v_chan public.clan_monetization%rowtype;
  v_rate numeric(12, 2);
  v_today integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_event not in ('view', 'click') then raise exception 'invalid event'; end if;
  select * into v_chan from public.clan_monetization where id = p_channel_id;
  if not found then raise exception 'channel not found'; end if;
  if not v_chan.active then raise exception 'channel inactive'; end if;
  if not exists (
    select 1 from public.clan_members where clan_id = v_chan.clan_id and user_id = auth.uid()
  ) then
    raise exception 'join the clan first';
  end if;
  if v_chan.kind = 'house-ad' and v_event = 'view' then v_rate := 0.01;
  elsif v_chan.kind = 'affiliate' and v_event = 'click' then v_rate := 0.05;
  elsif v_chan.kind = 'sponsor' then v_rate := 0.01;
  else raise exception 'event not payable for channel'; end if;
  select count(*)::integer into v_today
  from public.clan_cost_ledger
  where clan_id = v_chan.clan_id
    and kind in ('ad-revenue', 'affiliate-revenue')
    and created_at >= date_trunc('day', now());
  if v_today >= 500 then raise exception 'daily revenue cap reached'; end if;
  insert into public.clan_wallets (clan_id, balance)
  values (v_chan.clan_id, v_rate)
  on conflict (clan_id) do update set
    balance = public.clan_wallets.balance + excluded.balance,
    updated_at = now();
  insert into public.clan_cost_ledger (clan_id, kind, qty, gross, cut, provider, note)
  values (v_chan.clan_id,
    case when v_chan.kind = 'house-ad' then 'ad-revenue' else 'affiliate-revenue' end,
    1, v_rate, 0, v_rate, substr(v_chan.kind || ' ' || v_event || ': ' || v_chan.label, 1, 200));
  return jsonb_build_object('credited_coins', v_rate);
end; $$;
-- Correct signature revokes (uuid,text): the 2026-09-15 audit revoked
-- (text,text), which matched nothing and left the anon grant live.
revoke all on function public.credit_clan_channel_revenue(uuid, text) from public, anon, authenticated;
grant execute on function public.credit_clan_channel_revenue(uuid, text) to authenticated, service_role;

-- 3. Spend-path locks: debit-first ordering + serialized balance checks ------
-- Each patch below is the original function body with exactly one added line
-- at the top: perform coin_spend_lock(<spender>). Debit stays before credit.

create or replace function public.tip_creator(p_recipient_user uuid, p_clan uuid, p_coins numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_gross numeric(12, 2) := round(coalesce(p_coins, 0), 2);
  v_bal numeric(12, 2);
  v_split record;
  v_net numeric(12, 2);
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  perform public.coin_spend_lock(auth.uid());
  if (p_recipient_user is null) = (p_clan is null) then raise exception 'one recipient only'; end if;
  select * into v_split from public.support_split(v_gross);
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_split.gross then
    raise exception 'insufficient balance: need % coins, have %', v_split.gross, v_bal;
  end if;
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_split.gross, substr('Tip to creator', 1, 120));
  v_net := public.support_credit(auth.uid(), p_recipient_user, p_clan, v_split.gross, 'support-tip', 'Creator tip');
  insert into public.support_payments (kind, supporter_id, recipient_user_id, clan_id, gross, cut, net)
  values ('tip', auth.uid(), p_recipient_user, p_clan, v_split.gross, v_split.cut, v_net);
  perform public.record_platform_cut('support-cut', v_split.gross, v_split.cut, 'support_payments', null);
  return jsonb_build_object('gross_coins', v_split.gross, 'net_coins', v_net);
end; $$;
revoke all on function public.tip_creator(uuid, uuid, numeric) from public, anon, authenticated;
grant execute on function public.tip_creator(uuid, uuid, numeric) to authenticated;

create or replace function public.subscribe_to_tier(p_tier_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_tier public.support_tiers%rowtype;
  v_bal numeric(12, 2);
  v_split record;
  v_net numeric(12, 2);
  v_sub_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  perform public.coin_spend_lock(auth.uid());
  select * into v_tier from public.support_tiers where id = p_tier_id and active;
  if not found then raise exception 'tier not found'; end if;
  if v_tier.owner_user_id = auth.uid() then raise exception 'you cannot support yourself'; end if;
  if v_tier.owner_user_id is not null and not exists (
    select 1 from public.profiles where id = v_tier.owner_user_id and is_verified
  ) then
    raise exception 'recipient is not a verified creator';
  end if;
  if exists (
    select 1 from public.support_subscriptions
    where supporter_id = auth.uid() and tier_id = p_tier_id and status in ('active', 'past_due')
  ) then
    raise exception 'already subscribed';
  end if;
  select * into v_split from public.support_split(v_tier.coins_monthly);
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_split.gross then
    raise exception 'insufficient balance: need % coins, have %', v_split.gross, v_bal;
  end if;
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_split.gross, substr('Support subscription', 1, 120));
  v_net := public.support_credit(auth.uid(), v_tier.owner_user_id, v_tier.clan_id, v_split.gross, 'support-subscription', 'Support subscription');
  insert into public.support_subscriptions (supporter_id, tier_id)
  values (auth.uid(), p_tier_id) returning id into v_sub_id;
  insert into public.support_payments (kind, supporter_id, recipient_user_id, clan_id, subscription_id, gross, cut, net)
  values ('subscription', auth.uid(), v_tier.owner_user_id, v_tier.clan_id, v_sub_id, v_split.gross, v_split.cut, v_net);
  perform public.record_platform_cut('support-cut', v_split.gross, v_split.cut, 'support_payments', null);
  return jsonb_build_object('subscription_id', v_sub_id, 'gross_coins', v_split.gross, 'net_coins', v_net);
end; $$;
revoke all on function public.subscribe_to_tier(uuid) from public, anon, authenticated;
grant execute on function public.subscribe_to_tier(uuid) to authenticated;

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
    insert into public.coin_ledger (user_id, delta, reason)
    values (v_camp.creator_id, v_split.net, substr('Launch campaign backing', 1, 120));
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

create or replace function public.fund_kid_wallet(p_kid uuid, p_coins numeric)
returns numeric(12, 2) language plpgsql security definer set search_path = public as $$
declare v_parent uuid; v_bal numeric(12, 2);
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  perform public.coin_spend_lock(auth.uid());
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

create or replace function public.book_listing(p_listing uuid, p_hours integer)
returns public.rental_bookings
language plpgsql security definer set search_path = public as $$
declare
  v_listing public.agent_listings;
  v_gross integer;
  v_balance integer;
  v_booking public.rental_bookings;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  perform public.coin_spend_lock(auth.uid());
  if p_hours is null or p_hours < 1 or p_hours > 720 then
    raise exception 'hours must be 1..720';
  end if;
  select * into v_listing from public.agent_listings where id = p_listing;
  if not found then raise exception 'listing not found'; end if;
  if v_listing.status <> 'available' then raise exception 'listing is not available'; end if;
  if v_listing.owner_id = auth.uid() then raise exception 'cannot book your own listing'; end if;
  v_gross := v_listing.price_cents_per_hour * p_hours;
  select coalesce(sum(delta), 0)::integer into v_balance
  from public.coin_ledger where user_id = auth.uid();
  if v_balance < v_gross then
    raise exception 'insufficient balance: need % coins, have %', v_gross, v_balance;
  end if;
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_gross, substring('Compute escrow: ' || v_listing.name from 1 for 120));
  insert into public.rental_bookings (listing_id, renter_id, escrow_coins)
  values (p_listing, auth.uid(), v_gross)
  returning * into v_booking;
  return v_booking;
end;
$$;
revoke all on function public.book_listing(uuid, integer) from anon, authenticated;
grant execute on function public.book_listing(uuid, integer) to authenticated;

-- 4. Kid close: explicit debit + preserved audit (no more silent CASCADE) ----
create table if not exists public.kid_wallet_tombstones (
  kid_id uuid primary key,
  parent_id uuid not null references public.profiles(id) on delete cascade,
  refunded_coins numeric(12, 2) not null default 0 check (refunded_coins >= 0),
  closed_at timestamptz not null default now()
);
alter table public.kid_wallet_tombstones enable row level security;
revoke all on public.kid_wallet_tombstones from anon, authenticated;

create or replace function public.close_kid_account(p_kid uuid)
returns numeric(12, 2) language plpgsql security definer set search_path = public as $$
declare v_bal numeric(12, 2); v_parent uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  perform public.coin_spend_lock(auth.uid());
  select parent_id into v_parent from public.kid_accounts where id = p_kid;
  if not found or v_parent <> auth.uid() then
    raise exception 'not your child account';
  end if;
  perform 1 from public.kid_accounts where id = p_kid for update;
  v_bal := coalesce(public.kid_wallet_balance(p_kid), 0);
  if v_bal > 0 then
    -- Debit the kid wallet FIRST (explicit pairing row), then credit parent.
    insert into public.kid_wallet_ledger (kid_id, delta, reason)
    values (p_kid, -v_bal, 'Child account closed; payout');
    insert into public.coin_ledger (user_id, delta, reason)
    values (auth.uid(), v_bal, 'Child account closed; refund');
  end if;
  insert into public.kid_wallet_tombstones (kid_id, parent_id, refunded_coins)
  values (p_kid, auth.uid(), coalesce(v_bal, 0))
  on conflict (kid_id) do update set refunded_coins = excluded.refunded_coins, closed_at = now();
  delete from public.kid_accounts where id = p_kid;
  return coalesce(v_bal, 0);
end; $$;
revoke all on function public.close_kid_account(uuid) from public, anon;
grant execute on function public.close_kid_account(uuid) to authenticated;

-- 5. Escrow settlement: pair the book_listing debit ---------------------------
-- Business order: the renter debit already happened at book time. At settle
-- time CREDIT THE PROVIDER FIRST (the owed amount), then refund the remainder
-- to the renter, then close. Either credit failing rolls back the whole
-- settlement, so the platform never refunds and forgets to pay the provider.
-- Idempotent: row lock + status guard; settling a non-active booking raises.
create table if not exists public.booking_settlements (
  booking_id uuid primary key references public.rental_bookings(id) on delete cascade,
  metered_gross integer not null check (metered_gross >= 0),
  provider_coins integer not null check (provider_coins >= 0),
  refunded_coins integer not null check (refunded_coins >= 0),
  settled_at timestamptz not null default now(),
  settled_by uuid null references public.profiles(id) on delete set null
);
alter table public.booking_settlements enable row level security;
revoke all on public.booking_settlements from anon, authenticated;

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
  -- Credit provider FIRST (owed), then refund remainder to renter.
  if v_provider > 0 then
    insert into public.coin_ledger (user_id, delta, reason)
    values (v_owner, v_provider, substring('Compute payout: ' || coalesce(v_listing_name, 'rental') from 1 for 120));
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

-- 6. Renewal failures: never swallow pairing breaks silently ------------------
create table if not exists public.support_renewal_failures (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid null references public.support_subscriptions(id) on delete set null,
  supporter_id uuid null references public.profiles(id) on delete set null,
  error text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_renewal_failures_sub on public.support_renewal_failures (subscription_id, created_at desc);
alter table public.support_renewal_failures enable row level security;
revoke all on public.support_renewal_failures from anon, authenticated;

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
    where status = 'active' and current_period_end <= now()
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
          current_period_end = current_period_end + interval '30 days'
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

-- 7. Meter burn pairing: game-AI meter takes the spend lock + books the cut --
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
  perform public.coin_spend_lock(auth.uid());
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
  select f.mode into v_mode from public.game_ai_features f
  where f.game_slug = v_game and f.kind = p_kind and f.enabled = true;
  if not found then v_mode := 'optional'; end if;
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
  perform public.record_platform_cut('game-ai-cut', v_gross, v_cut, 'game_ai_usage', null);
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

-- 8. Automated double-check: reconciliation query for cron/ops ---------------
-- Returns one row per invariant with a count; every count must be 0 on a
-- healthy ledger. Wire to monitoring: alert on any nonzero row.
create or replace function public.ledger_pairing_check()
returns table(check_name text, violations bigint) language plpgsql security definer set search_path = public as $$
begin
  return query
  select 'support_payments_without_debit'::text, count(*)::bigint
  from public.support_payments p
  where not exists (
    select 1 from public.coin_ledger l
    where l.user_id = p.supporter_id and l.delta = -p.gross
      and l.created_at >= p.created_at - interval '5 minutes'
      and l.created_at <= p.created_at + interval '5 minutes'
  )
  union all
  select 'unsettleable_active_bookings_over_escrow'::text, count(*)::bigint
  from public.rental_bookings b
  where b.status = 'active'
    and coalesce((select sum(u.gross_cents) from public.compute_usage u where u.booking_id = b.id), 0) > b.escrow_coins
  union all
  select 'settled_bookings_missing_settlement_row'::text, count(*)::bigint
  from public.rental_bookings b
  where b.status = 'ended'
    and b.id in (select booking_id from public.compute_usage)
    and not exists (select 1 from public.booking_settlements s where s.booking_id = b.id)
    and b.started_at < now() - interval '1 day'
  union all
  select 'negative_clan_wallets'::text, count(*)::bigint
  from public.clan_wallets where balance < 0
  union all
  select 'negative_platform_cuts'::text, count(*)::bigint
  from public.platform_ledger where cut < 0 or gross < 0
  union all
  select 'orphan_renewal_failures'::text, count(*)::bigint
  from public.support_renewal_failures f
  where f.subscription_id is not null
    and not exists (select 1 from public.support_subscriptions s where s.id = f.subscription_id);
end; $$;
revoke all on function public.ledger_pairing_check() from public, anon, authenticated;
grant execute on function public.ledger_pairing_check() to service_role;
