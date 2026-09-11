-- ============================================================================
-- 4weird Clans v2 — clan types (hclan/sclan/bclan), Valley Net automod log,
-- per-clan server-cost upkeep economy, clan XP/gamification, RunPod spend mirror.
-- Fully rerunnable: IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS throughout.
-- ============================================================================
-- CLAN TYPES (singular: hclan/sclan/bclan; plural: hclans/sclans/bclans):
--   hclan — human-only. Bot-key API routes must refuse hclans (403/404);
--           deployed bots are rejected on hclans. Hardened against bots.
--   sclan — shared. Humans AND bots interact; deployable bots allowed.
--   bclan — bot-native. Bots operate fully; humans may read/join/post.
-- Existing clans backfill to 'sclan' (they already serve both APIs).
--
-- UPKEEP ECONOMY (25% platform cut INCLUDED in every fee, never on top):
--   Every post/comment pays a server-cost fee (min 1 centicentcoin = 0.01
--   coins): fee = max(0.01, per-KB + image surcharge), split 25% platform /
--   75% clan wallet. Clan wallets pay lazy-accrued daily upkeep; delinquent
--   clans pause posting until funded (owner funding or ad/affiliate revenue).
-- VALLEY NET: automod verdicts are logged to valleynet_actions (admins read
--   via service role; no client read policy, ever).
-- RUNPOD: runpod_usage mirrors real RunPod billing rows pulled with the
--   operator's RUNPOD_API_KEY (informational; RunPod bills the card directly,
--   so no Vibe cut applies to mirrored rows).
-- ============================================================================

-- 1. Clan type + upkeep columns ----------------------------------------------
alter table public.clans add column if not exists clan_type text not null default 'sclan';
alter table public.clans drop constraint if exists clans_clan_type_check;
alter table public.clans add constraint clans_clan_type_check
  check (clan_type in ('hclan', 'sclan', 'bclan'));

alter table public.clans add column if not exists upkeep_status text not null default 'healthy';
alter table public.clans drop constraint if exists clans_upkeep_status_check;
alter table public.clans add constraint clans_upkeep_status_check
  check (upkeep_status in ('healthy', 'low', 'delinquent'));

alter table public.clans add column if not exists upkeep_grace_until timestamptz
  not null default (now() + interval '14 days');
alter table public.clans add column if not exists upkeep_last_accrued timestamptz
  not null default now();

-- 2. Clan wallets (one per clan; provider-share + revenue land here) ---------
create table if not exists public.clan_wallets (
  clan_id uuid primary key references public.clans(id) on delete cascade,
  balance numeric(12, 2) not null default 0 check (balance >= -1000000 and balance <= 1000000),
  updated_at timestamptz not null default now()
);

-- 3. Per-clan cost/revenue ledger (every cent attributed) --------------------
create table if not exists public.clan_cost_ledger (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  kind text not null check (kind in (
    'post-fee', 'comment-fee', 'upkeep', 'ad-revenue',
    'affiliate-revenue', 'owner-funding'
  )),
  qty numeric(12, 2) not null default 1,
  gross numeric(12, 2) not null check (gross >= -1000000 and gross <= 1000000),
  cut numeric(12, 2) not null default 0 check (cut >= 0),
  provider numeric(12, 2) not null default 0 check (provider >= 0),
  note varchar(200) not null default '',
  created_at timestamptz not null default now()
);
create index if not exists clan_cost_ledger_clan_idx
  on public.clan_cost_ledger (clan_id, created_at desc);

-- 4. Monetization channels (house ads / affiliate / sponsor) -----------------
create table if not exists public.clan_monetization (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  kind text not null check (kind in ('house-ad', 'affiliate', 'sponsor')),
  label varchar(120) not null check (char_length(label) between 1 and 120),
  target_url text not null default '',
  active boolean not null default true,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (clan_id, kind, label)
);

-- 5. Deployed clan bots (sclans + bclans only; hclans reject) ----------------
create table if not exists public.clan_bots (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  bot_user_id uuid not null references public.profiles(id) on delete cascade,
  name varchar(24) not null check (name ~ '^[a-z0-9_]{3,24}$'),
  webhook_url text not null default '',
  added_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (clan_id, bot_user_id)
);

-- 6. Valley Net automod action log (admin-only reads via service role) -------
create table if not exists public.valleynet_actions (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid null references public.clans(id) on delete set null,
  target_type text not null check (target_type in ('post', 'comment', 'join', 'bot-deploy')),
  target_id uuid null,
  verdict text not null check (verdict in ('allow', 'quarantine', 'block')),
  reasons text not null default '',
  actor_id uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists valleynet_actions_clan_idx
  on public.valleynet_actions (clan_id, created_at desc);

-- 7. Clan XP + badges (gamification) -----------------------------------------
create table if not exists public.clan_xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  clan_id uuid not null references public.clans(id) on delete cascade,
  xp integer not null check (xp between 1 and 100),
  reason text not null check (reason in ('post', 'comment', 'bot-deploy', 'upkeep-funded')),
  created_at timestamptz not null default now()
);
create index if not exists clan_xp_ledger_clan_idx
  on public.clan_xp_ledger (clan_id, created_at desc);
create index if not exists clan_xp_ledger_user_idx
  on public.clan_xp_ledger (user_id, clan_id);

create table if not exists public.clan_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  clan_id uuid not null references public.clans(id) on delete cascade,
  badge text not null check (badge in ('founder', 'first-post', 'valley-guardian', 'patron', 'centurion')),
  awarded_at timestamptz not null default now(),
  primary key (user_id, clan_id, badge)
);

-- 8. RunPod spend mirror (per user; pulled with RUNPOD_API_KEY) --------------
create table if not exists public.runpod_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('pod', 'serverless', 'volume')),
  remote_id text not null default '',
  time_bucket timestamptz not null,
  amount_usd numeric(12, 4) not null check (amount_usd >= 0 and amount_usd <= 1000000),
  time_billed_ms bigint not null default 0 check (time_billed_ms >= 0),
  synced_at timestamptz not null default now(),
  unique (user_id, kind, remote_id, time_bucket)
);
create index if not exists runpod_usage_user_idx
  on public.runpod_usage (user_id, synced_at desc);

-- 9. RLS ---------------------------------------------------------------------
alter table public.clan_wallets enable row level security;
alter table public.clan_cost_ledger enable row level security;
alter table public.clan_monetization enable row level security;
alter table public.clan_bots enable row level security;
alter table public.valleynet_actions enable row level security;
alter table public.clan_xp_ledger enable row level security;
alter table public.clan_badges enable row level security;
alter table public.runpod_usage enable row level security;

-- Public reads (transparency: wallets, costs, bots, xp, badges, channels).
-- Writes go through SECURITY DEFINER RPCs or the service role only.
drop policy if exists clan_wallets_public_read on public.clan_wallets;
create policy clan_wallets_public_read on public.clan_wallets
  for select to anon, authenticated using (true);

drop policy if exists clan_cost_ledger_public_read on public.clan_cost_ledger;
create policy clan_cost_ledger_public_read on public.clan_cost_ledger
  for select to anon, authenticated using (true);

drop policy if exists clan_monetization_public_read on public.clan_monetization;
create policy clan_monetization_public_read on public.clan_monetization
  for select to anon, authenticated using (true);

drop policy if exists clan_bots_public_read on public.clan_bots;
create policy clan_bots_public_read on public.clan_bots
  for select to anon, authenticated using (true);

drop policy if exists clan_xp_public_read on public.clan_xp_ledger;
create policy clan_xp_public_read on public.clan_xp_ledger
  for select to anon, authenticated using (true);

drop policy if exists clan_badges_public_read on public.clan_badges;
create policy clan_badges_public_read on public.clan_badges
  for select to anon, authenticated using (true);

-- valleynet_actions: NO client read policy (admins via service role).
-- runpod_usage: owner-only reads.
drop policy if exists runpod_usage_owner_read on public.runpod_usage;
create policy runpod_usage_owner_read on public.runpod_usage
  for select to authenticated using (user_id = auth.uid());

-- 10. RPCs -------------------------------------------------------------------

-- create_clan gains an optional clan type (default sclan; old 3-arg calls
-- keep working). New clans open with a 14-day upkeep grace period.
create or replace function public.create_clan(
  p_slug text, p_name text, p_description text, p_clan_type text default 'sclan'
)
returns public.clans language plpgsql security definer set search_path = public as $$
declare
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_name text := trim(coalesce(p_name, ''));
  v_desc text := substr(trim(coalesce(p_description, '')), 1, 500);
  v_type text := lower(trim(coalesce(p_clan_type, 'sclan')));
  v_row public.clans%rowtype;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_slug !~ '^[a-z0-9-]{1,40}$' then raise exception 'invalid slug'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 60 then raise exception 'invalid name'; end if;
  if v_type not in ('hclan', 'sclan', 'bclan') then raise exception 'invalid clan type'; end if;
  insert into public.clans (slug, name, description, owner_id, clan_type, upkeep_grace_until, upkeep_last_accrued)
  values (v_slug, v_name, v_desc, auth.uid(), v_type, now() + interval '14 days', now())
  returning * into v_row;
  insert into public.clan_members (clan_id, user_id, role)
  values (v_row.id, auth.uid(), 'owner')
  on conflict (clan_id, user_id) do update set role = 'owner';
  insert into public.clan_wallets (clan_id, balance)
  values (v_row.id, 0)
  on conflict (clan_id) do nothing;
  insert into public.clan_badges (user_id, clan_id, badge)
  values (auth.uid(), v_row.id, 'founder')
  on conflict do nothing;
  return v_row;
exception when unique_violation then
  raise exception 'slug taken';
end; $$;
revoke all on function public.create_clan(text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_clan(text, text, text, text) to authenticated;

-- Keep the legacy 3-arg overload as a delegating wrapper so older callers
-- (and exact-match 3-arg resolution) cannot bypass clan_type, wallets, and
-- founder badges. Without this, Postgres would keep routing 3-arg calls to
-- the pre-existing 3-arg overload.
create or replace function public.create_clan(p_slug text, p_name text, p_description text)
returns public.clans language plpgsql security definer set search_path = public as $$
begin
  return public.create_clan(p_slug, p_name, p_description, 'sclan');
end; $$;
revoke all on function public.create_clan(text, text, text) from public, anon, authenticated;
grant execute on function public.create_clan(text, text, text) to authenticated;

-- Owner-only clan type switch (hclan <-> sclan <-> bclan).
create or replace function public.set_clan_type(p_clan_id uuid, p_clan_type text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_type text := lower(trim(coalesce(p_clan_type, '')));
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_type not in ('hclan', 'sclan', 'bclan') then raise exception 'invalid clan type'; end if;
  if not exists (
    select 1 from public.clans where id = p_clan_id and owner_id = auth.uid()
  ) then
    raise exception 'not the owner';
  end if;
  update public.clans set clan_type = v_type where id = p_clan_id;
  -- Switching to hclan unplugs deployed bots (hardened against bots).
  if v_type = 'hclan' then
    delete from public.clan_bots where clan_id = p_clan_id;
  end if;
end; $$;
revoke all on function public.set_clan_type(uuid, text) from public, anon, authenticated;
grant execute on function public.set_clan_type(uuid, text) to authenticated;

-- meter_clan_posting_fee: charge the caller a server-cost fee for one post or
-- comment. Fee = max(0.01, per-KB + image surcharge) coins, split 25% platform
-- cut / 75% clan wallet. Refuses delinquent clans (402-worthy 'upkeep due').
create or replace function public.meter_clan_posting_fee(
  p_clan_id uuid, p_kind text, p_bytes integer, p_has_image boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_kind text := lower(trim(coalesce(p_kind, '')));
  v_bytes integer := greatest(0, coalesce(p_bytes, 0));
  v_fee numeric(12, 2);
  v_cut numeric(12, 2);
  v_provider numeric(12, 2);
  v_bal numeric(12, 2);
  v_slug text;
  v_status text;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_kind not in ('post', 'comment') then raise exception 'invalid kind'; end if;
  select slug, upkeep_status into v_slug, v_status
    from public.clans where id = p_clan_id;
  if v_slug is null then raise exception 'clan not found'; end if;
  if v_status = 'delinquent' then raise exception 'clan upkeep delinquent'; end if;
  if not exists (
    select 1 from public.clan_members where clan_id = p_clan_id and user_id = auth.uid()
  ) then
    raise exception 'join the clan first';
  end if;
  -- Linear server-cost formula (mirrors lib/clan-costs.ts clanPostingFee):
  -- 0.01 coins per started KB + 0.05 image surcharge, minimum 0.01 coins.
  v_fee := greatest(0.01, round((ceil(v_bytes / 1024.0) * 0.01)::numeric, 2)
    + case when coalesce(p_has_image, false) then 0.05 else 0 end);
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_fee then
    raise exception 'insufficient balance: need % coins, have %', v_fee, v_bal;
  end if;
  v_cut := round(v_fee * 25 / 100.0, 2);
  v_provider := v_fee - v_cut;
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_fee, substr('Clan ' || v_kind || ' fee: ' || v_slug from 1 for 120));
  insert into public.clan_wallets (clan_id, balance)
  values (p_clan_id, v_provider)
  on conflict (clan_id) do update set
    balance = public.clan_wallets.balance + excluded.balance,
    updated_at = now();
  insert into public.clan_cost_ledger (clan_id, kind, qty, gross, cut, provider, note)
  values (p_clan_id, v_kind || '-fee', 1, v_fee, v_cut, v_provider, substr('server cost fee', 1, 200));
  return jsonb_build_object('fee_coins', v_fee, 'cut_coins', v_cut, 'wallet_coins', v_provider);
end; $$;
revoke all on function public.meter_clan_posting_fee(uuid, text, integer, boolean) from public, anon, authenticated;
grant execute on function public.meter_clan_posting_fee(uuid, text, integer, boolean) to authenticated;

-- meter_clan_posting_fee_for: explicit-user twin for service-role callers
-- (bot-key routes). Same formula; granted to service_role ONLY so the
-- caller id cannot be spoofed over the client API.
create or replace function public.meter_clan_posting_fee_for(
  p_user_id uuid, p_clan_id uuid, p_kind text, p_bytes integer, p_has_image boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_kind text := lower(trim(coalesce(p_kind, '')));
  v_bytes integer := greatest(0, coalesce(p_bytes, 0));
  v_fee numeric(12, 2);
  v_cut numeric(12, 2);
  v_provider numeric(12, 2);
  v_bal numeric(12, 2);
  v_slug text;
  v_status text;
begin
  if p_user_id is null then raise exception 'login required'; end if;
  if v_kind not in ('post', 'comment') then raise exception 'invalid kind'; end if;
  select slug, upkeep_status into v_slug, v_status
    from public.clans where id = p_clan_id;
  if v_slug is null then raise exception 'clan not found'; end if;
  if v_status = 'delinquent' then raise exception 'clan upkeep delinquent'; end if;
  if not exists (
    select 1 from public.clan_members where clan_id = p_clan_id and user_id = p_user_id
  ) then
    raise exception 'join the clan first';
  end if;
  v_fee := greatest(0.01, round((ceil(v_bytes / 1024.0) * 0.01)::numeric, 2)
    + case when coalesce(p_has_image, false) then 0.05 else 0 end);
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
  from public.coin_ledger where user_id = p_user_id;
  if v_bal < v_fee then
    raise exception 'insufficient balance: need % coins, have %', v_fee, v_bal;
  end if;
  v_cut := round(v_fee * 25 / 100.0, 2);
  v_provider := v_fee - v_cut;
  insert into public.coin_ledger (user_id, delta, reason)
  values (p_user_id, -v_fee, substr('Clan ' || v_kind || ' fee: ' || v_slug from 1 for 120));
  insert into public.clan_wallets (clan_id, balance)
  values (p_clan_id, v_provider)
  on conflict (clan_id) do update set
    balance = public.clan_wallets.balance + excluded.balance,
    updated_at = now();
  insert into public.clan_cost_ledger (clan_id, kind, qty, gross, cut, provider, note)
  values (p_clan_id, v_kind || '-fee', 1, v_fee, v_cut, v_provider, substr('server cost fee', 1, 200));
  return jsonb_build_object('fee_coins', v_fee, 'cut_coins', v_cut, 'wallet_coins', v_provider);
end; $$;
revoke all on function public.meter_clan_posting_fee_for(uuid, uuid, text, integer, boolean) from public, anon, authenticated;
grant execute on function public.meter_clan_posting_fee_for(uuid, uuid, text, integer, boolean) to service_role;

-- accrue_clan_upkeep: lazily accrue daily server upkeep since the last call.
-- Daily rate is linear in members + stored images (see lib/clan-costs.ts).
-- Deducts from the clan wallet; sets upkeep_status; delinquent at zero.
create or replace function public.accrue_clan_upkeep(p_clan_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_clan public.clans%rowtype;
  v_members integer;
  v_img_mb numeric;
  v_daily numeric(12, 2);
  v_days numeric;
  v_due numeric(12, 2);
  v_wallet numeric(12, 2);
  v_status text;
begin
  select * into v_clan from public.clans where id = p_clan_id;
  if not found then raise exception 'clan not found'; end if;
  -- Grace period: young clans accrue nothing.
  if now() < v_clan.upkeep_grace_until then
    return jsonb_build_object('due_coins', 0, 'status', v_clan.upkeep_status, 'grace', true);
  end if;
  select count(*)::integer into v_members from public.clan_members where clan_id = p_clan_id;
  -- Stored image MB: bytes of clan_images objects referenced by this clan's
  -- posts (posts carry the full storage URL, so match on storage_path).
  select round(coalesce(sum(i.bytes), 0) / 1048576.0, 2) into v_img_mb
  from public.clan_images i
  where exists (
    select 1 from public.clan_posts p
    where p.clan_id = p_clan_id
      and p.image_url is not null
      and p.image_url like '%' || i.storage_path
  );
  -- Linear upkeep formula (mirrors lib/clan-costs.ts clanDailyUpkeep):
  -- base 0.05 + 0.01/member + 0.02/stored image MB, capped at 25/day.
  v_daily := least(25.00, greatest(0.05,
    0.05 + coalesce(v_members, 0) * 0.01 + coalesce(v_img_mb, 0) * 0.02));
  v_days := greatest(0, extract(epoch from (now() - v_clan.upkeep_last_accrued)) / 86400.0);
  if v_days < 1 then
    return jsonb_build_object('due_coins', 0, 'status', v_clan.upkeep_status, 'grace', false);
  end if;
  v_due := round((v_daily * floor(v_days))::numeric, 2);
  insert into public.clan_wallets (clan_id, balance)
  values (p_clan_id, 0)
  on conflict (clan_id) do nothing;
  select balance into v_wallet from public.clan_wallets where clan_id = p_clan_id;
  if v_due > 0 then
    if v_wallet >= v_due then
      update public.clan_wallets set balance = balance - v_due, updated_at = now()
      where clan_id = p_clan_id;
      v_wallet := v_wallet - v_due;
    else
      v_due := v_wallet;
      update public.clan_wallets set balance = 0, updated_at = now()
      where clan_id = p_clan_id;
      v_wallet := 0;
    end if;
    insert into public.clan_cost_ledger (clan_id, kind, qty, gross, cut, provider, note)
    values (p_clan_id, 'upkeep', floor(v_days), v_due, 0, 0, substr('server upkeep ' || floor(v_days)::text || ' day(s)', 1, 200));
  end if;
  -- Runway status: >7d healthy, 1-7d low, 0 delinquent.
  if v_wallet <= 0 then v_status := 'delinquent';
  elsif v_wallet < v_daily * 7 then v_status := 'low';
  else v_status := 'healthy'; end if;
  update public.clans
  set upkeep_status = v_status, upkeep_last_accrued = now()
  where id = p_clan_id;
  return jsonb_build_object('due_coins', v_due, 'status', v_status, 'grace', false);
end; $$;
revoke all on function public.accrue_clan_upkeep(uuid) from public, anon, authenticated;
grant execute on function public.accrue_clan_upkeep(uuid) to authenticated;

-- fund_clan_wallet: owner moves personal coins into the clan wallet (1:1, no
-- cut — a transfer, not a purchase). Awards patron XP + badge at 100+.
create or replace function public.fund_clan_wallet(p_clan_id uuid, p_coins numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_amount numeric(12, 2) := round(coalesce(p_coins, 0), 2);
  v_bal numeric(12, 2);
  v_owner uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_amount < 0.01 or v_amount > 100000 then raise exception 'amount must be 0.01..100000'; end if;
  select owner_id into v_owner from public.clans where id = p_clan_id;
  if v_owner is null then raise exception 'clan not found'; end if;
  if v_owner <> auth.uid() then raise exception 'not the owner'; end if;
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_amount then
    raise exception 'insufficient balance: need % coins, have %', v_amount, v_bal;
  end if;
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_amount, substr('Clan funding', 1, 120));
  insert into public.clan_wallets (clan_id, balance)
  values (p_clan_id, v_amount)
  on conflict (clan_id) do update set
    balance = public.clan_wallets.balance + excluded.balance,
    updated_at = now();
  insert into public.clan_cost_ledger (clan_id, kind, qty, gross, cut, provider, note)
  values (p_clan_id, 'owner-funding', 1, v_amount, 0, v_amount, substr('owner funding', 1, 200));
  insert into public.clan_xp_ledger (user_id, clan_id, xp, reason)
  values (auth.uid(), p_clan_id, 20, 'upkeep-funded');
  if v_amount >= 100 then
    insert into public.clan_badges (user_id, clan_id, badge)
    values (auth.uid(), p_clan_id, 'patron')
    on conflict do nothing;
  end if;
  return jsonb_build_object('funded_coins', v_amount);
end; $$;
revoke all on function public.fund_clan_wallet(uuid, numeric) from public, anon, authenticated;
grant execute on function public.fund_clan_wallet(uuid, numeric) to authenticated;

-- credit_clan_channel_revenue: credit ad/affiliate revenue to the clan wallet
-- at the published per-event rate (no cut — revenue, not a purchase).
create or replace function public.credit_clan_channel_revenue(
  p_channel_id uuid, p_event text
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_event text := lower(trim(coalesce(p_event, '')));
  v_chan public.clan_monetization%rowtype;
  v_rate numeric(12, 2);
begin
  if v_event not in ('view', 'click') then raise exception 'invalid event'; end if;
  select * into v_chan from public.clan_monetization where id = p_channel_id;
  if not found then raise exception 'channel not found'; end if;
  if not v_chan.active then raise exception 'channel inactive'; end if;
  if v_chan.kind = 'house-ad' and v_event = 'view' then v_rate := 0.01;
  elsif v_chan.kind = 'affiliate' and v_event = 'click' then v_rate := 0.05;
  elsif v_chan.kind = 'sponsor' then v_rate := 0.01;
  else raise exception 'event not payable for channel'; end if;
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
revoke all on function public.credit_clan_channel_revenue(uuid, text) from public, anon, authenticated;
grant execute on function public.credit_clan_channel_revenue(uuid, text) to anon, authenticated;

-- award_clan_xp: fixed XP awards with a 100 XP/day/user/clan anti-farm cap.
create or replace function public.award_clan_xp(
  p_clan_id uuid, p_reason text, p_xp integer
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_reason text := lower(trim(coalesce(p_reason, '')));
  v_xp integer := coalesce(p_xp, 0);
  v_today integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_reason not in ('post', 'comment', 'bot-deploy', 'upkeep-funded') then
    raise exception 'invalid reason';
  end if;
  if v_xp < 1 or v_xp > 100 then raise exception 'xp must be 1..100'; end if;
  if not exists (select 1 from public.clans where id = p_clan_id) then
    raise exception 'clan not found';
  end if;
  select coalesce(sum(xp), 0)::integer into v_today
  from public.clan_xp_ledger
  where user_id = auth.uid() and clan_id = p_clan_id
    and created_at >= date_trunc('day', now());
  if v_today + v_xp > 100 then raise exception 'daily xp cap reached'; end if;
  insert into public.clan_xp_ledger (user_id, clan_id, xp, reason)
  values (auth.uid(), p_clan_id, v_xp, v_reason);
  if v_reason = 'post' then
    insert into public.clan_badges (user_id, clan_id, badge)
    values (auth.uid(), p_clan_id, 'first-post')
    on conflict do nothing;
  end if;
  select coalesce(sum(xp), 0)::integer into v_today
  from public.clan_xp_ledger
  where user_id = auth.uid() and clan_id = p_clan_id;
  if v_today >= 100 then
    insert into public.clan_badges (user_id, clan_id, badge)
    values (auth.uid(), p_clan_id, 'centurion')
    on conflict do nothing;
  end if;
  return jsonb_build_object('xp', v_xp, 'total', v_today);
end; $$;
revoke all on function public.award_clan_xp(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.award_clan_xp(uuid, text, integer) to authenticated;

-- clan_leaderboard: top 25 members by XP with wallet-funded totals.
create or replace function public.clan_leaderboard(p_clan_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_rows jsonb;
begin
  if not exists (select 1 from public.clans where id = p_clan_id) then
    raise exception 'clan not found';
  end if;
  select coalesce(jsonb_agg(t order by t.xp desc), '[]'::jsonb) into v_rows
  from (
    select x.user_id, sum(x.xp)::integer as xp, count(*)::integer as events
    from public.clan_xp_ledger x
    where x.clan_id = p_clan_id
    group by x.user_id
    order by sum(x.xp) desc
    limit 25
  ) t;
  return jsonb_build_object('leaders', v_rows);
end; $$;
revoke all on function public.clan_leaderboard(uuid) from public, anon, authenticated;
grant execute on function public.clan_leaderboard(uuid) to anon, authenticated;

-- deploy_clan_bot: owner/mod registers a bot identity on an sclan/bclan.
-- hclans refuse (hardened against bots).
create or replace function public.deploy_clan_bot(
  p_clan_id uuid, p_bot_username text, p_webhook text default ''
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_name text := lower(trim(coalesce(p_bot_username, '')));
  v_hook text := substr(trim(coalesce(p_webhook, '')), 1, 2048);
  v_clan public.clans%rowtype;
  v_bot_user uuid;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_name !~ '^[a-z0-9_]{3,24}$' then raise exception 'invalid bot username'; end if;
  if v_hook <> '' and v_hook !~ '^https://' then raise exception 'webhook must be https'; end if;
  select * into v_clan from public.clans where id = p_clan_id;
  if not found then raise exception 'clan not found'; end if;
  if v_clan.clan_type = 'hclan' then raise exception 'hclans are human-only'; end if;
  if not exists (
    select 1 from public.clan_members
    where clan_id = p_clan_id and user_id = auth.uid() and role in ('owner', 'mod')
  ) and v_clan.owner_id <> auth.uid() then
    raise exception 'not a moderator';
  end if;
  select user_id into v_bot_user from public.bot_identities where username = v_name;
  if v_bot_user is null then raise exception 'bot not found'; end if;
  insert into public.clan_bots (clan_id, bot_user_id, name, webhook_url, added_by)
  values (p_clan_id, v_bot_user, v_name, v_hook, auth.uid())
  on conflict (clan_id, bot_user_id) do update set
    webhook_url = excluded.webhook_url, name = excluded.name
  returning id into v_id;
  insert into public.clan_xp_ledger (user_id, clan_id, xp, reason)
  values (auth.uid(), p_clan_id, 15, 'bot-deploy');
  return jsonb_build_object('id', v_id, 'bot', v_name);
end; $$;
revoke all on function public.deploy_clan_bot(uuid, text, text) from public, anon, authenticated;
grant execute on function public.deploy_clan_bot(uuid, text, text) to authenticated;

-- remove_clan_bot: owner/mod unplugs a deployed bot.
create or replace function public.remove_clan_bot(p_clan_id uuid, p_bot_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select owner_id into v_owner from public.clans where id = p_clan_id;
  if v_owner is null then raise exception 'clan not found'; end if;
  if not exists (
    select 1 from public.clan_members
    where clan_id = p_clan_id and user_id = auth.uid() and role in ('owner', 'mod')
  ) and v_owner <> auth.uid() then
    raise exception 'not a moderator';
  end if;
  delete from public.clan_bots where clan_id = p_clan_id and id = p_bot_id;
end; $$;
revoke all on function public.remove_clan_bot(uuid, uuid) from public, anon, authenticated;
grant execute on function public.remove_clan_bot(uuid, uuid) to authenticated;

-- add_clan_channel: owner registers a monetization channel.
create or replace function public.add_clan_channel(
  p_clan_id uuid, p_kind text, p_label text, p_target_url text default ''
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_kind text := lower(trim(coalesce(p_kind, '')));
  v_label text := substr(trim(coalesce(p_label, '')), 1, 120);
  v_url text := substr(trim(coalesce(p_target_url, '')), 1, 2048);
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_kind not in ('house-ad', 'affiliate', 'sponsor') then raise exception 'invalid kind'; end if;
  if char_length(v_label) < 1 then raise exception 'label required'; end if;
  if v_url <> '' and v_url !~ '^https://' then raise exception 'url must be https'; end if;
  if not exists (
    select 1 from public.clans where id = p_clan_id and owner_id = auth.uid()
  ) then
    raise exception 'not the owner';
  end if;
  insert into public.clan_monetization (clan_id, kind, label, target_url, created_by)
  values (p_clan_id, v_kind, v_label, v_url)
  on conflict (clan_id, kind, label) do update set
    target_url = excluded.target_url, active = true
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end; $$;
revoke all on function public.add_clan_channel(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.add_clan_channel(uuid, text, text, text) to authenticated;
