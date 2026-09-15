-- ============================================================================
-- DS-SECFIX2-07: seclint2 delta for lint 0029 org/team RPCs.
--
-- CONTEXT: 20261220000013_sqlint_revoke_org_team.sql already sets the intended
-- policy (revoke public,anon + grant authenticated) for the core org/team
-- surface: create_org, create_team, create_project, create_org_invite_link,
-- list/redeem/revoke_org_invite, set_member_roles, org_roster,
-- org_roster_page, org_scale_status, set_org_prune_settings,
-- prune_org_members, buy_org_headroom, set_watch_scope, set_org_budget.
-- This file closes the RESIDUAL GAP: five goal-list RPCs that are app-called
-- via user-JWT .rpc (verified by grep over v2/vcw4w/app) but are NOT covered
-- by ...13 (they were only covered by the 20261219 seclint files, which the
-- SECFIX2 wave restates in sqlint style):
--   * public.create_room(uuid, text, text, boolean)
--       <- app/api/unitunite/rooms/route.ts .rpc("create_room")
--   * public.my_team_perms(uuid)
--       <- app/api/squads/[id]/perms/route.ts .rpc("my_team_perms")
--   * public.list_unitunite_rooms(uuid)
--       <- app/api/unitunite/rooms/route.ts .rpc("list_unitunite_rooms")
--   * public.provision_service(uuid, uuid, text, text)
--       <- app/api/cloud/provision/route.ts .rpc("provision_service")
--   * public.buy_clan_headroom(uuid, integer)
--       <- app/api/clans/[slug]/scale/route.ts .rpc("buy_clan_headroom")
--       (goal-requested cross-check; canonically covered by
--       20261220000012_sqlint_revoke_clan.sql, restated here for the 0029
--       org/team reconciliation so this file is self-sufficient evidence.)
--
-- NON-EXISTENT (checked, deliberately absent — no statements emitted):
--   * create_org_invite (bare): only create_org_invite_link exists; the goal
--     shorthand "create/redeem/revoke_org_invite" maps to
--     create_org_invite_link / redeem_org_invite / revoke_org_invite, all
--     already covered by ...13.
--
-- POLICY per function below: revoke from public,anon + grant authenticated
-- (app calls each via the user-JWT client; service_role bypasses grants and
-- is unaffected). Revoking authenticated would break the app. Anon must have
-- no EXECUTE: every definition requires auth.uid() / perm checks.
--
-- Rerunnable: REVOKE/GRANT/ALTER ... SET are idempotent. No tables, policies,
-- triggers, or indexes created here. Exact signatures from definitions
-- (20260910130000_teams_enterprise_bundle.sql, 20260929000000_agent_room_relay.sql,
-- 20261015000100_scale_prune_tribute.sql).
-- ============================================================================

-- ---- App-called org/team RPCs missing from ...13: anon-free, authenticated kept ----

revoke all on function public.create_room(uuid, text, text, boolean) from public, anon;
grant execute on function public.create_room(uuid, text, text, boolean) to authenticated;

revoke all on function public.my_team_perms(uuid) from public, anon;
grant execute on function public.my_team_perms(uuid) to authenticated;

revoke all on function public.list_unitunite_rooms(uuid) from public, anon;
grant execute on function public.list_unitunite_rooms(uuid) to authenticated;

revoke all on function public.provision_service(uuid, uuid, text, text) from public, anon;
grant execute on function public.provision_service(uuid, uuid, text, text) to authenticated;

revoke all on function public.buy_clan_headroom(uuid, integer) from public, anon;
grant execute on function public.buy_clan_headroom(uuid, integer) to authenticated;

-- ---- search_path pins (definitions already carry SET search_path = public;
--      restated idempotently so a future definition rewrite cannot reintroduce
--      a mutable-search_path lint) ----

alter function public.create_room(uuid, text, text, boolean) set search_path = public;
alter function public.my_team_perms(uuid) set search_path = public;
alter function public.list_unitunite_rooms(uuid) set search_path = public;
alter function public.provision_service(uuid, uuid, text, text) set search_path = public;
alter function public.buy_clan_headroom(uuid, integer) set search_path = public;
