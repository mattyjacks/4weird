-- seclint3 auth batch B04 (1/17): pin authenticated RPC surface for 10 functions.
-- Existence verified via Grep under v2/vcw4w/supabase/migrations; missing: none.
-- All 10 intentional authenticated RPC: keep authenticated grant, strip PUBLIC/anon,
-- pin search_path, keep SECURITY DEFINER (no body changes, no table DDL).

ALTER FUNCTION public.accrue_clan_minute_upkeep(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.accrue_clan_minute_upkeep(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accrue_clan_minute_upkeep(uuid) TO authenticated, service_role;

ALTER FUNCTION public.add_clan_channel(uuid, text, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.add_clan_channel(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_clan_channel(uuid, text, text, text) TO authenticated, service_role;

ALTER FUNCTION public.apply_referral(text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.apply_referral(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_referral(text) TO authenticated, service_role;

ALTER FUNCTION public.assign_clan_role(uuid, uuid, uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.assign_clan_role(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_clan_role(uuid, uuid, uuid) TO authenticated, service_role;

ALTER FUNCTION public.award_clan_xp(uuid, text, integer) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.award_clan_xp(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_clan_xp(uuid, text, integer) TO authenticated, service_role;

ALTER FUNCTION public.award_love_letter(uuid, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.award_love_letter(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_love_letter(uuid, text) TO authenticated, service_role;

ALTER FUNCTION public.book_listing(uuid, integer) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.book_listing(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_listing(uuid, integer) TO authenticated, service_role;

ALTER FUNCTION public.buddy_get_memory(text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.buddy_get_memory(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buddy_get_memory(text) TO authenticated, service_role;

ALTER FUNCTION public.buddy_save_memory(text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.buddy_save_memory(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buddy_save_memory(text, text) TO authenticated, service_role;

ALTER FUNCTION public.buy_clan_headroom(uuid, integer) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.buy_clan_headroom(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buy_clan_headroom(uuid, integer) TO authenticated, service_role;
