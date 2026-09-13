-- GraveGain 1D/2D/3D multiplayer: same-game quick match + match event feed.
--
-- 1. public.gravegain_quick_match(p_game, p_platform) pairs two players on the
--    SAME game slug regardless of platform (unlike quick_match which requires
--    opposite platforms). Slot assignment mirrors quick_match: the caller
--    takes the phone slot when p_platform = 'phone', else the desktop slot.
-- 2. public.game_mp_events stores per-match events (join/leave/kill/boss/
--    loot/chat/emote/win/seed) with a 140-char text cap enforced by CHECK.
-- 3. public.post_mp_event / public.read_mp_event feed helpers (participant
--    only, active matches for writes, newest-first capped reads).
-- Re-runnable: IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS throughout.
-- Never touches coin tables.

create table if not exists public.game_mp_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.game_matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('join','leave','kill','boss','loot','chat','emote','win','seed')),
  text text not null default '' check (char_length(text) <= 140),
  created_at timestamptz not null default now()
);

alter table public.game_mp_events enable row level security;

drop policy if exists mp_events_select on public.game_mp_events;
create policy mp_events_select on public.game_mp_events for select to authenticated
  using (exists (select 1 from public.game_matches m where m.id = match_id and (m.phone_id = auth.uid() or m.desktop_id = auth.uid())));

drop policy if exists mp_events_insert on public.game_mp_events;
create policy mp_events_insert on public.game_mp_events for insert to authenticated
  with check (exists (select 1 from public.game_matches m where m.id = match_id and (m.phone_id = auth.uid() or m.desktop_id = auth.uid())));

create index if not exists game_mp_events_match_created_idx on public.game_mp_events (match_id, created_at);

create or replace function public.gravegain_quick_match(p_game text, p_platform text)
returns table(match_id uuid, status text)
language plpgsql security definer set search_path = public as $$
declare
  opponent record;
  mine uuid := auth.uid();
  m uuid;
begin
  if mine is null then raise exception 'login required'; end if;
  if p_game not in ('gravegain1d','gravegain2d','gravegain3d') then raise exception 'invalid game'; end if;
  if p_platform not in ('phone','desktop') then raise exception 'invalid platform'; end if;
  delete from public.game_match_queue where created_at < now() - interval '2 minutes';
  select * into opponent from public.game_match_queue
    where game_slug = p_game and user_id <> mine
    order by created_at for update skip locked limit 1;
  if found then
    insert into public.game_matches(game_slug, phone_id, desktop_id)
      values (p_game,
        case when p_platform = 'phone' then mine else opponent.user_id end,
        case when p_platform = 'desktop' then mine else opponent.user_id end)
      returning id into m;
    delete from public.game_match_queue where id = opponent.id;
    delete from public.game_match_queue where user_id = mine;
    return query select m, 'matched'::text;
  end if;
  insert into public.game_match_queue(user_id, game_slug, platform)
    values (mine, p_game, p_platform)
    on conflict (user_id) do update set game_slug = excluded.game_slug, platform = excluded.platform, created_at = now();
  return query select null::uuid, 'waiting'::text;
end; $$;

create or replace function public.post_mp_event(p_match uuid, p_kind text, p_text text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  mine uuid := auth.uid();
begin
  if mine is null then raise exception 'login required'; end if;
  if p_kind not in ('join','leave','kill','boss','loot','chat','emote','win','seed') then raise exception 'invalid kind'; end if;
  if p_text is not null and char_length(p_text) > 140 then raise exception 'text too long'; end if;
  if not exists (select 1 from public.game_matches where id = p_match and status = 'active' and (phone_id = mine or desktop_id = mine)) then
    raise exception 'not your match';
  end if;
  insert into public.game_mp_events(match_id, user_id, kind, text)
    values (p_match, mine, p_kind, coalesce(p_text, ''));
  return true;
end; $$;

create or replace function public.read_mp_events(p_match uuid, p_since timestamptz default null, p_limit int default 50)
returns table(id uuid, user_id uuid, kind text, text text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  mine uuid := auth.uid();
  lim int;
begin
  if mine is null then raise exception 'login required'; end if;
  if not exists (select 1 from public.game_matches where id = p_match and (phone_id = mine or desktop_id = mine)) then
    raise exception 'not your match';
  end if;
  lim := least(greatest(coalesce(p_limit, 50), 1), 100);
  return query select e.id, e.user_id, e.kind, e.text, e.created_at
    from public.game_mp_events e
    where e.match_id = p_match and (p_since is null or e.created_at > p_since)
    order by e.created_at desc
    limit lim;
end; $$;

grant execute on function public.gravegain_quick_match(text, text) to authenticated;
grant execute on function public.post_mp_event(uuid, text, text) to authenticated;
grant execute on function public.read_mp_events(uuid, timestamptz, integer) to authenticated;
