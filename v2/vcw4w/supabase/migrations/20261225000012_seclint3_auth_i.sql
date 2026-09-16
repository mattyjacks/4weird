-- ============================================================================
-- DS-SECLINT3-I: authenticated hardening for batch 9/17 metering part 1.
--
-- CONTEXT: CHEAP-mode worker B12. Exact signatures confirmed by grep under
-- v2/vcw4w/supabase/migrations over CREATE OR REPLACE FUNCTION lines;
-- latest defining migration wins:
--   * public.list_org_invites(uuid)
--       <- 20260928000000_default_org_lazy_init.sql:358
--   * public.list_unitunite_rooms(uuid)
--       <- 20260929000000_agent_room_relay.sql:134
--   * public.log_clan_ai_usage(uuid, text, numeric)
--       <- 20260916000000_clan_social_perminute.sql:518
--        (reaffirmed 20261112000000_security_lockdown.sql:45)
--   * public.log_clan_transfer(uuid, integer, text)
--       <- 20260916000000_clan_social_perminute.sql:540
--   * public.love_me()
--       <- 20261001000000_love_letters.sql:87
--   * public.meter_clan_posting_fee(uuid, text, integer, boolean)
--       <- 20260916000000_clan_social_perminute.sql:559
--        (reaffirmed 20261207000000_security_audit_fixes.sql:237)
--   * public.meter_fal_usage(text, text, numeric, text)
--       <- 20260920000000_fal_media_compute.sql:62
--        (reaffirmed 20260924000000_fal_30_ops.sql:18)
--   * public.meter_game_ai_usage(text, text, numeric, uuid, text)
--       <- 20261025000002_buddy_presence_kinds_restore.sql:12
--   * public.meter_meshy_usage(text, numeric, uuid)
--       <- 20261013000000_zip_vault_meshy.sql:314
--   * public.meter_newgameplus_build(uuid, text, text, integer, integer, numeric, text)
--       <- 20261022000000_newgameplus_metering.sql:47
--
-- POLICY per function below (authenticated batch, no _for twins here):
--   ALTER <sig> SET search_path = public, pg_temp;
--   REVOKE ALL <sig> FROM PUBLIC, anon;
--   GRANT EXECUTE <sig> TO authenticated, service_role;
-- service_role is granted everywhere so server-side callers keep working.
-- No bodies are touched here (owning lanes own CREATE OR REPLACE).
--
-- Rerunnable: ALTER ... SET / REVOKE / GRANT are idempotent. No tables,
-- policies, triggers, or indexes are created here.
-- ============================================================================

ALTER FUNCTION public.list_org_invites(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.list_org_invites(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_org_invites(uuid) TO authenticated, service_role;

ALTER FUNCTION public.list_unitunite_rooms(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.list_unitunite_rooms(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_unitunite_rooms(uuid) TO authenticated, service_role;

ALTER FUNCTION public.log_clan_ai_usage(uuid, text, numeric) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.log_clan_ai_usage(uuid, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_clan_ai_usage(uuid, text, numeric) TO authenticated, service_role;

ALTER FUNCTION public.log_clan_transfer(uuid, integer, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.log_clan_transfer(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_clan_transfer(uuid, integer, text) TO authenticated, service_role;

ALTER FUNCTION public.love_me() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.love_me() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.love_me() TO authenticated, service_role;

ALTER FUNCTION public.meter_clan_posting_fee(uuid, text, integer, boolean) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.meter_clan_posting_fee(uuid, text, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meter_clan_posting_fee(uuid, text, integer, boolean) TO authenticated, service_role;

ALTER FUNCTION public.meter_fal_usage(text, text, numeric, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.meter_fal_usage(text, text, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meter_fal_usage(text, text, numeric, text) TO authenticated, service_role;

ALTER FUNCTION public.meter_game_ai_usage(text, text, numeric, uuid, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.meter_game_ai_usage(text, text, numeric, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meter_game_ai_usage(text, text, numeric, uuid, text) TO authenticated, service_role;

ALTER FUNCTION public.meter_meshy_usage(text, numeric, uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.meter_meshy_usage(text, numeric, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meter_meshy_usage(text, numeric, uuid) TO authenticated, service_role;

ALTER FUNCTION public.meter_newgameplus_build(uuid, text, text, integer, integer, numeric, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.meter_newgameplus_build(uuid, text, text, integer, integer, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meter_newgameplus_build(uuid, text, text, integer, integer, numeric, text) TO authenticated, service_role;
