-- ============================================================================
-- Feedback store repair (FIXFB prod-503 slice DS-FIXFB-02).
--
-- The migration chain drifted: feedback_events shipped in two shapes
-- (20261212000001: feedback_id/actor/from_status/to_status/note vs
-- 20261213000000: report_id/event/actor/meta), feedback_ai_logs shipped in
-- two shapes (FBOV-09 contract: feedback_id/prompt_version/raw/cost vs
-- legacy: report_id/prompt_kind/output/error via model/output/error), the
-- critique check missed 'neutral', and the `feedback-screenshots` bucket
-- may never have been created — so prod POST /api/feedback 503s on a
-- missing column / missing bucket.
--
-- Column authority (read, never edited):
--   20261120000000_feedback.sql (base table + critique/rating/status checks)
--   20261212000000_feedback_identity.sql (user_id, visibility default
--     'tracked', contact_name/email, source default 'dialog')
--   20261212000001_feedback_admin.sql (admin_note, feedback_events shape A)
--   20261213000000_feedback_annotations_ai.sql (annotations default [],
--     screenshot_mime, ai_* + ai_processed_at, feedback_events shape B,
--     feedback_ai_logs legacy shape + dual-shape guards)
--   20261214000000_feedback_screenshot_dims.sql (screenshot_mime/width/height)
--   20261215000000_feedback_ai_contract.sql (ai_logs contract columns +
--     backfill)
--   20261216000000_feedback_converge.sql (events superset + backfill both
--     ways + visibility default repair)
--   20261217000000_feedback_neutral_critique.sql (critique 3-value check)
-- Route authority: app/api/feedback/route.ts insert payload (§815-844) +
--   app/api/feedback/[id]/enrich/route.ts ai_logs payload (§300-310, both
--   report_id + feedback_id, model, prompt_version, raw, output, cost).
--
-- This file converges everything idempotently: ADD COLUMN IF NOT EXISTS for
-- every column the route inserts, BOTH id shapes + backfill both ways on
-- both log tables, critique check recreated with (positive,neutral,
-- negative), bucket insert ON CONFLICT DO NOTHING + service_role storage
-- policy, and both index pairs. Fully rerunnable, append-only: never edits
-- shipped migrations.
-- ============================================================================

-- -- 1. feedback_reports: every column the route inserts --------------------
-- Identity / contact / source (defaults are the spec values; the SET DEFAULT
-- repairs below cover whichever sibling file created the column first).
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

-- Annotations / screenshot metadata.
alter table public.feedback_reports
  add column if not exists annotations jsonb not null default '[]'::jsonb;

alter table public.feedback_reports
  add column if not exists screenshot_mime text null;

alter table public.feedback_reports
  add column if not exists screenshot_width integer null;

alter table public.feedback_reports
  add column if not exists screenshot_height integer null;

-- AI-assist output (FBOV-09 contract: nullable + processed stamp).
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

-- Admin note (DS-FEEDBACK-07 / admin queue).
alter table public.feedback_reports
  add column if not exists admin_note text null;

-- Default repair: whichever file created the column first owns its DEFAULT;
-- force the canonical defaults regardless of order. Rerunnable by design
-- (SET DEFAULT is idempotent); wrapped so a missing table/column no-ops.
do $$
begin
  alter table public.feedback_reports
    alter column visibility set default 'tracked';
  alter table public.feedback_reports
    alter column source set default 'dialog';
  alter table public.feedback_reports
    alter column annotations set default '[]'::jsonb;
exception when others then
  -- Base table/columns not provisioned yet: nothing to fix.
  null;
end $$;

-- Backfill guard: only NULLs are touched — existing values never overwritten.
update public.feedback_reports set visibility = 'tracked' where visibility is null;
update public.feedback_reports set source = 'dialog' where source is null;
update public.feedback_reports set annotations = '[]'::jsonb where annotations is null;

-- -- 2. feedback_events: BOTH id shapes + full column superset ----------------
-- Shape A (20261212000001): feedback_id, actor, from_status, to_status, note.
-- Shape B (20261213000000): report_id, event, actor, meta.
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

-- -- 3. feedback_ai_logs: BOTH shapes -----------------------------------------
-- Contract shape (FBOV-09 / enrich route): feedback_id, model, prompt_version,
-- raw, cost. Legacy shape (20261213000000): report_id, model, prompt_kind,
-- output, error. model already ships in the legacy create; re-asserted here.
alter table public.feedback_ai_logs
  add column if not exists feedback_id uuid;
alter table public.feedback_ai_logs
  add column if not exists report_id uuid;
alter table public.feedback_ai_logs
  add column if not exists model text;
alter table public.feedback_ai_logs
  add column if not exists prompt_version text not null default '';
alter table public.feedback_ai_logs
  add column if not exists raw jsonb not null default '{}'::jsonb;
alter table public.feedback_ai_logs
  add column if not exists cost numeric;
alter table public.feedback_ai_logs
  add column if not exists prompt_kind text;
alter table public.feedback_ai_logs
  add column if not exists output jsonb;
alter table public.feedback_ai_logs
  add column if not exists error text;

-- Backfill both ways (only NULL/empty targets touched — existing values win).
update public.feedback_ai_logs
  set feedback_id = report_id
  where feedback_id is null and report_id is not null;
update public.feedback_ai_logs
  set report_id = feedback_id
  where report_id is null and feedback_id is not null;
update public.feedback_ai_logs
  set raw = output
  where raw = '{}'::jsonb and output is not null and output <> '{}'::jsonb;
update public.feedback_ai_logs
  set output = raw
  where output is null and raw is not null and raw <> '{}'::jsonb;

-- -- 4. critique check recreated with neutral ----------------------------------
-- Base ships check (critique in ('positive','negative')) under the auto name
-- feedback_reports_critique_check; 20261217000000 already widens it, but a
-- chain that skipped that file still 500s/503s on 'neutral' critiques — drop
-- + recreate so every order converges on the 3-value set.
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

-- -- 5. storage bucket (private) + service_role policy --------------------------
-- The route uploads to `feedback-screenshots` with the service key; when the
-- bucket was never created the upload fails "bucket not found" and the
-- submit 503s. Private bucket (public false): reads go through signed URLs
-- in [id]/screenshot + enrich, never public.
do $$
begin
  insert into storage.buckets (id, name, public)
  values ('feedback-screenshots', 'feedback-screenshots', false)
  on conflict (id) do nothing;
exception when undefined_table then
  -- storage schema not provisioned (non-Supabase target): nothing to seed.
  null;
end $$;

drop policy if exists feedback_screenshots_service_write on storage.objects;
create policy feedback_screenshots_service_write on storage.objects
  for all to service_role
  using (bucket_id = 'feedback-screenshots')
  with check (bucket_id = 'feedback-screenshots');

-- -- 6. both index pairs ---------------------------------------------------------
create index if not exists idx_feedback_events_feedback_created
  on public.feedback_events (feedback_id, created_at desc);

create index if not exists idx_feedback_events_report_created
  on public.feedback_events (report_id, created_at desc);

create index if not exists idx_feedback_ai_logs_feedback_created
  on public.feedback_ai_logs (feedback_id, created_at desc);

create index if not exists idx_feedback_ai_logs_report_created
  on public.feedback_ai_logs (report_id, created_at desc);
