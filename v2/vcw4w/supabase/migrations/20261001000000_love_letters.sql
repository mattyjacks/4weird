-- ============================================================================
-- Love Letters (💌); clan-native appreciation currency. NOT coins, never
-- mingles with coins, never cashes out, never transfers to coins.
--   * Every profile starts with 3 💌 (column default + backfill).
--   * Each daily-bonus claim mints +1 💌 (inside claim_daily_bonus()).
--   * Clan quests mint 💌 via complete_clan_quest() (owner/mod awards).
--   * Humans give 💌 to posts they love (give_love_letter, 1 💌) or spend on
--     advanced awards (award_love_letter: spotlight 2 / superstar 5 / legend 10).
--     Giving moves 💌 giver -> author: giver balance -N, ll_given +N;
--     author balance +N, ll_received +N. No coin ledger is touched, ever.
--   * Public stats (💌 Earned / Received / Given) via love_profile_stats(),
--     visible only when profiles.is_profile_public is true (default true;
--     shy users hide it; the giver's own numbers always readable via love_me()).
-- Fully rerunnable: IF NOT EXISTS / ADD COLUMN IF EXISTS / OR REPLACE /
-- DROP POLICY IF EXISTS guards throughout.
-- ============================================================================

-- 1. Profile columns ---------------------------------------------------------
alter table public.profiles add column if not exists ll_balance integer not null default 3 check (ll_balance >= 0);
alter table public.profiles add column if not exists ll_earned integer not null default 0 check (ll_earned >= 0);
alter table public.profiles add column if not exists ll_received integer not null default 0 check (ll_received >= 0);
alter table public.profiles add column if not exists ll_given integer not null default 0 check (ll_given >= 0);
alter table public.profiles add column if not exists is_profile_public boolean not null default true;

-- Every existing row starts with 3 💌 (new rows get it from the default).
update public.profiles set ll_balance = 3 where ll_balance is null or ll_balance < 0;

-- 2. Gift / award audit ledger (one row per give/award; balances stay on profiles)
create table if not exists public.love_gifts (
  id uuid primary key default gen_random_uuid(),
  giver_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid null references public.clan_posts(id) on delete cascade,
  clan_id uuid null references public.clans(id) on delete cascade,
  kind text not null check (kind in ('gift','award','quest','daily')),
  award_tier text null check (award_tier is null or award_tier in ('spotlight','superstar','legend')),
  cost integer not null check (cost between 1 and 10),
  created_at timestamptz not null default now(),
  check (giver_id <> receiver_id or kind in ('quest','daily')),
  check ((kind = 'award' and award_tier is not null) or (kind <> 'award' and award_tier is null))
);
create index if not exists love_gifts_post_idx on public.love_gifts (post_id, created_at desc);
create index if not exists love_gifts_receiver_idx on public.love_gifts (receiver_id, created_at desc);
create index if not exists love_gifts_giver_idx on public.love_gifts (giver_id, created_at desc);
-- One 💌 gift per human per post: you can love many posts, but each post once
-- (awards are unlimited so standout posts can keep earning).
create unique index if not exists love_gifts_one_gift_per_post on public.love_gifts (giver_id, post_id) where kind = 'gift' and post_id is not null;

alter table public.love_gifts enable row level security;
drop policy if exists love_gifts_public_read on public.love_gifts;
create policy love_gifts_public_read on public.love_gifts
  for select to anon, authenticated using (true);
-- No client write policies: all writes go through the RPCs below.
grant select on public.love_gifts to anon, authenticated;

-- 3. Minimal clan quests (the second mint source besides daily bonuses) ------
create table if not exists public.clan_quests (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  title varchar(120) not null check (char_length(title) between 3 and 120),
  reward_ll integer not null check (reward_ll between 1 and 10),
  active boolean not null default true,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.clan_quest_completions (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.clan_quests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (quest_id, user_id)
);
alter table public.clan_quests enable row level security;
alter table public.clan_quest_completions enable row level security;
drop policy if exists clan_quests_public_read on public.clan_quests;
create policy clan_quests_public_read on public.clan_quests
  for select to anon, authenticated using (true);
drop policy if exists clan_quest_completions_public_read on public.clan_quest_completions;
create policy clan_quest_completions_public_read on public.clan_quest_completions
  for select to anon, authenticated using (true);
grant select on public.clan_quests to anon, authenticated;
grant select on public.clan_quest_completions to anon, authenticated;

-- 4. RPCs --------------------------------------------------------------------

-- Own 💌 wallet + public-tracked counters (giver always sees their own).
create or replace function public.love_me()
returns table(balance integer, earned integer, received integer, given integer, is_public boolean)
language sql security definer set search_path = public as $$
  select p.ll_balance::integer, p.ll_earned::integer, p.ll_received::integer, p.ll_given::integer, p.is_profile_public
  from public.profiles p where p.id = auth.uid();
$$;
revoke all on function public.love_me() from public, anon, authenticated;
grant execute on function public.love_me() to authenticated;

-- Public 💌 stats for a handle/display identity. Hidden profiles return
-- is_public=false with zeroed counters (existence of the handle is not leaked
-- beyond what the handle lookup already reveals).
create or replace function public.love_profile_stats(p_handle text)
returns table(display_name text, public_handle text, earned integer, received integer, given integer, is_public boolean)
language plpgsql security definer set search_path = public as $$
declare v_row record;
begin
  if p_handle is null or length(trim(p_handle)) = 0 then raise exception 'invalid handle'; end if;
  select p.display_name, p.public_handle, p.ll_earned, p.ll_received, p.ll_given, p.is_profile_public
    into v_row from public.profiles p
   where lower(p.public_handle) = lower(trim(p_handle))
      or p.id::text = trim(p_handle)
   limit 1;
  if not found then raise exception 'player not found'; end if;
  if v_row.is_profile_public then
    return query select v_row.display_name::text, v_row.public_handle::text,
      v_row.ll_earned::integer, v_row.ll_received::integer, v_row.ll_given::integer, true;
  else
    return query select v_row.display_name::text, null::text, 0, 0, 0, false;
  end if;
end; $$;
revoke all on function public.love_profile_stats(text) from public, anon, authenticated;
grant execute on function public.love_profile_stats(text) to anon, authenticated;

-- Give 1 💌 to a post's author. Caller must share the clan (membership), the
-- post must be visible, no self-love, one gift per giver per post, balance >= 1.
-- Moves 1 💌 giver -> author; touches NO coin tables.
create or replace function public.give_love_letter(p_post_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_post record; v_bal integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_post_id is null then raise exception 'invalid post'; end if;
  select p.id, p.clan_id, p.author_id, p.status into v_post
  from public.clan_posts p where p.id = p_post_id;
  if not found then raise exception 'post not found'; end if;
  if v_post.status <> 'visible' then raise exception 'post not available'; end if;
  if v_post.author_id = auth.uid() then raise exception 'you cannot love your own post'; end if;
  if not exists (select 1 from public.clan_members m where m.clan_id = v_post.clan_id and m.user_id = auth.uid()) then
    raise exception 'join the clan first'; end if;
  if exists (select 1 from public.love_gifts g where g.giver_id = auth.uid() and g.post_id = p_post_id and g.kind = 'gift') then
    raise exception 'already loved'; end if;
  select p.ll_balance into v_bal from public.profiles p where p.id = auth.uid() for update;
  if v_bal is null then raise exception 'login required'; end if;
  if v_bal < 1 then raise exception 'not enough love letters'; end if;
  update public.profiles set ll_balance = ll_balance - 1, ll_given = ll_given + 1 where id = auth.uid();
  update public.profiles set ll_balance = ll_balance + 1, ll_received = ll_received + 1 where id = v_post.author_id;
  insert into public.love_gifts (giver_id, receiver_id, post_id, clan_id, kind, cost)
  values (auth.uid(), v_post.author_id, p_post_id, v_post.clan_id, 'gift', 1);
  return jsonb_build_object('post_id', p_post_id, 'cost', 1);
end; $$;
revoke all on function public.give_love_letter(uuid) from public, anon, authenticated;
grant execute on function public.give_love_letter(uuid) to authenticated;

-- Spend 💌 on an advanced award for a post (rewards its author).
-- Tiers: spotlight=2, superstar=5, legend=10. Unlimited awards per post.
create or replace function public.award_love_letter(p_post_id uuid, p_tier text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_post record; v_bal integer; v_cost integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_post_id is null then raise exception 'invalid post'; end if;
  v_cost := case lower(trim(coalesce(p_tier, '')))
    when 'spotlight' then 2 when 'superstar' then 5 when 'legend' then 10
    else null end;
  if v_cost is null then raise exception 'invalid award tier'; end if;
  select p.id, p.clan_id, p.author_id, p.status into v_post
  from public.clan_posts p where p.id = p_post_id;
  if not found then raise exception 'post not found'; end if;
  if v_post.status <> 'visible' then raise exception 'post not available'; end if;
  if v_post.author_id = auth.uid() then raise exception 'you cannot award your own post'; end if;
  if not exists (select 1 from public.clan_members m where m.clan_id = v_post.clan_id and m.user_id = auth.uid()) then
    raise exception 'join the clan first'; end if;
  select p.ll_balance into v_bal from public.profiles p where p.id = auth.uid() for update;
  if v_bal is null then raise exception 'login required'; end if;
  if v_bal < v_cost then raise exception 'not enough love letters: need %, have %', v_cost, v_bal; end if;
  update public.profiles set ll_balance = ll_balance - v_cost, ll_given = ll_given + v_cost where id = auth.uid();
  update public.profiles set ll_balance = ll_balance + v_cost, ll_received = ll_received + v_cost where id = v_post.author_id;
  insert into public.love_gifts (giver_id, receiver_id, post_id, clan_id, kind, award_tier, cost)
  values (auth.uid(), v_post.author_id, p_post_id, v_post.clan_id, 'award', lower(trim(p_tier)), v_cost);
  return jsonb_build_object('post_id', p_post_id, 'tier', lower(trim(p_tier)), 'cost', v_cost);
end; $$;
revoke all on function public.award_love_letter(uuid, text) from public, anon, authenticated;
grant execute on function public.award_love_letter(uuid, text) to authenticated;

-- Post 💌 totals (public; powers award badges on clan pages).
create or replace function public.love_post_totals(p_post_id uuid)
returns table(gifts integer, awards integer, letters integer)
language plpgsql security definer set search_path = public as $$
begin
  if p_post_id is null then raise exception 'invalid post'; end if;
  return query select
    count(*) filter (where kind = 'gift')::integer,
    count(*) filter (where kind = 'award')::integer,
    coalesce(sum(cost), 0)::integer
  from public.love_gifts where post_id = p_post_id;
end; $$;
revoke all on function public.love_post_totals(uuid) from public, anon, authenticated;
grant execute on function public.love_post_totals(uuid) to anon, authenticated;

-- Clan quest lifecycle: owner/mod creates a quest; owner/mod marks a member
-- complete (mints reward_ll -> member balance + earned). One completion each.
create or replace function public.create_clan_quest(p_clan_id uuid, p_title text, p_reward integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_title text := substr(trim(coalesce(p_title, '')), 1, 120); v_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if char_length(v_title) < 3 then raise exception 'invalid quest title'; end if;
  if p_reward is null or p_reward < 1 or p_reward > 10 then raise exception 'reward must be 1..10'; end if;
  if not exists (select 1 from public.clan_members m where m.clan_id = p_clan_id and m.user_id = auth.uid() and m.role in ('owner','mod')) then
    raise exception 'not a moderator'; end if;
  insert into public.clan_quests (clan_id, title, reward_ll, created_by)
  values (p_clan_id, v_title, p_reward, auth.uid()) returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.create_clan_quest(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.create_clan_quest(uuid, text, integer) to authenticated;

create or replace function public.complete_clan_quest(p_quest_id uuid, p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_quest record;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select q.* into v_quest from public.clan_quests q where q.id = p_quest_id;
  if not found then raise exception 'quest not found'; end if;
  if not v_quest.active then raise exception 'quest is closed'; end if;
  if not exists (select 1 from public.clan_members m where m.clan_id = v_quest.clan_id and m.user_id = auth.uid() and m.role in ('owner','mod')) then
    raise exception 'not a moderator'; end if;
  if not exists (select 1 from public.clan_members m where m.clan_id = v_quest.clan_id and m.user_id = p_user_id) then
    raise exception 'member not found'; end if;
  insert into public.clan_quest_completions (quest_id, user_id) values (p_quest_id, p_user_id);
  update public.profiles set ll_balance = ll_balance + v_quest.reward_ll, ll_earned = ll_earned + v_quest.reward_ll
   where id = p_user_id;
  insert into public.love_gifts (giver_id, receiver_id, clan_id, kind, cost)
  values (auth.uid(), p_user_id, v_quest.clan_id, 'quest', v_quest.reward_ll);
exception when unique_violation then
  raise exception 'already completed';
end; $$;
revoke all on function public.complete_clan_quest(uuid, uuid) from public, anon, authenticated;
grant execute on function public.complete_clan_quest(uuid, uuid) to authenticated;

-- 5. Daily bonus also mints 1 💌 (rerunnable OR REPLACE of the original). ----
-- NOTE: the return type gains a third column (love_letters), so the old
-- function must be DROPPED first - CREATE OR REPLACE alone fails with 42P13
-- ("cannot change return type of existing function").
drop function if exists public.claim_daily_bonus();
create or replace function public.claim_daily_bonus()
returns table(coins integer, streak integer, love_letters integer) language plpgsql security definer set search_path=public as $$
declare yester date := (now() at time zone 'utc' - interval '1 day')::date;
declare today date := (now() at time zone 'utc')::date;
declare row public.daily_claims%rowtype; declare award integer;
begin
 if auth.uid() is null then raise exception 'login required'; end if;
 select * into row from public.daily_claims where user_id=auth.uid() for update;
 if found and row.last_claim_date=today then return query select 0, row.streak::integer, 0; end if;
 if found and row.last_claim_date=yester then row.streak := least(row.streak+1, 3650);
 else row.streak := 1; end if;
 award := least(5 + (row.streak-1), 12);
 insert into public.daily_claims(user_id,last_claim_date,streak,updated_at) values(auth.uid(),today,row.streak,now())
  on conflict(user_id) do update set last_claim_date=today,streak=row.streak,updated_at=now();
 insert into public.coin_ledger(user_id,delta,reason) values(auth.uid(),award,'Daily login bonus (day '||row.streak||')');
 -- 💌 mint: +1 earned, +1 spendable. Never touches coins; a second claim pays 0.
 update public.profiles set ll_balance = coalesce(ll_balance, 0) + 1, ll_earned = coalesce(ll_earned, 0) + 1
  where id = auth.uid();
 insert into public.love_gifts (giver_id, receiver_id, kind, cost)
  values (auth.uid(), auth.uid(), 'daily', 1);
 return query select award, row.streak::integer, 1;
end; $$;
revoke all on function public.claim_daily_bonus() from public,anon,authenticated;
grant execute on function public.claim_daily_bonus() to authenticated;
