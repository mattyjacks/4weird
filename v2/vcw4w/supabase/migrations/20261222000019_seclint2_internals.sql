-- ============================================================================
-- DS-SECFIX2-19: reconcile lint 0029 misc/internal RPCs (seclint2 residual).
--
-- REVOKE-only: no bodies, tables, policies, triggers, or indexes touched.
-- Every REVOKE below is idempotent (revoking an absent privilege is a
-- WARNING, not an error), so the file is rerunnable. service_role bypasses
-- these revokes (revokes are per-role; the service_role grants from the
-- definition/earlier files are untouched) and triggers run as owner, so
-- trigger-only helpers lose nothing by losing anon+authenticated.
--
-- RECONCILIATION vs the 20261219 seclint_* + 20261220 sqlint_*/security_*
-- sweep (headers skimmed 2026-09-15): the latest writer for 7 of the 8
-- functions below is 20261220000012_sqlint_revoke_clan.sql:201-208, which
-- already revokes public,anon,authenticated. The 8th
-- (accrue_all_clan_minute_upkeep) has carried a full revoke since its
-- definition and was never re-granted. This file re-asserts that exact
-- end-state idempotently so the grants converge even if an earlier file is
-- ever skipped (same restate pattern as 20261222000004_seclint2_clan_create
-- and 20261222000006_seclint2_clan_admin).
--
-- PER-FUNCTION VERDICTS (repo-wide grep over v2/vcw4w app + lib +
-- components; .next build chunks excluded as artifacts):
--   FULL REVOKE public,anon,authenticated (trigger-only or service-only,
--   zero .rpc callers; triggers run as owner, cron runs as service_role):
--     accrue_all_clan_minute_upkeep() .... zero app .rpc; sole caller is
--       app/api/cron/clan-upkeep/route.ts:30 via serviceClient() (service
--       role, unaffected by revokes). Definition-time revoke at
--       20260916000000_clan_social_perminute.sql:458-459 (service_role
--       only) was never widened; safe to re-assert.
--     backfill_clan_forum_counters() ..... one-off backfill called inline
--       at 20261016000000_clan_forum.sql:363; zero app .rpc callers.
--       Latest revoke: 20261220000012:202 (via 20261219000007:106,
--       20261220000002:23).
--     bump_clan_member_count() ........... BEFORE trigger on clan members
--       (20261015000100_scale_prune_tribute.sql:164); zero app .rpc.
--       Latest revoke: 20261220000012:203.
--     maintain_clan_comment_count() ...... BEFORE/AFTER trigger on clan
--       comments (20261016000000_clan_forum.sql:197); zero app .rpc.
--       Latest revoke: 20261220000012:204.
--     enforce_clan_comment_parent_same_post() .. row trigger
--       (20261016000000_clan_forum.sql:82); zero app .rpc.
--       Latest revoke: 20261220000012:205.
--     enforce_clan_member_cap() .......... BEFORE INSERT trigger on clan
--       members (20261015000100_scale_prune_tribute.sql:217); calls
--       clan_member_cap() SQL-side; zero app .rpc.
--       Latest revoke: 20261220000012:206.
--     clan_member_cap(uuid) .............. SQL-side helper for the trigger
--       above + scale receipts; only non-SQL reference is a comment in
--       lib/clan-costs.ts:130; zero app .rpc. Latest revoke:
--       20261220000012:207 (overrides the authenticated grant briefly
--       present in 20261219000006:135-136).
--     mark_channel_read(uuid) ............ zero .rpc callers and zero
--       references repo-wide outside migrations/scripts (see
--       20261220000012 header line 46); the authenticated grant in
--       20261219000009:331-332 is superseded by the full revoke in
--       20261220000012:208, re-asserted here.
--
-- EXPLICITLY OUT OF SCOPE (no statements emitted):
--   community_stat_averages: NOT this lane (authenticated-only; sole caller
--     is the login-gated GET /api/stats route, which 401s logged-out users
--     at app/api/stats/route.ts:14. anon was briefly re-granted by
--     20261220000006_security_revoke_social.sql:87-88 and
--     20261220000017_sqlint_revoke_social.sql:105-106, then revoked by
--     20261221000000_fix_community_stat_averages_anon.sql:6-7 and restated
--     in 20261222000000_linter_residual_anon_lockdown.sql:79-80 and
--     20261222000003_seclint2_anon_sensitive.sql:119-121). Skipped here
--     for dedup.
--   my_* / get_my_* self-reads: audited, zero leftovers. Every my_* and
--     get_my_* defined in shipped migrations already carries an anon
--     revoke with authenticated kept: get_my_coin_balance,
--     get_my_coin_refunds, get_my_crown_balances, get_my_crown_converts,
--     get_my_eligible_crown_lots, get_my_refundable_lots (20261219000008
--     + 20261220000007 + 20261220000016), my_clan_usage (20261220000012:
--     173 + 20261222000006:94), my_compute_usage, my_game_play_usage
--     (20261220000009:94-98 + siblings), my_fal_usage, my_meshy_spend,
--     my_submission_spend, my_vault_spend, my_newgameplus_spend,
--     my_openrouter_usage, my_outscraper_usage, my_team_perms
--     (20261222000007:50), my_vcw_usage, my_friends (20261220000017:53).
--     All have live user-JWT .rpc callers (app/api/my/**, budgets,
--     buddy, fal, social/friends), so authenticated stays by design.
-- ============================================================================

revoke all on function public.accrue_all_clan_minute_upkeep() from public, anon, authenticated;
revoke all on function public.backfill_clan_forum_counters() from public, anon, authenticated;
revoke all on function public.bump_clan_member_count() from public, anon, authenticated;
revoke all on function public.maintain_clan_comment_count() from public, anon, authenticated;
revoke all on function public.enforce_clan_comment_parent_same_post() from public, anon, authenticated;
revoke all on function public.enforce_clan_member_cap() from public, anon, authenticated;
revoke all on function public.clan_member_cap(uuid) from public, anon, authenticated;
revoke all on function public.mark_channel_read(uuid) from public, anon, authenticated;
