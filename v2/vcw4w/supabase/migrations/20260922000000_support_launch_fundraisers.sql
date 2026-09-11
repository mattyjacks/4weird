-- ============================================================================
-- 4weird Support + Launch campaigns — voluntary coin support for verified
-- creators and clans (Patreon-style subscriptions + one-time tips) and
-- gift-based project-launch fundraising for games / tech startups
-- (GoFundMe-style, creative projects only — never charity).
--
-- LEGAL MODEL (enforced here + Terms §8A + UI disclaimers):
--   - All transfers move closed-loop Vibe Coins only. Coins have no cash
--     value, are non-refundable, and CANNOT be cashed out. Recipients receive
--     platform credits spendable on the Service only. This keeps the feature
--     outside money-transmission / e-money licensing (US FinCEN, EU EMI) and
--     outside securities crowdfunding (no equity, interest, revenue-share, or
--     profit promises — constrained below).
--   - Nothing here is charitable: no tax deduction, no charitable
--     solicitation (NH RSA 7:19+ and EU national charity laws avoided by
--     explicit non-charity + category allowlist rejecting charity/medical/
--     emergency/disaster campaigns).
--   - Perks and campaign rewards are aspirational goals, never contractual
--     obligations (EU/UK consumer + UCPD honesty: UI must say so).
-- Fully rerunnable: IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS throughout.
-- ============================================================================

-- 0. Verified-creator flag on profiles (admin-set only) -----------------------
alter table public.profiles add column if not exists is_verified boolean not null default false;
alter table public.profiles add column if not exists verified_at timestamptz null;

-- Admin-only guard: a signed-in user can never flip their own flag.
-- service_role (auth.uid() null) bypasses the check and may set it.
create or replace function public.guard_profile_verification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_verified is distinct from old.is_verified then
    if auth.uid() is not null then
      raise exception 'verification is admin-set';
    end if;
    if new.is_verified then new.verified_at := now(); end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_guard_profile_verification on public.profiles;
create trigger trg_guard_profile_verification
  before update on public.profiles
  for each row execute function public.guard_profile_verification();

-- Verification requests (user asks, admin decides out-of-band / via dashboard).
create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  note varchar(500) not null default '' check (char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz not null default now(),
  unique (user_id)
);
alter table public.verification_requests enable row level security;
drop policy if exists verification_requests_owner on public.verification_requests;
create policy verification_requests_owner on public.verification_requests
  for select to authenticated using (user_id = auth.uid());

-- 1. Support tiers (one owner: a verified user OR a clan, never both) ---------
create table if not exists public.support_tiers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid null references public.profiles(id) on delete cascade,
  clan_id uuid null references public.clans(id) on delete cascade,
  title varchar(80) not null check (char_length(title) between 2 and 80),
  blurb varchar(300) not null default '' check (char_length(blurb) <= 300),
  coins_monthly numeric(12, 2) not null check (coins_monthly >= 1 and coins_monthly <= 100000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (
    (owner_user_id is not null and clan_id is null) or
    (owner_user_id is null and clan_id is not null)
  )
);
create index if not exists support_tiers_owner_idx on public.support_tiers (owner_user_id);
create index if not exists support_tiers_clan_idx on public.support_tiers (clan_id);
alter table public.support_tiers enable row level security;
drop policy if exists support_tiers_public_read on public.support_tiers;
create policy support_tiers_public_read on public.support_tiers
  for select to anon, authenticated using (true);

-- 2. Subscriptions (30-day periods, cancel anytime, no proration) -------------
create table if not exists public.support_subscriptions (
  id uuid primary key default gen_random_uuid(),
  supporter_id uuid not null references public.profiles(id) on delete cascade,
  tier_id uuid not null references public.support_tiers(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'past_due', 'cancelled')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '30 days'),
  cancelled_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (supporter_id, tier_id)
);
create index if not exists support_subs_supporter_idx on public.support_subscriptions (supporter_id, status);
create index if not exists support_subs_renewal_idx on public.support_subscriptions (status, current_period_end);
alter table public.support_subscriptions enable row level security;
drop policy if exists support_subs_owner_read on public.support_subscriptions;
create policy support_subs_owner_read on public.support_subscriptions
  for select to authenticated using (supporter_id = auth.uid());

-- 3. Support payments audit (every tip + subscription charge attributed) ------
create table if not exists public.support_payments (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('tip', 'subscription')),
  supporter_id uuid not null references public.profiles(id) on delete cascade,
  recipient_user_id uuid null references public.profiles(id) on delete set null,
  clan_id uuid null references public.clans(id) on delete set null,
  subscription_id uuid null references public.support_subscriptions(id) on delete set null,
  gross numeric(12, 2) not null check (gross >= 1 and gross <= 100000),
  cut numeric(12, 2) not null default 0 check (cut >= 0),
  net numeric(12, 2) not null default 0 check (net >= 0),
  created_at timestamptz not null default now(),
  check (
    (recipient_user_id is not null and clan_id is null) or
    (recipient_user_id is null and clan_id is not null)
  )
);
create index if not exists support_payments_supporter_idx on public.support_payments (supporter_id, created_at desc);
create index if not exists support_payments_recipient_idx on public.support_payments (recipient_user_id, created_at desc);
alter table public.support_payments enable row level security;
drop policy if exists support_payments_participant_read on public.support_payments;
create policy support_payments_participant_read on public.support_payments
  for select to authenticated using (supporter_id = auth.uid() or recipient_user_id = auth.uid());

-- 4. Launch campaigns (games / tech startups only — category allowlist) -------
create table if not exists public.launch_campaigns (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  clan_id uuid null references public.clans(id) on delete set null,
  title varchar(120) not null check (char_length(title) between 4 and 120),
  story varchar(5000) not null check (char_length(story) between 20 and 5000),
  use_of_funds varchar(1000) not null default '' check (char_length(use_of_funds) <= 1000),
  category text not null check (category in ('game-launch', 'startup', 'creative-tech')),
  goal_coins numeric(12, 2) not null check (goal_coins >= 50 and goal_coins <= 1000000),
  status text not null default 'open' check (status in ('open', 'funded', 'closed', 'cancelled', 'frozen')),
  moderation text not null default 'visible' check (moderation in ('visible', 'pending', 'hidden')),
  ends_at timestamptz null,
  created_at timestamptz not null default now()
);
create index if not exists launch_campaigns_status_idx on public.launch_campaigns (status, moderation, created_at desc);
create index if not exists launch_campaigns_creator_idx on public.launch_campaigns (creator_id);
alter table public.launch_campaigns enable row level security;
drop policy if exists launch_campaigns_public_read on public.launch_campaigns;
create policy launch_campaigns_public_read on public.launch_campaigns
  for select to anon, authenticated using (moderation = 'visible');

create table if not exists public.launch_contributions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.launch_campaigns(id) on delete cascade,
  supporter_id uuid not null references public.profiles(id) on delete cascade,
  gross numeric(12, 2) not null check (gross >= 1 and gross <= 100000),
  cut numeric(12, 2) not null default 0 check (cut >= 0),
  net numeric(12, 2) not null default 0 check (net >= 0),
  created_at timestamptz not null default now()
);
create index if not exists launch_contrib_campaign_idx on public.launch_contributions (campaign_id, created_at desc);
create index if not exists launch_contrib_supporter_idx on public.launch_contributions (supporter_id, created_at desc);
alter table public.launch_contributions enable row level security;
drop policy if exists launch_contrib_involved_read on public.launch_contributions;
create policy launch_contrib_involved_read on public.launch_contributions
  for select to authenticated using (
    supporter_id = auth.uid() or exists (
      select 1 from public.launch_campaigns c
      where c.id = campaign_id and c.creator_id = auth.uid()
    )
  );

-- 5. Clan ledger kinds for support attribution --------------------------------
alter table public.clan_cost_ledger drop constraint if exists clan_cost_ledger_kind_check;
alter table public.clan_cost_ledger add constraint clan_cost_ledger_kind_check
  check (kind in (
    'post-fee', 'comment-fee', 'message-fee', 'upkeep', 'ad-revenue',
    'affiliate-revenue', 'owner-funding', 'donation', 'storage', 'database',
    'bandwidth', 'ai-moderation', 'server',
    'support-tip', 'support-subscription', 'launch-contribution'
  ));

-- 6. Shared money mover (25% cut INCLUDED, closed-loop, no cash-out) ----------
create or replace function public.support_split(p_gross numeric)
returns table(gross numeric, cut numeric, net numeric)
language plpgsql immutable set search_path = public as $$
begin
  if p_gross is null or p_gross < 1 or p_gross > 100000 then raise exception 'amount must be 1..100000 coins'; end if;
  gross := round(p_gross, 2);
  cut := round(p_gross * 25 / 100.0, 2);
  net := gross - cut;
  return next;
end; $$;
revoke all on function public.support_split(numeric) from public, anon, authenticated;
grant execute on function public.support_split(numeric) to authenticated, service_role;

-- Credit a recipient: verified user ledger OR clan wallet + clan ledger.
-- Returns the net credited. Raises on self-pay and unverified users.
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
    insert into public.coin_ledger (user_id, delta, reason)
    values (p_recipient_user, v_split.net, substr(coalesce(p_note, 'Creator support'), 1, 120));
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

-- 7. Verification request ------------------------------------------------------
create or replace function public.request_verification(p_note text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_note text := substr(trim(coalesce(p_note, '')), 1, 500);
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and is_verified) then
    raise exception 'already verified';
  end if;
  insert into public.verification_requests (user_id, note)
  values (auth.uid(), v_note)
  on conflict (user_id) do update set note = excluded.note, status = 'pending', created_at = now();
  return jsonb_build_object('requested', true);
end; $$;
revoke all on function public.request_verification(text) from public, anon, authenticated;
grant execute on function public.request_verification(text) to authenticated;

-- 8. One-time tip --------------------------------------------------------------
create or replace function public.tip_creator(p_recipient_user uuid, p_clan uuid, p_coins numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_gross numeric(12, 2) := round(coalesce(p_coins, 0), 2);
  v_bal numeric(12, 2);
  v_split record;
  v_net numeric(12, 2);
begin
  if auth.uid() is null then raise exception 'login required'; end if;
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
  return jsonb_build_object('gross_coins', v_split.gross, 'net_coins', v_net);
end; $$;
revoke all on function public.tip_creator(uuid, uuid, numeric) from public, anon, authenticated;
grant execute on function public.tip_creator(uuid, uuid, numeric) to authenticated;

-- 9. Support tiers (verified users create their own; clan owners/mods for clans)
create or replace function public.create_support_tier(
  p_clan_id uuid, p_title text, p_coins_monthly numeric, p_blurb text default ''
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_title text := substr(trim(coalesce(p_title, '')), 1, 80);
  v_blurb text := substr(trim(coalesce(p_blurb, '')), 1, 300);
  v_gross numeric(12, 2) := round(coalesce(p_coins_monthly, 0), 2);
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if char_length(v_title) < 2 then raise exception 'title required'; end if;
  if v_gross < 1 or v_gross > 100000 then raise exception 'tier must be 1..100000 coins per month'; end if;
  if p_clan_id is null then
    if not exists (select 1 from public.profiles where id = auth.uid() and is_verified) then
      raise exception 'only verified creators can offer tiers';
    end if;
    insert into public.support_tiers (owner_user_id, title, blurb, coins_monthly)
    values (auth.uid(), v_title, v_blurb, v_gross) returning id into v_id;
  else
    if not public.clan_is_moderator(p_clan_id, auth.uid()) then raise exception 'not a moderator'; end if;
    insert into public.support_tiers (clan_id, title, blurb, coins_monthly)
    values (p_clan_id, v_title, v_blurb, v_gross) returning id into v_id;
  end if;
  return jsonb_build_object('id', v_id);
end; $$;
revoke all on function public.create_support_tier(uuid, text, numeric, text) from public, anon, authenticated;
grant execute on function public.create_support_tier(uuid, text, numeric, text) to authenticated;

-- 10. Subscribe (first month charged immediately, 30-day period) ---------------
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
  insert into public.support_subscriptions (supporter_id, tier_id)
  values (auth.uid(), p_tier_id) returning id into v_sub_id;
  insert into public.support_payments (kind, supporter_id, recipient_user_id, clan_id, subscription_id, gross, cut, net)
  values ('subscription', auth.uid(), v_tier.owner_user_id, v_tier.clan_id, v_sub_id, v_split.gross, v_split.cut, v_net);
  return jsonb_build_object('subscription_id', v_sub_id, 'gross_coins', v_split.gross, 'net_coins', v_net);
end; $$;
revoke all on function public.subscribe_to_tier(uuid) from public, anon, authenticated;
grant execute on function public.subscribe_to_tier(uuid) to authenticated;

create or replace function public.cancel_subscription(p_subscription_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  update public.support_subscriptions
  set status = 'cancelled', cancelled_at = now()
  where id = p_subscription_id and supporter_id = auth.uid() and status in ('active', 'past_due');
  if not found then raise exception 'subscription not found'; end if;
  return jsonb_build_object('cancelled', true);
end; $$;
revoke all on function public.cancel_subscription(uuid) from public, anon, authenticated;
grant execute on function public.cancel_subscription(uuid) to authenticated;

-- Monthly renewal fan-out (service_role cron only). Charges each due active
-- subscription; lapses to past_due when the supporter cannot cover it.
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
      v_ok := v_ok + 1;
    exception when others then
      continue;
    end;
  end loop;
  return jsonb_build_object('due', v_due, 'renewed', v_ok);
end; $$;
revoke all on function public.renew_support_subscriptions() from public, anon, authenticated;
grant execute on function public.renew_support_subscriptions() to service_role;

-- 11. Launch campaigns ----------------------------------------------------------
-- Banned-phrase guard keeps campaigns on creative projects: no charity,
-- medical, emergency, disaster, political, or securities language.
create or replace function public.create_launch_campaign(
  p_clan_id uuid, p_title text, p_story text, p_goal_coins numeric,
  p_category text, p_use_of_funds text default '', p_ends_at timestamptz default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_title text := substr(trim(coalesce(p_title, '')), 1, 120);
  v_story text := substr(trim(coalesce(p_story, '')), 1, 5000);
  v_funds text := substr(trim(coalesce(p_use_of_funds, '')), 1, 1000);
  v_cat text := lower(trim(coalesce(p_category, '')));
  v_goal numeric(12, 2) := round(coalesce(p_goal_coins, 0), 2);
  v_blob text;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if char_length(v_title) < 4 then raise exception 'title required (4..120 chars)'; end if;
  if char_length(v_story) < 20 then raise exception 'story required (20..5000 chars)'; end if;
  if v_cat not in ('game-launch', 'startup', 'creative-tech') then raise exception 'invalid category'; end if;
  if v_goal < 50 or v_goal > 1000000 then raise exception 'goal must be 50..1000000 coins'; end if;
  if p_ends_at is not null and p_ends_at <= now() + interval '1 day' then
    raise exception 'end date must be at least a day out';
  end if;
  if p_clan_id is not null and not public.clan_is_moderator(p_clan_id, auth.uid()) then
    raise exception 'not a moderator';
  end if;
  v_blob := lower(v_title || ' ' || v_story || ' ' || v_funds);
  if v_blob ~ '(charit|donat\w* (to|for) (charity|nonprofit|non-profit|501c)|tax[- ]?deduct|501\(c\)|medical|cancer|hospital|surgery|funeral|emergency|disaster|relief fund|go ?fund ?me.*medic|political|vote for|election|equity|shares? (in|of)|revenue share|profit share|roi\b|guaranteed return|interest\b.*%|dividend)' then
    raise exception 'campaigns cover creative projects only — no charity, medical, emergency, political, or investment language';
  end if;
  insert into public.launch_campaigns (creator_id, clan_id, title, story, use_of_funds, category, goal_coins, ends_at)
  values (auth.uid(), p_clan_id, v_title, v_story, v_funds, v_cat, v_goal, p_ends_at)
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end; $$;
revoke all on function public.create_launch_campaign(uuid, text, text, numeric, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.create_launch_campaign(uuid, text, text, numeric, text, text, timestamptz) to authenticated;

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
  select coalesce(sum(gross), 0)::numeric(12, 2) into v_raised
  from public.launch_contributions where campaign_id = p_campaign_id;
  if v_raised >= v_camp.goal_coins then
    update public.launch_campaigns set status = 'funded' where id = p_campaign_id and status = 'open';
  end if;
  return jsonb_build_object('gross_coins', v_split.gross, 'net_coins', v_split.net, 'raised_gross', v_raised);
end; $$;
revoke all on function public.contribute_launch_campaign(uuid, numeric) from public, anon, authenticated;
grant execute on function public.contribute_launch_campaign(uuid, numeric) to authenticated;

create or replace function public.close_launch_campaign(p_campaign_id uuid, p_status text default 'closed')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_st text := lower(trim(coalesce(p_status, 'closed')));
  v_camp public.launch_campaigns%rowtype;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_st not in ('closed', 'cancelled') then raise exception 'invalid status'; end if;
  select * into v_camp from public.launch_campaigns where id = p_campaign_id;
  if not found then raise exception 'campaign not found'; end if;
  if v_camp.creator_id <> auth.uid() then raise exception 'only the creator can close this campaign'; end if;
  update public.launch_campaigns set status = v_st where id = p_campaign_id;
  return jsonb_build_object('status', v_st);
end; $$;
revoke all on function public.close_launch_campaign(uuid, text) from public, anon, authenticated;
grant execute on function public.close_launch_campaign(uuid, text) to authenticated;

-- 12. Public campaign rollup (goal progress without exposing supporter ids) ----
create or replace function public.launch_campaign_progress(p_campaign_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_raised numeric(12, 2);
  v_backers integer;
begin
  if not exists (select 1 from public.launch_campaigns where id = p_campaign_id) then
    raise exception 'campaign not found';
  end if;
  select coalesce(sum(gross), 0)::numeric(12, 2), count(distinct supporter_id)::integer
  into v_raised, v_backers
  from public.launch_contributions where campaign_id = p_campaign_id;
  return jsonb_build_object('raised_gross', v_raised, 'backers', v_backers);
end; $$;
revoke all on function public.launch_campaign_progress(uuid) from public, anon, authenticated;
grant execute on function public.launch_campaign_progress(uuid) to anon, authenticated, service_role;
