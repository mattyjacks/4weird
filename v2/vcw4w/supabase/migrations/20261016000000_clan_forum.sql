-- ============================================================================
-- Clan forum upgrades: voting, scores, flairs, threaded comments.
-- Fully rerunnable: IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS.
--
-- Model:
--   clan_posts  += flair, score/upvotes/downvotes/comment_count (denormalized)
--   clan_comments += parent_id (threaded replies), score/upvotes/downvotes
--   clan_votes  ; one row per (user, target). value = +1 | -1.
-- Writes go through SECURITY DEFINER RPCs only (deny-by-default RLS,
-- no client INSERT/UPDATE/DELETE policies). No coin tables are touched:
-- voting is free; posting/commenting fees still apply at the route layer.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 0. Columns (additive, rerunnable).
-- --------------------------------------------------------------------------
alter table public.clan_posts
  add column if not exists flair text not null default '';
alter table public.clan_posts
  add column if not exists score integer not null default 0;
alter table public.clan_posts
  add column if not exists upvotes integer not null default 0;
alter table public.clan_posts
  add column if not exists downvotes integer not null default 0;
alter table public.clan_posts
  add column if not exists comment_count integer not null default 0;

alter table public.clan_comments
  add column if not exists parent_id uuid null;
alter table public.clan_comments
  add column if not exists score integer not null default 0;
alter table public.clan_comments
  add column if not exists upvotes integer not null default 0;
alter table public.clan_comments
  add column if not exists downvotes integer not null default 0;

-- Threaded replies reference their parent comment (nullable = top-level).
-- NOT VALID lets the constraint apply to new rows without scanning old ones;
-- validate separately so the migration stays fast on big tables.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clan_comments_parent_fk'
  ) then
    alter table public.clan_comments
      add constraint clan_comments_parent_fk
      foreign key (parent_id) references public.clan_comments(id)
      on delete cascade not valid;
  end if;
end $$;
alter table public.clan_comments validate constraint clan_comments_parent_fk;

-- A reply must live on the same post as its parent (no cross-post grafts).
-- NOTE: Postgres CHECK constraints cannot contain subqueries (error 0A000),
-- so this is enforced with a BEFORE trigger instead of a CHECK.
alter table public.clan_comments drop constraint if exists clan_comments_parent_same_post;
create or replace function public.enforce_clan_comment_parent_same_post()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_parent_post uuid;
begin
  if NEW.parent_id is null then
    return NEW;
  end if;
  if NEW.parent_id = NEW.id then
    raise exception 'comment cannot be its own parent';
  end if;
  select post_id into v_parent_post
  from public.clan_comments where id = NEW.parent_id;
  if v_parent_post is null then
    raise exception 'parent comment not found';
  end if;
  if v_parent_post is distinct from NEW.post_id then
    raise exception 'parent comment must belong to same post';
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_clan_comment_parent_same_post on public.clan_comments;
create trigger trg_clan_comment_parent_same_post
  before insert or update of parent_id, post_id on public.clan_comments
  for each row execute function public.enforce_clan_comment_parent_same_post();

-- Flair allowlist (empty = no flair). Kept in sync with lib/clan-forum.ts.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clan_posts_flair_check'
  ) then
    alter table public.clan_posts
      add constraint clan_posts_flair_check check (
        flair in ('', 'Discussion', 'LFG', 'Question', 'Clip', 'Strat', 'Meme', 'News', 'OC')
      ) not valid;
  end if;
end $$;
alter table public.clan_posts validate constraint clan_posts_flair_check;

create index if not exists clan_posts_score_idx on public.clan_posts (clan_id, score desc, created_at desc);
create index if not exists clan_posts_flair_idx on public.clan_posts (clan_id, flair);
create index if not exists clan_comments_parent_idx on public.clan_comments (parent_id, score desc);
create index if not exists clan_comments_post_score_idx on public.clan_comments (post_id, score desc);

-- --------------------------------------------------------------------------
-- 1. Votes table.
-- --------------------------------------------------------------------------
create table if not exists public.clan_votes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id uuid not null,
  value smallint not null check (value in (1, -1)),
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);
create index if not exists clan_votes_target_idx on public.clan_votes (target_type, target_id);

alter table public.clan_votes enable row level security;

-- Users read their own votes only (powers the "my vote" highlight).
-- Aggregates stay public via the denormalized score/upvotes/downvotes columns.
drop policy if exists clan_votes_own_read on public.clan_votes;
create policy clan_votes_own_read on public.clan_votes
  for select to authenticated using (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- 2. Backfill counters from existing votes (idempotent: recomputes).
-- --------------------------------------------------------------------------
create or replace function public.backfill_clan_forum_counters()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.clan_posts p
  set upvotes = coalesce(
        (select count(*) filter (where value = 1)
         from public.clan_votes where target_type = 'post' and target_id = p.id), 0),
      downvotes = coalesce(
        (select count(*) filter (where value = -1)
         from public.clan_votes where target_type = 'post' and target_id = p.id), 0),
      score = coalesce(
        (select count(*) filter (where value = 1)
         from public.clan_votes where target_type = 'post' and target_id = p.id), 0)
        - coalesce(
        (select count(*) filter (where value = -1)
         from public.clan_votes where target_type = 'post' and target_id = p.id), 0),
      comment_count = coalesce(
        (select count(*) from public.clan_comments
         where post_id = p.id and status = 'visible'), 0);

  update public.clan_comments c
  set upvotes = coalesce(
        (select count(*) filter (where value = 1)
         from public.clan_votes where target_type = 'comment' and target_id = c.id), 0),
      downvotes = coalesce(
        (select count(*) filter (where value = -1)
         from public.clan_votes where target_type = 'comment' and target_id = c.id), 0),
      score = coalesce(
        (select count(*) filter (where value = 1)
         from public.clan_votes where target_type = 'comment' and target_id = c.id), 0)
        - coalesce(
        (select count(*) filter (where value = -1)
         from public.clan_votes where target_type = 'comment' and target_id = c.id), 0);
end; $$;

-- --------------------------------------------------------------------------
-- 3. comment_count trigger (covers human RPC, bot direct inserts, deletes).
-- --------------------------------------------------------------------------
create or replace function public.maintain_clan_comment_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.status = 'visible' then
      update public.clan_posts set comment_count = comment_count + 1 where id = NEW.post_id;
    end if;
    return NEW;
  elsif TG_OP = 'DELETE' then
    if OLD.status = 'visible' then
      update public.clan_posts
      set comment_count = greatest(0, comment_count - 1) where id = OLD.post_id;
    end if;
    return OLD;
  elsif TG_OP = 'UPDATE' then
    if OLD.status is distinct from NEW.status or OLD.post_id is distinct from NEW.post_id then
      if OLD.status = 'visible' then
        update public.clan_posts
        set comment_count = greatest(0, comment_count - 1) where id = OLD.post_id;
      end if;
      if NEW.status = 'visible' then
        update public.clan_posts set comment_count = comment_count + 1 where id = NEW.post_id;
      end if;
    end if;
    return NEW;
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_clan_comment_count on public.clan_comments;
create trigger trg_clan_comment_count
  after insert or update of status, post_id or delete on public.clan_comments
  for each row execute function public.maintain_clan_comment_count();

-- --------------------------------------------------------------------------
-- 4. create_comment: accept an optional parent reply id (default null keeps
--    the legacy 3-arg call shape working).
-- --------------------------------------------------------------------------
create or replace function public.create_comment(
  p_post_id uuid, p_body text, p_status text, p_parent_id uuid default null
)
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
-- 5. Voting RPCs. Toggle semantics: repeating the same value clears the vote,
--    the opposite value switches it, 0 clears. Counters update atomically.
--    Membership in the clan is required (mirrors posting rules).
-- --------------------------------------------------------------------------
create or replace function public.vote_clan_post(p_post_id uuid, p_value smallint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_clan uuid;
  v_old smallint;
  v_up integer;
  v_dn integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_value not in (1, -1, 0) then raise exception 'invalid vote'; end if;
  select clan_id into v_clan from public.clan_posts where id = p_post_id;
  if v_clan is null then raise exception 'post not found'; end if;
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
  v_old smallint;
  v_up integer;
  v_dn integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_value not in (1, -1, 0) then raise exception 'invalid vote'; end if;
  select post_id into v_post from public.clan_comments where id = p_comment_id;
  if v_post is null then raise exception 'comment not found'; end if;
  select clan_id into v_clan from public.clan_posts where id = v_post;
  if v_clan is null then raise exception 'post not found'; end if;
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
-- 6. Flair. Author or owner/mod may set one of the allowlisted flairs.
-- --------------------------------------------------------------------------
create or replace function public.set_post_flair(p_post_id uuid, p_flair text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_flair text := trim(coalesce(p_flair, ''));
  v_clan uuid;
  v_author uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_flair not in ('', 'Discussion', 'LFG', 'Question', 'Clip', 'Strat', 'Meme', 'News', 'OC') then
    raise exception 'invalid flair';
  end if;
  select clan_id, author_id into v_clan, v_author from public.clan_posts where id = p_post_id;
  if v_clan is null then raise exception 'post not found'; end if;
  if v_author != auth.uid()
    and not exists (
      select 1 from public.clan_members
      where clan_id = v_clan and user_id = auth.uid() and role in ('owner', 'mod')
    )
    and not exists (select 1 from public.clans where id = v_clan and owner_id = auth.uid()) then
    raise exception 'not allowed';
  end if;
  update public.clan_posts set flair = v_flair where id = p_post_id;
end; $$;
revoke all on function public.set_post_flair(uuid, text) from public, anon, authenticated;
grant execute on function public.set_post_flair(uuid, text) to authenticated;

-- Backfill existing rows (safe to re-run; recomputes from votes + comments).
select public.backfill_clan_forum_counters();
