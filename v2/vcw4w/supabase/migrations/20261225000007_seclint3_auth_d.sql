-- seclint3 auth batch B07 (4/17): pin authenticated RPC surface for 10 functions.
-- Existence verified via Grep under v2/vcw4w/supabase/migrations; missing: none.
-- All 10 intentional authenticated RPC: keep authenticated grant, strip PUBLIC/anon,
-- pin search_path, keep SECURITY DEFINER (no body changes, no CREATE TABLE).

ALTER FUNCTION public.create_comment(uuid, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.create_comment(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_comment(uuid, text, text) TO authenticated, service_role;

ALTER FUNCTION public.create_comment(uuid, text, text, uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.create_comment(uuid, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_comment(uuid, text, text, uuid) TO authenticated, service_role;

ALTER FUNCTION public.create_kid_account(text, character, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.create_kid_account(text, character, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_kid_account(text, character, text, text) TO authenticated, service_role;

ALTER FUNCTION public.create_launch_campaign(uuid, text, text, numeric, text, text, timestamptz) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.create_launch_campaign(uuid, text, text, numeric, text, text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_launch_campaign(uuid, text, text, numeric, text, text, timestamptz) TO authenticated, service_role;

ALTER FUNCTION public.create_listing(text, text, text, text, integer) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.create_listing(text, text, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_listing(text, text, text, text, integer) TO authenticated, service_role;

ALTER FUNCTION public.create_lobby(text, text, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.create_lobby(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_lobby(text, text, text, text) TO authenticated, service_role;

ALTER FUNCTION public.create_org(text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.create_org(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_org(text, text) TO authenticated, service_role;

ALTER FUNCTION public.create_org_invite_link(uuid, text, integer, timestamptz, text, uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.create_org_invite_link(uuid, text, integer, timestamptz, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_org_invite_link(uuid, text, integer, timestamptz, text, uuid) TO authenticated, service_role;

ALTER FUNCTION public.create_post(uuid, text, text, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.create_post(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_post(uuid, text, text, text, text) TO authenticated, service_role;

ALTER FUNCTION public.create_post(uuid, text, text, text, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.create_post(uuid, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_post(uuid, text, text, text, text, text) TO authenticated, service_role;
