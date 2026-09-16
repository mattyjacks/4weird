-- ============================================================================
-- B01 SECLINT3 INFRA (20261225000001_seclint3_infra.sql)
--
-- Batch: CHEAP-mode worker B01 (infra). Append-only; never edit shipped
-- migrations; never touch old-v1/; no secrets; no index.html.
--
-- Prior markers re-read (no duplicate claims):
--   * v2/vcw4w/supabase/migrations/20261219000001_seclint_search_path.sql
--     pins the 3 trigger helpers below with
--     ALTER FUNCTION ... SET search_path = public, pg_temp (idempotent).
--     This file re-asserts the same pins (harmless re-pin, rerunnable).
--   * v2/vcw4w/supabase/migrations/20261222000001_seclint2_pgcrypto.sql
--     (DS-SECFIX2-01) records DECISION KEEP pgcrypto IN public with ZERO
--     executable statements, citing unqualified gen_random_*/digest callers
--     under pinned search_path=public and the 20261220000001 conditional
--     keep-in-public pin / 20261220000011_sqlint_pgcrypto_schema.sql /
--     20261222000000_linter_residual_anon_lockdown.sql residual 0014 BY DESIGN.
--     LEAD RULING 2026-09-16 at integrate: KEEP governs. The MOVE draft that
--     stood here was neutralized before any db push — unqualified
--     gen_random_*/digest callers under pinned search_path=public across
--     shipped, immutable migrations would 42883 in prod, with no legal
--     repair inside shipped files (see
--     20261102000000_bot_runtime_repairs.sql lines 13-19). A future move goes
--     in a NEW file together with widening every dependent to
--     SET search_path = public, extensions.
--
-- Grep findings (v2/vcw4w/supabase/migrations, 2026-09-15):
--   * "pgcrypto": 53 matches; only creator is
--     20260910090000_bot_platform.sql:28
--     (create extension if not exists pgcrypto; => public, no schema).
--     Remainder are KEEP/MOVE decision comments + conditional DO pins.
--   * Usage: 100+ unqualified gen_random_uuid() defaults, unqualified
--     gen_random_bytes(n) and digest(.,'sha1') call sites; zero qualified
--     extensions.gen_random_*/extensions.digest/public.gen_random_*/
--     public.digest refs in SQL (comments only).
--
-- Scope: pgcrypto KEEP (no-op, documented) + 3 search_path pins +
-- leaked-password doc only.
-- Explicitly OUT: no CREATE TABLE, no coin/ledger column ALTER, no RLS /
-- REVOKE / GRANT delta, no other functions/policies/triggers/indexes.
-- All statements rerunnable (DO-guard / ALTER SET).
-- ============================================================================

-- 1) pgcrypto placement: KEEP in public — NO executable statement.
-- (Decision documented in the header; executable move forbidden per ruling.)

-- 2) Trigger-helper search_path pins (idempotent re-pins; same pins as
-- 20261219000001_seclint_search_path.sql).
ALTER FUNCTION public.handle_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.touch_game_save_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.vcw_runs_touch_updated_at() SET search_path = public, pg_temp;

-- 3) DOC ONLY — auth.leaked_password_protection (Supabase linter
-- auth_leaked_password_protection). SQL CANNOT clear this finding: there is
-- no SQL-accessible setting for it. Clear it in the dashboard only:
--   Supabase dashboard → project → Authentication → Password protection
--   → enable Leaked password protection / HaveIBeenPwned check.
-- No executable statement ships for this item by design.
