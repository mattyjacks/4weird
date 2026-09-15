-- Linter triage slice A–E: revoke anon EXECUTE on authenticated-only
-- SECURITY DEFINER writes whose bodies hard-error when auth.uid() IS NULL
-- and which have no anon-legitimate path (no public reads, no kid-token flow).
--
-- Each signature below was verified verbatim against its latest CREATE FUNCTION
-- definition. REVOKE is idempotent: re-running after sibling seclint migrations
-- (20261219000004 covers the same five) is a harmless no-op, and this file's
-- earlier version position keeps protection even if later files are reverted.
--
-- Deliberately NOT touched here (see linter-triage-ae.md for the full table):
--   * intentionally-public reads granted to anon (clan_leaderboard,
--     clan_minute_rate, clan_tribute_status, clan_roster_page,
--     clan_scale_status, clan_supporter_status, community_stat_averages)
--   * kid-session token flows (end_kid_session)
--   * trigger/internal functions (siblings 20261219000002/03 locked those)
--   * RLS helper effective_perms (revoking from anon risks breaking anon RLS
--     evaluation; conservative no-change)

-- Coin-escrow marketplace writes (auth.uid() guard: 'authentication required').
revoke all on function public.book_listing(uuid, integer) from anon, public;
grant execute on function public.book_listing(uuid, integer) to authenticated, service_role;

revoke all on function public.create_listing(text, text, text, text, integer) from anon, public;
grant execute on function public.create_listing(text, text, text, text, integer) to authenticated, service_role;

revoke all on function public.end_booking(uuid) from anon, public;
grant execute on function public.end_booking(uuid) to authenticated, service_role;

-- MMO provisioning + metering (auth.uid() guard: 'login required').
revoke all on function public.create_mmo_server(text, text, uuid, text, integer, text, integer) from anon, public;
grant execute on function public.create_mmo_server(text, text, uuid, text, integer, text, integer) to authenticated, service_role;

revoke all on function public.charge_mmo_minutes(uuid, uuid, timestamptz, integer) from anon, public;
grant execute on function public.charge_mmo_minutes(uuid, uuid, timestamptz, integer) to authenticated, service_role;
