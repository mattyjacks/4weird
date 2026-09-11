-- ============================================================================
-- Support spend checks go lots-based (expired coins must not pass).
--
-- tip_creator, subscribe_to_tier, and contribute_launch_campaign gate on
-- sum(delta) over the all-time ledger, but get_my_coin_balance() sums only
-- UNEXPIRED lots. Expired-rich users pass the gate, then the FIFO trigger
-- throws 'insufficient unexpired Vibe Coins' mid-write. These re-issues
-- check unexpired lots up front (same definition as the public balance), so
-- the gate and the trigger agree. subscribe_to_tier keeps the resubscribe
-- reactivation from 20261025000001 (this file re-states it; later file
-- wins by migration order). Fully rerunnable.
-- ============================================================================

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
  -- Lots-based (unexpired only): expired coins must not pass the gate, or
  -- the FIFO trigger throws mid-write after the user was told they can pay.
  select coalesce(sum(remaining_coins) filter (where expires_at > now()), 0)::numeric(12, 2) into v_bal
  from public.coin_lots where user_id = auth.uid();
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
  -- Lots-based (unexpired only); see tip_creator above.
  select coalesce(sum(remaining_coins) filter (where expires_at > now()), 0)::numeric(12, 2) into v_bal
  from public.coin_lots where user_id = auth.uid();
  if v_bal < v_split.gross then
    raise exception 'insufficient balance: need % coins, have %', v_split.gross, v_bal;
  end if;
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_split.gross, substr('Support subscription', 1, 120));
  v_net := public.support_credit(auth.uid(), v_tier.owner_user_id, v_tier.clan_id, v_split.gross, 'support-subscription', 'Support subscription');
  -- Reactivate a previously cancelled slot; otherwise take a fresh slot
  -- (the live-slot partial unique index from 20261025000001 allows this).
  update public.support_subscriptions
  set status = 'active', cancelled_at = null,
      current_period_start = now(), current_period_end = now() + interval '30 days'
  where supporter_id = auth.uid() and tier_id = p_tier_id and status = 'cancelled'
  returning id into v_sub_id;
  if not found then
    insert into public.support_subscriptions (supporter_id, tier_id)
    values (auth.uid(), p_tier_id) returning id into v_sub_id;
  end if;
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
  -- Lots-based (unexpired only); see tip_creator above.
  select coalesce(sum(remaining_coins) filter (where expires_at > now()), 0)::numeric(12, 2) into v_bal
  from public.coin_lots where user_id = auth.uid();
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
    -- Crowns earn (20261019000000): creator-direct backing mints
    -- time-locked Crowns, never Coins. Preserved verbatim here.
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
