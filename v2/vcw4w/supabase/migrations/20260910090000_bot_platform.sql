-- ============================================================================
-- Agentic bot platform (/bot/bclans/) + bot identity/keys.
-- Re-runnable: every statement is IF NOT EXISTS / OR REPLACE / guarded by
-- a preceding DROP ... IF EXISTS.
--
-- Clan-table ownership: 20260910080000_clans.sql owns ALL clan DDL
-- (owner_id, visible/pending/hidden, uuid report targets). The CREATE TABLE
-- statements below are no-op convergence guards that only take effect if
-- 080000 was never applied; this file creates NO clan policies and seeds
-- NO starter rows, so it can never contradict 080000 (a past revision did
-- both; created_by policies and ownerless seeds; and broke bundle order
-- with 42703/23502; 20260910120000_reconcile_clans_bots.sql cleans up
-- databases that already applied that revision).
--
-- Tables created here: bot_identities, bot_api_keys
--     (RLS enabled, NO client policies at all: all access via the
--     SECURITY DEFINER RPCs below or service-role server routes)
-- RPCs (all SECURITY DEFINER, locked down with explicit REVOKEs):
--   ensure_bot_identity(), set_bot_username(p_username),
--   issue_bot_key(p_label, p_key_hash, p_prefix), revoke_bot_key(p_key_id),
--   touch_bot_key(p_hash) [internal: service_role only]
--
-- NOTE on issue_bot_key: the secret key itself is generated in the Next.js
-- route (Node crypto) and hashed there as sha256(BOT_KEY_PEPPER + key), so
-- the optional pepper can apply. The RPC only ever sees/stores the hash.
-- ============================================================================

create extension if not exists pgcrypto;

-- --------------------------------------------------------------------------
-- Clan tables (backing store for both human and bot clan features)
-- --------------------------------------------------------------------------
create table if not exists public.clans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,64}$'),
  name varchar(60) not null check (char_length(name) between 1 and 60),
  description varchar(500) not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.clan_members (
  clan_id uuid not null references public.clans (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'mod', 'owner')),
  joined_at timestamptz not null default now(),
  primary key (clan_id, user_id)
);
create index if not exists idx_clan_members_user on public.clan_members (user_id);

create table if not exists public.clan_posts (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  title varchar(120) not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 5000),
  image_url text,
  status text not null default 'published' check (status in ('published', 'pending')),
  created_at timestamptz not null default now()
);
create index if not exists idx_clan_posts_clan on public.clan_posts (clan_id, created_at desc);

create table if not exists public.clan_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.clan_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body varchar(2000) not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists idx_clan_comments_post on public.clan_comments (post_id, created_at);

create table if not exists public.clan_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('clan', 'post', 'comment')),
  target_id text not null check (char_length(target_id) between 1 and 256),
  category varchar(40) not null check (char_length(category) between 1 and 40),
  details varchar(1000) not null default '',
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);
create index if not exists idx_clan_reports_status on public.clan_reports (status, created_at desc);

alter table public.clans enable row level security;
alter table public.clan_members enable row level security;
alter table public.clan_posts enable row level security;
alter table public.clan_comments enable row level security;
alter table public.clan_reports enable row level security;

-- Human client policies: NONE here. 080000 ships the read policies and all
-- writes go through its SECURITY DEFINER RPCs; the drops below converge
-- databases that applied the old contradictory revision of this file.
drop policy if exists clans_select_all on public.clans;
drop policy if exists clans_insert_own on public.clans;
drop policy if exists clans_update_own on public.clans;
drop policy if exists clan_members_select_all on public.clan_members;
drop policy if exists clan_members_self_join on public.clan_members;
drop policy if exists clan_members_self_leave on public.clan_members;
drop policy if exists clan_posts_select_all on public.clan_posts;
drop policy if exists clan_posts_insert_own on public.clan_posts;
drop policy if exists clan_posts_update_own on public.clan_posts;
drop policy if exists clan_comments_select_all on public.clan_comments;
drop policy if exists clan_comments_insert_own on public.clan_comments;
drop policy if exists clan_reports_insert_own on public.clan_reports;
drop policy if exists clan_reports_select_own on public.clan_reports;

-- Starter clans are created through the app (create_clan RPC), which supplies
-- the mandatory owner_id. No seed rows here: an ownerless insert cannot
-- satisfy the 080000 NOT NULL owner_id constraint.

-- --------------------------------------------------------------------------
-- Bot identity + API keys. NO client policies: deny-by-default for anon AND
-- authenticated; only service_role (server routes) and the RPCs below touch
-- these tables.
-- --------------------------------------------------------------------------
create table if not exists public.bot_identities (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,24}$'),
  human_id text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.bot_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  key_hash char(64) not null unique,
  prefix varchar(16) not null,
  label varchar(40) not null default '',
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked boolean not null default false
);
create index if not exists idx_bot_api_keys_prefix on public.bot_api_keys (prefix);
create index if not exists idx_bot_api_keys_user on public.bot_api_keys (user_id);

alter table public.bot_identities enable row level security;
alter table public.bot_api_keys enable row level security;
-- Intentionally NO policies on either bot table.

revoke all on public.bot_identities from anon, authenticated;
revoke all on public.bot_api_keys from anon, authenticated;

-- --------------------------------------------------------------------------
-- RPCs
-- --------------------------------------------------------------------------

-- Ensure the caller's bot identity exists (creates the immutable human_id
-- once: 'h_' + 12 hex chars from gen_random_bytes). Returns username
-- (nullable until set) + human_id.
create or replace function public.ensure_bot_identity()
returns table(username text, human_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing record;
  hid text;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select b.username, b.human_id into existing
    from public.bot_identities b where b.user_id = auth.uid();
  if found then
    username := existing.username; human_id := existing.human_id;
    return next; return;
  end if;
  loop
    hid := 'h_' || substr(encode(gen_random_bytes(6), 'hex'), 1, 12);
    begin
      insert into public.bot_identities (user_id, human_id)
      values (auth.uid(), hid);
      exit;
    exception when unique_violation then
      select b.username, b.human_id into existing
        from public.bot_identities b where b.user_id = auth.uid();
      if found then
        username := existing.username; human_id := existing.human_id;
        return next; return;
      end if;
      -- else a human_id collision: loop and mint a fresh one.
    end;
  end loop;
  username := null; human_id := hid;
  return next;
end;
$$;
revoke all on function public.ensure_bot_identity() from public, anon, authenticated;
grant execute on function public.ensure_bot_identity() to authenticated;

-- Set the bot username once. After it is set the row is immutable (409).
create or replace function public.set_bot_username(p_username text)
returns table(username text, human_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  hid text;
  attempt integer := 0;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if coalesce(p_username, '') !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'invalid username';
  end if;
  -- Ensure an identity row exists (same human_id scheme as ensure_bot_identity).
  loop
    begin
      insert into public.bot_identities (user_id, human_id)
      values (auth.uid(), 'h_' || substr(encode(gen_random_bytes(6), 'hex'), 1, 12))
      on conflict (user_id) do nothing;
      exit;
    exception when unique_violation then
      attempt := attempt + 1;
      if attempt >= 5 then raise; end if;
    end;
  end loop;
  update public.bot_identities set username = p_username
    where user_id = auth.uid() and username is null;
  if not found then raise exception 'username already set'; end if;
  return query select b.username, b.human_id
    from public.bot_identities b where b.user_id = auth.uid();
exception when unique_violation then
  raise exception 'username taken';
end;
$$;
revoke all on function public.set_bot_username(text) from public, anon, authenticated;
grant execute on function public.set_bot_username(text) to authenticated;

-- Store a bot key hash minted by the server route (which generated the
-- secret with Node crypto and hashed it as sha256(pepper + key)). Returns
-- row metadata only; the secret itself is never stored and never returned.
create or replace function public.issue_bot_key(p_label text, p_key_hash text, p_prefix text)
returns table(key_id uuid, prefix text, label text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_label text := trim(coalesce(p_label, ''));
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if char_length(clean_label) < 1 or char_length(clean_label) > 40 then
    raise exception 'invalid label';
  end if;
  if coalesce(p_key_hash, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid key hash';
  end if;
  if p_prefix is null or char_length(p_prefix) > 16 then
    raise exception 'invalid prefix';
  end if;
  insert into public.bot_identities (user_id, human_id)
  values (auth.uid(), 'h_' || substr(encode(gen_random_bytes(6), 'hex'), 1, 12))
  on conflict (user_id) do nothing;
  return query insert into public.bot_api_keys (user_id, key_hash, prefix, label)
    values (auth.uid(), p_key_hash, p_prefix, clean_label)
    returning public.bot_api_keys.id,
              public.bot_api_keys.prefix::text,
              public.bot_api_keys.label::text,
              public.bot_api_keys.created_at;
end;
$$;
revoke all on function public.issue_bot_key(text, text, text) from public, anon, authenticated;
grant execute on function public.issue_bot_key(text, text, text) to authenticated;

-- Revoke one of the caller's own keys. Takes effect immediately: key
-- resolution reads the revoked flag from the database on every request.
create or replace function public.revoke_bot_key(p_key_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  update public.bot_api_keys set revoked = true
    where id = p_key_id and user_id = auth.uid() and revoked = false;
  return found;
end;
$$;
revoke all on function public.revoke_bot_key(uuid) from public, anon, authenticated;
grant execute on function public.revoke_bot_key(uuid) to authenticated;

-- Internal usage timestamp update (service_role only; no grant to
-- anon/authenticated). The server route normally updates last_used_at
-- directly with the service client instead of calling this.
create or replace function public.touch_bot_key(p_hash text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bot_api_keys set last_used_at = now()
    where key_hash = p_hash;
end;
$$;
revoke all on function public.touch_bot_key(text) from public, anon, authenticated;
grant execute on function public.touch_bot_key(text) to service_role;
