-- ============================================================================
-- DS-SECFIX2-10: reconcile lint 0029 lobby/match RPCs (seclint2 residual).
--
-- REVOKE-only: no bodies, triggers, tables, policies, or indexes touched.
-- Quick-match pairing, lobby create/join/list semantics, match-state writes,
-- and the mp event feed are byte-identical; only EXECUTE grants converge
-- here plus belt-and-braces search_path pins (definitions already carry
-- SET search_path = public; the ALTERs below converge it idempotently).
-- Rerunnable: every ALTER, REVOKE, and GRANT below is idempotent.
--
-- NAME NOTE: the envelope says "post/read_mp_event"; the actual DB functions
-- are public.post_mp_event(uuid,text,text) [SINGULAR post] and
-- public.read_mp_events(uuid,timestamptz,integer) [PLURAL read], both defined
-- in 20261110000000_gravegain_multiplayer.sql. No public.post_mp_events
-- (plural) exists anywhere in migrations -- nothing to harden under that name.
--
-- .rpc grep verdicts (v2/vcw4w, 2026-09-15; every caller below uses the
-- user-JWT client via createClient(), never the service client, so
-- authenticated EXECUTE must stay and anon must go):
--   KEEP authenticated (login-gated user-JWT .rpc caller exists):
--     create_lobby(text,text,text,text) .. POST app/api/lobbies/route.ts:79
--       (401 without login at route.ts:34)
--     join_lobby(uuid,text) .............. POST app/api/lobbies/[id]/join/route.ts:61
--       (401 without login at join/route.ts:16)
--     quick_match(text,text) ............. app/api/matches/route.ts:78
--       (dynamic rpcName at route.ts:47-51; 401 without login at route.ts:21)
--     gravegain_quick_match(text,text) ... app/api/matches/route.ts:78
--       (same dynamic rpcName branch for gravegain slugs; same 401 gate)
--     list_all_open_lobbies(text) ........ GET app/api/lobbies/route.ts:22
--       (?all=1 branch; 401 without login at route.ts:15)
--     list_joinable_lobbies(text) ........ GET app/api/lobbies/route.ts:23
--       (default branch; same 401 gate)
--     post_mp_event(uuid,text,text) ...... POST app/api/matches/[id]/events/route.ts:96
--       (401 without login at events/route.ts:61, participant-only 404s)
--     read_mp_events(uuid,timestamptz,integer) .. GET app/api/matches/[id]/events/route.ts:38
--       (401 without login at events/route.ts:18, participant-only 404s)
--     update_match_state(uuid,jsonb) ..... PUT app/api/matches/[id]/route.ts:98
--       (401 without login at [id]/route.ts:37, participant-only 404s)
--
-- INTENTIONALLY NO anon keeps: GET /api/lobbies 401s without a session
-- (app/api/lobbies/route.ts:15), so the lobby-list reads are NOT public
-- browser lists -- list_all_open_lobbies / list_joinable_lobbies stay
-- authenticated-only. No anonymous flow calls any of the other seven
-- (all routes 401 anon before reaching .rpc). Lint 0029 rows on these nine
-- are the app's intentional authenticated RPC surface and must keep firing.
--
-- DEDUP (verified, deliberately restated only to converge):
--   20261220000015_sqlint_revoke_game_match.sql already revokes
--     public/anon and grants authenticated on all nine exact signatures.
--     This file restates those nine idempotently AND pins search_path,
--     which 00015 did not (its scope was grants-only). No grant direction
--     changes: final state stays revoke public/anon, keep authenticated.
--   20261220000018_sqlint_revoke_booking_mmo.sql is booking/MMO/compute/
--     unitunite-domain only -- zero overlap with these nine; untouched.
--   20261219000004_seclint_anon_writes.sql and
--     20261219000009_seclint_auth_social.sql granted authenticated plus
--     service_role on subsets of these nine; 20261220000005 granted
--     authenticated-only; 00015 settled on authenticated-only. The live
--     callers are all user-JWT (serviceClient is used in these routes only
--     for age-band/profile reads, never for .rpc), so authenticated-only
--     is kept here, matching the governing 00015 file. service_role server
--     callers bypass grants and are unaffected either way.
-- ============================================================================

-- Match-state write: participant-only PUT, 401s anon.
alter function public.update_match_state(uuid, jsonb) set search_path = public;
revoke all on function public.update_match_state(uuid, jsonb) from public, anon;
grant execute on function public.update_match_state(uuid, jsonb) to authenticated;

-- Match event feed write: participant-only POST, 401s anon.
alter function public.post_mp_event(uuid, text, text) set search_path = public;
revoke all on function public.post_mp_event(uuid, text, text) from public, anon;
grant execute on function public.post_mp_event(uuid, text, text) to authenticated;

-- Match event feed read: participant-only GET, 401s anon.
alter function public.read_mp_events(uuid, timestamptz, integer) set search_path = public;
revoke all on function public.read_mp_events(uuid, timestamptz, integer) from public, anon;
grant execute on function public.read_mp_events(uuid, timestamptz, integer) to authenticated;

-- Quick match (platform-wars branch of POST /api/matches), login-gated.
alter function public.quick_match(text, text) set search_path = public;
revoke all on function public.quick_match(text, text) from public, anon;
grant execute on function public.quick_match(text, text) to authenticated;

-- Quick match (gravegain branch of POST /api/matches), login-gated.
alter function public.gravegain_quick_match(text, text) set search_path = public;
revoke all on function public.gravegain_quick_match(text, text) from public, anon;
grant execute on function public.gravegain_quick_match(text, text) to authenticated;

-- Lobby create: POST /api/lobbies, 401s anon.
alter function public.create_lobby(text, text, text, text) set search_path = public;
revoke all on function public.create_lobby(text, text, text, text) from public, anon;
grant execute on function public.create_lobby(text, text, text, text) to authenticated;

-- Lobby join: POST /api/lobbies/[id]/join, 401s anon.
alter function public.join_lobby(uuid, text) set search_path = public;
revoke all on function public.join_lobby(uuid, text) from public, anon;
grant execute on function public.join_lobby(uuid, text) to authenticated;

-- Lobby browser (?all=1): GET /api/lobbies 401s anon, NOT a public list.
alter function public.list_all_open_lobbies(text) set search_path = public;
revoke all on function public.list_all_open_lobbies(text) from public, anon;
grant execute on function public.list_all_open_lobbies(text) to authenticated;

-- Lobby browser (default): GET /api/lobbies 401s anon, NOT a public list.
alter function public.list_joinable_lobbies(text) set search_path = public;
revoke all on function public.list_joinable_lobbies(text) from public, anon;
grant execute on function public.list_joinable_lobbies(text) to authenticated;
