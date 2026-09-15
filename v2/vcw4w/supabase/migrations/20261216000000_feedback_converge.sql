-- ============================================================================
-- Feedback convergence (fixes the FBOV parallel-lane drift):
--
-- 1. feedback_events dual shape: 20261212000001_feedback_admin.sql creates
--    (feedback_id, actor, from_status, to_status, note) while
--    20261213000000_feedback_annotations_ai.sql creates
--    (report_id, event, actor, meta). Both use CREATE TABLE IF NOT EXISTS,
--    so whichever lands first wins and the other silently no-ops — leaving
--    code written against the losing shape broken. This file adds BOTH
--    column sets with IF NOT EXISTS + backfills report_id <-> feedback_id,
--    so either order (or both) converges to one superset table.
--
-- 2. visibility default: canonical is 'tracked' (plan §2 + route's
--    session-aware default). Repairs the column default if an older file
--    ever created it with a different one.
--
-- Fully rerunnable: IF NOT EXISTS / DO-block guards throughout.
-- Append-only: never edits shipped migrations.
-- ============================================================================

-- -- 1. feedback_events superset -------------------------------------------
alter table public.feedback_events
  add column if not exists feedback_id uuid;
alter table public.feedback_events
  add column if not exists report_id uuid;
alter table public.feedback_events
  add column if not exists event text;
alter table public.feedback_events
  add column if not exists actor text;
alter table public.feedback_events
  add column if not exists from_status text;
alter table public.feedback_events
  add column if not exists to_status text;
alter table public.feedback_events
  add column if not exists note text;
alter table public.feedback_events
  add column if not exists meta jsonb not null default '{}'::jsonb;

-- Backfill the id link both ways (only NULL targets touched).
update public.feedback_events
  set feedback_id = report_id
  where feedback_id is null and report_id is not null;
update public.feedback_events
  set report_id = feedback_id
  where report_id is null and feedback_id is not null;

-- Status value guards (dropped + recreated so reruns converge).
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'feedback_events_status_check'
  ) then
    alter table public.feedback_events drop constraint feedback_events_status_check;
  end if;
  if exists (
    select 1 from pg_constraint where conname = 'feedback_events_from_check'
  ) then
    alter table public.feedback_events drop constraint feedback_events_from_check;
  end if;
  if exists (
    select 1 from pg_constraint where conname = 'feedback_events_to_check'
  ) then
    alter table public.feedback_events drop constraint feedback_events_to_check;
  end if;
  alter table public.feedback_events
    add constraint feedback_events_from_check
    check (from_status is null or from_status in ('unaddressed', 'addressing', 'addressed'));
  alter table public.feedback_events
    add constraint feedback_events_to_check
    check (to_status is null or to_status in ('unaddressed', 'addressing', 'addressed'));
end $$;

create index if not exists idx_feedback_events_feedback_created
  on public.feedback_events (feedback_id, created_at desc);
create index if not exists idx_feedback_events_report_created
  on public.feedback_events (report_id, created_at desc);

-- -- 2. visibility default repair -------------------------------------------
-- Whichever file created the column first owns its DEFAULT; force the
-- canonical 'tracked' default regardless of order.
do $$
begin
  alter table public.feedback_reports
    alter column visibility set default 'tracked';
exception when others then
  -- Table/column not present (base migration not applied): nothing to fix.
  null;
end $$;
