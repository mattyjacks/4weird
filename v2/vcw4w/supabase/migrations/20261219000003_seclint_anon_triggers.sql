-- ============================================================================
-- SECLINT-03: revoke anon EXECUTE on trigger-only/internal SECURITY DEFINER
-- functions (lint 0028). None are legitimate anonymous RPCs — all are
-- trigger callbacks or service-role internals:
--   apply_coin_lot_to_ledger(), backfill_clan_forum_counters(),
--   bump_clan_member_count(), bump_org_member_count(),
--   enforce_cheat_save_marker(), enforce_clan_comment_parent_same_post(),
--   enforce_clan_member_cap(), enforce_org_budget(), enforce_org_count(),
--   enforce_org_member_cap(), enforce_personal_budget(),
--   guard_profile_verification(), handle_new_user(),
--   maintain_clan_comment_count(), rls_auto_enable(),
--   strip_slot_zero_cheat_marker(), trg_init_org_on_use(),
--   trg_init_team_org_on_use().
--
-- Exact zero-arg signatures confirmed by grep over supabase/migrations
-- (each `create or replace function public.<name>()`, returns trigger
-- except the backfill/admin helpers which are still zero-arg; rls_auto_enable
-- has no CREATE in migrations but is revoked as () matching
-- 20261219000002_security_revoke_internals.sql).
--
-- Caller check: grep over v2/vcw4w/app + v2/vcw4w/lib finds NO direct
-- reference to any of these 18 names, so no authenticated grant is emitted.
-- All are revoked-as-trigger: trigger execution runs as the function owner
-- and bypasses grants, so revoking changes nothing legitimate. service_role
-- keeps EXECUTE so server-side callers (e.g. backfill) still work.
--
-- Overlap note: 20261219000002_security_revoke_internals.sql already revoked
-- 17 of these from public/anon/authenticated; this migration re-revokes
-- (idempotent) from anon, PUBLIC per lint 0028, adds the missing
-- apply_coin_lot_to_ledger(), and adds the service_role grants.
--
-- Rerunnable: REVOKE / GRANT are idempotent. No tables, policies,
-- triggers, or indexes are created here.
-- ============================================================================

revoke all on function public.apply_coin_lot_to_ledger() from anon, public;
grant execute on function public.apply_coin_lot_to_ledger() to service_role;

revoke all on function public.backfill_clan_forum_counters() from anon, public;
grant execute on function public.backfill_clan_forum_counters() to service_role;

revoke all on function public.bump_clan_member_count() from anon, public;
grant execute on function public.bump_clan_member_count() to service_role;

revoke all on function public.bump_org_member_count() from anon, public;
grant execute on function public.bump_org_member_count() to service_role;

revoke all on function public.enforce_cheat_save_marker() from anon, public;
grant execute on function public.enforce_cheat_save_marker() to service_role;

revoke all on function public.enforce_clan_comment_parent_same_post() from anon, public;
grant execute on function public.enforce_clan_comment_parent_same_post() to service_role;

revoke all on function public.enforce_clan_member_cap() from anon, public;
grant execute on function public.enforce_clan_member_cap() to service_role;

revoke all on function public.enforce_org_budget() from anon, public;
grant execute on function public.enforce_org_budget() to service_role;

revoke all on function public.enforce_org_count() from anon, public;
grant execute on function public.enforce_org_count() to service_role;

revoke all on function public.enforce_org_member_cap() from anon, public;
grant execute on function public.enforce_org_member_cap() to service_role;

revoke all on function public.enforce_personal_budget() from anon, public;
grant execute on function public.enforce_personal_budget() to service_role;

revoke all on function public.guard_profile_verification() from anon, public;
grant execute on function public.guard_profile_verification() to service_role;

revoke all on function public.handle_new_user() from anon, public;
grant execute on function public.handle_new_user() to service_role;

revoke all on function public.maintain_clan_comment_count() from anon, public;
grant execute on function public.maintain_clan_comment_count() to service_role;

-- This helper does not exist in every project revision. Guard its optional
-- cleanup so a fresh migration cannot fail before the later hardening runs.
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke all on function public.rls_auto_enable() from anon, public;
    grant execute on function public.rls_auto_enable() to service_role;
  end if;
end $$;

revoke all on function public.strip_slot_zero_cheat_marker() from anon, public;
grant execute on function public.strip_slot_zero_cheat_marker() to service_role;

revoke all on function public.trg_init_org_on_use() from anon, public;
grant execute on function public.trg_init_org_on_use() to service_role;

revoke all on function public.trg_init_team_org_on_use() from anon, public;
grant execute on function public.trg_init_team_org_on_use() to service_role;
