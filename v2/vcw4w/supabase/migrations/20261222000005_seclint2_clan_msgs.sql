-- ============================================================================
-- DS-SECFIX2-05: reconcile lint 0029 clan-messaging RPCs against
-- 20261220000012_sqlint_revoke_clan.sql.
--
-- GAP: 20261220000012 §1 covers 10 of the 11 clan-messaging RPCs but omits
--   toggle_clan_reaction(uuid, text) — the only .rpc caller is the login-gated
--   POST /api/clans/[slug]/messages/[id] (action "react"), which 401s without
--   a session via the user-JWT createClient(). Latest definition:
--   20261116000004_sec_econ_hardening.sql:154 (SECURITY DEFINER,
--   set search_path = public, auth.uid() null-raise + member check).
--   Left at its definition-time grant, the linter still flags 0029 anon.
--
-- RESTATE: the other 10 are re-asserted here idempotently (REVOKE/GRANT are
-- rerunnable; restating guards against any future anon restore, same pattern
-- as 20261222000000_linter_residual_anon_lockdown.sql §2-3). No signature or
-- search_path changes: every definition already pins set search_path = public.
--
-- .rpc grep evidence (v2/vcw4w/app + lib; all callers use the user-JWT
-- createClient(), so service_role callers are unaffected by revokes):
--   CALLED (revoke anon, keep authenticated):
--     post_clan_message   (app/api/clans/[slug]/channels/[channel]/route.ts:220)
--     edit_clan_message   (app/api/clans/[slug]/messages/[id]/route.ts:139)
--     delete_clan_message (app/api/clans/[slug]/messages/[id]/route.ts:153)
--     set_clan_message_pin (app/api/clans/[slug]/messages/[id]/route.ts:83)
--     toggle_clan_reaction (app/api/clans/[slug]/messages/[id]/route.ts:67)
--     meter_clan_posting_fee (messages/[id]/route.ts:124, channels/[channel]/
--       route.ts:203, post/route.ts:116, post/[id]/comment/route.ts:71)
--     vote_clan_post      (app/api/clans/post/[id]/vote/route.ts:35)
--     vote_clan_comment   (app/api/clans/comment/[id]/vote/route.ts:35)
--     log_clan_ai_usage + log_clan_transfer (lib/clan-meter.ts:24,44, called
--       with the route's user client)
--     credit_clan_channel_revenue (app/api/clans/[slug]/economy/route.ts:115)
--   NEVER RPC-CALLED in this set: none — every listed RPC has a caller, so no
--   revoke-both row lands here.
--
-- No tables/policies/triggers/indexes created here. Exact overload signatures
-- copied from definitions (see file refs above + 20260916000000 lines
-- 518/540/559/711/781/796/815, 20261017000100 lines 130/175,
-- 20261018000000 line 95).
-- ============================================================================

-- -- 1. Gap fill: toggle_clan_reaction was missing from 20261220000012. ------
revoke all on function public.toggle_clan_reaction(uuid, text) from public, anon;
grant execute on function public.toggle_clan_reaction(uuid, text) to authenticated;

-- -- 2. Re-assert the other 10 messaging RPCs (idempotent restate). -----------
revoke all on function public.post_clan_message(uuid, text, text, uuid, text) from public, anon;
grant execute on function public.post_clan_message(uuid, text, text, uuid, text) to authenticated;

revoke all on function public.edit_clan_message(uuid, text) from public, anon;
grant execute on function public.edit_clan_message(uuid, text) to authenticated;

revoke all on function public.delete_clan_message(uuid) from public, anon;
grant execute on function public.delete_clan_message(uuid) to authenticated;

revoke all on function public.set_clan_message_pin(uuid, boolean) from public, anon;
grant execute on function public.set_clan_message_pin(uuid, boolean) to authenticated;

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
