-- ============================================================================
-- Support resubscribe fix: cancel-then-resubscribe is impossible.
--
-- support_subscriptions carries unique(supporter_id, tier_id) with no status
-- exception while cancel_subscription keeps the row as 'cancelled', so
-- subscribe_to_tier's re-insert hits unique_violation -> generic 400.
-- Fix: the slot is unique only while live (active/past_due); a cancelled row
-- is reactivated in place with a fresh 30-day period. Fully rerunnable.
-- ============================================================================

alter table public.support_subscriptions
  drop constraint if exists support_subscriptions_supporter_id_tier_id_key;

create unique index if not exists support_subscriptions_active_slot
  on public.support_subscriptions (supporter_id, tier_id)
  where status in ('active', 'past_due');

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
  -- Reactivate a previously cancelled slot; otherwise take a fresh slot.
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
  return jsonb_build_object('subscription_id', v_sub_id, 'gross_coins', v_split.gross, 'net_coins', v_net);
end; $$;
revoke all on function public.subscribe_to_tier(uuid) from public, anon, authenticated;
grant execute on function public.subscribe_to_tier(uuid) to authenticated;
