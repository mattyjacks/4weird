-- ============================================================================
-- CHEAP-mode worker B20 (authenticated tail 17/17 + union check) — seclint3 auth Q
-- Grep audit under v2/vcw4w/supabase/migrations (all 9 FOUND, none missing):
--   start_game_session(text, text, integer)                FOUND (20260910170000_game_rentals.sql:184; 20261207000000_security_audit_fixes.sql:70)
--   start_timer(uuid, uuid, text, boolean, boolean, text, text) FOUND (20261113000000_timer_ownership_hardening.sql:25; 20261211000000_ghost_rename.sql:69)
--   stop_timer(uuid, text, uuid, boolean, integer)         FOUND (20261113000000_timer_ownership_hardening.sql:108; 20261211000000_ghost_rename.sql:150)
--   subscribe_to_tier(uuid)                               FOUND (20260922000000_support_launch_fundraisers.sql:306; 20261025000001_support_resubscribe.sql:18)
--   tip_creator(uuid, uuid, numeric)                      FOUND (20260922000000_support_launch_fundraisers.sql:249; 20261018000000_ledger_pairing_hardening.sql:145)
--   toggle_clan_reaction(uuid, text)                      FOUND (20260916000000_clan_social_perminute.sql:750; 20261116000004_sec_econ_hardening.sql:154)
--   update_match_state(uuid, jsonb)                       FOUND (20260910020000_multiplayer_and_social_actions.sql:44)
--   vote_clan_comment(uuid, smallint)                     FOUND (20261016000000_clan_forum.sql:287; 20261017000100_clan_boards.sql:175)
--   vote_clan_post(uuid, smallint)                        FOUND (20261016000000_clan_forum.sql:244; 20261017000100_clan_boards.sql:130)
-- UNION VERIFICATION (header): files 20261225000001..20261225000020 form one
-- rerunnable wave (REVOKE/GRANT + ALTER SET only, no CREATE TABLE, no secrets).
-- DASHBOARD-ONLY RESIDUALS no SQL can clear: (1) auth.leaked_password_protection
-- toggle; (2) intentional anon/authenticated RPC grants still appear as WARN rows
-- in the linter by design (suppression comes from the hardened grants +
-- search_path, not from zero rows).
-- ============================================================================

ALTER FUNCTION public.start_game_session(text, text, integer) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.start_game_session(text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_game_session(text, text, integer) TO authenticated, service_role;

ALTER FUNCTION public.start_timer(uuid, uuid, text, boolean, boolean, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.start_timer(uuid, uuid, text, boolean, boolean, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_timer(uuid, uuid, text, boolean, boolean, text, text) TO authenticated, service_role;

ALTER FUNCTION public.stop_timer(uuid, text, uuid, boolean, integer) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.stop_timer(uuid, text, uuid, boolean, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.stop_timer(uuid, text, uuid, boolean, integer) TO authenticated, service_role;

ALTER FUNCTION public.subscribe_to_tier(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.subscribe_to_tier(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.subscribe_to_tier(uuid) TO authenticated, service_role;

ALTER FUNCTION public.tip_creator(uuid, uuid, numeric) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.tip_creator(uuid, uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tip_creator(uuid, uuid, numeric) TO authenticated, service_role;

ALTER FUNCTION public.toggle_clan_reaction(uuid, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.toggle_clan_reaction(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_clan_reaction(uuid, text) TO authenticated, service_role;

ALTER FUNCTION public.update_match_state(uuid, jsonb) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.update_match_state(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_match_state(uuid, jsonb) TO authenticated, service_role;

ALTER FUNCTION public.vote_clan_comment(uuid, smallint) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.vote_clan_comment(uuid, smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vote_clan_comment(uuid, smallint) TO authenticated, service_role;

ALTER FUNCTION public.vote_clan_post(uuid, smallint) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.vote_clan_post(uuid, smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vote_clan_post(uuid, smallint) TO authenticated, service_role;

-- ============================================================================
-- UNION VERIFICATION (footer): files 20261225000001..20261225000020 form one
-- rerunnable wave (REVOKE/GRANT + ALTER SET only, no CREATE TABLE, no secrets).
-- DASHBOARD-ONLY RESIDUALS no SQL can clear: (1) auth.leaked_password_protection
-- toggle; (2) intentional anon/authenticated RPC grants still appear as WARN rows
-- in the linter by design (suppression comes from the hardened grants +
-- search_path, not from zero rows).
-- ============================================================================
