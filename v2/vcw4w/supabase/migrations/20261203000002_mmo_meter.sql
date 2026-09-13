-- ============================================================================
-- 4WEIRD MMO METER — CHARGE ROWS ONLY (infra lane, append-only)
-- File: supabase/migrations/20261203000002_mmo_meter.sql
--
-- Slot: DS-MMO-10 file 3 of 3 (DS-MMO-14 owns ...03000003_mmo_coin_settle).
--
-- Table:
--  * public.mmo_meter — one charge row per (server, player, period);
--    minutes + rate_per_min + amount are PLAIN USAGE NUMBERS. This file
--    records what was consumed; DS-MMO-14 settlement turns those rows
--    into paired ledger entries. Zero coin/ledger columns, functions, or
--    policies here.
--
-- Idempotency: charge_key UNIQUE (server, player, period) so a retried
-- charge RPC cannot double-record; settlement in DS-MMO-14 keys off it.
--
-- Rerunnable: IF NOT EXISTS / DROP ... IF EXISTS guards (repo rule).
-- Writes go through the SECURITY DEFINER RPC below — clients hold
-- SELECT only (RPC-only writes).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. METER (charge rows only)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mmo_meter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.mmo_servers(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  period_start TIMESTAMPTZ NOT NULL,
  minutes INTEGER NOT NULL CHECK (minutes > 0),
  rate_per_min INTEGER NOT NULL CHECK (rate_per_min >= 0),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  charge_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (charge_key)
);

CREATE INDEX IF NOT EXISTS idx_mmo_meter_server ON public.mmo_meter (server_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_mmo_meter_user ON public.mmo_meter (user_id, period_start DESC);

-- --------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY — host-owns + member-reads-joined, RPC-only writes
-- --------------------------------------------------------------------------
ALTER TABLE public.mmo_meter ENABLE ROW LEVEL SECURITY;

-- Hosts read every charge row on their server; players read their own rows;
-- members of the server's linked team (teams idiom) read the server's rows.
DROP POLICY IF EXISTS mmo_meter_select_joined ON public.mmo_meter;
CREATE POLICY mmo_meter_select_joined ON public.mmo_meter
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
REVOKE ALL ON public.mmo_meter FROM anon;
REVOKE ALL ON public.mmo_meter FROM authenticated;
GRANT SELECT ON public.mmo_meter TO authenticated;

-- --------------------------------------------------------------------------
-- 3. RPC — host records a charge row (usage only; settlement is DS-MMO-14)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.charge_mmo_minutes(
  p_server_id UUID,
  p_user_id UUID,
  p_period_start TIMESTAMPTZ,
  p_minutes INTEGER
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rate INTEGER;
  v_id UUID;
  v_key TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'login required'; END IF;
  IF p_minutes IS NULL OR p_minutes <= 0 OR p_minutes > 100000 THEN RAISE EXCEPTION 'invalid minutes'; END IF;
  IF p_period_start IS NULL THEN RAISE EXCEPTION 'invalid period'; END IF;
  SELECT rate_per_min INTO v_rate FROM public.mmo_servers
  WHERE id = p_server_id AND host_user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'server not found'; END IF;
  v_key := p_server_id::TEXT || '|' || p_user_id::TEXT || '|' || floor(extract(epoch FROM p_period_start))::TEXT;
  INSERT INTO public.mmo_meter (server_id, user_id, period_start, minutes, rate_per_min, amount, charge_key)
  VALUES (p_server_id, p_user_id, p_period_start, p_minutes, v_rate, p_minutes * v_rate, v_key)
  ON CONFLICT (charge_key) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.mmo_meter WHERE charge_key = v_key;
  END IF;
  RETURN v_id;
END;
$$;
