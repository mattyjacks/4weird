-- seclint3 auth batch B05 (2/17): pin authenticated RPC surface for 10 functions.
-- Existence verified via Grep under v2/vcw4w/supabase/migrations; missing: none.
-- All 10 intentional authenticated RPC: keep authenticated grant, strip PUBLIC/anon,
-- pin search_path, keep SECURITY DEFINER (no body changes, no CREATE TABLE).

ALTER FUNCTION public.buy_org_headroom(uuid, integer) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.buy_org_headroom(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buy_org_headroom(uuid, integer) TO authenticated, service_role;

ALTER FUNCTION public.cancel_subscription(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.cancel_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_subscription(uuid) TO authenticated, service_role;

ALTER FUNCTION public.charge_dev_action(text, text, numeric, text, text, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.charge_dev_action(text, text, numeric, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.charge_dev_action(text, text, numeric, text, text, text, text) TO authenticated, service_role;

ALTER FUNCTION public.claim_alpha_tester_bonus() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.claim_alpha_tester_bonus() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_alpha_tester_bonus() TO authenticated, service_role;

ALTER FUNCTION public.claim_daily_bonus() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.claim_daily_bonus() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_bonus() TO authenticated, service_role;

ALTER FUNCTION public.clan_is_moderator(uuid, uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.clan_is_moderator(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clan_is_moderator(uuid, uuid) TO authenticated, service_role;

ALTER FUNCTION public.clan_scale_status(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.clan_scale_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clan_scale_status(uuid) TO authenticated, service_role;

ALTER FUNCTION public.clan_supporter_status(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.clan_supporter_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clan_supporter_status(uuid) TO authenticated, service_role;

ALTER FUNCTION public.clan_tribute_status(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.clan_tribute_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clan_tribute_status(uuid) TO authenticated, service_role;

ALTER FUNCTION public.close_kid_account(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.close_kid_account(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_kid_account(uuid) TO authenticated, service_role;
