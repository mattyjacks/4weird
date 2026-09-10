-- Persistent account preferences and a gated creator monetization handoff.
create table if not exists public.account_settings (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 allow_friend_requests boolean not null default true,
 show_playtime boolean not null default true,
 marketing_email boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.account_settings enable row level security;
drop policy if exists account_settings_own on public.account_settings;
create policy account_settings_own on public.account_settings for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
alter table public.code_submissions add column if not exists monetization_status text not null default 'not_ready' check(monetization_status in ('not_ready','ready','enabled'));
create or replace function public.set_creator_monetization(p_submission uuid,p_enabled boolean)
returns boolean language plpgsql security definer set search_path=public as $$
begin update code_submissions set monetization_status=case when p_enabled then 'ready' else 'not_ready' end where id=p_submission and owner_id=auth.uid() and status='approved'; return found; end; $$;
revoke all on function public.set_creator_monetization(uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_creator_monetization(uuid,boolean) to authenticated;
create or replace function public.request_friend_by_handle(p_handle text) returns boolean language plpgsql security definer set search_path=public as $$
declare target uuid;
begin select id into target from profiles where public_handle=lower(p_handle); if target is null then raise exception 'player not found'; end if; if target=auth.uid() then raise exception 'cannot add yourself'; end if; if exists(select 1 from account_settings where user_id=target and allow_friend_requests=false) then raise exception 'player does not accept friend requests'; end if; insert into friendships(requester_id,addressee_id) values(auth.uid(),target); return true; exception when unique_violation then raise exception 'request already exists'; end; $$;
