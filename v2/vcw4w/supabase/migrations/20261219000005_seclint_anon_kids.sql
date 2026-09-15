-- ============================================================================
-- 4WEIRD SECLINT REVOKE ANON ON KID-SESSION RPCs (DS-SECLINT-05, seclint-05)
--
-- Minor-safety: no anonymous EXECUTE on kid/family-session RPCs — no anon
-- session control (start/heartbeat/end), no anon balance reads, no anon
-- window/time checks. All 7 RPCs stay callable by logged-in users
-- (authenticated) and backend jobs (service_role) only.
--
-- Grep evidence — exact signatures verified against the defining migration
-- v2/vcw4w/supabase/migrations/20260924000002_family_accounts.sql
-- (p_token_hash is `char(64)`, NOT bare `character`/`char`):
--   * start_kid_session(uuid, char(64), text, text, integer, integer) (:306-307;
--     REVOKE line :398 uses the same form)
--   * heartbeat_kid_session(uuid, char(64), uuid, integer) (:401;
--     REVOKE line :474 uses the same form)
--   * end_kid_session(uuid, char(64), uuid) (:477; REVOKE line :487)
--   * kid_session_owner(char(64)) (:118)
--   * kid_in_window(uuid) (:126)
--   * kid_wallet_balance(uuid) (:152)
--   * kid_seconds_today(uuid) (:158)
-- Later re-definitions keep the same signatures:
--   * 20261022000000_newgameplus_metering.sql:226
--     start_kid_session(uuid, char(64), text, text, integer, integer)
--   * 20261207000000_security_audit_fixes.sql:158
--     heartbeat_kid_session(uuid, char(64), uuid, integer)
-- (`character` without a length means character(1) in Postgres and would NOT
-- match these functions — `char(64)` below is the exact, verified form.)
--
-- Design: per function REVOKE ALL ON FUNCTION public.<exact-sig>
-- FROM anon, PUBLIC; then GRANT EXECUTE to authenticated, service_role.
-- This closes the anon grants left by the family-accounts bundle
-- (GRANT ... TO anon, authenticated) without touching any other grantee.
--
-- Explicitly SCOPED OUT (do NOT add here):
--   * No other functions (e.g. fund_kid_wallet, create_kid_account stay as-is).
--   * No tables, policies, triggers, or indexes.
--
-- Fully rerunnable: REVOKE/GRANT are idempotent. Append-only: never edit a
-- shipped migration, including this one once pushed — repairs go in a NEW
-- timestamped file.
-- ============================================================================

-- STEWARD EDIT 2026-09-15 (cross-lane convergence with
-- 20261219000004_sqlint_revoke_kid_family.sql, verified against
-- app/api/games/session/route.ts:78-85 + kidSessionPlay: kids have NO
-- Supabase login — the route calls the session trio through the anon-key
-- client (anon role). Revoking anon on the trio breaks ALL child play, so
-- the trio is OWNED by the sqlint file (revoke PUBLIC only, keep
-- anon+authenticated) and is deliberately NOT touched here. The 4 internal
-- helpers below are revoke-only (no authenticated re-grant) so this file
-- converges with sqlint's full lock regardless of apply order.
-- ============================================================================

-- Session trio: owned by 20261219000004_sqlint_revoke_kid_family.sql
-- (anon must stay: kidSessionPlay has no Supabase user). NO STATEMENTS HERE.

-- Internal helpers: revoke anon + PUBLIC only (sqlint revokes authenticated
-- too; no grant here so the lock stands whatever order the files apply in).
revoke all on function public.kid_in_window(uuid) from anon, public;

revoke all on function public.kid_seconds_today(uuid) from anon, public;

revoke all on function public.kid_session_owner(char(64)) from anon, public;

revoke all on function public.kid_wallet_balance(uuid) from anon, public;
