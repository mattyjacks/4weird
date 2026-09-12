-- ============================================================================
-- Buddy cross-session memory (opt-in, per user + game, extractive only).
--
-- No model calls anywhere: the /api/buddy/memory route only appends and
-- trims plain-text "Player: … / Buddy: …" lines (lib/buddy-memory.ts) and
-- persists them here. Fully rerunnable: IF NOT EXISTS / OR REPLACE /
-- DROP ... IF EXISTS.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Memory table (one row per user + game).
-- --------------------------------------------------------------------------
create table if not exists public.buddy_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  game_slug text not null check (game_slug ~ '^[a-z0-9-]{1,64}$'),
  memory_text text not null default '' check (char_length(memory_text) <= 2000),
  updated_at timestamptz not null default now(),
  unique (user_id, game_slug)
);
create index if not exists idx_buddy_memory_user on public.buddy_memory (user_id, game_slug);

-- --------------------------------------------------------------------------
-- 2. RLS; deny by default; users read their own rows only (writes go
--    through the SECURITY DEFINER RPCs below, never direct DML).
-- --------------------------------------------------------------------------
alter table public.buddy_memory enable row level security;

drop policy if exists buddy_memory_own on public.buddy_memory;
create policy buddy_memory_own on public.buddy_memory
  for select to authenticated using (user_id = auth.uid());

revoke all on public.buddy_memory from anon, authenticated;
grant select on public.buddy_memory to authenticated;

-- --------------------------------------------------------------------------
-- 3. RPCs; the ONLY writers. Both enforce auth.uid() = user_id.
-- --------------------------------------------------------------------------

-- buddy_get_memory: read your own stored memory for one game ('').
create or replace function public.buddy_get_memory(p_game text)
returns text
language plpgsql security definer set search_path = public as $$
declare v_game text; v_text text;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  v_game := lower(trim(coalesce(p_game, '')));
  if v_game !~ '^[a-z0-9-]{1,64}$' then raise exception 'invalid game'; end if;
  select m.memory_text into v_text
  from public.buddy_memory m
  where m.user_id = auth.uid() and m.game_slug = v_game;
  if not found then return ''; end if;
  return coalesce(v_text, '');
end; $$;
revoke all on function public.buddy_get_memory(text) from public, anon, authenticated;
grant execute on function public.buddy_get_memory(text) to authenticated;

-- buddy_save_memory: upsert your own memory for one game (caps at 2000).
create or replace function public.buddy_save_memory(p_game text, p_text text)
returns text
language plpgsql security definer set search_path = public as $$
declare v_game text; v_text text;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  v_game := lower(trim(coalesce(p_game, '')));
  if v_game !~ '^[a-z0-9-]{1,64}$' then raise exception 'invalid game'; end if;
  v_text := substr(trim(coalesce(p_text, '')), 1, 2000);
  insert into public.buddy_memory (user_id, game_slug, memory_text, updated_at)
  values (auth.uid(), v_game, v_text, now())
  on conflict (user_id, game_slug)
  do update set memory_text = excluded.memory_text, updated_at = now();
  return v_text;
end; $$;
revoke all on function public.buddy_save_memory(text, text) from public, anon, authenticated;
grant execute on function public.buddy_save_memory(text, text) to authenticated;
