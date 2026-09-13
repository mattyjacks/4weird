-- ============================================================================
-- 4WEIRD MMORPG SERVERS & SESSIONS (infra lane, append-only)
-- File: supabase/migrations/20261117000001_mmorpg_servers.sql
--
-- Requested slot 20261117000000 was already occupied by
-- 20261117000000_easydnc_compliance_ledger.sql, so this lands as
-- 20261117000001 (next free version; keeps verify-migration-versions
-- unique-version gate green; no shipped migration edited).
--
-- Tables:
--  * public.mmorpg_servers  — one row per player-hosted MMORPG server
--  * public.mmorpg_sessions — one row per player join/leave on a server
--
-- Economy boundary (locked):
--  * This migration touches NO coin_ledger tables, functions, or policies.
--  * All ledger writes (billing minutes_billed -> coins, host payouts,
--    rental settlement) are economy-lane owned in their own migration.
--  * minutes_billed here is a plain usage counter, not a coin debit.
--
-- Rerunnable: every CREATE TABLE / CREATE INDEX carries IF NOT EXISTS;
-- every CREATE POLICY is preceded by its DROP POLICY IF EXISTS (repo rule).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. SERVERS
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mmorpg_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game TEXT NOT NULL CHECK (game IN ('1d', '2d', '3d')),
  name TEXT NOT NULL,
  age_band TEXT NOT NULL CHECK (age_band IN ('kids', 'teens', 'adults')),
  host_user_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  host_free BOOLEAN NOT NULL DEFAULT FALSE,
  cost_per_min INTEGER NULL,
  load_per_min INTEGER NULL,
  rental_per_hour INTEGER NULL,
  max_players INTEGER NOT NULL DEFAULT 32,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mmorpg_servers_game ON public.mmorpg_servers (game);
CREATE INDEX IF NOT EXISTS idx_mmorpg_servers_age_band ON public.mmorpg_servers (age_band);
CREATE INDEX IF NOT EXISTS idx_mmorpg_servers_host ON public.mmorpg_servers (host_user_id);

-- --------------------------------------------------------------------------
-- 2. SESSIONS
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mmorpg_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.mmorpg_servers(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ NULL,
  minutes_billed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mmorpg_sessions_server ON public.mmorpg_sessions (server_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_mmorpg_sessions_user ON public.mmorpg_sessions (user_id, joined_at DESC);

-- --------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (new tables only — coin_ledger untouched)
-- --------------------------------------------------------------------------
ALTER TABLE public.mmorpg_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mmorpg_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mmorpg_servers_select_all ON public.mmorpg_servers;
CREATE POLICY mmorpg_servers_select_all ON public.mmorpg_servers
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS mmorpg_servers_host_insert ON public.mmorpg_servers;
CREATE POLICY mmorpg_servers_host_insert ON public.mmorpg_servers
  FOR INSERT TO authenticated WITH CHECK (host_user_id = auth.uid());

DROP POLICY IF EXISTS mmorpg_servers_host_update ON public.mmorpg_servers;
CREATE POLICY mmorpg_servers_host_update ON public.mmorpg_servers
  FOR UPDATE TO authenticated USING (host_user_id = auth.uid());

DROP POLICY IF EXISTS mmorpg_sessions_select_own ON public.mmorpg_sessions;
CREATE POLICY mmorpg_sessions_select_own ON public.mmorpg_sessions
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.mmorpg_servers s
      WHERE s.id = server_id AND s.host_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS mmorpg_sessions_insert_own ON public.mmorpg_sessions;
CREATE POLICY mmorpg_sessions_insert_own ON public.mmorpg_sessions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

REVOKE ALL ON public.mmorpg_servers FROM anon;
REVOKE ALL ON public.mmorpg_sessions FROM anon;
GRANT SELECT ON public.mmorpg_servers TO authenticated;
GRANT SELECT, INSERT ON public.mmorpg_sessions TO authenticated;
