-- ============================================================================
-- 4WEIRD SECLINT PGCRYPTO OUT OF PUBLIC (DS-SECLINT-02, seclint-02)
--
-- Silences the extension_in_public WARN (lint 0014) on pgcrypto by
-- relocating the extension from public to a dedicated extensions schema.
-- This supersedes the opposite public-pin in
-- 20261102000000_bot_runtime_repairs.sql:34-45 (runs earlier; this file
-- runs later, so the extensions placement wins).
--
-- Grep evidence (supabase/migrations, verified 2026-09-15):
--   * Extension lands in public via 20260910090000_bot_platform.sql:28
--     (`create extension if not exists pgcrypto;` — no schema => public).
--   * gen_random_uuid(): 100+ unqualified uses (column DEFAULTs and bodies
--     across the bundles). Works unqualified only if the extension schema
--     is in search_path — every defining migration pins function
--     `SET search_path = public` (e.g. lobbies bundle lines 22/28/30/35/37,
--     bot_platform lines 154/195/238/273/292, teams bundle lines 521ff),
--     noted per scope; no function bodies are rewritten here.
--   * gen_random_bytes(n) (true pgcrypto): unqualified calls at
--     20260910030000_lobbies_analytics_and_trial_credit.sql:25 (8 bytes),
--     20260910070000_daily_and_referrals.sql:63 (6 bytes),
--     20260910090000_bot_platform.sql:168/:209/:254 (6 bytes),
--     20260910120000_reconcile_clans_bots.sql:90/:112/:140 (6 bytes),
--     20260910180100_profile_provisioning_and_clans_hardening.sql:94/:147
--     (6 bytes), 20261103000000_bot_username_ambiguity_fix.sql:48 (6 bytes),
--     plus column DEFAULT token generators at
--     20260910130000_teams_enterprise_bundle.sql:87/:118 and
--     20261013000000_zip_vault_meshy.sql:95 (24 bytes).
--   * digest(text, text) (true pgcrypto): one call site at
--     20260910130000_teams_enterprise_bundle.sql:1008
--     (digest(..., 'sha1') inside push_file, pinned search_path = public).
--   * No SQL usage of hmac/crypt/gen_salt/pgp_*/encrypt/decrypt anywhere
--     in supabase/migrations. App-layer digest/hmac hits are Node
--     crypto.createHash/createHmac — not pgcrypto, unaffected.
--   * No qualified public.gen_random_*/public.digest/extensions.* refs in
--     SQL (comments only), so the move breaks no qualified calls.
--
-- SEARCH_PATH NOTE (scope boundary — bodies NOT rewritten here):
--   The functions above pin `SET search_path = public`, so after this move
--   their unqualified gen_random_uuid/gen_random_bytes/digest calls need
--   `extensions` in search_path. Follow-up belongs in a NEW migration
--   (per-function ALTER FUNCTION <sig> SET search_path = public,
--   extensions — attributes only, bodies untouched; session-level column
--   DEFAULTs evaluate under the inserting session's search_path). KNOWN
--   CONFLICT: sibling analysis 20261219000001_sqlint_pgcrypto_schema.sql
--   (DS-SQLINT-02) records the opposite KEEP-in-public decision citing the
--   42883 outage repaired by bot_runtime_repairs — the lead must reconcile
--   KEEP vs MOVE before push.
--
-- Fully rerunnable: CREATE SCHEMA IF NOT EXISTS; the extension move is
-- conditional on pg_extension; GRANTs are idempotent. Append-only: never
-- edit a shipped migration, including this one once pushed — repairs go in
-- a NEW timestamped file.
-- ============================================================================

create schema if not exists extensions;

do $$ declare ext_schema text;
begin
  select n.nspname into ext_schema
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
   where e.extname = 'pgcrypto';
  if ext_schema is null then
    create extension pgcrypto with schema extensions;
  elsif ext_schema <> 'extensions' then
    alter extension pgcrypto set schema extensions;
  end if;
end $$;

grant usage on schema extensions to anon, authenticated, service_role;
