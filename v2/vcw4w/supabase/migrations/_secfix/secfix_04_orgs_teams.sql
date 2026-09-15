-- secfix_04_orgs_teams.sql — slice 04: harden org/team/role/watch + UnitUnite room RPCs.
--
-- ENVELOPE NOTE: filed DS-SECLINT-04 asks for anon-writes (book_listing/mmo) at
--   20261219000004_seclint_anon_writes.sql, but the user brief for this slice orders
--   org/team/role/watch hardening into this _secfix file instead. Filed goal NOT done
--   here; discrepancy logged on the envelope. This file touches ONLY grants/search_path.
--
-- METHOD per function: grepped supabase/migrations for the CREATE FUNCTION definition
--   (exact arg list, SECURITY DEFINER + SET search_path, existing REVOKE/GRANT lines);
--   grepped v2/vcw4w/{app,lib,components} for `.rpc("name"` callers for anon analysis.
--   No anon callers found anywhere: every app caller is a session-authenticated API
--   route (user JWT -> authenticated role). Bodies either `raise 'login required'` on
--   auth.uid() NULL or return false/'{}' for anon. RLS policies calling the *_perm /
--   is_org_member helpers run as the querying user, so authenticated keeps EXECUTE;
--   SECURITY DEFINER bodies calling helpers run as owner and bypass grants.
--
-- HARD RULES honored: never REVOKE from authenticated (revokes are FROM anon, PUBLIC
--   only); anon revoked only with the evidence cited; no old migration edited; no app
--   code; every statement idempotent -> rerunnable.
--
-- SKIPS (owned by sibling slices, NOT hardened here):
--   - set_org_budget(uuid,numeric,integer,boolean) [def 20260911000000_coin_expiry...:142]
--     + my_team_perms(uuid) [def 20260910130000_teams...:1141, redef watcher:123] -> slice 08
--     (money/metering + my_* reads). App callers: budgets/route.ts:64,
--     budgets/squads/route.ts:126, squads/[id]/perms/route.ts:15 (all authenticated).
--   - bump_org_member_count(), enforce_org_member_cap(), enforce_org_budget(),
--     enforce_org_count(), enforce_personal_budget(), trg_init_org_on_use(),
--     trg_init_team_org_on_use(), handle_new_user() and other trigger/internal
--     helpers -> slice 03. execute via triggers as owner; no direct app callers.
--   - fund_org_wallet, set_my_budget, set_self_host_seats, buy_org_headroom,
--     agent_room_* (service_role-only), party_* -> out of slice scope.
--
-- DECISION TABLE (sig | def location | prior grants | app caller | verdict):
--   org_member_cap(uuid) | scale_prune:90, stable secdefiner search_path=public, NO prior
--     revoke (anon-callable today) | no direct app caller (used by enforce trigger as
--     owner + org_scale_status) | REVOKE anon + GRANT authenticated (cap reader helper)
--   org_roles_of(uuid,uuid) | watcher:89, sql stable secdefiner search_path=public, NO
--     prior revoke (anon role enumeration) | via org_roster_page body (auth) | REVOKE + GRANT auth
--   org_watch_visible(uuid,uuid) | watcher:203, stable secdefiner, anon->false, NO prior
--     revoke | via ghost summary (auth) | REVOKE + GRANT auth
--   org_roster(uuid) | watcher:504, secdefiner, login+member gated, prior revoke anon +
--     grant auth | members/route.ts:63, watch/route.ts:30 (auth) | re-REVOKE + re-GRANT
--   org_roster_page(uuid,integer,timestamptz,uuid,text) | scale:225, login+member gated,
--     prior revoke/grant | members/route.ts:39 (auth) | re-REVOKE + re-GRANT
--   org_scale_status(uuid) | scale:941, login+member gated, prior revoke/grant |
--     scale/route.ts:34 (auth) | re-REVOKE + re-GRANT
--   create_org(text,text) | bundle:813 + lazy:241, secdefiner, prior revoke anon/authenticated
--     + grant auth | orgs/route.ts:56 (auth) | REVOKE anon,PUBLIC only + re-GRANT auth
--   create_team(uuid,text,text) | bundle:833, prior revoke+grant | squads/route.ts:53 |
--     same pattern
--   create_custom_role(uuid,uuid,text,text[]) | bundle:854, prior revoke+grant | no current
--     app caller (legacy/admin path; grant preserved, never widened) | same pattern
--   set_member_role(text,uuid,uuid,text,uuid) | bundle:891 (p_custom default null), prior
--     revoke+grant | no current app caller (plural variant used instead) | same pattern
--   set_member_roles(uuid,uuid,text[]) | watcher:149, prior revoke anon+grant auth |
--     members/roles/route.ts:39 | re-REVOKE + re-GRANT
--   set_watch_scope(uuid,uuid,uuid[]) | watcher:175, prior revoke+grant | watch/route.ts:59 |
--     re-REVOKE + re-GRANT
--   create_project(uuid,text,text,text) | bundle:920 (p_visibility default 'private'), prior
--     revoke+grant | projects/route.ts:40, newgameplus/build:381 | same pattern
--   create_room(uuid,text,text,boolean) | bundle:1018 (p_encrypted default true), prior
--     revoke+grant | unitunite/rooms/route.ts:109 | same pattern
--   send_room_packet(uuid,text,text,text) | relay:37 (replaces bundle:1036), rooms.send gated,
--     prior revoke+grant | rooms/[id]/messages/route.ts:161 | same pattern
--   send_room_packet_as_bot(uuid,text,text) | relay:61 (p_bot_name default ''), prior
--     revoke+grant | messages/route.ts:153 | same pattern
--   read_room_messages(uuid,integer,timestamptz) | relay:93 (defaults 50/null), rooms.view
--     gated, prior revoke+grant | messages/route.ts:82 | same pattern
--   redact_room_message(uuid) | bundle:1057, prior revoke+grant | messages/route.ts:216 |
--     same pattern
--   list_unitunite_rooms(uuid) | relay:134, rooms.view gated, prior revoke+grant |
--     rooms/route.ts:57 | same pattern
--   create_org_invite_link(uuid,text,integer,timestamptz,text,uuid) | lazy:278 (defaults
--     viewer/null/null/''/null), invite-perm gated, prior revoke+grant | invites/route.ts:73 |
--     re-REVOKE + re-GRANT
--   redeem_org_invite(text) | lazy:313, login gated, prior revoke+grant |
--     invites/redeem/route.ts:38 | re-REVOKE + re-GRANT
--   revoke_org_invite(uuid) | lazy:343, invite-perm gated, prior revoke+grant |
--     invites/route.ts:118 | re-REVOKE + re-GRANT
--   list_org_invites(uuid) | lazy:358, invite-perm gated, prior revoke+grant |
--     invites/route.ts:27 | re-REVOKE + re-GRANT
--   ensure_default_org() | lazy:81, login gated, prior revoke+grant | orgs/route.ts:23 |
--     re-REVOKE + re-GRANT
--   ensure_org_initialized(uuid) | lazy:46, member/owner gated, prior revoke+grant |
--     internal + triggers (auth) | re-REVOKE + re-GRANT
--   set_org_prune_settings(uuid,boolean,integer,integer,text) | scale:347, login+owner gated,
--     prior revoke+grant | scale/route.ts:69 | re-REVOKE + re-GRANT
--   prune_org_members(uuid,text,integer,uuid[],boolean) | scale:407 (defaults
--     oldest_activity_first/200/null/false), owner-or-remove-perm gated, prior revoke+grant |
--     scale/route.ts:85 | re-REVOKE + re-GRANT
--   effective_perms(text,uuid) | bundle:520, stable search_path=public, NOT security definer
--     (left as-is: body shape belongs to owning lane), NO prior revoke | RLS/policy + RPC-body
--     use (auth) | REVOKE anon + GRANT auth
--   is_org_member(uuid) | bundle:532 (+rls fix:26), sql stable search_path=public, NO prior
--     revoke, anon->false | RLS policies (org_prune_settings_member_read,
--     member_roles_read) + RPC bodies | REVOKE + GRANT auth
--   has_org_perm(uuid,text) | bundle:539 (+rls fix:33, watcher:103 choke point), NO prior
--     revoke, anon->false | RLS + every gated RPC body | REVOKE + GRANT auth
--   team_org(uuid) | bundle:551 (+rls fix:45), sql stable, NO prior revoke (anon team->org
--     mapping disclosure) | RPC bodies (auth) | REVOKE + GRANT auth
--   has_team_perm(uuid,text) | bundle:556 (+rls fix:50), anon->false (public-team view
--     fallback needs auth context), NO prior revoke | room/gated RPC bodies | REVOKE + GRANT auth
--   has_project_perm(uuid,text) | bundle:584 (+rls fix:78), anon->false, NO prior revoke |
--     project RPC bodies | REVOKE + GRANT auth
--
-- NEEDS-HUMAN (not changed here, follow-ups for owning lanes):
--   1. effective_perms(text,uuid) is stable WITHOUT security definer while every sibling
--      helper is secdefiner — confirm intentional (RLS-query ergonomics) or promote in owning lane.
--   2. has_team_perm grants rooms.view/project.view to anon-context callers on
--      internal/public teams via the visibility fallback — works only when some outer layer
--      still allows anon EXECUTE; after this revoke, true-anon callers get permission-denied
--      instead of false. If a public-lurker read path is wanted, it must go through an
--      explicit anon-granted wrapper (e.g. clan_roster_page pattern), not this helper.
--   3. set_member_role (singular) + create_custom_role have no current app callers
--      (superseded by set_member_roles junction flow) — owning lane should confirm keep vs drop.
--   4. Filed envelope goal (anon-writes book_listing/mmo migration) is still OPEN — needs its
--      own agent/slice; this file must not be mistaken for it.

-- ---------------------------------------------------------------------------
-- 1. Read helpers with NO prior revoke (anon-callable today): lock to auth.
-- ---------------------------------------------------------------------------
revoke all on function public.org_member_cap(uuid) from anon, public;
grant execute on function public.org_member_cap(uuid) to authenticated;
alter function public.org_member_cap(uuid) set search_path = public;

revoke all on function public.org_roles_of(uuid, uuid) from anon, public;
grant execute on function public.org_roles_of(uuid, uuid) to authenticated;
alter function public.org_roles_of(uuid, uuid) set search_path = public;

revoke all on function public.org_watch_visible(uuid, uuid) from anon, public;
grant execute on function public.org_watch_visible(uuid, uuid) to authenticated;
alter function public.org_watch_visible(uuid, uuid) set search_path = public;

revoke all on function public.effective_perms(text, uuid) from anon, public;
grant execute on function public.effective_perms(text, uuid) to authenticated;
alter function public.effective_perms(text, uuid) set search_path = public;

revoke all on function public.is_org_member(uuid) from anon, public;
grant execute on function public.is_org_member(uuid) to authenticated;
alter function public.is_org_member(uuid) set search_path = public;

revoke all on function public.has_org_perm(uuid, text) from anon, public;
grant execute on function public.has_org_perm(uuid, text) to authenticated;
alter function public.has_org_perm(uuid, text) set search_path = public;

revoke all on function public.team_org(uuid) from anon, public;
grant execute on function public.team_org(uuid) to authenticated;
alter function public.team_org(uuid) set search_path = public;

revoke all on function public.has_team_perm(uuid, text) from anon, public;
grant execute on function public.has_team_perm(uuid, text) to authenticated;
alter function public.has_team_perm(uuid, text) set search_path = public;

revoke all on function public.has_project_perm(uuid, text) from anon, public;
grant execute on function public.has_project_perm(uuid, text) to authenticated;
alter function public.has_project_perm(uuid, text) set search_path = public;

-- ---------------------------------------------------------------------------
-- 2. Roster / scale reads (prior anon revoke exists; belt-and-braces re-apply).
-- ---------------------------------------------------------------------------
revoke all on function public.org_roster(uuid) from anon, public;
grant execute on function public.org_roster(uuid) to authenticated;
alter function public.org_roster(uuid) set search_path = public;

revoke all on function public.org_roster_page(uuid, integer, timestamptz, uuid, text) from anon, public;
grant execute on function public.org_roster_page(uuid, integer, timestamptz, uuid, text) to authenticated;
alter function public.org_roster_page(uuid, integer, timestamptz, uuid, text) set search_path = public;

revoke all on function public.org_scale_status(uuid) from anon, public;
grant execute on function public.org_scale_status(uuid) to authenticated;
alter function public.org_scale_status(uuid) set search_path = public;

-- ---------------------------------------------------------------------------
-- 3. Membership / role / watch writes.
-- ---------------------------------------------------------------------------
revoke all on function public.set_member_roles(uuid, uuid, text[]) from anon, public;
grant execute on function public.set_member_roles(uuid, uuid, text[]) to authenticated;
alter function public.set_member_roles(uuid, uuid, text[]) set search_path = public;

revoke all on function public.set_watch_scope(uuid, uuid, uuid[]) from anon, public;
grant execute on function public.set_watch_scope(uuid, uuid, uuid[]) to authenticated;
alter function public.set_watch_scope(uuid, uuid, uuid[]) set search_path = public;

-- Legacy single-role setter (no current app caller; grant preserved, never widened).
revoke all on function public.set_member_role(text, uuid, uuid, text, uuid) from anon, public;
grant execute on function public.set_member_role(text, uuid, uuid, text, uuid) to authenticated;
alter function public.set_member_role(text, uuid, uuid, text, uuid) set search_path = public;

-- ---------------------------------------------------------------------------
-- 4. Org / team / project / custom-role creation.
-- ---------------------------------------------------------------------------
revoke all on function public.create_org(text, text) from anon, public;
grant execute on function public.create_org(text, text) to authenticated;
alter function public.create_org(text, text) set search_path = public;

revoke all on function public.create_team(uuid, text, text) from anon, public;
grant execute on function public.create_team(uuid, text, text) to authenticated;
alter function public.create_team(uuid, text, text) set search_path = public;

revoke all on function public.create_custom_role(uuid, uuid, text, text[]) from anon, public;
grant execute on function public.create_custom_role(uuid, uuid, text, text[]) to authenticated;
alter function public.create_custom_role(uuid, uuid, text, text[]) set search_path = public;

revoke all on function public.create_project(uuid, text, text, text) from anon, public;
grant execute on function public.create_project(uuid, text, text, text) to authenticated;
alter function public.create_project(uuid, text, text, text) set search_path = public;

-- ---------------------------------------------------------------------------
-- 5. UnitUnite rooms (create / send / read / redact / list).
-- ---------------------------------------------------------------------------
revoke all on function public.create_room(uuid, text, text, boolean) from anon, public;
grant execute on function public.create_room(uuid, text, text, boolean) to authenticated;
alter function public.create_room(uuid, text, text, boolean) set search_path = public;

revoke all on function public.send_room_packet(uuid, text, text, text) from anon, public;
grant execute on function public.send_room_packet(uuid, text, text, text) to authenticated;
alter function public.send_room_packet(uuid, text, text, text) set search_path = public;

revoke all on function public.send_room_packet_as_bot(uuid, text, text) from anon, public;
grant execute on function public.send_room_packet_as_bot(uuid, text, text) to authenticated;
alter function public.send_room_packet_as_bot(uuid, text, text) set search_path = public;

revoke all on function public.read_room_messages(uuid, integer, timestamptz) from anon, public;
grant execute on function public.read_room_messages(uuid, integer, timestamptz) to authenticated;
alter function public.read_room_messages(uuid, integer, timestamptz) set search_path = public;

revoke all on function public.redact_room_message(uuid) from anon, public;
grant execute on function public.redact_room_message(uuid) to authenticated;
alter function public.redact_room_message(uuid) set search_path = public;

revoke all on function public.list_unitunite_rooms(uuid) from anon, public;
grant execute on function public.list_unitunite_rooms(uuid) to authenticated;
alter function public.list_unitunite_rooms(uuid) set search_path = public;

-- ---------------------------------------------------------------------------
-- 6. Org invites + lazy init.
-- ---------------------------------------------------------------------------
revoke all on function public.create_org_invite_link(uuid, text, integer, timestamptz, text, uuid) from anon, public;
grant execute on function public.create_org_invite_link(uuid, text, integer, timestamptz, text, uuid) to authenticated;
alter function public.create_org_invite_link(uuid, text, integer, timestamptz, text, uuid) set search_path = public;

revoke all on function public.redeem_org_invite(text) from anon, public;
grant execute on function public.redeem_org_invite(text) to authenticated;
alter function public.redeem_org_invite(text) set search_path = public;

revoke all on function public.revoke_org_invite(uuid) from anon, public;
grant execute on function public.revoke_org_invite(uuid) to authenticated;
alter function public.revoke_org_invite(uuid) set search_path = public;

revoke all on function public.list_org_invites(uuid) from anon, public;
grant execute on function public.list_org_invites(uuid) to authenticated;
alter function public.list_org_invites(uuid) set search_path = public;

revoke all on function public.ensure_default_org() from anon, public;
grant execute on function public.ensure_default_org() to authenticated;
alter function public.ensure_default_org() set search_path = public;

revoke all on function public.ensure_org_initialized(uuid) from anon, public;
grant execute on function public.ensure_org_initialized(uuid) to authenticated;
alter function public.ensure_org_initialized(uuid) set search_path = public;

-- ---------------------------------------------------------------------------
-- 7. Prune settings + prune sweep.
-- ---------------------------------------------------------------------------
revoke all on function public.set_org_prune_settings(uuid, boolean, integer, integer, text) from anon, public;
grant execute on function public.set_org_prune_settings(uuid, boolean, integer, integer, text) to authenticated;
alter function public.set_org_prune_settings(uuid, boolean, integer, integer, text) set search_path = public;

revoke all on function public.prune_org_members(uuid, text, integer, uuid[], boolean) from anon, public;
grant execute on function public.prune_org_members(uuid, text, integer, uuid[], boolean) to authenticated;
alter function public.prune_org_members(uuid, text, integer, uuid[], boolean) set search_path = public;
