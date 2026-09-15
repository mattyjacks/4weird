-- ============================================================================
-- DS-SQLINT-06: revoke anon/auth EXECUTE on game/match/cheat RPCs (0028/0029).
--
-- REVOKE-only: no bodies, triggers, tables, policies, or indexes touched.
-- Cheat invariants (enforce_cheat_save_marker, strip_slot_zero_cheat_marker)
-- and metering math (start/heartbeat/end_game_session, my_game_play_usage)
-- are byte-identical; only EXECUTE grants change. Rerunnable: every REVOKE
-- and GRANT below is idempotent. Follows the timer_ownership pattern
-- (20261113000000_timer_ownership_hardening.sql): revoke from public/anon,
-- grant back to authenticated only where the app calls .rpc(name).
--
-- .rpc grep verdicts (v2/vcw4w, 2026-09-15; service_role server callers are
-- unaffected by anon/authenticated revokes):
--   KEEP authenticated (user-JWT .rpc caller exists):
--     set_cheat_setting(text,smallint,boolean) .. app/api/cheats/route.ts
--     set_game_rate(text,integer,integer) ..... app/api/games/rates/route.ts
--     start_game_session(text,text,integer) ... app/api/games/session/route.ts
--     heartbeat_game_session(uuid,integer) ... app/api/games/session/route.ts
--     end_game_session(uuid) ................. app/api/games/session/route.ts
--     my_game_play_usage() ................... app/api/my/usage/route.ts
--     update_match_state(uuid,jsonb) ......... app/api/matches/[id]/route.ts
--     post_mp_event(uuid,text,text) .......... app/api/matches/[id]/events/route.ts
--     read_mp_events(uuid,timestamptz,integer)  app/api/matches/[id]/events/route.ts
--     quick_match(text,text) ................. app/api/matches/route.ts (login-gated)
--     gravegain_quick_match(text,text) ....... app/api/matches/route.ts (login-gated)
--     create_lobby(text,text,text,text) ...... app/api/lobbies/route.ts (login-gated)
--     join_lobby(uuid,text) .................. app/api/lobbies/[id]/join/route.ts
--     list_all_open_lobbies(text) ............ app/api/lobbies/route.ts (401 without login)
--     list_joinable_lobbies(text) ............ app/api/lobbies/route.ts (401 without login)
--   REVOKE authenticated too (zero app .rpc callers):
--     enforce_cheat_save_marker() ............ trigger-only (also revoked by
--       20261219000002_security_revoke_internals.sql; restated, idempotent)
--     strip_slot_zero_cheat_marker() ......... trigger-only (same as above)
--     add_game_developer(text,uuid) .......... no app caller; admin onboarding
--       path per skill.md (matt@mattyjacks.com) must grant back / use
--       service_role if ever wired to a user-JWT caller.
--
-- INTENTIONALLY PUBLIC (anon kept; anonymous reads are by design per skill.md
-- -- these return aggregate counts / handles+totals only, no user IDs, emails,
-- -- or per-session rows; bodies already privacy-filter):
--   game_chart_summary() ......... app/api/analytics/route.ts uses an explicit
--     ANON client (no session) so anonymous visitors read aggregate counts.
--   leaderboard_top(text,text) ... public leaderboard page, no login required;
--     returns handles plus summed totals only.
-- Lobby-list reads are NOT public: GET /api/lobbies 401s without a session,
-- so list_all_open_lobbies / list_joinable_lobbies stay authenticated-only.
-- ============================================================================

-- Trigger-only helpers: no direct calls, ever (triggers run as owner).
revoke all on function public.enforce_cheat_save_marker() from public, anon, authenticated;
revoke all on function public.strip_slot_zero_cheat_marker() from public, anon, authenticated;

-- Admin onboarding RPC with no app caller: close to client roles entirely.
revoke all on function public.add_game_developer(text, uuid) from public, anon, authenticated;

-- Authenticated player/developer RPCs: close anon, keep user-JWT access.
revoke all on function public.set_cheat_setting(text, smallint, boolean) from public, anon;
grant execute on function public.set_cheat_setting(text, smallint, boolean) to authenticated;

revoke all on function public.set_game_rate(text, integer, integer) from public, anon;
grant execute on function public.set_game_rate(text, integer, integer) to authenticated;

revoke all on function public.start_game_session(text, text, integer) from public, anon;
grant execute on function public.start_game_session(text, text, integer) to authenticated;

revoke all on function public.heartbeat_game_session(uuid, integer) from public, anon;
grant execute on function public.heartbeat_game_session(uuid, integer) to authenticated;

revoke all on function public.end_game_session(uuid) from public, anon;
grant execute on function public.end_game_session(uuid) to authenticated;

revoke all on function public.my_game_play_usage() from public, anon;
grant execute on function public.my_game_play_usage() to authenticated;

revoke all on function public.update_match_state(uuid, jsonb) from public, anon;
grant execute on function public.update_match_state(uuid, jsonb) to authenticated;

revoke all on function public.post_mp_event(uuid, text, text) from public, anon;
grant execute on function public.post_mp_event(uuid, text, text) to authenticated;

revoke all on function public.read_mp_events(uuid, timestamptz, integer) from public, anon;
grant execute on function public.read_mp_events(uuid, timestamptz, integer) to authenticated;

revoke all on function public.quick_match(text, text) from public, anon;
grant execute on function public.quick_match(text, text) to authenticated;

revoke all on function public.gravegain_quick_match(text, text) from public, anon;
grant execute on function public.gravegain_quick_match(text, text) to authenticated;

revoke all on function public.create_lobby(text, text, text, text) from public, anon;
grant execute on function public.create_lobby(text, text, text, text) to authenticated;

revoke all on function public.join_lobby(uuid, text) from public, anon;
grant execute on function public.join_lobby(uuid, text) to authenticated;

revoke all on function public.list_all_open_lobbies(text) from public, anon;
grant execute on function public.list_all_open_lobbies(text) to authenticated;

revoke all on function public.list_joinable_lobbies(text) from public, anon;
grant execute on function public.list_joinable_lobbies(text) to authenticated;

-- Intentionally public aggregate reads: strip the PUBLIC default but keep the
-- explicit anon + authenticated grants (see header for why anon must stay).
revoke all on function public.game_chart_summary() from public;
grant execute on function public.game_chart_summary() to anon, authenticated;

revoke all on function public.leaderboard_top(text, text) from public;
grant execute on function public.leaderboard_top(text, text) to anon, authenticated;
