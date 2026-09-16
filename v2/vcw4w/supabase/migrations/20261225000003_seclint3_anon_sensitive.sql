-- ============================================================================
-- DS-SECLINT3-B03: Supabase lint anon EXECUTE on sensitive (CHEAP-mode).
-- Restates 20261222000003_seclint2_anon_sensitive.sql (no policy change for
-- the kid trio + 4-arg metering; re-pins search_path with pg_temp and
-- re-asserts the anon keep / phantom lockdown below).
--
-- KEEP anon justification: kid session branch uses the `kid_session` cookie
-- with no Supabase login (app/api/games/session/route.ts kidSessionPlay
-- falls through when supabase.auth.getUser() returns no user and calls
-- start/heartbeat/end_kid_session via supabase.rpc as anon; bodies
-- re-validate token hash server-side). Party feed/resolve/search are public
-- discovery (logged-out feed + public resolve/search routes call via anon).
-- Revoking anon would break logged-out kids play + public party browsing.
-- => REVOKE PUBLIC only; re-assert anon + authenticated + service_role.
--
-- LOCK DOWN justification: 5-arg meter_submission_charge(uuid, uuid, text,
-- numeric, numeric) is a phantom overload, server-only — no app .rpc caller
-- references it under that name (fleet ships the p_user-first shape as
-- meter_submission_charge_for via serviceClient only). A p_user-first
-- signature must never be client-callable.
--
-- RERUNNABLE ONLY: no CREATE TABLE / no CREATE FUNCTION / no DDL below —
-- ALTER ... SET search_path + REVOKE/GRANT only (absent-privilege REVOKE is
-- a WARNING, not an error). The phantom 5-arg block is conditional so the
-- file reruns whether or not that overload exists.
-- Exact signatures copied from shipped defs (20260924000002 :306/:401/:477;
-- 20261014000000_party_interop.sql :663/:232/:287;
-- 20261013000000_zip_vault_meshy.sql :250).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. start_kid_session(uuid, char(64), text, text, integer, integer): KEEP anon
--    (kid_session cookie branch, route.ts kidSessionPlay, no login by design).
-- --------------------------------------------------------------------------
alter function public.start_kid_session(uuid, char(64), text, text, integer, integer) set search_path = public, pg_temp;
revoke all on function public.start_kid_session(uuid, char(64), text, text, integer, integer) from public;
grant execute on function public.start_kid_session(uuid, char(64), text, text, integer, integer) to anon, authenticated, service_role;

-- --------------------------------------------------------------------------
-- 2. heartbeat_kid_session(uuid, char(64), uuid, integer): KEEP anon
--    (kid_session cookie branch, route.ts kidSessionPlay, no login by design).
-- --------------------------------------------------------------------------
alter function public.heartbeat_kid_session(uuid, char(64), uuid, integer) set search_path = public, pg_temp;
revoke all on function public.heartbeat_kid_session(uuid, char(64), uuid, integer) from public;
grant execute on function public.heartbeat_kid_session(uuid, char(64), uuid, integer) to anon, authenticated, service_role;

-- --------------------------------------------------------------------------
-- 3. end_kid_session(uuid, char(64), uuid): KEEP anon
--    (kid_session cookie branch, route.ts kidSessionPlay, no login by design).
-- --------------------------------------------------------------------------
alter function public.end_kid_session(uuid, char(64), uuid) set search_path = public, pg_temp;
revoke all on function public.end_kid_session(uuid, char(64), uuid) from public;
grant execute on function public.end_kid_session(uuid, char(64), uuid) to anon, authenticated, service_role;

-- --------------------------------------------------------------------------
-- 4. party_feed(integer): KEEP anon (party public feed, logged-out GET).
-- --------------------------------------------------------------------------
alter function public.party_feed(integer) set search_path = public, pg_temp;
revoke all on function public.party_feed(integer) from public;
grant execute on function public.party_feed(integer) to anon, authenticated, service_role;

-- --------------------------------------------------------------------------
-- 5. party_resolve(text, text): KEEP anon (party public resolve, no login).
-- --------------------------------------------------------------------------
alter function public.party_resolve(text, text) set search_path = public, pg_temp;
revoke all on function public.party_resolve(text, text) from public;
grant execute on function public.party_resolve(text, text) to anon, authenticated, service_role;

-- --------------------------------------------------------------------------
-- 6. party_search(text): KEEP anon (party public search, no login).
-- --------------------------------------------------------------------------
alter function public.party_search(text) set search_path = public, pg_temp;
revoke all on function public.party_search(text) from public;
grant execute on function public.party_search(text) to anon, authenticated, service_role;

-- --------------------------------------------------------------------------
-- 7. meter_submission_charge(uuid, uuid, text, numeric, numeric) 5-arg
--    p_user version: phantom overload, server-only. No app caller; a
--    p_user-first signature must never be client-callable (any caller could
--    charge any user). service_role only. Conditional so rerunnable whether
--    or not the overload exists.
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
    execute 'alter function public.meter_submission_charge(uuid, uuid, text, numeric, numeric) set search_path = public, pg_temp';
    revoke all on function public.meter_submission_charge(uuid, uuid, text, numeric, numeric)
      from public, anon, authenticated;
    grant execute on function public.meter_submission_charge(uuid, uuid, text, numeric, numeric)
      to service_role;
  end if;
end
$$;

-- --------------------------------------------------------------------------
-- 8. meter_submission_charge(uuid, text, numeric, numeric) 4-arg legit:
--    authenticated-only (user-JWT callers; anon must not hold EXECUTE).
-- --------------------------------------------------------------------------
alter function public.meter_submission_charge(uuid, text, numeric, numeric) set search_path = public, pg_temp;
revoke all on function public.meter_submission_charge(uuid, text, numeric, numeric) from public, anon;
grant execute on function public.meter_submission_charge(uuid, text, numeric, numeric) to authenticated, service_role;
