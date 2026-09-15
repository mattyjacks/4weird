-- ============================================================================
-- DS-SQLINT-05 (sqlint-05): Supabase lints 0028/0029 — EXECUTE hardening on
-- KID/FAMILY-domain RPCs (function security: excessive grants).
--
-- CALLER MATRIX (verified 2026-09-15 by grepping .rpc( over app/lib/components;
-- every kid RPC below is invoked through the user-session client
-- `await createClient()` from API routes, NOT through service_role):
--
--   Session trio — kid branch of app/api/games/session/route.ts kidSessionPlay
--   (req.cookies kid_session, NO Supabase login, so the caller role is ANON):
--     start_kid_session     route.ts:320  via supabase.rpc (anon)
--     heartbeat_kid_session route.ts:346  via supabase.rpc (anon)
--     end_kid_session       route.ts:363  via supabase.rpc (anon)
--   => REVOKE public only; KEEP anon + authenticated (revoking anon would
--      break all child play; revoking authenticated is unneeded).
--
--   Parent RPCs — called via supabase.rpc with a logged-in parent session
--   (auth.uid() enforced inside the bodies), so the caller role is
--   AUTHENTICATED:
--     create_kid_account  app/api/family/kids/route.ts:129
--     set_kid_controls    app/api/family/kids/[id]/route.ts:112
--     set_kid_password    app/api/family/kids/[id]/route.ts:128
--     close_kid_account   app/api/family/kids/[id]/route.ts:154
--     fund_kid_wallet     app/api/family/fund/route.ts:39
--   => REVOKE public + anon; KEEP authenticated.
--
--   Server-internal helpers — ZERO .rpc( callers anywhere in
--   app/lib/components (used only inside other SECURITY DEFINER bodies,
--   e.g. fund_kid_wallet/close_kid_account call kid_wallet_balance;
--   start_kid_session calls kid_session_owner/kid_in_window/kid_seconds_today):
--     kid_session_owner, kid_in_window, kid_wallet_balance, kid_seconds_today
--   => REVOKE public + anon + authenticated (service_role/definer only).
--
-- REVOKE-only: no bodies, session semantics, caps, or wallet logic touched.
-- Grants are never widened beyond shipped state; the session trio keeps its
-- shipped anon+authenticated grant, parent RPCs keep authenticated.
-- Rerunnable: REVOKE + GRANT are idempotent. No tables/policies/triggers/
-- indexes created here. Exact signatures copied from the shipped definitions
-- (20260924000002_family_accounts.sql; heartbeat re-affirmed by
-- 20261207000000_security_audit_fixes.sql; controls re-affirmed by
-- 20261025000004_kid_unlimited_time.sql).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Session trio: revoke PUBLIC only; re-assert anon + authenticated.
-- --------------------------------------------------------------------------
revoke all on function public.start_kid_session(uuid, char(64), text, text, integer, integer) from public;
grant execute on function public.start_kid_session(uuid, char(64), text, text, integer, integer) to anon, authenticated;

revoke all on function public.heartbeat_kid_session(uuid, char(64), uuid, integer) from public;
grant execute on function public.heartbeat_kid_session(uuid, char(64), uuid, integer) to anon, authenticated;

revoke all on function public.end_kid_session(uuid, char(64), uuid) from public;
grant execute on function public.end_kid_session(uuid, char(64), uuid) to anon, authenticated;

-- --------------------------------------------------------------------------
-- 2. Parent RPCs: revoke PUBLIC + ANON; keep authenticated.
-- --------------------------------------------------------------------------
revoke all on function public.create_kid_account(text, char(4), text, text) from public, anon, authenticated;
grant execute on function public.create_kid_account(text, char(4), text, text) to authenticated;

revoke all on function public.set_kid_controls(uuid, integer, time, time, text, numeric, boolean, text, text) from public, anon, authenticated;
grant execute on function public.set_kid_controls(uuid, integer, time, time, text, numeric, boolean, text, text) to authenticated;

revoke all on function public.set_kid_password(uuid, text) from public, anon, authenticated;
grant execute on function public.set_kid_password(uuid, text) to authenticated;

revoke all on function public.fund_kid_wallet(uuid, numeric) from public, anon, authenticated;
grant execute on function public.fund_kid_wallet(uuid, numeric) to authenticated;

revoke all on function public.close_kid_account(uuid) from public, anon, authenticated;
grant execute on function public.close_kid_account(uuid) to authenticated;

-- --------------------------------------------------------------------------
-- 3. Server-internal helpers: revoke PUBLIC + ANON + AUTHENTICATED.
-- --------------------------------------------------------------------------
revoke all on function public.kid_session_owner(char(64)) from public, anon, authenticated;
revoke all on function public.kid_in_window(uuid) from public, anon, authenticated;
revoke all on function public.kid_wallet_balance(uuid) from public, anon, authenticated;
revoke all on function public.kid_seconds_today(uuid) from public, anon, authenticated;
