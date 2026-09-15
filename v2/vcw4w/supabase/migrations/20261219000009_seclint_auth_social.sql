-- ============================================================================
-- 4WEIRD SECLINT REVOKE ANON/PUBLIC ON SOCIAL/CLAN/ORG RPCs (DS-SECLINT-09,
-- seclint-09)
--
-- Lint 0029 leftovers, social surface: every callable-by-authenticated
-- social/clan/org/lobby/match/room/bot/issue/kid-control RPC below
-- historically carried GRANT EXECUTE TO anon (directly or via PUBLIC).
-- Default-deny: REVOKE ALL ON FUNCTION public.<exact-sig> FROM anon, PUBLIC
-- on all 150 signatures, then GRANT EXECUTE to authenticated, service_role.
-- No bodies are rewritten here; no tables, policies, triggers, or indexes.
--
-- Signature verification (grep over supabase/migrations; REVOKE/GRANT match
-- on arg TYPES only, defaults do not change identity):
--   * clans core: 20260910080000_clans.sql (create_clan:144, join_clan:169,
--     create_post 5-arg:184, create_comment 3-arg:213, file_report:241,
--     moderate_set_status:285).
--   * clan types/bots/channels: 20260912000000_clan_types_upkeep_valleynet_
--     runpod.sql (create_clan 4-arg:188, create_clan 3-arg wrapper:226,
--     set_clan_type:235, award_clan_xp:505, clan_leaderboard:548,
--     deploy_clan_bot:572, remove_clan_bot:610, add_clan_channel:630).
--   * clan social: 20260916000000_clan_social_perminute.sql (create_clan
--     4-arg redef:232, log_clan_ai_usage:518, log_clan_transfer:540,
--     clan_is_moderator:659, create_clan_channel:681, post_clan_message:711,
--     toggle_clan_reaction:750, set_clan_message_pin:781,
--     edit_clan_message:796, delete_clan_message:815, create_clan_event:832,
--     create_clan_role:861, assign_clan_role:887, set_clan_member_role:911,
--     mark_channel_read:932).
--   * multiplayer/social: 20260910020000_multiplayer_and_social_actions.sql
--     (quick_match:27, update_match_state:44, my_friends:51,
--     community_stat_averages:59).
--   * lobbies: 20260910030000_lobbies_analytics_and_trial_credit.sql
--     (create_lobby:21, list_joinable_lobbies:26, join_lobby:29,
--     game_chart_summary:33, list_all_open_lobbies:43).
--   * creator monetization: 20260910040000_account_preferences_and_creator_
--     monetization.sql:13 (set_creator_monetization).
--   * bot platform: 20260910090000_bot_platform.sql (set_bot_username:191,
--     issue_bot_key:234, revoke_bot_key:269); latest set_bot_username is
--     20261103000000_bot_username_ambiguity_fix.sql:19 (same sig),
--     latest issue/revoke_bot_key is 20260910120000_reconcile_clans_bots.sql
--     (:130, :152, same sigs).
--   * agent rentals: 20260910100000_agent_rentals.sql (create_listing:151,
--     book_listing:194, heartbeat_usage:237, end_booking:284); latest
--     create_listing is 20260914000000_agent_rentals_usd_xonotic.sql:52
--     (same sig), latest book_listing is
--     20261018000000_ledger_pairing_hardening.sql:288 (same sig), latest
--     heartbeat_usage is 20260930000000_heartbeat_escrow_cap.sql:19
--     (same sig).
--   * orgs/teams/issues/rooms: 20260910130000_teams_enterprise_bundle.sql
--     (create_org:813, create_team:833, create_custom_role:854,
--     set_member_role:891, create_project:920, open_issue:949,
--     comment_issue:965, close_issue:981, push_file:996, create_room:1018,
--     send_room_packet:1036, redact_room_message:1057,
--     provision_service:1094); latest create_org is
--     20260928000000_default_org_lazy_init.sql:241 (same sig); latest
--     send_room_packet is 20260929000000_agent_room_relay.sql:37 (same sig).
--   * buddy/game sessions: 20260910160000_game_ai_compute.sql
--     (start_buddy_session:124, end_buddy_session:223),
--     20260910170000_game_rentals.sql (set_game_rate:143,
--     end_game_session:310); latest start/heartbeat_game_session is
--     20261207000000_security_audit_fixes.sql (:70, :9, same sigs).
--   * invites: 20260928000000_default_org_lazy_init.sql
--     (create_org_invite_link:278, redeem_org_invite:313,
--     revoke_org_invite:343, list_org_invites:358).
--   * ghost/watcher/org reads: 20260925000100_watcher_multirole_ghost.sql
--     (set_member_roles:149, set_watch_scope:175, org_watch_visible:203,
--     ghost_create_contract:335, ghost_clock_in:360, ghost_beat:382,
--     ghost_clock_out:407, ghost_invoice_timer:429, ghost_mark_debt:459,
--     ghost_settle_debt:483, org_roster:504, ghost_org_summary:533).
--   * timers: 20260926000000_timer_ghost_cash.sql (start_timer:196,
--     stop_timer:249); latest defs are 20261211000000_ghost_rename.sql
--     (:69, :150, same sigs).
--   * room relay: 20260929000000_agent_room_relay.sql
--     (send_room_packet_as_bot:61, read_room_messages:93,
--     list_unitunite_rooms:134).
--   * bot key policy: 20260929000100_bot_key_power_manager.sql:101
--     (update_bot_key_policy, 18 args ending p_note text).
--   * launch/support: 20260922000000_support_launch_fundraisers.sql
--     (request_verification:231, create_support_tier:276,
--     create_launch_campaign:413, close_launch_campaign:498,
--     launch_campaign_progress:516).
--   * kids: 20260924000002_family_accounts.sql (kid_session_owner:118,
--     kid_in_window:126, kid_wallet_balance:152, kid_seconds_today:158,
--     create_kid_account:166 with p_discriminator char(4) -- `character`
--     without length means character(1) in Postgres, so char(4) is exact,
--     set_kid_controls:190, set_kid_password:240, close_kid_account:279,
--     start_kid_session:306, heartbeat_kid_session:401, end_kid_session:477);
--     latest set_kid_controls is 20261025000004_kid_unlimited_time.sql:11
--     (same sig), latest start_kid_session is
--     20261022000000_newgameplus_metering.sql:226 (same sig), latest
--     close_kid_account is 20261018000000_ledger_pairing_hardening.sql:333
--     (same sig), latest heartbeat_kid_session is
--     20261207000000_security_audit_fixes.sql:158 (same sig).
--   * love: 20261001000000_love_letters.sql (love_me:87,
--     love_profile_stats:99, give_love_letter:124, award_love_letter:153,
--     love_post_totals:183, create_clan_quest:199, complete_clan_quest:215);
--     latest love_profile_stats is 20261207000000_security_audit_fixes.sql
--     :500 (same sig); latest complete_clan_quest is
--     20261021000000_quantum_hardening.sql:12 (same sig).
--   * party: 20261014000000_party_interop.sql (party_search:287,
--     party_follow:334, party_unfollow:362, party_invite_create:380,
--     party_invite_decide:472, party_my_invites:506,
--     party_challenge_create:537, party_challenge_decide:571,
--     party_post_create:627, party_feed:663).
--   * scale/prune: 20261015000100_scale_prune_tribute.sql
--     (set_self_host_seats:110, org_roster_page:225, clan_roster_page:270,
--     set_org_prune_settings:347, set_clan_prune_settings:375,
--     prune_org_members:407, prune_clan_members:549,
--     buy_org_headroom:868, buy_clan_headroom:906, org_scale_status:941,
--     clan_scale_status:962, clan_supporter_status:1188,
--     clan_tribute_status:1295).
--   * forum/boards: 20261016000000_clan_forum.sql (create_comment 4-arg:203,
--     vote_clan_post:244, vote_clan_comment:287, set_post_flair:336),
--     20261017000100_clan_boards.sql (create_post 6-arg:54, create_comment
--     4-arg redef:89, vote redefs:130/175, set_post_flair redef:226,
--     set_post_board:263).
--   * buddy memory: 20261101000000_buddy_memory.sql (buddy_get_memory:41,
--     buddy_save_memory:59).
--   * gravegain mp: 20261110000000_gravegain_multiplayer.sql
--     (gravegain_quick_match:35, post_mp_event:66, read_mp_events:83).
--   * latest log_clan_ai_usage: 20261112000000_security_lockdown.sql:45
--     (same sig); latest toggle_clan_reaction and ghost_create_contract:
--     20261116000004_sec_econ_hardening.sql (:154, :191, same sigs).
--   * daily leaderboard: 20260910070000_daily_and_referrals.sql:94; latest
--     is 20261207000000_security_audit_fixes.sql:487 (same sig).
--   * mmo: 20261203000000_mmo_servers.sql (create_mmo_server:82,
--     set_mmo_server_status:113),
--     20261203000001_mmo_membership.sql (join_mmo_server:137,
--     leave_mmo_server:164, heartbeat_mmo_presence:176).
--   * vocrehab: 20261208000000_vocrehab_module_v1.sql
--     (vocrehab_export_snapshot:365, vocrehab_log_export:394).
--
-- Design: per function REVOKE ALL ON FUNCTION public.<exact-sig>
-- FROM anon, PUBLIC; then GRANT EXECUTE to authenticated, service_role.
-- post_clan_message appears twice in the envelope Covers list (party
-- section + clan section) and is revoked once here (single definition).
--
-- auth.uid()-guard gaps logged (bodies NOT rewritten; owning-lane
-- follow-ups; latest-definition bodies checked):
--   * NO auth.uid() but by-design reads/helpers (explicit id args or public
--     aggregates; still anon-revoked here per envelope rule): clan_leaderboard
--     (both defs), clan_scale_status, clan_roster_page, clan_tribute_status,
--     clan_is_moderator (pure owner/mod predicate on explicit user id),
--     love_post_totals, love_profile_stats (both defs), leaderboard_top
--     (both defs; input-validated), community_stat_averages,
--     game_chart_summary, launch_campaign_progress, party_feed (visible-posts
--     feed), log_clan_transfer (metered log RPC), kid_session_owner,
--     kid_in_window, kid_wallet_balance, kid_seconds_today (parent/token
--     scoped read helpers).
--   * NO auth.uid() but token-scoped kid auth by design (kid_session_owner
--     token check, not JWT): start_kid_session (both defs),
--     heartbeat_kid_session (both defs), end_kid_session.
--   * create_clan(text,text,text) has no auth.uid() because it is a thin
--     wrapper delegating to guarded create_clan(text,text,text,text)
--     (20260912000000:226-230); guard lives in the 4-arg impl.
--   * Everything else above carries an auth.uid() IS NULL login guard in
--     its latest body (spot-verified per section; e.g. moderate_set_status
--     20260910080000:289, toggle_clan_reaction 20261116000004:159,
--     party_follow/unfollow/invite_create 20261014000000:339/367/385,
--     set_org/clan_prune_settings 20261015000100:352/380,
--     create_org_invite_link 20260928000000:282, set_mmo_server_status
--     20261203000000:119, heartbeat_usage 20260930000000:23).
--
-- Overlap + conflict notes (for sweep agent DS-SECLINT-10; this file does
-- not touch other migrations):
--   * DS-SECLINT-06 (20261219000006_seclint_anon_reads.sql, landed) keeps
--     anon on 11 reads below with public-page app evidence (Tier 1). This
--     file revokes anon on them per the 09 envelope Covers list, so at
--     apply time (000009 > 000006) anon loses: game_chart_summary,
--     leaderboard_top, love_profile_stats, love_post_totals, party_search,
--     party_feed, clan_leaderboard, clan_roster_page, clan_scale_status,
--     clan_supporter_status, clan_tribute_status. If public pages
--     (leaderboard, clan [slug], love profile/post, parties feed/resolve,
--     analytics) must stay logged-out-readable, the owning lanes must
--     re-grant anon AFTER this version or gate those routes to login.
--     Same-direction overlaps (no conflict, idempotent restatement):
--     community_stat_averages, file_report, my_friends (06 Tier 2
--     authenticated-only). file_report: 06 header logs that anon POST
--     /api/clans/report stays fail-closed -- owning lane must gate the
--     route or proxy via service_role.
--   * DS-SECLINT-05 (20261219000005_seclint_anon_kids.sql, landed) already
--     revokes anon on start/heartbeat/end_kid_session + kid_session_owner,
--     kid_in_window, kid_wallet_balance, kid_seconds_today; restated here
--     idempotently per the 09 Covers list. CONFLICT: sibling _secfix/
--     secfix_06_kids_family.sql keeps anon on the three session RPCs
--     (anon-key games/session client + verify-family.mjs anon grants);
--     human/lead ruling needed on kid-session anon access.
--   * DS-SECLINT-07/08 own their lists; grep of
--     20261219000007_seclint_auth_internal.sql +
--     20261219000008_seclint_auth_money.sql shows zero signature overlap
--     with this file (07: org_roles_of, party_entity_exists/label/resolve,
--     clan/org_member_cap; 08: money/metering RPCs).
--   * Goal says ghost_* "all 9" but grep finds exactly 8 ghost_* RPC
--     definitions (create_contract, clock_in, beat, clock_out,
--     invoice_timer, mark_debt, settle_debt, org_summary, all in
--     20260925000100_watcher_multirole_ghost.sql); no 9th ghost_* function
--     exists in supabase/migrations. Sweep agent: confirm miscount vs a
--     ghost RPC defined outside migrations.
--   * Deliberately NOT in this file (not in the 09 Covers list; left for
--     sweep agent 10 / owning lanes): clan_minute_rate (06),
--     meter_clan_posting_fee + meter_clan_posting_fee_for (metering twins),
--     accrue_clan_upkeep/minute_upkeep + donate/fund_clan_wallet (08),
--     run_org/clan_auto_prune + _auto_prune_org + run_clan_tribute_sweep
--     (cron/internal). SUPERSEDED for seven sweep orphans -- clan_supporter_tier,
--     credit_clan_channel_revenue(_guarded), award_signup_credit,
--     party_kind_valid/party_can_act/party_can_admin are now settled in
--     Section 11 SWEEP SETTLEMENT below (deterministic v09 grants win).
--
-- Explicitly SCOPED OUT (do NOT add here):
--   * No function bodies, tables, policies, triggers, or indexes.
--   * No other functions outside the Covers list above.
--
-- Fully rerunnable: REVOKE/GRANT are idempotent. Append-only: never edit a
-- shipped migration, including this one once pushed -- repairs go in a NEW
-- timestamped file.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CLANS (create/join/channels/events/quests/roles/messages/reactions)
-- ----------------------------------------------------------------------------
revoke all on function public.create_clan(text, text, text) from anon, public;
grant execute on function public.create_clan(text, text, text) to authenticated, service_role;

revoke all on function public.create_clan(text, text, text, text) from anon, public;
grant execute on function public.create_clan(text, text, text, text) to authenticated, service_role;

revoke all on function public.join_clan(uuid) from anon, public;
grant execute on function public.join_clan(uuid) to authenticated, service_role;

revoke all on function public.add_clan_channel(uuid, text, text, text) from anon, public;
grant execute on function public.add_clan_channel(uuid, text, text, text) to authenticated, service_role;

revoke all on function public.create_clan_channel(uuid, text, text, text, text) from anon, public;
grant execute on function public.create_clan_channel(uuid, text, text, text, text) to authenticated, service_role;

revoke all on function public.create_clan_event(uuid, text, text, timestamptz, uuid) from anon, public;
grant execute on function public.create_clan_event(uuid, text, text, timestamptz, uuid) to authenticated, service_role;

revoke all on function public.create_clan_quest(uuid, text, integer) from anon, public;
grant execute on function public.create_clan_quest(uuid, text, integer) to authenticated, service_role;

revoke all on function public.create_clan_role(uuid, text, text) from anon, public;
grant execute on function public.create_clan_role(uuid, text, text) to authenticated, service_role;

revoke all on function public.assign_clan_role(uuid, uuid, uuid) from anon, public;
grant execute on function public.assign_clan_role(uuid, uuid, uuid) to authenticated, service_role;

revoke all on function public.set_clan_member_role(uuid, uuid, text) from anon, public;
grant execute on function public.set_clan_member_role(uuid, uuid, text) to authenticated, service_role;

revoke all on function public.set_clan_type(uuid, text) from anon, public;
grant execute on function public.set_clan_type(uuid, text) to authenticated, service_role;

revoke all on function public.set_clan_prune_settings(uuid, boolean, integer, integer, text) from anon, public;
grant execute on function public.set_clan_prune_settings(uuid, boolean, integer, integer, text) to authenticated, service_role;

revoke all on function public.set_clan_message_pin(uuid, boolean) from anon, public;
grant execute on function public.set_clan_message_pin(uuid, boolean) to authenticated, service_role;

revoke all on function public.complete_clan_quest(uuid, uuid) from anon, public;
grant execute on function public.complete_clan_quest(uuid, uuid) to authenticated, service_role;

revoke all on function public.award_clan_xp(uuid, text, integer) from anon, public;
grant execute on function public.award_clan_xp(uuid, text, integer) to authenticated, service_role;

revoke all on function public.buy_clan_headroom(uuid, integer) from anon, public;
grant execute on function public.buy_clan_headroom(uuid, integer) to authenticated, service_role;

revoke all on function public.buy_org_headroom(uuid, integer) from anon, public;
grant execute on function public.buy_org_headroom(uuid, integer) to authenticated, service_role;

revoke all on function public.post_clan_message(uuid, text, text, uuid, text) from anon, public;
grant execute on function public.post_clan_message(uuid, text, text, uuid, text) to authenticated, service_role;

revoke all on function public.edit_clan_message(uuid, text) from anon, public;
grant execute on function public.edit_clan_message(uuid, text) to authenticated, service_role;

revoke all on function public.delete_clan_message(uuid) from anon, public;
grant execute on function public.delete_clan_message(uuid) to authenticated, service_role;

revoke all on function public.toggle_clan_reaction(uuid, text) from anon, public;
grant execute on function public.toggle_clan_reaction(uuid, text) to authenticated, service_role;

revoke all on function public.vote_clan_comment(uuid, smallint) from anon, public;
grant execute on function public.vote_clan_comment(uuid, smallint) to authenticated, service_role;

revoke all on function public.vote_clan_post(uuid, smallint) from anon, public;
grant execute on function public.vote_clan_post(uuid, smallint) to authenticated, service_role;

revoke all on function public.create_comment(uuid, text, text) from anon, public;
grant execute on function public.create_comment(uuid, text, text) to authenticated, service_role;

revoke all on function public.create_comment(uuid, text, text, uuid) from anon, public;
grant execute on function public.create_comment(uuid, text, text, uuid) to authenticated, service_role;

revoke all on function public.create_post(uuid, text, text, text, text) from anon, public;
grant execute on function public.create_post(uuid, text, text, text, text) to authenticated, service_role;

revoke all on function public.create_post(uuid, text, text, text, text, text) from anon, public;
grant execute on function public.create_post(uuid, text, text, text, text, text) to authenticated, service_role;

revoke all on function public.set_post_board(uuid, text) from anon, public;
grant execute on function public.set_post_board(uuid, text) to authenticated, service_role;

revoke all on function public.set_post_flair(uuid, text) from anon, public;
grant execute on function public.set_post_flair(uuid, text) to authenticated, service_role;

revoke all on function public.deploy_clan_bot(uuid, text, text) from anon, public;
grant execute on function public.deploy_clan_bot(uuid, text, text) to authenticated, service_role;

revoke all on function public.remove_clan_bot(uuid, uuid) from anon, public;
grant execute on function public.remove_clan_bot(uuid, uuid) to authenticated, service_role;

revoke all on function public.clan_is_moderator(uuid, uuid) from anon, public;
grant execute on function public.clan_is_moderator(uuid, uuid) to authenticated, service_role;

revoke all on function public.clan_leaderboard(uuid) from anon, public;
grant execute on function public.clan_leaderboard(uuid) to authenticated, service_role;

revoke all on function public.clan_roster_page(uuid, integer, timestamptz, uuid) from anon, public;
grant execute on function public.clan_roster_page(uuid, integer, timestamptz, uuid) to authenticated, service_role;

revoke all on function public.clan_scale_status(uuid) from anon, public;
grant execute on function public.clan_scale_status(uuid) to authenticated, service_role;

revoke all on function public.clan_supporter_status(uuid) from anon, public;
grant execute on function public.clan_supporter_status(uuid) to authenticated, service_role;

revoke all on function public.clan_tribute_status(uuid) from anon, public;
grant execute on function public.clan_tribute_status(uuid) to authenticated, service_role;

revoke all on function public.mark_channel_read(uuid) from anon, public;
grant execute on function public.mark_channel_read(uuid) to authenticated, service_role;

revoke all on function public.log_clan_transfer(uuid, integer, text) from anon, public;
grant execute on function public.log_clan_transfer(uuid, integer, text) to authenticated, service_role;

revoke all on function public.log_clan_ai_usage(uuid, text, numeric) from anon, public;
grant execute on function public.log_clan_ai_usage(uuid, text, numeric) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. ORGS / TEAMS / PROJECTS / ROOMS / INVITES / PRUNE
-- ----------------------------------------------------------------------------
revoke all on function public.create_org(text, text) from anon, public;
grant execute on function public.create_org(text, text) to authenticated, service_role;

revoke all on function public.create_team(uuid, text, text) from anon, public;
grant execute on function public.create_team(uuid, text, text) to authenticated, service_role;

revoke all on function public.create_project(uuid, text, text, text) from anon, public;
grant execute on function public.create_project(uuid, text, text, text) to authenticated, service_role;

revoke all on function public.create_room(uuid, text, text, boolean) from anon, public;
grant execute on function public.create_room(uuid, text, text, boolean) to authenticated, service_role;

revoke all on function public.set_member_role(text, uuid, uuid, text, uuid) from anon, public;
grant execute on function public.set_member_role(text, uuid, uuid, text, uuid) to authenticated, service_role;

revoke all on function public.set_member_roles(uuid, uuid, text[]) from anon, public;
grant execute on function public.set_member_roles(uuid, uuid, text[]) to authenticated, service_role;

revoke all on function public.create_custom_role(uuid, uuid, text, text[]) from anon, public;
grant execute on function public.create_custom_role(uuid, uuid, text, text[]) to authenticated, service_role;

revoke all on function public.create_org_invite_link(uuid, text, integer, timestamptz, text, uuid) from anon, public;
grant execute on function public.create_org_invite_link(uuid, text, integer, timestamptz, text, uuid) to authenticated, service_role;

revoke all on function public.list_org_invites(uuid) from anon, public;
grant execute on function public.list_org_invites(uuid) to authenticated, service_role;

revoke all on function public.redeem_org_invite(text) from anon, public;
grant execute on function public.redeem_org_invite(text) to authenticated, service_role;

revoke all on function public.revoke_org_invite(uuid) from anon, public;
grant execute on function public.revoke_org_invite(uuid) to authenticated, service_role;

revoke all on function public.org_roster(uuid) from anon, public;
grant execute on function public.org_roster(uuid) to authenticated, service_role;

revoke all on function public.org_roster_page(uuid, integer, timestamptz, uuid, text) from anon, public;
grant execute on function public.org_roster_page(uuid, integer, timestamptz, uuid, text) to authenticated, service_role;

revoke all on function public.org_scale_status(uuid) from anon, public;
grant execute on function public.org_scale_status(uuid) to authenticated, service_role;

revoke all on function public.org_watch_visible(uuid, uuid) from anon, public;
grant execute on function public.org_watch_visible(uuid, uuid) to authenticated, service_role;

revoke all on function public.set_org_prune_settings(uuid, boolean, integer, integer, text) from anon, public;
grant execute on function public.set_org_prune_settings(uuid, boolean, integer, integer, text) to authenticated, service_role;

revoke all on function public.set_self_host_seats(uuid, integer) from anon, public;
grant execute on function public.set_self_host_seats(uuid, integer) to authenticated, service_role;

revoke all on function public.prune_clan_members(uuid, text, integer, uuid[], boolean) from anon, public;
grant execute on function public.prune_clan_members(uuid, text, integer, uuid[], boolean) to authenticated, service_role;

revoke all on function public.prune_org_members(uuid, text, integer, uuid[], boolean) from anon, public;
grant execute on function public.prune_org_members(uuid, text, integer, uuid[], boolean) to authenticated, service_role;

revoke all on function public.set_watch_scope(uuid, uuid, uuid[]) from anon, public;
grant execute on function public.set_watch_scope(uuid, uuid, uuid[]) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. LOBBIES / PARTY
-- ----------------------------------------------------------------------------
revoke all on function public.create_lobby(text, text, text, text) from anon, public;
grant execute on function public.create_lobby(text, text, text, text) to authenticated, service_role;

revoke all on function public.join_lobby(uuid, text) from anon, public;
grant execute on function public.join_lobby(uuid, text) to authenticated, service_role;

revoke all on function public.list_all_open_lobbies(text) from anon, public;
grant execute on function public.list_all_open_lobbies(text) to authenticated, service_role;

revoke all on function public.list_joinable_lobbies(text) from anon, public;
grant execute on function public.list_joinable_lobbies(text) to authenticated, service_role;

revoke all on function public.party_challenge_create(text, uuid, text, uuid, text, text) from anon, public;
grant execute on function public.party_challenge_create(text, uuid, text, uuid, text, text) to authenticated, service_role;

revoke all on function public.party_challenge_decide(uuid, text, text, uuid) from anon, public;
grant execute on function public.party_challenge_decide(uuid, text, text, uuid) to authenticated, service_role;

revoke all on function public.party_follow(text, uuid, text, uuid) from anon, public;
grant execute on function public.party_follow(text, uuid, text, uuid) to authenticated, service_role;

revoke all on function public.party_unfollow(text, uuid, text, uuid) from anon, public;
grant execute on function public.party_unfollow(text, uuid, text, uuid) to authenticated, service_role;

revoke all on function public.party_invite_create(text, uuid, text, uuid, text) from anon, public;
grant execute on function public.party_invite_create(text, uuid, text, uuid, text) to authenticated, service_role;

revoke all on function public.party_invite_decide(uuid, boolean) from anon, public;
grant execute on function public.party_invite_decide(uuid, boolean) to authenticated, service_role;

revoke all on function public.party_my_invites() from anon, public;
grant execute on function public.party_my_invites() to authenticated, service_role;

revoke all on function public.party_post_create(text, uuid, text, uuid, text, text, text) from anon, public;
grant execute on function public.party_post_create(text, uuid, text, uuid, text, text, text) to authenticated, service_role;

revoke all on function public.party_feed(integer) from anon, public;
grant execute on function public.party_feed(integer) to authenticated, service_role;

revoke all on function public.party_search(text) from anon, public;
grant execute on function public.party_search(text) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4. MULTIPLAYER EVENTS / ROOM READS / ISSUES / REPORTS
-- ----------------------------------------------------------------------------
revoke all on function public.post_mp_event(uuid, text, text) from anon, public;
grant execute on function public.post_mp_event(uuid, text, text) to authenticated, service_role;

revoke all on function public.read_mp_events(uuid, timestamptz, integer) from anon, public;
grant execute on function public.read_mp_events(uuid, timestamptz, integer) to authenticated, service_role;

revoke all on function public.read_room_messages(uuid, integer, timestamptz) from anon, public;
grant execute on function public.read_room_messages(uuid, integer, timestamptz) to authenticated, service_role;

revoke all on function public.push_file(uuid, text, text, text, text) from anon, public;
grant execute on function public.push_file(uuid, text, text, text, text) to authenticated, service_role;

revoke all on function public.open_issue(uuid, text, text) from anon, public;
grant execute on function public.open_issue(uuid, text, text) to authenticated, service_role;

revoke all on function public.close_issue(uuid, boolean) from anon, public;
grant execute on function public.close_issue(uuid, boolean) to authenticated, service_role;

revoke all on function public.comment_issue(uuid, text) from anon, public;
grant execute on function public.comment_issue(uuid, text) to authenticated, service_role;

revoke all on function public.moderate_set_status(text, uuid, text) from anon, public;
grant execute on function public.moderate_set_status(text, uuid, text) to authenticated, service_role;

revoke all on function public.file_report(text, uuid, text, text) from anon, public;
grant execute on function public.file_report(text, uuid, text, text) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 5. GHOST CONTRACTS (8 RPCs exist; no 9th ghost_* function in migrations)
-- ----------------------------------------------------------------------------
revoke all on function public.ghost_create_contract(uuid, text, uuid, uuid, numeric) from anon, public;
grant execute on function public.ghost_create_contract(uuid, text, uuid, uuid, numeric) to authenticated, service_role;

revoke all on function public.ghost_clock_in(uuid, text) from anon, public;
grant execute on function public.ghost_clock_in(uuid, text) to authenticated, service_role;

revoke all on function public.ghost_beat(uuid, integer) from anon, public;
grant execute on function public.ghost_beat(uuid, integer) to authenticated, service_role;

revoke all on function public.ghost_clock_out(uuid) from anon, public;
grant execute on function public.ghost_clock_out(uuid) to authenticated, service_role;

revoke all on function public.ghost_invoice_timer(uuid) from anon, public;
grant execute on function public.ghost_invoice_timer(uuid) to authenticated, service_role;

revoke all on function public.ghost_mark_debt(uuid, uuid, uuid, numeric, text) from anon, public;
grant execute on function public.ghost_mark_debt(uuid, uuid, uuid, numeric, text) to authenticated, service_role;

revoke all on function public.ghost_settle_debt(uuid, text) from anon, public;
grant execute on function public.ghost_settle_debt(uuid, text) to authenticated, service_role;

revoke all on function public.ghost_org_summary(uuid) from anon, public;
grant execute on function public.ghost_org_summary(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 6. TIMERS / SERVICES / BUDDY / GAME SESSIONS
-- ----------------------------------------------------------------------------
revoke all on function public.start_timer(uuid, uuid, text, boolean, boolean, text, text) from anon, public;
grant execute on function public.start_timer(uuid, uuid, text, boolean, boolean, text, text) to authenticated, service_role;

revoke all on function public.stop_timer(uuid, text, uuid, boolean, integer) from anon, public;
grant execute on function public.stop_timer(uuid, text, uuid, boolean, integer) to authenticated, service_role;

revoke all on function public.provision_service(uuid, uuid, text, text) from anon, public;
grant execute on function public.provision_service(uuid, uuid, text, text) to authenticated, service_role;

revoke all on function public.start_buddy_session(text, text) from anon, public;
grant execute on function public.start_buddy_session(text, text) to authenticated, service_role;

revoke all on function public.end_buddy_session(uuid) from anon, public;
grant execute on function public.end_buddy_session(uuid) to authenticated, service_role;

revoke all on function public.buddy_get_memory(text) from anon, public;
grant execute on function public.buddy_get_memory(text) to authenticated, service_role;

revoke all on function public.buddy_save_memory(text, text) from anon, public;
grant execute on function public.buddy_save_memory(text, text) to authenticated, service_role;

revoke all on function public.heartbeat_game_session(uuid, integer) from anon, public;
grant execute on function public.heartbeat_game_session(uuid, integer) to authenticated, service_role;

revoke all on function public.start_game_session(text, text, integer) from anon, public;
grant execute on function public.start_game_session(text, text, integer) to authenticated, service_role;

revoke all on function public.end_game_session(uuid) from anon, public;
grant execute on function public.end_game_session(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 7. KID ACCOUNTS / CONTROLS / SESSIONS (session RPCs overlap DS-SECLINT-05)
-- ----------------------------------------------------------------------------
revoke all on function public.create_kid_account(text, char(4), text, text) from anon, public;
grant execute on function public.create_kid_account(text, char(4), text, text) to authenticated, service_role;

revoke all on function public.set_kid_controls(uuid, integer, time, time, text, numeric, boolean, text, text) from anon, public;
grant execute on function public.set_kid_controls(uuid, integer, time, time, text, numeric, boolean, text, text) to authenticated, service_role;

revoke all on function public.set_kid_password(uuid, text) from anon, public;
grant execute on function public.set_kid_password(uuid, text) to authenticated, service_role;

revoke all on function public.close_kid_account(uuid) from anon, public;
grant execute on function public.close_kid_account(uuid) to authenticated, service_role;

-- STEWARD EDIT 2026-09-15: kid helpers are revoke-only here (no
-- authenticated re-grant) to converge with
-- 20261219000004_sqlint_revoke_kid_family.sql's full lock whatever order
-- applies; the session trio is owned by that file (anon must stay:
-- kidSessionPlay runs with no Supabase user, route.ts:78-85) and is NOT
-- touched here.
revoke all on function public.kid_session_owner(char(64)) from anon, public;

revoke all on function public.kid_in_window(uuid) from anon, public;

revoke all on function public.kid_wallet_balance(uuid) from anon, public;

revoke all on function public.kid_seconds_today(uuid) from anon, public;

-- ----------------------------------------------------------------------------
-- 8. LOVE / FRIENDS
-- ----------------------------------------------------------------------------
revoke all on function public.love_me() from anon, public;
grant execute on function public.love_me() to authenticated, service_role;

revoke all on function public.give_love_letter(uuid) from anon, public;
grant execute on function public.give_love_letter(uuid) to authenticated, service_role;

revoke all on function public.award_love_letter(uuid, text) from anon, public;
grant execute on function public.award_love_letter(uuid, text) to authenticated, service_role;

revoke all on function public.love_post_totals(uuid) from anon, public;
grant execute on function public.love_post_totals(uuid) to authenticated, service_role;

revoke all on function public.love_profile_stats(text) from anon, public;
grant execute on function public.love_profile_stats(text) to authenticated, service_role;

revoke all on function public.my_friends() from anon, public;
grant execute on function public.my_friends() to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 9. BOTS / ROOM PACKETS
-- ----------------------------------------------------------------------------
revoke all on function public.issue_bot_key(text, text, text) from anon, public;
grant execute on function public.issue_bot_key(text, text, text) to authenticated, service_role;

revoke all on function public.revoke_bot_key(uuid) from anon, public;
grant execute on function public.revoke_bot_key(uuid) to authenticated, service_role;

revoke all on function public.update_bot_key_policy(uuid, text, timestamptz, boolean, integer, numeric, numeric, integer, boolean, numeric, numeric, text, text[], text[], text[], text, integer, text) from anon, public;
grant execute on function public.update_bot_key_policy(uuid, text, timestamptz, boolean, integer, numeric, numeric, integer, boolean, numeric, numeric, text, text[], text[], text[], text, integer, text) to authenticated, service_role;

revoke all on function public.set_bot_username(text) from anon, public;
grant execute on function public.set_bot_username(text) to authenticated, service_role;

revoke all on function public.send_room_packet(uuid, text, text, text) from anon, public;
grant execute on function public.send_room_packet(uuid, text, text, text) to authenticated, service_role;

revoke all on function public.send_room_packet_as_bot(uuid, text, text) from anon, public;
grant execute on function public.send_room_packet_as_bot(uuid, text, text) to authenticated, service_role;

revoke all on function public.redact_room_message(uuid) from anon, public;
grant execute on function public.redact_room_message(uuid) to authenticated, service_role;

revoke all on function public.list_unitunite_rooms(uuid) from anon, public;
grant execute on function public.list_unitunite_rooms(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 10. CREATOR / LISTINGS / LAUNCH
-- ----------------------------------------------------------------------------
revoke all on function public.set_creator_monetization(uuid, boolean) from anon, public;
grant execute on function public.set_creator_monetization(uuid, boolean) to authenticated, service_role;

revoke all on function public.set_game_rate(text, integer, integer) from anon, public;
grant execute on function public.set_game_rate(text, integer, integer) to authenticated, service_role;

revoke all on function public.create_launch_campaign(uuid, text, text, numeric, text, text, timestamptz) from anon, public;
grant execute on function public.create_launch_campaign(uuid, text, text, numeric, text, text, timestamptz) to authenticated, service_role;

revoke all on function public.close_launch_campaign(uuid, text) from anon, public;
grant execute on function public.close_launch_campaign(uuid, text) to authenticated, service_role;

revoke all on function public.launch_campaign_progress(uuid) from anon, public;
grant execute on function public.launch_campaign_progress(uuid) to authenticated, service_role;

revoke all on function public.create_support_tier(uuid, text, numeric, text) from anon, public;
grant execute on function public.create_support_tier(uuid, text, numeric, text) to authenticated, service_role;

revoke all on function public.create_listing(text, text, text, text, integer) from anon, public;
grant execute on function public.create_listing(text, text, text, text, integer) to authenticated, service_role;

revoke all on function public.book_listing(uuid, integer) from anon, public;
grant execute on function public.book_listing(uuid, integer) to authenticated, service_role;

revoke all on function public.end_booking(uuid) from anon, public;
grant execute on function public.end_booking(uuid) to authenticated, service_role;

revoke all on function public.heartbeat_usage(uuid, integer) from anon, public;
grant execute on function public.heartbeat_usage(uuid, integer) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 11. MMO / MATCHMAKING / PUBLIC STATS / VOCREHAB
-- ----------------------------------------------------------------------------
revoke all on function public.create_mmo_server(text, text, uuid, text, integer, text, integer) from anon, public;
grant execute on function public.create_mmo_server(text, text, uuid, text, integer, text, integer) to authenticated, service_role;

revoke all on function public.set_mmo_server_status(uuid, text) from anon, public;
grant execute on function public.set_mmo_server_status(uuid, text) to authenticated, service_role;

revoke all on function public.join_mmo_server(uuid) from anon, public;
grant execute on function public.join_mmo_server(uuid) to authenticated, service_role;

revoke all on function public.leave_mmo_server(uuid) from anon, public;
grant execute on function public.leave_mmo_server(uuid) to authenticated, service_role;

revoke all on function public.heartbeat_mmo_presence(uuid) from anon, public;
grant execute on function public.heartbeat_mmo_presence(uuid) to authenticated, service_role;

revoke all on function public.quick_match(text, text) from anon, public;
grant execute on function public.quick_match(text, text) to authenticated, service_role;

revoke all on function public.gravegain_quick_match(text, text) from anon, public;
grant execute on function public.gravegain_quick_match(text, text) to authenticated, service_role;

revoke all on function public.leaderboard_top(text, text) from anon, public;
grant execute on function public.leaderboard_top(text, text) to authenticated, service_role;

revoke all on function public.game_chart_summary() from anon, public;
grant execute on function public.game_chart_summary() to authenticated, service_role;

revoke all on function public.community_stat_averages() from anon, public;
grant execute on function public.community_stat_averages() to authenticated, service_role;

revoke all on function public.update_match_state(uuid, jsonb) from anon, public;
grant execute on function public.update_match_state(uuid, jsonb) to authenticated, service_role;

revoke all on function public.request_verification(text) from anon, public;
grant execute on function public.request_verification(text) to authenticated, service_role;

revoke all on function public.vocrehab_export_snapshot() from anon, public;
grant execute on function public.vocrehab_export_snapshot() to authenticated, service_role;

revoke all on function public.vocrehab_log_export(text, integer) from anon, public;
grant execute on function public.vocrehab_log_export(text, integer) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 11. SWEEP SETTLEMENT (seclint-09 addendum, 2026-09-15): 0029-flagged RPCs
-- in NO envelope list (missed by DS-SECLINT-07/08 and by Sections 1-10
-- above), settled here with evidence instead of punted to sweep agent 10
-- (which already landed declaring no orphans). Rerunnable: REVOKE/GRANT are
-- idempotent. Signatures verified by grep over supabase/migrations.
--
-- 11a. Nested-only party helpers -> service_role ONLY (07-style, NOT the
-- Section 1-10 grant-authenticated treatment). Evidence: zero direct
-- app/lib .rpc callers; zero CREATE POLICY references; all in-database
-- callers are nested calls inside SECURITY DEFINER party functions
-- (20261014000000_party_interop.sql:40,212-214,236,341,347,368,387,393,
-- 483,489-495,494,516,525,554,585,591-599,602,638,640,642), which run as
-- definer, so revoking client roles changes nothing legitimate (same
-- reasoning as DS-SECLINT-07 Section B). This also deterministically
-- settles the v06 three-way conflict: 20261219000003_sqlint_revoke_org_team
-- (:59-60) + 20261219000006_security_revoke_social (:56-57) revoked
-- authenticated, while 20261219000006_seclint_anon_reads (:159-163)
-- granted it back -- same-version files, ambiguous apply winner. v09
-- applies last, so the grants below are final: no client access.
--   * party_can_act(text, uuid), party_can_admin(text, uuid):
--     DEFINER-nested permission predicates (see call sites above).
--   * party_kind_valid(text) (20261014000000_party_interop.sql:31): pure
--     kind validator, DEFINER-nested only, never granted in any real
--     migration (PUBLIC default until now).
revoke all on function public.party_can_act(text, uuid) from anon, public, authenticated;
grant execute on function public.party_can_act(text, uuid) to service_role;

revoke all on function public.party_can_admin(text, uuid) from anon, public, authenticated;
grant execute on function public.party_can_admin(text, uuid) to service_role;

revoke all on function public.party_kind_valid(text) from anon, public, authenticated;
grant execute on function public.party_kind_valid(text) to service_role;

-- 11b. Clan-economy internals -> service_role ONLY. Evidence:
--   * clan_supporter_tier(numeric) (20261015000100_scale_prune_tribute.sql:
--     1176): pure tier calculator, callers are nested uses inside tribute
--     functions (:1205,:1219), zero app callers, never granted (PUBLIC
--     default until now). Body scopes via auth.uid() but clients have no
--     path; lock to service_role.
--   * credit_clan_channel_revenue_guarded()
--     (20260915000000_security_audit_fixes.sql:36): stub body that only
--     raises 'use credit_clan_channel_revenue with membership check';
--     never granted (PUBLIC default until now). Lock to service_role.
--   * award_signup_credit(uuid, text, text, integer)
--     (20260910030000_lobbies_analytics_and_trial_credit.sql:36): body
--     mints coins trusting p_user/p_coins blindly (no caller check), sole
--     caller is app/api/auth/signup/route.ts:26 via serviceClient().
--     NEVER grant to clients. Note: the defining migration revoked
--     public/anon/authenticated with no grant-back, so even service_role
--     currently lacks EXECUTE -- the grant below restores the server-side
--     signup path while keeping anon/authenticated locked out.
revoke all on function public.clan_supporter_tier(numeric) from anon, public, authenticated;
grant execute on function public.clan_supporter_tier(numeric) to service_role;

revoke all on function public.credit_clan_channel_revenue_guarded() from anon, public, authenticated;
grant execute on function public.credit_clan_channel_revenue_guarded() to service_role;

revoke all on function public.award_signup_credit(uuid, text, text, integer) from anon, public, authenticated;
grant execute on function public.award_signup_credit(uuid, text, text, integer) to service_role;

-- 11c. Clan-wallet mint, user path kept (09-style treatment). Evidence:
-- credit_clan_channel_revenue(uuid, text)
-- (latest body 20261018000000_ledger_pairing_hardening.sql:95, same sig):
-- direct user-JWT RPC from app/api/clans/[slug]/economy/route.ts:115
-- (login-gated), so authenticated stays; anon was progressively revoked
-- (20260915000000 audit, 20261018000000, 20261219000002_sqlint_revoke_clan,
-- 20261219000003_security_revoke_money). Adds the missing service_role
-- grant for server-side jobs; no client widening vs current state.
revoke all on function public.credit_clan_channel_revenue(uuid, text) from anon, public;
grant execute on function public.credit_clan_channel_revenue(uuid, text) to authenticated, service_role;
