-- ============================================================================
-- DS-SECLINT3-AUTH-L (CHEAP-mode worker B15, authenticated batch 12/17):
-- pin search_path + authenticated-only grants for 10 RPCs, no bodies touched.
--
-- Grep first (under v2/vcw4w/supabase/migrations, CREATE OR REPLACE lines):
--   party_challenge_create(text, uuid, text, uuid, text, text):
--                            20261014000000_party_interop.sql:537
--   party_challenge_decide(uuid, text, text, uuid):
--                            20261014000000_party_interop.sql:571
--   party_follow(text, uuid, text, uuid):
--                            20261014000000_party_interop.sql:334
--   party_invite_create(text, uuid, text, uuid, text):
--                            20261014000000_party_interop.sql:380
--   party_invite_decide(uuid, boolean):
--                            20261014000000_party_interop.sql:472
--   party_my_invites():        20261014000000_party_interop.sql:506
--   party_post_create(text, uuid, text, uuid, text, text, text):
--                            20261014000000_party_interop.sql:627
--   party_unfollow(text, uuid, text, uuid):
--                            20261014000000_party_interop.sql:362
--   post_clan_message(uuid, text, text, uuid, text):
--                            20260916000000_clan_social_perminute.sql:711
--   post_mp_event(uuid, text, text):
--                            20261110000000_gravegain_multiplayer.sql:66
-- No overload ambiguity for any of the 10 in shipped migrations.
--
-- Gates: no CREATE TABLE in this file; exactly 10 ALTER FUNCTION statements
-- (one per function). Each function gets: ALTER ... SET search_path =
-- public, pg_temp; REVOKE ALL ... FROM PUBLIC, anon; GRANT EXECUTE ...
-- TO authenticated, service_role. Idempotent rerun. No secrets. Does not
-- touch old-v1/ and does not edit any shipped migration.
-- ============================================================================

ALTER FUNCTION public.party_challenge_create(text, uuid, text, uuid, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.party_challenge_create(text, uuid, text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.party_challenge_create(text, uuid, text, uuid, text, text) TO authenticated, service_role;

ALTER FUNCTION public.party_challenge_decide(uuid, text, text, uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.party_challenge_decide(uuid, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.party_challenge_decide(uuid, text, text, uuid) TO authenticated, service_role;

ALTER FUNCTION public.party_follow(text, uuid, text, uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.party_follow(text, uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.party_follow(text, uuid, text, uuid) TO authenticated, service_role;

ALTER FUNCTION public.party_invite_create(text, uuid, text, uuid, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.party_invite_create(text, uuid, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.party_invite_create(text, uuid, text, uuid, text) TO authenticated, service_role;

ALTER FUNCTION public.party_invite_decide(uuid, boolean) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.party_invite_decide(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.party_invite_decide(uuid, boolean) TO authenticated, service_role;

ALTER FUNCTION public.party_my_invites() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.party_my_invites() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.party_my_invites() TO authenticated, service_role;

ALTER FUNCTION public.party_post_create(text, uuid, text, uuid, text, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.party_post_create(text, uuid, text, uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.party_post_create(text, uuid, text, uuid, text, text, text) TO authenticated, service_role;

ALTER FUNCTION public.party_unfollow(text, uuid, text, uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.party_unfollow(text, uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.party_unfollow(text, uuid, text, uuid) TO authenticated, service_role;

ALTER FUNCTION public.post_clan_message(uuid, text, text, uuid, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.post_clan_message(uuid, text, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_clan_message(uuid, text, text, uuid, text) TO authenticated, service_role;

ALTER FUNCTION public.post_mp_event(uuid, text, text) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.post_mp_event(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_mp_event(uuid, text, text) TO authenticated, service_role;
