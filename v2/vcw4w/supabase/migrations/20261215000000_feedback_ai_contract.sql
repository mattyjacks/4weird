-- ============================================================================
-- Feedback AI enrichment contract convergence (FBOV-09, plan not overbuild).
-- The AI-output columns + feedback_ai_logs table first landed in
-- 20261213000000_feedback_annotations_ai.sql (report_id, model NULL,
-- prompt_kind, output, error). The enrich route + bot runner speak the
-- FBOV-09 contract (feedback_id, model, prompt_version, raw, cost), so this
-- file converges the table to that shape WITHOUT touching the shipped file:
--  * ai_* columns re-asserted with IF NOT EXISTS (no-op when already there);
--  * missing log columns added with IF NOT EXISTS (+ backfill from the
--    older column names so pre-contract rows stay queryable);
--  * one contract index, RLS policies left exactly as shipped.
-- Fully rerunnable: IF NOT EXISTS guards throughout. Append-only: never
-- edits shipped migrations.
-- ============================================================================

-- -- AI-output columns (FBOV-09 contract: nullable text + processed stamp) --
alter table public.feedback_reports
  add column if not exists ai_summary text;
alter table public.feedback_reports
  add column if not exists ai_category text;
alter table public.feedback_reports
  add column if not exists ai_severity text;
alter table public.feedback_reports
  add column if not exists ai_cluster text;
alter table public.feedback_reports
  add column if not exists ai_processed_at timestamptz;

-- -- feedback_ai_logs contract columns --------------------------------------
alter table public.feedback_ai_logs
  add column if not exists feedback_id uuid;
alter table public.feedback_ai_logs
  add column if not exists prompt_version text not null default '';
alter table public.feedback_ai_logs
  add column if not exists raw jsonb not null default '{}'::jsonb;
alter table public.feedback_ai_logs
  add column if not exists cost numeric;

-- Backfill: only NULL/empty targets are touched — existing values win.
update public.feedback_ai_logs
  set feedback_id = report_id
  where feedback_id is null and report_id is not null;
update public.feedback_ai_logs
  set raw = output
  where raw = '{}'::jsonb and output is not null and output <> '{}'::jsonb;

create index if not exists idx_feedback_ai_logs_feedback_created
  on public.feedback_ai_logs (feedback_id, created_at desc);
