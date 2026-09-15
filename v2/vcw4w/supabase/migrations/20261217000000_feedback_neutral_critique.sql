-- ============================================================================
-- Feedback neutral critique tone: allow 'neutral' alongside 'positive' /
-- 'negative' in public.feedback_reports.critique.
-- Base file 20261120000000_feedback.sql ships
--   check (critique in ('positive', 'negative'))
-- with an auto-named constraint (feedback_reports_critique_check). Drop it
-- when present and recreate with the 3-value set. Fully rerunnable,
-- append-only: never edits shipped migrations.
-- ============================================================================

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'feedback_reports_critique_check'
  ) then
    alter table public.feedback_reports drop constraint feedback_reports_critique_check;
  end if;
  alter table public.feedback_reports
    add constraint feedback_reports_critique_check
    check (critique in ('positive', 'neutral', 'negative'));
exception when undefined_table then
  -- Base table not provisioned yet: nothing to constrain.
  null;
end $$;
