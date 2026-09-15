-- secfix_05_games.sql — DS-SECLINT-05 games/saves/leaderboard slice (user re-slice).
-- Envelope on disk still names the kids slice (sibling seclint-05 owns that);
-- THIS file covers ONLY the 14 games/saves/leaderboard RPCs below.
--
-- Method per function: defining migration grepped for exact arg list +
-- existing search_path/grants; app+components+lib grepped for callers to prove
-- whether logged-out (anon-role incl. guest-pass) traffic can reach it.
-- Guest-pass flow (app/api/games/guest-pass/route.ts) issues ZERO RPC calls:
-- guests play on IP quota + house ads and never touch these functions pre-login.
--
-- HARD RULES honored: authenticated is never revoked (only re-granted);
-- anon/PUBLIC revoke appears ONLY where caller + body evidence shows no
-- legitimate logged-out use; old migrations untouched; no app code touched.
-- Rerunnable: ALTER ... SET / REVOKE / GRANT are all idempotent.
-- NOTE: this _secfix/ staging file carries no <timestamp>_ prefix, so it is
-- invisible to `supabase db push` and to scripts/verify-migration-versions.mjs
-- (both scan only top-level <timestamp>_name.sql). A human must fold it into
-- a timestamped migration before deploy.

-- 1. start_game_session(text,text,integer) — REVOKE anon
-- Def: 20261207000000_security_audit_fixes.sql:70, security definer,
-- search_path=public; body raises 'login required' when auth.uid() is null.
-- Prior grants: REVOKE ALL FROM public,anon,authenticated + GRANT authenticated
-- (20261207000000:154-155; same in 20260910170000, 20260913000000, 20261022000000).
-- Callers: app/api/games/session/route.ts:199 via the caller's own session
-- client; logged-out callers branch to kidSessionPlay (start_kid_session, never
-- this fn) or get 401. No anon path.
ALTER FUNCTION public.start_game_session(text, text, integer) SET search_path = public;
REVOKE ALL ON FUNCTION public.start_game_session(text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_game_session(text, text, integer) TO authenticated;

-- 2. heartbeat_game_session(uuid,integer) — REVOKE anon
-- Def: 20261207000000_security_audit_fixes.sql:9, security definer,
-- search_path=public; 'login required' + 300s authority cap in-body.
-- Prior grants: REVOKE ALL FROM public,anon,authenticated + GRANT authenticated
-- (20261207000000:65-66; same in 20260910170000, 20260913000000).
-- Callers: app/api/games/session/route.ts:244, session-scoped client only
-- (plus kid-row redirect guard); guest-pass issues no RPCs. No anon path.
ALTER FUNCTION public.heartbeat_game_session(uuid, integer) SET search_path = public;
REVOKE ALL ON FUNCTION public.heartbeat_game_session(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.heartbeat_game_session(uuid, integer) TO authenticated;

-- 3. end_game_session(uuid) — REVOKE anon
-- Def: 20260910170000_game_rentals.sql:310, security definer,
-- search_path=public; 'login required', owns-session check in-body.
-- Prior grants: REVOKE ALL FROM public,anon,authenticated + GRANT authenticated
-- (:325-326). Callers: app/api/games/session/route.ts:261 only. No anon path.
ALTER FUNCTION public.end_game_session(uuid) SET search_path = public;
REVOKE ALL ON FUNCTION public.end_game_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.end_game_session(uuid) TO authenticated;

-- 4. set_cheat_setting(text,smallint,boolean) — REVOKE anon
-- Def: 20261026000000_save_slot_zero.sql:23 (also 20260910010000:48),
-- security definer, search_path=public; slot-0 cheat-proof guard in-body.
-- Prior grants: GRANT authenticated ONLY, no REVOKE ever issued, so the
-- default PUBLIC EXECUTE may still cover anon -> this REVOKE closes the gap.
-- Callers: app/api/cheats/route.ts:80 behind 401 login (GET+PUT both);
-- app/api/saves/route.ts mentions it in a comment only (no .rpc call) — the
-- mark is applied by the trigger below. No anon path.
ALTER FUNCTION public.set_cheat_setting(text, smallint, boolean) SET search_path = public;
REVOKE ALL ON FUNCTION public.set_cheat_setting(text, smallint, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_cheat_setting(text, smallint, boolean) TO authenticated;

-- 5. enforce_cheat_save_marker() — trigger-only, REVOKE anon
-- Def: 20261207000000_security_audit_fixes.sql:460 (also 20260910060000:2),
-- returns trigger, security definer, search_path=public. NO grant/revoke lines
-- exist anywhere -> default PUBLIC EXECUTE applies -> this REVOKE closes it.
-- Callers: none via RPC anywhere in app/components/lib; fires only from
-- trg_enforce_cheat_save_marker on game_saves (whose RLS policies admit only
-- authenticated writes). Trigger firing is unaffected by EXECUTE revokes;
-- authenticated + service_role keep explicit grants so every write path works.
ALTER FUNCTION public.enforce_cheat_save_marker() SET search_path = public;
REVOKE ALL ON FUNCTION public.enforce_cheat_save_marker() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enforce_cheat_save_marker() TO authenticated, service_role;

-- 6. strip_slot_zero_cheat_marker() — trigger-only, REVOKE anon
-- Def: 20261026000000_save_slot_zero.sql:32, returns trigger, security
-- definer, search_path=public. NO grant/revoke lines exist -> default PUBLIC
-- EXECUTE applies -> this REVOKE closes it.
-- Callers: none via RPC anywhere in app/components/lib; fires only from
-- trg_strip_slot_zero_cheat_marker on game_saves (authenticated-only RLS).
-- Same trigger-firing note as (5).
ALTER FUNCTION public.strip_slot_zero_cheat_marker() SET search_path = public;
REVOKE ALL ON FUNCTION public.strip_slot_zero_cheat_marker() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.strip_slot_zero_cheat_marker() TO authenticated, service_role;

-- 7. leaderboard_top(text,text) — PUBLIC READ, anon KEPT (evidence, no revoke)
-- Def: 20261207000000_security_audit_fixes.sql:487, security definer,
-- search_path=public; privacy filter in-body (shy/private profiles skipped).
-- Prior grants: REVOKE ALL FROM public,anon,authenticated + GRANT TO
-- anon,authenticated (:495-496) — anon is INTENTIONAL.
-- Callers: app/api/leaderboard/route.ts:26, public GET with no auth; logged-out
-- visitors run it as the anon role. skill.md: leaderboards "anonymous OK".
-- Revoking anon would break the public leaderboard page. Grant re-asserted.
ALTER FUNCTION public.leaderboard_top(text, text) SET search_path = public;
GRANT EXECUTE ON FUNCTION public.leaderboard_top(text, text) TO anon, authenticated;

-- 8. game_chart_summary() — PUBLIC READ, anon KEPT (evidence, no revoke)
-- Def: 20260910030000_lobbies_analytics_and_trial_credit.sql:33, security
-- definer, search_path=public; aggregate presence counts only, no PII.
-- Prior grants: GRANT TO anon,authenticated (:42) — anon is INTENTIONAL.
-- Callers: app/api/analytics/route.ts:14 uses an explicit anon-key client,
-- commented "so anonymous visitors can read aggregate player counts".
-- Revoking anon would break public analytics. Grant re-asserted.
ALTER FUNCTION public.game_chart_summary() SET search_path = public;
GRANT EXECUTE ON FUNCTION public.game_chart_summary() TO anon, authenticated;

-- 9. my_game_play_usage() — REVOKE anon
-- Def: 20261022000000_newgameplus_metering.sql:330 (also 20260910170000:330,
-- 20260913000000:240), security definer, search_path=public;
-- 'login required', per-auth.uid() rollup in-body.
-- Prior grants: REVOKE ALL FROM public,anon,authenticated + GRANT authenticated
-- (20261022000000:391-392 and predecessors).
-- Callers: app/api/my/usage/route.ts:242, behind 401 auth (route.ts:64-65).
-- No anon path.
ALTER FUNCTION public.my_game_play_usage() SET search_path = public;
REVOKE ALL ON FUNCTION public.my_game_play_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_game_play_usage() TO authenticated;

-- 10. set_game_rate(text,integer,integer) — REVOKE anon
-- Def: 20260910170000_game_rentals.sql:143, security definer,
-- search_path=public; mapped-developer-or-admin check in-body.
-- Prior grants: REVOKE ALL FROM public,anon,authenticated + GRANT authenticated
-- (:175-176). Callers: app/api/games/rates/route.ts:78 (PUT, 401 login).
-- No anon path.
ALTER FUNCTION public.set_game_rate(text, integer, integer) SET search_path = public;
REVOKE ALL ON FUNCTION public.set_game_rate(text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_game_rate(text, integer, integer) TO authenticated;

-- 11. add_game_developer(text,uuid) — REVOKE anon
-- Def: 20260910170000_game_rentals.sql:126, security definer,
-- search_path=public; admin app_metadata check in-body.
-- Prior grants: REVOKE ALL FROM public,anon,authenticated + GRANT authenticated
-- (:139-140). Callers: NONE in app/components/lib/scripts (only a token in
-- scripts/verify-game-rentals.mjs:43); admin onboarding path (console/SQL).
-- No anon path possible; authenticated grant retained for admin use.
ALTER FUNCTION public.add_game_developer(text, uuid) SET search_path = public;
REVOKE ALL ON FUNCTION public.add_game_developer(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_game_developer(text, uuid) TO authenticated;

-- 12. gravegain_quick_match(text,text) — REVOKE anon (closes grant-only gap)
-- Def: 20261110000000_gravegain_multiplayer.sql:35, security definer,
-- search_path=public; 'login required' in-body.
-- Prior grants: GRANT authenticated ONLY (:102), no REVOKE ever issued, so the
-- default PUBLIC EXECUTE may still cover anon -> this REVOKE closes the gap.
-- Callers: app/api/matches/route.ts:72 (gravegain branch) behind 401 login
-- (route.ts:21). No anon path. (Also in DS-SECLINT-04 scope; idempotent here.)
ALTER FUNCTION public.gravegain_quick_match(text, text) SET search_path = public;
REVOKE ALL ON FUNCTION public.gravegain_quick_match(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gravegain_quick_match(text, text) TO authenticated;

-- 13. quick_match(text,text) — REVOKE anon (closes grant-only gap)
-- Def: 20260910020000_multiplayer_and_social_actions.sql:27, security definer,
-- search_path=public; auth.uid() null rejected in-body.
-- Prior grants: GRANT authenticated ONLY (:58), no REVOKE ever issued ->
-- default PUBLIC EXECUTE may still cover anon -> this REVOKE closes the gap.
-- Callers: app/api/matches/route.ts:72 (platform-wars branch) behind 401 login.
-- No anon path. (Also in DS-SECLINT-04 scope; idempotent here.)
ALTER FUNCTION public.quick_match(text, text) SET search_path = public;
REVOKE ALL ON FUNCTION public.quick_match(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quick_match(text, text) TO authenticated;

-- 14. purchase_cosmetic_item(text,text,numeric) — REVOKE anon
-- Def: 20261116000004_sec_econ_hardening.sql:42 (also 20260921000000:72),
-- security definer, search_path=public; 'login required' + spend lock in-body.
-- Prior grants: REVOKE ALL FROM public,anon,authenticated + GRANT authenticated
-- (:79-80 and predecessor). Callers: app/api/cosmetics/buy/route.ts:67 behind
-- 401 auth (route.ts:29). No anon path.
ALTER FUNCTION public.purchase_cosmetic_item(text, text, numeric) SET search_path = public;
REVOKE ALL ON FUNCTION public.purchase_cosmetic_item(text, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_cosmetic_item(text, text, numeric) TO authenticated;
