-- ============================================================================
-- VibeCodeWorker cloud run lifecycle (agent API persistence).
--
-- The v1 worker keeps runs/bugs in local JSON files on the operator's
-- machine. The v2 Next.js deploy is serverless, so the /api/vcw/* agent
-- API persists the same loop in Postgres instead:
--   runs      = one playtest run against a catalog game (launch -> state)
--   run_steps = the observe -> reason -> act loop (actions + observations)
--   bugs      = human-reviewable findings filed from a run (bugs)
--
-- Re-runnable: every statement is IF NOT EXISTS / OR REPLACE / DROP ... IF
-- EXISTS guarded. Run migrations in filename order.
-- ============================================================================

-- 1. Runs: one row per agent playtest run. Status is open until the agent
-- posts a summary via /api/vcw/runs/[id]/complete.
create table if not exists public.vcw_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_slug text not null check (game_slug ~ '^[a-z0-9-]{1,64}$'),
  goal text not null check (char_length(goal) between 1 and 500),
  status text not null default 'open' check (status in ('open', 'completed')),
  verdict text check (verdict in ('pass', 'fail', 'inconclusive')),
  summary text check (summary is null or char_length(summary) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_vcw_runs_owner on public.vcw_runs (user_id, created_at desc);
create index if not exists idx_vcw_runs_game on public.vcw_runs (game_slug, created_at desc);

-- 2. Steps: the agent's observe -> reason -> act trail for a run.
create table if not exists public.vcw_run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.vcw_runs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('observation', 'action', 'finding')),
  text text not null check (char_length(text) between 1 and 5000),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_vcw_run_steps_run on public.vcw_run_steps (run_id, created_at asc);

-- 3. Bugs: findings promoted to human-reviewable reports.
create table if not exists public.vcw_bugs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  run_id uuid references public.vcw_runs(id) on delete set null,
  game_slug text not null check (game_slug ~ '^[a-z0-9-]{1,64}$'),
  title text not null check (char_length(title) between 1 and 200),
  description text not null check (char_length(description) between 1 and 10000),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  created_at timestamptz not null default now()
);
create index if not exists idx_vcw_bugs_owner on public.vcw_bugs (user_id, created_at desc);
create index if not exists idx_vcw_bugs_run on public.vcw_bugs (run_id, created_at desc);

-- 4. updated_at maintenance for runs.
create or replace function public.vcw_runs_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists vcw_runs_touch on public.vcw_runs;
create trigger vcw_runs_touch
  before update on public.vcw_runs
  for each row execute function public.vcw_runs_touch_updated_at();

-- 5. RLS: owner-only reads/writes (service_role bypasses for server jobs).
alter table public.vcw_runs enable row level security;
alter table public.vcw_run_steps enable row level security;
alter table public.vcw_bugs enable row level security;

drop policy if exists vcw_runs_owner_all on public.vcw_runs;
create policy vcw_runs_owner_all on public.vcw_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists vcw_run_steps_owner_all on public.vcw_run_steps;
create policy vcw_run_steps_owner_all on public.vcw_run_steps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists vcw_bugs_owner_all on public.vcw_bugs;
create policy vcw_bugs_owner_all on public.vcw_bugs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
