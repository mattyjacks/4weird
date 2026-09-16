-- ============================================================================
-- DS-SECLINT3-AUTH-K (CHEAP-mode worker B14, authenticated batch 11/17):
-- pin search_path + authenticated-only grants for 10 RPCs, no bodies touched.
--
-- Grep first (under v2/vcw4w/supabase/migrations, CREATE OR REPLACE lines):
--   my_newgameplus_spend(): 20261022000000_newgameplus_metering.sql:118
--   my_openrouter_usage():   20261202000000_vendor_usage_refunds.sql:335
--                            (= 20261201000000_openrouter_metering.sql:212)
--   my_outscraper_usage():   20261202000000_vendor_usage_refunds.sql:392
--                            (= 20261201000001_outscraper_metering.sql:197)
--   my_submission_spend():   20261013000000_zip_vault_meshy.sql:418
--   my_team_perms(uuid):      20260925000100_watcher_multirole_ghost.sql:123
--                            (= 20260910130000_teams_enterprise_bundle.sql:1141)
--   my_vault_spend():         20261013000000_zip_vault_meshy.sql:442
--   open_issue(uuid,text,text): 20260910130000_teams_enterprise_bundle.sql:949
--   org_roster(uuid):         20260925000100_watcher_multirole_ghost.sql:504
--   org_roster_page(uuid, integer, timestamptz, uuid, text):
--                            20261015000100_scale_prune_tribute.sql:225
--                            (timestamptz = timestamp with time zone; long form
--                            used below per batch spec)
--   org_scale_status(uuid):   20261015000100_scale_prune_tribute.sql:941
-- No overload ambiguity for any of the 10 in shipped migrations.
--
-- Gates: no CREATE TABLE in this file; exactly 10 ALTER FUNCTION statements
-- (one per function). Each function gets: ALTER ... SET search_path =
-- public, pg_temp; REVOKE ALL ... FROM PUBLIC, anon; GRANT EXECUTE ...
-- TO authenticated, service_role. Idempotent rerun. No secrets. Does not
-- touch old-v1/ and does not edit any shipped migration.
-- ============================================================================

ALTER FUNCTION public.my_newgameplus_spend() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.my_newgameplus_spend() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_newgameplus_spend() TO authenticated, service_role;

ALTER FUNCTION public.my_openrouter_usage() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.my_openrouter_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_openrouter_usage() TO authenticated, service_role;

ALTER FUNCTION public.my_outscraper_usage() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.my_outscraper_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_outscraper_usage() TO authenticated, service_role;

ALTER FUNCTION public.my_submission_spend() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.my_submission_spend() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_submission_spend() TO authenticated, service_role;

ALTER FUNCTION public.my_team_perms(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.my_team_perms(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_team_perms(uuid) TO authenticated, service_role;

ALTER FUNCTION public.my_vault_spend() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.my_vault_spend() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_vault_spend() TO authenticated, service_role;

ALTER FUNCTION public.open_issue(uuid, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.open_issue(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_issue(uuid, text, text) TO authenticated, service_role;

ALTER FUNCTION public.org_roster(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.org_roster(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_roster(uuid) TO authenticated, service_role;

ALTER FUNCTION public.org_roster_page(uuid, integer, timestamp with time zone, uuid, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.org_roster_page(uuid, integer, timestamp with time zone, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_roster_page(uuid, integer, timestamp with time zone, uuid, text) TO authenticated, service_role;

ALTER FUNCTION public.org_scale_status(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.org_scale_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_scale_status(uuid) TO authenticated, service_role;
