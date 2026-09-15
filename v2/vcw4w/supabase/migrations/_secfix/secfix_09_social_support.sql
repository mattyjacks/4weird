-- ============================================================================
-- DS-SECLINT-09 slice: social / support / campaign / party RPC hardening.
-- Scope (user list only): love_* (5), friends (3), file_report,
-- moderate_set_status, launch campaigns (4), support tiers/tips/subs (5),
-- request_verification + guard_profile_verification trigger,
-- party_* helpers (5) + party_* RPCs (11). Total 36 functions.
--
-- Treatment per function (verified 2026-09-15 against repo HEAD):
--   1. ALTER FUNCTION ... SET search_path = public  (idempotent hardening;
--      every body below already declares search_path=public at creation).
--   2. REVOKE ALL ON FUNCTION ... FROM PUBLIC  (always safe: removes the
--      default PUBLIC execute without touching explicit role grants).
--   3. REVOKE ... FROM anon ONLY where caller evidence proves no logged-out
--      use (route 401s without a session, or zero callers repo-wide).
--   4. GRANT EXECUTE TO authenticated where an authenticated caller is
--      proven (.rpc() behind a getUser() check); GRANT anon ONLY where a
--      logged-out caller is proven (public GET routes, anonymous reports).
--
-- HARD RULES honored: never REVOKE FROM authenticated; anon revoked only
-- with evidence; no old migration edited; no app code touched; every
-- statement rerunnable (REVOKE/GRANT/ALTER are idempotent).
--
-- EVIDENCE KEY (grep: \.rpc\(['"]<name>['"] over v2/vcw4w **/*.{ts,tsx,js}):
--   LOVE-ME      app/api/love/me/route.ts:12 rpc("love_me") AFTER getUser
--                401 (auth-only) -> anon revoked.
--   LOVE-PROFILE app/api/love/profile/route.ts:17 rpc("love_profile_stats")
--                with NO auth check (public stats; shy profiles zeroed in
--                body) -> anon KEPT by design (cf. 00007 header).
--   LOVE-GIVE    app/api/love/give/route.ts:49 rpc("give_love_letter")
--                after 401 + body raises 'login required' -> anon revoked.
--   LOVE-AWARD   app/api/love/award/route.ts rpc("award_love_letter") after
--                401 + body raises 'login required' -> anon revoked.
--   LOVE-TOTALS  app/api/love/post/[id]/route.ts:13 rpc("love_post_totals")
--                with NO auth check (award badges on public clan pages) ->
--                anon KEPT by design (cf. 00007 header).
--   FRIENDS x3   app/api/social/friends/route.ts:15,41,69 all AFTER 401
--                (GET/PATCH/POST) + bodies use auth.uid() -> anon revoked.
--   FILE-REPORT  app/api/clans/report/route.ts:47 rpc("file_report");
--                route header: "anonymous allowed", "reporter_id is null
--                when logged out"; Terms allow anonymous reports -> anon
--                KEPT. NOTE: 20261219000007_sqlint_revoke_social.sql revoked
--                anon here; the GRANT below restores it (see needs-human).
--   MODERATE     zero .rpc() matches repo-wide (dead code; 00007 locked it
--                down fully). No anon evidence -> anon revoked; authenticated
--                PRESERVED per hard rule (no grant proven, grant = preserve).
--                Needs-human: delete or fully lock down.
--   LAUNCH-PROGRESS app/api/fundraisers/route.ts:42 + [id]/route.ts:26
--                rpc("launch_campaign_progress") with NO auth check (public
--                catalog/detail) -> anon KEPT by design.
--   LAUNCH x3    fundraisers POST (route.ts:79), contribute ([id]/contribute
--                :67), close ([id]/close) all AFTER 401 + bodies raise
--                'login required' -> anon revoked.
--   SUPPORT x4   tip (support/tip:70), tiers (support/tiers:59), subscribe
--                + cancel (support/subscribe:64,79) all AFTER 401 + bodies
--                raise 'login required' -> anon revoked.
--   VERIFY       app/api/verification/route.ts:45 rpc("request_verification")
--                AFTER 401 + body raises 'login required' -> anon revoked.
--   GUARD-TRIG   trigger fn (RETURNS trigger, trg_guard_profile_verification
--                on profiles); never RPC-called. Revoke PUBLIC,anon only;
--                grants preserve status quo (00003 precedent: service_role).
--   PARTY-HELPERS party_kind_valid / entity_exists / can_act / can_admin /
--                label: zero .rpc() matches (server-side helpers only,
--                called inside definer RPCs). No anon evidence -> anon
--                revoked; authenticated preserved per hard rule.
--   PARTY-FEED   app/api/parties/feed GET:37 rpc("party_feed") NO auth
--                (public town square) -> anon KEPT.
--   PARTY-RESOLVE/SEARCH app/api/parties/resolve:29,41 NO auth (public
--                directory; bodies visibility-filter + self-only private) ->
--                anon KEPT.
--   PARTY-WRITES follow/unfollow (links:67-68), invite_create/decide
--                (invites:61, [id]:38 + my_invites:33), post_create
--                (feed POST:94), challenge_create/decide (challenges:76,
--                [id]) ALL AFTER 401 + bodies raise 'login required' ->
--                anon revoked.
--
-- DEFINITION SOURCES (exact arg lists): 20261001000000_love_letters.sql,
-- 20260910020000_multiplayer_and_social_actions.sql (+ re-def in
-- 20260910040000_account_preferences_and_creator_monetization.sql),
-- 20260910080000_clans.sql, 20260922000000_support_launch_fundraisers.sql,
-- 20261014000000_party_interop.sql. Grants restated from those files +
-- 20261219000007_sqlint_revoke_social.sql where applicable.
-- ============================================================================

-- -- 1. Love Letters ----------------------------------------------------------
alter function public.love_me() set search_path = public;
revoke all on function public.love_me() from public, anon;
grant execute on function public.love_me() to authenticated;

alter function public.love_profile_stats(text) set search_path = public;
revoke all on function public.love_profile_stats(text) from public;
grant execute on function public.love_profile_stats(text) to anon, authenticated;

alter function public.give_love_letter(uuid) set search_path = public;
revoke all on function public.give_love_letter(uuid) from public, anon;
grant execute on function public.give_love_letter(uuid) to authenticated;

alter function public.award_love_letter(uuid, text) set search_path = public;
revoke all on function public.award_love_letter(uuid, text) from public, anon;
grant execute on function public.award_love_letter(uuid, text) to authenticated;

alter function public.love_post_totals(uuid) set search_path = public;
revoke all on function public.love_post_totals(uuid) from public;
grant execute on function public.love_post_totals(uuid) to anon, authenticated;

-- -- 2. Friends ---------------------------------------------------------------
alter function public.my_friends() set search_path = public;
revoke all on function public.my_friends() from public, anon;
grant execute on function public.my_friends() to authenticated;

alter function public.request_friend_by_handle(text) set search_path = public;
revoke all on function public.request_friend_by_handle(text) from public, anon;
grant execute on function public.request_friend_by_handle(text) to authenticated;

alter function public.respond_friend_request(uuid, boolean) set search_path = public;
revoke all on function public.respond_friend_request(uuid, boolean) from public, anon;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;

-- -- 3. Reports / moderation ---------------------------------------------------
-- Anonymous reports allowed per Terms + route design: anon KEPT (restores
-- the grant removed by 20261219000007; see header / needs-human).
alter function public.file_report(text, uuid, text, text) set search_path = public;
revoke all on function public.file_report(text, uuid, text, text) from public;
grant execute on function public.file_report(text, uuid, text, text) to anon, authenticated;

-- Dead code (no callers): anon revoked, authenticated preserved per hard
-- rule. Needs-human: remove or fully lock down.
alter function public.moderate_set_status(text, uuid, text) set search_path = public;
revoke all on function public.moderate_set_status(text, uuid, text) from public, anon;
grant execute on function public.moderate_set_status(text, uuid, text) to authenticated;

-- -- 4. Support (tiers / tips / subscriptions / verification) ------------------
alter function public.request_verification(text) set search_path = public;
revoke all on function public.request_verification(text) from public, anon;
grant execute on function public.request_verification(text) to authenticated;

alter function public.tip_creator(uuid, uuid, numeric) set search_path = public;
revoke all on function public.tip_creator(uuid, uuid, numeric) from public, anon;
grant execute on function public.tip_creator(uuid, uuid, numeric) to authenticated;

alter function public.create_support_tier(uuid, text, numeric, text) set search_path = public;
revoke all on function public.create_support_tier(uuid, text, numeric, text) from public, anon;
grant execute on function public.create_support_tier(uuid, text, numeric, text) to authenticated;

alter function public.subscribe_to_tier(uuid) set search_path = public;
revoke all on function public.subscribe_to_tier(uuid) from public, anon;
grant execute on function public.subscribe_to_tier(uuid) to authenticated;

alter function public.cancel_subscription(uuid) set search_path = public;
revoke all on function public.cancel_subscription(uuid) from public, anon;
grant execute on function public.cancel_subscription(uuid) to authenticated;

-- Trigger guard (not an RPC): revoke PUBLIC,anon only; preserve grants.
alter function public.guard_profile_verification() set search_path = public;
revoke all on function public.guard_profile_verification() from public, anon;
grant execute on function public.guard_profile_verification() to authenticated, service_role;

-- -- 5. Launch campaigns --------------------------------------------------------
alter function public.create_launch_campaign(uuid, text, text, numeric, text, text, timestamptz) set search_path = public;
revoke all on function public.create_launch_campaign(uuid, text, text, numeric, text, text, timestamptz) from public, anon;
grant execute on function public.create_launch_campaign(uuid, text, text, numeric, text, text, timestamptz) to authenticated;

alter function public.contribute_launch_campaign(uuid, numeric) set search_path = public;
revoke all on function public.contribute_launch_campaign(uuid, numeric) from public, anon;
grant execute on function public.contribute_launch_campaign(uuid, numeric) to authenticated;

alter function public.close_launch_campaign(uuid, text) set search_path = public;
revoke all on function public.close_launch_campaign(uuid, text) from public, anon;
grant execute on function public.close_launch_campaign(uuid, text) to authenticated;

-- Public rollup on public catalog/detail reads: anon KEPT by design.
alter function public.launch_campaign_progress(uuid) set search_path = public;
revoke all on function public.launch_campaign_progress(uuid) from public;
grant execute on function public.launch_campaign_progress(uuid) to anon, authenticated, service_role;

-- -- 6. Party helpers (server-side only, no direct callers) --------------------
-- Anon revoked (zero-caller evidence); authenticated preserved per hard rule.
alter function public.party_kind_valid(text) set search_path = public;
revoke all on function public.party_kind_valid(text) from public, anon;
grant execute on function public.party_kind_valid(text) to authenticated;

alter function public.party_entity_exists(text, uuid) set search_path = public;
revoke all on function public.party_entity_exists(text, uuid) from public, anon;
grant execute on function public.party_entity_exists(text, uuid) to authenticated;

alter function public.party_can_act(text, uuid) set search_path = public;
revoke all on function public.party_can_act(text, uuid) from public, anon;
grant execute on function public.party_can_act(text, uuid) to authenticated;

-- NOTE: user list says "party_can_act/admin"; actual name is party_can_admin.
alter function public.party_can_admin(text, uuid) set search_path = public;
revoke all on function public.party_can_admin(text, uuid) from public, anon;
grant execute on function public.party_can_admin(text, uuid) to authenticated;

alter function public.party_label(text, uuid) set search_path = public;
revoke all on function public.party_label(text, uuid) from public, anon;
grant execute on function public.party_label(text, uuid) to authenticated;

-- -- 7. Party public reads (anon KEPT) vs writes (anon revoked) ----------------
alter function public.party_resolve(text, text) set search_path = public;
revoke all on function public.party_resolve(text, text) from public;
grant execute on function public.party_resolve(text, text) to anon, authenticated;

alter function public.party_search(text) set search_path = public;
revoke all on function public.party_search(text) from public;
grant execute on function public.party_search(text) to anon, authenticated;

alter function public.party_feed(integer) set search_path = public;
revoke all on function public.party_feed(integer) from public;
grant execute on function public.party_feed(integer) to anon, authenticated;

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
