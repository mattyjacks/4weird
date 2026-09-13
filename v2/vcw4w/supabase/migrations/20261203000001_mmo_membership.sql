-- ============================================================================
-- 4WEIRD MMO MEMBERSHIP + PRESENCE (infra lane, append-only)
-- File: supabase/migrations/20261203000001_mmo_membership.sql
--
-- Slot: DS-MMO-10 file 2 of 3 (after ...03000000_mmo_servers.sql, before
-- ...03000002_mmo_meter.sql; DS-MMO-14 owns ...03000003).
--
-- Tables:
--  * public.mmo_membership — one row per (server, player); left_at NULL =
--    currently joined. Enforces the server cap (2–256) at join time.
--  * public.mmo_presence  — one row per (server, player) heartbeat cursor;
--    presence_minutes is a PLAIN USAGE COUNTER consumed by DS-MMO-14
--    settlement. Zero coin/ledger columns here.
--
-- Teams idiom (locked): team reads resolve through
-- public.team_members(team_id) on the server's team_id. No squads table.
--
-- Rerunnable: IF NOT EXISTS / DROP ... IF EXISTS guards (repo rule).
-- Writes go through the SECURITY DEFINER RPCs below — clients hold
-- SELECT only (RPC-only writes).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. MEMBERSHIP
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mmo_membership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.mmo_servers(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (server_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_mmo_membership_server ON public.mmo_membership (server_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_mmo_membership_user ON public.mmo_membership (user_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_mmo_membership_active ON public.mmo_membership (server_id) WHERE left_at IS NULL;

-- --------------------------------------------------------------------------
-- 2. PRESENCE
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mmo_presence (
  server_id UUID NOT NULL REFERENCES public.mmo_servers(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  presence_minutes INTEGER NOT NULL DEFAULT 0 CHECK (presence_minutes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (server_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_mmo_presence_server ON public.mmo_presence (server_id, last_heartbeat DESC);
CREATE INDEX IF NOT EXISTS idx_mmo_presence_user ON public.mmo_presence (user_id, last_heartbeat DESC);

-- --------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY — host-owns + member-reads-joined, RPC-only writes
-- --------------------------------------------------------------------------
ALTER TABLE public.mmo_membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mmo_presence ENABLE ROW LEVEL SECURITY;

-- A caller reads a membership/presence row when they host the server, hold
-- their own row, or belong to the server's linked team (teams idiom).
DROP POLICY IF EXISTS mmo_membership_select_joined ON public.mmo_membership;
CREATE POLICY mmo_membership_select_joined ON public.mmo_membership
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.mmo_servers s
      WHERE s.id = server_id AND s.host_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.mmo_servers s
      JOIN public.team_members tm ON tm.team_id = s.team_id
      WHERE s.id = server_id
        AND s.team_id IS NOT NULL
        AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS mmo_presence_select_joined ON public.mmo_presence;
CREATE POLICY mmo_presence_select_joined ON public.mmo_presence
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.mmo_servers s
      WHERE s.id = server_id AND s.host_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.mmo_servers s
      JOIN public.team_members tm ON tm.team_id = s.team_id
      WHERE s.id = server_id
        AND s.team_id IS NOT NULL
        AND tm.user_id = auth.uid()
    )
  );

-- No direct INSERT / UPDATE / DELETE policies: RPC-only writes.
REVOKE ALL ON public.mmo_membership FROM anon;
REVOKE ALL ON public.mmo_membership FROM authenticated;
GRANT SELECT ON public.mmo_membership TO authenticated;
REVOKE ALL ON public.mmo_presence FROM anon;
REVOKE ALL ON public.mmo_presence FROM authenticated;
GRANT SELECT ON public.mmo_presence TO authenticated;

-- --------------------------------------------------------------------------
-- 3b. SERVER ROW READS FOR JOINED + TEAM MEMBERS (lives here, not in
-- ...000000: Postgres validates every relation in a CREATE POLICY body
-- eagerly, so this policy — which probes public.mmo_membership — can only
-- be created once that table exists. ...000000 ships the host-only
-- mmo_servers_select_host; this section replaces it with the full
-- host + joined-member + linked-team surface (teams idiom
-- public.team_members(team_id), present since 20260910130000).
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS mmo_servers_select_host ON public.mmo_servers;
DROP POLICY IF EXISTS mmo_servers_select_joined ON public.mmo_servers;
CREATE POLICY mmo_servers_select_joined ON public.mmo_servers
  FOR SELECT TO authenticated USING (
    host_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.mmo_membership m
      WHERE m.server_id = mmo_servers.id
        AND m.user_id = auth.uid()
        AND m.left_at IS NULL
    )
    OR (
      team_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = mmo_servers.team_id
          AND tm.user_id = auth.uid()
      )
    )
  );

-- --------------------------------------------------------------------------
-- 4. RPCs — join / leave / heartbeat
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.join_mmo_server(p_server_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cap INTEGER;
  v_status TEXT;
  v_active INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'login required'; END IF;
  SELECT max_players, status INTO v_cap, v_status
  FROM public.mmo_servers WHERE id = p_server_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'server not found'; END IF;
  IF v_status NOT IN ('lobby', 'live') THEN RAISE EXCEPTION 'server not joinable'; END IF;
  SELECT COUNT(*) INTO v_active FROM public.mmo_membership
  WHERE server_id = p_server_id AND left_at IS NULL;
  IF v_active >= v_cap THEN RAISE EXCEPTION 'server full'; END IF;
  INSERT INTO public.mmo_membership (server_id, user_id, joined_at, left_at)
  VALUES (p_server_id, auth.uid(), NOW(), NULL)
  ON CONFLICT (server_id, user_id)
  DO UPDATE SET left_at = NULL, joined_at = NOW();
  INSERT INTO public.mmo_presence (server_id, user_id, last_heartbeat)
  VALUES (p_server_id, auth.uid(), NOW())
  ON CONFLICT (server_id, user_id)
  DO UPDATE SET last_heartbeat = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_mmo_server(p_server_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'login required'; END IF;
  UPDATE public.mmo_membership
  SET left_at = NOW()
  WHERE server_id = p_server_id AND user_id = auth.uid() AND left_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'membership not found'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.heartbeat_mmo_presence(p_server_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'login required'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.mmo_membership
    WHERE server_id = p_server_id AND user_id = auth.uid() AND left_at IS NULL
  ) THEN RAISE EXCEPTION 'not joined'; END IF;
  INSERT INTO public.mmo_presence (server_id, user_id, last_heartbeat, presence_minutes)
  VALUES (p_server_id, auth.uid(), NOW(), 0)
  ON CONFLICT (server_id, user_id)
  DO UPDATE SET last_heartbeat = NOW();
END;
$$;
