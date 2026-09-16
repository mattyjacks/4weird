-- seclint3 auth batch B10 (7/17): pin authenticated RPC surface for 10 functions.
-- Existence verified via Grep under v2/vcw4w/supabase/migrations; missing: none.
-- Defining migrations: get_my_refundable_lots 20261012000000_coin_refunds.sql:107
-- (latest 20261025000007_refund_floor_cents.sql:11);
-- get_or_create_referral_code 20260910070000_daily_and_referrals.sql:56;
-- ghost_beat 20260925000100_watcher_multirole_ghost.sql:382;
-- ghost_clock_in 20260925000100_watcher_multirole_ghost.sql:360;
-- ghost_clock_out 20260925000100_watcher_multirole_ghost.sql:407;
-- ghost_create_contract 20260925000100_watcher_multirole_ghost.sql:335
-- (latest 20261116000004_sec_econ_hardening.sql:191);
-- ghost_invoice_timer 20260925000100_watcher_multirole_ghost.sql:429;
-- ghost_mark_debt 20260925000100_watcher_multirole_ghost.sql:459;
-- ghost_org_summary 20260925000100_watcher_multirole_ghost.sql:533;
-- ghost_settle_debt 20260925000100_watcher_multirole_ghost.sql:483.
-- All 10 intentional authenticated RPC: keep authenticated grant, strip PUBLIC/anon,
-- pin search_path, keep SECURITY DEFINER (no body changes, no table DDL).

ALTER FUNCTION public.get_my_refundable_lots() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.get_my_refundable_lots() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_refundable_lots() TO authenticated, service_role;

ALTER FUNCTION public.get_or_create_referral_code() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.get_or_create_referral_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_referral_code() TO authenticated, service_role;

ALTER FUNCTION public.ghost_beat(uuid, integer) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.ghost_beat(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ghost_beat(uuid, integer) TO authenticated, service_role;

ALTER FUNCTION public.ghost_clock_in(uuid, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.ghost_clock_in(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ghost_clock_in(uuid, text) TO authenticated, service_role;

ALTER FUNCTION public.ghost_clock_out(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.ghost_clock_out(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ghost_clock_out(uuid) TO authenticated, service_role;

ALTER FUNCTION public.ghost_create_contract(uuid, text, uuid, uuid, numeric) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.ghost_create_contract(uuid, text, uuid, uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ghost_create_contract(uuid, text, uuid, uuid, numeric) TO authenticated, service_role;

ALTER FUNCTION public.ghost_invoice_timer(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.ghost_invoice_timer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ghost_invoice_timer(uuid) TO authenticated, service_role;

ALTER FUNCTION public.ghost_mark_debt(uuid, uuid, uuid, numeric, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.ghost_mark_debt(uuid, uuid, uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ghost_mark_debt(uuid, uuid, uuid, numeric, text) TO authenticated, service_role;

ALTER FUNCTION public.ghost_org_summary(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.ghost_org_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ghost_org_summary(uuid) TO authenticated, service_role;

ALTER FUNCTION public.ghost_settle_debt(uuid, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.ghost_settle_debt(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ghost_settle_debt(uuid, text) TO authenticated, service_role;
