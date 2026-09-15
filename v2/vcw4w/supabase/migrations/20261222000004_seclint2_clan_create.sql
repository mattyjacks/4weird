-- ============================================================================
-- DS-SECFIX2-04: reconcile lint 0028/0029 on clan-create RPCs against
-- 20261220000012_sqlint_revoke_clan.sql.
--
-- FINDING: 00012 already revokes anon (REVOKE ALL FROM public, anon) and
-- keeps authenticated (GRANT EXECUTE TO authenticated) on every function in
-- this envelope's set, both overloads included. This file re-asserts that
-- exact policy idempotently so the grants converge even if an earlier
-- migration is ever skipped, and records the .rpc evidence in one place.
-- No bodies, tables, policies, triggers, or indexes touched (REVOKE/GRANT
-- only, rerunnable). service_role bypasses grants and is unaffected.
--
-- .rpc evidence (v2/vcw4w, user-JWT createClient() in login-gated routes):
--   create_clan ................. app/api/clans/route.ts:58
--   create_clan_channel ......... app/api/clans/[slug]/channels/route.ts:104
--   create_clan_event ........... app/api/clans/[slug]/events/route.ts:73
--   create_clan_quest ........... app/api/love/quests/route.ts:62
--   create_clan_role ............ app/api/clans/[slug]/roles/route.ts:76
--   create_post ................. app/api/clans/[slug]/post/route.ts:132
--   create_comment .............. app/api/clans/post/[id]/comment/route.ts:87
-- Hence: revoke public+anon, keep authenticated on all nine signatures.
-- ============================================================================

-- create_clan: both overloads (3-arg legacy + 4-arg with p_clan_type).
revoke all on function public.create_clan(text, text, text) from public, anon;
grant execute on function public.create_clan(text, text, text) to authenticated;

revoke all on function public.create_clan(text, text, text, text) from public, anon;
grant execute on function public.create_clan(text, text, text, text) to authenticated;

revoke all on function public.create_clan_channel(uuid, text, text, text, text) from public, anon;
grant execute on function public.create_clan_channel(uuid, text, text, text, text) to authenticated;

revoke all on function public.create_clan_event(uuid, text, text, timestamptz, uuid) from public, anon;
grant execute on function public.create_clan_event(uuid, text, text, timestamptz, uuid) to authenticated;

revoke all on function public.create_clan_quest(uuid, text, integer) from public, anon;
grant execute on function public.create_clan_quest(uuid, text, integer) to authenticated;

revoke all on function public.create_clan_role(uuid, text, text) from public, anon;
grant execute on function public.create_clan_role(uuid, text, text) to authenticated;

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
