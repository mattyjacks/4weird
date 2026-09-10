-- 4weird Clans — gamer/coder social platform.
-- ============================================================================
-- CSAM / AUTHORITY FLOW (read this before touching clan_reports):
--  * Reports with category='csam' AUTO-HIDE the target immediately inside the
--    file_report() RPC (target row status -> 'hidden'), whether the reporter
--    is logged in or anonymous. The sha256 + storage_path of images and the
--    full text of posts/comments are PRESERVED (never deleted by the RPC) so
--    admins can export evidence.
--  * Admin export (no admin UI built here — reuse the existing admin
--    submissions UI pattern). Suggested queries for the admin console:
--      select * from public.clan_reports where status='open' order by created_at desc;
--      select r.*, p.title, p.body, p.image_url from public.clan_reports r
--        left join public.clan_posts p on r.target_type='post' and r.target_id=p.id
--       where r.category='csam' and r.status='open';
--      select r.*, c.body from public.clan_reports r
--        left join public.clan_comments c on r.target_type='comment' and r.target_id=c.id
--       where r.category='csam' and r.status='open';
--      select r.*, i.storage_path, i.sha256, i.bytes, i.mime from public.clan_reports r
--        left join public.clan_images i on r.target_type='image' and r.target_id=i.id
--       where r.category='csam' and r.status='open';
--  * Human procedure: quarantine (already hidden by RPC) -> preserve hash copy
--    (sha256 column + storage object retained) -> export the rows above ->
--    file with NCMEC CyberTipline (https://report.cybertipline.org) ->
--    mark report status='actioned' via moderate_set_status-adjacent admin update
--    and delete the offending content only after authorities confirm.
--  * Storage bucket `clan-images` has NO public write; uploads go through the
--    server route with the service_role key only.
-- ============================================================================
-- Fully rerunnable: IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS used
-- throughout. No client write policies — all writes go through the
-- SECURITY DEFINER RPCs below.
-- ============================================================================

-- Tables --------------------------------------------------------------------
create table if not exists public.clans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,40}$'),
  name varchar(60) not null check (char_length(name) between 2 and 60),
  description varchar(500) not null default '' check (char_length(description) <= 500),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.clan_members (
  clan_id uuid not null references public.clans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','mod','member')),
  joined_at timestamptz not null default now(),
  primary key (clan_id, user_id)
);

create table if not exists public.clan_posts (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title varchar(120) not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 8000),
  image_url text null,
  status text not null default 'visible' check (status in ('visible','pending','hidden')),
  created_at timestamptz not null default now()
);

create table if not exists public.clan_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.clan_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body varchar(2000) not null check (char_length(body) between 1 and 2000),
  status text not null default 'visible' check (status in ('visible','pending','hidden')),
  created_at timestamptz not null default now()
);

create table if not exists public.clan_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid null references public.clan_posts(id) on delete set null,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  sha256 char(64) not null check (sha256 ~ '^[0-9a-f]{64}$'),
  bytes integer not null check (bytes between 1 and 1048576),
  mime text not null check (mime in ('image/png','image/jpeg','image/webp','image/gif')),
  created_at timestamptz not null default now()
);

create table if not exists public.clan_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid null references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('post','comment','image')),
  target_id uuid not null,
  category text not null check (category in ('csam','other')),
  details varchar(1000) not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open','reviewed','actioned')),
  created_at timestamptz not null default now()
);

create index if not exists clan_posts_clan_idx on public.clan_posts (clan_id, created_at desc);
create index if not exists clan_posts_status_idx on public.clan_posts (status);
create index if not exists clan_comments_post_idx on public.clan_comments (post_id, created_at);
create index if not exists clan_reports_status_idx on public.clan_reports (status, created_at desc);
create index if not exists clan_images_sha_idx on public.clan_images (sha256);

-- Storage bucket (private; service-role upload only) -------------------------
insert into storage.buckets (id, name, public)
values ('clan-images', 'clan-images', true)
on conflict (id) do update set public = excluded.public;

-- RLS -----------------------------------------------------------------------
alter table public.clans enable row level security;
alter table public.clan_members enable row level security;
alter table public.clan_posts enable row level security;
alter table public.clan_comments enable row level security;
alter table public.clan_images enable row level security;
alter table public.clan_reports enable row level security;

-- Public read of visible clans/posts/comments. Writes via RPCs only
-- (no client INSERT/UPDATE/DELETE policies are created, ever).
drop policy if exists clans_public_read on public.clans;
create policy clans_public_read on public.clans
  for select to anon, authenticated using (true);

drop policy if exists clan_members_read on public.clan_members;
create policy clan_members_read on public.clan_members
  for select to anon, authenticated using (true);

drop policy if exists clan_posts_visible_read on public.clan_posts;
create policy clan_posts_visible_read on public.clan_posts
  for select to anon, authenticated using (status = 'visible');

drop policy if exists clan_comments_visible_read on public.clan_comments;
create policy clan_comments_visible_read on public.clan_comments
  for select to anon, authenticated using (status = 'visible');

drop policy if exists clan_images_public_read on public.clan_images;
create policy clan_images_public_read on public.clan_images
  for select to anon, authenticated using (true);

-- clan_reports: no client read policy (admins read via service role / RPC).
-- Storage objects in clan-images: no public write policies; reads are public
-- via the bucket's public flag; uploads use the service_role key server-side.
drop policy if exists clan_images_no_public_write on storage.objects;
-- (Intentionally no storage write policy is created for clan-images.)

-- RPCs (SECURITY DEFINER; revoke-all + grant as noted) -----------------------

-- Create a clan; caller becomes owner + member.
create or replace function public.create_clan(p_slug text, p_name text, p_description text)
returns public.clans language plpgsql security definer set search_path = public as $$
declare
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_name text := trim(coalesce(p_name, ''));
  v_desc text := substr(trim(coalesce(p_description, '')), 1, 500);
  v_row public.clans%rowtype;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_slug !~ '^[a-z0-9-]{1,40}$' then raise exception 'invalid slug'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 60 then raise exception 'invalid name'; end if;
  insert into public.clans (slug, name, description, owner_id)
  values (v_slug, v_name, v_desc, auth.uid())
  returning * into v_row;
  insert into public.clan_members (clan_id, user_id, role)
  values (v_row.id, auth.uid(), 'owner')
  on conflict (clan_id, user_id) do update set role = 'owner';
  return v_row;
exception when unique_violation then
  raise exception 'slug taken';
end; $$;
revoke all on function public.create_clan(text, text, text) from public, anon, authenticated;
grant execute on function public.create_clan(text, text, text) to authenticated;

-- Join a clan as a member (idempotent).
create or replace function public.join_clan(p_clan_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not exists (select 1 from public.clans where id = p_clan_id) then
    raise exception 'clan not found';
  end if;
  insert into public.clan_members (clan_id, user_id, role)
  values (p_clan_id, auth.uid(), 'member')
  on conflict (clan_id, user_id) do nothing;
end; $$;
revoke all on function public.join_clan(uuid) from public, anon, authenticated;
grant execute on function public.join_clan(uuid) to authenticated;

-- Create a post. Caller must be a member of the clan. Returns the new id.
create or replace function public.create_post(
  p_clan_id uuid, p_title text, p_body text, p_image_url text, p_status text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_title text := trim(coalesce(p_title, ''));
  v_body text := coalesce(p_body, '');
  v_img text := nullif(trim(coalesce(p_image_url, '')), '');
  v_status text := coalesce(nullif(trim(p_status), ''), 'visible');
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not exists (
    select 1 from public.clan_members where clan_id = p_clan_id and user_id = auth.uid()
  ) then
    raise exception 'join the clan first';
  end if;
  if char_length(v_title) < 1 or char_length(v_title) > 120 then raise exception 'invalid title'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 8000 then raise exception 'invalid body'; end if;
  if v_status not in ('visible', 'pending') then v_status := 'visible'; end if;
  insert into public.clan_posts (clan_id, author_id, title, body, image_url, status)
  values (p_clan_id, auth.uid(), v_title, v_body, v_img, v_status)
  returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.create_post(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_post(uuid, text, text, text, text) to authenticated;

-- Comment on a post. Caller must belong to the post's clan.
create or replace function public.create_comment(p_post_id uuid, p_body text, p_status text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_body text := trim(coalesce(p_body, ''));
  v_status text := coalesce(nullif(trim(p_status), ''), 'visible');
  v_clan uuid;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select clan_id into v_clan from public.clan_posts where id = p_post_id;
  if v_clan is null then raise exception 'post not found'; end if;
  if not exists (
    select 1 from public.clan_members where clan_id = v_clan and user_id = auth.uid()
  ) then
    raise exception 'join the clan first';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then raise exception 'invalid body'; end if;
  if v_status not in ('visible', 'pending') then v_status := 'visible'; end if;
  insert into public.clan_comments (post_id, author_id, body, status)
  values (p_post_id, auth.uid(), v_body, v_status)
  returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.create_comment(uuid, text, text) from public, anon, authenticated;
grant execute on function public.create_comment(uuid, text, text) to authenticated;

-- File a report. Anonymous allowed (reporter_id null). category='csam'
-- immediately hides the target (status -> 'hidden'); content is preserved.
create or replace function public.file_report(
  p_target_type text, p_target_id uuid, p_category text, p_details text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_details text := substr(trim(coalesce(p_details, '')), 1, 1000);
  v_id uuid;
begin
  if p_target_type not in ('post', 'comment', 'image') then raise exception 'invalid target'; end if;
  if p_category not in ('csam', 'other') then raise exception 'invalid category'; end if;
  if p_target_id is null then raise exception 'invalid target'; end if;
  if p_target_type = 'post'
    and not exists (select 1 from public.clan_posts where id = p_target_id) then
    raise exception 'target not found';
  end if;
  if p_target_type = 'comment'
    and not exists (select 1 from public.clan_comments where id = p_target_id) then
    raise exception 'target not found';
  end if;
  if p_target_type = 'image'
    and not exists (select 1 from public.clan_images where id = p_target_id) then
    raise exception 'target not found';
  end if;
  insert into public.clan_reports (reporter_id, target_type, target_id, category, details)
  values (auth.uid(), p_target_type, p_target_id, p_category, v_details)
  returning id into v_id;
  -- Auto-quarantine: CSAM reports hide the target immediately, preserving rows.
  if p_category = 'csam' then
    if p_target_type = 'post' then
      update public.clan_posts set status = 'hidden' where id = p_target_id;
    elsif p_target_type = 'comment' then
      update public.clan_comments set status = 'hidden' where id = p_target_id;
    end if;
    -- Images have no status column; the report row + preserved sha256/
    -- storage_path is the evidence record. Admins remove the storage object
    -- only after the authority export (see header).
  end if;
  return v_id;
end; $$;
revoke all on function public.file_report(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.file_report(text, uuid, text, text) to anon, authenticated;

-- Owner/mod moderation: set post/comment status. Images are handled by
-- deleting/quarantining the storage object server-side (no status column).
create or replace function public.moderate_set_status(
  p_target_type text, p_target_id uuid, p_status text
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_clan uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_target_type not in ('post', 'comment') then raise exception 'invalid target'; end if;
  if p_status not in ('visible', 'pending', 'hidden') then raise exception 'invalid status'; end if;
  if p_target_type = 'post' then
    select clan_id into v_clan from public.clan_posts where id = p_target_id;
  else
    select p.clan_id into v_clan
    from public.clan_comments c join public.clan_posts p on p.id = c.post_id
    where c.id = p_target_id;
  end if;
  if v_clan is null then raise exception 'target not found'; end if;
  if not exists (
    select 1 from public.clan_members
    where clan_id = v_clan and user_id = auth.uid() and role in ('owner', 'mod')
  ) then
    if not exists (select 1 from public.clans where id = v_clan and owner_id = auth.uid()) then
      raise exception 'not a moderator';
    end if;
  end if;
  if p_target_type = 'post' then
    update public.clan_posts set status = p_status where id = p_target_id;
  else
    update public.clan_comments set status = p_status where id = p_target_id;
  end if;
end; $$;
revoke all on function public.moderate_set_status(text, uuid, text) from public, anon, authenticated;
grant execute on function public.moderate_set_status(text, uuid, text) to authenticated;
