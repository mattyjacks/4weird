-- Social, telemetry, creator submissions, and permanent per-save cheat marking.
-- Apply after schema.sql. All user data remains protected by RLS.
alter table public.profiles add column if not exists public_handle varchar(40) unique;
alter table public.profiles add column if not exists public_playtime boolean not null default true;

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(), requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','accepted','blocked')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(requester_id <> addressee_id), unique(requester_id, addressee_id)
);
create table if not exists public.direct_messages (
 id uuid primary key default gen_random_uuid(), sender_id uuid not null references public.profiles(id) on delete cascade,
 recipient_id uuid not null references public.profiles(id) on delete cascade, body varchar(2000) not null check(char_length(trim(body)) between 1 and 2000), created_at timestamptz not null default now(), read_at timestamptz
);
create table if not exists public.game_stat_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, game_slug text not null check(game_slug ~ '^[a-z0-9-]{1,64}$'),
 active_seconds integer not null default 0 check(active_seconds between 0 and 3600), actions integer not null default 0 check(actions between 0 and 100000), kills integer not null default 0 check(kills between 0 and 100000), deaths integer not null default 0 check(deaths between 0 and 100000), created_at timestamptz not null default now()
);
create table if not exists public.cheat_settings (
 user_id uuid not null references public.profiles(id) on delete cascade, game_slug text not null check(game_slug ~ '^[a-z0-9-]{1,64}$'), slot smallint not null check(slot between 1 and 3), enabled boolean not null default false, cheated_at timestamptz, primary key(user_id,game_slug,slot)
);
create table if not exists public.code_submissions (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade, title varchar(80) not null, source text not null check(octet_length(source) <= 262144), status text not null default 'draft' check(status in ('draft','submitted','approved','rejected')), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.friendships enable row level security; alter table public.direct_messages enable row level security; alter table public.game_stat_events enable row level security; alter table public.cheat_settings enable row level security; alter table public.code_submissions enable row level security;
create policy friendships_own on public.friendships for all to authenticated using(requester_id=auth.uid() or addressee_id=auth.uid()) with check(requester_id=auth.uid() or addressee_id=auth.uid());
create policy messages_friends on public.direct_messages for select to authenticated using(sender_id=auth.uid() or recipient_id=auth.uid());
create policy messages_send_to_friend on public.direct_messages for insert to authenticated with check(sender_id=auth.uid() and exists(select 1 from public.friendships f where f.status='accepted' and ((f.requester_id=auth.uid() and f.addressee_id=recipient_id) or (f.addressee_id=auth.uid() and f.requester_id=recipient_id))));
create policy stats_own on public.game_stat_events for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy cheats_own on public.cheat_settings for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
-- Owners can read and create drafts, but cannot self-approve or alter a submitted
-- package through the database API. Admin review is a separately audited action.
create policy code_owner_read on public.code_submissions for select to authenticated using(owner_id=auth.uid());
create policy code_owner_draft_insert on public.code_submissions for insert to authenticated with check(owner_id=auth.uid() and status='draft');
create policy code_owner_draft_update on public.code_submissions for update to authenticated using(owner_id=auth.uid() and status='draft') with check(owner_id=auth.uid() and status in ('draft','submitted'));
create policy code_admin_review on public.code_submissions for all to authenticated using((auth.jwt() -> 'app_metadata' ->> 'role')='admin') with check((auth.jwt() -> 'app_metadata' ->> 'role')='admin');
create or replace function public.set_cheat_setting(p_game text,p_slot smallint,p_enabled boolean) returns boolean language plpgsql security definer set search_path=public as $$ begin
 if p_game !~ '^[a-z0-9-]{1,64}$' or p_slot not between 1 and 3 then raise exception 'invalid cheat setting'; end if;
 insert into cheat_settings(user_id,game_slug,slot,enabled,cheated_at) values(auth.uid(),p_game,p_slot,p_enabled,case when p_enabled then now() end) on conflict(user_id,game_slug,slot) do update set enabled=excluded.enabled,cheated_at=coalesce(cheat_settings.cheated_at,excluded.cheated_at);
 if p_enabled then insert into game_saves(user_id,game_slug,slot,data) values(auth.uid(),p_game,p_slot,jsonb_build_object('cheat_mode',true)) on conflict(user_id,game_slug,slot) do update set data=game_saves.data || jsonb_build_object('cheat_mode',true); end if; return p_enabled; end; $$;
grant execute on function public.set_cheat_setting(text,smallint,boolean) to authenticated;
