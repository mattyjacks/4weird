-- ============================================================================
-- DS-SECFIX2-02: reconcile lint 0028 anon-SECURITY-DEFINER public reads.
--
-- SCOPE (7 functions): clan_leaderboard, clan_minute_rate, clan_roster_page,
-- game_chart_summary, leaderboard_top, love_post_totals, love_profile_stats.
--
-- VERDICT: anon KEPT for all 7 — every one is provably required by a
-- logged-out GET route (verified 2026-09-15, .rpc grep + route auth check):
--   clan_leaderboard(uuid) — GET /api/clans/[slug] (app/api/clans/[slug]/
--     route.ts:180, public page; "Anonymous reads skip the write", no 401).
--   clan_minute_rate(uuid) — same public GET (:201; also channels/economy
--     login-gated callers, but the public GET needs it as anon).
--   clan_roster_page(uuid, integer, timestamptz, uuid) — same public GET
--     (:140, member sidebar; graceful legacy fallback hides a 403).
--   game_chart_summary() — GET /api/analytics (app/api/analytics/route.ts:14
--     uses an EXPLICIT anon client, "so anonymous visitors can read").
--   leaderboard_top(text, text) — GET /api/leaderboard
--     (app/api/leaderboard/route.ts:26, no auth gate; server createClient()
--     uses the anon key, so logged-out callers execute as anon).
--   love_post_totals(uuid) — GET /api/love/post/[id]
--     (app/api/love/post/[id]/route.ts:13, "public totals", no auth gate).
--   love_profile_stats(text) — GET /api/love/profile
--     (app/api/love/profile/route.ts:17, public stats; hidden profiles
--     already return zeroed counters inside the function body).
-- Revoking anon on any of these would silently empty public pages while
-- route fallbacks hide the 403. NOTHING is revoked from anon here.
--
-- PRIOR-MIGRATION DEDUP (all already-correct; restated idempotently so this
-- file converges the end-state even if a DB missed an earlier file):
--   clan x3 anon+authenticated: 20261220000012 §2 (latest writer for these).
--   love x2 anon+authenticated: 20261220000017 §2.
--   game_chart_summary() / leaderboard_top(text,text) anon+authenticated:
--     20261220000015 (applies after 20261219000009's anon revoke; latest
--     writer). community_stat_averages() is NOT in this set — anon-free per
--     20261221000000 (login-gated GET /api/stats), untouched here.
--   20261220000018 covers booking/MMO/compute/unitunite only — none of the
--     7 functions appear there. 20261222000000 (sibling envelope) only
--     touches meter_submission_charge + community_stat_averages — no overlap.
--
-- SEARCH_PATH: all 7 definitions already pin SET search_path = public
-- (clan_minute_rate: 20260916000000; game_chart_summary: 20260910030000;
-- love_post_totals: 20261001000000; clan_roster_page: 20261015000100;
-- leaderboard_top + love_profile_stats + clan_leaderboard: 20261207000000),
-- so no ALTER FUNCTION ... SET search_path is needed here.
--
-- REVOKE/GRANT-only, rerunnable (every statement idempotent). Exact overload
-- signatures copied from definitions. No tables/policies/triggers/indexes.
-- service_role bypasses grants and is unaffected.
-- ============================================================================

-- Clan public reads (public clan page GET; restate of 20261220000012 §2). ---
revoke all on function public.clan_leaderboard(uuid) from public;
grant execute on function public.clan_leaderboard(uuid) to anon, authenticated;

revoke all on function public.clan_minute_rate(uuid) from public;
grant execute on function public.clan_minute_rate(uuid) to anon, authenticated;

revoke all on function public.clan_roster_page(uuid, integer, timestamptz, uuid) from public;
grant execute on function public.clan_roster_page(uuid, integer, timestamptz, uuid) to anon, authenticated;

-- Game public reads (analytics + leaderboard GETs; restate of 20261220000015).
revoke all on function public.game_chart_summary() from public;
grant execute on function public.game_chart_summary() to anon, authenticated;

revoke all on function public.leaderboard_top(text, text) from public;
grant execute on function public.leaderboard_top(text, text) to anon, authenticated;

-- Love public reads (post/profile GETs; restate of 20261220000017 §2). ------
revoke all on function public.love_post_totals(uuid) from public;
grant execute on function public.love_post_totals(uuid) to anon, authenticated;

revoke all on function public.love_profile_stats(text) from public;
grant execute on function public.love_profile_stats(text) to anon, authenticated;
