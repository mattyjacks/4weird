-- ============================================================================
-- Every clan holds four boards in one:
--   h = humans-only   (bots refused: read, join, post, comment, vote)
--   s = shared        (humans and bots together)
--   b = bots-only     (bots and agents post; humans read but never write)
--   a = open          (anyone may post: humans, bots, shared)
--
-- Fully rerunnable: IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS.
-- Writes go through the SECURITY DEFINER RPCs only (deny-by-default RLS,
-- no client INSERT/UPDATE/DELETE policies). No coin tables are touched:
-- board gating is free; posting/commenting fees still apply at the route
-- layer. Requires 20261016000000_clan_forum.sql (clan_votes + score columns).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 0. Prerequisite guard (fail fast with an actionable message, not 42P01).
-- --------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from information_schema.tables
                 where table_schema = 'public' and table_name = 'clan_votes') then
    raise exception 'PREREQUISITE MISSING: run 20261016000000_clan_forum.sql first (clan_votes table not found).';
  end if;
end $$;

-- --------------------------------------------------------------------------
-- 1. board column (additive, rerunnable). Existing posts land on shared.
-- --------------------------------------------------------------------------
alter table public.clan_posts
  add column if not exists board text not null default 's';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clan_posts_board_check'
  ) then
    alter table public.clan_posts
      add constraint clan_posts_board_check check (
        board in ('h', 's', 'b', 'a')
      ) not valid;
  end if;
end $$;
alter table public.clan_posts validate constraint clan_posts_board_check;

create index if not exists clan_posts_board_idx
  on public.clan_posts (clan_id, board, created_at desc);

-- --------------------------------------------------------------------------
-- 2. create_post gains p_board (default keeps legacy 5-arg calls working).
--    RPC callers are humans (authenticated grant only), so board 'b' is
--    refused here; bots insert via the service role and are gated at the
--    bot route layer instead.
-- --------------------------------------------------------------------------
create or replace function public.create_post(
  p_clan_id uuid, p_title text, p_body text, p_image_url text, p_status text,
  p_board text default 's'
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_title text := trim(coalesce(p_title, ''));
  v_body text := coalesce(p_body, '');
  v_img text := nullif(trim(coalesce(p_image_url, '')), '');
  v_status text := coalesce(nullif(trim(p_status), ''), 'visible');
  v_board text := coalesce(nullif(trim(p_board), ''), 's');
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
  if v_board not in ('h', 's', 'b', 'a') then raise exception 'invalid board'; end if;
  if v_board = 'b' then raise exception 'bots and agents only'; end if;
  insert into public.clan_posts (clan_id, author_id, title, body, image_url, status, board)
  values (p_clan_id, auth.uid(), v_title, v_body, v_img, v_status, v_board)
  returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.create_post(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_post(uuid, text, text, text, text, text) to authenticated;

-- --------------------------------------------------------------------------
-- 3. create_comment refuses human writes on bots-only posts.
-- --------------------------------------------------------------------------
create or replace function public.create_comment(
  p_post_id uuid, p_body text, p_status text, p_parent_id uuid default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_body text := trim(coalesce(p_body, ''));
  v_status text := coalesce(nullif(trim(p_status), ''), 'visible');
  v_clan uuid;
  v_board text;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select clan_id, board into v_clan, v_board from public.clan_posts where id = p_post_id;
  if v_clan is null then raise exception 'post not found'; end if;
  if coalesce(v_board, 's') = 'b' then raise exception 'bots and agents only'; end if;
  if not exists (
    select 1 from public.clan_members where clan_id = v_clan and user_id = auth.uid()
  ) then
    raise exception 'join the clan first';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then raise exception 'invalid body'; end if;
  if v_status not in ('visible', 'pending') then v_status := 'visible'; end if;
  if p_parent_id is not null then
    if not exists (
      select 1 from public.clan_comments
      where id = p_parent_id and post_id = p_post_id and status = 'visible'
    ) then
      raise exception 'parent comment not found';
    end if;
  end if;
  insert into public.clan_comments (post_id, author_id, body, status, parent_id)
  values (p_post_id, auth.uid(), v_body, v_status, p_parent_id)
  returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.create_comment(uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.create_comment(uuid, text, text, uuid) to authenticated;

-- --------------------------------------------------------------------------
-- 4. Votes refuse human writes on bots-only posts (bots have no vote path).
-- --------------------------------------------------------------------------
create or replace function public.vote_clan_post(p_post_id uuid, p_value smallint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_clan uuid;
  v_board text;
  v_old smallint;
  v_up integer;
  v_dn integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_value not in (1, -1, 0) then raise exception 'invalid vote'; end if;
  select clan_id, board into v_clan, v_board from public.clan_posts where id = p_post_id;
  if v_clan is null then raise exception 'post not found'; end if;
  if coalesce(v_board, 's') = 'b' then raise exception 'bots and agents only'; end if;
  if not exists (
    select 1 from public.clan_members where clan_id = v_clan and user_id = auth.uid()
  ) then
    raise exception 'join the clan first';
  end if;
  select value into v_old from public.clan_votes
  where user_id = auth.uid() and target_type = 'post' and target_id = p_post_id;

  if p_value = 0 or (v_old is not null and v_old = p_value) then
    delete from public.clan_votes
    where user_id = auth.uid() and target_type = 'post' and target_id = p_post_id;
    v_old := null;
  elsif v_old is distinct from p_value then
    insert into public.clan_votes (user_id, target_type, target_id, value)
    values (auth.uid(), 'post', p_post_id, p_value)
    on conflict (user_id, target_type, target_id)
    do update set value = excluded.value, created_at = now();
    v_old := p_value;
  end if;

  update public.clan_posts p
  set upvotes = (select count(*) from public.clan_votes where target_type = 'post' and target_id = p_post_id and value = 1),
      downvotes = (select count(*) from public.clan_votes where target_type = 'post' and target_id = p_post_id and value = -1)
  where id = p_post_id
  returning upvotes, downvotes into v_up, v_dn;
  update public.clan_posts set score = v_up - v_dn where id = p_post_id;
  return jsonb_build_object('score', v_up - v_dn, 'upvotes', v_up, 'downvotes', v_dn, 'myVote', coalesce(v_old, 0));
end; $$;
revoke all on function public.vote_clan_post(uuid, smallint) from public, anon, authenticated;
grant execute on function public.vote_clan_post(uuid, smallint) to authenticated;

create or replace function public.vote_clan_comment(p_comment_id uuid, p_value smallint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_post uuid;
  v_clan uuid;
  v_board text;
  v_old smallint;
  v_up integer;
  v_dn integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_value not in (1, -1, 0) then raise exception 'invalid vote'; end if;
  select post_id into v_post from public.clan_comments where id = p_comment_id;
  if v_post is null then raise exception 'comment not found'; end if;
  select clan_id, board into v_clan, v_board from public.clan_posts where id = v_post;
  if v_clan is null then raise exception 'post not found'; end if;
  if coalesce(v_board, 's') = 'b' then raise exception 'bots and agents only'; end if;
  if not exists (
    select 1 from public.clan_members where clan_id = v_clan and user_id = auth.uid()
  ) then
    raise exception 'join the clan first';
  end if;
  select value into v_old from public.clan_votes
  where user_id = auth.uid() and target_type = 'comment' and target_id = p_comment_id;

  if p_value = 0 or (v_old is not null and v_old = p_value) then
    delete from public.clan_votes
    where user_id = auth.uid() and target_type = 'comment' and target_id = p_comment_id;
    v_old := null;
  elsif v_old is distinct from p_value then
    insert into public.clan_votes (user_id, target_type, target_id, value)
    values (auth.uid(), 'comment', p_comment_id, p_value)
    on conflict (user_id, target_type, target_id)
    do update set value = excluded.value, created_at = now();
    v_old := p_value;
  end if;

  update public.clan_comments c
  set upvotes = (select count(*) from public.clan_votes where target_type = 'comment' and target_id = p_comment_id and value = 1),
      downvotes = (select count(*) from public.clan_votes where target_type = 'comment' and target_id = p_comment_id and value = -1)
  where id = p_comment_id
  returning upvotes, downvotes into v_up, v_dn;
  update public.clan_comments set score = v_up - v_dn where id = p_comment_id;
  return jsonb_build_object('score', v_up - v_dn, 'upvotes', v_up, 'downvotes', v_dn, 'myVote', coalesce(v_old, 0));
end; $$;
revoke all on function public.vote_clan_comment(uuid, smallint) from public, anon, authenticated;
grant execute on function public.vote_clan_comment(uuid, smallint) to authenticated;

-- --------------------------------------------------------------------------
-- 5. Flair on bots-only posts is mod/owner-only (the author there is a bot).
-- --------------------------------------------------------------------------
create or replace function public.set_post_flair(p_post_id uuid, p_flair text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_flair text := trim(coalesce(p_flair, ''));
  v_clan uuid;
  v_author uuid;
  v_board text;
  v_is_mod boolean := false;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_flair not in ('', 'Discussion', 'LFG', 'Question', 'Clip', 'Strat', 'Meme', 'News', 'OC') then
    raise exception 'invalid flair';
  end if;
  select clan_id, author_id, board into v_clan, v_author, v_board
  from public.clan_posts where id = p_post_id;
  if v_clan is null then raise exception 'post not found'; end if;
  if exists (
    select 1 from public.clan_members
    where clan_id = v_clan and user_id = auth.uid() and role in ('owner', 'mod')
  ) or exists (select 1 from public.clans where id = v_clan and owner_id = auth.uid()) then
    v_is_mod := true;
  end if;
  if coalesce(v_board, 's') = 'b' and not v_is_mod then
    raise exception 'bots and agents only';
  end if;
  if v_author != auth.uid() and not v_is_mod then
    raise exception 'not allowed';
  end if;
  update public.clan_posts set flair = v_flair where id = p_post_id;
end; $$;
revoke all on function public.set_post_flair(uuid, text) from public, anon, authenticated;
grant execute on function public.set_post_flair(uuid, text) to authenticated;

-- --------------------------------------------------------------------------
-- 6. Move a post between boards. Author or owner/mod; plain authors may
--    only use the human-writable boards (h/s/a), mods may use all four.
-- --------------------------------------------------------------------------
create or replace function public.set_post_board(p_post_id uuid, p_board text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_board text := trim(coalesce(p_board, ''));
  v_clan uuid;
  v_author uuid;
  v_is_mod boolean := false;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_board not in ('h', 's', 'b', 'a') then
    raise exception 'invalid board';
  end if;
  select clan_id, author_id into v_clan, v_author from public.clan_posts where id = p_post_id;
  if v_clan is null then raise exception 'post not found'; end if;
  if exists (
    select 1 from public.clan_members
    where clan_id = v_clan and user_id = auth.uid() and role in ('owner', 'mod')
  ) or exists (select 1 from public.clans where id = v_clan and owner_id = auth.uid()) then
    v_is_mod := true;
  end if;
  if v_author != auth.uid() and not v_is_mod then
    raise exception 'not allowed';
  end if;
  if v_board = 'b' and not v_is_mod then
    raise exception 'bots and agents only';
  end if;
  update public.clan_posts set board = v_board where id = p_post_id;
end; $$;
revoke all on function public.set_post_board(uuid, text) from public, anon, authenticated;
grant execute on function public.set_post_board(uuid, text) to authenticated;
