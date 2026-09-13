-- ============================================================================
-- 4WEIRD MMO SERVERS (infra lane, append-only)
-- File: supabase/migrations/20261203000000_mmo_servers.sql
--
-- Slot: 20261203xxxx lands after the 20261202 tail
-- (20261202000000_vendor_usage_refunds.sql); DS-MMO-14 owns
-- 20261203000003_mmo_coin_settle.sql, so this file plus the two sibling
-- DS-MMO-10 files stop at ...000002 (no version collision).
--
-- Tables:
--  * public.mmo_servers — one row per player-hosted MMO room
--
-- Teams idiom (locked): team link is public.teams(id) + membership via
-- public.team_members(team_id). No squads table exists — never invent one.
--
-- Economy boundary (locked, DS-MMO-14 owns ledger hooks):
--  * rate_per_min / amount-style counters here are PLAIN USAGE NUMBERS,
--    not coin debits. Zero coin/ledger columns, functions, or policies
--    in this file. Settlement consumes mmo_meter rows from DS-MMO-14.
--
-- Rerunnable: every CREATE TABLE / CREATE INDEX carries IF NOT EXISTS;
-- every CREATE POLICY is preceded by its DROP POLICY IF EXISTS (repo rule);
-- functions use CREATE OR REPLACE. Writes go through the SECURITY DEFINER
-- RPCs below — clients hold SELECT only.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. SERVERS
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mmo_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game TEXT NOT NULL CHECK (game IN ('1d', '2d', '3d')),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  host_user_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  team_id UUID NULL REFERENCES public.teams(id) ON DELETE SET NULL,
  age_band TEXT NOT NULL CHECK (age_band IN ('kids', 'teens', 'adults')),
  max_players INTEGER NOT NULL DEFAULT 32 CHECK (max_players BETWEEN 2 AND 256),
  subsidy_mode TEXT NOT NULL DEFAULT 'none' CHECK (subsidy_mode IN ('none', 'host', 'sponsor')),
  rate_per_min INTEGER NOT NULL DEFAULT 0 CHECK (rate_per_min >= 0),
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'live', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mmo_servers_game ON public.mmo_servers (game);
CREATE INDEX IF NOT EXISTS idx_mmo_servers_age_band ON public.mmo_servers (age_band);
CREATE INDEX IF NOT EXISTS idx_mmo_servers_host ON public.mmo_servers (host_user_id);
CREATE INDEX IF NOT EXISTS idx_mmo_servers_team ON public.mmo_servers (team_id);
CREATE INDEX IF NOT EXISTS idx_mmo_servers_status ON public.mmo_servers (status);

DROP TRIGGER IF EXISTS trg_mmo_servers_updated ON public.mmo_servers;
CREATE TRIGGER trg_mmo_servers_updated BEFORE UPDATE ON public.mmo_servers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- --------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY — host-owns + member-reads-joined, RPC-only writes
-- --------------------------------------------------------------------------
ALTER TABLE public.mmo_servers ENABLE ROW LEVEL SECURITY;

-- Hosts may read their own server rows. This is the complete SELECT surface
-- until ...000001_mmo_membership.sql lands: the joined-member + linked-team
-- branches live there, because Postgres validates every relation inside a
-- CREATE POLICY body eagerly — referencing public.mmo_membership here would
-- fail with "relation does not exist" (it is created one file later).
-- ...000001 drops this policy and replaces it with mmo_servers_select_joined.
DROP POLICY IF EXISTS mmo_servers_select_host ON public.mmo_servers;
CREATE POLICY mmo_servers_select_host ON public.mmo_servers
  FOR SELECT TO authenticated USING (
    host_user_id = auth.uid()
  );

-- No direct INSERT / UPDATE / DELETE policies: all writes go through the
-- SECURITY DEFINER RPCs in §3 (RPC-only writes).

REVOKE ALL ON public.mmo_servers FROM anon;
REVOKE ALL ON public.mmo_servers FROM authenticated;
GRANT SELECT ON public.mmo_servers TO authenticated;

-- --------------------------------------------------------------------------
-- 3. RPCs — host-only create / status transitions
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_mmo_server(
  p_game TEXT,
  p_name TEXT,
  p_team_id UUID DEFAULT NULL,
  p_age_band TEXT DEFAULT 'adults',
  p_max_players INTEGER DEFAULT 32,
  p_subsidy_mode TEXT DEFAULT 'none',
  p_rate_per_min INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'login required'; END IF;
  IF p_game NOT IN ('1d', '2d', '3d') THEN RAISE EXCEPTION 'invalid game'; END IF;
  IF char_length(COALESCE(p_name, '')) NOT BETWEEN 2 AND 80 THEN RAISE EXCEPTION 'invalid name'; END IF;
  IF p_age_band NOT IN ('kids', 'teens', 'adults') THEN RAISE EXCEPTION 'invalid age_band'; END IF;
  IF p_max_players IS NULL OR p_max_players NOT BETWEEN 2 AND 256 THEN RAISE EXCEPTION 'invalid cap'; END IF;
  IF p_subsidy_mode NOT IN ('none', 'host', 'sponsor') THEN RAISE EXCEPTION 'invalid subsidy_mode'; END IF;
  IF p_rate_per_min IS NULL OR p_rate_per_min < 0 THEN RAISE EXCEPTION 'invalid rate'; END IF;
  IF p_team_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_team_id) THEN
    RAISE EXCEPTION 'unknown team';
  END IF;
  INSERT INTO public.mmo_servers (game, name, host_user_id, team_id, age_band, max_players, subsidy_mode, rate_per_min, status)
  VALUES (p_game, p_name, auth.uid(), p_team_id, p_age_band, p_max_players, p_subsidy_mode, p_rate_per_min, 'lobby')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_mmo_server_status(
  p_server_id UUID,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'login required'; END IF;
  IF p_status NOT IN ('lobby', 'live', 'closed') THEN RAISE EXCEPTION 'invalid status'; END IF;
  UPDATE public.mmo_servers
  SET status = p_status, updated_at = NOW()
  WHERE id = p_server_id AND host_user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'server not found'; END IF;
END;
$$;
