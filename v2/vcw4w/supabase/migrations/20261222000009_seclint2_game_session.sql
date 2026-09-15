-- ============================================================================
-- DS-SECFIX2-09: lint 0029 on game-session RPCs (reconcile vs 20261220000015).
--
-- REVOKE-only: no bodies, tables, policies, triggers, or indexes touched.
-- Session/metering math (start/heartbeat/end_game_session,
-- start/end_buddy_session, buddy_get/save_memory, set_cheat_setting,
-- set_game_rate, my_compute_usage, my_game_play_usage) is byte-identical;
-- only EXECUTE grants change. Every REVOKE/GRANT below is idempotent
-- (revoking an absent privilege is a WARNING, not an error), and every
-- ALTER ... SET search_path restates the already-shipped pin, so the file
-- is rerunnable. Follows the timer_ownership pattern
-- (20261113000000_timer_ownership_hardening.sql): revoke from public/anon,
-- grant back to authenticated only where the app calls .rpc(name).
--
-- Reconciliation vs 20261220000015_sqlint_revoke_game_match.sql (which
-- already closed anon on 6 of these 11, restated here idempotently):
--   ALREADY CLOSED there, restated here (anon-free, authenticated kept):
--     set_cheat_setting(text,smallint,boolean)
--     set_game_rate(text,integer,integer)
--     start_game_session(text,text,integer)
--     heartbeat_game_session(uuid,integer)
--     end_game_session(uuid)
--     my_game_play_usage()
--   CLOSED ELSEWHERE, restated here (anon-free, authenticated kept):
--     my_compute_usage(uuid) .... 20261220000016 (+007, +19000008)
--     buddy_get_memory(text) .... 20261220000017 (+19000009)
--   NEWLY CLOSED by this file (anon revoked, authenticated kept):
--     start_buddy_session(text,text)
--     end_buddy_session(uuid)
--     buddy_save_memory(text,text)
--
-- .rpc grep verdicts (v2/vcw4w, 2026-09-15; service_role server callers are
-- unaffected by anon/authenticated revokes) — KEEP authenticated, every
-- one has a user-JWT .rpc caller:
--     start_game_session(text,text,integer) .. app/api/games/session/route.ts
--     heartbeat_game_session(uuid,integer) ... app/api/games/session/route.ts
--     end_game_session(uuid) ................. app/api/games/session/route.ts
--     start_buddy_session(text,text) ......... app/api/buddy/session/route.ts
--     end_buddy_session(uuid) ................ app/api/buddy/session/route.ts
--     buddy_get_memory(text) ................. app/api/buddy/memory/route.ts
--       (+ app/api/buddy/chat/route.ts)
--     buddy_save_memory(text,text) ........... app/api/buddy/memory/route.ts
--       (+ app/api/buddy/chat/route.ts)
--     set_cheat_setting(text,smallint,boolean)  app/api/cheats/route.ts
--     set_game_rate(text,integer,integer) ..... app/api/games/rates/route.ts
--     my_compute_usage(uuid) ................. app/api/my/usage/route.ts
--     my_game_play_usage() ................... app/api/my/usage/route.ts
-- Bodies already enforce login (auth.uid() null raises) and row ownership,
-- so authenticated-only EXECUTE matches the code's trust model.
-- ============================================================================

-- Game play sessions: close anon, keep user-JWT access. ----------------------
alter function public.start_game_session(text, text, integer) set search_path = public;
revoke all on function public.start_game_session(text, text, integer) from public, anon;
grant execute on function public.start_game_session(text, text, integer) to authenticated;

alter function public.heartbeat_game_session(uuid, integer) set search_path = public;
revoke all on function public.heartbeat_game_session(uuid, integer) from public, anon;
grant execute on function public.heartbeat_game_session(uuid, integer) to authenticated;

alter function public.end_game_session(uuid) set search_path = public;
revoke all on function public.end_game_session(uuid) from public, anon;
grant execute on function public.end_game_session(uuid) to authenticated;

-- Buddy sessions: close anon, keep user-JWT access. --------------------------
alter function public.start_buddy_session(text, text) set search_path = public;
revoke all on function public.start_buddy_session(text, text) from public, anon;
grant execute on function public.start_buddy_session(text, text) to authenticated;

alter function public.end_buddy_session(uuid) set search_path = public;
revoke all on function public.end_buddy_session(uuid) from public, anon;
grant execute on function public.end_buddy_session(uuid) to authenticated;

-- Buddy memory (sole writers; RLS denies direct DML): close anon. ------------
alter function public.buddy_get_memory(text) set search_path = public;
revoke all on function public.buddy_get_memory(text) from public, anon;
grant execute on function public.buddy_get_memory(text) to authenticated;

alter function public.buddy_save_memory(text, text) set search_path = public;
revoke all on function public.buddy_save_memory(text, text) from public, anon;
grant execute on function public.buddy_save_memory(text, text) to authenticated;

-- Cheat / rate admin-player RPCs: close anon, keep user-JWT access. ----------
alter function public.set_cheat_setting(text, smallint, boolean) set search_path = public;
revoke all on function public.set_cheat_setting(text, smallint, boolean) from public, anon;
grant execute on function public.set_cheat_setting(text, smallint, boolean) to authenticated;

alter function public.set_game_rate(text, integer, integer) set search_path = public;
revoke all on function public.set_game_rate(text, integer, integer) from public, anon;
grant execute on function public.set_game_rate(text, integer, integer) to authenticated;

-- Self-read usage rollups: close anon, keep user-JWT access. -----------------
alter function public.my_compute_usage(uuid) set search_path = public;
revoke all on function public.my_compute_usage(uuid) from public, anon;
grant execute on function public.my_compute_usage(uuid) to authenticated;

alter function public.my_game_play_usage() set search_path = public;
revoke all on function public.my_game_play_usage() from public, anon;
grant execute on function public.my_game_play_usage() to authenticated;
