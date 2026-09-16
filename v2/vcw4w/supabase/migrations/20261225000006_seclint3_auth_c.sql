-- CHEAP-mode worker B06 (authenticated batch 3/17) — seclint3 auth C
-- Grep audit under v2/vcw4w/supabase/migrations (base names):
--   close_launch_campaign      FOUND (20260922000000_support_launch_fundraisers.sql:498; 20261219000009_seclint_auth_social.sql:627)
--   community_stat_averages    FOUND (20260910020000_multiplayer_and_social_actions.sql:59; 20261219000006_seclint_anon_reads.sql:171; 20261219000009_seclint_auth_social.sql:678)
--   complete_clan_quest        FOUND (20261001000000_love_letters.sql:215; 20261021000000_quantum_hardening.sql:12; 20261219000009_seclint_auth_social.sql:259)
--   contribute_launch_campaign FOUND (20260922000000_support_launch_fundraisers.sql:450; 20261018000000_ledger_pairing_hardening.sql:217; 20261019000000_crowns_earn_ledger.sql:292; 20261025000005_support_lots_balance.sql:98; 20261219000008_seclint_auth_money.sql:173)
--   create_clan (3-arg)        FOUND (20260910080000_clans.sql:144; 20260910180100_profile_provisioning_and_clans_hardening.sql:206; 20260912000000_clan_types_upkeep_valleynet_runpod.sql:226; 20261219000009_seclint_auth_social.sql:220)
--   create_clan (4-arg)        FOUND (20260916000000_clan_social_perminute.sql:232; 20260912000000_clan_types_upkeep_valleynet_runpod.sql:188; 20261219000009_seclint_auth_social.sql:223)
--   create_clan_channel        FOUND (20260916000000_clan_social_perminute.sql:681; 20261219000009_seclint_auth_social.sql:232)
--   create_clan_event          FOUND (20260916000000_clan_social_perminute.sql:832; 20261219000009_seclint_auth_social.sql:235)
--   create_clan_quest          FOUND (20261001000000_love_letters.sql:199; 20261219000009_seclint_auth_social.sql:238)
--   create_clan_role           FOUND (20260916000000_clan_social_perminute.sql:861; 20261219000009_seclint_auth_social.sql:241)
-- Missing: none — all 10 signatures already defined in shipped migrations.
-- This migration only hardens search_path + grants (no new tables, no secrets).

ALTER FUNCTION public.close_launch_campaign(uuid, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.close_launch_campaign(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_launch_campaign(uuid, text) TO authenticated, service_role;

ALTER FUNCTION public.community_stat_averages() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.community_stat_averages() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_stat_averages() TO authenticated, service_role;

ALTER FUNCTION public.complete_clan_quest(uuid, uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.complete_clan_quest(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_clan_quest(uuid, uuid) TO authenticated, service_role;

ALTER FUNCTION public.contribute_launch_campaign(uuid, numeric) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.contribute_launch_campaign(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contribute_launch_campaign(uuid, numeric) TO authenticated, service_role;

ALTER FUNCTION public.create_clan(text, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.create_clan(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_clan(text, text, text) TO authenticated, service_role;

ALTER FUNCTION public.create_clan(text, text, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.create_clan(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_clan(text, text, text, text) TO authenticated, service_role;

ALTER FUNCTION public.create_clan_channel(uuid, text, text, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.create_clan_channel(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_clan_channel(uuid, text, text, text, text) TO authenticated, service_role;

ALTER FUNCTION public.create_clan_event(uuid, text, text, timestamp with time zone, uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.create_clan_event(uuid, text, text, timestamp with time zone, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_clan_event(uuid, text, text, timestamp with time zone, uuid) TO authenticated, service_role;

ALTER FUNCTION public.create_clan_quest(uuid, text, integer) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.create_clan_quest(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_clan_quest(uuid, text, integer) TO authenticated, service_role;

ALTER FUNCTION public.create_clan_role(uuid, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.create_clan_role(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_clan_role(uuid, text, text) TO authenticated, service_role;
