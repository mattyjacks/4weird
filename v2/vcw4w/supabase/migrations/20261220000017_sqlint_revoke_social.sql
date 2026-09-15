-- ============================================================================
-- DS-SQLINT-08: revoke anon/auth on SOCIAL-domain RPCs (lint 0028/0029).
--
-- Pattern: timer_ownership hardening (20261113000000) — REVOKE ALL FROM
-- public/anon, GRANT EXECUTE to authenticated only where the app calls
-- .rpc(name). REVOKE-only, rerunnable (all statements idempotent).
-- No tables/policies/triggers/indexes created here.
--
-- .rpc grep evidence (repo-wide `\.rpc\(['"]<name>['"]`, v2/vcw4w):
--   CALLED (keep authenticated): give_love_letter (app/api/love/give),
--     award_love_letter (app/api/love/award), love_me (app/api/love/me),
--     my_friends + request_friend_by_handle + respond_friend_request
--     (app/api/social/friends), file_report (app/api/clans/report),
--     open_issue (app/api/projects/[id]/issues), buddy_get_memory +
--     buddy_save_memory (app/api/buddy/memory, app/api/buddy/chat),
--     start_buddy_session + end_buddy_session (app/api/buddy/session),
--     ensure_bot_identity + set_bot_username (app/api/bot/identity),
--     issue_bot_key (app/api/bot/keys), revoke_bot_key
--     (app/api/bot/keys/[id]/revoke), request_verification
--     (app/api/verification), create_support_tier (app/api/support/tiers).
--   NEVER CALLED (revoke authenticated too; triggers run as owner and
--     service_role bypasses grants): comment_issue, close_issue,
--     update_bot_key_policy, handle_new_user, guard_profile_verification,
--     moderate_set_status. Zero matches for bare names repo-wide (app+lib).
--
-- INTENTIONALLY PUBLIC READS (anon kept BY DESIGN — public profile/page
-- stats served to logged-out visitors; hiding them would 403 public pages):
--   love_post_totals(uuid) — award badges on public clan pages
--     (app/api/love/post/[id], no auth required by design).
--   love_profile_stats(text) — public handle stats; hidden profiles already
--     return zeroed counters inside the function body
--     (app/api/love/profile, no auth required by design).
--   community_stat_averages() — aggregate telemetry, no per-user data
--     (app/api/stats, no auth required by design).
--
-- NOTE: file_report() previously granted anon ("anonymous allowed" in
-- 20260910080000_clans.sql) but is NOT in the public-read exception set,
-- so anon is revoked here per envelope; authenticated callers unaffected.
-- handle_new_user()/guard_profile_verification() overlap DS-SECWARN-03's
-- 20261219000002 file; REVOKE is idempotent so restating here is safe.
-- ============================================================================

-- -- 1. Called RPCs: drop anon, keep authenticated. ---------------------------
revoke all on function public.give_love_letter(uuid) from public, anon;
grant execute on function public.give_love_letter(uuid) to authenticated;

revoke all on function public.award_love_letter(uuid, text) from public, anon;
grant execute on function public.award_love_letter(uuid, text) to authenticated;

revoke all on function public.love_me() from public, anon;
grant execute on function public.love_me() to authenticated;

revoke all on function public.my_friends() from public, anon;
grant execute on function public.my_friends() to authenticated;

revoke all on function public.request_friend_by_handle(text) from public, anon;
grant execute on function public.request_friend_by_handle(text) to authenticated;

revoke all on function public.respond_friend_request(uuid, boolean) from public, anon;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;

revoke all on function public.file_report(text, uuid, text, text) from public, anon;
grant execute on function public.file_report(text, uuid, text, text) to authenticated;

revoke all on function public.open_issue(uuid, text, text) from public, anon;
grant execute on function public.open_issue(uuid, text, text) to authenticated;

revoke all on function public.buddy_get_memory(text) from public, anon;
grant execute on function public.buddy_get_memory(text) to authenticated;

revoke all on function public.buddy_save_memory(text, text) from public, anon;
grant execute on function public.buddy_save_memory(text, text) to authenticated;

revoke all on function public.start_buddy_session(text, text) from public, anon;
grant execute on function public.start_buddy_session(text, text) to authenticated;

revoke all on function public.end_buddy_session(uuid) from public, anon;
grant execute on function public.end_buddy_session(uuid) to authenticated;

revoke all on function public.ensure_bot_identity() from public, anon;
grant execute on function public.ensure_bot_identity() to authenticated;

revoke all on function public.set_bot_username(text) from public, anon;
grant execute on function public.set_bot_username(text) to authenticated;

revoke all on function public.issue_bot_key(text, text, text) from public, anon;
grant execute on function public.issue_bot_key(text, text, text) to authenticated;

revoke all on function public.revoke_bot_key(uuid) from public, anon;
grant execute on function public.revoke_bot_key(uuid) to authenticated;

revoke all on function public.request_verification(text) from public, anon;
grant execute on function public.request_verification(text) to authenticated;

revoke all on function public.create_support_tier(uuid, text, numeric, text) from public, anon;
grant execute on function public.create_support_tier(uuid, text, numeric, text) to authenticated;

-- -- 2. Intentionally public reads: anon KEPT by design (see header). ---------
revoke all on function public.love_post_totals(uuid) from public;
grant execute on function public.love_post_totals(uuid) to anon, authenticated;

revoke all on function public.love_profile_stats(text) from public;
grant execute on function public.love_profile_stats(text) to anon, authenticated;

revoke all on function public.community_stat_averages() from public;
grant execute on function public.community_stat_averages() to anon, authenticated;

-- -- 3. Never RPC-called: revoke anon AND authenticated. ----------------------
revoke all on function public.comment_issue(uuid, text) from public, anon, authenticated;
revoke all on function public.close_issue(uuid, boolean) from public, anon, authenticated;
revoke all on function public.update_bot_key_policy(uuid, text, timestamptz, boolean, integer, numeric, numeric, integer, boolean, numeric, numeric, text, text[], text[], text[], text, integer, text) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.guard_profile_verification() from public, anon, authenticated;
revoke all on function public.moderate_set_status(text, uuid, text) from public, anon, authenticated;
