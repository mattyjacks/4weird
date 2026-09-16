-- seclint3 auth batch B11 (8/17): pin authenticated RPC surface for 10 functions.
-- Existence verified via Grep under v2/vcw4w/supabase/migrations; missing: none.
-- All 10 intentional authenticated RPC: keep authenticated grant, strip PUBLIC/anon,
-- pin search_path, keep SECURITY DEFINER (no body changes, no table DDL).

ALTER FUNCTION public.give_love_letter(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.give_love_letter(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.give_love_letter(uuid) TO authenticated, service_role;

ALTER FUNCTION public.gravegain_quick_match(text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.gravegain_quick_match(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gravegain_quick_match(text, text) TO authenticated, service_role;

ALTER FUNCTION public.heartbeat_game_session(uuid, integer) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.heartbeat_game_session(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.heartbeat_game_session(uuid, integer) TO authenticated, service_role;

ALTER FUNCTION public.heartbeat_usage(uuid, integer) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.heartbeat_usage(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.heartbeat_usage(uuid, integer) TO authenticated, service_role;

ALTER FUNCTION public.issue_bot_key(text, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.issue_bot_key(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_bot_key(text, text, text) TO authenticated, service_role;

ALTER FUNCTION public.join_clan(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.join_clan(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_clan(uuid) TO authenticated, service_role;

ALTER FUNCTION public.join_lobby(uuid, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.join_lobby(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_lobby(uuid, text) TO authenticated, service_role;

ALTER FUNCTION public.launch_campaign_progress(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.launch_campaign_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.launch_campaign_progress(uuid) TO authenticated, service_role;

ALTER FUNCTION public.list_all_open_lobbies(text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.list_all_open_lobbies(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_all_open_lobbies(text) TO authenticated, service_role;

ALTER FUNCTION public.list_joinable_lobbies(text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.list_joinable_lobbies(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_joinable_lobbies(text) TO authenticated, service_role;
