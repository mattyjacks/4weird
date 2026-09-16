-- CHEAP-mode worker B13 (authenticated batch 10/17) — seclint3 auth J
-- Grep audit under v2/vcw4w/supabase/migrations (base names):
--   meter_openrouter_usage     FOUND (20261201000000_openrouter_metering.sql:84; 20261202000000_vendor_usage_refunds.sql:37; 20261219000008_seclint_auth_money.sql:95)
--   meter_outscraper_usage     FOUND (20261202000000_vendor_usage_refunds.sql:168; 20261219000008_seclint_auth_money.sql:98; 20261217000003_linter_definer_mq.sql:41)
--   meter_vault_storage        FOUND (20261013000000_zip_vault_meshy.sql:342; 20261109000000_vault_meter_ownership.sql:16; 20261219000008_seclint_auth_money.sql:107)
--   meter_vcw_usage            FOUND (20261020000000_vcw_gateway_byok.sql:147; 20261219000008_seclint_auth_money.sql:110; 20261217000003_linter_definer_mq.sql:47)
--   my_clan_usage              FOUND (20260917000000_usage_numeric_and_clan_breakout.sql:89; 20261219000008_seclint_auth_money.sql:185)
--   my_compute_usage           FOUND (20260910160000_game_ai_compute.sql:246; 20260917000000_usage_numeric_and_clan_breakout.sql:17; 20261219000008_seclint_auth_money.sql:188)
--   my_fal_usage               FOUND (20260920000000_fal_media_compute.sql:147; 20261219000008_seclint_auth_money.sql:191)
--   my_friends                 FOUND (20260910020000_multiplayer_and_social_actions.sql:51; 20261219000009_seclint_auth_social.sql:585)
--   my_game_play_usage         FOUND (20260910170000_game_rentals.sql:330; 20260913000000_game_rentals_per_second.sql:240; 20261022000000_newgameplus_metering.sql:330; 20261219000008_seclint_auth_money.sql:194)
--   my_meshy_spend             FOUND (20261013000000_zip_vault_meshy.sql:430; 20261219000008_seclint_auth_money.sql:197)
-- Missing: none — all 10 signatures already defined in shipped migrations.
-- This migration only hardens search_path + grants (no CREATE TABLE, no secrets).

ALTER FUNCTION public.meter_openrouter_usage(text, text, text, numeric, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.meter_openrouter_usage(text, text, text, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meter_openrouter_usage(text, text, text, numeric, text) TO authenticated, service_role;

ALTER FUNCTION public.meter_outscraper_usage(text, text, text, numeric, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.meter_outscraper_usage(text, text, text, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meter_outscraper_usage(text, text, text, numeric, text, text) TO authenticated, service_role;

ALTER FUNCTION public.meter_vault_storage(uuid, numeric, numeric) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.meter_vault_storage(uuid, numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meter_vault_storage(uuid, numeric, numeric) TO authenticated, service_role;

ALTER FUNCTION public.meter_vcw_usage(text, numeric, uuid, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.meter_vcw_usage(text, numeric, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meter_vcw_usage(text, numeric, uuid, text) TO authenticated, service_role;

ALTER FUNCTION public.my_clan_usage() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.my_clan_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_clan_usage() TO authenticated, service_role;

ALTER FUNCTION public.my_compute_usage(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.my_compute_usage(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_compute_usage(uuid) TO authenticated, service_role;

ALTER FUNCTION public.my_fal_usage() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.my_fal_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_fal_usage() TO authenticated, service_role;

ALTER FUNCTION public.my_friends() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.my_friends() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_friends() TO authenticated, service_role;

ALTER FUNCTION public.my_game_play_usage() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.my_game_play_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_game_play_usage() TO authenticated, service_role;

ALTER FUNCTION public.my_meshy_spend() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.my_meshy_spend() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_meshy_spend() TO authenticated, service_role;
