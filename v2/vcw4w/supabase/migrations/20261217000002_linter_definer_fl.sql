-- ============================================================================
-- 4WEIRD LINTER DEFINER TRIAGE, F–L SLICE (DS-LINTER-FL)
--
-- Supabase `*_security_definer_function_executable` WARNs for the 58 unique
-- public functions starting F–L. Full triage table (per-function CREATE
-- FUNCTION evidence, auth behavior, shipped revoke/grant coverage) lives at
-- C:\Users\ventu\AppData\Local\Temp\opencode\linter-triage-fl.md (repo-external
-- working note; not shipped).
--
-- Verdict: ZERO new REVOKEs. Every SECURITY DEFINER function in this slice
-- that hard-errors when auth.uid() IS NULL is already anon-revoked by a
-- shipped migration (fund_*, get_my_*, ghost_*, give_love_letter,
-- gravegain_quick_match, heartbeat_game/mmo/usage, issue_bot_key, join_*,
-- leave_mmo_server, list_* invites/rooms/lobbies, log_clan_*, love_me,
-- file_report, guard/handle triggers, ledger_pairing_check, has_*/is_org_member
-- via …03_sqlint_revoke_org_team + 06/07). Intentionally anon: game_chart_summary,
-- launch_campaign_progress, leaderboard_top, love_post_totals, love_profile_stats
-- (public pages; 06_seclint_anon_reads Tier-1), heartbeat_kid_session +
-- kid_session_owner (kid-cookie token flow, no Supabase login — revoking anon
-- breaks child play; 04/05 conflict is steward-owned). Not DEFINER (linter N/A):
-- fal_compute_split, game_ai_compute_split, game_ai_compute_split_numeric,
-- handle_updated_at, immutable_friendship_parties. RLS fail-closed helpers
-- (has_*/is_org_member) left untouched per conservative doubt→(a).
-- GENUINE-VULN: none found.
--
-- Per the sweep dedupe rule (…10_seclint_sweep: "never revoke twice") nothing
-- is restated here. This file is intentionally a no-op marker so the slice is
-- auditable as landed. Rerunnable: single NOTICE, zero side effects. No tables,
-- policies, triggers, or indexes created here.
-- ============================================================================

do $$ begin
  raise notice 'linter definer F-L triage: 58/58 (a) no-change, 0 new revokes, 0 vulns';
end $$;
