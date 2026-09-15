-- DS-SECLINT-08: belt-and-braces grant hardening for ghost/timer RPCs.
--
-- Convention (v2/vcw4w/supabase/migrations/20261211000000_ghost_rename.sql):
--   SET search_path = public, REVOKE ALL ... FROM public, anon,
--   GRANT EXECUTE ... TO authenticated. service_role bypasses grants, so no
--   explicit grant is needed for server-side callers.
--
-- Per-function evidence (verified in defining migrations before writing):
--   * Bodies are NOT touched here (owning lanes own bodies); all 10 already
--     carry `security definer set search_path = public` AND an
--     `auth.uid() IS NULL` guard raising 'login required' / 'Login required.'.
--   * All 10 already carry `revoke all ... from public, anon` +
--     `grant execute ... to authenticated` in their defining migration, and no
--     later migration re-grants anon/public (grep: zero
--     `grant ... to anon|public` on these functions anywhere in migrations/).
--   * Anon revoke is safe: every client caller is login-required. Evidence:
--     app/api/ghost/{contracts,timer,debts,summary,proofs}/route.ts and every
--     app/api/time/** route call supabase.auth.getUser() and 401
--     "Login required." when absent.
--   * Authenticated is NEVER revoked (hard rule); only public + anon.
--
-- Rerunnable: REVOKE ... FROM (no IF EXISTS in Postgres for REVOKE, but
-- revoking a non-held privilege is a no-op NOTICE, never an error) + GRANT
-- are idempotent. No CREATE OR REPLACE, no old-migration edits, no app code.
--
-- 1. start_timer(uuid,uuid,text,boolean,boolean,text,text)
--    Defining migration: 20261211000000_ghost_rename.sql (body verbatim from
--    20261113000000_timer_ownership_hardening.sql, col renamed). search_path ✓,
--    `if v_uid is null then raise exception 'Login required.'` ✓, revoke ✓.
revoke all on function public.start_timer(uuid, uuid, text, boolean, boolean, text, text) from public, anon;
grant execute on function public.start_timer(uuid, uuid, text, boolean, boolean, text, text) to authenticated;
--
-- 2. stop_timer(uuid,text,uuid,boolean,integer)
--    Defining migration: 20261211000000_ghost_rename.sql (body verbatim from
--    20261113000000_timer_ownership_hardening.sql). search_path ✓,
--    `if v_uid is null then raise exception 'Login required.'` ✓, revoke ✓.
revoke all on function public.stop_timer(uuid, text, uuid, boolean, integer) from public, anon;
grant execute on function public.stop_timer(uuid, text, uuid, boolean, integer) to authenticated;
--
-- 3. ghost_beat(uuid,integer)
--    Defining migration: 20260925000100_watcher_multirole_ghost.sql:382-405.
--    search_path ✓, `if auth.uid() is null then raise exception 'login
--    required'` ✓, revoke ✓. No later migration touches it.
revoke all on function public.ghost_beat(uuid, integer) from public, anon;
grant execute on function public.ghost_beat(uuid, integer) to authenticated;
--
-- 4. ghost_clock_in(uuid,text)
--    Defining migration: 20260925000100_watcher_multirole_ghost.sql:360-379.
--    search_path ✓, auth.uid() guard ✓, revoke ✓. No later migration touches it.
revoke all on function public.ghost_clock_in(uuid, text) from public, anon;
grant execute on function public.ghost_clock_in(uuid, text) to authenticated;
--
-- 5. ghost_clock_out(uuid)
--    Defining migration: 20260925000100_watcher_multirole_ghost.sql:407-426.
--    search_path ✓, auth.uid() guard ✓, revoke ✓. No later migration touches it.
revoke all on function public.ghost_clock_out(uuid) from public, anon;
grant execute on function public.ghost_clock_out(uuid) to authenticated;
--
-- 6. ghost_create_contract(uuid,text,uuid,uuid,numeric)
--    LATEST body: 20261116000004_sec_econ_hardening.sql:191-212 (zero-rate fix
--    over 20260925000100_watcher_multirole_ghost.sql:335-356). search_path ✓,
--    auth.uid() guard ✓, revoke ✓ in BOTH migrations.
revoke all on function public.ghost_create_contract(uuid, text, uuid, uuid, numeric) from public, anon;
grant execute on function public.ghost_create_contract(uuid, text, uuid, uuid, numeric) to authenticated;
--
-- 7. ghost_invoice_timer(uuid)
--    Defining migration: 20260925000100_watcher_multirole_ghost.sql:429-455.
--    search_path ✓, auth.uid() guard ✓, revoke ✓. No later migration touches it.
revoke all on function public.ghost_invoice_timer(uuid) from public, anon;
grant execute on function public.ghost_invoice_timer(uuid) to authenticated;
--
-- 8. ghost_mark_debt(uuid,uuid,uuid,numeric,text)
--    Defining migration: 20260925000100_watcher_multirole_ghost.sql:459-480.
--    search_path ✓, auth.uid() guard ✓, revoke ✓. No later migration touches it.
revoke all on function public.ghost_mark_debt(uuid, uuid, uuid, numeric, text) from public, anon;
grant execute on function public.ghost_mark_debt(uuid, uuid, uuid, numeric, text) to authenticated;
--
-- 9. ghost_org_summary(uuid)
--    Defining migration: 20260925000100_watcher_multirole_ghost.sql:533-597.
--    search_path ✓, auth.uid() guard ✓, revoke ✓. No later migration touches it.
revoke all on function public.ghost_org_summary(uuid) from public, anon;
grant execute on function public.ghost_org_summary(uuid) to authenticated;
--
-- 10. ghost_settle_debt(uuid,text)
--    Defining migration: 20260925000100_watcher_multirole_ghost.sql:483-500.
--    search_path ✓, auth.uid() guard ✓, revoke ✓. No later migration touches it.
revoke all on function public.ghost_settle_debt(uuid, text) from public, anon;
grant execute on function public.ghost_settle_debt(uuid, text) to authenticated;
