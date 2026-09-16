-- seclint3 auth batch B19 (16/17): pin authenticated RPC surface for 10 functions.
-- Existence verified via Grep under v2/vcw4w/supabase/migrations; missing: none.
-- All 10 intentional authenticated RPC: keep authenticated grant, strip PUBLIC/anon,
-- pin search_path, keep SECURITY DEFINER (no body changes, no CREATE TABLE).

ALTER FUNCTION public.set_kid_password(uuid, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.set_kid_password(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_kid_password(uuid, text) TO authenticated, service_role;

ALTER FUNCTION public.set_member_roles(uuid, uuid, text[]) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.set_member_roles(uuid, uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_member_roles(uuid, uuid, text[]) TO authenticated, service_role;

ALTER FUNCTION public.set_my_budget(numeric, integer, boolean) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.set_my_budget(numeric, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_budget(numeric, integer, boolean) TO authenticated, service_role;

ALTER FUNCTION public.set_org_budget(uuid, numeric, integer, boolean) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.set_org_budget(uuid, numeric, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_org_budget(uuid, numeric, integer, boolean) TO authenticated, service_role;

ALTER FUNCTION public.set_org_prune_settings(uuid, boolean, integer, integer, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.set_org_prune_settings(uuid, boolean, integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_org_prune_settings(uuid, boolean, integer, integer, text) TO authenticated, service_role;

ALTER FUNCTION public.set_post_board(uuid, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.set_post_board(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_post_board(uuid, text) TO authenticated, service_role;

ALTER FUNCTION public.set_post_flair(uuid, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.set_post_flair(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_post_flair(uuid, text) TO authenticated, service_role;

ALTER FUNCTION public.set_watch_scope(uuid, uuid, uuid[]) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.set_watch_scope(uuid, uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_watch_scope(uuid, uuid, uuid[]) TO authenticated, service_role;

ALTER FUNCTION public.settle_booking_escrow(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.settle_booking_escrow(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_booking_escrow(uuid) TO authenticated, service_role;

ALTER FUNCTION public.start_buddy_session(text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.start_buddy_session(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_buddy_session(text, text) TO authenticated, service_role;
