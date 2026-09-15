-- ============================================================================
-- DS-SECFIX2-06: reconcile lint 0029 on clan-admin RPCs against
-- 20261220000012_sqlint_revoke_clan.sql.
--
-- FINDING: 00012 already revokes anon (REVOKE ALL FROM public, anon) and
-- keeps authenticated (GRANT EXECUTE TO authenticated) on every function in
-- this envelope's set. This file re-asserts that exact policy idempotently
-- so the grants converge even if an earlier migration is ever skipped, and
-- records the .rpc evidence in one place. No bodies, tables, policies,
-- triggers, or indexes touched (REVOKE/GRANT only, rerunnable).
-- service_role bypasses grants and is unaffected.
--
-- .rpc evidence (v2/vcw4w, user-JWT createClient() in login-gated routes):
--   join_clan ................. app/api/clans/[slug]/route.ts:285
--   accrue_clan_minute_upkeep . app/api/clans/[slug]/route.ts:60
--   set_clan_member_role ...... app/api/clans/[slug]/roles/route.ts:114
--   set_clan_type ............. app/api/clans/[slug]/economy/route.ts:205
--   fund_clan_wallet .......... app/api/clans/[slug]/economy/route.ts:138
--   donate_clan_upkeep ........ app/api/clans/[slug]/economy/route.ts:157
--   add_clan_channel .......... app/api/clans/[slug]/economy/route.ts:182
--   deploy_clan_bot ........... app/api/clans/[slug]/bots/route.ts:100
--   remove_clan_bot ........... app/api/clans/[slug]/bots/route.ts:119
--   award_clan_xp ............. app/api/clans/[slug]/post/route.ts:149,
--                               app/api/clans/post/[id]/comment/route.ts:103,
--                               app/api/clans/[slug]/channels/[channel]/route.ts:236
--   clan_is_moderator ......... app/api/clans/[slug]/channels/[channel]/route.ts:172
--   set_clan_prune_settings ... app/api/clans/[slug]/scale/route.ts:126
--   prune_clan_members ........ app/api/clans/[slug]/scale/route.ts:142
--   buy_clan_headroom ......... app/api/clans/[slug]/scale/route.ts:158
--   clan_scale_status ......... app/api/clans/[slug]/scale/route.ts:81
--   clan_supporter_status ..... app/api/clans/[slug]/scale/route.ts:82
--                               (+ economy/route.ts:57)
--   clan_tribute_status ....... app/api/clans/[slug]/scale/route.ts:83
--                               (+ economy/route.ts:58)
--   my_clan_usage ............. app/api/my/usage/route.ts:282
--   create_clan_quest ......... app/api/love/quests/route.ts:62
--                               (also re-asserted by 20261222000004; restating
--                               here is idempotent and keeps this set whole)
--   complete_clan_quest ....... app/api/love/quests/route.ts:86
-- Hence: revoke public+anon, keep authenticated on all twenty signatures.
-- ============================================================================

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

revoke all on function public.deploy_clan_bot(uuid, text, text) from public, anon;
grant execute on function public.deploy_clan_bot(uuid, text, text) to authenticated;

revoke all on function public.remove_clan_bot(uuid, uuid) from public, anon;
grant execute on function public.remove_clan_bot(uuid, uuid) to authenticated;

revoke all on function public.award_clan_xp(uuid, text, integer) from public, anon;
grant execute on function public.award_clan_xp(uuid, text, integer) to authenticated;

revoke all on function public.accrue_clan_minute_upkeep(uuid) from public, anon;
grant execute on function public.accrue_clan_minute_upkeep(uuid) to authenticated;

revoke all on function public.donate_clan_upkeep(uuid, numeric) from public, anon;
grant execute on function public.donate_clan_upkeep(uuid, numeric) to authenticated;

revoke all on function public.fund_clan_wallet(uuid, numeric) from public, anon;
grant execute on function public.fund_clan_wallet(uuid, numeric) to authenticated;

revoke all on function public.buy_clan_headroom(uuid, integer) from public, anon;
grant execute on function public.buy_clan_headroom(uuid, integer) to authenticated;

revoke all on function public.prune_clan_members(uuid, text, integer, uuid[], boolean) from public, anon;
grant execute on function public.prune_clan_members(uuid, text, integer, uuid[], boolean) to authenticated;

revoke all on function public.clan_scale_status(uuid) from public, anon;
grant execute on function public.clan_scale_status(uuid) to authenticated;

revoke all on function public.clan_supporter_status(uuid) from public, anon;
grant execute on function public.clan_supporter_status(uuid) to authenticated;

revoke all on function public.clan_tribute_status(uuid) from public, anon;
grant execute on function public.clan_tribute_status(uuid) to authenticated;

revoke all on function public.clan_is_moderator(uuid, uuid) from public, anon;
grant execute on function public.clan_is_moderator(uuid, uuid) to authenticated;

revoke all on function public.my_clan_usage() from public, anon;
grant execute on function public.my_clan_usage() to authenticated;

revoke all on function public.create_clan_quest(uuid, text, integer) from public, anon;
grant execute on function public.create_clan_quest(uuid, text, integer) to authenticated;

revoke all on function public.complete_clan_quest(uuid, uuid) from public, anon;
grant execute on function public.complete_clan_quest(uuid, uuid) to authenticated;
