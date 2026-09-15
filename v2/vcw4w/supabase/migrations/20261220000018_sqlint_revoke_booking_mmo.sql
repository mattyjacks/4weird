-- ============================================================================
-- DS-SQLINT-09: revoke anon/auth EXECUTE on booking/MMO/compute/unitunite
-- RPCs (0028/0029).
--
-- REVOKE-only: no bodies, triggers, tables, policies, or indexes touched.
-- Booking escrow math, heartbeat splits, ghost rates, room relay semantics,
-- and provision metering are byte-identical; only EXECUTE grants change.
-- Rerunnable: every REVOKE and GRANT below is idempotent. Follows the
-- timer_ownership pattern (20261113000000_timer_ownership_hardening.sql):
-- revoke from public/anon, grant back to authenticated only where the app
-- calls .rpc(name). service_role server callers bypass grants and are
-- unaffected by every statement here.
--
-- .rpc grep verdicts (v2/vcw4w, 2026-09-15):
--   KEEP authenticated (user-JWT .rpc caller exists):
--     create_listing(text,text,text,text,integer) .. app/api/agents/route.ts
--     book_listing(uuid,integer) ................. app/api/agents/[id]/book/route.ts
--     heartbeat_usage(uuid,integer) ............. app/api/agents/bookings/[id]/heartbeat/route.ts
--     end_booking(uuid) ......................... app/api/agents/bookings/[id]/end/route.ts
--     settle_booking_escrow(uuid) ............... app/api/agents/bookings/[id]/end/route.ts
--     ghost_create_contract(uuid,text,uuid,uuid,numeric)  app/api/ghost/contracts/route.ts
--     ghost_clock_in(uuid,text) ................. app/api/ghost/timer/route.ts
--     ghost_beat(uuid,integer) .................. app/api/ghost/timer/route.ts
--     ghost_clock_out(uuid) ..................... app/api/ghost/timer/route.ts
--     ghost_invoice_timer(uuid) ................. app/api/ghost/timer/route.ts
--     ghost_mark_debt(uuid,uuid,uuid,numeric,text)  app/api/ghost/debts/route.ts
--     ghost_settle_debt(uuid,text) .............. app/api/ghost/debts/route.ts
--     ghost_org_summary(uuid) ................... app/api/ghost/summary/route.ts
--     provision_service(uuid,uuid,text,text) ..... app/api/cloud/provision/route.ts
--     send_room_packet(uuid,text,text,text) ..... app/api/unitunite/rooms/[id]/messages/route.ts
--     send_room_packet_as_bot(uuid,text,text) ... app/api/unitunite/rooms/[id]/messages/route.ts
--     read_room_messages(uuid,integer,timestamptz)  app/api/unitunite/rooms/[id]/messages/route.ts
--     list_unitunite_rooms(uuid) ................ app/api/unitunite/rooms/route.ts
--     redact_room_message(uuid) ................. app/api/unitunite/rooms/[id]/messages/route.ts
--     push_file(uuid,text,text,text,text) ....... app/api/newgameplus/build/route.ts
--     set_creator_monetization(uuid,boolean) .... app/api/code/[id]/monetization/route.ts
--     create_room(uuid,text,text,boolean) ....... app/api/unitunite/rooms/route.ts
--       (UNLISTED in-domain room fn, not in any SQLINT envelope: included
--       with authenticated kept because the .rpc caller exists.)
--   REVOKE authenticated too (zero app .rpc callers anywhere in app/lib/components):
--     charge_mmo_minutes(uuid,uuid,timestamptz,integer) .. no caller; host-only
--       charge path. Grant back to authenticated if a user-JWT flow wires it.
--     create_mmo_server(text,text,uuid,text,integer,text,integer) .. no caller.
--     set_mmo_server_status(uuid,text) .......... no caller.
--     join_mmo_server(uuid) ..................... no caller.
--     leave_mmo_server(uuid) .................... no caller.
--     heartbeat_mmo_presence(uuid) .............. no caller.
--     rls_auto_enable() ......................... internal helper; already
--       revoked repo-wide by 20261219000002_security_revoke_internals.sql,
--       restated here idempotently because it is in this envelope's set.
--     vocrehab_export_snapshot() ................ zero .rpc callers: the export
--       route (app/api/vocrehab/export/route.ts) uses direct table reads, not
--       these RPCs. Both are auth.uid()-scoped self-reads; DS-SECWARN-08 plans
--       a keep-authenticated audit for them -- if that lane wires a user-JWT
--       caller, grant execute back to authenticated (see follow-ups).
--     vocrehab_log_export(text,integer) ......... same as above.
--
-- DEDUP (verified, deliberately NOT re-revoked):
--   start_timer(uuid,uuid,text,boolean,boolean,text,text) and
--   stop_timer(uuid,text,uuid,boolean,integer) are already hardened
--   (revoke from public,anon + grant authenticated in both
--   20261113000000_timer_ownership_hardening.sql and
--   20261211000000_ghost_rename.sql), and the app calls both via .rpc
--   (app/api/time/timer/route.ts), so authenticated must stay. Per the
--   envelope dedup rule they are included only if still flagged -- they are
--   not, so no duplicate statements here.
--   agent_room_send / agent_room_read / agent_list_rooms / agent_room_create /
--   _agent_perms_for are already service_role-only (revoked from
--   public,anon,authenticated in 20260929000000_agent_room_relay.sql); nothing to add.
--   meter_usage(uuid,integer) is compute-domain but belongs to DS-SQLINT-07's
--   list -- left untouched, QUEUE-noted for the 07 owner.
-- ============================================================================

-- Booking / listing RPCs: close anon, keep user-JWT access.
revoke all on function public.create_listing(text, text, text, text, integer) from public, anon;
grant execute on function public.create_listing(text, text, text, text, integer) to authenticated;

revoke all on function public.book_listing(uuid, integer) from public, anon;
grant execute on function public.book_listing(uuid, integer) to authenticated;

revoke all on function public.heartbeat_usage(uuid, integer) from public, anon;
grant execute on function public.heartbeat_usage(uuid, integer) to authenticated;

revoke all on function public.end_booking(uuid) from public, anon;
grant execute on function public.end_booking(uuid) to authenticated;

revoke all on function public.settle_booking_escrow(uuid) from public, anon;
grant execute on function public.settle_booking_escrow(uuid) to authenticated;

-- Room RPCs (incl. unlisted in-domain create_room): close anon, keep user-JWT access.
revoke all on function public.create_room(uuid, text, text, boolean) from public, anon;
grant execute on function public.create_room(uuid, text, text, boolean) to authenticated;

revoke all on function public.send_room_packet(uuid, text, text, text) from public, anon;
grant execute on function public.send_room_packet(uuid, text, text, text) to authenticated;

revoke all on function public.send_room_packet_as_bot(uuid, text, text) from public, anon;
grant execute on function public.send_room_packet_as_bot(uuid, text, text) to authenticated;

revoke all on function public.read_room_messages(uuid, integer, timestamptz) from public, anon;
grant execute on function public.read_room_messages(uuid, integer, timestamptz) to authenticated;

revoke all on function public.list_unitunite_rooms(uuid) from public, anon;
grant execute on function public.list_unitunite_rooms(uuid) to authenticated;

revoke all on function public.redact_room_message(uuid) from public, anon;
grant execute on function public.redact_room_message(uuid) to authenticated;

-- Compute / code RPCs with user-JWT callers: close anon, keep authenticated.
revoke all on function public.push_file(uuid, text, text, text, text) from public, anon;
grant execute on function public.push_file(uuid, text, text, text, text) to authenticated;

revoke all on function public.provision_service(uuid, uuid, text, text) from public, anon;
grant execute on function public.provision_service(uuid, uuid, text, text) to authenticated;

revoke all on function public.set_creator_monetization(uuid, boolean) from public, anon;
grant execute on function public.set_creator_monetization(uuid, boolean) to authenticated;

-- Ghost RPCs: close anon, keep user-JWT access.
revoke all on function public.ghost_create_contract(uuid, text, uuid, uuid, numeric) from public, anon;
grant execute on function public.ghost_create_contract(uuid, text, uuid, uuid, numeric) to authenticated;

revoke all on function public.ghost_clock_in(uuid, text) from public, anon;
grant execute on function public.ghost_clock_in(uuid, text) to authenticated;

revoke all on function public.ghost_beat(uuid, integer) from public, anon;
grant execute on function public.ghost_beat(uuid, integer) to authenticated;

revoke all on function public.ghost_clock_out(uuid) from public, anon;
grant execute on function public.ghost_clock_out(uuid) to authenticated;

revoke all on function public.ghost_invoice_timer(uuid) from public, anon;
grant execute on function public.ghost_invoice_timer(uuid) to authenticated;

revoke all on function public.ghost_mark_debt(uuid, uuid, uuid, numeric, text) from public, anon;
grant execute on function public.ghost_mark_debt(uuid, uuid, uuid, numeric, text) to authenticated;

revoke all on function public.ghost_settle_debt(uuid, text) from public, anon;
grant execute on function public.ghost_settle_debt(uuid, text) to authenticated;

revoke all on function public.ghost_org_summary(uuid) from public, anon;
grant execute on function public.ghost_org_summary(uuid) to authenticated;

-- MMO RPCs: zero app callers -- close to client roles entirely (service_role
-- bypasses grants; grant back to authenticated if a user-JWT flow wires them).
revoke all on function public.charge_mmo_minutes(uuid, uuid, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.create_mmo_server(text, text, uuid, text, integer, text, integer) from public, anon, authenticated;
revoke all on function public.set_mmo_server_status(uuid, text) from public, anon, authenticated;
revoke all on function public.join_mmo_server(uuid) from public, anon, authenticated;
revoke all on function public.leave_mmo_server(uuid) from public, anon, authenticated;
revoke all on function public.heartbeat_mmo_presence(uuid) from public, anon, authenticated;

-- Internal helper (in this envelope's set; restated idempotently).
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke all on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

-- VocRehab export RPCs: zero .rpc callers (see header) -- close to clients.
revoke all on function public.vocrehab_export_snapshot() from public, anon, authenticated;
revoke all on function public.vocrehab_log_export(text, integer) from public, anon, authenticated;
