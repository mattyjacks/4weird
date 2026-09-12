-- ============================================================================
-- Swarm brain: OpenClaw-style per-user internal brain + .txt doc RAG +
-- auto-orchestrated child instances for Agent Swarm Chat (/swarm).
-- Fully rerunnable: IF NOT EXISTS / ADD COLUMN IF NOT EXISTS /
-- DROP ... IF EXISTS.
--
-- Rule (mirrors lib/swarm.ts SWARM_COMPUTE_CUT_PCT = 25):
--   * Memory + RAG + child orchestration ride the existing chat turn.
--     Coins move only in meter_game_ai_usage (kind `inference`, game_slug
--     `swarm`), so gross prices INCLUDE the 25% platform cut and split 25/75
--     in SQL. No new ledger kind, no new RPC.
--   * These tables persist the brain only: who the operator is (persona,
--     terse fact bullets, goals), their own .txt docs for RAG, and which
--     child sessions a turn spawned. The injected prompt block is budgeted
--     in lib/swarm-brain.ts (~150 tokens brain + ~300 tokens RAG).
-- ============================================================================

-- One brain per user: persona + token-cheap memory + exec preference.
create table if not exists public.swarm_brains (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  persona text not null default '' check (char_length(persona) <= 500),
  facts text[] not null default array[]::text[],
  goals text[] not null default array[]::text[],
  exec_mode text not null default 'auto' check (exec_mode in ('auto','serverless','serverful')),
  memory_summary text not null default '' check (char_length(memory_summary) <= 600),
  updated_at timestamptz not null default now()
);

-- Personal .txt docs for internal RAG (plain text only, enforced in the API).
create table if not exists public.swarm_docs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) >= 1 and char_length(name) <= 80),
  content text not null check (char_length(content) >= 1 and char_length(content) <= 20000),
  created_at timestamptz not null default now()
);
create index if not exists idx_swarm_docs_user on public.swarm_docs (user_id, created_at desc);

-- Child-instance + exec-mode columns on the existing session table.
alter table public.swarm_sessions add column if not exists parent_session_id uuid references public.swarm_sessions (id) on delete cascade;
alter table public.swarm_sessions add column if not exists exec_mode text not null default 'auto';
-- Backfill guard: keep only the three legal values on reruns of old rows.
do $$
begin
  begin
    alter table public.swarm_sessions drop constraint if exists swarm_sessions_exec_mode_check;
  exception when undefined_object then null;
  end;
  begin
    alter table public.swarm_sessions add constraint swarm_sessions_exec_mode_check check (exec_mode in ('auto','serverless','serverful'));
  exception when duplicate_object then null;
  end;
end $$;
alter table public.swarm_sessions add column if not exists memory_summary text not null default '';
create index if not exists idx_swarm_sessions_parent on public.swarm_sessions (parent_session_id, created_at desc);

alter table public.swarm_brains enable row level security;
alter table public.swarm_docs enable row level security;

drop policy if exists swarm_brains_own on public.swarm_brains;
create policy swarm_brains_own on public.swarm_brains
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists swarm_docs_own on public.swarm_docs;
create policy swarm_docs_own on public.swarm_docs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.swarm_brains from anon, authenticated;
revoke all on public.swarm_docs from anon, authenticated;
grant select, insert, update, delete on public.swarm_brains to authenticated;
grant select, insert, delete on public.swarm_docs to authenticated;
