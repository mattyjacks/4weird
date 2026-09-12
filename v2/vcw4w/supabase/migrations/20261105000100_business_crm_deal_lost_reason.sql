-- ============================================================================
-- 4weird Business CRM — deals: lost_reason follow-up
--
-- Adds public.crm_deals.lost_reason (nullable, short code + free-text guard).
-- Rerunnable: guarded DO block, no table rewrite.
-- NEVER touches coin tables (no coin_ledger / coin_lots / coin_spends here).
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'crm_deals'
      and column_name = 'lost_reason'
  ) then
    alter table public.crm_deals
      add column lost_reason text null
        check (lost_reason is null or char_length(lost_reason) <= 120);
  end if;
end
$$;

create index if not exists idx_crm_deals_lost_reason
  on public.crm_deals (lost_reason);
