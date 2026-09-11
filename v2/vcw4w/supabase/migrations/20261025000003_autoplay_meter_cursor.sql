-- ============================================================================
-- Autoplay coin metering cursor.
--
-- POST /api/vcw/autoplay bills worker-minutes via meter_vcw_usage, but only
-- whole elapsed minutes since the last successful debit may be charged, so
-- the heartbeat needs a cursor. last_metered_at starts NULL (first debit
-- bills from created_at) and advances only on a successful meter call, so a
-- failed debit is retried on the next heartbeat instead of skipped.
-- Fully rerunnable: ADD COLUMN IF NOT EXISTS (repo rule).
-- ============================================================================

alter table if exists public.vcw_autoplay_remotes
  add column if not exists last_metered_at timestamptz null;
