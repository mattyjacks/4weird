-- ============================================================================
-- 4WEIRD EASYDNC COMPLIANCE & 25% PLATFORM CUT LEDGER
-- File: supabase/migrations/20261117000000_easydnc_compliance_ledger.sql
--
-- Rules:
--  1. 100 Vibe Coins = $1.00 USD. Rate per lookup = 2.5 🪙 ($0.025 USD).
--  2. 25% Platform Cut: 0.625 🪙 ($0.00625) automatically attributed to
--     platform_compute_cuts; 75% provider share: 1.875 🪙 ($0.01875).
--  3. Audit trail records salted SHA-256 phone hashes with timestamped
--     verification for FTC TSR Safe Harbor (31-day validity) and TCPA defense.
--  4. Extends crm_contacts with DNC compliance tracking for Outscraper leads.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. BATCH AUDIT TABLE
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.easydnc_scrub_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.orgs(id) ON DELETE SET NULL,
  batch_hash TEXT NOT NULL, -- SHA-256 fingerprint of normalized input list
  total_checked INTEGER NOT NULL CHECK (total_checked > 0 AND total_checked <= 500000),
  total_dnc INTEGER NOT NULL DEFAULT 0 CHECK (total_dnc >= 0),
  total_clean INTEGER NOT NULL DEFAULT 0 CHECK (total_clean >= 0),
  gross_coins NUMERIC(12, 2) NOT NULL CHECK (gross_coins >= 0),
  cut_coins NUMERIC(12, 2) NOT NULL CHECK (cut_coins >= 0),
  provider_coins NUMERIC(12, 2) NOT NULL CHECK (provider_coins >= 0),
  is_byok BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_easydnc_batches_user ON public.easydnc_scrub_batches (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_easydnc_batches_hash ON public.easydnc_scrub_batches (batch_hash);

-- --------------------------------------------------------------------------
-- 2. INDIVIDUAL AUDIT RECORDS (Salted SHA-256 for Privacy + Verification)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.easydnc_audit_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.easydnc_scrub_batches(id) ON DELETE CASCADE,
  phone_hash TEXT NOT NULL, -- SHA-256(phone + batch_id)
  dnc_status BOOLEAN NOT NULL,
  raw_status TEXT NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_easydnc_records_batch ON public.easydnc_audit_records (batch_id);
CREATE INDEX IF NOT EXISTS idx_easydnc_records_hash ON public.easydnc_audit_records (phone_hash);

-- --------------------------------------------------------------------------
-- 3. EXTEND CRM CONTACTS (Outscraper & Safe Harbor 31-Day Rule)
-- --------------------------------------------------------------------------
ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS dnc_status TEXT DEFAULT 'unverified'
    CHECK (dnc_status IN ('unverified', 'clean', 'dnc', 'exempt', 'error')),
  ADD COLUMN IF NOT EXISTS dnc_checked_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS dnc_expires_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS dnc_batch_id UUID NULL REFERENCES public.easydnc_scrub_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_source TEXT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_crm_contacts_dnc_status ON public.crm_contacts(org_id, dnc_status);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_dnc_expires ON public.crm_contacts(org_id, dnc_expires_at);

-- --------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- --------------------------------------------------------------------------
ALTER TABLE public.easydnc_scrub_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.easydnc_audit_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS easydnc_batches_select_own ON public.easydnc_scrub_batches;
CREATE POLICY easydnc_batches_select_own ON public.easydnc_scrub_batches
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS easydnc_records_select_own ON public.easydnc_audit_records;
CREATE POLICY easydnc_records_select_own ON public.easydnc_audit_records
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.easydnc_scrub_batches b
      WHERE b.id = batch_id AND b.user_id = auth.uid()
    )
  );

REVOKE ALL ON public.easydnc_scrub_batches FROM anon;
REVOKE ALL ON public.easydnc_audit_records FROM anon;
GRANT SELECT ON public.easydnc_scrub_batches TO authenticated;
GRANT SELECT ON public.easydnc_audit_records TO authenticated;

-- --------------------------------------------------------------------------
-- 5. ATOMIC PAYMENT & 25% PLATFORM CUT PROCEDURE
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_easydnc_batch_payment(
  p_user_id UUID,
  p_total_numbers INTEGER,
  p_batch_hash TEXT,
  p_is_byok BOOLEAN DEFAULT FALSE,
  p_org_id UUID DEFAULT NULL
)
RETURNS TABLE (
  batch_id UUID,
  gross_coins NUMERIC(12, 2),
  cut_coins NUMERIC(12, 2),
  provider_coins NUMERIC(12, 2),
  current_balance NUMERIC(12, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC(12, 2);
  v_rate_per_check NUMERIC(12, 2) := 2.50; -- 2.5 Vibe Coins ($0.025 USD)
  v_gross NUMERIC(12, 2);
  v_cut NUMERIC(12, 2);
  v_provider NUMERIC(12, 2);
  v_batch_id UUID;
BEGIN
  IF p_total_numbers <= 0 OR p_total_numbers > 500000 THEN
    RAISE EXCEPTION 'Invalid total numbers count: %', p_total_numbers;
  END IF;

  IF p_is_byok THEN
    v_gross := 0.00;
    v_cut := 0.00;
    v_provider := 0.00;
  ELSE
    v_gross := ROUND(p_total_numbers * v_rate_per_check, 2);
    v_cut := ROUND(v_gross * 0.25, 2); -- 25% Platform Cut
    v_provider := v_gross - v_cut;      -- 75% Provider Share

    -- Check user balance
    SELECT COALESCE(SUM(delta), 0)::NUMERIC(12, 2) INTO v_balance
    FROM public.coin_ledger
    WHERE user_id = p_user_id;

    IF v_balance < v_gross THEN
      RAISE EXCEPTION 'Insufficient Vibe Coins. Required: %, Available: %', v_gross, v_balance;
    END IF;

    -- Debit user wallet
    INSERT INTO public.coin_ledger (user_id, delta, reason)
    VALUES (
      p_user_id,
      -v_gross,
      'EasyDNC scrub: ' || p_total_numbers || ' numbers (25% platform cut included)'
    );

    -- If org_id provided, record attributable compute cut
    IF p_org_id IS NOT NULL THEN
      INSERT INTO public.platform_compute_cuts (
        org_id,
        gross_coins,
        cut_coins,
        provider_coins
      ) VALUES (
        p_org_id,
        ROUND(v_gross)::INTEGER,
        ROUND(v_cut)::INTEGER,
        ROUND(v_provider)::INTEGER
      );
    END IF;
  END IF;

  -- Create batch row
  INSERT INTO public.easydnc_scrub_batches (
    user_id,
    org_id,
    batch_hash,
    total_checked,
    gross_coins,
    cut_coins,
    provider_coins,
    is_byok
  ) VALUES (
    p_user_id,
    p_org_id,
    p_batch_hash,
    p_total_numbers,
    v_gross,
    v_cut,
    v_provider,
    p_is_byok
  ) RETURNING id INTO v_batch_id;

  -- Query updated balance
  SELECT COALESCE(SUM(delta), 0)::NUMERIC(12, 2) INTO v_balance
  FROM public.coin_ledger
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_batch_id, v_gross, v_cut, v_provider, v_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_easydnc_batch_payment(UUID, INTEGER, TEXT, BOOLEAN, UUID) TO authenticated;
