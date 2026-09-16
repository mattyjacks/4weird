-- seclint3 auth batch B16 (13/17): pin authenticated RPC surface for 10 functions.
-- Existence verified via Grep under v2/vcw4w/supabase/migrations; missing: none.
-- All 10 intentional authenticated RPC: keep authenticated grant, strip PUBLIC/anon,
-- pin search_path, keep SECURITY DEFINER (no body changes, no CREATE TABLE).

ALTER FUNCTION public.process_easydnc_batch_payment(uuid, integer, text, boolean, uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.process_easydnc_batch_payment(uuid, integer, text, boolean, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_easydnc_batch_payment(uuid, integer, text, boolean, uuid) TO authenticated, service_role;

ALTER FUNCTION public.provision_service(uuid, uuid, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.provision_service(uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_service(uuid, uuid, text, text) TO authenticated, service_role;

ALTER FUNCTION public.prune_clan_members(uuid, text, integer, uuid[], boolean) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.prune_clan_members(uuid, text, integer, uuid[], boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prune_clan_members(uuid, text, integer, uuid[], boolean) TO authenticated, service_role;

ALTER FUNCTION public.prune_org_members(uuid, text, integer, uuid[], boolean) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.prune_org_members(uuid, text, integer, uuid[], boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prune_org_members(uuid, text, integer, uuid[], boolean) TO authenticated, service_role;

ALTER FUNCTION public.purchase_cosmetic_item(text, text, numeric) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.purchase_cosmetic_item(text, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_cosmetic_item(text, text, numeric) TO authenticated, service_role;

ALTER FUNCTION public.push_file(uuid, text, text, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.push_file(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.push_file(uuid, text, text, text, text) TO authenticated, service_role;

ALTER FUNCTION public.quick_match(text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.quick_match(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quick_match(text, text) TO authenticated, service_role;

ALTER FUNCTION public.read_mp_events(uuid, timestamp with time zone, integer) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.read_mp_events(uuid, timestamp with time zone, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.read_mp_events(uuid, timestamp with time zone, integer) TO authenticated, service_role;

ALTER FUNCTION public.read_room_messages(uuid, integer, timestamptz) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.read_room_messages(uuid, integer, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.read_room_messages(uuid, integer, timestamptz) TO authenticated, service_role;

ALTER FUNCTION public.redact_room_message(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.redact_room_message(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redact_room_message(uuid) TO authenticated, service_role;
