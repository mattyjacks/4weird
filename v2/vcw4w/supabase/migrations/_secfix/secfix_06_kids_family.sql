-- DS-SECLINT-06: kids/family RPC hardening (evidence-first slice).
--
-- SCOPE DEVIATION (noted in envelope log 2026-09-15T12:00:00.000Z): the
-- on-disk envelope text describes anon-read RPCs + a 20261219000006 file;
-- the direct task instruction orders the kids/family slice + this
-- _secfix/secfix_06_kids_family.sql file instead (precedent: SECLINT-02/08
-- logs). Proceeding per direct instruction; the anon-reads goal is untouched
-- by this file.
--
-- CRITICAL CONTEXT: kid play runs LOGGED-OUT. Children are NOT Supabase
-- users (20260924000002_family_accounts.sql:106-108: "Children have no
-- auth.jwt ... service_role + the SECURITY DEFINER RPCs below are the only
-- access path"). The play route reuses the anon-key server client for the
-- kid branch, so anon PostgREST EXECUTE on the session RPCs is load-bearing.
-- Rule applied per function: revoke anon ONLY with positive grep proof from
-- app callers that no logged-out flow needs it; else NO revoke +
-- needs-human-decision. authenticated is NEVER revoked (hard rule); paired
-- GRANTs below restore it in the same transaction. No bodies touched, no old
-- migrations edited, no app code.
--
-- PER-FUNCTION EVIDENCE (all verified by grep before writing):
--
-- GROUP A — anon EXECUTE REQUIRED (logged-out kid play). NO REVOKE. KEPT AS-IS.
--   A1. start_kid_session(uuid, char(64), text, text, integer, integer)
--   A2. heartbeat_kid_session(uuid, char(64), uuid, integer)
--   A3. end_kid_session(uuid, char(64), uuid)
--   Proof: app/api/games/session/route.ts:78 builds `supabase` via
--   createClient() = createServerClient(anon key) (lib/supabase/server.ts:20);
--   :80-85 no Supabase user -> kidSessionPlay(req, supabase) with the SAME
--   anon client; :320/:346/:363 call .rpc("start|heartbeat|end_kid_session").
--   A logged-out kid carries no JWT, so PostgREST executes these AS anon.
--   Repo gate scripts/verify-family.mjs:31-33 REQUIRES the anon grants
--   ("must be callable by anon (token-verified)"). Revoking anon breaks kid
--   play AND contradicts that gate's design intent.
--   NOTE: sibling 20261219000005_seclint_anon_kids.sql (DS-SECLINT-05, done)
--   revokes anon here; if applied, kid start/heartbeat/end via the current
--   route 403s/500s. See NEEDS-HUMAN below. This file deliberately issues NO
--   GRANT/REVOKE for A1-A3 (no fight with a done envelope).
--
-- GROUP B — parent-only, login-gated routes + auth.uid() body guards.
-- Positive proof of NO logged-out caller -> belt-and-braces anon revoke
-- (already revoked in defining migrations; re-affirm idempotent).
--   B1. create_kid_account(text, char(4), text, text)
--       Caller: app/api/family/kids/route.ts:129 (POST gated :77-79,
--       401 "Login required." + Adult-18+ band check :107-117). Body guard
--       family_accounts.sql:170 `if auth.uid() is null then raise 'login
--       required'`. Grants already authenticated-only (:187-188).
--   B2. close_kid_account(uuid)
--       Caller: app/api/family/kids/[id]/route.ts:154 (DELETE gated
--       :143-145, 401). Body guard :283-284. Latest body
--       20261018000000_ledger_pairing_hardening.sql:333 (same guard+grant
--       :358-359). Grants already authenticated-only.
--   B3. set_kid_controls(uuid, integer, time, time, text, numeric, boolean,
--       text, text)
--       Caller: [id]/route.ts:112 (PATCH gated :44-46, 401). Body guard
--       :196-197. Latest body 20261025000004_kid_unlimited_time.sql:11 (same
--       guard+grant :58-59). Grants already authenticated-only.
--   B4. set_kid_password(uuid, text)
--       Caller: [id]/route.ts:128 (same PATCH gate). Body guard :243.
--       Grants already authenticated-only (:251-252).
--
-- GROUP C — helpers with ZERO direct app callers. No logged-out (or any)
-- app flow needs anon -> anon revoke is safe. Nested SQL-internal calls
-- (which run as the SECURITY DEFINER owner and bypass grants) are unaffected.
--   C1. kid_session_owner(char(64)) — callers: SQL-internal only
--       (family_accounts.sql:319,412,481; newgameplus:239; audit_fixes:169).
--   C2. kid_in_window(uuid) — SQL-internal only (:328,415; newgameplus:248;
--       audit_fixes:172). lib/kid-session.ts:145-146 mirrors it in TS for
--       display; the RPC itself is never called from app code.
--   C3. kid_wallet_balance(uuid) — SQL-internal only (:272,287,379,449;
--       newgameplus:299; audit_fixes:206; ledger_pairing:283,344). Balances
--       reach the UI via service-role table reads (kids/route.ts GET,
--       lib/kid-session.ts:140-144), never this RPC.
--   C4. kid_seconds_today(uuid) — SQL-internal only (:330,419;
--       newgameplus:250; audit_fixes:176). "seconds_today" in
--       parent-dashboard.tsx arrives via the kids GET JSON, not this RPC.
--   Repo-wide grep for `.rpc("kid_...")` returns only server-route calls for
--   groups A/B and nothing for C1-C4. Direction matches DS-SECLINT-05.
--
-- SEARCH_PATH: every function above already carries an explicit SET in ALL
-- definitions (original + latest redefinitions), so per the "ALTER ... where
-- unset" rule ZERO ALTER FUNCTION statements are emitted:
--   family_accounts.sql:119,127,153,159,167,193,241,258,280,308,402,478;
--   newgameplus:228 (start); audit_fixes:159 (heartbeat);
--   kid_unlimited_time:14 (controls); ledger_pairing:268 (fund),334 (close).
-- (Linter 0011 is silenced by any explicit SET; `= public` keeps the
-- unqualified refs working. Widening to `public, pg_temp` was considered
-- and rejected: nothing is unset, so no change is the faithful action.)
--
-- NEEDS-HUMAN-DECISION (do NOT auto-apply; app-code or policy call):
--   H1. A1-A3 anon grants vs DS-SECLINT-05's revoke: both cannot hold. Either
--       (a) keep anon (kid play works; accept the 0028 anon-execute flag on
--       three token-bound RPCs), or (b) switch kidSessionPlay to
--       serviceClient() for the three RPCs (app-code change, owning lane)
--       and THEN revoke anon. Until (b) lands, any applied anon revoke on
--       A1-A3 breaks logged-out kid play.
--   H2. C1-C4 direct anon probing (curl with anon key) is closed by the
--       revokes below; no app flow depends on it (proof above). No action.
--
-- Rerunnable: REVOKE of a non-held privilege is a NOTICE no-op; GRANT is
-- idempotent. No CREATE OR REPLACE, no old-migration edits, no app code.
--

-- GROUP B: parent-only RPCs (evidence B1-B4 above). Anon/public revoked,
-- authenticated re-affirmed. Already authenticated-only upstream; no-op safe.
revoke all on function public.create_kid_account(text, char(4), text, text) from anon, public;
grant execute on function public.create_kid_account(text, char(4), text, text) to authenticated;

revoke all on function public.close_kid_account(uuid) from anon, public;
grant execute on function public.close_kid_account(uuid) to authenticated;

revoke all on function public.set_kid_controls(uuid, integer, time, time, text, numeric, boolean, text, text) from anon, public;
grant execute on function public.set_kid_controls(uuid, integer, time, time, text, numeric, boolean, text, text) to authenticated;

revoke all on function public.set_kid_password(uuid, text) from anon, public;
grant execute on function public.set_kid_password(uuid, text) to authenticated;

-- GROUP C: helper RPCs with zero direct app callers (evidence C1-C4 above).
-- Anon/public revoked; authenticated + service_role granted (service_role
-- bypasses grants anyway; explicit for parity with DS-SECLINT-05).
revoke all on function public.kid_session_owner(char(64)) from anon, public;
grant execute on function public.kid_session_owner(char(64)) to authenticated, service_role;

revoke all on function public.kid_in_window(uuid) from anon, public;
grant execute on function public.kid_in_window(uuid) to authenticated, service_role;

revoke all on function public.kid_wallet_balance(uuid) from anon, public;
grant execute on function public.kid_wallet_balance(uuid) to authenticated, service_role;

revoke all on function public.kid_seconds_today(uuid) from anon, public;
grant execute on function public.kid_seconds_today(uuid) to authenticated, service_role;

-- GROUP A (start/heartbeat/end_kid_session): intentionally NO statements.
-- Anon EXECUTE is load-bearing for logged-out kid play (evidence A1-A3;
-- verify-family.mjs:31-33 requires it). See H1 above.
