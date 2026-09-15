-- ============================================================================
-- DS-SQLINT-03: revoke anon/auth on CLAN-domain RPCs (lint 0028/0029).
--
-- Pattern: timer_ownership hardening (20261113000000) — REVOKE ALL FROM
-- public/anon, GRANT EXECUTE to authenticated only where the app calls
-- .rpc(name). REVOKE-only, rerunnable (all statements idempotent).
-- No tables/policies/triggers/indexes created here. Exact overload
-- signatures copied from definitions (create_post/create_comment/create_clan
-- have two overloads each — both revoked).
--
-- .rpc grep evidence (repo-wide `\.rpc\(['"]<name>['"]`,
-- v2/vcw4w/app + lib + components; all callers use the user-JWT
-- createClient(), so service_role callers are unaffected by revokes):
--   CALLED (keep authenticated): create_clan (app/api/clans/route.ts),
--     join_clan + clan_roster_page + clan_leaderboard + clan_minute_rate +
--     accrue_clan_minute_upkeep (app/api/clans/[slug]/route.ts),
--     set_clan_type + add_clan_channel + fund_clan_wallet + donate_clan_upkeep
--     + credit_clan_channel_revenue (app/api/clans/[slug]/economy/route.ts,
--     login-gated), create_clan_channel + clan_minute_rate + post_clan_message
--     + meter_clan_posting_fee + award_clan_xp (app/api/clans/[slug]/
--     channels/[channel]/route.ts, login-gated for writes),
--     clan_is_moderator (same file), create_clan_event
--     (app/api/clans/[slug]/events/route.ts), create_clan_role +
--     assign_clan_role + set_clan_member_role (app/api/clans/[slug]/roles/),
--     deploy_clan_bot + remove_clan_bot (app/api/clans/[slug]/bots/),
--     edit_clan_message + delete_clan_message + set_clan_message_pin +
--     meter_clan_posting_fee (app/api/clans/[slug]/messages/[id]/),
--     create_post + award_clan_xp + set_post_flair + meter_clan_posting_fee
--     (app/api/clans/[slug]/post/route.ts), create_comment + award_clan_xp
--     (app/api/clans/post/[id]/comment/route.ts), set_post_flair
--     (app/api/clans/post/[id]/flair/route.ts), vote_clan_post
--     (app/api/clans/post/[id]/vote/route.ts), vote_clan_comment
--     (app/api/clans/comment/[id]/vote/route.ts), log_clan_ai_usage +
--     log_clan_transfer (lib/clan-meter.ts, called with the route's
--     user client), create_clan_quest + complete_clan_quest
--     (app/api/love/quests/route.ts), set_clan_prune_settings +
--     buy_clan_headroom + prune_clan_members + clan_scale_status +
--     clan_supporter_status + clan_tribute_status
--     (app/api/clans/[slug]/scale/route.ts, login-gated), my_clan_usage
--     (app/api/my/usage/route.ts).
--   NEVER RPC-CALLED (revoke authenticated too; triggers run as owner and
--     service_role bypasses grants): backfill_clan_forum_counters,
--     bump_clan_member_count, maintain_clan_comment_count,
--     enforce_clan_comment_parent_same_post, enforce_clan_member_cap
--     (trigger helpers), clan_member_cap (lib comments only),
--     mark_channel_read (zero references repo-wide), accrue_clan_upkeep
--     (lib/clan-costs.ts comments only; cron bills via
--     accrue_all_clan_minute_upkeep on service_role, untouched here).
--
-- INTENTIONALLY PUBLIC READS (anon kept BY DESIGN — served to logged-out
-- visitors by the unauthenticated GET /api/clans/[slug] page; revoking anon
-- would silently empty roster/leaderboard/rate for public readers while the
-- route's graceful fallbacks hide the 403; same carve-out as DS-SQLINT-08):
--   clan_leaderboard(uuid), clan_minute_rate(uuid),
--   clan_roster_page(uuid, integer, timestamptz, uuid).
--
-- NOTE: some grants restate earlier hardening (20260915 security audit,
-- 20261018000000 ledger pairing, 20261112000000 lockdown, 20261207 audit
-- fixes already pin meter/donate/fund/leaderboard/log/credit to
-- authenticated-only). REVOKE/GRANT are idempotent so restating is safe.
-- ============================================================================

-- -- 1. Called RPCs: drop anon, keep authenticated. ----------------------------

-- create_clan: both overloads (3-arg legacy wrapper + 4-arg with p_clan_type).
revoke all on function public.create_clan(text, text, text) from public, anon;
grant execute on function public.create_clan(text, text, text) to authenticated;

revoke all on function public.create_clan(text, text, text, text) from public, anon;
grant execute on function public.create_clan(text, text, text, text) to authenticated;

revoke all on function public.join_clan(uuid) from public, anon;
grant execute on function public.join_clan(uuid) to authenticated;

revoke all on function public.set_clan_member_role(uuid, uuid, text) from public, anon;
grant execute on function public.set_clan_member_role(uuid, uuid, text) to authenticated;

revoke all on function public.set_clan_type(uuid, text) from public, anon;
grant execute on function public.set_clan_type(uuid, text) to authenticated;

revoke all on function public.set_clan_prune_settings(uuid, boolean, integer, integer, text) from public, anon;
grant execute on function public.set_clan_prune_settings(uuid, boolean, integer, integer, text) to authenticated;

revoke all on function public.add_clan_channel(uuid, text, text, text) from public, anon;
grant execute on function public.add_clan_channel(uuid, text, text, text) to authenticated;

revoke all on function public.create_clan_channel(uuid, text, text, text, text) from public, anon;
grant execute on function public.create_clan_channel(uuid, text, text, text, text) to authenticated;

revoke all on function public.create_clan_event(uuid, text, text, timestamptz, uuid) from public, anon;
grant execute on function public.create_clan_event(uuid, text, text, timestamptz, uuid) to authenticated;

revoke all on function public.create_clan_role(uuid, text, text) from public, anon;
grant execute on function public.create_clan_role(uuid, text, text) to authenticated;

revoke all on function public.assign_clan_role(uuid, uuid, uuid) from public, anon;
grant execute on function public.assign_clan_role(uuid, uuid, uuid) to authenticated;

revoke all on function public.deploy_clan_bot(uuid, text, text) from public, anon;
grant execute on function public.deploy_clan_bot(uuid, text, text) to authenticated;

revoke all on function public.remove_clan_bot(uuid, uuid) from public, anon;
grant execute on function public.remove_clan_bot(uuid, uuid) to authenticated;

revoke all on function public.fund_clan_wallet(uuid, numeric) from public, anon;
grant execute on function public.fund_clan_wallet(uuid, numeric) to authenticated;

revoke all on function public.donate_clan_upkeep(uuid, numeric) from public, anon;
grant execute on function public.donate_clan_upkeep(uuid, numeric) to authenticated;

revoke all on function public.award_clan_xp(uuid, text, integer) from public, anon;
grant execute on function public.award_clan_xp(uuid, text, integer) to authenticated;

revoke all on function public.accrue_clan_minute_upkeep(uuid) from public, anon;
grant execute on function public.accrue_clan_minute_upkeep(uuid) to authenticated;

revoke all on function public.buy_clan_headroom(uuid, integer) from public, anon;
grant execute on function public.buy_clan_headroom(uuid, integer) to authenticated;

revoke all on function public.create_clan_quest(uuid, text, integer) from public, anon;
grant execute on function public.create_clan_quest(uuid, text, integer) to authenticated;

revoke all on function public.complete_clan_quest(uuid, uuid) from public, anon;
grant execute on function public.complete_clan_quest(uuid, uuid) to authenticated;

revoke all on function public.post_clan_message(uuid, text, text, uuid, text) from public, anon;
grant execute on function public.post_clan_message(uuid, text, text, uuid, text) to authenticated;

revoke all on function public.edit_clan_message(uuid, text) from public, anon;
grant execute on function public.edit_clan_message(uuid, text) to authenticated;

revoke all on function public.delete_clan_message(uuid) from public, anon;
grant execute on function public.delete_clan_message(uuid) to authenticated;

revoke all on function public.set_clan_message_pin(uuid, boolean) from public, anon;
grant execute on function public.set_clan_message_pin(uuid, boolean) to authenticated;

-- create_post: both overloads (5-arg legacy + 6-arg with p_board).
revoke all on function public.create_post(uuid, text, text, text, text) from public, anon;
grant execute on function public.create_post(uuid, text, text, text, text) to authenticated;

revoke all on function public.create_post(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.create_post(uuid, text, text, text, text, text) to authenticated;

-- create_comment: both overloads (3-arg legacy + 4-arg with p_parent_id).
revoke all on function public.create_comment(uuid, text, text) from public, anon;
grant execute on function public.create_comment(uuid, text, text) to authenticated;

revoke all on function public.create_comment(uuid, text, text, uuid) from public, anon;
grant execute on function public.create_comment(uuid, text, text, uuid) to authenticated;

revoke all on function public.set_post_flair(uuid, text) from public, anon;
grant execute on function public.set_post_flair(uuid, text) to authenticated;

revoke all on function public.vote_clan_post(uuid, smallint) from public, anon;
grant execute on function public.vote_clan_post(uuid, smallint) to authenticated;

revoke all on function public.vote_clan_comment(uuid, smallint) from public, anon;
grant execute on function public.vote_clan_comment(uuid, smallint) to authenticated;

revoke all on function public.log_clan_ai_usage(uuid, text, numeric) from public, anon;
grant execute on function public.log_clan_ai_usage(uuid, text, numeric) to authenticated;

revoke all on function public.log_clan_transfer(uuid, integer, text) from public, anon;
grant execute on function public.log_clan_transfer(uuid, integer, text) to authenticated;

revoke all on function public.meter_clan_posting_fee(uuid, text, integer, boolean) from public, anon;
grant execute on function public.meter_clan_posting_fee(uuid, text, integer, boolean) to authenticated;

revoke all on function public.credit_clan_channel_revenue(uuid, text) from public, anon;
grant execute on function public.credit_clan_channel_revenue(uuid, text) to authenticated;

revoke all on function public.my_clan_usage() from public, anon;
grant execute on function public.my_clan_usage() to authenticated;

revoke all on function public.prune_clan_members(uuid, text, integer, uuid[], boolean) from public, anon;
grant execute on function public.prune_clan_members(uuid, text, integer, uuid[], boolean) to authenticated;

revoke all on function public.clan_is_moderator(uuid, uuid) from public, anon;
grant execute on function public.clan_is_moderator(uuid, uuid) to authenticated;

revoke all on function public.clan_scale_status(uuid) from public, anon;
grant execute on function public.clan_scale_status(uuid) to authenticated;

revoke all on function public.clan_supporter_status(uuid) from public, anon;
grant execute on function public.clan_supporter_status(uuid) to authenticated;

revoke all on function public.clan_tribute_status(uuid) from public, anon;
grant execute on function public.clan_tribute_status(uuid) to authenticated;

-- -- 2. Intentionally public reads: anon KEPT by design (see header). ---------
revoke all on function public.clan_leaderboard(uuid) from public;
grant execute on function public.clan_leaderboard(uuid) to anon, authenticated;

revoke all on function public.clan_minute_rate(uuid) from public;
grant execute on function public.clan_minute_rate(uuid) to anon, authenticated;

revoke all on function public.clan_roster_page(uuid, integer, timestamptz, uuid) from public;
grant execute on function public.clan_roster_page(uuid, integer, timestamptz, uuid) to anon, authenticated;

-- -- 3. Never RPC-called: revoke anon AND authenticated. ----------------------
revoke all on function public.backfill_clan_forum_counters() from public, anon, authenticated;
revoke all on function public.bump_clan_member_count() from public, anon, authenticated;
revoke all on function public.maintain_clan_comment_count() from public, anon, authenticated;
revoke all on function public.enforce_clan_comment_parent_same_post() from public, anon, authenticated;
revoke all on function public.enforce_clan_member_cap() from public, anon, authenticated;
revoke all on function public.clan_member_cap(uuid) from public, anon, authenticated;
revoke all on function public.mark_channel_read(uuid) from public, anon, authenticated;
revoke all on function public.accrue_clan_upkeep(uuid) from public, anon, authenticated;
