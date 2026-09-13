-- ============================================================================
-- Feedback reports: durable append-only store for dev feedback (human + bot).
-- One row per report; updates only flip `status` (unaddressed → addressing →
-- addressed). Fully rerunnable: IF NOT EXISTS / DROP ... IF EXISTS guards.
--
-- Access model:
--  * Writes (insert/update/delete) via service_role only (server routes with
--    the service key bypass RLS; no client write policies exist, so anon and
--    authenticated browser keys can never forge, edit, or erase rows).
--  * Reads: service_role (bypasses RLS) plus authenticated admins carrying
--    the `admin` role in their JWT app_metadata. NO anon/public read.
-- ============================================================================

create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_type text not null default 'human'
    check (reporter_type in ('human', 'bot')),
  rating text not null default 'okay'
    check (rating in ('good', 'okay', 'bad')),
  critique text not null default 'negative'
    check (critique in ('positive', 'negative')),
  text_body text not null default '',
  labels jsonb not null default '{}'::jsonb,
  bot_extras jsonb not null default '{}'::jsonb,
  screenshot_path text,
  page_url text,
  user_agent text,
  status text not null default 'unaddressed'
    check (status in ('unaddressed', 'addressing', 'addressed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_reports_status_created
  on public.feedback_reports (status, created_at desc);

alter table public.feedback_reports enable row level security;

-- Service-role full access (server routes; service_role bypasses RLS anyway,
-- this policy documents intent and covers setups where bypass is disabled).
drop policy if exists feedback_reports_service_write on public.feedback_reports;
create policy feedback_reports_service_write on public.feedback_reports
  for all to service_role using (true) with check (true);

-- Admin read only: authenticated users whose JWT app_metadata carries
-- {"role": "admin"}. Everyone else (anon, non-admin) reads nothing.
drop policy if exists feedback_reports_admin_read on public.feedback_reports;
create policy feedback_reports_admin_read on public.feedback_reports
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- No insert/update/delete policies for anon/authenticated by design
-- (service_role writes only). No public/anon read policies by design.
