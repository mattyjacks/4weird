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
create policy "Users can read their own game saves" on public.game_saves for select using (auth.uid() = user_id);
create policy "Users can insert their own game saves" on public.game_saves for insert with check (auth.uid() = user_id);
create policy "Users can update their own game saves" on public.game_saves for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own game saves" on public.game_saves for delete using (auth.uid() = user_id);

create or replace function public.touch_game_save_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists game_saves_updated_at on public.game_saves;
create trigger game_saves_updated_at before update on public.game_saves for each row execute function public.touch_game_save_updated_at();
