-- ============================================================================
-- Feedback screenshot metadata (plan §4): mime + dimensions for the
-- PNG/JPEG/WebP screenshots accepted by POST /api/feedback.
--
-- Adds screenshot_mime (content type sniffed from magic bytes, never the
-- client-sent MIME), screenshot_width / screenshot_height (parsed
-- dependency-free from PNG IHDR / JPEG SOF / WebP chunks, NULL when
-- unparseable). screenshot_mime may already exist via
-- 20261213000000_feedback_annotations_ai.sql — every ADD COLUMN uses
-- IF NOT EXISTS so both orders converge. Fully rerunnable, append-only:
-- never edits shipped migrations.
-- Bytes keep living in the `feedback-screenshots` bucket under
-- feedback/YYYY-MM/<id>.<ext>; only metadata lands in these columns.
-- ============================================================================

alter table public.feedback_reports
  add column if not exists screenshot_mime text null;

alter table public.feedback_reports
  add column if not exists screenshot_width integer null;

alter table public.feedback_reports
  add column if not exists screenshot_height integer null;
