-- ============================================================================
-- 4WEIRD REMASTERY WAVE-1 SQL SCHEMA MIGRATION (DS-REM-07, lane rem-infra)
-- Source: v2/vcw4w/public/swarm/remastery/README.md section 2 (Wave-1 slice)
--
-- Wave-1 scope ONLY:
--   * squad_projects + squad_project_members
--   * kanban_boards / kanban_cycles / kanban_columns / kanban_cards
--   * time_projects + time_entries
--   * invoice_clients + invoices (with deleted_at 30-day soft-delete) +
--     invoice_line_items
--   * RLS enable + owner/squad-member policies for the above tables
--   * Wave-1 performance indexes
--
-- Explicitly SCOPED OUT (later waves — do NOT add here):
--   * dps_nodes / dps_tasks (P2P compute, Wave 2)
--   * notifications / chat_threads / chat_participants / chat_messages (Wave 1
--     comms slice owned by a later lane — coordinated via QUEUE.md)
--   * community_mods / community_themes (Wave 3 creative suite)
--   * coin-ledger content (economy lane owns coin/economy/ledger/crown/vault
--     migrations; coordination note filed in QUEUE.md)
--
-- Fully rerunnable: CREATE TABLE / CREATE INDEX carry IF NOT EXISTS, every
-- CREATE POLICY is preceded by its DROP POLICY IF EXISTS guard, so the file
-- stays safe to re-push against dashboard-built databases.
-- Depends on: public.teams (+ public.team_members) and auth.users, which
-- are created by earlier shipped migrations and are NOT redefined here
-- (append-only: never edit a shipped migration).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SQUAD PROJECTS & INTERNAL TASKS (Safe Team Collaboration)
-- ----------------------------------------------------------------------------
create table if not exists public.squad_projects (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references public.teams(id) on delete cascade,
  name varchar(200) not null,
  description text,
  repository_url text,
  target_game_slug varchar(100),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.squad_project_members (
  project_id uuid references public.squad_projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role varchar(50) default 'contributor' check (role in ('lead', 'contributor', 'reviewer')),
  created_at timestamptz default now(),
  primary key (project_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 2. SQUAD KANBAN & SPRINT SYSTEM (From GiveGigs)
-- ----------------------------------------------------------------------------
create table if not exists public.kanban_boards (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid references public.teams(id) on delete cascade,
  project_id uuid references public.squad_projects(id) on delete set null,
  owner_user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.kanban_cycles (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references public.kanban_boards(id) on delete cascade,
  title varchar(200) not null,
  start_date date not null,
  end_date date not null,
  progress_percentage integer default 0 check (progress_percentage between 0 and 100),
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.kanban_columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references public.kanban_boards(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.kanban_cards (
  id uuid primary key default gen_random_uuid(),
  column_id uuid references public.kanban_columns(id) on delete cascade,
  board_id uuid references public.kanban_boards(id) on delete cascade,
  cycle_id uuid references public.kanban_cycles(id) on delete set null,
  title text not null,
  description text,
  priority varchar(20) default 'medium', -- 'low', 'medium', 'high', 'urgent'
  estimate_hours numeric(5, 2) default 0,
  due_date date,
  labels text[] default '{}',
  assigned_user_id uuid references auth.users(id) on delete set null,
  position integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 3. TIME TRACKING & B2B INVOICE SYSTEM (Ghost Timer Overhaul)
-- ----------------------------------------------------------------------------
create table if not exists public.time_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  squad_id uuid references public.teams(id) on delete set null,
  name varchar(200) not null,
  color_hex varchar(20) default '#3b82f6',
  hourly_rate numeric(10, 2) default 0.00,
  budget_hours numeric(10, 2),
  is_billable boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.time_projects(id) on delete set null,
  card_id uuid references public.kanban_cards(id) on delete set null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz,
  duration_seconds integer default 0,
  is_billable boolean default true,
  is_invoiced boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.invoice_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name varchar(255) not null,
  email varchar(255),
  address text,
  phone varchar(50),
  vat_number varchar(100),
  created_at timestamptz default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  client_id uuid references public.invoice_clients(id) on delete restrict,
  invoice_number varchar(100) not null,
  issue_date date not null default current_date,
  due_date date not null,
  currency varchar(10) default 'USD',
  tax_rate numeric(5, 2) default 0.00,
  subtotal numeric(12, 2) default 0.00,
  tax_amount numeric(12, 2) default 0.00,
  total_amount numeric(12, 2) default 0.00,
  status varchar(50) default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  notes text,
  sender_company_name varchar(255),
  sender_company_address text,
  sender_logo_url text,
  deleted_at timestamptz, -- 30-Day Soft-Delete Trash Bin
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10, 2) not null default 1.00,
  unit_rate numeric(10, 2) not null default 0.00,
  total numeric(12, 2) not null default 0.00,
  position integer default 0
);

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (Wave-1 tables only)
-- ----------------------------------------------------------------------------
alter table public.squad_projects enable row level security;
alter table public.squad_project_members enable row level security;
alter table public.kanban_boards enable row level security;
alter table public.kanban_cycles enable row level security;
alter table public.kanban_columns enable row level security;
alter table public.kanban_cards enable row level security;
alter table public.time_projects enable row level security;
alter table public.time_entries enable row level security;
alter table public.invoice_clients enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;

-- Squad & Kanban RLS (owner or squad-member access)
drop policy if exists squad_projects_read on public.squad_projects;
create policy squad_projects_read on public.squad_projects for select using (
  exists (select 1 from public.team_members where team_id = squad_projects.squad_id and user_id = auth.uid())
);

drop policy if exists squad_project_members_read on public.squad_project_members;
create policy squad_project_members_read on public.squad_project_members for select using (
  exists (
    select 1 from public.squad_projects
    join public.team_members on team_members.team_id = squad_projects.squad_id
    where squad_projects.id = squad_project_members.project_id and team_members.user_id = auth.uid()
  )
);

drop policy if exists kanban_boards_access on public.kanban_boards;
create policy kanban_boards_access on public.kanban_boards for all using (
  auth.uid() = owner_user_id or exists (select 1 from public.team_members where team_id = kanban_boards.squad_id and user_id = auth.uid())
);

drop policy if exists kanban_cycles_access on public.kanban_cycles;
create policy kanban_cycles_access on public.kanban_cycles for all using (
  exists (select 1 from public.kanban_boards where id = kanban_cycles.board_id and (owner_user_id = auth.uid() or exists (select 1 from public.team_members where team_id = kanban_boards.squad_id and user_id = auth.uid())))
);

drop policy if exists kanban_columns_access on public.kanban_columns;
create policy kanban_columns_access on public.kanban_columns for all using (
  exists (select 1 from public.kanban_boards where id = kanban_columns.board_id and (owner_user_id = auth.uid() or exists (select 1 from public.team_members where team_id = kanban_boards.squad_id and user_id = auth.uid())))
);

drop policy if exists kanban_cards_access on public.kanban_cards;
create policy kanban_cards_access on public.kanban_cards for all using (
  exists (select 1 from public.kanban_boards where id = kanban_cards.board_id and (owner_user_id = auth.uid() or exists (select 1 from public.team_members where team_id = kanban_boards.squad_id and user_id = auth.uid())))
);

-- Time & Invoice RLS (owner-only)
drop policy if exists time_projects_own on public.time_projects;
create policy time_projects_own on public.time_projects for all using (auth.uid() = user_id);

drop policy if exists time_entries_own on public.time_entries;
create policy time_entries_own on public.time_entries for all using (auth.uid() = user_id);

drop policy if exists invoices_own on public.invoices;
create policy invoices_own on public.invoices for all using (auth.uid() = user_id);

drop policy if exists invoice_clients_own on public.invoice_clients;
create policy invoice_clients_own on public.invoice_clients for all using (auth.uid() = user_id);

drop policy if exists invoice_items_own on public.invoice_line_items;
create policy invoice_items_own on public.invoice_line_items for all using (
  exists (select 1 from public.invoices where id = invoice_line_items.invoice_id and user_id = auth.uid())
);

-- ----------------------------------------------------------------------------
-- 5. PERFORMANCE INDEXES (Wave-1 tables only)
-- ----------------------------------------------------------------------------
create index if not exists idx_invoices_user_deleted on public.invoices (user_id, deleted_at);
create index if not exists idx_time_entries_user_proj on public.time_entries (user_id, project_id, start_time desc);
create index if not exists idx_kanban_cards_pos on public.kanban_cards (column_id, position);
