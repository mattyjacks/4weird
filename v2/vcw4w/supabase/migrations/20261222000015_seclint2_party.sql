-- ============================================================================
-- DS-SECFIX2-15: seclint2 delta for lint 0029 party RPCs.
--
-- RECONCILIATION (both read first):
--   * 20261220000017_sqlint_revoke_social.sql covers social/buddy/bot RPCs
--     only; NONE of the 11 party RPCs here appear in it (no party_ matches).
--     No restatement from ...17 is needed.
--   * 20261220000013_sqlint_revoke_org_team.sql lines 120-151 covers all 11
--     party RPCs but OVER-REVOKED the 3 public reads below to
--     authenticated-only. This file restores anon on those 3 with public-page
--     route evidence and restates the other 8 authenticated-only (REVOKE/GRANT
--     are idempotent, so restating ...13 is safe and keeps this file
--     self-sufficient for lint 0029).
--
-- POLICY: feed/search/resolve keep anon (public town-square + directory
-- served to logged-out visitors; function bodies already visibility-filter
-- private rows); the 8 writes/inbox RPCs are authenticated-only. Service_role
-- server callers bypass grants.
--
-- Exact signatures from shipped definitions in
-- 20261014000000_party_interop.sql:
--   party_resolve(text, text)                              :232
--   party_search(text)                                     :287
--   party_follow(text, uuid, text, uuid)                   :334
--   party_unfollow(text, uuid, text, uuid)                 :362
--   party_invite_create(text, uuid, text, uuid, text)      :380
--   party_invite_decide(uuid, boolean)                     :472
--   party_my_invites()                                     :506
--   party_challenge_create(text, uuid, text, uuid, text, text) :537
--   party_challenge_decide(uuid, text, text, uuid)         :571
--   party_post_create(text, uuid, text, uuid, text, text, text) :627
--   party_feed(integer)                                    :663
-- All 11 are SECURITY DEFINER with set search_path = public at definition;
-- ALTER restated here pins it (idempotent).
--
-- .rpc grep evidence (v2/vcw4w, `\.rpc\(['"]<name>['"]`):
--   PUBLIC BY DESIGN (GET handlers, no getUser/requireAuth — anon needs EXECUTE):
--     party_feed    <- app/api/parties/feed/route.ts:37
--                      (GET public town square; POST same file :50 enforces login)
--     party_search  <- app/api/parties/resolve/route.ts:29
--                      (GET ?q= directory search, rate-limit only, no getUser)
--     party_resolve <- app/api/parties/resolve/route.ts:41
--                      (GET ?kind=&ref= directory lookup, rate-limit only, no getUser)
--   AUTHENTICATED (route enforces login via auth.getUser before the rpc):
--     party_post_create     <- app/api/parties/feed/route.ts:94 (getUser :50)
--     party_my_invites      <- app/api/parties/invites/route.ts:33 (getUser :31)
--     party_invite_create   <- app/api/parties/invites/route.ts:61 (getUser :45)
--     party_invite_decide   <- app/api/parties/invites/[id]/route.ts:38 (getUser :26)
--     party_challenge_create <- app/api/parties/challenges/route.ts:76 (getUser :59)
--     party_challenge_decide <- app/api/parties/challenges/[id]/route.ts:54 (getUser :28)
--     party_follow/unfollow <- app/api/parties/links/route.ts:68 dynamic fn toggle
--                              (getUser :50; action follow|unfollow)
--
-- Rerunnable: REVOKE/GRANT/ALTER are idempotent. No tables/policies/triggers/
-- indexes created here. Comments + ALTER/REVOKE/GRANT only; no CREATE OR REPLACE.
-- ============================================================================

-- -- 1. Public reads: anon KEPT by design (see header). -------------------------
alter function public.party_feed(integer) set search_path = public;
revoke all on function public.party_feed(integer) from public, anon;
grant execute on function public.party_feed(integer) to anon, authenticated;

alter function public.party_search(text) set search_path = public;
revoke all on function public.party_search(text) from public, anon;
grant execute on function public.party_search(text) to anon, authenticated;

alter function public.party_resolve(text, text) set search_path = public;
revoke all on function public.party_resolve(text, text) from public, anon;
grant execute on function public.party_resolve(text, text) to anon, authenticated;

-- -- 2. Writes + private inbox: authenticated-only. ------------------------------
alter function public.party_follow(text, uuid, text, uuid) set search_path = public;
revoke all on function public.party_follow(text, uuid, text, uuid) from public, anon;
grant execute on function public.party_follow(text, uuid, text, uuid) to authenticated;

alter function public.party_unfollow(text, uuid, text, uuid) set search_path = public;
revoke all on function public.party_unfollow(text, uuid, text, uuid) from public, anon;
grant execute on function public.party_unfollow(text, uuid, text, uuid) to authenticated;

alter function public.party_invite_create(text, uuid, text, uuid, text) set search_path = public;
revoke all on function public.party_invite_create(text, uuid, text, uuid, text) from public, anon;
grant execute on function public.party_invite_create(text, uuid, text, uuid, text) to authenticated;

alter function public.party_invite_decide(uuid, boolean) set search_path = public;
revoke all on function public.party_invite_decide(uuid, boolean) from public, anon;
grant execute on function public.party_invite_decide(uuid, boolean) to authenticated;

alter function public.party_my_invites() set search_path = public;
revoke all on function public.party_my_invites() from public, anon;
grant execute on function public.party_my_invites() to authenticated;

alter function public.party_post_create(text, uuid, text, uuid, text, text, text) set search_path = public;
revoke all on function public.party_post_create(text, uuid, text, uuid, text, text, text) from public, anon;
grant execute on function public.party_post_create(text, uuid, text, uuid, text, text, text) to authenticated;

alter function public.party_challenge_create(text, uuid, text, uuid, text, text) set search_path = public;
revoke all on function public.party_challenge_create(text, uuid, text, uuid, text, text) from public, anon;
grant execute on function public.party_challenge_create(text, uuid, text, uuid, text, text) to authenticated;

alter function public.party_challenge_decide(uuid, text, text, uuid) set search_path = public;
revoke all on function public.party_challenge_decide(uuid, text, text, uuid) from public, anon;
grant execute on function public.party_challenge_decide(uuid, text, text, uuid) to authenticated;
