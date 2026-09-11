-- ============================================================================
-- Agent Swarm Chat — hire a swarm of agents as one chatbot interface.
-- Fully rerunnable: IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS.
--
-- Rule (mirrors lib/swarm.ts SWARM_COMPUTE_CUT_PCT = 25):
--   * Swarm chat turns meter through the existing meter_game_ai_usage RPC
--     (kind `inference`, game_slug `swarm`), so gross prices INCLUDE the 25%
--     platform cut and split 25/75 in SQL. No new ledger kind, no new RPC.
--   * These tables persist the hire only: who owns the swarm, its config
--     (size, runtimes, system prompts, orchestration, model, tools), and the
--     message trail. Coins move only in meter_game_ai_usage.
-- ============================================================================

create table if not exists public.swarm_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null default 'Swarm' check (char_length(name) >= 1 and char_length(name) <= 60),
  size integer not null default 1 check (size >= 1 and size <= 5),
  runtimes text[] not null default array['vibecodeworker'],
  system_prompt text not null default '' check (char_length(system_prompt) <= 2000),
  agent_prompts text[] not null default array[]::text[],
  orchestration text not null default 'auto' check (orchestration in ('auto','lead','round-robin')),
  model text not null default 'auto' check (model in ('auto','openai','openrouter','local')),
  temperature numeric not null default 0.8 check (temperature >= 0 and temperature <= 1.5),
  tools text[] not null default array['vcw.open_run','vcw.file_finding','vcw.handoff','opencode.export','opencode.heal','deepseek.orchestrate','fal.generate','buddy.tts','swarm.delegate'],
  status text not null default 'open' check (status in ('open','ended')),
  turns integer not null default 0 check (turns >= 0 and turns <= 100000),
  gross_coins numeric(12, 2) not null default 0 check (gross_coins >= 0 and gross_coins <= 100000000),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists idx_swarm_sessions_user on public.swarm_sessions (user_id, created_at desc);

create table if not exists public.swarm_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.swarm_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user','swarm','system')),
  agent_index integer not null default -1 check (agent_index >= -1 and agent_index <= 4),
  agent_name text not null default '' check (char_length(agent_name) <= 40),
  text text not null check (char_length(text) >= 1 and char_length(text) <= 8000),
  tool_calls jsonb not null default '[]'::jsonb,
  gross_coins numeric(12, 2) not null default 0 check (gross_coins >= 0 and gross_coins <= 100000000),
  created_at timestamptz not null default now()
);
create index if not exists idx_swarm_messages_session on public.swarm_messages (session_id, created_at asc);

alter table public.swarm_sessions enable row level security;
alter table public.swarm_messages enable row level security;

drop policy if exists swarm_sessions_own on public.swarm_sessions;
create policy swarm_sessions_own on public.swarm_sessions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists swarm_messages_own on public.swarm_messages;
create policy swarm_messages_own on public.swarm_messages
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.swarm_sessions from anon, authenticated;
revoke all on public.swarm_messages from anon, authenticated;
grant select, insert, update on public.swarm_sessions to authenticated;
grant select, insert on public.swarm_messages to authenticated;
