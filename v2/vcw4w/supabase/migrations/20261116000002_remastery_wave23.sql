-- ============================================================================
-- 4WEIRD REMASTERY WAVE-2+3 SQL SCHEMA MIGRATION (DS-REMASTER-W23-INFRA, R14)
-- Source: v2/vcw4w/public/swarm/remastery/README.md section 2 (Wave-2+3 slice)
--
-- Wave-2+3 scope ONLY (this file):
--   * dps_nodes + dps_tasks (P2P compute, Wave 2)
--   * community_mods + community_themes (creative suite, Wave 3)
--   * RLS enable for the above four tables (README section 2 lists enables
--     only for these tables — no policies ship for them there)
--   * idx_dps_nodes_active (the README section 2 index for these tables)
--
-- Companion Wave-1 files 20261116000000_remastery_wave1.sql (squad/kanban/
-- time/invoice slice) + 20261116000001_remastery_wave1.sql (comms slice)
-- hold the other 15 tables. This file deliberately repeats NONE of those.
--
-- Explicitly SCOPED OUT (do NOT add here):
--   * Wave-1 tables (notifications/chat/kanban/time/invoice/squad_projects)
--   * vibe_coins_earned on dps_nodes: README section 2 DDL carries this
--     column, but QUEUE.md assigns coin-ledger content (vibe_coins_earned,
--     75/25 splits, 100-coin=$1 parity) to the economy lane — omitted here
--     so remastery files carry no ledger hooks. dps_tasks.vibe_coins_cost
--     (per-task quoted cost, default 50) ships verbatim: inert pricing data,
--     no ledger writes. Coordination note filed in QUEUE.md.
--   * Team scoping: these four tables reference only auth.users (+ dps_tasks
--     self-references dps_nodes). No squad/team FKs added; if team scoping is
--     wanted later it must use public.teams / public.team_members(team_id)
--     (squads ARE teams — never the ghost squads/squad_members tables, which exist
--     nowhere in this repo). QUEUE note filed.
--
-- Fully rerunnable: CREATE TABLE / CREATE INDEX carry IF NOT EXISTS, so the
-- file stays safe to re-push against dashboard-built databases.
-- Depends on: auth.users (shipped). No squad/team references in this slice.
-- Append-only: never edit a shipped migration, including the companion files.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. P2P COMPUTE NODES & TASKS (Wave 2, README section 2 verbatim except the
--    economy-owned vibe_coins_earned column — see header + QUEUE.md)
-- ----------------------------------------------------------------------------
create table if not exists public.dps_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  peer_id text unique not null,
  cpu_cores integer not null default 4,
  device_memory_gb numeric(5, 2) default 8.0,
  gpu_renderer text,
  is_webgpu_supported boolean default false,
  cpu_share_percent integer default 80,
  gpu_share_percent integer default 90,
  status varchar(20) default 'offline', -- 'online', 'busy', 'offline'
  total_seconds_donated bigint default 0,
  -- vibe_coins_earned intentionally omitted: economy-lane owned (QUEUE.md)
  last_heartbeat timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists public.dps_tasks (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid references auth.users(id) on delete cascade,
  assigned_node_id uuid references public.dps_nodes(id) on delete set null,
  task_type varchar(50) not null, -- 'blender_render', 'video_transcode', 'ai_embedding', 'game_bundle'
  payload_json jsonb not null,
  result_json jsonb,
  status varchar(20) default 'pending', -- 'pending', 'processing', 'completed', 'failed'
  vibe_coins_cost integer not null default 50,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- ----------------------------------------------------------------------------
-- 2. COMMUNITY MODS & THEMES (Wave 3, README section 2 verbatim)
-- ----------------------------------------------------------------------------
create table if not exists public.community_mods (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  slug text unique not null,
  description text,
  version text default '1.0.0',
  target_game text not null, -- 'gravegain3d', 'gravegain2d', 'global'
  manifest_json jsonb not null,
  script_url text not null,
  is_verified boolean default false,
  downloads_count integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.community_themes (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  slug text unique not null,
  css_tokens jsonb not null,
  is_public boolean default true,
  likes_count integer default 0,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (Wave-2+3 tables only, README section 2)
-- ----------------------------------------------------------------------------
alter table public.dps_nodes enable row level security;
alter table public.dps_tasks enable row level security;
alter table public.community_mods enable row level security;
alter table public.community_themes enable row level security;

-- ----------------------------------------------------------------------------
-- 4. PERFORMANCE INDEXES (Wave-2+3 tables only, README section 2)
-- ----------------------------------------------------------------------------
create index if not exists idx_dps_nodes_active on public.dps_nodes (status, last_heartbeat desc);