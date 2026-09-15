-- ============================================================================
-- DS-SQLINT-04: REVOKE anon/auth on org/team/role/party RPCs (lint 0028/0029).
--
-- Rule: REVOKE FROM anon always. REVOKE FROM authenticated only where the app
-- never calls .rpc(name) (grep over v2/vcw4w/app, lib, components; service_role
-- server callers bypass grants and are unaffected).
--
-- App-called (verified via .rpc grep) -> revoke from public,anon + grant
--   authenticated (timer_ownership pattern):
--   ensure_default_org, create_org, create_team, create_project,
--   create_org_invite_link, list_org_invites, redeem_org_invite,
--   revoke_org_invite, set_member_roles, org_roster, org_roster_page,
--   org_scale_status, set_org_prune_settings, prune_org_members,
--   buy_org_headroom, set_watch_scope, set_my_budget, set_org_budget,
--   party_feed, party_post_create, party_my_invites, party_invite_create,
--   party_invite_decide, party_challenge_create, party_challenge_decide,
--   party_search, party_resolve, party_follow, party_unfollow
--   (party_follow/unfollow are app-called via a dynamic fn toggle).
--
-- Internal / trigger / RLS helpers (no app .rpc) -> revoke from
--   public,anon,authenticated:
--   bump_org_member_count, enforce_org_budget, enforce_org_count,
--   enforce_org_member_cap, enforce_personal_budget, trg_init_org_on_use,
--   trg_init_team_org_on_use, ensure_org_initialized, has_org_perm,
--   has_project_perm, has_team_perm, is_org_member, effective_perms,
--   org_member_cap, org_roles_of, org_watch_visible, team_org, project_team,
--   set_member_role (singular; app uses set_member_roles only),
--   set_self_host_seats, create_custom_role, fund_org_wallet,
--   party_can_act, party_can_admin, party_entity_exists, party_label.
--
-- Rerunnable: REVOKE/GRANT are idempotent. No tables/policies/triggers/
-- indexes created here. Exact signatures from definitions.
-- ============================================================================

-- ---- Trigger / internal helpers: revoke from public, anon, authenticated ----

revoke all on function public.bump_org_member_count() from public, anon, authenticated;
revoke all on function public.enforce_org_budget() from public, anon, authenticated;
revoke all on function public.enforce_org_count() from public, anon, authenticated;
revoke all on function public.enforce_org_member_cap() from public, anon, authenticated;
revoke all on function public.enforce_personal_budget() from public, anon, authenticated;
revoke all on function public.trg_init_org_on_use() from public, anon, authenticated;
revoke all on function public.trg_init_team_org_on_use() from public, anon, authenticated;
revoke all on function public.ensure_org_initialized(uuid) from public, anon, authenticated;
revoke all on function public.has_org_perm(uuid, text) from public, anon, authenticated;
revoke all on function public.has_project_perm(uuid, text) from public, anon, authenticated;
revoke all on function public.has_team_perm(uuid, text) from public, anon, authenticated;
revoke all on function public.is_org_member(uuid) from public, anon, authenticated;
revoke all on function public.effective_perms(text, uuid) from public, anon, authenticated;
revoke all on function public.org_member_cap(uuid) from public, anon, authenticated;
revoke all on function public.org_roles_of(uuid, uuid) from public, anon, authenticated;
revoke all on function public.org_watch_visible(uuid, uuid) from public, anon, authenticated;
revoke all on function public.team_org(uuid) from public, anon, authenticated;
revoke all on function public.project_team(uuid) from public, anon, authenticated;
revoke all on function public.set_member_role(text, uuid, uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.set_self_host_seats(uuid, integer) from public, anon, authenticated;
revoke all on function public.create_custom_role(uuid, uuid, text, text[]) from public, anon, authenticated;
revoke all on function public.fund_org_wallet(uuid, integer) from public, anon, authenticated;
revoke all on function public.party_can_act(text, uuid) from public, anon, authenticated;
revoke all on function public.party_can_admin(text, uuid) from public, anon, authenticated;
revoke all on function public.party_entity_exists(text, uuid) from public, anon, authenticated;
revoke all on function public.party_label(text, uuid) from public, anon, authenticated;

-- ---- App-called RPCs: revoke from public, anon + grant authenticated ----

revoke all on function public.ensure_default_org() from public, anon;
grant execute on function public.ensure_default_org() to authenticated;

revoke all on function public.create_org(text, text) from public, anon;
grant execute on function public.create_org(text, text) to authenticated;

revoke all on function public.create_team(uuid, text, text) from public, anon;
grant execute on function public.create_team(uuid, text, text) to authenticated;

revoke all on function public.create_project(uuid, text, text, text) from public, anon;
grant execute on function public.create_project(uuid, text, text, text) to authenticated;

revoke all on function public.create_org_invite_link(uuid, text, integer, timestamptz, text, uuid) from public, anon;
grant execute on function public.create_org_invite_link(uuid, text, integer, timestamptz, text, uuid) to authenticated;

revoke all on function public.list_org_invites(uuid) from public, anon;
grant execute on function public.list_org_invites(uuid) to authenticated;

revoke all on function public.redeem_org_invite(text) from public, anon;
grant execute on function public.redeem_org_invite(text) to authenticated;

revoke all on function public.revoke_org_invite(uuid) from public, anon;
grant execute on function public.revoke_org_invite(uuid) to authenticated;

revoke all on function public.set_member_roles(uuid, uuid, text[]) from public, anon;
grant execute on function public.set_member_roles(uuid, uuid, text[]) to authenticated;

revoke all on function public.org_roster(uuid) from public, anon;
grant execute on function public.org_roster(uuid) to authenticated;

revoke all on function public.org_roster_page(uuid, integer, timestamptz, uuid, text) from public, anon;
grant execute on function public.org_roster_page(uuid, integer, timestamptz, uuid, text) to authenticated;

revoke all on function public.org_scale_status(uuid) from public, anon;
grant execute on function public.org_scale_status(uuid) to authenticated;

revoke all on function public.set_org_prune_settings(uuid, boolean, integer, integer, text) from public, anon;
grant execute on function public.set_org_prune_settings(uuid, boolean, integer, integer, text) to authenticated;

revoke all on function public.prune_org_members(uuid, text, integer, uuid[], boolean) from public, anon;
grant execute on function public.prune_org_members(uuid, text, integer, uuid[], boolean) to authenticated;

revoke all on function public.buy_org_headroom(uuid, integer) from public, anon;
grant execute on function public.buy_org_headroom(uuid, integer) to authenticated;

revoke all on function public.set_watch_scope(uuid, uuid, uuid[]) from public, anon;
grant execute on function public.set_watch_scope(uuid, uuid, uuid[]) to authenticated;

revoke all on function public.set_my_budget(numeric, integer, boolean) from public, anon;
grant execute on function public.set_my_budget(numeric, integer, boolean) to authenticated;

revoke all on function public.set_org_budget(uuid, numeric, integer, boolean) from public, anon;
grant execute on function public.set_org_budget(uuid, numeric, integer, boolean) to authenticated;

revoke all on function public.party_feed(integer) from public, anon;
grant execute on function public.party_feed(integer) to authenticated;

revoke all on function public.party_post_create(text, uuid, text, uuid, text, text, text) from public, anon;
grant execute on function public.party_post_create(text, uuid, text, uuid, text, text, text) to authenticated;

revoke all on function public.party_my_invites() from public, anon;
grant execute on function public.party_my_invites() to authenticated;

revoke all on function public.party_invite_create(text, uuid, text, uuid, text) from public, anon;
grant execute on function public.party_invite_create(text, uuid, text, uuid, text) to authenticated;

revoke all on function public.party_invite_decide(uuid, boolean) from public, anon;
grant execute on function public.party_invite_decide(uuid, boolean) to authenticated;

revoke all on function public.party_challenge_create(text, uuid, text, uuid, text, text) from public, anon;
grant execute on function public.party_challenge_create(text, uuid, text, uuid, text, text) to authenticated;

revoke all on function public.party_challenge_decide(uuid, text, text, uuid) from public, anon;
grant execute on function public.party_challenge_decide(uuid, text, text, uuid) to authenticated;

revoke all on function public.party_search(text) from public, anon;
grant execute on function public.party_search(text) to authenticated;

revoke all on function public.party_resolve(text, text) from public, anon;
grant execute on function public.party_resolve(text, text) to authenticated;

revoke all on function public.party_follow(text, uuid, text, uuid) from public, anon;
grant execute on function public.party_follow(text, uuid, text, uuid) to authenticated;

revoke all on function public.party_unfollow(text, uuid, text, uuid) from public, anon;
grant execute on function public.party_unfollow(text, uuid, text, uuid) to authenticated;
