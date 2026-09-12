-- ============================================================================
-- Big communities + Clan Support commons.
-- Fully rerunnable: IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS.
--
-- SCALE CAPS (hard, exact, race-safe via per-org/per-clan advisory locks):
--   orgs:  10,000 members + purchased headroom, UNLESS the org is on a
--          self-hosted customer server - then the cap is the seat count on
--          its self-host license (public.self_host_licenses, sales/admin
--          provisioned; extra seats are bought as seats, not headroom).
--   clans: 100,000 members + purchased headroom.
-- Cached member_count columns (+1/-1 triggers, backfilled) keep every read
-- O(1); keyset-paginated roster RPCs keep 8k-member orgs (and 100k clans)
-- fast on both API and UI. Joins beyond the cap fail with
-- '... member limit reached (N)' (409-worthy 'limit reached').
--
-- AUTOMATED MEMBER PRUNING (opt-in for orgs, on-by-default for clans):
--   orgs:  auto-prune arms at 9,000 members when the creator enables it.
--   clans: auto-prune arms at 90,000 members by default (owner can disable).
-- Strategies: oldest_activity_first (never-active pruned first),
-- random_chance, oldest_joined_first, never_contributed. The creator (org
-- owner / clan owner-mod) can always prune manually, targeted or by
-- strategy, with dry_run previews. Owners are never pruned; joins younger
-- than 7 days are spared by strategy sweeps (targeted removes skip the
-- grace - an explicit human decision needs no waiting period).
--
-- PAID HEADROOM (the bypass): extra seats are prepaid cloud compute -
--   orgs:  10 coins per 100 bonus slots,   clans: 10 coins per 1,000 slots,
-- 25% platform cut INCLUDED (platform keeps the cut by omission, exactly
-- like clan posting fees). Receipts land in public.scale_purchases.
--
-- CLAN SUPPORTER STATUS + TOTAL CLAN SUPPORT: every donation/funding lands
-- a public.clan_donations row, so each clan has an exact, auditable pile
-- and every supporter has an exact lifetime total with a tier
-- (Ember >= 1, Spark >= 25, Beacon >= 100, Patron >= 500, Legend >= 2500).
--
-- TRIBUTE / GLOBALIZE (the commons): donations are recorded as vintages -
-- one row per consumed coin lot (mixed-lot donations split across their
-- lots, each keeping its own 1-year expiry). After 6 months past the
-- average upkeep reserve, surplus vintages become eligible, oldest-expiry
-- first. Coins older than 12 months are GLOBALIZED into the central
-- reserve; 6-12-month coins are GIVEN AS TRIBUTE (70% to the poorest
-- clans, 20% to the reserve, 10% to poor individuals). At most 50% of a
-- clan's all-time donations can ever leave, and at most ~1% of the
-- eligible surplus leaves per day (exponential decay, ~69-day half-life).
-- Expired lots can never be tributed - they stay home. The reserve
-- auto-rescues delinquent clans (up to 7 days of upkeep each).
-- Tribute is final: gifts, not charity, not investment, no cash-out.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 0. Scale settings, seats, purchase receipts.
-- --------------------------------------------------------------------------
create table if not exists public.self_host_licenses (
  org_id uuid primary key references public.orgs(id) on delete cascade,
  seats integer not null check (seats between 1 and 1000000),
  plan text not null default 'mid-tier' check (plan in ('mid-tier', 'enterprise')),
  issued_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.org_scale_settings (
  org_id uuid primary key references public.orgs(id) on delete cascade,
  headroom_slots integer not null default 0 check (headroom_slots >= 0 and headroom_slots <= 1000000),
  updated_at timestamptz not null default now()
);

create table if not exists public.clan_scale_settings (
  clan_id uuid primary key references public.clans(id) on delete cascade,
  headroom_slots integer not null default 0 check (headroom_slots >= 0 and headroom_slots <= 10000000),
  updated_at timestamptz not null default now()
);

-- Receipt log for paid headroom (exactly one side per row).
create table if not exists public.scale_purchases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid null references public.orgs(id) on delete cascade,
  clan_id uuid null references public.clans(id) on delete cascade,
  buyer_id uuid references public.profiles(id) on delete set null,
  slots integer not null check (slots > 0 and slots <= 1000000),
  gross numeric(12, 2) not null check (gross > 0),
  cut numeric(12, 2) not null default 0 check (cut >= 0),
  created_at timestamptz not null default now(),
  check ((org_id is null) <> (clan_id is null))
);
create index if not exists idx_scale_purchases_org on public.scale_purchases (org_id, created_at desc);
create index if not exists idx_scale_purchases_clan on public.scale_purchases (clan_id, created_at desc);

-- Effective caps. Self-hosted orgs are capped by purchased seats, period;
-- hosted orgs get 10,000 + headroom; clans get 100,000 + headroom.
create or replace function public.org_member_cap(p_org uuid)
returns integer language plpgsql stable security definer set search_path = public as $$
declare v_seats integer; v_head integer;
begin
  select seats into v_seats from public.self_host_licenses where org_id = p_org;
  if found then return v_seats; end if;
  select coalesce(headroom_slots, 0) into v_head from public.org_scale_settings where org_id = p_org;
  return 10000 + coalesce(v_head, 0);
end; $$;

create or replace function public.clan_member_cap(p_clan uuid)
returns integer language plpgsql stable security definer set search_path = public as $$
declare v_head integer;
begin
  select coalesce(headroom_slots, 0) into v_head from public.clan_scale_settings where clan_id = p_clan;
  return 100000 + coalesce(v_head, 0);
end; $$;

-- Sales/admin provisioning of self-host seats (service_role tooling or an
-- admin JWT; never ordinary members, never anon).
create or replace function public.set_self_host_seats(p_org uuid, p_seats integer)
returns public.self_host_licenses language plpgsql security definer set search_path = public as $$
declare v_row public.self_host_licenses%rowtype;
begin
  if auth.uid() is null then
    -- service_role key path (sales tooling has no user id; anon cannot
    -- execute this function at all, so a null uid here is the service key).
    null;
  elsif (auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' then
    raise exception 'forbidden';
  end if;
  if not exists (select 1 from public.orgs where id = p_org) then raise exception 'org not found'; end if;
  if p_seats is null or p_seats < 1 or p_seats > 1000000 then raise exception 'seats must be 1..1000000'; end if;
  insert into public.self_host_licenses (org_id, seats, updated_at)
  values (p_org, p_seats, now())
  on conflict (org_id) do update set seats = excluded.seats, updated_at = now()
  returning * into v_row;
  return v_row;
end; $$;
revoke all on function public.set_self_host_seats(uuid, integer) from public, anon;
grant execute on function public.set_self_host_seats(uuid, integer) to authenticated, service_role;

-- --------------------------------------------------------------------------
-- 1. Cached member counts (reads stay O(1) at 8k members / 100k members).
-- --------------------------------------------------------------------------
alter table public.orgs add column if not exists member_count integer not null default 0;
alter table public.clans add column if not exists member_count integer not null default 0;

create or replace function public.bump_org_member_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    update public.orgs set member_count = member_count + 1 where id = NEW.org_id;
    return NEW;
  end if;
  update public.orgs set member_count = greatest(0, member_count - 1) where id = OLD.org_id;
  return OLD;
end; $$;
drop trigger if exists trg_org_members_count_cache on public.org_members;
create trigger trg_org_members_count_cache after insert or delete on public.org_members
  for each row execute function public.bump_org_member_count();

create or replace function public.bump_clan_member_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    update public.clans set member_count = member_count + 1 where id = NEW.clan_id;
    return NEW;
  end if;
  update public.clans set member_count = greatest(0, member_count - 1) where id = OLD.clan_id;
  return OLD;
end; $$;
drop trigger if exists trg_clan_members_count_cache on public.clan_members;
create trigger trg_clan_members_count_cache after insert or delete on public.clan_members
  for each row execute function public.bump_clan_member_count();

-- Backfill (idempotent: recomputes from truth).
update public.orgs o set member_count = coalesce((select count(*) from public.org_members m where m.org_id = o.id), 0)
where o.member_count <> coalesce((select count(*) from public.org_members m where m.org_id = o.id), 0);
update public.clans c set member_count = coalesce((select count(*) from public.clan_members m where m.clan_id = c.id), 0)
where c.member_count <> coalesce((select count(*) from public.clan_members m where m.clan_id = c.id), 0);

-- Pagination + prune-activity indexes (keyset cursors + grouped scans).
create index if not exists idx_org_members_page on public.org_members (org_id, created_at, user_id);
create index if not exists idx_clan_members_page on public.clan_members (clan_id, joined_at, user_id);
create index if not exists idx_audit_log_org_actor on public.audit_log (org_id, actor_id, created_at);
create index if not exists idx_team_rooms_team on public.team_rooms (team_id);
create index if not exists idx_room_messages_sender on public.room_messages (sender_id, created_at);
create index if not exists idx_clan_posts_author on public.clan_posts (author_id, created_at);
create index if not exists idx_clan_comments_author on public.clan_comments (author_id, created_at);
create index if not exists idx_clan_messages_author on public.clan_messages (author_id, created_at);
create index if not exists idx_clan_xp_user_clan_at on public.clan_xp_ledger (clan_id, user_id, created_at);

-- --------------------------------------------------------------------------
-- 2. Hard cap enforcement (BEFORE INSERT, per-community advisory lock so
-- concurrent joins cannot overshoot; the count itself is index-fast).
-- --------------------------------------------------------------------------
create or replace function public.enforce_org_member_cap()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_cap integer; v_n integer;
begin
  v_cap := public.org_member_cap(NEW.org_id);
  perform pg_advisory_xact_lock(hashtext('orgcap:' || NEW.org_id::text));
  select count(*) into v_n from public.org_members where org_id = NEW.org_id;
  if v_n >= v_cap then
    raise exception 'organization member limit reached (%)', v_cap;
  end if;
  return NEW;
end; $$;
drop trigger if exists trg_org_members_cap on public.org_members;
create trigger trg_org_members_cap before insert on public.org_members
  for each row execute function public.enforce_org_member_cap();

create or replace function public.enforce_clan_member_cap()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_cap integer; v_n integer;
begin
  v_cap := public.clan_member_cap(NEW.clan_id);
  perform pg_advisory_xact_lock(hashtext('clancap:' || NEW.clan_id::text));
  select count(*) into v_n from public.clan_members where clan_id = NEW.clan_id;
  if v_n >= v_cap then
    raise exception 'clan member limit reached (%)', v_cap;
  end if;
  return NEW;
end; $$;
drop trigger if exists trg_clan_members_cap on public.clan_members;
create trigger trg_clan_members_cap before insert on public.clan_members
  for each row execute function public.enforce_clan_member_cap();

-- --------------------------------------------------------------------------
-- 3. Keyset-paginated rosters (the 8k-member read path).
-- --------------------------------------------------------------------------
-- Org roster page: membership-gated, newest-last keyset, optional search.
-- Returns {members:[{id,display_name,roles,joined_at}], total, next_cursor,
-- next_cursor_id}. limit is clamped 1..100.
create or replace function public.org_roster_page(
  p_org uuid, p_limit integer default 25, p_cursor timestamptz default null,
  p_cursor_id uuid default null, p_search text default ''
)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_limit integer := greatest(1, least(coalesce(p_limit, 25), 100));
  v_q text := substr(trim(coalesce(p_search, '')), 1, 40);
  v_total integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.is_org_member(p_org) then raise exception 'forbidden'; end if;
  select coalesce(member_count, 0) into v_total from public.orgs where id = p_org;
  if not found then raise exception 'org not found'; end if;
  return jsonb_build_object(
    'members', (
      select coalesce(jsonb_agg(t order by t.joined_at, t.id), '[]'::jsonb) from (
        select m.user_id as id,
          coalesce(p.display_name, p.public_handle, 'member') as display_name,
          public.org_roles_of(p_org, m.user_id) as roles,
          m.created_at as joined_at
        from public.org_members m left join public.profiles p on p.id = m.user_id
        where m.org_id = p_org
          and (p_cursor is null or (m.created_at, m.user_id) > (p_cursor, p_cursor_id))
          and (v_q = '' or coalesce(p.display_name, '') ilike '%' || v_q || '%'
            or coalesce(p.public_handle, '') ilike '%' || v_q || '%')
        order by m.created_at, m.user_id
        limit v_limit + 1
      ) t_inner
    ),
    'total', v_total,
    -- Watcher scopes ride along (tiny table) so paged readers never need
    -- the legacy full-roster call.
    'scopes', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select watcher_id, array_agg(target_user_id) as targets
        from public.org_watch_scopes where org_id = p_org
        group by watcher_id limit 200
      ) t
    )
  );
end; $$;
revoke all on function public.org_roster_page(uuid, integer, timestamptz, uuid, text) from public, anon;
grant execute on function public.org_roster_page(uuid, integer, timestamptz, uuid, text) to authenticated;

-- Clan roster page: public (clan_members reads are public), same shape.
create or replace function public.clan_roster_page(
  p_clan uuid, p_limit integer default 100, p_cursor timestamptz default null,
  p_cursor_id uuid default null
)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_limit integer := greatest(1, least(coalesce(p_limit, 100), 100));
  v_total integer;
begin
  select coalesce(member_count, 0) into v_total from public.clans where id = p_clan;
  if not found then raise exception 'clan not found'; end if;
  return jsonb_build_object(
    'members', (
      select coalesce(jsonb_agg(t order by t.joined_at, t.user_id), '[]'::jsonb) from (
        select m.user_id, m.role, m.joined_at,
          case when p.is_profile_public then p.public_handle else null end as handle
        from public.clan_members m left join public.profiles p on p.id = m.user_id
        where m.clan_id = p_clan
          and (p_cursor is null or (m.joined_at, m.user_id) > (p_cursor, p_cursor_id))
        order by m.joined_at, m.user_id
        limit v_limit + 1
      ) t_inner
    ),
    'total', v_total
  );
end; $$;
revoke all on function public.clan_roster_page(uuid, integer, timestamptz, uuid) from public, anon;
grant execute on function public.clan_roster_page(uuid, integer, timestamptz, uuid) to anon, authenticated;

-- --------------------------------------------------------------------------
-- 4. Automated Member Pruning settings.
-- Orgs: opt-in, arms at 9,000 members. Clans: on by default, arms at 90,000.
-- --------------------------------------------------------------------------
create table if not exists public.org_prune_settings (
  org_id uuid primary key references public.orgs(id) on delete cascade,
  auto_enabled boolean not null default false,
  threshold integer not null default 9000 check (threshold between 100 and 1000000),
  batch_size integer not null default 200 check (batch_size between 10 and 1000),
  strategy text not null default 'oldest_activity_first'
    check (strategy in ('oldest_activity_first', 'random_chance', 'oldest_joined_first', 'never_contributed')),
  last_run_at timestamptz null,
  last_pruned integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.clan_prune_settings (
  clan_id uuid primary key references public.clans(id) on delete cascade,
  auto_enabled boolean not null default true,
  threshold integer not null default 90000 check (threshold between 100 and 1000000),
  batch_size integer not null default 500 check (batch_size between 10 and 5000),
  strategy text not null default 'oldest_activity_first'
    check (strategy in ('oldest_activity_first', 'random_chance', 'oldest_joined_first', 'never_contributed')),
  last_run_at timestamptz null,
  last_pruned integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Seed defaults for existing communities (new rows are covered by the
-- defaults on read paths, but explicit rows make the UI + sweep uniform).
insert into public.clan_prune_settings (clan_id)
select c.id from public.clans c
on conflict (clan_id) do nothing;

alter table public.org_prune_settings enable row level security;
alter table public.clan_prune_settings enable row level security;
drop policy if exists org_prune_settings_member_read on public.org_prune_settings;
create policy org_prune_settings_member_read on public.org_prune_settings
  for select to authenticated using (public.is_org_member(org_id));
drop policy if exists clan_prune_settings_public_read on public.clan_prune_settings;
create policy clan_prune_settings_public_read on public.clan_prune_settings
  for select to anon, authenticated using (true);
revoke all on public.org_prune_settings from anon, authenticated;
revoke all on public.clan_prune_settings from anon, authenticated;
grant select on public.org_prune_settings to authenticated;
grant select on public.clan_prune_settings to anon, authenticated;

-- Configure pruning (org owner / clan moderator+). Auto-prune for orgs is
-- the opt-in "start pruning at 9,000" switch; clans ship enabled at 90k.
create or replace function public.set_org_prune_settings(
  p_org uuid, p_auto boolean, p_threshold integer, p_batch integer, p_strategy text
)
returns public.org_prune_settings language plpgsql security definer set search_path = public as $$
declare v_row public.org_prune_settings%rowtype;
  v_strategy text := lower(trim(coalesce(p_strategy, 'oldest_activity_first')));
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not exists (select 1 from public.orgs where id = p_org and owner_id = auth.uid()) then
    raise exception 'only the org creator configures pruning';
  end if;
  if v_strategy not in ('oldest_activity_first', 'random_chance', 'oldest_joined_first', 'never_contributed') then
    raise exception 'unknown strategy';
  end if;
  insert into public.org_prune_settings (org_id, auto_enabled, threshold, batch_size, strategy, updated_at)
  values (p_org, coalesce(p_auto, false),
    greatest(100, least(1000000, coalesce(p_threshold, 9000))),
    greatest(10, least(1000, coalesce(p_batch, 200))),
    v_strategy, now())
  on conflict (org_id) do update set auto_enabled = excluded.auto_enabled,
    threshold = excluded.threshold, batch_size = excluded.batch_size,
    strategy = excluded.strategy, updated_at = now()
  returning * into v_row;
  return v_row;
end; $$;
revoke all on function public.set_org_prune_settings(uuid, boolean, integer, integer, text) from public, anon;
grant execute on function public.set_org_prune_settings(uuid, boolean, integer, integer, text) to authenticated;

create or replace function public.set_clan_prune_settings(
  p_clan uuid, p_auto boolean, p_threshold integer, p_batch integer, p_strategy text
)
returns public.clan_prune_settings language plpgsql security definer set search_path = public as $$
declare v_row public.clan_prune_settings%rowtype;
  v_strategy text := lower(trim(coalesce(p_strategy, 'oldest_activity_first')));
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.clan_is_moderator(p_clan, auth.uid()) then raise exception 'not a moderator'; end if;
  if v_strategy not in ('oldest_activity_first', 'random_chance', 'oldest_joined_first', 'never_contributed') then
    raise exception 'unknown strategy';
  end if;
  insert into public.clan_prune_settings (clan_id, auto_enabled, threshold, batch_size, strategy, updated_at)
  values (p_clan, coalesce(p_auto, true),
    greatest(100, least(1000000, coalesce(p_threshold, 90000))),
    greatest(10, least(5000, coalesce(p_batch, 500))),
    v_strategy, now())
  on conflict (clan_id) do update set auto_enabled = excluded.auto_enabled,
    threshold = excluded.threshold, batch_size = excluded.batch_size,
    strategy = excluded.strategy, updated_at = now()
  returning * into v_row;
  return v_row;
end; $$;
revoke all on function public.set_clan_prune_settings(uuid, boolean, integer, integer, text) from public, anon;
grant execute on function public.set_clan_prune_settings(uuid, boolean, integer, integer, text) to authenticated;

-- --------------------------------------------------------------------------
-- 5. Prune execution. Owners are never pruned. Strategy sweeps spare joins
-- younger than 7 days; targeted removes (explicit human decision) do not.
-- p_user_ids targets specific members (<=200); otherwise the strategy
-- picks up to p_limit victims (<=1000). dry_run previews without deleting.
-- --------------------------------------------------------------------------
create or replace function public.prune_org_members(
  p_org uuid, p_strategy text default 'oldest_activity_first',
  p_limit integer default 200, p_user_ids uuid[] default null,
  p_dry_run boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_strategy text := lower(trim(coalesce(p_strategy, 'oldest_activity_first')));
  v_limit integer := greatest(1, least(coalesce(p_limit, 200), 1000));
  v_owner uuid;
  v_victims uuid[];
  v_count integer := 0;
  v_preview jsonb;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select owner_id into v_owner from public.orgs where id = p_org;
  if v_owner is null then raise exception 'org not found'; end if;
  if v_owner <> auth.uid() and not public.has_org_perm(p_org, 'org.members.remove') then
    raise exception 'only the org creator prunes members';
  end if;
  if v_strategy not in ('oldest_activity_first', 'random_chance', 'oldest_joined_first', 'never_contributed') then
    raise exception 'unknown strategy';
  end if;

  if p_user_ids is not null and array_length(p_user_ids, 1) > 0 then
    -- Targeted manual prune: explicit members, owner never included.
    if array_length(p_user_ids, 1) > 200 then raise exception 'at most 200 targeted members'; end if;
    select array_agg(distinct m.user_id) into v_victims
    from public.org_members m
    where m.org_id = p_org and m.user_id = any (p_user_ids) and m.user_id <> v_owner;
  else
    -- Strategy sweep over activity computed from the org's own bounded
    -- history (audit + ghost timers + team rooms), never a full-table scan.
    with acts as (
      select a.actor_id as uid, max(a.created_at) as at
      from public.audit_log a
      where a.org_id = p_org and a.actor_id is not null
      group by 1
      union all
      select t.worker_id as uid, max(t.clock_in) as at
      from public.ghost_timers t
      join public.ghost_contracts c on c.id = t.contract_id
      where c.org_id = p_org
      group by 1
      union all
      select rm.sender_id as uid, max(rm.created_at) as at
      from public.room_messages rm
      join public.team_rooms r on r.id = rm.room_id
      join public.teams tm on tm.id = r.team_id
      where tm.org_id = p_org and rm.sender_id is not null
      group by 1
    ),
    lastact as (select uid, max(at) as at from acts group by 1),
    cands as (
      select m.user_id, m.created_at as joined_at, l.at as last_active
      from public.org_members m
      left join lastact l on l.uid = m.user_id
      where m.org_id = p_org
        and m.user_id <> v_owner
        and m.created_at < now() - interval '7 days'
        and (v_strategy <> 'never_contributed' or l.at is null)
    ),
    ordered as (
      select user_id from cands
      order by
        case when v_strategy = 'random_chance' then random() end,
        case when v_strategy = 'oldest_activity_first' then last_active end nulls first,
        case when v_strategy in ('oldest_activity_first', 'never_contributed', 'oldest_joined_first') then joined_at end,
        user_id
      limit v_limit
    )
    select coalesce(array_agg(user_id), '{}') into v_victims from ordered;
  end if;

  -- Preview (dry run): ordered candidates with the same full activity
  -- signal the sweep uses (audit + ghost timers + team rooms), max 100.
  with acts as (
    select a.actor_id as uid, max(a.created_at) as at
    from public.audit_log a
    where a.org_id = p_org and a.actor_id is not null
    group by 1
    union all
    select t.worker_id as uid, max(t.clock_in) as at
    from public.ghost_timers t
    join public.ghost_contracts c on c.id = t.contract_id
    where c.org_id = p_org
    group by 1
    union all
    select rm.sender_id as uid, max(rm.created_at) as at
    from public.room_messages rm
    join public.team_rooms r on r.id = rm.room_id
    join public.teams tm on tm.id = r.team_id
    where tm.org_id = p_org and rm.sender_id is not null
    group by 1
  ),
  lastact as (select uid, max(at) as at from acts group by 1)
  select coalesce(jsonb_agg(t order by t.last_active nulls first, t.joined_at), '[]'::jsonb) into v_preview
  from (
    select v.user_id,
      coalesce(p.display_name, p.public_handle, 'member') as display_name,
      m.created_at as joined_at,
      (select max(at) from lastact where uid = v.user_id) as last_active
    from unnest(coalesce(v_victims, '{}')) as v(user_id)
    join public.org_members m on m.org_id = p_org and m.user_id = v.user_id
    left join public.profiles p on p.id = v.user_id
    limit 100
  ) t;

  if coalesce(p_dry_run, false) then
    return jsonb_build_object('dry_run', true, 'strategy', v_strategy,
      'victims', coalesce(array_length(v_victims, 1), 0), 'preview', v_preview);
  end if;

  if coalesce(array_length(v_victims, 1), 0) > 0 then
    -- Full offboard: org seat + preset roles + watch scopes + team/project/
    -- room seats inside this org's workspaces (history rows stay).
    delete from public.org_member_roles where org_id = p_org and user_id = any (v_victims);
    delete from public.org_watch_scopes
    where org_id = p_org and (watcher_id = any (v_victims) or target_user_id = any (v_victims));
    delete from public.team_members
    where user_id = any (v_victims)
      and team_id in (select id from public.teams where org_id = p_org);
    delete from public.project_members
    where user_id = any (v_victims)
      and project_id in (select pr.id from public.team_projects pr
        join public.teams t on t.id = pr.team_id where t.org_id = p_org);
    delete from public.room_members
    where user_id = any (v_victims)
      and room_id in (select r.id from public.team_rooms r
        join public.teams t on t.id = r.team_id where t.org_id = p_org);
    delete from public.org_members where org_id = p_org and user_id = any (v_victims);
    get diagnostics v_count = row_count;
    perform public._audit(p_org, null, 'org.prune',
      substr('pruned ' || v_count::text || ' via ' || v_strategy, 1, 200));
  end if;
  update public.org_prune_settings set last_run_at = now(), last_pruned = v_count
  where org_id = p_org;
  return jsonb_build_object('dry_run', false, 'strategy', v_strategy,
    'removed', v_count, 'preview', v_preview);
end; $$;
revoke all on function public.prune_org_members(uuid, text, integer, uuid[], boolean) from public, anon;
grant execute on function public.prune_org_members(uuid, text, integer, uuid[], boolean) to authenticated;

create or replace function public.prune_clan_members(
  p_clan uuid, p_strategy text default 'oldest_activity_first',
  p_limit integer default 500, p_user_ids uuid[] default null,
  p_dry_run boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_strategy text := lower(trim(coalesce(p_strategy, 'oldest_activity_first')));
  v_limit integer := greatest(1, least(coalesce(p_limit, 500), 1000));
  v_owner uuid;
  v_victims uuid[];
  v_count integer := 0;
  v_preview jsonb;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select owner_id into v_owner from public.clans where id = p_clan;
  if v_owner is null then raise exception 'clan not found'; end if;
  if not public.clan_is_moderator(p_clan, auth.uid()) then
    raise exception 'only the clan owner prunes members';
  end if;
  if v_strategy not in ('oldest_activity_first', 'random_chance', 'oldest_joined_first', 'never_contributed') then
    raise exception 'unknown strategy';
  end if;

  if p_user_ids is not null and array_length(p_user_ids, 1) > 0 then
    if array_length(p_user_ids, 1) > 200 then raise exception 'at most 200 targeted members'; end if;
    select array_agg(distinct m.user_id) into v_victims
    from public.clan_members m
    where m.clan_id = p_clan and m.user_id = any (p_user_ids) and m.user_id <> v_owner;
  else
    -- Clan activity: posts + comments + chat + XP, grouped per member from
    -- this clan's rows only (indexed author scans, never full tables).
    with acts as (
      select p.author_id as uid, max(p.created_at) as at
      from public.clan_posts p where p.clan_id = p_clan group by 1
      union all
      select c.author_id as uid, max(c.created_at) as at
      from public.clan_comments c
      join public.clan_posts p on p.id = c.post_id
      where p.clan_id = p_clan group by 1
      union all
      select m.author_id as uid, max(m.created_at) as at
      from public.clan_messages m where m.clan_id = p_clan group by 1
      union all
      select x.user_id as uid, max(x.created_at) as at
      from public.clan_xp_ledger x where x.clan_id = p_clan group by 1
    ),
    lastact as (select uid, max(at) as at from acts group by 1),
    cands as (
      select m.user_id, m.joined_at, l.at as last_active,
        coalesce((select sum(x.xp) from public.clan_xp_ledger x
          where x.clan_id = p_clan and x.user_id = m.user_id), 0)::integer as xp
      from public.clan_members m
      left join lastact l on l.uid = m.user_id
      where m.clan_id = p_clan
        and m.user_id <> v_owner
        and m.joined_at < now() - interval '7 days'
        and (v_strategy <> 'never_contributed' or l.at is null)
    ),
    ordered as (
      select user_id from cands
      order by
        case when v_strategy = 'random_chance' then random() end,
        case when v_strategy = 'oldest_activity_first' then last_active end nulls first,
        case when v_strategy = 'never_contributed' then xp end,
        case when v_strategy in ('oldest_activity_first', 'never_contributed', 'oldest_joined_first') then joined_at end,
        user_id
      limit v_limit
    )
    select coalesce(array_agg(user_id), '{}') into v_victims from ordered;
  end if;

  -- Preview uses the same full clan signal (posts + comments + chat + XP).
  with acts as (
    select p.author_id as uid, max(p.created_at) as at
    from public.clan_posts p where p.clan_id = p_clan group by 1
    union all
    select c2.author_id as uid, max(c2.created_at) as at
    from public.clan_comments c2
    join public.clan_posts p on p.id = c2.post_id
    where p.clan_id = p_clan group by 1
    union all
    select m2.author_id as uid, max(m2.created_at) as at
    from public.clan_messages m2 where m2.clan_id = p_clan group by 1
    union all
    select x.user_id as uid, max(x.created_at) as at
    from public.clan_xp_ledger x where x.clan_id = p_clan group by 1
  ),
  lastact as (select uid, max(at) as at from acts group by 1)
  select coalesce(jsonb_agg(t order by t.last_active nulls first, t.joined_at), '[]'::jsonb) into v_preview
  from (
    select v.user_id,
      coalesce(p.display_name, p.public_handle, 'member') as display_name,
      m.joined_at as joined_at,
      (select max(at) from lastact where uid = v.user_id) as last_active,
      coalesce((select sum(x.xp) from public.clan_xp_ledger x
        where x.clan_id = p_clan and x.user_id = v.user_id), 0)::integer as xp
    from unnest(coalesce(v_victims, '{}')) as v(user_id)
    join public.clan_members m on m.clan_id = p_clan and m.user_id = v.user_id
    left join public.profiles p on p.id = v.user_id
    limit 100
  ) t;

  if coalesce(p_dry_run, false) then
    return jsonb_build_object('dry_run', true, 'strategy', v_strategy,
      'victims', coalesce(array_length(v_victims, 1), 0), 'preview', v_preview);
  end if;

  if coalesce(array_length(v_victims, 1), 0) > 0 then
    delete from public.clan_member_roles where clan_id = p_clan and user_id = any (v_victims);
    delete from public.clan_members where clan_id = p_clan and user_id = any (v_victims);
    get diagnostics v_count = row_count;
  end if;
  update public.clan_prune_settings set last_run_at = now(), last_pruned = v_count
  where clan_id = p_clan;
  return jsonb_build_object('dry_run', false, 'strategy', v_strategy,
    'removed', v_count, 'preview', v_preview);
end; $$;
revoke all on function public.prune_clan_members(uuid, text, integer, uuid[], boolean) from public, anon;
grant execute on function public.prune_clan_members(uuid, text, integer, uuid[], boolean) to authenticated;

-- --------------------------------------------------------------------------
-- 6. Daily auto-prune sweep (service_role; one community can never block
-- another; at most one run per community per day).
-- --------------------------------------------------------------------------
create or replace function public.run_org_auto_prune()
returns jsonb language plpgsql security definer set search_path = public as $$
declare r record; v_res jsonb; v_orgs integer := 0; v_removed integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext('org-auto-prune-sweep'));
  for r in
    select s.org_id, s.threshold, s.batch_size, s.strategy
    from public.org_prune_settings s
    join public.orgs o on o.id = s.org_id
    where s.auto_enabled
      and o.member_count >= s.threshold
      and (s.last_run_at is null or s.last_run_at < now() - interval '1 day')
  loop
    begin
      -- Auto runs act as the org creator (owner check inside is bypassed
      -- here by design: the creator opted in via set_org_prune_settings).
      v_res := public._auto_prune_org(r.org_id, r.strategy, r.batch_size);
      v_orgs := v_orgs + 1;
      v_removed := v_removed + coalesce((v_res ->> 'removed')::integer, 0);
    exception when others then continue; end;
  end loop;
  return jsonb_build_object('orgs', v_orgs, 'removed', v_removed);
end; $$;
revoke all on function public.run_org_auto_prune() from public, anon, authenticated;
grant execute on function public.run_org_auto_prune() to service_role;

-- Auto-prune core shared by the sweep: same victim selection as manual
-- strategy prunes, executed without a caller (opt-in lives in settings).
create or replace function public._auto_prune_org(p_org uuid, p_strategy text, p_batch integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_strategy text := lower(trim(coalesce(p_strategy, 'oldest_activity_first')));
  v_limit integer := greatest(10, least(coalesce(p_batch, 200), 1000));
  v_owner uuid;
  v_victims uuid[];
  v_count integer := 0;
begin
  select owner_id into v_owner from public.orgs where id = p_org;
  if v_owner is null then raise exception 'org not found'; end if;
  with acts as (
    select a.actor_id as uid, max(a.created_at) as at
    from public.audit_log a
    where a.org_id = p_org and a.actor_id is not null
    group by 1
    union all
    select t.worker_id as uid, max(t.clock_in) as at
    from public.ghost_timers t
    join public.ghost_contracts c on c.id = t.contract_id
    where c.org_id = p_org
    group by 1
    union all
    select rm.sender_id as uid, max(rm.created_at) as at
    from public.room_messages rm
    join public.team_rooms r on r.id = rm.room_id
    join public.teams tm on tm.id = r.team_id
    where tm.org_id = p_org and rm.sender_id is not null
    group by 1
  ),
  lastact as (select uid, max(at) as at from acts group by 1),
  ordered as (
    select m.user_id from public.org_members m
    left join lastact l on l.uid = m.user_id
    where m.org_id = p_org
      and m.user_id <> v_owner
      and m.created_at < now() - interval '7 days'
      and (v_strategy <> 'never_contributed' or l.at is null)
    order by
      case when v_strategy = 'random_chance' then random() end,
      case when v_strategy = 'oldest_activity_first' then l.at end nulls first,
      case when v_strategy in ('oldest_activity_first', 'never_contributed', 'oldest_joined_first') then m.created_at end,
      m.user_id
    limit v_limit
  )
  select coalesce(array_agg(user_id), '{}') into v_victims from ordered;
  if coalesce(array_length(v_victims, 1), 0) > 0 then
    delete from public.org_member_roles where org_id = p_org and user_id = any (v_victims);
    delete from public.org_watch_scopes
    where org_id = p_org and (watcher_id = any (v_victims) or target_user_id = any (v_victims));
    delete from public.team_members
    where user_id = any (v_victims)
      and team_id in (select id from public.teams where org_id = p_org);
    delete from public.project_members
    where user_id = any (v_victims)
      and project_id in (select pr.id from public.team_projects pr
        join public.teams t on t.id = pr.team_id where t.org_id = p_org);
    delete from public.room_members
    where user_id = any (v_victims)
      and room_id in (select r.id from public.team_rooms r
        join public.teams t on t.id = r.team_id where t.org_id = p_org);
    delete from public.org_members where org_id = p_org and user_id = any (v_victims);
    get diagnostics v_count = row_count;
    perform public._audit(p_org, null, 'org.auto-prune',
      substr('auto-pruned ' || v_count::text || ' via ' || v_strategy, 1, 200));
  end if;
  update public.org_prune_settings set last_run_at = now(), last_pruned = v_count
  where org_id = p_org;
  return jsonb_build_object('removed', v_count, 'strategy', v_strategy);
end; $$;
revoke all on function public._auto_prune_org(uuid, text, integer) from public, anon, authenticated;

create or replace function public.run_clan_auto_prune()
returns jsonb language plpgsql security definer set search_path = public as $$
declare r record; v_res jsonb; v_clans integer := 0; v_removed integer := 0;
  v_owner uuid; v_victims uuid[]; v_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('clan-auto-prune-sweep'));
  -- Missing settings rows mean defaults (auto ON at 90k): new clans are
  -- covered from birth without a settings write on the create path.
  for r in
    select c.id as clan_id,
      coalesce(s.threshold, 90000) as threshold,
      coalesce(s.batch_size, 500) as batch_size,
      coalesce(s.strategy, 'oldest_activity_first') as strategy
    from public.clans c
    left join public.clan_prune_settings s on s.clan_id = c.id
    where coalesce(s.auto_enabled, true)
      and c.member_count >= coalesce(s.threshold, 90000)
      and (s.last_run_at is null or s.last_run_at < now() - interval '1 day')
  loop
    begin
      select owner_id into v_owner from public.clans where id = r.clan_id;
      with acts as (
        select p.author_id as uid, max(p.created_at) as at
        from public.clan_posts p where p.clan_id = r.clan_id group by 1
        union all
        select c2.author_id as uid, max(c2.created_at) as at
        from public.clan_comments c2
        join public.clan_posts p on p.id = c2.post_id
        where p.clan_id = r.clan_id group by 1
        union all
        select m.author_id as uid, max(m.created_at) as at
        from public.clan_messages m where m.clan_id = r.clan_id group by 1
        union all
        select x.user_id as uid, max(x.created_at) as at
        from public.clan_xp_ledger x where x.clan_id = r.clan_id group by 1
      ),
      lastact as (select uid, max(at) as at from acts group by 1),
      ordered as (
        select m.user_id from public.clan_members m
        left join lastact l on l.uid = m.user_id
        where m.clan_id = r.clan_id
          and m.user_id <> v_owner
          and m.joined_at < now() - interval '7 days'
          and (r.strategy <> 'never_contributed' or l.at is null)
        order by
          case when r.strategy = 'random_chance' then random() end,
          case when r.strategy = 'oldest_activity_first' then l.at end nulls first,
          case when r.strategy in ('oldest_activity_first', 'never_contributed', 'oldest_joined_first') then m.joined_at end,
          m.user_id
        limit greatest(10, least(coalesce(r.batch_size, 500), 5000))
      )
      select coalesce(array_agg(user_id), '{}') into v_victims from ordered;
      v_count := 0;
      if coalesce(array_length(v_victims, 1), 0) > 0 then
        delete from public.clan_member_roles where clan_id = r.clan_id and user_id = any (v_victims);
        delete from public.clan_members where clan_id = r.clan_id and user_id = any (v_victims);
        get diagnostics v_count = row_count;
      end if;
      insert into public.clan_prune_settings (clan_id, last_run_at, last_pruned)
      values (r.clan_id, now(), v_count)
      on conflict (clan_id) do update set last_run_at = now(), last_pruned = v_count;
      v_clans := v_clans + 1;
      v_removed := v_removed + v_count;
    exception when others then continue; end;
  end loop;
  return jsonb_build_object('clans', v_clans, 'removed', v_removed);
end; $$;
revoke all on function public.run_clan_auto_prune() from public, anon, authenticated;
grant execute on function public.run_clan_auto_prune() to service_role;

-- --------------------------------------------------------------------------
-- 7. Paid headroom: prepay cloud compute to lift the cap. Simple flat
-- prices, 25% cut INCLUDED (platform keeps the cut by omission, exactly
-- like clan posting fees; the buyer pays gross personal coins).
--   orgs:  10 coins per 100 bonus slots (100..100,000 slots per purchase).
--   clans: 10 coins per 1,000 bonus slots (1,000..1,000,000 per purchase).
-- Upkeep still meters per member afterwards - headroom lifts the ceiling,
-- it does not pay the rent.
-- --------------------------------------------------------------------------
alter table public.scale_purchases enable row level security;
drop policy if exists scale_purchases_self_read on public.scale_purchases;
create policy scale_purchases_self_read on public.scale_purchases
  for select to authenticated using (
    buyer_id = auth.uid()
    or (org_id is not null and public.has_org_perm(org_id, 'org.billing.view'))
    or (clan_id is not null and public.clan_is_moderator(clan_id, auth.uid()))
  );
revoke all on public.scale_purchases from anon, authenticated;
grant select on public.scale_purchases to authenticated;
alter table public.self_host_licenses enable row level security;
drop policy if exists self_host_licenses_member_read on public.self_host_licenses;
create policy self_host_licenses_member_read on public.self_host_licenses
  for select to authenticated using (public.is_org_member(org_id));
revoke all on public.self_host_licenses from anon, authenticated;
grant select on public.self_host_licenses to authenticated;

create or replace function public.buy_org_headroom(p_org uuid, p_slots integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_slots integer := coalesce(p_slots, 0);
  v_gross numeric(12, 2);
  v_cut numeric(12, 2);
  v_bal numeric(12, 2);
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not exists (select 1 from public.orgs where id = p_org) then raise exception 'org not found'; end if;
  if not public.has_org_perm(p_org, 'org.billing.manage') then raise exception 'forbidden'; end if;
  if exists (select 1 from public.self_host_licenses where org_id = p_org) then
    raise exception 'self-hosted orgs grow by seats, not headroom';
  end if;
  if v_slots < 100 or v_slots > 100000 then raise exception 'slots must be 100..100000'; end if;
  v_gross := round(v_slots * 0.10, 2);
  v_cut := round(v_gross * 25 / 100.0, 2);
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_gross then
    raise exception 'insufficient balance: need % coins, have %', v_gross, v_bal;
  end if;
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_gross, substr('Org headroom +' || v_slots::text || ' slots', 1, 120));
  insert into public.scale_purchases (org_id, buyer_id, slots, gross, cut)
  values (p_org, auth.uid(), v_slots, v_gross, v_cut);
  insert into public.org_scale_settings (org_id, headroom_slots)
  values (p_org, v_slots)
  on conflict (org_id) do update set
    headroom_slots = public.org_scale_settings.headroom_slots + excluded.headroom_slots,
    updated_at = now();
  perform public._audit(p_org, null, 'org.headroom',
    substr('+' || v_slots::text || ' slots for ' || v_gross::text || ' coins', 1, 200));
  return jsonb_build_object('slots', v_slots, 'gross_coins', v_gross,
    'cut_coins', v_cut, 'cap', public.org_member_cap(p_org));
end; $$;
revoke all on function public.buy_org_headroom(uuid, integer) from public, anon;
grant execute on function public.buy_org_headroom(uuid, integer) to authenticated;

create or replace function public.buy_clan_headroom(p_clan uuid, p_slots integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_slots integer := coalesce(p_slots, 0);
  v_gross numeric(12, 2);
  v_cut numeric(12, 2);
  v_bal numeric(12, 2);
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not exists (select 1 from public.clans where id = p_clan and owner_id = auth.uid()) then
    raise exception 'only the clan owner buys headroom';
  end if;
  if v_slots < 1000 or v_slots > 1000000 then raise exception 'slots must be 1000..1000000'; end if;
  v_gross := round(v_slots * 0.01, 2);
  v_cut := round(v_gross * 25 / 100.0, 2);
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_gross then
    raise exception 'insufficient balance: need % coins, have %', v_gross, v_bal;
  end if;
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_gross, substr('Clan headroom +' || v_slots::text || ' slots', 1, 120));
  insert into public.scale_purchases (clan_id, buyer_id, slots, gross, cut)
  values (p_clan, auth.uid(), v_slots, v_gross, v_cut);
  insert into public.clan_scale_settings (clan_id, headroom_slots)
  values (p_clan, v_slots)
  on conflict (clan_id) do update set
    headroom_slots = public.clan_scale_settings.headroom_slots + excluded.headroom_slots,
    updated_at = now();
  return jsonb_build_object('slots', v_slots, 'gross_coins', v_gross,
    'cut_coins', v_cut, 'cap', public.clan_member_cap(p_clan));
end; $$;
revoke all on function public.buy_clan_headroom(uuid, integer) from public, anon;
grant execute on function public.buy_clan_headroom(uuid, integer) to authenticated;

-- One-round-trip scale status for settings UIs.
create or replace function public.org_scale_status(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_seats integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.is_org_member(p_org) then raise exception 'forbidden'; end if;
  select seats into v_seats from public.self_host_licenses where org_id = p_org;
  return jsonb_build_object(
    'member_count', (select coalesce(member_count, 0) from public.orgs where id = p_org),
    'cap', public.org_member_cap(p_org),
    'seats', v_seats,
    'self_hosted', v_seats is not null,
    'headroom_slots', (select coalesce(headroom_slots, 0) from public.org_scale_settings where org_id = p_org),
    'prune', coalesce((select row_to_json(s) from public.org_prune_settings s where s.org_id = p_org),
      jsonb_build_object('auto_enabled', false, 'threshold', 9000, 'batch_size', 200,
        'strategy', 'oldest_activity_first', 'last_run_at', null, 'last_pruned', 0))
  );
end; $$;
revoke all on function public.org_scale_status(uuid) from public, anon;
grant execute on function public.org_scale_status(uuid) to authenticated;

create or replace function public.clan_scale_status(p_clan uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.clans where id = p_clan) then raise exception 'clan not found'; end if;
  return jsonb_build_object(
    'member_count', (select coalesce(member_count, 0) from public.clans where id = p_clan),
    'cap', public.clan_member_cap(p_clan),
    'headroom_slots', (select coalesce(headroom_slots, 0) from public.clan_scale_settings where clan_id = p_clan),
    'prune', coalesce((select row_to_json(s) from public.clan_prune_settings s where s.clan_id = p_clan),
      jsonb_build_object('auto_enabled', true, 'threshold', 90000, 'batch_size', 500,
        'strategy', 'oldest_activity_first', 'last_run_at', null, 'last_pruned', 0))
  );
end; $$;
revoke all on function public.clan_scale_status(uuid) from public, anon;
grant execute on function public.clan_scale_status(uuid) to anon, authenticated;

-- --------------------------------------------------------------------------
-- 8. Total Clan Support: every donation/funding lands an exact receipt row,
-- plus one vintage row per consumed coin lot (mixed-lot donations split
-- across their lots, each keeping its own 1-year expiry - read straight
-- off coin_lot_spends for the debit, so the vintages always agree with
-- the FIFO ledger). donate_clan_upkeep + fund_clan_wallet are redefined
-- here with identical economics plus the receipts (old files untouched).
-- --------------------------------------------------------------------------
create table if not exists public.clan_donations (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  donor_id uuid references public.profiles(id) on delete set null,
  coins numeric(12, 2) not null check (coins > 0 and coins <= 100000),
  kind text not null check (kind in ('donation', 'funding')),
  debit_ledger_id uuid null references public.coin_ledger(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_clan_donations_clan on public.clan_donations (clan_id, created_at desc);
create index if not exists idx_clan_donations_donor on public.clan_donations (clan_id, donor_id);

create table if not exists public.clan_donation_vintages (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  donor_id uuid references public.profiles(id) on delete set null,
  donation_id uuid null references public.clan_donations(id) on delete set null,
  lot_id uuid null references public.coin_lots(id) on delete set null,
  coins numeric(12, 2) not null check (coins > 0 and coins <= 100000),
  remaining numeric(12, 2) not null check (remaining >= 0 and remaining <= 100000),
  donated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  eligible_at timestamptz not null,
  status text not null default 'active'
    check (status in ('active', 'globalized', 'tributed', 'expired')),
  created_at timestamptz not null default now(),
  -- eligible_at is always exactly 6 months after the gift (we set both).
  -- expires_at is INHERITED from the donor's consumed coin lot (mixed-lot
  -- donations split across lots, each keeping its own 1-year expiry), so
  -- it is deliberately NOT tied to donated_at here.
  check (eligible_at = donated_at + interval '6 months')
);
create index if not exists idx_clan_vintages_eligible on public.clan_donation_vintages
  (clan_id, status, expires_at, donated_at, id) where remaining > 0;

alter table public.clan_donations enable row level security;
alter table public.clan_donation_vintages enable row level security;
-- Receipts are community transparency (amounts + timing are public; donor
-- identity resolves through clan_supporter_status with privacy respected).
drop policy if exists clan_donations_public_read on public.clan_donations;
create policy clan_donations_public_read on public.clan_donations
  for select to anon, authenticated using (true);
revoke all on public.clan_donations from anon, authenticated;
revoke all on public.clan_donation_vintages from anon, authenticated;
grant select on public.clan_donations to anon, authenticated;

create or replace function public.donate_clan_upkeep(p_clan_id uuid, p_coins numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_amount numeric(12, 2) := round(coalesce(p_coins, 0), 2);
  v_bal numeric(12, 2);
  v_total numeric(12, 2);
  v_xp_today integer;
  v_debit_id uuid;
  v_donation_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_amount < 0.01 or v_amount > 100000 then raise exception 'amount must be 0.01..100000'; end if;
  if not exists (select 1 from public.clans where id = p_clan_id) then
    raise exception 'clan not found';
  end if;
  if not exists (
    select 1 from public.clan_members where clan_id = p_clan_id and user_id = auth.uid()
  ) then
    raise exception 'join the clan first';
  end if;
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_amount then
    raise exception 'insufficient balance: need % coins, have %', v_amount, v_bal;
  end if;
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_amount, substr('Clan donation', 1, 120))
  returning id into v_debit_id;
  insert into public.clan_wallets (clan_id, balance)
  values (p_clan_id, v_amount)
  on conflict (clan_id) do update set
    balance = public.clan_wallets.balance + excluded.balance,
    updated_at = now();
  insert into public.clan_cost_ledger (clan_id, kind, qty, gross, cut, provider, note)
  values (p_clan_id, 'donation', 1, v_amount, 0, v_amount, substr('member donation', 1, 200));
  -- Total Clan Support receipt + lot-accurate vintages (mixed lots split).
  insert into public.clan_donations (clan_id, donor_id, coins, kind, debit_ledger_id)
  values (p_clan_id, auth.uid(), v_amount, 'donation', v_debit_id)
  returning id into v_donation_id;
  insert into public.clan_donation_vintages
    (clan_id, donor_id, donation_id, lot_id, coins, remaining, donated_at, expires_at, eligible_at)
  select p_clan_id, auth.uid(), v_donation_id, s.lot_id, s.coins, s.coins,
    now(), l.expires_at, now() + interval '6 months'
  from public.coin_lot_spends s
  join public.coin_lots l on l.id = s.lot_id
  where s.debit_ledger_id = v_debit_id;
  -- Donation XP respects the same 100/day anti-farm cap as award_clan_xp.
  select coalesce(sum(xp), 0)::integer into v_xp_today
  from public.clan_xp_ledger
  where user_id = auth.uid() and clan_id = p_clan_id
    and created_at >= date_trunc('day', now());
  if v_xp_today < 100 then
    insert into public.clan_xp_ledger (user_id, clan_id, xp, reason)
    values (auth.uid(), p_clan_id, least(20, 100 - v_xp_today), 'upkeep-funded');
  end if;
  select coalesce(sum(gross), 0)::numeric(12, 2) into v_total
  from public.clan_cost_ledger where clan_id = p_clan_id and kind = 'donation';
  if v_total >= 100 then
    insert into public.clan_badges (user_id, clan_id, badge)
    values (auth.uid(), p_clan_id, 'patron')
    on conflict do nothing;
  end if;
  return jsonb_build_object('donated_coins', v_amount);
end; $$;
revoke all on function public.donate_clan_upkeep(uuid, numeric) from public, anon, authenticated;
grant execute on function public.donate_clan_upkeep(uuid, numeric) to authenticated;

create or replace function public.fund_clan_wallet(p_clan_id uuid, p_coins numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_amount numeric(12, 2) := round(coalesce(p_coins, 0), 2);
  v_bal numeric(12, 2);
  v_owner uuid;
  v_debit_id uuid;
  v_donation_id uuid;
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
  values (auth.uid(), -v_amount, substr('Clan funding', 1, 120))
  returning id into v_debit_id;
  insert into public.clan_wallets (clan_id, balance)
  values (p_clan_id, v_amount)
  on conflict (clan_id) do update set
    balance = public.clan_wallets.balance + excluded.balance,
    updated_at = now();
  insert into public.clan_cost_ledger (clan_id, kind, qty, gross, cut, provider, note)
  values (p_clan_id, 'owner-funding', 1, v_amount, 0, v_amount, substr('owner funding', 1, 200));
  insert into public.clan_donations (clan_id, donor_id, coins, kind, debit_ledger_id)
  values (p_clan_id, auth.uid(), v_amount, 'funding', v_debit_id)
  returning id into v_donation_id;
  insert into public.clan_donation_vintages
    (clan_id, donor_id, donation_id, lot_id, coins, remaining, donated_at, expires_at, eligible_at)
  select p_clan_id, auth.uid(), v_donation_id, s.lot_id, s.coins, s.coins,
    now(), l.expires_at, now() + interval '6 months'
  from public.coin_lot_spends s
  join public.coin_lots l on l.id = s.lot_id
  where s.debit_ledger_id = v_debit_id;
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

-- Backfill receipts for pre-vintage donations (single vintage each; their
-- own lot expiries are unknowable, so they carry a fresh 6-month clock
-- from now - never punished retroactively, never eligible instantly).
-- Donor identity for old rows is not stored in clan_cost_ledger, so these
-- backfilled rows are donor-anonymous (donor_id null) by necessity.
insert into public.clan_donations (clan_id, donor_id, coins, kind, created_at)
select l.clan_id, null, l.gross, case when l.kind = 'owner-funding' then 'funding' else 'donation' end, l.created_at
from public.clan_cost_ledger l
where l.kind in ('donation', 'owner-funding')
  and not exists (select 1 from public.clan_donations d
    where d.clan_id = l.clan_id and d.coins = l.gross and d.created_at = l.created_at)
on conflict do nothing;

insert into public.clan_donation_vintages
  (clan_id, donor_id, donation_id, coins, remaining, donated_at, expires_at, eligible_at)
select d.clan_id, d.donor_id, d.id, d.coins, d.coins,
  now(), now() + interval '1 year', now() + interval '6 months'
from public.clan_donations d
where not exists (select 1 from public.clan_donation_vintages v where v.donation_id = d.id)
on conflict do nothing;

-- --------------------------------------------------------------------------
-- 9. Clan Supporter Status: exact lifetime totals per supporter with tiers.
-- Ember >= 1, Spark >= 25, Beacon >= 100, Patron >= 500, Legend >= 2500.
-- Handles resolve only for public profiles (private donors stay "member").
-- --------------------------------------------------------------------------
create or replace function public.clan_supporter_tier(p_coins numeric)
returns text language sql immutable set search_path = public as $$
  select case
    when coalesce(p_coins, 0) >= 2500 then 'Legend'
    when coalesce(p_coins, 0) >= 500 then 'Patron'
    when coalesce(p_coins, 0) >= 100 then 'Beacon'
    when coalesce(p_coins, 0) >= 25 then 'Spark'
    when coalesce(p_coins, 0) >= 1 then 'Ember'
    else 'None'
  end;
$$;

create or replace function public.clan_supporter_status(p_clan uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_total numeric(12, 2); v_donors integer;
begin
  if not exists (select 1 from public.clans where id = p_clan) then raise exception 'clan not found'; end if;
  select coalesce(sum(coins), 0)::numeric(12, 2) into v_total
  from public.clan_donations where clan_id = p_clan;
  select count(distinct donor_id)::integer into v_donors
  from public.clan_donations where clan_id = p_clan and donor_id is not null;
  return jsonb_build_object(
    'total_support', v_total,
    'donor_count', coalesce(v_donors, 0),
    'supporters', (
      select coalesce(jsonb_agg(t order by t.coins desc), '[]'::jsonb) from (
        select d.donor_id as user_id,
          case when p.is_profile_public then coalesce(p.public_handle, p.display_name, 'member') else 'member' end as handle,
          sum(d.coins)::numeric(12, 2) as coins,
          public.clan_supporter_tier(sum(d.coins)) as tier,
          count(*)::integer as gifts,
          max(d.created_at) as last_gift_at
        from public.clan_donations d
        left join public.profiles p on p.id = d.donor_id
        where d.clan_id = p_clan and d.donor_id is not null
        group by d.donor_id, p.is_profile_public, p.public_handle, p.display_name
        order by sum(d.coins) desc
        limit 25
      ) t
    ),
    'me', (
      select case when sum(d.coins) is null then null else jsonb_build_object(
        'coins', sum(d.coins)::numeric(12, 2),
        'tier', public.clan_supporter_tier(sum(d.coins)),
        'gifts', count(*)::integer) end
      from public.clan_donations d
      where d.clan_id = p_clan and d.donor_id = auth.uid()
    )
  );
end; $$;
revoke all on function public.clan_supporter_status(uuid) from public, anon;
grant execute on function public.clan_supporter_status(uuid) to anon, authenticated;

-- --------------------------------------------------------------------------
-- 10. Tribute / Globalize (the Clan Support commons).
-- Widen the cost ledger kinds first (rerunnable drop + add, same pattern
-- as the v3 migration).
-- --------------------------------------------------------------------------
alter table public.clan_cost_ledger drop constraint if exists clan_cost_ledger_kind_check;
alter table public.clan_cost_ledger add constraint clan_cost_ledger_kind_check
  check (kind in (
    'post-fee', 'comment-fee', 'message-fee', 'upkeep', 'ad-revenue',
    'affiliate-revenue', 'owner-funding', 'donation', 'storage', 'database',
    'bandwidth', 'ai-moderation', 'server',
    'tribute-in', 'tribute-out', 'globalized', 'reserve-rescue-in', 'headroom'
  ));

-- The central reserve: one row, owned by everyone, spent only on rescues.
create table if not exists public.global_clan_reserve (
  id integer primary key check (id = 1),
  balance numeric(12, 2) not null default 0 check (balance >= 0 and balance <= 100000000),
  updated_at timestamptz not null default now()
);
insert into public.global_clan_reserve (id, balance) values (1, 0) on conflict (id) do nothing;

-- Every tribute movement, auditable both directions.
create table if not exists public.tribute_ledger (
  id uuid primary key default gen_random_uuid(),
  from_clan_id uuid null references public.clans(id) on delete set null,
  to_kind text not null check (to_kind in ('clan', 'reserve', 'individual')),
  to_clan_id uuid null references public.clans(id) on delete set null,
  to_user_id uuid null references public.profiles(id) on delete set null,
  coins numeric(12, 2) not null check (coins > 0 and coins <= 100000),
  phase text not null check (phase in ('globalized', 'tribute', 'reserve-rescue')),
  created_at timestamptz not null default now(),
  check ((to_kind = 'clan' and to_clan_id is not null and to_user_id is null)
    or (to_kind = 'reserve' and to_clan_id is null and to_user_id is null)
    or (to_kind = 'individual' and to_clan_id is null and to_user_id is not null))
);
create index if not exists idx_tribute_from on public.tribute_ledger (from_clan_id, created_at desc);
create index if not exists idx_tribute_to_clan on public.tribute_ledger (to_clan_id, created_at desc);

-- Lifetime tributed per clan (the 50% cap reads this, never a full scan).
create table if not exists public.clan_tribute_totals (
  clan_id uuid primary key references public.clans(id) on delete cascade,
  tributed_all_time numeric(12, 2) not null default 0 check (tributed_all_time >= 0),
  updated_at timestamptz not null default now()
);

alter table public.global_clan_reserve enable row level security;
alter table public.tribute_ledger enable row level security;
alter table public.clan_tribute_totals enable row level security;
drop policy if exists clan_reserve_public_read on public.global_clan_reserve;
create policy clan_reserve_public_read on public.global_clan_reserve
  for select to anon, authenticated using (true);
drop policy if exists tribute_ledger_public_read on public.tribute_ledger;
create policy tribute_ledger_public_read on public.tribute_ledger
  for select to anon, authenticated using (true);
drop policy if exists tribute_totals_public_read on public.clan_tribute_totals;
create policy tribute_totals_public_read on public.clan_tribute_totals
  for select to anon, authenticated using (true);
revoke all on public.global_clan_reserve from anon, authenticated;
revoke all on public.tribute_ledger from anon, authenticated;
revoke all on public.clan_tribute_totals from anon, authenticated;
grant select on public.global_clan_reserve to anon, authenticated;
grant select on public.tribute_ledger to anon, authenticated;
grant select on public.clan_tribute_totals to anon, authenticated;

-- Read-only tribute math for status UIs (same formula the sweep uses).
create or replace function public.clan_tribute_status(p_clan uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_rate jsonb; v_daily numeric(12, 2); v_floor numeric(12, 2);
  v_wallet numeric(12, 2); v_total numeric(12, 2); v_tributed numeric(12, 2);
  v_aged numeric(12, 2); v_eligible numeric(12, 2); v_allow numeric(12, 2);
  v_next numeric(12, 2);
begin
  if not exists (select 1 from public.clans where id = p_clan) then raise exception 'clan not found'; end if;
  v_rate := public.clan_minute_rate(p_clan);
  v_daily := round(coalesce((v_rate ->> 'per_minute_coins')::numeric, 0) * 1440, 2);
  v_floor := round(v_daily * 365, 2);
  select coalesce(balance, 0)::numeric(12, 2) into v_wallet from public.clan_wallets where clan_id = p_clan;
  select coalesce(sum(coins), 0)::numeric(12, 2) into v_total from public.clan_donations where clan_id = p_clan;
  select coalesce(tributed_all_time, 0)::numeric(12, 2) into v_tributed from public.clan_tribute_totals where clan_id = p_clan;
  select coalesce(sum(remaining), 0)::numeric(12, 2) into v_aged
  from public.clan_donation_vintages
  where clan_id = p_clan and status = 'active' and remaining > 0
    and eligible_at <= now() and expires_at > now();
  v_eligible := least(greatest(coalesce(v_wallet, 0) - v_floor, 0), coalesce(v_aged, 0));
  v_allow := greatest(coalesce(v_total, 0) * 0.5 - coalesce(v_tributed, 0), 0);
  v_next := least(floor(least(v_eligible, v_allow) * 0.01 * 100) / 100.0, least(v_eligible, v_allow));
  if v_next < 1 then v_next := 0; end if;
  return jsonb_build_object(
    'wallet', coalesce(v_wallet, 0),
    'daily_upkeep', v_daily,
    'reserve_floor', v_floor,
    'total_support', coalesce(v_total, 0),
    'tributed_all_time', coalesce(v_tributed, 0),
    'lifetime_cap', round(coalesce(v_total, 0) * 0.5, 2),
    'eligible_now', round(least(v_eligible, v_allow), 2),
    'next_daily_estimate', v_next,
    'reserve_balance', (select coalesce(balance, 0) from public.global_clan_reserve where id = 1)
  );
end; $$;
revoke all on function public.clan_tribute_status(uuid) from public, anon;
grant execute on function public.clan_tribute_status(uuid) to anon, authenticated;

-- Daily commons sweep (service_role only): expire stale vintages, move up
-- to ~1% of each rich clan's eligible surplus (oldest-expiry first;
-- >=12mo GLOBALIZED to the reserve, 6-12mo GIVEN AS TRIBUTE split 70%
-- poorest clans / 20% reserve / 10% poor individuals), then spend the
-- reserve rescuing delinquent clans. One sick clan never blocks the rest.
create or replace function public.run_clan_tribute_sweep()
returns jsonb language plpgsql security definer set search_path = public as $$
declare r record;
  v_rate jsonb; v_daily numeric(12, 2); v_floor numeric(12, 2);
  v_wallet numeric(12, 2); v_total numeric(12, 2); v_tributed numeric(12, 2);
  v_allow numeric(12, 2); v_pool numeric(12, 2); v_move numeric(12, 2);
  v_left numeric(12, 2); v_take numeric(12, 2); v_phase text;
  v_global_part numeric(12, 2); v_trib_part numeric(12, 2); v_moved numeric(12, 2);
  v_poor_share numeric(12, 2); v_res_share numeric(12, 2); v_people_share numeric(12, 2);
  v_poor uuid[]; v_people uuid[]; v_each numeric(12, 2); v_first_extra numeric(12, 2);
  v_clans integer := 0; v_out numeric(12, 2) := 0; v_rescued integer := 0;
  v_need numeric(12, 2); v_give numeric(12, 2); v_reserve numeric(12, 2);
  v_vintage record; v_poor_id uuid; v_person_id uuid; v_i integer;
begin
  perform pg_advisory_xact_lock(hashtext('clan-tribute-sweep'));

  -- Expired lots can never travel - they stay home (wallets untouched).
  update public.clan_donation_vintages set status = 'expired'
  where status = 'active' and expires_at <= now();

  for r in
    select c.id from public.clans c
    join public.clan_wallets w on w.clan_id = c.id
    where w.balance > 0
      and exists (select 1 from public.clan_donations d where d.clan_id = c.id)
  loop
    begin
      v_rate := public.clan_minute_rate(r.id);
      v_daily := round(coalesce((v_rate ->> 'per_minute_coins')::numeric, 0) * 1440, 2);
      v_floor := round(v_daily * 365, 2);
      select balance into v_wallet from public.clan_wallets where clan_id = r.id;
      select coalesce(sum(coins), 0)::numeric(12, 2) into v_total
      from public.clan_donations where clan_id = r.id;
      select coalesce(tributed_all_time, 0)::numeric(12, 2) into v_tributed
      from public.clan_tribute_totals where clan_id = r.id;
      v_allow := greatest(coalesce(v_total, 0) * 0.5 - coalesce(v_tributed, 0), 0);
      if v_allow < 1 then continue; end if;
      select coalesce(sum(remaining), 0)::numeric(12, 2) into v_pool
      from public.clan_donation_vintages
      where clan_id = r.id and status = 'active' and remaining > 0
        and eligible_at <= now() and expires_at > now();
      v_pool := least(coalesce(v_pool, 0), greatest(coalesce(v_wallet, 0) - v_floor, 0), v_allow);
      -- 1%/day exponential decay: a radiological half-life of ~69 days.
      v_move := floor(v_pool * 0.01 * 100) / 100.0;
      if v_move < 1 then continue; end if;

      -- Oldest-expiry first; >=12 months old GLOBALIZES, 6-12 months TRIBUTES.
      v_left := v_move; v_global_part := 0; v_trib_part := 0;
      for v_vintage in
        select id, remaining, donated_at
        from public.clan_donation_vintages
        where clan_id = r.id and status = 'active' and remaining > 0
          and eligible_at <= now() and expires_at > now()
        order by expires_at, donated_at, id
      loop
        exit when v_left <= 0;
        v_take := least(v_vintage.remaining, v_left);
        if v_vintage.donated_at < now() - interval '12 months' then
          v_phase := 'globalized'; v_global_part := v_global_part + v_take;
        else
          v_phase := 'tributed'; v_trib_part := v_trib_part + v_take;
        end if;
        update public.clan_donation_vintages
        set remaining = remaining - v_take,
          status = case when remaining - v_take <= 0 then v_phase else 'active' end
        where id = v_vintage.id;
        v_left := v_left - v_take;
      end loop;
      v_moved := v_move - v_left;
      if v_moved < 1 then continue; end if;

      update public.clan_wallets set balance = balance - v_moved, updated_at = now()
      where clan_id = r.id;
      if v_trib_part > 0 then
        insert into public.clan_cost_ledger (clan_id, kind, qty, gross, cut, provider, note)
        values (r.id, 'tribute-out', 1, v_trib_part, 0, 0, substr('given as tribute to the commons', 1, 200));
      end if;
      if v_global_part > 0 then
        insert into public.clan_cost_ledger (clan_id, kind, qty, gross, cut, provider, note)
        values (r.id, 'globalized', 1, v_global_part, 0, 0, substr('globalized to the clan reserve', 1, 200));
      end if;
      insert into public.clan_tribute_totals (clan_id, tributed_all_time)
      values (r.id, v_moved)
      on conflict (clan_id) do update set
        tributed_all_time = public.clan_tribute_totals.tributed_all_time + excluded.tributed_all_time,
        updated_at = now();

      -- Globalized coins belong to everyone now: straight to the reserve.
      if v_global_part > 0 then
        update public.global_clan_reserve set balance = balance + v_global_part, updated_at = now() where id = 1;
        insert into public.tribute_ledger (from_clan_id, to_kind, coins, phase)
        values (r.id, 'reserve', v_global_part, 'globalized');
      end if;

      -- Tribute split: 70% poorest clans, 20% reserve, 10% poor individuals.
      if v_trib_part > 0 then
        v_poor_share := floor(v_trib_part * 0.70 * 100) / 100.0;
        v_res_share := floor(v_trib_part * 0.20 * 100) / 100.0;
        v_people_share := v_trib_part - v_poor_share - v_res_share;
        -- Random 3 of the 12 poorest wallets (the source clan excluded).
        select coalesce(array_agg(q.id), '{}') into v_poor
        from (
          select t.id from (
            select c2.id from public.clans c2
            left join public.clan_wallets w2 on w2.clan_id = c2.id
            where c2.id <> r.id
            order by coalesce(w2.balance, 0), random()
            limit 12
          ) t order by random() limit 3
        ) q;
        if coalesce(array_length(v_poor, 1), 0) = 0 then
          v_res_share := v_res_share + v_poor_share; v_poor_share := 0;
        else
          v_each := floor(v_poor_share / array_length(v_poor, 1) * 100) / 100.0;
          v_first_extra := round(v_poor_share - v_each * array_length(v_poor, 1), 2);
          v_i := 0;
          foreach v_poor_id in array v_poor loop
            v_i := v_i + 1;
            v_give := v_each + case when v_i = 1 then v_first_extra else 0 end;
            if v_give >= 0.01 then
              insert into public.clan_wallets (clan_id, balance)
              values (v_poor_id, v_give)
              on conflict (clan_id) do update set
                balance = public.clan_wallets.balance + excluded.balance, updated_at = now();
              insert into public.clan_cost_ledger (clan_id, kind, qty, gross, cut, provider, note)
              values (v_poor_id, 'tribute-in', 1, v_give, 0, v_give, substr('tribute from the commons', 1, 200));
              insert into public.tribute_ledger (from_clan_id, to_kind, to_clan_id, coins, phase)
              values (r.id, 'clan', v_poor_id, v_give, 'tribute');
            else
              v_res_share := v_res_share + v_give;
            end if;
          end loop;
        end if;
        if v_res_share >= 0.01 then
          update public.global_clan_reserve set balance = balance + v_res_share, updated_at = now() where id = 1;
          insert into public.tribute_ledger (from_clan_id, to_kind, coins, phase)
          values (r.id, 'reserve', v_res_share, 'tribute');
        end if;
        -- Poor individuals: clan members anywhere holding under 100 coins.
        if v_people_share >= 1 then
          select coalesce(array_agg(t.uid order by random()), '{}') into v_people
          from (
            select distinct m.user_id as uid
            from public.clan_members m
            where (select coalesce(sum(l.remaining), 0) from public.coin_lots l
                where l.user_id = m.user_id and l.expires_at > now()) < 100
            order by random()
            limit 10
          ) t;
          if coalesce(array_length(v_people, 1), 0) > 0 then
            v_each := floor(v_people_share / array_length(v_people, 1) * 100) / 100.0;
            if v_each >= 1 then
              foreach v_person_id in array v_people loop
                -- Personal credits mint fresh 1-year lots via the FIFO trigger.
                insert into public.coin_ledger (user_id, delta, reason)
                values (v_person_id, v_each, substr('Clan tribute from the commons', 1, 120));
                insert into public.tribute_ledger (from_clan_id, to_kind, to_user_id, coins, phase)
                values (r.id, 'individual', v_person_id, v_each, 'tribute');
              end loop;
              v_people_share := v_people_share - v_each * array_length(v_people, 1);
            end if;
          end if;
          if v_people_share >= 0.01 then
            update public.global_clan_reserve set balance = balance + v_people_share, updated_at = now() where id = 1;
            insert into public.tribute_ledger (from_clan_id, to_kind, coins, phase)
            values (r.id, 'reserve', v_people_share, 'tribute');
          end if;
        elsif v_people_share >= 0.01 then
          update public.global_clan_reserve set balance = balance + v_people_share, updated_at = now() where id = 1;
          insert into public.tribute_ledger (from_clan_id, to_kind, coins, phase)
          values (r.id, 'reserve', v_people_share, 'tribute');
        end if;
      end if;

      v_clans := v_clans + 1;
      v_out := v_out + v_moved;
    exception when others then continue; end;
  end loop;

  -- The reserve rescues delinquent clans: oldest-delinquent first, up to
  -- 7 days of upkeep (capped at 500 coins) per clan per sweep.
  for r in
    select c.id from public.clans c
    where c.upkeep_status = 'delinquent'
    order by c.upkeep_last_accrued asc
    limit 25
  loop
    begin
      select balance into v_reserve from public.global_clan_reserve where id = 1;
      exit when coalesce(v_reserve, 0) < 1;
      v_rate := public.clan_minute_rate(r.id);
      v_daily := round(coalesce((v_rate ->> 'per_minute_coins')::numeric, 0) * 1440, 2);
      v_need := least(v_daily * 7, 500, v_reserve);
      if v_need < 1 then continue; end if;
      update public.global_clan_reserve set balance = balance - v_need, updated_at = now() where id = 1;
      insert into public.clan_wallets (clan_id, balance)
      values (r.id, v_need)
      on conflict (clan_id) do update set
        balance = public.clan_wallets.balance + excluded.balance, updated_at = now();
      insert into public.clan_cost_ledger (clan_id, kind, qty, gross, cut, provider, note)
      values (r.id, 'reserve-rescue-in', 1, v_need, 0, v_need, substr('rescued by the clan reserve', 1, 200));
      insert into public.tribute_ledger (from_clan_id, to_kind, to_clan_id, coins, phase)
      values (null, 'clan', r.id, v_need, 'reserve-rescue');
      v_rescued := v_rescued + 1;
    exception when others then continue; end;
  end loop;

  select balance into v_reserve from public.global_clan_reserve where id = 1;
  return jsonb_build_object('clans_tributed', v_clans, 'coins_moved', round(v_out, 2),
    'clans_rescued', v_rescued, 'reserve_balance', coalesce(v_reserve, 0));
end; $$;
revoke all on function public.run_clan_tribute_sweep() from public, anon, authenticated;
grant execute on function public.run_clan_tribute_sweep() to service_role;
