-- ============================================================================
-- DS-SECLINT3-AUTH-E (CHEAP-mode worker B08, authenticated batch 5/17):
-- pin search_path + lock EXECUTE to authenticated/service_role for 10 RPCs.
--
-- Exact signatures confirmed by grep over v2/vcw4w/supabase/migrations
-- (CREATE OR REPLACE FUNCTION lines in defining migrations):
--   create_project(uuid,text,text,text) .... 20260910130000:920
--   create_room(uuid,text,text,boolean) .... 20260910130000:1018
--   create_support_tier(uuid,text,numeric,text) .. 20260922000000:276
--   create_team(uuid,text,text) ............. 20260910130000:833
--   credit_clan_channel_revenue(uuid,text) .. 20261018000000:95 (hardened restatement)
--   delete_clan_message(uuid) ............... 20260916000000:815
--   deploy_clan_bot(uuid,text,text) ......... 20260912000000:572
--   donate_clan_upkeep(uuid,numeric) ........ 20261015000100:1032 (latest restatement)
--   edit_clan_message(uuid,text) ............ 20260916000000:796
--   end_booking(uuid) ....................... 20260910100000:284
--
-- Policy: authenticated-only. REVOKE from PUBLIC/anon, GRANT back to
-- authenticated + service_role (server-side callers bypass grants).
-- Rerunnable: ALTER / REVOKE / GRANT are idempotent. Only pins + grants
-- here; no bodies, policies, triggers, or indexes touched.
-- ============================================================================

ALTER FUNCTION public.create_project(uuid, text, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.create_project(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_project(uuid, text, text, text) TO authenticated, service_role;

ALTER FUNCTION public.create_room(uuid, text, text, boolean) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.create_room(uuid, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_room(uuid, text, text, boolean) TO authenticated, service_role;

ALTER FUNCTION public.create_support_tier(uuid, text, numeric, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.create_support_tier(uuid, text, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_support_tier(uuid, text, numeric, text) TO authenticated, service_role;

ALTER FUNCTION public.create_team(uuid, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.create_team(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_team(uuid, text, text) TO authenticated, service_role;

ALTER FUNCTION public.credit_clan_channel_revenue(uuid, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.credit_clan_channel_revenue(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.credit_clan_channel_revenue(uuid, text) TO authenticated, service_role;

ALTER FUNCTION public.delete_clan_message(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.delete_clan_message(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_clan_message(uuid) TO authenticated, service_role;

ALTER FUNCTION public.deploy_clan_bot(uuid, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.deploy_clan_bot(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deploy_clan_bot(uuid, text, text) TO authenticated, service_role;

ALTER FUNCTION public.donate_clan_upkeep(uuid, numeric) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.donate_clan_upkeep(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.donate_clan_upkeep(uuid, numeric) TO authenticated, service_role;

ALTER FUNCTION public.edit_clan_message(uuid, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.edit_clan_message(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.edit_clan_message(uuid, text) TO authenticated, service_role;

ALTER FUNCTION public.end_booking(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.end_booking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.end_booking(uuid) TO authenticated, service_role;
