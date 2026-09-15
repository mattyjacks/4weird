-- ============================================================================
-- Feedback identity model: Tracked vs Anonymous vs Guest (plan §2).
-- Adds identity + contact + source columns to public.feedback_reports.
-- Fully rerunnable: ADD COLUMN IF NOT EXISTS + constraint guards.
--
-- Model:
--  * visibility 'tracked'   — signed-in, user_id set server-side from the
--    session (client ids ignored; 401 when the session is missing/expired).
--  * visibility 'anonymous' — signed-in or not, user_id stored NULL
--    (is_anonymous semantics; no link back to the account).
--  * visibility 'guest'     — no session needed, optional contact_name /
--    contact_email for follow-up only (admins only, never public).
--  * source 'dialog'|'page'|'bot-api' records where the report came from.
--  * reporter_type human|bot stays orthogonal (who wrote it vs who they are).
-- ============================================================================

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

-- Backfill guard: defaults above cover new rows; ensure legacy rows (written
-- before this migration) carry the defaults instead of NULLs.
update public.feedback_reports set visibility = 'tracked' where visibility is null;
update public.feedback_reports set source = 'dialog' where source is null;

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

create index if not exists idx_feedback_reports_user_id
  on public.feedback_reports (user_id);

create index if not exists idx_feedback_reports_visibility_created
  on public.feedback_reports (visibility, created_at desc);
