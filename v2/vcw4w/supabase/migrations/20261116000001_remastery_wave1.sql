-- ============================================================================
-- 4WEIRD REMASTERY WAVE-1 SQL SCHEMA MIGRATION, PART 2: COMMS SLICE (R7)
-- Source: v2/vcw4w/public/swarm/remastery/README.md section 2 (Wave-1 slice)
--
-- Wave-1 scope ONLY (this file):
--   * notifications
--   * chat_threads + chat_participants + chat_messages
--   * RLS enable + README section 2 policies for the above tables
--   * Wave-1 performance indexes for the above tables
--
-- Companion file 20261116000000_remastery_wave1.sql (concurrent lane) holds
-- the other Wave-1 tables (squad_projects, squad_project_members,
-- kanban_boards, kanban_cycles, kanban_columns, kanban_cards,
-- time_projects, time_entries, invoice_clients, invoices,
-- invoice_line_items). This file deliberately repeats NONE of those.
--
-- Explicitly SCOPED OUT (later waves — do NOT add here):
--   * dps_nodes / dps_tasks (P2P compute, Wave 2)
--   * community_mods / community_themes (Wave 3 creative suite)
--   * coin/ledger content (economy lane owns coin/economy/ledger/crown/vault
--     migrations; coordination note filed in QUEUE.md)
--
-- Fully rerunnable: CREATE TABLE / CREATE INDEX carry IF NOT EXISTS, every
-- CREATE POLICY is preceded by its DROP POLICY IF EXISTS guard, so the file
-- stays safe to re-push against dashboard-built databases.
-- Depends on: auth.users (shipped). No squad/team references in this slice.
-- Append-only: never edit a shipped migration, including the companion file.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. NOTIFICATION ENGINE & DIRECT CHAT (From GiveGigs, README section 2)
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  category varchar(30) not null, -- 'squad', 'game', 'chat', 'compute', 'system'
  title text not null,
  message text not null,
  action_url text,
  metadata jsonb default '{}',
  is_read boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete cascade,
  title text,
  is_group boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.chat_participants (
  thread_id uuid references public.chat_threads(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  last_read_at timestamptz default now(),
  primary key (thread_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.chat_threads(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete cascade,
  content text not null,
  attachments jsonb default '[]',
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (Wave-1 comms tables only, README section 2)
-- ----------------------------------------------------------------------------
alter table public.notifications enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;

-- Notifications RLS (owner-only read/update)
drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update using (auth.uid() = user_id);

-- Chat RLS (participant-gated read, sender-gated insert)
drop policy if exists chat_threads_read on public.chat_threads;
create policy chat_threads_read on public.chat_threads for select using (
  exists (select 1 from public.chat_participants where thread_id = chat_threads.id and user_id = auth.uid())
);

drop policy if exists chat_messages_read on public.chat_messages;
create policy chat_messages_read on public.chat_messages for select using (
  exists (select 1 from public.chat_participants where thread_id = chat_messages.thread_id and user_id = auth.uid())
);

drop policy if exists chat_messages_insert on public.chat_messages;
create policy chat_messages_insert on public.chat_messages for insert with check (
  auth.uid() = sender_user_id and exists (select 1 from public.chat_participants where thread_id = chat_messages.thread_id and user_id = auth.uid())
);

-- ----------------------------------------------------------------------------
-- 3. PERFORMANCE INDEXES (Wave-1 comms tables only, README section 2)
-- ----------------------------------------------------------------------------
create index if not exists idx_notifications_unread on public.notifications (user_id, is_read, created_at desc);
create index if not exists idx_chat_messages_time on public.chat_messages (thread_id, created_at asc);
