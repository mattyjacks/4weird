-- Live-match relay, safe aggregate telemetry, and RPC helpers for account UI.
create table if not exists public.game_match_queue (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.profiles(id) on delete cascade,
  game_slug text not null check(game_slug ~ '^[a-z0-9-]{1,64}$'), platform text not null check(platform in ('phone','desktop')), created_at timestamptz not null default now()
);
create table if not exists public.game_matches (
  id uuid primary key default gen_random_uuid(), game_slug text not null check(game_slug ~ '^[a-z0-9-]{1,64}$'), phone_id uuid not null references public.profiles(id), desktop_id uuid not null references public.profiles(id),
  phone_state jsonb not null default '{}'::jsonb check(pg_column_size(phone_state)<=4096), desktop_state jsonb not null default '{}'::jsonb check(pg_column_size(desktop_state)<=4096),
  status text not null default 'active' check(status in ('active','finished','abandoned')), created_at timestamptz not null default now(), finished_at timestamptz,
  check(phone_id<>desktop_id)
);
alter table public.game_match_queue enable row level security; alter table public.game_matches enable row level security;
drop policy if exists friendships_own on public.friendships;
drop policy if exists friendships_read_own on public.friendships;
create policy friendships_read_own on public.friendships for select to authenticated using(requester_id=auth.uid() or addressee_id=auth.uid());
drop policy if exists friendships_insert_requester on public.friendships;
create policy friendships_insert_requester on public.friendships for insert to authenticated with check(requester_id=auth.uid());
drop policy if exists friendships_respond_recipient on public.friendships;
create policy friendships_respond_recipient on public.friendships for update to authenticated using(addressee_id=auth.uid()) with check(addressee_id=auth.uid());
drop policy if exists friendships_delete_own on public.friendships;
create policy friendships_delete_own on public.friendships for delete to authenticated using(requester_id=auth.uid() or addressee_id=auth.uid());
drop policy if exists queue_own on public.game_match_queue;
create policy queue_own on public.game_match_queue for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists matches_participant on public.game_matches;
create policy matches_participant on public.game_matches for select to authenticated using(phone_id=auth.uid() or desktop_id=auth.uid());

create or replace function public.quick_match(p_game text,p_platform text)
returns table(match_id uuid, status text, opponent_platform text)
language plpgsql security definer set search_path=public as $$
declare opponent record; mine uuid := auth.uid(); m uuid;
begin
  if mine is null or p_game !~ '^[a-z0-9-]{1,64}$' or p_platform not in ('phone','desktop') then raise exception 'invalid match request'; end if;
  delete from game_match_queue where created_at < now()-interval '2 minutes';
  select * into opponent from game_match_queue where game_slug=p_game and platform<>p_platform and user_id<>mine order by created_at for update skip locked limit 1;
  if found then
    insert into game_matches(game_slug,phone_id,desktop_id) values(p_game,case when p_platform='phone' then mine else opponent.user_id end,case when p_platform='desktop' then mine else opponent.user_id end) returning id into m;
    delete from game_match_queue where id=opponent.id; delete from game_match_queue where user_id=mine;
    return query select m,'matched'::text,opponent.platform;
  end if;
  insert into game_match_queue(user_id,game_slug,platform) values(mine,p_game,p_platform) on conflict(user_id) do update set game_slug=excluded.game_slug,platform=excluded.platform,created_at=now();
  return query select null::uuid,'waiting'::text,null::text;
end; $$;

create or replace function public.update_match_state(p_match uuid,p_state jsonb)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if pg_column_size(p_state)>4096 or jsonb_typeof(p_state)<>'object' then raise exception 'invalid state'; end if;
 update game_matches set phone_state=case when phone_id=auth.uid() then p_state else phone_state end,desktop_state=case when desktop_id=auth.uid() then p_state else desktop_state end where id=p_match and status='active' and (phone_id=auth.uid() or desktop_id=auth.uid());
 return found;
end; $$;
create or replace function public.my_friends()
returns table(id uuid,display_name text,public_handle text,status text,direction text,created_at timestamptz)
language sql security definer set search_path=public as $$ select f.id,p.display_name,p.public_handle,f.status,case when f.requester_id=auth.uid() then 'outgoing' else 'incoming' end,f.created_at from friendships f join profiles p on p.id=case when f.requester_id=auth.uid() then f.addressee_id else f.requester_id end where f.requester_id=auth.uid() or f.addressee_id=auth.uid() order by f.created_at desc $$;
create or replace function public.respond_friend_request(p_id uuid,p_accept boolean) returns boolean language plpgsql security definer set search_path=public as $$ begin update friendships set status=case when p_accept then 'accepted' else 'blocked' end where id=p_id and addressee_id=auth.uid() and status='pending'; return found; end; $$;
create or replace function public.request_friend_by_handle(p_handle text) returns boolean language plpgsql security definer set search_path=public as $$
declare target uuid;
begin select id into target from profiles where public_handle=lower(p_handle); if target is null then raise exception 'player not found'; end if; if target=auth.uid() then raise exception 'cannot add yourself'; end if; insert into friendships(requester_id,addressee_id) values(auth.uid(),target); return true; exception when unique_violation then raise exception 'request already exists'; end; $$;
grant execute on function public.quick_match(text,text),public.update_match_state(uuid,jsonb),public.my_friends(),public.respond_friend_request(uuid,boolean),public.request_friend_by_handle(text) to authenticated;
create or replace function public.community_stat_averages()
returns table(active_seconds_per_player numeric,kills_per_minute numeric,deaths_per_minute numeric,actions_per_minute numeric)
language sql security definer set search_path=public as $$
 select coalesce(sum(active_seconds)::numeric/nullif(count(distinct user_id),0),0),coalesce(sum(kills)::numeric*60/nullif(sum(active_seconds),0),0),coalesce(sum(deaths)::numeric*60/nullif(sum(active_seconds),0),0),coalesce(sum(actions)::numeric*60/nullif(sum(active_seconds),0),0) from game_stat_events $$;
grant execute on function public.community_stat_averages() to authenticated;
