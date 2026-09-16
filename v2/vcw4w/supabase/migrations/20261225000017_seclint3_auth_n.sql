-- seclint3 auth batch B17 (14/17): pin authenticated RPC surface for 10 functions.
-- Existence verified via Grep under v2/vcw4w/supabase/migrations; missing: none.
-- All 10 intentional authenticated RPC: keep authenticated grant, strip PUBLIC/anon,
-- pin search_path, keep SECURITY DEFINER (no body changes, no CREATE TABLE).

ALTER FUNCTION public.redeem_org_invite(text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.redeem_org_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_org_invite(text) TO authenticated, service_role;

ALTER FUNCTION public.refund_coin_lot(uuid, numeric) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.refund_coin_lot(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refund_coin_lot(uuid, numeric) TO authenticated, service_role;

ALTER FUNCTION public.refund_vendor_usage(text, uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.refund_vendor_usage(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refund_vendor_usage(text, uuid) TO authenticated, service_role;

ALTER FUNCTION public.remove_clan_bot(uuid, uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.remove_clan_bot(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_clan_bot(uuid, uuid) TO authenticated, service_role;

ALTER FUNCTION public.request_friend_by_handle(text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.request_friend_by_handle(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_friend_by_handle(text) TO authenticated, service_role;

ALTER FUNCTION public.request_verification(text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.request_verification(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_verification(text) TO authenticated, service_role;

ALTER FUNCTION public.respond_friend_request(uuid, boolean) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.respond_friend_request(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_friend_request(uuid, boolean) TO authenticated, service_role;

ALTER FUNCTION public.revoke_bot_key(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.revoke_bot_key(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_bot_key(uuid) TO authenticated, service_role;

ALTER FUNCTION public.revoke_org_invite(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.revoke_org_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_org_invite(uuid) TO authenticated, service_role;

ALTER FUNCTION public.send_room_packet(uuid, text, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.send_room_packet(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_room_packet(uuid, text, text, text) TO authenticated, service_role;
