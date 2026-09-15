-- ============================================================================
-- DS-SECFIX2-16: seclint2 delta for lint 0029 rooms/chat RPCs.
--
-- RECONCILIATION against 20261220000013_sqlint_revoke_org_team.sql and
-- 20261220000017_sqlint_revoke_social.sql (both read first):
--   * ...13 covers org/team/party surface only; NONE of the 7 goal RPCs here
--     except indirectly (has_team_perm helpers revoked as internal). Room/chat
--     RPCs are absent from ...13.
--   * ...17 covers open_issue(uuid, text, text) only (revoke public,anon +
--     grant authenticated); the other 6 are absent from ...17. open_issue is
--     restated here for a self-sufficient 0029 rooms/chat file (REVOKE/GRANT
--     are idempotent, cf. ...17 lines 39-40, DS-SECFIX2-07 buy_clan_headroom).
--   * create_room(uuid, text, text, boolean) also restated from DS-SECFIX2-07
--     (20261222000007_seclint2_org_team.sql lines 47-48) for the same reason.
--
-- POLICY: all 7 are authenticated-only (revoke from public,anon + grant
-- authenticated). Every definition requires auth.uid() / perm checks; anon
-- must have no EXECUTE. Service_role server callers bypass grants.
--
-- .rpc grep evidence (v2/vcw4w, `\.rpc\(['"]<name>['"]`):
--   create_room <- app/api/unitunite/rooms/route.ts:109
--   read_room_messages <- app/api/unitunite/rooms/[id]/messages/route.ts:82
--   send_room_packet <- app/api/unitunite/rooms/[id]/messages/route.ts:161
--   send_room_packet_as_bot <- app/api/unitunite/rooms/[id]/messages/route.ts:153
--   redact_room_message <- app/api/unitunite/rooms/[id]/messages/route.ts:216
--   push_file <- app/api/newgameplus/build/route.ts:420 (workspace route)
--   open_issue <- app/api/projects/[id]/issues/route.ts:48 (workspace route)
--
-- Exact signatures from shipped definitions (no pg_proc guards needed):
--   20260910130000_teams_enterprise_bundle.sql:949 open_issue,
--   :996 push_file, :1018 create_room, :1036 send_room_packet,
--   :1057 redact_room_message;
--   20260929000000_agent_room_relay.sql:37 send_room_packet (hardened
--   restatement), :61 send_room_packet_as_bot, :93 read_room_messages.
--
-- Rerunnable: REVOKE/GRANT/ALTER ... SET are idempotent. No tables/policies/triggers/
-- indexes created here. Comments + REVOKE/GRANT + search_path pins only; no CREATE OR REPLACE;
-- never grant anon. All 7 definitions already carry SET search_path = public
-- (20260910130000 lines 950/997/1019/1037/1058, 20260929000000 lines 38/62/94);
-- pins restated idempotently per DS-SECFIX2-07 precedent so a future definition
-- rewrite cannot reintroduce a mutable-search_path lint.
-- ============================================================================

revoke all on function public.create_room(uuid, text, text, boolean) from public, anon;
grant execute on function public.create_room(uuid, text, text, boolean) to authenticated;

revoke all on function public.read_room_messages(uuid, integer, timestamptz) from public, anon;
grant execute on function public.read_room_messages(uuid, integer, timestamptz) to authenticated;

revoke all on function public.send_room_packet(uuid, text, text, text) from public, anon;
grant execute on function public.send_room_packet(uuid, text, text, text) to authenticated;

revoke all on function public.send_room_packet_as_bot(uuid, text, text) from public, anon;
grant execute on function public.send_room_packet_as_bot(uuid, text, text) to authenticated;

revoke all on function public.redact_room_message(uuid) from public, anon;
grant execute on function public.redact_room_message(uuid) to authenticated;

revoke all on function public.push_file(uuid, text, text, text, text) from public, anon;
grant execute on function public.push_file(uuid, text, text, text, text) to authenticated;

revoke all on function public.open_issue(uuid, text, text) from public, anon;
grant execute on function public.open_issue(uuid, text, text) to authenticated;

-- ---- search_path pins (idempotent; definitions already carry SET search_path = public) ----

alter function public.create_room(uuid, text, text, boolean) set search_path = public;
alter function public.read_room_messages(uuid, integer, timestamptz) set search_path = public;
alter function public.send_room_packet(uuid, text, text, text) set search_path = public;
alter function public.send_room_packet_as_bot(uuid, text, text) set search_path = public;
alter function public.redact_room_message(uuid) set search_path = public;
alter function public.push_file(uuid, text, text, text, text) set search_path = public;
alter function public.open_issue(uuid, text, text) set search_path = public;
