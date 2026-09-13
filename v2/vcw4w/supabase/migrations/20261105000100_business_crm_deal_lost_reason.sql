-- ============================================================================
-- 4weird Business CRM — deals: lost_reason follow-up
--
-- Adds public.crm_deals.lost_reason (nullable, short code + free-text guard).
-- Rerunnable: ADD COLUMN IF NOT EXISTS, no table rewrite.
-- NEVER touches coin tables (no coin_ledger / coin_lots / coin_spends here).
-- ============================================================================

alter table public.crm_deals
  add column if not exists lost_reason text
  check (lost_reason is null or char_length(lost_reason) <= 120);

create index if not exists idx_crm_deals_lost_reason
  on public.crm_deals (lost_reason);
