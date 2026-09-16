-- CHEAP-mode worker B18 (authenticated batch 15/17, settings) — seclint3 auth O
-- Grep audit under v2/vcw4w/supabase/migrations (base names):
--   send_room_packet_as_bot   FOUND (20260929000000_agent_room_relay.sql:61; 20261219000009_seclint_auth_social.sql:606)
--   set_bot_username           FOUND (20260910090000_bot_platform.sql:191; latest 20261103000000_bot_username_ambiguity_fix.sql:19; 20261219000009_seclint_auth_social.sql:600)
--   set_cheat_setting          FOUND (20260910010000_social_platform_wars.sql:48; 20261219000006_seclint_anon_reads.sql:226)
--   set_clan_member_role       FOUND (20260916000000_clan_social_perminute.sql:911; 20261219000009_seclint_auth_social.sql:247)
--   set_clan_message_pin       FOUND (20260916000000_clan_social_perminute.sql:781; 20261219000009_seclint_auth_social.sql:256)
--   set_clan_prune_settings    FOUND (20261015000100_scale_prune_tribute.sql:375; 20261219000009_seclint_auth_social.sql:253)
--   set_clan_type              FOUND (20260912000000_clan_types_upkeep_valleynet_runpod.sql:235; 20261219000009_seclint_auth_social.sql:250)
--   set_creator_monetization   FOUND (20260910040000_account_preferences_and_creator_monetization.sql:13; 20261219000009_seclint_auth_social.sql:618)
--   set_game_rate              FOUND (20260910170000_game_rentals.sql:143; 20261219000009_seclint_auth_social.sql:621)
--   set_kid_controls           FOUND (20260924000002_family_accounts.sql:190; latest 20261025000004_kid_unlimited_time.sql:11; 20261219000009_seclint_auth_social.sql:544)
-- Missing: none — all 10 signatures already defined in shipped migrations.
-- This migration only hardens search_path + grants (no table DDL, no secrets).

ALTER FUNCTION public.send_room_packet_as_bot(uuid, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.send_room_packet_as_bot(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_room_packet_as_bot(uuid, text, text) TO authenticated, service_role;

ALTER FUNCTION public.set_bot_username(text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.set_bot_username(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_bot_username(text) TO authenticated, service_role;

ALTER FUNCTION public.set_cheat_setting(text, smallint, boolean) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.set_cheat_setting(text, smallint, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_cheat_setting(text, smallint, boolean) TO authenticated, service_role;

ALTER FUNCTION public.set_clan_member_role(uuid, uuid, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.set_clan_member_role(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_clan_member_role(uuid, uuid, text) TO authenticated, service_role;

ALTER FUNCTION public.set_clan_message_pin(uuid, boolean) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.set_clan_message_pin(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_clan_message_pin(uuid, boolean) TO authenticated, service_role;

ALTER FUNCTION public.set_clan_prune_settings(uuid, boolean, integer, integer, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.set_clan_prune_settings(uuid, boolean, integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_clan_prune_settings(uuid, boolean, integer, integer, text) TO authenticated, service_role;

ALTER FUNCTION public.set_clan_type(uuid, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.set_clan_type(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_clan_type(uuid, text) TO authenticated, service_role;

ALTER FUNCTION public.set_creator_monetization(uuid, boolean) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.set_creator_monetization(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_creator_monetization(uuid, boolean) TO authenticated, service_role;

ALTER FUNCTION public.set_game_rate(text, integer, integer) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.set_game_rate(text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_game_rate(text, integer, integer) TO authenticated, service_role;

ALTER FUNCTION public.set_kid_controls(uuid, integer, time without time zone, time without time zone, text, numeric, boolean, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.set_kid_controls(uuid, integer, time without time zone, time without time zone, text, numeric, boolean, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_kid_controls(uuid, integer, time without time zone, time without time zone, text, numeric, boolean, text, text) TO authenticated, service_role;
