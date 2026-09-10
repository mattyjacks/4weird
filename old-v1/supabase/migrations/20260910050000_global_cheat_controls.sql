-- Global AI-testing permission. This does not mark saves; only enabling a
-- specific game/save does, preserving the permanent per-save audit trail.
create table if not exists public.global_cheat_settings (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 enabled boolean not null default false, updated_at timestamptz not null default now()
);
alter table public.global_cheat_settings enable row level security;
create policy global_cheats_own on public.global_cheat_settings for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
