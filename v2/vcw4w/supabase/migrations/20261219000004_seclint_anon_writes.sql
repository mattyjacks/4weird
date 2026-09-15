-- ============================================================================
-- 4WEIRD SECLINT ANON WRITES REVOCATION (DS-SECLINT-04, seclint-04)
--
-- State-changing 0028-flagged RPCs must never be executable by anonymous
-- users: anonymous callers must never book, create, join, charge, or mutate
-- match state. Several of these functions shipped with GRANT EXECUTE to
-- authenticated but no REVOKE from anon/PUBLIC (quick_match,
-- update_match_state, the gravegain trio, all six MMO RPCs), leaving the
-- default PUBLIC execute path open to the anon role. This file closes it.
-- It creates no tables, columns, or indexes, and it touches no other
-- migration's objects: REVOKE + GRANT on exact function signatures only.
--
-- Anonymous-caller audit (grep app/lib for .rpc("<name>") before writing):
--   * components/**: zero callers of any of the 15 RPCs.
--   * lib/**: zero callers (lib .rpc sites are check_abuse_bucket,
--     meter_clan_posting_fee_for, log_clan_ai_usage, log_clan_transfer).
--   * app/api/**: all call sites are server routes on the user-scoped
--     client with an explicit 401 "Login required" guard BEFORE the rpc:
--     agents/[id]/book (book_listing), agents route (create_listing),
--     bookings/[id]/heartbeat (heartbeat_usage), bookings/[id]/end
--     (end_booking), matches/[id] route (update_match_state),
--     matches/[id]/events (read_mp_events, post_mp_event), matches route
--     (quick_match / gravegain_quick_match, auth + age-band gated).
--   * No public-lobby or other legit anon flow exists for any of them, so
--     NO function gets anon granted back. Every function body additionally
--     raises on null auth.uid() (defense in depth); this file fixes the
--     grant layer underneath it.
--
-- Decisions per function (all DENY anon; row-level guard lives in the body):
--   * book_listing(uuid, integer): DENY anon. Escrows coins; renters only.
--   * create_listing(text x4, integer): DENY anon. Publishes rentals.
--   * create_mmo_server(7 args): DENY anon. Host-only create, login gate.
--   * end_booking(uuid): DENY anon. Renter/owner close only.
--   * heartbeat_usage(uuid, integer): DENY anon. Meters escrowed spend.
--   * heartbeat_mmo_presence(uuid): DENY anon. Member-only heartbeat.
--   * join_mmo_server(uuid): DENY anon. Membership write.
--   * leave_mmo_server(uuid): DENY anon. Membership write.
--   * charge_mmo_minutes(uuid, uuid, timestamptz, integer): DENY anon.
--     Host-only charge rows.
--   * set_mmo_server_status(uuid, text): DENY anon. Host-only transition.
--   * update_match_state(uuid, jsonb): DENY anon. Participant-only write.
--   * post_mp_event(uuid, text, text): DENY anon. Participant-only write.
--   * read_mp_events(uuid, timestamptz, integer): DENY anon. Although read-
--     shaped, it discloses per-match feed state to participants only and is
--     in the envelope's state-changing set; participant route guard stays.
--   * quick_match(text, text): DENY anon. Enqueues + creates matches.
--   * gravegain_quick_match(text, text): DENY anon. Same, GraveGain slugs.
--
-- Explicitly SCOPED OUT (do NOT add here):
--   * Read-only helpers (my_friends, community_stat_averages, lobby list
--     RPCs): not state-changing, not in the envelope set.
--   * Clan/economy/abuse RPCs (meter_clan_posting_fee_for, log_clan_*,
--     check_abuse_bucket): other lanes own them (QUEUE.md).
--   * RLS policies: function bodies already enforce auth.uid(); no policy
--     edits needed.
--
-- Fully rerunnable: REVOKE ALL ... FROM anon, PUBLIC is idempotent, and
-- GRANT EXECUTE re-grants idempotently, so the file stays safe to re-push
-- against dashboard-built databases. Append-only: never edit a shipped
-- migration, including this one once pushed — repairs go in a NEW
-- timestamped file.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. AGENT RENTALS (escrow, publish, meter, close)
-- ----------------------------------------------------------------------------
revoke all on function public.book_listing(uuid, integer) from anon, public;
grant execute on function public.book_listing(uuid, integer) to authenticated, service_role;

revoke all on function public.create_listing(text, text, text, text, integer) from anon, public;
grant execute on function public.create_listing(text, text, text, text, integer) to authenticated, service_role;

revoke all on function public.heartbeat_usage(uuid, integer) from anon, public;
grant execute on function public.heartbeat_usage(uuid, integer) to authenticated, service_role;

revoke all on function public.end_booking(uuid) from anon, public;
grant execute on function public.end_booking(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. MMO SERVERS + MEMBERSHIP + METERING (host/member writes only)
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

revoke all on function public.charge_mmo_minutes(uuid, uuid, timestamptz, integer) from anon, public;
grant execute on function public.charge_mmo_minutes(uuid, uuid, timestamptz, integer) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. MATCHMAKING + MATCH STATE (participant writes only)
-- ----------------------------------------------------------------------------
revoke all on function public.quick_match(text, text) from anon, public;
grant execute on function public.quick_match(text, text) to authenticated, service_role;

revoke all on function public.gravegain_quick_match(text, text) from anon, public;
grant execute on function public.gravegain_quick_match(text, text) to authenticated, service_role;

revoke all on function public.update_match_state(uuid, jsonb) from anon, public;
grant execute on function public.update_match_state(uuid, jsonb) to authenticated, service_role;

revoke all on function public.post_mp_event(uuid, text, text) from anon, public;
grant execute on function public.post_mp_event(uuid, text, text) to authenticated, service_role;

revoke all on function public.read_mp_events(uuid, timestamptz, integer) from anon, public;
grant execute on function public.read_mp_events(uuid, timestamptz, integer) to authenticated, service_role;
