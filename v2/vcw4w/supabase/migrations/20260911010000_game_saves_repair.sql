-- Repair/complete the cloud-save contract for databases created from a
-- partial migration bundle. Safe to run after the original game_saves
-- migrations: every DDL statement is idempotent and policies are replaced.

create table if not exists public.game_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_slug text not null,
  slot integer not null default 1 check (slot between 1 and 3),
  schema_version integer not null default 1 check (schema_version > 0),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, game_slug, slot)
);

alter table public.game_saves enable row level security;
grant select, insert, update on public.game_saves to authenticated;
revoke delete on public.game_saves from authenticated;

drop policy if exists game_saves_own on public.game_saves;
drop policy if exists game_saves_read_own on public.game_saves;
drop policy if exists game_saves_insert_own on public.game_saves;
drop policy if exists game_saves_update_own on public.game_saves;
drop policy if exists "Users can read their own game saves" on public.game_saves;
drop policy if exists "Users can insert their own game saves" on public.game_saves;
drop policy if exists "Users can update their own game saves" on public.game_saves;
drop policy if exists "Users can delete their own game saves" on public.game_saves;

create policy game_saves_read_own on public.game_saves
  for select to authenticated using (user_id = auth.uid());
create policy game_saves_insert_own on public.game_saves
  for insert to authenticated with check (user_id = auth.uid());
create policy game_saves_update_own on public.game_saves
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.touch_game_save_updated_at()
returns trigger
language plpgsql
as $save_touch$
begin
  new.updated_at = now();
  return new;
end;
$save_touch$;
drop trigger if exists game_saves_updated_at on public.game_saves;
drop trigger if exists trg_game_saves_updated_at on public.game_saves;
create trigger game_saves_updated_at
  before update on public.game_saves
  for each row execute function public.touch_game_save_updated_at();
