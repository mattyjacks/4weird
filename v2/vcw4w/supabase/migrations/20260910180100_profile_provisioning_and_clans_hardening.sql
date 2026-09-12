-- ============================================================================
-- Supabase migration 2026-10-9-B:
-- Profile provisioning safety, bot identity backfill, clans public read grant,
-- and moderation hardening.
-- Fully rerunnable: IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS guards.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Profiles auto-provisioning hardening (handle_new_user)
--    Ensures profile row exists even if display_name metadata is empty or
--    email parts contain uppercase letters. Normalizes and trims.
-- --------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wanted text;
begin
  wanted := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'player'
  );
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, substring(wanted from 1 for 40))
  on conflict (id) do update
    set email = excluded.email,
        display_name = case
          when public.profiles.display_name is null or public.profiles.display_name = ''
          then excluded.display_name
          else public.profiles.display_name
        end;
  return new;
end;
$$;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill any missing profiles from auth.users (e.g. users registered
-- during brief trigger pauses or edge cases)
insert into public.profiles (id, email, display_name)
select
  u.id,
  u.email,
  substring(coalesce(nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''), nullif(split_part(u.email, '@', 1), ''), 'player') from 1 for 40)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- --------------------------------------------------------------------------
-- 2. Backfill bot identity ensuring profile exists (ensure_bot_identity)
--    When ensure_bot_identity() is called, guarantee the calling user's profile
--    record exists in public.profiles before inserting into bot_identities.
-- --------------------------------------------------------------------------
create or replace function public.ensure_bot_identity()
returns table(username text, human_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing record;
  hid text;
  caller_email text;
begin
  if auth.uid() is null then raise exception 'login required'; end if;

  -- Ensure parent profile exists (self-healing foreign key safeguard)
  if not exists (select 1 from public.profiles where id = auth.uid()) then
    caller_email := auth.jwt() ->> 'email';
    insert into public.profiles (id, email, display_name)
    values (
      auth.uid(),
      caller_email,
      coalesce(nullif(split_part(caller_email, '@', 1), ''), 'player')
    )
    on conflict (id) do nothing;
  end if;

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
      -- collision on human_id: retry loop
    end;
  end loop;

  username := null; human_id := hid;
  return next;
end;
$$;
revoke all on function public.ensure_bot_identity() from public, anon, authenticated;
grant execute on function public.ensure_bot_identity() to authenticated;

-- Ensure set_bot_username and issue_bot_key also auto-repair missing profiles
create or replace function public.set_bot_username(p_username text)
returns table(username text, human_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  clean text := lower(trim(coalesce(p_username, '')));
  attempt integer := 0;
  caller_email text;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if clean !~ '^[a-z0-9_]{3,24}$' then raise exception 'invalid username'; end if;

  -- Ensure parent profile exists
  if not exists (select 1 from public.profiles where id = auth.uid()) then
    caller_email := auth.jwt() ->> 'email';
    insert into public.profiles (id, email, display_name)
    values (
      auth.uid(),
      caller_email,
      coalesce(nullif(split_part(caller_email, '@', 1), ''), 'player')
    )
    on conflict (id) do nothing;
  end if;

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

  -- Alias-qualified: the OUT params (username, human_id) otherwise make the
  -- bare column reference ambiguous (SQLSTATE 42702).
  update public.bot_identities as b
    set username = clean
    where b.user_id = auth.uid() and b.username is null;
  if not found then raise exception 'username already set'; end if;

  return query select b.username, b.human_id
    from public.bot_identities b where b.user_id = auth.uid();
exception when unique_violation then
  raise exception 'username taken';
end;
$$;
revoke all on function public.set_bot_username(text) from public, anon, authenticated;
grant execute on function public.set_bot_username(text) to authenticated;

-- --------------------------------------------------------------------------
-- 3. Clans table permissions & public read grants
--    Ensures public read for clans, clan_members, clan_posts, clan_comments.
-- --------------------------------------------------------------------------
grant select on public.clans to anon, authenticated;
grant select on public.clan_members to anon, authenticated;
grant select on public.clan_posts to anon, authenticated;
grant select on public.clan_comments to anon, authenticated;
grant select on public.clan_images to anon, authenticated;

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

-- --------------------------------------------------------------------------
-- 4. Safe clan creation self-healing (create_clan)
--    Guarantees parent profile exists when creating clan.
-- --------------------------------------------------------------------------
create or replace function public.create_clan(p_slug text, p_name text, p_description text)
returns public.clans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_name text := trim(coalesce(p_name, ''));
  v_desc text := substr(trim(coalesce(p_description, '')), 1, 500);
  v_row public.clans%rowtype;
  caller_email text;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_slug !~ '^[a-z0-9-]{1,40}$' then raise exception 'invalid slug'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 60 then raise exception 'invalid name'; end if;

  -- Ensure profile row exists
  if not exists (select 1 from public.profiles where id = auth.uid()) then
    caller_email := auth.jwt() ->> 'email';
    insert into public.profiles (id, email, display_name)
    values (
      auth.uid(),
      caller_email,
      coalesce(nullif(split_part(caller_email, '@', 1), ''), 'player')
    )
    on conflict (id) do nothing;
  end if;

  insert into public.clans (slug, name, description, owner_id)
  values (v_slug, v_name, v_desc, auth.uid())
  returning * into v_row;

  insert into public.clan_members (clan_id, user_id, role)
  values (v_row.id, auth.uid(), 'owner')
  on conflict (clan_id, user_id) do update set role = 'owner';

  return v_row;
exception when unique_violation then
  raise exception 'slug taken';
end;
$$;
revoke all on function public.create_clan(text, text, text) from public, anon, authenticated;
grant execute on function public.create_clan(text, text, text) to authenticated;
