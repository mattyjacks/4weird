-- DS-SECLINT-07 (mmo/lobby slice, per user brief): belt-and-braces grant hardening
-- for MMO / lobby / match-event / booking / compute RPCs flagged by the linter.
--
-- ENVELOPE NOTE: the filed DS-SECLINT-07 goal covers trigger-only/internal RPCs
-- (scope: 20261219000007_seclint_auth_internal.sql, owner seclint-07). This file
-- is the user-briefed mmo/lobby slice instead (same override convention as the
-- seclint-04 log line of 2026-09-15T03:37:24Z). No old migration edited, no app
-- code touched. Sibling wave files already landed: 20261219000000_linter_search_path.sql,
-- 20261219000002_security_revoke_internals.sql.
--
-- NAME NOTE: the brief lists "post/read_mp_events"; the actual DB functions are
--   public.post_mp_event(uuid,text,text) [SINGULAR post] and
--   public.read_mp_events(uuid,timestamptz,integer) [plural read], both defined in
--   20261110000000_gravegain_multiplayer.sql:66,83. Both are hardened below. There is
--   no public.post_mp_events (plural) anywhere in migrations (grep: zero hits).
--
-- CONVENTION: ALTER FUNCTION ... SET search_path = public (idempotent pin against
-- function_search_path_mutable) + REVOKE ALL ... FROM PUBLIC, anon (anon can never
-- call these) + GRANT EXECUTE ... TO authenticated where proven. Authenticated is
-- NEVER revoked (hard rule). service_role bypasses grants, so no explicit grant is
-- needed for server-side callers. Every body below already carries
-- `SECURITY DEFINER SET search_path = public` AND an `auth.uid() IS NULL` guard
-- raising 'login required' / 'authentication required', so anon could never do
-- useful work through them even before this file.
--
-- ANON-SAFETY EVIDENCE (logged-out browsers checked before revoking anon):
--   * Lobby reads: GET app/api/lobbies/route.ts:10-15 401s ("Login required.") when
--     there is no user, THEN calls list_all_open_lobbies / list_joinable_lobbies
--     (lines 20-23). No anon flow. Anon revoke safe.
--   * Lobby writes: POST app/api/lobbies/route.ts:28-34 (create_lobby) and POST
--     app/api/lobbies/[id]/join/route.ts:10-16 (join_lobby) both 401 anon. Safe.
--   * Match state/events: PUT app/api/matches/[id]/route.ts:31-37 (update_match_state)
--     and GET/POST app/api/matches/[id]/events/route.ts:13-18,55-61 (read_mp_events /
--     post_mp_event) all 401 anon, plus participant-only 404s. Safe.
--   * Bookings: POST app/api/agents/route.ts:55-56 (create_listing), POST
--     app/api/agents/[id]/book/route.ts:36-38 (book_listing), POST
--     app/api/agents/bookings/[id]/heartbeat/route.ts:19-20 (heartbeat_usage), POST
--     app/api/agents/bookings/[id]/end/route.ts:22-23 (settle_booking_escrow +
--     end_booking) all 401 anon. Safe.
--   * Provision: POST app/api/cloud/provision/route.ts:20-23 (provision_service) 401s
--     anon. meter_usage(uuid,integer) has no direct .rpc caller in app/ (only a comment
--     ref in provision/route.ts:14); its body (20260910140000_unitunite_workspace_cut.sql:68-94)
--     raises 'login required' on null uid + requires cloud.usage.view perm, so anon
--     revoke is safe and the authenticated grant preserves the intended surface.
--   * MMO RPCs (all six): ZERO .rpc callers in app/lib/components (grep: only
--     migration hits). The live MMO surface is REST: GET app/api/presence/mmo/servers
--     (anon-accessible server browser, IP-rate-limited, reads mmo_servers TABLES
--     directly, never these RPCs) and POST app/api/presence/mmo/heartbeat (host
--     bearer-token, table writes, never these RPCs). So revoking anon EXECUTE on the
--     RPCs cannot break the logged-out server browser. The authenticated grant below
--     preserves the RPCs' login-guarded design intent for when the DS-MMO lane wires
--     them; bodies raise 'login required' on null uid either way.
--   * No later migration re-grants anon/PUBLIC on any function below (grep: zero
--     `grant ... to anon|public` on these names; pre-existing revokes already cover
--     booking/lobby/meter/provision/settle in their owning migrations -- this file is
--     belt-and-braces + closes the MMO + mp-event gaps).
--
-- Rerunnable: ALTER ... SET / REVOKE (non-held privilege revokes are a no-op NOTICE,
-- never an error) / GRANT are all idempotent. No CREATE OR REPLACE, no transaction
-- wrapper needed.
--
-- 1. create_mmo_server(text,text,uuid,text,integer,text,integer)
--    Defined 20261203000000_mmo_servers.sql:82-111. search_path ✓, auth.uid() ✓,
--    NO revoke in owning migration (gap closed here). No app caller yet (see above).
alter function public.create_mmo_server(text, text, uuid, text, integer, text, integer) set search_path = public;
revoke all on function public.create_mmo_server(text, text, uuid, text, integer, text, integer) from public, anon;
grant execute on function public.create_mmo_server(text, text, uuid, text, integer, text, integer) to authenticated;
--
-- 2. join_mmo_server(uuid)
--    Defined 20261203000001_mmo_membership.sql:137-162. search_path ✓, auth.uid() ✓,
--    NO revoke in owning migration (gap closed here). No app caller yet.
alter function public.join_mmo_server(uuid) set search_path = public;
revoke all on function public.join_mmo_server(uuid) from public, anon;
grant execute on function public.join_mmo_server(uuid) to authenticated;
--
-- 3. leave_mmo_server(uuid)
--    Defined 20261203000001_mmo_membership.sql:164-174. search_path ✓, auth.uid() ✓,
--    NO revoke in owning migration (gap closed here). No app caller yet.
alter function public.leave_mmo_server(uuid) set search_path = public;
revoke all on function public.leave_mmo_server(uuid) from public, anon;
grant execute on function public.leave_mmo_server(uuid) to authenticated;
--
-- 4. heartbeat_mmo_presence(uuid)
--    Defined 20261203000001_mmo_membership.sql:176-190. search_path ✓, auth.uid() ✓
--    (+ 'not joined' membership check), NO revoke in owning migration (gap closed
--    here). Live heartbeats go through POST /api/presence/mmo/heartbeat (bearer
--    token, table writes), NOT this RPC -- anon revoke cannot break it.
alter function public.heartbeat_mmo_presence(uuid) set search_path = public;
revoke all on function public.heartbeat_mmo_presence(uuid) from public, anon;
grant execute on function public.heartbeat_mmo_presence(uuid) to authenticated;
--
-- 5. charge_mmo_minutes(uuid,uuid,timestamptz,integer)
--    Defined 20261203000002_mmo_meter.sql:73-102. search_path ✓, auth.uid() ✓
--    (host-only: server must be hosted by caller), NO revoke in owning migration
--    (gap closed here). No app caller yet.
alter function public.charge_mmo_minutes(uuid, uuid, timestamptz, integer) set search_path = public;
revoke all on function public.charge_mmo_minutes(uuid, uuid, timestamptz, integer) from public, anon;
grant execute on function public.charge_mmo_minutes(uuid, uuid, timestamptz, integer) to authenticated;
--
-- 6. set_mmo_server_status(uuid,text)
--    Defined 20261203000000_mmo_servers.sql:113-127. search_path ✓, auth.uid() ✓
--    (host-only), NO revoke in owning migration (gap closed here). No app caller yet.
alter function public.set_mmo_server_status(uuid, text) set search_path = public;
revoke all on function public.set_mmo_server_status(uuid, text) from public, anon;
grant execute on function public.set_mmo_server_status(uuid, text) to authenticated;
--
-- 7. create_lobby(text,text,text,text)
--    Defined 20260910030000_lobbies_analytics_and_trial_credit.sql:21-25. search_path ✓,
--    revoke+grant already in owning migration:40-41 (belt-and-braces here). Caller:
--    POST app/api/lobbies/route.ts:79 (login-gated).
alter function public.create_lobby(text, text, text, text) set search_path = public;
revoke all on function public.create_lobby(text, text, text, text) from public, anon;
grant execute on function public.create_lobby(text, text, text, text) to authenticated;
--
-- 8. join_lobby(uuid,text)
--    Defined 20260910030000:29-32 (p_code defaults null; canonical sig (uuid,text)).
--    search_path ✓, revoke+grant already in owning migration:40-41. Caller:
--    POST app/api/lobbies/[id]/join/route.ts:61 (login-gated).
alter function public.join_lobby(uuid, text) set search_path = public;
revoke all on function public.join_lobby(uuid, text) from public, anon;
grant execute on function public.join_lobby(uuid, text) to authenticated;
--
-- 9. list_all_open_lobbies(text)
--    Defined 20260910030000:43-45 (p_game defaults null; canonical sig (text)).
--    search_path ✓, revoke+grant already in owning migration:46-47. Caller:
--    GET app/api/lobbies/route.ts:22 -- requires login (line 15), so NO logged-out
--    browser depends on anon EXECUTE. Safe.
alter function public.list_all_open_lobbies(text) set search_path = public;
revoke all on function public.list_all_open_lobbies(text) from public, anon;
grant execute on function public.list_all_open_lobbies(text) to authenticated;
--
-- 10. list_joinable_lobbies(text)
--    Defined 20260910030000:26-28. search_path ✓, revoke+grant already in owning
--    migration:40-41. Caller: GET app/api/lobbies/route.ts:23 (login-gated). Safe.
alter function public.list_joinable_lobbies(text) set search_path = public;
revoke all on function public.list_joinable_lobbies(text) from public, anon;
grant execute on function public.list_joinable_lobbies(text) to authenticated;
--
-- 11. post_mp_event(uuid,text,text) [SINGULAR -- see NAME NOTE above]
--    Defined 20261110000000_gravegain_multiplayer.sql:66-81. search_path ✓,
--    auth.uid() ✓ ('login required' + participant/active-match checks). Owning
--    migration grants authenticated (line 103) but never revokes anon/PUBLIC
--    (gap closed here). Caller: POST app/api/matches/[id]/events/route.ts:96
--    (login-gated + participant 404 + active-match 403).
alter function public.post_mp_event(uuid, text, text) set search_path = public;
revoke all on function public.post_mp_event(uuid, text, text) from public, anon;
grant execute on function public.post_mp_event(uuid, text, text) to authenticated;
--
-- 12. read_mp_events(uuid,timestamptz,integer)
--    Defined 20261110000000_gravegain_multiplayer.sql:83-100. search_path ✓,
--    auth.uid() ✓ ('login required' + participant check). Granted to authenticated
--    (line 104), never revoked for anon (gap closed here). Caller:
--    GET app/api/matches/[id]/events/route.ts:38 (login-gated + participant 404).
alter function public.read_mp_events(uuid, timestamptz, integer) set search_path = public;
revoke all on function public.read_mp_events(uuid, timestamptz, integer) from public, anon;
grant execute on function public.read_mp_events(uuid, timestamptz, integer) to authenticated;
--
-- 13. update_match_state(uuid,jsonb)
--    Defined 20260910020000_multiplayer_and_social_actions.sql:44-56. search_path ✓
--    (set search_path=public), granted to authenticated (line 58), never revoked
--    for anon (gap closed here). Caller: PUT app/api/matches/[id]/route.ts:98
--    (login-gated + participant 404 + active-match 403 + server-side state scrub).
alter function public.update_match_state(uuid, jsonb) set search_path = public;
revoke all on function public.update_match_state(uuid, jsonb) from public, anon;
grant execute on function public.update_match_state(uuid, jsonb) to authenticated;
--
-- 14. book_listing(uuid,integer)
--    LATEST body 20261018000000_ledger_pairing_hardening.sql:288-321 (auth.uid() ✓).
--    search_path ✓, revoke+grant already in owning migrations (20260910100000:232-233,
--    20260910120000:193-194, 20261018000000:320-321). Caller: POST
--    app/api/agents/[id]/book/route.ts:69 (login-gated).
alter function public.book_listing(uuid, integer) set search_path = public;
revoke all on function public.book_listing(uuid, integer) from public, anon;
grant execute on function public.book_listing(uuid, integer) to authenticated;
--
-- 15. create_listing(text,text,text,text,integer)
--    Defined 20260910100000_agent_rentals.sql:151-189 (auth.uid() ✓ 'authentication
--    required'), refreshed 20260914000000_agent_rentals_usd_xonotic.sql:52-96.
--    search_path ✓, revoke+grant in both (191/96). Caller: POST app/api/agents/route.ts:81
--    (login-gated).
alter function public.create_listing(text, text, text, text, integer) set search_path = public;
revoke all on function public.create_listing(text, text, text, text, integer) from public, anon;
grant execute on function public.create_listing(text, text, text, text, integer) to authenticated;
--
-- 16. end_booking(uuid)
--    Defined 20260910100000:284-312 (auth-gated), revoke+grant 311-312. Callers: POST
--    app/api/agents/bookings/[id]/end/route.ts:56,65 (login-gated; settle first, then end).
alter function public.end_booking(uuid) set search_path = public;
revoke all on function public.end_booking(uuid) from public, anon;
grant execute on function public.end_booking(uuid) to authenticated;
--
-- 17. heartbeat_usage(uuid,integer)
--    LATEST body 20260930000000_heartbeat_escrow_cap.sql:19-46 (auth.uid() ✓ + escrow
--    cap). search_path ✓, revoke+grant 45-46 (also 20260910100000:279-280,
--    20260910120000:222-223). Caller: POST app/api/agents/bookings/[id]/heartbeat/route.ts:54
--    (login-gated).
alter function public.heartbeat_usage(uuid, integer) set search_path = public;
revoke all on function public.heartbeat_usage(uuid, integer) from public, anon;
grant execute on function public.heartbeat_usage(uuid, integer) to authenticated;
--
-- 18. meter_usage(uuid,integer)
--    LATEST body 20260910140000_unitunite_workspace_cut.sql:68-94 (auth.uid() ✓ 'login
--    required' + cloud.usage.view perm + wallet-sufficiency check). search_path ✓,
--    revoke+grant 96-97 (also 20260910130000:1137-1138). No direct .rpc caller in app/
--    (comment ref only); authenticated grant preserves the intended metered-heartbeat
--    surface for the cloud lane.
alter function public.meter_usage(uuid, integer) set search_path = public;
revoke all on function public.meter_usage(uuid, integer) from public, anon;
grant execute on function public.meter_usage(uuid, integer) to authenticated;
--
-- 19. provision_service(uuid,uuid,text,text)
--    Defined 20260910130000_teams_enterprise_bundle.sql:1094-1113 (auth.uid() ✓ +
--    cloud.provision perm). search_path ✓, revoke+grant 1112-1113. Caller: POST
--    app/api/cloud/provision/route.ts:40 (login-gated).
alter function public.provision_service(uuid, uuid, text, text) set search_path = public;
revoke all on function public.provision_service(uuid, uuid, text, text) from public, anon;
grant execute on function public.provision_service(uuid, uuid, text, text) to authenticated;
--
-- 20. settle_booking_escrow(uuid)
--    LATEST body 20261019000000_crowns_earn_ledger.sql:343-398 (over
--    20261018000000:378-432; auth-gated). search_path ✓, revoke+grant in both
--    (20261018000000:431-432, 20261019000000:397-398). Caller: POST
--    app/api/agents/bookings/[id]/end/route.ts:48 (login-gated; runs before end_booking).
alter function public.settle_booking_escrow(uuid) set search_path = public;
revoke all on function public.settle_booking_escrow(uuid) from public, anon;
grant execute on function public.settle_booking_escrow(uuid) to authenticated;
