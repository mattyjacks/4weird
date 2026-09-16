-- seclint3 auth batch B09 (6/17): pin authenticated RPC surface for 10 functions.
-- Existence verified via Grep under v2/vcw4w/supabase/migrations; missing: none.
-- Defining migrations: end_buddy_session 20260910160000_game_ai_compute.sql:223;
-- end_game_session 20260910170000_game_rentals.sql:310;
-- ensure_bot_identity 20260910090000_bot_platform.sql:150 (latest 20260910180100:61);
-- ensure_default_org 20260928000000_default_org_lazy_init.sql:81;
-- file_report 20260910080000_clans.sql:241;
-- fund_clan_wallet 20260912000000_clan_types_upkeep_valleynet_runpod.sql:433 (latest 20261207000000:403);
-- fund_kid_wallet 20260924000002_family_accounts.sql:257 (latest 20261018000000:267);
-- get_my_coin_balance 20260911000000_coin_expiry_fifo_and_budgets.sql:99;
-- get_my_coin_refunds 20261012000000_coin_refunds.sql:219;
-- get_my_crown_balances 20261019000000_crowns_earn_ledger.sql:135.
-- All 10 intentional authenticated RPC: keep authenticated grant, strip PUBLIC/anon,
-- pin search_path, keep SECURITY DEFINER (no body changes, no table DDL).

ALTER FUNCTION public.end_buddy_session(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.end_buddy_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.end_buddy_session(uuid) TO authenticated, service_role;

ALTER FUNCTION public.end_game_session(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.end_game_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.end_game_session(uuid) TO authenticated, service_role;

ALTER FUNCTION public.ensure_bot_identity() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.ensure_bot_identity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_bot_identity() TO authenticated, service_role;

ALTER FUNCTION public.ensure_default_org() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.ensure_default_org() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_default_org() TO authenticated, service_role;

ALTER FUNCTION public.file_report(text, uuid, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.file_report(text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.file_report(text, uuid, text, text) TO authenticated, service_role;

ALTER FUNCTION public.fund_clan_wallet(uuid, numeric) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.fund_clan_wallet(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fund_clan_wallet(uuid, numeric) TO authenticated, service_role;

ALTER FUNCTION public.fund_kid_wallet(uuid, numeric) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.fund_kid_wallet(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fund_kid_wallet(uuid, numeric) TO authenticated, service_role;

ALTER FUNCTION public.get_my_coin_balance() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.get_my_coin_balance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_coin_balance() TO authenticated, service_role;

ALTER FUNCTION public.get_my_coin_refunds() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.get_my_coin_refunds() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_coin_refunds() TO authenticated, service_role;

ALTER FUNCTION public.get_my_crown_balances() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.get_my_crown_balances() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_crown_balances() TO authenticated, service_role;
