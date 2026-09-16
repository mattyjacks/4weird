-- ============================================================================
-- SECLINT3 B02 (CHEAP-mode): pin search_path + restate anon public reads.
--
-- SCOPE (7 functions, all confirmed present under v2/vcw4w/supabase/migrations
-- via Grep 2026-09-15 — none missing):
--   public.clan_leaderboard(uuid),
--   public.clan_minute_rate(uuid),
--   public.clan_roster_page(uuid, integer, timestamptz, uuid),
--   public.game_chart_summary(),
--   public.leaderboard_top(text, text),
--   public.love_post_totals(uuid),
--   public.love_profile_stats(text).
--
-- VERDICT: anon KEPT for all 7 — intentionally anon-callable public reads.
-- Reference prior pin: 20261222000002_seclint2_anon_reads.sql (same 7-function
-- set; this file adds ALTER FUNCTION ... SET search_path = public, pg_temp
-- per function and restates the anon grant idempotently).
--
-- SECURITY DEFINER is kept (no SECURITY INVOKER switch). Read-only functions
-- stay read-only — no body changes here (ALTER SET / REVOKE / GRANT only,
-- rerunnable). No tables/policies/triggers/indexes. No secrets.
-- ============================================================================

-- clan page GET /api/clans/[slug] (public read)
alter function public.clan_leaderboard(uuid) set search_path = public, pg_temp;
revoke all on function public.clan_leaderboard(uuid) from public;
grant execute on function public.clan_leaderboard(uuid) to anon, authenticated, service_role;

-- clan page GET /api/clans/[slug] (public read)
alter function public.clan_minute_rate(uuid) set search_path = public, pg_temp;
revoke all on function public.clan_minute_rate(uuid) from public;
grant execute on function public.clan_minute_rate(uuid) to anon, authenticated, service_role;

-- clan page GET /api/clans/[slug] (public read)
alter function public.clan_roster_page(uuid, integer, timestamptz, uuid) set search_path = public, pg_temp;
revoke all on function public.clan_roster_page(uuid, integer, timestamptz, uuid) from public;
grant execute on function public.clan_roster_page(uuid, integer, timestamptz, uuid) to anon, authenticated, service_role;

-- /api/analytics (public read)
alter function public.game_chart_summary() set search_path = public, pg_temp;
revoke all on function public.game_chart_summary() from public;
grant execute on function public.game_chart_summary() to anon, authenticated, service_role;

-- /leaderboards (public read)
alter function public.leaderboard_top(text, text) set search_path = public, pg_temp;
revoke all on function public.leaderboard_top(text, text) from public;
grant execute on function public.leaderboard_top(text, text) to anon, authenticated, service_role;

-- /api/love/post/[id] (public read)
alter function public.love_post_totals(uuid) set search_path = public, pg_temp;
revoke all on function public.love_post_totals(uuid) from public;
grant execute on function public.love_post_totals(uuid) to anon, authenticated, service_role;

-- /api/love/profile (public read)
alter function public.love_profile_stats(text) set search_path = public, pg_temp;
revoke all on function public.love_profile_stats(text) from public;
grant execute on function public.love_profile_stats(text) to anon, authenticated, service_role;
