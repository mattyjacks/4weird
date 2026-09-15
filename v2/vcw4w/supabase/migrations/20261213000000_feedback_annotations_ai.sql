-- ============================================================================
-- Feedback identity + annotations + AI assist columns (FBOV slice DS-FBOV-07).
-- Extends public.feedback_reports (base: 20261120000000_feedback.sql) with
-- identity/contact/source, annotation + screenshot metadata, AI-assist output
-- columns, plus append-only feedback_events and feedback_ai_logs tables.
-- Fully rerunnable: ADD COLUMN IF NOT EXISTS / CREATE ... IF NOT EXISTS /
-- constraint-in-DO-block guards. Append-only: never edits shipped migrations.
--
-- Ordering note: sibling working file 20261212000000_feedback_identity.sql
-- (untracked, fellow lane) adds a subset (user_id, visibility default
-- 'tracked', contact_*, source default 'dialog', user/visibility indexes).
-- This file converges rather than fights it:
--  * every shared ADD COLUMN uses IF NOT EXISTS (no-op if sibling landed);
--  * check constraints are dropped + recreated to the same value sets;
--  * the visibility/created index reuses the sibling's index name;
--  * this file sets column DEFAULTs only on ADD (when it creates the
--    column). It never ALTERs an existing default, so whichever file lands
--    first owns the default; the check sets are identical either way.
-- Spec default for visibility is 'tracked' (matches
-- 20261212000000_feedback_identity.sql + the 20261216 convergence file,
-- which also repairs the default if this file ever lands first).
-- ============================================================================

-- -- Identity / contact / source -------------------------------------------
alter table public.feedback_reports
  add column if not exists user_id uuid null;

alter table public.feedback_reports
  add column if not exists visibility text not null default 'tracked';

alter table public.feedback_reports
  add column if not exists contact_name text null;

alter table public.feedback_reports
  add column if not exists contact_email text null;

alter table public.feedback_reports
  add column if not exists source text not null default 'dialog';

-- -- Annotations / screenshot metadata --------------------------------------
alter table public.feedback_reports
  add column if not exists annotations jsonb not null default '[]'::jsonb;

alter table public.feedback_reports
  add column if not exists screenshot_mime text null;

-- -- AI-assist output ---------------------------------------------------------
alter table public.feedback_reports
  add column if not exists ai_summary text null;

alter table public.feedback_reports
  add column if not exists ai_category text null;

alter table public.feedback_reports
  add column if not exists ai_severity text null;

alter table public.feedback_reports
  add column if not exists ai_cluster text null;

alter table public.feedback_reports
  add column if not exists ai_processed_at timestamptz null;

-- -- Admin --------------------------------------------------------------------
alter table public.feedback_reports
  add column if not exists admin_note text null;

-- Backfill guard: defaults above cover new rows; ensure legacy rows (written
-- before these columns existed) carry the spec defaults instead of NULLs.
-- Only NULLs are touched — existing non-null values are never overwritten.
update public.feedback_reports set visibility = 'tracked' where visibility is null;
update public.feedback_reports set source = 'dialog' where source is null;
update public.feedback_reports set annotations = '[]'::jsonb where annotations is null;

-- Check constraints (dropped + recreated so reruns converge).
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'feedback_reports_visibility_check'
  ) then
    alter table public.feedback_reports drop constraint feedback_reports_visibility_check;
  end if;
  alter table public.feedback_reports
    add constraint feedback_reports_visibility_check
    check (visibility in ('tracked', 'anonymous', 'guest'));

  if exists (
    select 1 from pg_constraint where conname = 'feedback_reports_source_check'
  ) then
    alter table public.feedback_reports drop constraint feedback_reports_source_check;
  end if;
  alter table public.feedback_reports
    add constraint feedback_reports_source_check
    check (source in ('dialog', 'page', 'bot-api'));
end $$;

-- -- Events + AI logs ----------------------------------------------------------
-- feedback_events: append-only audit trail per report (status flips, admin
-- actions). feedback_ai_logs: one row per AI-assist pass over a report.
create table if not exists public.feedback_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.feedback_reports (id) on delete cascade,
  event text not null,
  actor text null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback_ai_logs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.feedback_reports (id) on delete cascade,
  model text null,
  prompt_kind text null,
  output jsonb not null default '{}'::jsonb,
  error text null,
  created_at timestamptz not null default now()
);

alter table public.feedback_events enable row level security;
alter table public.feedback_ai_logs enable row level security;

drop policy if exists feedback_events_service_write on public.feedback_events;
create policy feedback_events_service_write on public.feedback_events
  for all to service_role using (true) with check (true);

drop policy if exists feedback_events_admin_read on public.feedback_events;
create policy feedback_events_admin_read on public.feedback_events
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists feedback_ai_logs_service_write on public.feedback_ai_logs;
create policy feedback_ai_logs_service_write on public.feedback_ai_logs
  for all to service_role using (true) with check (true);

drop policy if exists feedback_ai_logs_admin_read on public.feedback_ai_logs;
create policy feedback_ai_logs_admin_read on public.feedback_ai_logs
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- -- Indexes -------------------------------------------------------------------
-- NOTE: idx_feedback_reports_status_created already ships in the base file;
-- it is intentionally not recreated here.
-- The visibility+created index reuses the sibling working file's index name
-- so both orders converge on one index.
create index if not exists idx_feedback_reports_visibility_created
  on public.feedback_reports (visibility, created_at desc);

create index if not exists idx_feedback_events_report_created
  on public.feedback_events (report_id, created_at desc);

create index if not exists idx_feedback_ai_logs_report_created
  on public.feedback_ai_logs (report_id, created_at desc);
