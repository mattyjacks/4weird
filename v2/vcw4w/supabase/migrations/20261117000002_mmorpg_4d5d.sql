-- ============================================================================
-- 4WEIRD MMORPG SERVERS — 4D/5D GAME VALUES (infra lane, append-only)
-- File: supabase/migrations/20261117000002_mmorpg_4d5d.sql
--
-- Slot: 20261117000002 is the next free version after
-- 20261117000001_mmorpg_servers.sql (verified: no file claims 000002;
-- next occupant is 20261118000000_bouncer_email_verification.sql).
--
-- Change:
--  * ALTER public.mmorpg_servers game CHECK to include '4d', '5d'
--    (full set: 1d/2d/3d/4d/5d). Drops the shipped 1d/2d/3d-only check
--    and re-adds the widened check under the same constraint name so
--    existing rows stay valid and new 4d/5d rows are accepted.
--
-- Economy boundary (locked):
--  * Touches NO coin_ledger tables, functions, or policies.
--  * RLS untouched (policies from 000001 carry over unchanged).
--
-- Rerunnable: DROP uses IF EXISTS; ADD is wrapped in a DO block that
-- swallows duplicate_object so re-push is a no-op (repo rule).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Drop the shipped 1d/2d/3d-only game check (auto-named inline CHECK).
-- --------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE public.mmorpg_servers DROP CONSTRAINT IF EXISTS mmorpg_servers_game_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END
$$;

-- --------------------------------------------------------------------------
-- 2. Re-add the widened game check (1d/2d/3d/4d/5d).
-- --------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE public.mmorpg_servers
    ADD CONSTRAINT mmorpg_servers_game_check
    CHECK (game IN ('1d', '2d', '3d', '4d', '5d'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
