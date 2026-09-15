-- ============================================================================
-- DS-SECLINT-07: revoke anon + authenticated EXECUTE on trigger-only /
-- internal 0029-flagged functions. User JWTs must never call trigger
-- callbacks directly; triggers run as owner and bypass grants, and
-- SECURITY DEFINER internals run as definer for nested calls, so revoking
-- client roles changes nothing legitimate. service_role keeps EXECUTE so
-- server-side callers (backfills, admin jobs) still work.
--
-- Caller audit (grep over v2/vcw4w/app + v2/vcw4w/lib, exhaustive .rpc list):
--   LEGIT user-JWT callers found -> NOT revoked; granted back instead:
--   * ensure_bot_identity() -- direct user-JWT RPC from
--     app/api/bot/identity/route.ts:37 (GET, logged-in user ensures own bot
--     identity). Prior migrations already grant it to authenticated.
--     -> REVOKE anon, PUBLIC only; GRANT authenticated (+ service_role).
--   * ensure_default_org() -- direct user-JWT RPC from
--     app/api/orgs/route.ts:23 (best-effort lazy provision for pre-trigger
--     users). Prior migration grants it to authenticated.
--     -> REVOKE anon, PUBLIC only; GRANT authenticated (+ service_role).
--   * party_resolve(text, text) -- direct RPC from
--     app/api/parties/resolve/route.ts:41, a route with NO login requirement
--     (rate-limited public directory lookup). Prior migration grants it to
--     anon + authenticated.
--     -> REVOKE PUBLIC only; GRANT anon, authenticated (+ service_role).
--   * is_org_member(uuid), has_org_perm(uuid, text),
--     has_team_perm(uuid, text), has_project_perm(uuid, text) -- called
--     directly in RLS policy USING clauses evaluated FOR SELECT TO
--     authenticated (e.g. orgs_read, teams_read, projects_read,
--     org_members_read, wallets_read, vault_files_team/org in
--     20260910130000_teams_enterprise_bundle.sql,
--     20260911000000_coin_expiry_fifo_and_budgets.sql,
--     20260925000100_watcher_multirole_ghost.sql,
--     20261013000000_zip_vault_meshy.sql,
--     20261107000000_vault_path_upsert_trash.sql). Postgres checks EXECUTE
--     on policy-called functions against the invoking role, so revoking
--     authenticated here would break every RLS-gated read on those tables.
--     -> REVOKE anon, PUBLIC only; GRANT authenticated (+ service_role).
--   NO direct app/lib callers exist for any other function below; the only
--   in-database callers are trigger firings (no EXECUTE check) and nested
--   calls inside SECURITY DEFINER functions (definer's rights apply).
--
-- Exact signatures confirmed by grep over supabase/migrations
-- (CREATE OR REPLACE FUNCTION lines in the defining migrations).
--
-- Overlap note: 20261219000002_security_revoke_internals.sql already revoked
-- 17 zero-arg functions from public/anon/authenticated and
-- 20261219000003_seclint_anon_triggers.sql re-revoked 18 from anon/PUBLIC
-- with service_role grants; this migration re-applies those idempotently and
-- extends the revoke to authenticated per lint 0029, except the 7 grant-back
-- functions above.
--
-- Rerunnable: REVOKE / GRANT are idempotent. No tables, policies, triggers,
-- or indexes are created here.
-- ============================================================================

-- ---- Section A: pure trigger callbacks / internals, no legit client path.
-- Revoke BOTH anon and authenticated (+ PUBLIC); grant service_role.

revoke all on function public.enforce_cheat_save_marker() from anon, public, authenticated;
grant execute on function public.enforce_cheat_save_marker() to service_role;

revoke all on function public.enforce_clan_comment_parent_same_post() from anon, public, authenticated;
grant execute on function public.enforce_clan_comment_parent_same_post() to service_role;

revoke all on function public.enforce_clan_member_cap() from anon, public, authenticated;
grant execute on function public.enforce_clan_member_cap() to service_role;

revoke all on function public.enforce_org_budget() from anon, public, authenticated;
grant execute on function public.enforce_org_budget() to service_role;

revoke all on function public.enforce_org_count() from anon, public, authenticated;
grant execute on function public.enforce_org_count() to service_role;

revoke all on function public.enforce_org_member_cap() from anon, public, authenticated;
grant execute on function public.enforce_org_member_cap() to service_role;

revoke all on function public.enforce_personal_budget() from anon, public, authenticated;
grant execute on function public.enforce_personal_budget() to service_role;

revoke all on function public.maintain_clan_comment_count() from anon, public, authenticated;
grant execute on function public.maintain_clan_comment_count() to service_role;

revoke all on function public.bump_clan_member_count() from anon, public, authenticated;
grant execute on function public.bump_clan_member_count() to service_role;

revoke all on function public.bump_org_member_count() from anon, public, authenticated;
grant execute on function public.bump_org_member_count() to service_role;

revoke all on function public.handle_new_user() from anon, public, authenticated;
grant execute on function public.handle_new_user() to service_role;

revoke all on function public.guard_profile_verification() from anon, public, authenticated;
grant execute on function public.guard_profile_verification() to service_role;

revoke all on function public.trg_init_org_on_use() from anon, public, authenticated;
grant execute on function public.trg_init_org_on_use() to service_role;

revoke all on function public.trg_init_team_org_on_use() from anon, public, authenticated;
grant execute on function public.trg_init_team_org_on_use() to service_role;

revoke all on function public.strip_slot_zero_cheat_marker() from anon, public, authenticated;
grant execute on function public.strip_slot_zero_cheat_marker() to service_role;

revoke all on function public.apply_coin_lot_to_ledger() from anon, public, authenticated;
grant execute on function public.apply_coin_lot_to_ledger() to service_role;

revoke all on function public.backfill_clan_forum_counters() from anon, public, authenticated;
grant execute on function public.backfill_clan_forum_counters() to service_role;

do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke all on function public.rls_auto_enable() from anon, public, authenticated;
    grant execute on function public.rls_auto_enable() to service_role;
  end if;
end $$;

-- ---- Section B: parameterized SECURITY DEFINER internals with no legit
-- direct client path (only nested calls from definer functions / triggers).
-- Revoke BOTH anon and authenticated (+ PUBLIC); grant service_role.

revoke all on function public.ensure_org_initialized(uuid) from anon, public, authenticated;
grant execute on function public.ensure_org_initialized(uuid) to service_role;

revoke all on function public.project_team(uuid) from anon, public, authenticated;
grant execute on function public.project_team(uuid) to service_role;

revoke all on function public.team_org(uuid) from anon, public, authenticated;
grant execute on function public.team_org(uuid) to service_role;

revoke all on function public.org_roles_of(uuid, uuid) from anon, public, authenticated;
grant execute on function public.org_roles_of(uuid, uuid) to service_role;

revoke all on function public.effective_perms(text, uuid) from anon, public, authenticated;
grant execute on function public.effective_perms(text, uuid) to service_role;

revoke all on function public.party_entity_exists(text, uuid) from anon, public, authenticated;
grant execute on function public.party_entity_exists(text, uuid) to service_role;

revoke all on function public.party_label(text, uuid) from anon, public, authenticated;
grant execute on function public.party_label(text, uuid) to service_role;

revoke all on function public.clan_member_cap(uuid) from anon, public, authenticated;
grant execute on function public.clan_member_cap(uuid) to service_role;

revoke all on function public.org_member_cap(uuid) from anon, public, authenticated;
grant execute on function public.org_member_cap(uuid) to service_role;

-- ---- Section C: legit user-JWT callers (see header audit). Keep client
-- access: revoke anon/PUBLIC where no anonymous path exists, grant back
-- authenticated (and anon for party_resolve, whose route needs no login).

revoke all on function public.ensure_bot_identity() from anon, public;
grant execute on function public.ensure_bot_identity() to authenticated, service_role;

revoke all on function public.ensure_default_org() from anon, public;
grant execute on function public.ensure_default_org() to authenticated, service_role;

revoke all on function public.party_resolve(text, text) from public;
grant execute on function public.party_resolve(text, text) to anon, authenticated, service_role;

revoke all on function public.is_org_member(uuid) from anon, public;
grant execute on function public.is_org_member(uuid) to authenticated, service_role;

revoke all on function public.has_org_perm(uuid, text) from anon, public;
grant execute on function public.has_org_perm(uuid, text) to authenticated, service_role;

revoke all on function public.has_team_perm(uuid, text) from anon, public;
grant execute on function public.has_team_perm(uuid, text) to authenticated, service_role;

revoke all on function public.has_project_perm(uuid, text) from anon, public;
grant execute on function public.has_project_perm(uuid, text) to authenticated, service_role;
