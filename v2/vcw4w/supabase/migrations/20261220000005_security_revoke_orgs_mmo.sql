-- ============================================================================
-- DS-SECWARN-06: revoke anon (and authenticated where no legit user-JWT call)
-- on ORG/TEAM/ROOM/MMO/MATCH RPCs.
--
-- Pattern: timer_ownership hardening (20261113000000) / sqlint_revoke_social
-- (20261219000007_sqlint_revoke_social.sql) -- REVOKE ALL FROM public/anon
-- (+ GRANT EXECUTE to authenticated) where the app calls .rpc(name) via
-- user-JWT (all app/api routes below use createClient() + auth.getUser(),
-- i.e. authenticated-role calls); REVOKE ALL FROM public/anon/authenticated
-- where nothing calls it. REVOKE-only, rerunnable (all statements
-- idempotent). No tables/policies/triggers/indexes created here.
--
-- .rpc grep evidence (repo-wide `\.rpc\(['"]<name>['"]`, v2/vcw4w, app+lib
-- source hits; .next build chunks excluded as artifacts):
--   CALLED via user-JWT app/api routes (keep authenticated, QUEUE
--   accepted-risk logged by secwarn-06):
--     create_org (app/api/orgs/route.ts:56),
--     create_team (app/api/squads/route.ts:53),
--     create_project (app/api/projects/route.ts:40,
--       app/api/newgameplus/build/route.ts:381),
--     open_issue (app/api/projects/[id]/issues/route.ts:48),
--     push_file (app/api/newgameplus/build/route.ts:420),
--     create_room + list_unitunite_rooms (app/api/unitunite/rooms/route.ts),
--     send_room_packet + send_room_packet_as_bot + read_room_messages +
--       redact_room_message (app/api/unitunite/rooms/[id]/messages/route.ts),
--     provision_service (app/api/cloud/provision/route.ts:40),
--     org_roster + org_roster_page (app/api/orgs/[id]/members/route.ts),
--     org_roster (app/api/orgs/[id]/watch/route.ts:30),
--     list_org_invites + create_org_invite_link + revoke_org_invite
--       (app/api/orgs/[id]/invites/route.ts),
--     redeem_org_invite (app/api/orgs/invites/redeem/route.ts:38),
--     prune_org_members + set_org_prune_settings
--       (app/api/orgs/[id]/scale/route.ts),
--     prune_clan_members (app/api/clans/[slug]/scale/route.ts:142),
--     set_member_roles (app/api/orgs/[id]/members/roles/route.ts:39),
--     post_mp_event + read_mp_events (app/api/matches/[id]/events/route.ts),
--     update_match_state (app/api/matches/[id]/route.ts:98),
--     create_lobby + list_joinable_lobbies + list_all_open_lobbies
--       (app/api/lobbies/route.ts),
--     join_lobby (app/api/lobbies/[id]/join/route.ts:61),
--     set_my_budget + set_org_budget (app/api/budgets/route.ts:64-65,
--       app/api/budgets/squads/route.ts:126),
--     start_timer + stop_timer (app/api/time/timer/route.ts:114,162).
--   NEVER RPC-called in app/lib source (revoke authenticated too; internal
--   SECURITY DEFINER callers run as owner and service_role bypasses grants):
--     comment_issue, close_issue, org_member_cap, create_custom_role,
--     set_member_role, effective_perms, has_org_perm, has_project_perm,
--     has_team_perm, is_org_member, org_roles_of, org_watch_visible,
--     project_team, team_org, create_mmo_server, set_mmo_server_status,
--     join_mmo_server, leave_mmo_server, heartbeat_mmo_presence,
--     quick_match, gravegain_quick_match. Zero source matches each.
--
-- Already-revoked-at-source overlap (restated here; REVOKE is idempotent):
--   teams bundle (20260910130000) revoked+granted-authenticated:
--     create_org/team/project, open/comment/close_issue, push_file,
--     create_room, send_room_packet, redact_room_message, provision_service,
--     create_custom_role, set_member_role.
--   agent_room_relay (20260929000000): send_room_packet,
--     send_room_packet_as_bot, read_room_messages, list_unitunite_rooms.
--   default_org_lazy_init (20260928000000): create_org_invite_link,
--     redeem/revoke_org_invite, list_org_invites.
--   watcher_multirole (20260925000100): set_member_roles, org_roster.
--   scale_prune_tribute (20261015000100): org_roster_page,
--     set_org_prune_settings, prune_org_members, prune_clan_members.
--   lobbies bundle (20260910030000): create_lobby, list_joinable_lobbies,
--     join_lobby, list_all_open_lobbies.
--   budgets (20260911000000): set_my_budget, set_org_budget.
--   timer hardening (20261113000000) + ghost_rename (20261211000000):
--     start_timer, stop_timer.
--   sqlint_revoke_social (20261219000007): open_issue (kept auth),
--     comment_issue + close_issue (revoked auth too).
-- NOT previously revoked anywhere (first revoke lands here):
--   org_member_cap, effective_perms, has_org_perm, has_project_perm,
--   has_team_perm, is_org_member, org_roles_of, org_watch_visible,
--   project_team, team_org, create_mmo_server, set_mmo_server_status,
--   join_mmo_server, leave_mmo_server, heartbeat_mmo_presence,
--   quick_match, gravegain_quick_match, post_mp_event, read_mp_events,
--   update_match_state.
-- Signatures verified against CREATE FUNCTION lines in source migrations
-- (multiline defs resolved: start/stop_timer, create_org_invite_link,
-- org_roster_page, set_org_prune_settings, prune_org/clan_members,
-- create_mmo_server, set_mmo_server_status).
-- ============================================================================

-- -- 1. Called RPCs: drop anon, keep authenticated. ---------------------------
revoke all on function public.create_org(text, text) from public, anon;
grant execute on function public.create_org(text, text) to authenticated;

revoke all on function public.create_team(uuid, text, text) from public, anon;
grant execute on function public.create_team(uuid, text, text) to authenticated;

revoke all on function public.create_project(uuid, text, text, text) from public, anon;
grant execute on function public.create_project(uuid, text, text, text) to authenticated;

revoke all on function public.open_issue(uuid, text, text) from public, anon;
grant execute on function public.open_issue(uuid, text, text) to authenticated;

revoke all on function public.push_file(uuid, text, text, text, text) from public, anon;
grant execute on function public.push_file(uuid, text, text, text, text) to authenticated;

revoke all on function public.create_room(uuid, text, text, boolean) from public, anon;
grant execute on function public.create_room(uuid, text, text, boolean) to authenticated;

revoke all on function public.send_room_packet(uuid, text, text, text) from public, anon;
grant execute on function public.send_room_packet(uuid, text, text, text) to authenticated;

revoke all on function public.send_room_packet_as_bot(uuid, text, text) from public, anon;
grant execute on function public.send_room_packet_as_bot(uuid, text, text) to authenticated;

revoke all on function public.read_room_messages(uuid, integer, timestamptz) from public, anon;
grant execute on function public.read_room_messages(uuid, integer, timestamptz) to authenticated;

revoke all on function public.redact_room_message(uuid) from public, anon;
grant execute on function public.redact_room_message(uuid) to authenticated;

revoke all on function public.list_unitunite_rooms(uuid) from public, anon;
grant execute on function public.list_unitunite_rooms(uuid) to authenticated;

revoke all on function public.provision_service(uuid, uuid, text, text) from public, anon;
grant execute on function public.provision_service(uuid, uuid, text, text) to authenticated;

revoke all on function public.org_roster(uuid) from public, anon;
grant execute on function public.org_roster(uuid) to authenticated;

revoke all on function public.org_roster_page(uuid, integer, timestamptz, uuid, text) from public, anon;
grant execute on function public.org_roster_page(uuid, integer, timestamptz, uuid, text) to authenticated;

revoke all on function public.list_org_invites(uuid) from public, anon;
grant execute on function public.list_org_invites(uuid) to authenticated;

revoke all on function public.create_org_invite_link(uuid, text, integer, timestamptz, text, uuid) from public, anon;
grant execute on function public.create_org_invite_link(uuid, text, integer, timestamptz, text, uuid) to authenticated;

revoke all on function public.redeem_org_invite(text) from public, anon;
grant execute on function public.redeem_org_invite(text) to authenticated;

revoke all on function public.revoke_org_invite(uuid) from public, anon;
grant execute on function public.revoke_org_invite(uuid) to authenticated;

revoke all on function public.prune_clan_members(uuid, text, integer, uuid[], boolean) from public, anon;
grant execute on function public.prune_clan_members(uuid, text, integer, uuid[], boolean) to authenticated;

revoke all on function public.prune_org_members(uuid, text, integer, uuid[], boolean) from public, anon;
grant execute on function public.prune_org_members(uuid, text, integer, uuid[], boolean) to authenticated;

revoke all on function public.set_org_prune_settings(uuid, boolean, integer, integer, text) from public, anon;
grant execute on function public.set_org_prune_settings(uuid, boolean, integer, integer, text) to authenticated;

revoke all on function public.set_member_roles(uuid, uuid, text[]) from public, anon;
grant execute on function public.set_member_roles(uuid, uuid, text[]) to authenticated;

revoke all on function public.post_mp_event(uuid, text, text) from public, anon;
grant execute on function public.post_mp_event(uuid, text, text) to authenticated;

revoke all on function public.read_mp_events(uuid, timestamptz, integer) from public, anon;
grant execute on function public.read_mp_events(uuid, timestamptz, integer) to authenticated;

revoke all on function public.update_match_state(uuid, jsonb) from public, anon;
grant execute on function public.update_match_state(uuid, jsonb) to authenticated;

revoke all on function public.create_lobby(text, text, text, text) from public, anon;
grant execute on function public.create_lobby(text, text, text, text) to authenticated;

revoke all on function public.join_lobby(uuid, text) from public, anon;
grant execute on function public.join_lobby(uuid, text) to authenticated;

revoke all on function public.list_joinable_lobbies(text) from public, anon;
grant execute on function public.list_joinable_lobbies(text) to authenticated;

revoke all on function public.list_all_open_lobbies(text) from public, anon;
grant execute on function public.list_all_open_lobbies(text) to authenticated;

revoke all on function public.set_my_budget(numeric, integer, boolean) from public, anon;
grant execute on function public.set_my_budget(numeric, integer, boolean) to authenticated;

revoke all on function public.set_org_budget(uuid, numeric, integer, boolean) from public, anon;
grant execute on function public.set_org_budget(uuid, numeric, integer, boolean) to authenticated;

revoke all on function public.start_timer(uuid, uuid, text, boolean, boolean, text, text) from public, anon;
grant execute on function public.start_timer(uuid, uuid, text, boolean, boolean, text, text) to authenticated;

revoke all on function public.stop_timer(uuid, text, uuid, boolean, integer) from public, anon;
grant execute on function public.stop_timer(uuid, text, uuid, boolean, integer) to authenticated;

-- -- 2. Never RPC-called: revoke anon AND authenticated. ----------------------
revoke all on function public.comment_issue(uuid, text) from public, anon, authenticated;
revoke all on function public.close_issue(uuid, boolean) from public, anon, authenticated;
revoke all on function public.org_member_cap(uuid) from public, anon, authenticated;
revoke all on function public.create_custom_role(uuid, uuid, text, text[]) from public, anon, authenticated;
revoke all on function public.set_member_role(text, uuid, uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.effective_perms(text, uuid) from public, anon, authenticated;
revoke all on function public.has_org_perm(uuid, text) from public, anon, authenticated;
revoke all on function public.has_project_perm(uuid, text) from public, anon, authenticated;
revoke all on function public.has_team_perm(uuid, text) from public, anon, authenticated;
revoke all on function public.is_org_member(uuid) from public, anon, authenticated;
revoke all on function public.org_roles_of(uuid, uuid) from public, anon, authenticated;
revoke all on function public.org_watch_visible(uuid, uuid) from public, anon, authenticated;
revoke all on function public.project_team(uuid) from public, anon, authenticated;
revoke all on function public.team_org(uuid) from public, anon, authenticated;
revoke all on function public.create_mmo_server(text, text, uuid, text, integer, text, integer) from public, anon, authenticated;
revoke all on function public.set_mmo_server_status(uuid, text) from public, anon, authenticated;
revoke all on function public.join_mmo_server(uuid) from public, anon, authenticated;
revoke all on function public.leave_mmo_server(uuid) from public, anon, authenticated;
revoke all on function public.heartbeat_mmo_presence(uuid) from public, anon, authenticated;
revoke all on function public.quick_match(text, text) from public, anon, authenticated;
revoke all on function public.gravegain_quick_match(text, text) from public, anon, authenticated;
