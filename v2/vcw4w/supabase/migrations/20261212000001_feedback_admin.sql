-- ============================================================================
-- Feedback admin queue upgrades (plan §6 second half): admin notes plus an
-- append-only audit trail for status transitions.
--
--  * feedback_reports.admin_note (text, null): free-form admin note edited
--    from /feedback/admin; null means "no note yet".
--  * feedback_events: one row per status change (id, feedback_id, actor,
--    from_status, to_status, note, created_at). Append-only by design:
--    service_role writes, admins read, NOTHING EVER DELETED (no delete
--    policy, no delete trigger, no client write policies at all).
--
-- Access model mirrors 20261120000000_feedback.sql:
--  * Writes via service_role only (server actions / admin routes with the
--    service key bypass RLS; no anon/authenticated write policies exist).
--  * Reads: service_role plus authenticated admins carrying the `admin`
--    role in their JWT app_metadata. NO anon/public read.
--
-- Fully rerunnable: IF NOT EXISTS / DROP ... IF EXISTS guards.
-- ============================================================================

alter table public.feedback_reports
  add column if not exists admin_note text;

create table if not exists public.feedback_events (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null
    references public.feedback_reports (id) on delete cascade,
  actor text not null default '',
  from_status text
    check (from_status in ('unaddressed', 'addressing', 'addressed')),
  to_status text not null
    check (to_status in ('unaddressed', 'addressing', 'addressed')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_events_feedback_created
  on public.feedback_events (feedback_id, created_at desc);

alter table public.feedback_reports enable row level security;
alter table public.feedback_events enable row level security;

-- Service-role full access (server actions / admin routes; service_role
-- bypasses RLS anyway — this policy documents intent and covers setups
-- where bypass is disabled).
drop policy if exists feedback_events_service_write on public.feedback_events;
create policy feedback_events_service_write on public.feedback_events
  for all to service_role using (true) with check (true);

-- Admin read only: authenticated users whose JWT app_metadata carries
-- {"role": "admin"}. Everyone else (anon, non-admin) reads nothing.
drop policy if exists feedback_events_admin_read on public.feedback_events;
create policy feedback_events_admin_read on public.feedback_events
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- No insert/update/delete policies for anon/authenticated by design
-- (service_role writes only; audit rows are never updated or deleted).
-- No public/anon read policies by design.
