-- DS-SECWARN-07: revoke party/social/misc RPCs (secwarn-07).
--
-- Procedure per envelope v2/vcw4w/public/swarm/TASKS/DS-SECWARN-07.json:
--   * skip already-revoked (55/63 funcs already carry a REVOKE in an earlier
--     migration; those are NOT repeated here),
--   * check app .rpc usage (2157 app files scanned; verdicts in envelope log),
--   * default revoke from public+anon+authenticated,
--   * EXCEPTION: genuine public reads called with the anon key for public
--     pages KEEP anon + file an accepted-risk QUEUE line instead,
--   * kid auth functions: revoke anon always.
--
-- .rpc USAGE VERDICTS (server createClient uses the anon key + cookies, so a
-- logged-out visitor executes RPCs as anon; a logged-in visitor as
-- authenticated):
--   ZERO .rpc call sites (full revoke public+anon+authenticated):
--     party_can_act, party_can_admin, party_entity_exists, party_label,
--     kid_in_window, kid_seconds_today, kid_session_owner, kid_wallet_balance.
--     (add_game_developer + ensure_org_initialized had zero calls too, but
--     add_game_developer is already fully revoked; ensure_org_initialized was
--     only revoked from public,anon so its authenticated revoke is below.)
--   LEGIT user-JWT server-route calls, anon still open (revoke public+anon,
--   keep authenticated): my_friends, request_friend_by_handle,
--     respond_friend_request, set_cheat_setting (all login-gated routes: anon
--     EXECUTE is unneeded).
--   PUBLIC-READ EXCEPTION (KEEP anon, accepted-risk QUEUE line filed by
--   steward, payload in envelope log):
--     community_stat_averages (GET /api/stats is public; logged-out visitors
--       run it as anon) -> revoke PUBLIC only + explicit grant anon,
--       authenticated.
--     game_chart_summary (GET /api/analytics uses an explicit anon client;
--       anon already granted in 20260910030000) -> NO CHANGE here, QUEUE line
--       only.
--   ALREADY-REVOKED SKIPS (no statement here): party_feed, party_resolve,
--     party_search, party_follow, party_unfollow, party_invite_create,
--     party_invite_decide, party_my_invites, party_post_create,
--     party_challenge_create, party_challenge_decide (public,anon revoked in
--     20261014000000_party_interop.sql; authenticated kept: legit logged-in
--     calls), leaderboard_top + love_post_totals + love_profile_stats (fully
--     revoked), set_game_rate/add_game_developer/start|heartbeat|end_game_session
--     (fully revoked), set_watch_scope (public,anon revoked; authed use kept),
--     create_support_tier/create_launch_campaign/close_launch_campaign/
--     launch_campaign_progress (fully revoked; public GETs fail open in code),
--     issue_bot_key/revoke_bot_key/set_bot_username/ensure_bot_identity
--     (fully revoked), ensure_default_org (public,anon revoked; authed use
--     kept), set_kid_controls/set_kid_password/create_kid_account/
--     start|heartbeat|end_kid_session/close_kid_account (public,anon revoked;
--     authed/kid use kept), start|end_buddy_session/buddy_get|save_memory
--     (fully revoked), ghost_* x8 (public,anon revoked; authed use kept).
--   NOTE: party_search + leaderboard_top + love_* stay anon-revoked from
--     earlier migrations even though public pages call them via the server
--     client (logged-out visitors run as anon): pre-existing state, left
--     untouched per "skip already-revoked"; callers fail open/fail closed in
--     code. Flagged for steward review, not re-granted here.

-- 1. Zero-use helpers: full revoke.
revoke all on function public.party_can_act(text, uuid) from public, anon, authenticated;
revoke all on function public.party_can_admin(text, uuid) from public, anon, authenticated;
revoke all on function public.party_entity_exists(text, uuid) from public, anon, authenticated;
revoke all on function public.party_label(text, uuid) from public, anon, authenticated;

-- 2. Kid helpers with zero app .rpc calls: full revoke (anon always revoked).
revoke all on function public.kid_in_window(uuid) from public, anon, authenticated;
revoke all on function public.kid_seconds_today(uuid) from public, anon, authenticated;
revoke all on function public.kid_session_owner(char(64)) from public, anon, authenticated;
revoke all on function public.kid_wallet_balance(uuid) from public, anon, authenticated;

-- 3. ensure_org_initialized: zero .rpc calls, previously revoked from
-- public,anon only (20260928000000) -> close the authenticated hole too.
revoke all on function public.ensure_org_initialized(uuid) from public, anon, authenticated;

-- 4. Login-gated social/cheat RPCs: anon has default EXECUTE but no route
-- reaches them logged-out (401 first); revoke public+anon, keep authenticated.
revoke all on function public.my_friends() from public, anon;
revoke all on function public.request_friend_by_handle(text) from public, anon;
revoke all on function public.respond_friend_request(uuid, boolean) from public, anon;
revoke all on function public.set_cheat_setting(text, smallint, boolean) from public, anon;
grant execute on function public.my_friends() to authenticated;
grant execute on function public.request_friend_by_handle(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.set_cheat_setting(text, smallint, boolean) to authenticated;

-- 5. Public-read exception: community_stat_averages stays callable by anon
-- (GET /api/stats is a public page; logged-out visitors run as anon).
-- Revoke the PUBLIC pseudo-role grant, then pin explicit anon+authenticated.
-- ACCEPTED RISK (steward to file to QUEUE): anon EXECUTE on a read-only
-- aggregate with no PII; SECURITY DEFINER body does no writes.
revoke all on function public.community_stat_averages() from public;
grant execute on function public.community_stat_averages() to anon, authenticated;
