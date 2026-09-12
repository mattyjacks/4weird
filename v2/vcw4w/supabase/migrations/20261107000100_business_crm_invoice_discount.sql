-- ============================================================================
-- 4weird Business CRM — invoice-level discount support
--
-- Adds public.crm_invoices.discount_coins (coins, >= 0, default 0).
-- Totals stay derived: total_coins = subtotal - discount + tax.
--
-- Rerunnable: ADD COLUMN IF NOT EXISTS.
-- NEVER touches coin tables (no coin_ledger / coin_lots / coin_spends here).
-- ============================================================================

alter table public.crm_invoices
  add column if not exists discount_coins bigint not null default 0
  check (discount_coins >= 0);
