-- ============================================================================
-- DS-SECWARN-02 (secwarn-02, infra): pgcrypto extension schema decision.
--
-- DECISION: (b) KEEP pgcrypto IN public — conditional no-op migration.
-- Accepted-risk justification: moving pgcrypto to an `extensions` schema
-- would re-break prod with 42883 "function gen_random_bytes(integer) does
-- not exist", the exact outage migration 20261102000000_bot_runtime_repairs
-- fixed by relocating pgcrypto INTO public. The dependent set is LARGE, not
-- small-and-fully-enumerable, so path (a) fails the blast-radius test in the
-- envelope brief. Supabase lint "extension in public" is a hygiene WARN;
-- unqualified pgcrypto calls under pinned `search_path = public` functions
-- are a live-500 correctness requirement. Correctness wins; the WARN is
-- accepted and documented here.
--
-- DEPENDENT AUDIT (grep evidence, v2/vcw4w/supabase/migrations + app code):
-- * public.create_lobby(...) — gen_random_bytes(8) — search_path=public
--   (20260910030000_lobbies_analytics_and_trial_credit.sql:21-25)
-- * public.get_or_create_referral_code() — gen_random_bytes(6) —
--   search_path=public (20260910070000_daily_and_referrals.sql:56-63)
-- * public.ensure_bot_identity() — gen_random_bytes(6) — search_path=public
--   (defined 20260910090000_bot_platform.sql:150-154,
--   20260910120000_reconcile_clans_bots.sql:81-83,
--   20260910180100_profile_provisioning_and_clans_hardening.sql:61-65)
-- * public.set_bot_username(text) — gen_random_bytes(6) — search_path=public
--   (20260910090000:191-195, 20260910120000:103-105, 20260910180100:118-122,
--   latest 20261103000000_bot_username_ambiguity_fix.sql:19-23)
-- * public.issue_bot_key(...) — gen_random_bytes(6) — search_path=public
--   (20260910090000:234-238, 20260910120000:130-132)
-- * public.push_file(...) — digest(..., 'sha1') — search_path=public
--   (20260910130000_teams_enterprise_bundle.sql:996-1008)
-- * Column defaults substr(encode(gen_random_bytes(24),'hex'),1,32) in
--   20260910130000 (2 token columns) + 20261013000000_zip_vault_meshy.sql:95
--   — resolve at INSERT time via session search_path, equally broken by a move.
-- * gen_random_uuid() defaults in ~50+ tables across dozens of migrations —
--   same unqualified-resolution exposure at scale.
-- * crypt(/gen_salt(: ZERO hits in migrations — no password-hash dependents.
-- * App-code digest(/crypt( hits are all Node crypto (createHash/createHmac)
--   and browser subtle.digest — NOT pgcrypto, no DB dependency.
-- * No `extensions.gen_random_*` qualified references anywhere in repo, and
--   no extensions schema is assumed — so pinning to public is safe here.
--
-- Fully rerunnable: the DO block is conditional (no-op when pgcrypto is
-- already in public; creates it there when missing entirely), same style as
-- the 20261102 repair. Append-only: never edit a shipped migration — future
-- path-(a) work, if ever, goes in a NEW timestamped file that widens every
-- dependent above to search_path `public, extensions` first.
-- ============================================================================

-- --------------------------------------------------------------------------
-- pgcrypto must resolve under search_path = public (keep-in-public pin).
-- --------------------------------------------------------------------------
do $$ declare ext_schema text;
begin
  select n.nspname into ext_schema
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
   where e.extname = 'pgcrypto';
  if ext_schema is null then
    create extension pgcrypto with schema public;
  elsif ext_schema <> 'public' then
    alter extension pgcrypto set schema public;
  end if;
end $$;
