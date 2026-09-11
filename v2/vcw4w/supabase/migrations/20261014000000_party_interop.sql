-- ============================================================================
-- Party interop; squads (teams) + clans + orgs + individuals interact.
-- Fully rerunnable: IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS.
--
-- Model: all four entity kinds share uuid PKs, so links/invites/challenges/
-- feed address any party as (kind, id):
--   individual = public.profiles(id)   [by handle or id]
--   squad      = public.teams(id)      [squads ARE teams; /api/squads alias]
--   clan       = public.clans(id)      [by slug]
--   org        = public.orgs(id)       [by slug]
--
-- Surfaces:
--   party_links     ; public follow badges (instant) + ally/rival (via
--                      accepted invites only; never direct-written).
--   party_invites   ; cross-entity join/ally proposals. Accepting applies
--                      the real membership side-effect (team_members,
--                      clan_members, org_members) or an ally link pair.
--   party_challenges; open challenges (squad-vs-clan, org-vs-org,
--                      individual-vs-squad, ...), decided by either side.
--   party_posts     ; public town-square feed; any party can post to the
--                      square or @ another party. Posting is free and
--                      coin-free; Valley Net screens at the route layer.
--
-- Writes go through the SECURITY DEFINER RPCs only (deny-by-default RLS,
-- no client INSERT/UPDATE/DELETE policies). No coin tables are touched.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 0. Kind guard (shared by every RPC + CHECK below).
-- --------------------------------------------------------------------------
create or replace function public.party_kind_valid(p_kind text)
returns boolean language sql immutable set search_path = public as $$
  select coalesce(p_kind, '') in ('individual', 'squad', 'clan', 'org');
$$;

-- Entity must exist (and for individuals, must have a profile row).
create or replace function public.party_entity_exists(p_kind text, p_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  if not public.party_kind_valid(p_kind) or p_id is null then return false; end if;
  if p_kind = 'individual' then
    return exists (select 1 from public.profiles where id = p_id);
  elsif p_kind = 'squad' then
    return exists (select 1 from public.teams where id = p_id);
  elsif p_kind = 'clan' then
    return exists (select 1 from public.clans where id = p_id);
  elsif p_kind = 'org' then
    return exists (select 1 from public.orgs where id = p_id);
  end if;
  return false;
end; $$;

-- May the caller SPEAK AS this party (post/challenge/invite/follow from it)?
create or replace function public.party_can_act(p_kind text, p_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if not public.party_entity_exists(p_kind, p_id) then return false; end if;
  if p_kind = 'individual' then
    return p_id = auth.uid();
  elsif p_kind = 'squad' then
    return public.has_team_perm(p_id, 'team.view');
  elsif p_kind = 'clan' then
    return exists (select 1 from public.clan_members where clan_id = p_id and user_id = auth.uid());
  elsif p_kind = 'org' then
    return public.is_org_member(p_id);
  end if;
  return false;
end; $$;

-- May the caller ADMINISTER this party (accept/decline invites + challenges
-- addressed TO it, decide its challenges)?
create or replace function public.party_can_admin(p_kind text, p_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if not public.party_entity_exists(p_kind, p_id) then return false; end if;
  if p_kind = 'individual' then
    return p_id = auth.uid();
  elsif p_kind = 'squad' then
    -- Team officers (or org owners, via has_team_perm inheritance) decide.
    return public.has_team_perm(p_id, 'team.members.invite');
  elsif p_kind = 'clan' then
    return exists (select 1 from public.clans where id = p_id and owner_id = auth.uid())
      or exists (select 1 from public.clan_members
        where clan_id = p_id and user_id = auth.uid() and role in ('owner', 'mod'));
  elsif p_kind = 'org' then
    return public.has_org_perm(p_id, 'org.members.invite');
  end if;
  return false;
end; $$;

-- Human-readable label for feeds/directories (definer so callers can
-- resolve names of parties they may not have SELECT on, e.g. profiles).
create or replace function public.party_label(p_kind text, p_id uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare v_name text := '';
begin
  if p_kind = 'individual' then
    select coalesce(nullif(trim(display_name), ''), nullif(trim(public_handle), ''), 'player')
      into v_name from public.profiles where id = p_id;
  elsif p_kind = 'squad' then
    select name into v_name from public.teams where id = p_id;
  elsif p_kind = 'clan' then
    select name into v_name from public.clans where id = p_id;
  elsif p_kind = 'org' then
    select name into v_name from public.orgs where id = p_id;
  end if;
  return substr(coalesce(nullif(trim(v_name), ''), p_kind || ':' || substr(p_id::text, 1, 8)), 1, 80);
end; $$;

-- --------------------------------------------------------------------------
-- 1. Tables.
-- --------------------------------------------------------------------------
create table if not exists public.party_links (
  id uuid primary key default gen_random_uuid(),
  from_kind text not null check (from_kind in ('individual', 'squad', 'clan', 'org')),
  from_id uuid not null,
  to_kind text not null check (to_kind in ('individual', 'squad', 'clan', 'org')),
  to_id uuid not null,
  relation text not null check (relation in ('follow', 'ally', 'rival')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (from_kind <> to_kind or from_id <> to_id),
  unique (from_kind, from_id, to_kind, to_id, relation)
);
create index if not exists idx_party_links_from on public.party_links (from_kind, from_id, created_at desc);
create index if not exists idx_party_links_to on public.party_links (to_kind, to_id, created_at desc);

create table if not exists public.party_invites (
  id uuid primary key default gen_random_uuid(),
  from_kind text not null check (from_kind in ('individual', 'squad', 'clan', 'org')),
  from_id uuid not null,
  to_kind text not null check (to_kind in ('individual', 'squad', 'clan', 'org')),
  to_id uuid not null,
  message varchar(280) not null default '' check (char_length(message) <= 280),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check (from_kind <> to_kind or from_id <> to_id)
);
create index if not exists idx_party_invites_from on public.party_invites (from_kind, from_id, status, created_at desc);
create index if not exists idx_party_invites_to on public.party_invites (to_kind, to_id, status, created_at desc);
-- One live proposal per directed pair (history stays; retries re-open freely).
create unique index if not exists uq_party_invites_pending
  on public.party_invites (from_kind, from_id, to_kind, to_id)
  where status = 'pending';

create table if not exists public.party_challenges (
  id uuid primary key default gen_random_uuid(),
  challenger_kind text not null check (challenger_kind in ('individual', 'squad', 'clan', 'org')),
  challenger_id uuid not null,
  opponent_kind text not null check (opponent_kind in ('individual', 'squad', 'clan', 'org')),
  opponent_id uuid not null,
  game_slug text not null default '' check (game_slug ~ '^[a-z0-9-]{0,64}$'),
  message varchar(280) not null default '' check (char_length(message) <= 280),
  status text not null default 'open' check (status in ('open', 'accepted', 'declined', 'cancelled', 'completed')),
  winner_kind text check (winner_kind is null or winner_kind in ('individual', 'squad', 'clan', 'org')),
  winner_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check (challenger_kind <> opponent_kind or challenger_id <> opponent_id),
  check ((status = 'completed' and winner_kind is not null and winner_id is not null)
    or (status <> 'completed' and winner_kind is null and winner_id is null))
);
create index if not exists idx_party_challenges_c on public.party_challenges (challenger_kind, challenger_id, status, created_at desc);
create index if not exists idx_party_challenges_o on public.party_challenges (opponent_kind, opponent_id, status, created_at desc);

create table if not exists public.party_posts (
  id uuid primary key default gen_random_uuid(),
  actor_kind text not null check (actor_kind in ('individual', 'squad', 'clan', 'org')),
  actor_id uuid not null,
  target_kind text check (target_kind is null or target_kind in ('individual', 'squad', 'clan', 'org')),
  target_id uuid,
  body varchar(2000) not null check (char_length(trim(body)) between 1 and 2000),
  game_slug text not null default '' check (game_slug ~ '^[a-z0-9-]{0,64}$'),
  status text not null default 'visible' check (status in ('visible', 'pending', 'hidden')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((target_kind is null and target_id is null) or (target_kind is not null and target_id is not null)),
  check (target_kind is null or actor_kind <> target_kind or actor_id <> target_id)
);
create index if not exists idx_party_posts_actor on public.party_posts (actor_kind, actor_id, created_at desc);
create index if not exists idx_party_posts_target on public.party_posts (target_kind, target_id, created_at desc);
create index if not exists idx_party_posts_recent on public.party_posts (created_at desc) where status = 'visible';

-- --------------------------------------------------------------------------
-- 2. RLS; public square reads; writes via RPCs only.
-- --------------------------------------------------------------------------
alter table public.party_links enable row level security;
alter table public.party_invites enable row level security;
alter table public.party_challenges enable row level security;
alter table public.party_posts enable row level security;

-- Links/challenges/feed are public badges: anyone may read them.
drop policy if exists party_links_public_read on public.party_links;
create policy party_links_public_read on public.party_links
  for select to anon, authenticated using (true);
drop policy if exists party_challenges_public_read on public.party_challenges;
create policy party_challenges_public_read on public.party_challenges
  for select to anon, authenticated using (true);
drop policy if exists party_posts_visible_read on public.party_posts;
create policy party_posts_visible_read on public.party_posts
  for select to anon, authenticated using (status = 'visible');

-- Invites are semi-private: visible only to either side's actors/admins.
drop policy if exists party_invites_sides_read on public.party_invites;
create policy party_invites_sides_read on public.party_invites
  for select to authenticated using (
    public.party_can_act(from_kind, from_id)
    or public.party_can_admin(to_kind, to_id)
    or public.party_can_act(to_kind, to_id)
  );

revoke all on public.party_links from anon, authenticated;
revoke all on public.party_challenges from anon, authenticated;
revoke all on public.party_posts from anon, authenticated;
revoke all on public.party_invites from anon, authenticated;
grant select on public.party_links to anon, authenticated;
grant select on public.party_challenges to anon, authenticated;
grant select on public.party_posts to anon, authenticated;
grant select on public.party_invites to authenticated;

-- --------------------------------------------------------------------------
-- 3. Directory: resolve one party + search all four kinds.
-- --------------------------------------------------------------------------
-- Resolve by slug/handle/id. Squads resolve by id (team slugs repeat per
-- org); clans/orgs by slug or id; individuals by handle or id (private
-- profiles resolve for self only, else 'not found').
create or replace function public.party_resolve(p_kind text, p_ref text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_ref text := trim(coalesce(p_ref, '')); v_row jsonb;
begin
  if not public.party_kind_valid(p_kind) then raise exception 'unknown party kind'; end if;
  if v_ref = '' then raise exception 'reference required'; end if;
  if p_kind = 'individual' then
    if v_ref ~ '^[0-9a-f-]{36}$' then
      select jsonb_build_object('kind', 'individual', 'id', p.id,
          'slug', coalesce(p.public_handle, split_part(p.id::text, '-', 1)),
          'name', coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.public_handle), ''), 'player'))
        into v_row from public.profiles p
        where p.id = v_ref::uuid
          and (p.is_profile_public or p.id = auth.uid());
    else
      select jsonb_build_object('kind', 'individual', 'id', p.id,
          'slug', p.public_handle,
          'name', coalesce(nullif(trim(p.display_name), ''), p.public_handle, 'player'))
        into v_row from public.profiles p
        where lower(p.public_handle) = lower(v_ref)
          and (p.is_profile_public or p.id = auth.uid());
    end if;
  elsif p_kind = 'squad' then
    if v_ref !~ '^[0-9a-f-]{36}$' then raise exception 'squad reference must be its id'; end if;
    select jsonb_build_object('kind', 'squad', 'id', t.id, 'slug', t.slug,
        'name', t.name, 'org_id', t.org_id, 'visibility', t.visibility)
      into v_row from public.teams t
      where t.id = v_ref::uuid
        and (t.visibility = 'public' or public.has_team_perm(t.id, 'team.view'));
  elsif p_kind = 'clan' then
    if v_ref ~ '^[0-9a-f-]{36}$' then
      select jsonb_build_object('kind', 'clan', 'id', c.id, 'slug', c.slug, 'name', c.name)
        into v_row from public.clans c where c.id = v_ref::uuid;
    else
      select jsonb_build_object('kind', 'clan', 'id', c.id, 'slug', c.slug, 'name', c.name)
        into v_row from public.clans c where c.slug = lower(v_ref);
    end if;
  elsif p_kind = 'org' then
    if v_ref ~ '^[0-9a-f-]{36}$' then
      select jsonb_build_object('kind', 'org', 'id', o.id, 'slug', o.slug, 'name', o.name)
        into v_row from public.orgs o
        where o.id = v_ref::uuid and (o.visibility = 'public' or public.is_org_member(o.id));
    else
      select jsonb_build_object('kind', 'org', 'id', o.id, 'slug', o.slug, 'name', o.name)
        into v_row from public.orgs o
        where o.slug = lower(v_ref) and (o.visibility = 'public' or public.is_org_member(o.id));
    end if;
  end if;
  if v_row is null then raise exception 'party not found'; end if;
  return v_row;
end; $$;
revoke all on function public.party_resolve(text, text) from public, anon;
grant execute on function public.party_resolve(text, text) to anon, authenticated;

-- Search box: up to 8 hits per kind, visibility-filtered.
create or replace function public.party_search(p_query text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_q text := substr(trim(coalesce(p_query, '')), 1, 40);
begin
  if char_length(v_q) < 2 then raise exception 'search needs 2+ characters'; end if;
  return jsonb_build_object(
    'individuals', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select p.id, coalesce(p.public_handle, split_part(p.id::text, '-', 1)) as slug,
          coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.public_handle), ''), 'player') as name
        from public.profiles p
        where (p.is_profile_public or p.id = auth.uid())
          and (p.public_handle ilike '%' || v_q || '%' or p.display_name ilike '%' || v_q || '%')
        limit 8
      ) t
    ),
    'squads', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select t.id, t.slug, t.name, t.org_id from public.teams t
        where (t.visibility = 'public' or public.has_team_perm(t.id, 'team.view'))
          and (t.slug ilike '%' || v_q || '%' or t.name ilike '%' || v_q || '%')
        limit 8
      ) t
    ),
    'clans', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select c.id, c.slug, c.name from public.clans c
        where c.slug ilike '%' || v_q || '%' or c.name ilike '%' || v_q || '%'
        limit 8
      ) t
    ),
    'orgs', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select o.id, o.slug, o.name from public.orgs o
        where (o.visibility = 'public' or public.is_org_member(o.id))
          and (o.slug ilike '%' || v_q || '%' or o.name ilike '%' || v_q || '%')
        limit 8
      ) t
    )
  );
end; $$;
revoke all on function public.party_search(text) from public, anon;
grant execute on function public.party_search(text) to anon, authenticated;

-- --------------------------------------------------------------------------
-- 4. Links; follows are instant; ally/rival only via accepted invites.
-- --------------------------------------------------------------------------
create or replace function public.party_follow(
  p_from_kind text, p_from_id uuid, p_to_kind text, p_to_id uuid
)
returns public.party_links language plpgsql security definer set search_path = public as $$
declare v_row public.party_links;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.party_kind_valid(p_from_kind) or not public.party_kind_valid(p_to_kind) then
    raise exception 'unknown party kind';
  end if;
  if p_from_kind = p_to_kind and p_from_id = p_to_id then raise exception 'cannot follow yourself'; end if;
  if not public.party_entity_exists(p_from_kind, p_from_id) then raise exception 'sender not found'; end if;
  if not public.party_entity_exists(p_to_kind, p_to_id) then raise exception 'target not found'; end if;
  if not public.party_can_act(p_from_kind, p_from_id) then raise exception 'forbidden'; end if;
  insert into public.party_links (from_kind, from_id, to_kind, to_id, relation, created_by)
  values (p_from_kind, p_from_id, p_to_kind, p_to_id, 'follow', auth.uid())
  on conflict (from_kind, from_id, to_kind, to_id, relation) do nothing
  returning * into v_row;
  if not found then
    select * into v_row from public.party_links
    where from_kind = p_from_kind and from_id = p_from_id
      and to_kind = p_to_kind and to_id = p_to_id and relation = 'follow';
  end if;
  return v_row;
end; $$;
revoke all on function public.party_follow(text, uuid, text, uuid) from public, anon;
grant execute on function public.party_follow(text, uuid, text, uuid) to authenticated;

create or replace function public.party_unfollow(
  p_from_kind text, p_from_id uuid, p_to_kind text, p_to_id uuid
)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.party_can_act(p_from_kind, p_from_id) then raise exception 'forbidden'; end if;
  delete from public.party_links
  where from_kind = p_from_kind and from_id = p_from_id
    and to_kind = p_to_kind and to_id = p_to_id and relation = 'follow';
  return found;
end; $$;
revoke all on function public.party_unfollow(text, uuid, text, uuid) from public, anon;
grant execute on function public.party_unfollow(text, uuid, text, uuid) to authenticated;

-- --------------------------------------------------------------------------
-- 5. Invites; join/ally proposals with real membership side-effects.
-- --------------------------------------------------------------------------
create or replace function public.party_invite_create(
  p_from_kind text, p_from_id uuid, p_to_kind text, p_to_id uuid, p_message text
)
returns public.party_invites language plpgsql security definer set search_path = public as $$
declare v_row public.party_invites; v_pending integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.party_kind_valid(p_from_kind) or not public.party_kind_valid(p_to_kind) then
    raise exception 'unknown party kind';
  end if;
  if p_from_kind = p_to_kind and p_from_id = p_to_id then raise exception 'cannot invite yourself'; end if;
  if not public.party_entity_exists(p_from_kind, p_from_id) then raise exception 'sender not found'; end if;
  if not public.party_entity_exists(p_to_kind, p_to_id) then raise exception 'target not found'; end if;
  if not public.party_can_act(p_from_kind, p_from_id) then raise exception 'forbidden'; end if;
  -- Already a member? No invite needed; the parties already interact.
  if p_to_kind = 'individual' and p_from_kind = 'squad'
    and exists (select 1 from public.team_members where team_id = p_from_id and user_id = p_to_id) then
    raise exception 'already a squad member';
  end if;
  if p_to_kind = 'individual' and p_from_kind = 'clan'
    and exists (select 1 from public.clan_members where clan_id = p_from_id and user_id = p_to_id) then
    raise exception 'already a clan member';
  end if;
  if p_to_kind = 'individual' and p_from_kind = 'org'
    and exists (select 1 from public.org_members where org_id = p_from_id and user_id = p_to_id) then
    raise exception 'already an org member';
  end if;
  if p_from_kind = 'individual' and p_to_kind = 'squad'
    and exists (select 1 from public.team_members where team_id = p_to_id and user_id = p_from_id) then
    raise exception 'already a squad member';
  end if;
  if p_from_kind = 'individual' and p_to_kind = 'clan'
    and exists (select 1 from public.clan_members where clan_id = p_to_id and user_id = p_from_id) then
    raise exception 'already a clan member';
  end if;
  if p_from_kind = 'individual' and p_to_kind = 'org'
    and exists (select 1 from public.org_members where org_id = p_to_id and user_id = p_from_id) then
    raise exception 'already an org member';
  end if;
  -- Spam bound: 20 live outbound proposals per sender party.
  select count(*) into v_pending from public.party_invites
  where from_kind = p_from_kind and from_id = p_from_id and status = 'pending';
  if v_pending >= 20 then raise exception 'too many pending invites'; end if;
  insert into public.party_invites (from_kind, from_id, to_kind, to_id, message, created_by)
  values (p_from_kind, p_from_id, p_to_kind, p_to_id,
    substr(trim(coalesce(p_message, '')), 1, 280), auth.uid())
  returning * into v_row;
  return v_row;
exception when unique_violation then
  raise exception 'an invite is already pending';
end; $$;
revoke all on function public.party_invite_create(text, uuid, text, uuid, text) from public, anon;
grant execute on function public.party_invite_create(text, uuid, text, uuid, text) to authenticated;

-- Apply the membership side-effect of an accepted invite.
create or replace function public._party_invite_apply(
  p_from_kind text, p_from_id uuid, p_to_kind text, p_to_id uuid
)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- Squad <-> individual: (viewer) workspace seat.
  if p_from_kind = 'squad' and p_to_kind = 'individual' then
    insert into public.team_members (team_id, user_id, role_key)
    values (p_from_id, p_to_id, 'viewer') on conflict do nothing;
  elsif p_from_kind = 'individual' and p_to_kind = 'squad' then
    insert into public.team_members (team_id, user_id, role_key)
    values (p_to_id, p_from_id, 'viewer') on conflict do nothing;
  -- Clan <-> individual: clan seat.
  elsif p_from_kind = 'clan' and p_to_kind = 'individual' then
    insert into public.clan_members (clan_id, user_id, role)
    values (p_from_id, p_to_id, 'member') on conflict do nothing;
  elsif p_from_kind = 'individual' and p_to_kind = 'clan' then
    insert into public.clan_members (clan_id, user_id, role)
    values (p_to_id, p_from_id, 'member') on conflict do nothing;
  -- Org <-> individual: org seat (the 100-org trigger still caps).
  elsif p_from_kind = 'org' and p_to_kind = 'individual' then
    insert into public.org_members (org_id, user_id, role_key)
    values (p_from_id, p_to_id, 'viewer') on conflict do nothing;
  elsif p_from_kind = 'individual' and p_to_kind = 'org' then
    insert into public.org_members (org_id, user_id, role_key)
    values (p_to_id, p_from_id, 'viewer') on conflict do nothing;
  end if;
  -- Every accepted invite also leaves a public ally badge, both directions.
  insert into public.party_links (from_kind, from_id, to_kind, to_id, relation, created_by)
  values (p_from_kind, p_from_id, p_to_kind, p_to_id, 'ally', auth.uid())
  on conflict do nothing;
  insert into public.party_links (from_kind, from_id, to_kind, to_id, relation, created_by)
  values (p_to_kind, p_to_id, p_from_kind, p_from_id, 'ally', auth.uid())
  on conflict do nothing;
end; $$;
revoke all on function public._party_invite_apply(text, uuid, text, uuid) from public, anon, authenticated;

create or replace function public.party_invite_decide(p_invite uuid, p_accept boolean)
returns public.party_invites language plpgsql security definer set search_path = public as $$
declare v_row public.party_invites;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select * into v_row from public.party_invites where id = p_invite;
  if not found then raise exception 'invite not found'; end if;
  if v_row.status <> 'pending' then raise exception 'invite already decided'; end if;
  if p_accept then
    -- Accepting speaks for the TARGET side (or either side for a friendly
    -- mutual; target admin is the gate).
    if not public.party_can_admin(v_row.to_kind, v_row.to_id) then raise exception 'forbidden'; end if;
    perform public._party_invite_apply(v_row.from_kind, v_row.from_id, v_row.to_kind, v_row.to_id);
    update public.party_invites set status = 'accepted', decided_at = now()
    where id = p_invite returning * into v_row;
  else
    -- Decline (target side) or cancel (sender side).
    if not (public.party_can_admin(v_row.to_kind, v_row.to_id)
      or public.party_can_act(v_row.from_kind, v_row.from_id)) then
      raise exception 'forbidden';
    end if;
    update public.party_invites
    set status = case when public.party_can_act(v_row.from_kind, v_row.from_id)
        and not public.party_can_admin(v_row.to_kind, v_row.to_id)
        then 'cancelled' else 'declined' end,
      decided_at = now()
    where id = p_invite returning * into v_row;
  end if;
  return v_row;
end; $$;
revoke all on function public.party_invite_decide(uuid, boolean) from public, anon;
grant execute on function public.party_invite_decide(uuid, boolean) to authenticated;

-- My pending inbox + outbox in one round trip (either side I can speak for).
create or replace function public.party_my_invites()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  return jsonb_build_object(
    'inbox', (
      select coalesce(jsonb_agg(t order by t.created_at desc), '[]'::jsonb) from (
        select i.*, public.party_label(i.from_kind, i.from_id) as from_name,
          public.party_label(i.to_kind, i.to_id) as to_name
        from public.party_invites i
        where i.status = 'pending' and public.party_can_admin(i.to_kind, i.to_id)
        limit 100
      ) t
    ),
    'outbox', (
      select coalesce(jsonb_agg(t order by t.created_at desc), '[]'::jsonb) from (
        select i.*, public.party_label(i.from_kind, i.from_id) as from_name,
          public.party_label(i.to_kind, i.to_id) as to_name
        from public.party_invites i
        where i.status = 'pending' and public.party_can_act(i.from_kind, i.from_id)
        limit 100
      ) t
    )
  );
end; $$;
revoke all on function public.party_my_invites() from public, anon;
grant execute on function public.party_my_invites() to authenticated;

-- --------------------------------------------------------------------------
-- 6. Challenges; any party can challenge any other party.
-- --------------------------------------------------------------------------
create or replace function public.party_challenge_create(
  p_challenger_kind text, p_challenger_id uuid,
  p_opponent_kind text, p_opponent_id uuid,
  p_game_slug text, p_message text
)
returns public.party_challenges language plpgsql security definer set search_path = public as $$
declare v_row public.party_challenges; v_open integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.party_kind_valid(p_challenger_kind) or not public.party_kind_valid(p_opponent_kind) then
    raise exception 'unknown party kind';
  end if;
  if p_challenger_kind = p_opponent_kind and p_challenger_id = p_opponent_id then
    raise exception 'cannot challenge yourself';
  end if;
  if not public.party_entity_exists(p_challenger_kind, p_challenger_id) then raise exception 'challenger not found'; end if;
  if not public.party_entity_exists(p_opponent_kind, p_opponent_id) then raise exception 'opponent not found'; end if;
  if not public.party_can_act(p_challenger_kind, p_challenger_id) then raise exception 'forbidden'; end if;
  select count(*) into v_open from public.party_challenges
  where challenger_kind = p_challenger_kind and challenger_id = p_challenger_id and status = 'open';
  if v_open >= 10 then raise exception 'too many open challenges'; end if;
  insert into public.party_challenges
    (challenger_kind, challenger_id, opponent_kind, opponent_id, game_slug, message, created_by)
  values (p_challenger_kind, p_challenger_id, p_opponent_kind, p_opponent_id,
    lower(substr(trim(coalesce(p_game_slug, '')), 1, 64)),
    substr(trim(coalesce(p_message, '')), 1, 280), auth.uid())
  returning * into v_row;
  return v_row;
end; $$;
revoke all on function public.party_challenge_create(text, uuid, text, uuid, text, text) from public, anon;
grant execute on function public.party_challenge_create(text, uuid, text, uuid, text, text) to authenticated;

-- accept | decline (opponent side) | cancel (challenger side) |
-- complete (either side, winner must be one of the two parties).
create or replace function public.party_challenge_decide(
  p_challenge uuid, p_action text, p_winner_kind text, p_winner_id uuid
)
returns public.party_challenges language plpgsql security definer set search_path = public as $$
declare v_row public.party_challenges; v_act text := lower(trim(coalesce(p_action, '')));
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_act not in ('accept', 'decline', 'cancel', 'complete') then raise exception 'unknown action'; end if;
  select * into v_row from public.party_challenges where id = p_challenge;
  if not found then raise exception 'challenge not found'; end if;
  if v_row.status <> 'open' and not (v_row.status = 'accepted' and v_act = 'complete') then
    raise exception 'challenge already decided';
  end if;
  if v_act = 'accept' or v_act = 'decline' then
    if not public.party_can_admin(v_row.opponent_kind, v_row.opponent_id) then raise exception 'forbidden'; end if;
    update public.party_challenges
    set status = case when v_act = 'accept' then 'accepted' else 'declined' end,
      decided_at = now()
    where id = p_challenge returning * into v_row;
  elsif v_act = 'cancel' then
    if not (public.party_can_act(v_row.challenger_kind, v_row.challenger_id)
      or public.party_can_admin(v_row.opponent_kind, v_row.opponent_id)) then
      raise exception 'forbidden';
    end if;
    update public.party_challenges set status = 'cancelled', decided_at = now()
    where id = p_challenge returning * into v_row;
  else -- complete
    if not (public.party_can_admin(v_row.challenger_kind, v_row.challenger_id)
      or public.party_can_admin(v_row.opponent_kind, v_row.opponent_id)) then
      raise exception 'forbidden';
    end if;
    if not public.party_kind_valid(p_winner_kind) or p_winner_id is null then raise exception 'winner required'; end if;
    if not ((p_winner_kind = v_row.challenger_kind and p_winner_id = v_row.challenger_id)
      or (p_winner_kind = v_row.opponent_kind and p_winner_id = v_row.opponent_id)) then
      raise exception 'winner must be one of the two parties';
    end if;
    update public.party_challenges
    set status = 'completed', winner_kind = p_winner_kind, winner_id = p_winner_id, decided_at = now()
    where id = p_challenge returning * into v_row;
    -- Winners and rivals are remembered publicly.
    insert into public.party_links (from_kind, from_id, to_kind, to_id, relation, created_by)
    values (v_row.challenger_kind, v_row.challenger_id, v_row.opponent_kind, v_row.opponent_id, 'rival', auth.uid())
    on conflict do nothing;
    insert into public.party_links (from_kind, from_id, to_kind, to_id, relation, created_by)
    values (v_row.opponent_kind, v_row.opponent_id, v_row.challenger_kind, v_row.challenger_id, 'rival', auth.uid())
    on conflict do nothing;
  end if;
  return v_row;
end; $$;
revoke all on function public.party_challenge_decide(uuid, text, text, uuid) from public, anon;
grant execute on function public.party_challenge_decide(uuid, text, text, uuid) to authenticated;

-- --------------------------------------------------------------------------
-- 7. Town-square feed; post as any party you can speak for, optionally @
--    another party. Route layer passes visible|pending (Valley Net).
-- --------------------------------------------------------------------------
create or replace function public.party_post_create(
  p_actor_kind text, p_actor_id uuid,
  p_target_kind text, p_target_id uuid,
  p_body text, p_game_slug text, p_status text
)
returns public.party_posts language plpgsql security definer set search_path = public as $$
declare v_row public.party_posts; v_body text := trim(coalesce(p_body, ''));
  v_status text := coalesce(nullif(trim(coalesce(p_status, '')), ''), 'visible');
  v_recent integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.party_kind_valid(p_actor_kind) then raise exception 'unknown party kind'; end if;
  if not public.party_entity_exists(p_actor_kind, p_actor_id) then raise exception 'sender not found'; end if;
  if not public.party_can_act(p_actor_kind, p_actor_id) then raise exception 'forbidden'; end if;
  if p_target_kind is not null or p_target_id is not null then
    if not public.party_kind_valid(p_target_kind) or p_target_id is null then raise exception 'unknown target'; end if;
    if not public.party_entity_exists(p_target_kind, p_target_id) then raise exception 'target not found'; end if;
    if p_target_kind = p_actor_kind and p_target_id = p_actor_id then raise exception 'cannot target yourself'; end if;
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then raise exception 'body must be 1..2000 chars'; end if;
  if v_status not in ('visible', 'pending') then v_status := 'visible'; end if;
  -- Spam bound: 10 posts/hour per actor party (coin-free square, rate-gated).
  select count(*) into v_recent from public.party_posts
  where actor_kind = p_actor_kind and actor_id = p_actor_id and created_at > now() - interval '1 hour';
  if v_recent >= 10 then raise exception 'too many posts'; end if;
  insert into public.party_posts
    (actor_kind, actor_id, target_kind, target_id, body, game_slug, status, created_by)
  values (p_actor_kind, p_actor_id, p_target_kind, p_target_id, v_body,
    lower(substr(trim(coalesce(p_game_slug, '')), 1, 64)), v_status, auth.uid())
  returning * into v_row;
  return v_row;
end; $$;
revoke all on function public.party_post_create(text, uuid, text, uuid, text, text, text) from public, anon;
grant execute on function public.party_post_create(text, uuid, text, uuid, text, text, text) to authenticated;

-- One-round-trip square: latest visible posts with resolved names.
create or replace function public.party_feed(p_limit integer)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_limit integer := greatest(1, least(coalesce(p_limit, 25), 100));
begin
  return (
    select coalesce(jsonb_agg(t order by t.created_at desc), '[]'::jsonb) from (
      select p.*, public.party_label(p.actor_kind, p.actor_id) as actor_name,
        case when p.target_kind is not null
          then public.party_label(p.target_kind, p.target_id) else null end as target_name
      from public.party_posts p
      where p.status = 'visible'
      order by p.created_at desc limit v_limit
    ) t
  );
end; $$;
revoke all on function public.party_feed(integer) from public, anon;
grant execute on function public.party_feed(integer) to anon, authenticated;
