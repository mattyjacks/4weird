-- ============================================================================
-- 4WEIRD BOUNCER EMAIL VERIFICATION PERSISTENCE
-- File: supabase/migrations/20261118000000_bouncer_email_verification.sql
--
-- Pattern: supabase/migrations/20261117000000_easydnc_compliance_ledger.sql
--
-- Rules:
--  1. Append-only: never edit shipped migrations; this file only ADDS.
--  2. Extends public.crm_contacts with Bouncer (UseBouncer) email-verification
--     tracking for Outscraper-sourced and manual leads.
--  3. bouncer_batches is the audit table: one row per verification batch,
--     keyed by SHA-256 fingerprint of the normalized email list.
--  4. Bouncer API auth is server-only via BOUNCER_API_KEY (alias
--     USEBOUNCER_API_KEY), sent as header x-api-key. Never NEXT_PUBLIC_.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. BATCH AUDIT TABLE
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bouncer_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.orgs(id) ON DELETE SET NULL,
  batch_hash TEXT NOT NULL, -- SHA-256 fingerprint of normalized email list
  total_checked INTEGER NOT NULL CHECK (total_checked > 0 AND total_checked <= 500000),
  total_deliverable INTEGER NOT NULL DEFAULT 0 CHECK (total_deliverable >= 0),
  total_risky INTEGER NOT NULL DEFAULT 0 CHECK (total_risky >= 0),
  total_undeliverable INTEGER NOT NULL DEFAULT 0 CHECK (total_undeliverable >= 0),
  total_unknown INTEGER NOT NULL DEFAULT 0 CHECK (total_unknown >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bouncer_batches_user ON public.bouncer_batches (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bouncer_batches_hash ON public.bouncer_batches (batch_hash);

-- --------------------------------------------------------------------------
-- 2. EXTEND CRM CONTACTS (Bouncer email verification)
-- --------------------------------------------------------------------------
ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS bouncer_status TEXT DEFAULT 'unverified'
    CHECK (bouncer_status IN ('unverified', 'deliverable', 'risky', 'undeliverable', 'unknown')),
  ADD COLUMN IF NOT EXISTS bouncer_score INTEGER NULL
    CHECK (bouncer_score IS NULL OR (bouncer_score BETWEEN 0 AND 100)),
  ADD COLUMN IF NOT EXISTS bouncer_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS bouncer_toxicity INTEGER NULL
    CHECK (bouncer_toxicity IS NULL OR (bouncer_toxicity BETWEEN 0 AND 5)),
  ADD COLUMN IF NOT EXISTS bouncer_checked_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS bouncer_batch_id UUID NULL REFERENCES public.bouncer_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_contacts_bouncer_status ON public.crm_contacts(org_id, bouncer_status);

-- --------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS)
-- --------------------------------------------------------------------------
ALTER TABLE public.bouncer_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bouncer_batches_select_own ON public.bouncer_batches;
CREATE POLICY bouncer_batches_select_own ON public.bouncer_batches
  FOR SELECT TO authenticated USING (user_id = auth.uid());

REVOKE ALL ON public.bouncer_batches FROM anon;
GRANT SELECT ON public.bouncer_batches TO authenticated;
