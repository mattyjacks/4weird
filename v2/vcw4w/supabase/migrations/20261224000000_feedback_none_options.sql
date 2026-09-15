-- ============================================================================
-- Feedback "none" rating/critique options: allow 'none' alongside the
-- existing values in public.feedback_reports.rating / .critique, and move
-- both column defaults to 'none' so unopinionated reports land as none/none.
-- Base file 20261120000000_feedback.sql ships
--   rating default 'okay' check (rating in ('good', 'okay', 'bad'))
--   critique default 'negative' check (critique in ('positive', 'negative'))
-- widened to 3-value critique by 20261217000000_feedback_neutral_critique.sql
-- (and the 20261218000000 repair). Drop both auto-named constraints when
-- present and recreate with the 4-value sets. Fully rerunnable,
-- append-only: never edits shipped migrations.
-- ============================================================================

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'feedback_reports_rating_check'
  ) then
    alter table public.feedback_reports drop constraint feedback_reports_rating_check;
  end if;
  alter table public.feedback_reports
    add constraint feedback_reports_rating_check
    check (rating in ('good', 'okay', 'bad', 'none'));
exception when undefined_table then
  -- Base table not provisioned yet: nothing to constrain.
  null;
end $$;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'feedback_reports_critique_check'
  ) then
    alter table public.feedback_reports drop constraint feedback_reports_critique_check;
  end if;
  alter table public.feedback_reports
    add constraint feedback_reports_critique_check
    check (critique in ('positive', 'neutral', 'negative', 'none'));
exception when undefined_table then
  -- Base table not provisioned yet: nothing to constrain.
  null;
end $$;

do $$
begin
  alter table public.feedback_reports alter column rating set default 'none';
exception when undefined_table then
  null;
end $$;

do $$
begin
  alter table public.feedback_reports alter column critique set default 'none';
exception when undefined_table then
  null;
end $$;
