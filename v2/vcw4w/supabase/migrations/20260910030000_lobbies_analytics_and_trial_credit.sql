-- Lobby discovery, aggregate charts, and one privacy-preserving trial credit per IP.
create table if not exists public.game_lobbies (
 id uuid primary key default gen_random_uuid(), game_slug text not null check(game_slug ~ '^[a-z0-9-]{1,64}$'), host_id uuid not null references public.profiles(id) on delete cascade,
 guest_id uuid references public.profiles(id) on delete set null, host_platform text not null check(host_platform in ('phone','desktop')),
 visibility text not null check(visibility in ('public','friends','private')), join_code varchar(12) not null unique,
 title varchar(48) not null default 'Platform Wars lobby', status text not null default 'open' check(status in ('open','active','closed')), created_at timestamptz not null default now(), check(guest_id is null or guest_id<>host_id)
);
alter table public.game_lobbies add column if not exists host_relay_ping_ms integer not null default 999 check(host_relay_ping_ms between 0 and 5000);
create table if not exists public.game_presence (
 user_id uuid not null references public.profiles(id) on delete cascade, game_slug text not null check(game_slug ~ '^[a-z0-9-]{1,64}$'), actor_kind text not null check(actor_kind in ('human','vibecodeworker','bot','unknown')), last_seen_at timestamptz not null default now(), primary key(user_id,game_slug)
);
create table if not exists public.signup_ip_credits (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.profiles(id) on delete cascade, ip_hash char(64) not null unique, created_at timestamptz not null default now()
);
alter table public.game_lobbies enable row level security; alter table public.game_presence enable row level security; alter table public.signup_ip_credits enable row level security;
create policy lobbies_participant_read on public.game_lobbies for select to authenticated using(host_id=auth.uid() or guest_id=auth.uid());
create policy presence_own on public.game_presence for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

create or replace function public.create_lobby(p_game text,p_platform text,p_visibility text,p_title text)
returns table(lobby_id uuid,join_code text) language plpgsql security definer set search_path=public as $$
declare code text; lid uuid;
begin if p_game !~ '^[a-z0-9-]{1,64}$' or p_platform not in ('phone','desktop') or p_visibility not in ('public','friends','private') then raise exception 'invalid lobby'; end if;
 code:=upper(substr(encode(gen_random_bytes(8),'hex'),1,8)); insert into game_lobbies(game_slug,host_id,host_platform,visibility,join_code,title) values(p_game,auth.uid(),p_platform,p_visibility,code,substring(trim(p_title) from 1 for 48)) returning id into lid; return query select lid,code; end; $$;
create or replace function public.list_joinable_lobbies(p_game text)
returns table(id uuid,title text,host_handle text,host_platform text,visibility text,created_at timestamptz)
language sql security definer set search_path=public as $$ select l.id,l.title,p.public_handle,l.host_platform,l.visibility,l.created_at from game_lobbies l join profiles p on p.id=l.host_id where l.game_slug=p_game and l.status='open' and (l.visibility='public' or (l.visibility='friends' and exists(select 1 from friendships f where f.status='accepted' and ((f.requester_id=auth.uid() and f.addressee_id=l.host_id) or (f.addressee_id=auth.uid() and f.requester_id=l.host_id))))) order by l.created_at desc limit 100 $$;
create or replace function public.join_lobby(p_lobby uuid,p_code text default null)
returns table(lobby_id uuid,match_id uuid) language plpgsql security definer set search_path=public as $$
declare l game_lobbies%rowtype; mid uuid;
begin select * into l from game_lobbies where id=p_lobby for update; if not found or l.status<>'open' or l.guest_id is not null then raise exception 'lobby unavailable'; end if; if l.host_id=auth.uid() then raise exception 'cannot join your lobby'; end if; if l.visibility='private' and l.join_code<>upper(coalesce(p_code,'')) then raise exception 'bad join code'; end if; if l.visibility='friends' and not exists(select 1 from friendships f where f.status='accepted' and ((f.requester_id=auth.uid() and f.addressee_id=l.host_id) or (f.addressee_id=auth.uid() and f.requester_id=l.host_id))) then raise exception 'friends only'; end if; update game_lobbies set guest_id=auth.uid(),status='active' where id=l.id; insert into game_matches(game_slug,phone_id,desktop_id) values(l.game_slug,case when l.host_platform='phone' then l.host_id else auth.uid() end,case when l.host_platform='desktop' then l.host_id else auth.uid() end) returning id into mid; return query select l.id,mid; end; $$;
create or replace function public.game_chart_summary()
returns table(game_slug text,current_humans bigint,current_vibecodeworker bigint,current_bots bigint,active_24h bigint)
language sql security definer set search_path=public as $$ select game_slug,count(*) filter(where actor_kind='human' and last_seen_at>now()-interval '90 seconds'),count(*) filter(where actor_kind='vibecodeworker' and last_seen_at>now()-interval '90 seconds'),count(*) filter(where actor_kind='bot' and last_seen_at>now()-interval '90 seconds'),count(*) filter(where last_seen_at>now()-interval '24 hours') from game_presence group by game_slug $$;
create or replace function public.award_signup_credit(p_user uuid,p_email text,p_ip_hash text,p_coins integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare grant_uuid uuid;
begin if p_coins<1 or p_coins>100 then raise exception 'invalid trial credit'; end if; insert into signup_ip_credits(user_id,ip_hash) values(p_user,p_ip_hash); insert into coin_grants(user_id,email,shopify_order_id,shopify_order_name,sku,coins,claimed) values(p_user,p_email,'signup-ip-'||p_ip_hash,'New-account trial','VIBE-TRIAL',p_coins,true) returning id into grant_uuid; insert into coin_ledger(user_id,delta,reason,grant_id) values(p_user,p_coins,'New-account $1 V Coin trial',grant_uuid); return true; exception when unique_violation then return false; end; $$;
revoke all on function public.create_lobby(text,text,text,text),public.list_joinable_lobbies(text),public.join_lobby(uuid,text),public.game_chart_summary(),public.award_signup_credit(uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.create_lobby(text,text,text,text),public.list_joinable_lobbies(text),public.join_lobby(uuid,text) to authenticated;
grant execute on function public.game_chart_summary() to anon,authenticated;
create or replace function public.list_all_open_lobbies(p_game text default null)
returns table(id uuid,game_slug text,title text,host_handle text,host_platform text,visibility text,relay_ping_ms integer,created_at timestamptz)
language sql security definer set search_path=public as $$ select l.id,l.game_slug,l.title,p.public_handle,l.host_platform,l.visibility,l.host_relay_ping_ms,l.created_at from game_lobbies l join profiles p on p.id=l.host_id where l.status='open' and l.created_at>now()-interval '30 minutes' and (p_game is null or l.game_slug=p_game) and (l.visibility='public' or (l.visibility='friends' and exists(select 1 from friendships f where f.status='accepted' and ((f.requester_id=auth.uid() and f.addressee_id=l.host_id) or (f.addressee_id=auth.uid() and f.requester_id=l.host_id))))) order by l.host_relay_ping_ms,l.created_at limit 200 $$;
revoke all on function public.list_all_open_lobbies(text) from public,anon,authenticated;
grant execute on function public.list_all_open_lobbies(text) to authenticated;
