-- ============================================================================
-- DS-SECFIX2-03: Supabase lint 0028 — anon EXECUTE on sensitive
-- SECURITY DEFINER functions.
--
-- CALLER MATRIX (verified 2026-09-15 by reading the live route sources;
-- all .rpc callers below go through the user-scoped `await createClient()`):
--
--   Kid session trio — ANON IS REQUIRED (keep anon + authenticated).
--   POST /api/games/session (app/api/games/session/route.ts:78-86): when
--   `supabase.auth.getUser()` returns no user, the request falls through to
--   `kidSessionPlay(req, supabase)` with the SAME logged-out client (anon
--   role). kidSessionPlay (route.ts:272-274) authenticates via the
--   `kid_session` cookie token (rawToken, no Supabase login) and calls:
--     start_kid_session     route.ts:320  via supabase.rpc (anon)
--     heartbeat_kid_session route.ts:346  via supabase.rpc (anon)
--     end_kid_session       route.ts:363  via supabase.rpc (anon)
--   The RPC bodies re-validate token hash, window, caps, and wallet
--   server-side. Revoking anon would break ALL child play (kids have no
--   Supabase login by design). => REVOKE public only; re-assert anon +
--   authenticated. Matches 20261220000014 §1 (no policy change here).
--
--   meter_submission_charge 4-arg (uuid, text, numeric, numeric) —
--   AUTHENTICATED-ONLY. Session callers use the auth.uid-guarded RPC via
--   the user-JWT client; bot-key callers use the service-only `_for` twin:
--     app/api/code/[id]/audit/route.ts:75  supabase.rpc (user JWT)
--     app/api/code/zip/route.ts:159        supabase.rpc (user JWT)
--   The body raises unless auth.uid() is set, but anon must still not hold
--   EXECUTE. => REVOKE public + anon; GRANT authenticated.
--   Matches 20261220000016 + 20261222000000 §2 (no policy change here).
--
--   meter_submission_charge 5-arg phantom
--   (uuid, uuid, text, numeric, numeric) — SERVER-SIDE-ONLY IF PRESENT.
--   No app .rpc caller references this overload under that name (this fleet
--   ships the p_user-first shape as meter_submission_charge_for, called only
--   via serviceClient() in audit/zip routes). A p_user-first signature must
--   never be client-callable (any caller could charge any user). This
--   supersedes the conditional authenticated grant in
--   20261219000006_seclint_anon_reads.sql and restates 20261222000000 §1 /
--   20261220000003's guard. Conditional DO block: rerunnable whether or not
--   the overload exists.
--
--   meter_submission_charge_for(uuid, uuid, text, numeric, numeric) —
--   SERVER-SIDE-ONLY (service_role + owner keep execute; revokes below are
--   per-role so the service_role grant from 20261219000008 is untouched).
--   Only callers are svc/serviceClient() in audit (:66) + zip (:150)
--   after bot scope checks. Restates 20261220000016 (no policy change).
--
--   community_stat_averages() — AUTHENTICATED-ONLY. Sole app caller is the
--   login-gated GET /api/stats (app/api/stats/route.ts:12-14 returns 401
--   "Login required" without a session; rpc at :47 via the user client).
--   Restates 20261221000000 + 20261222000000 §3, superseding the anon grant
--   in 20261220000017 §2 / 20261220000006 §5 (no policy change here).
--
-- DEDUP: every statement below converges on the policy already shipped by
-- 20261220000014/00016 + 20261221000000 + 20261222000000. REVOKE/GRANT and
-- ALTER ... SET search_path are idempotent (absent-privilege REVOKE is a
-- WARNING, not an error), so this file is rerunnable.
-- NO DDL: no CREATE/OR REPLACE bodies, tables, policies, triggers, or
-- indexes. Exact signatures copied from the shipped definitions
-- (20260924000002_family_accounts.sql:306/401/477;
-- 20261013000000_zip_vault_meshy.sql:250/305;
-- 20260910020000_multiplayer_and_social_actions.sql:59).
-- Bodies already carry SET search_path = public; the ALTER pins below
-- restate it idempotently per the SECFIX2 contract.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Kid session trio: revoke PUBLIC only; re-assert anon + authenticated.
--    (Anon proven required: logged-out kid-cookie flow, route.ts:80-86.)
-- --------------------------------------------------------------------------
alter function public.start_kid_session(uuid, char(64), text, text, integer, integer) set search_path = public;
revoke all on function public.start_kid_session(uuid, char(64), text, text, integer, integer) from public;
grant execute on function public.start_kid_session(uuid, char(64), text, text, integer, integer) to anon, authenticated;

alter function public.heartbeat_kid_session(uuid, char(64), uuid, integer) set search_path = public;
revoke all on function public.heartbeat_kid_session(uuid, char(64), uuid, integer) from public;
grant execute on function public.heartbeat_kid_session(uuid, char(64), uuid, integer) to anon, authenticated;

alter function public.end_kid_session(uuid, char(64), uuid) set search_path = public;
revoke all on function public.end_kid_session(uuid, char(64), uuid) from public;
grant execute on function public.end_kid_session(uuid, char(64), uuid) to anon, authenticated;

-- --------------------------------------------------------------------------
-- 2. meter_submission_charge 4-arg: authenticated-only.
-- --------------------------------------------------------------------------
alter function public.meter_submission_charge(uuid, text, numeric, numeric) set search_path = public;
revoke all on function public.meter_submission_charge(uuid, text, numeric, numeric) from public, anon;
grant execute on function public.meter_submission_charge(uuid, text, numeric, numeric) to authenticated;

-- --------------------------------------------------------------------------
-- 3. Phantom 5-arg overload meter_submission_charge(uuid, uuid, text,
--    numeric, numeric): server-side-only IF present (conditional so the file
--    reruns on fleets that only ship the _for twin).
-- --------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'meter_submission_charge'
      and pg_get_function_identity_arguments(p.oid) = 'uuid, uuid, text, numeric, numeric'
  ) then
    revoke all on function public.meter_submission_charge(uuid, uuid, text, numeric, numeric)
      from public, anon, authenticated;
  end if;
end
$$;

-- --------------------------------------------------------------------------
-- 4. meter_submission_charge_for: server-side-only (service_role kept).
-- --------------------------------------------------------------------------
alter function public.meter_submission_charge_for(uuid, uuid, text, numeric, numeric) set search_path = public;
revoke all on function public.meter_submission_charge_for(uuid, uuid, text, numeric, numeric) from public, anon, authenticated;

-- --------------------------------------------------------------------------
-- 5. community_stat_averages: authenticated-only.
-- --------------------------------------------------------------------------
alter function public.community_stat_averages() set search_path = public;
revoke all on function public.community_stat_averages() from public, anon;
grant execute on function public.community_stat_averages() to authenticated, service_role;
