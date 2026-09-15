-- ============================================================================
-- SQLINT 0011 (function_search_path_mutable): pin search_path on 3 trigger
-- functions: public.handle_updated_at(), public.touch_game_save_updated_at(),
-- public.vcw_runs_touch_updated_at().
--
-- Why: Supabase linter 0011 flags functions without an explicit SET
-- search_path; an unpinned search_path lets search_path hijacking resolve
-- unqualified names to an attacker-controlled schema. These three are plain
-- BEFORE UPDATE trigger helpers (not SECURITY DEFINER), bodies only assign
-- new.updated_at = now(), but the pin removes the lint and hardens them.
--
-- Canonical bodies read from:
--   20260910000000_vibe_coins_init.sql:27 (handle_updated_at),
--   202609100001_game_saves.sql:23 (touch_game_save_updated_at),
--   20260918000000_vcw_runs.sql:58 (vcw_runs_touch_updated_at).
-- Bodies below are byte-identical to those sources EXCEPT for the added
-- `SET search_path = public` line (language plpgsql line style follows
-- 20261113000000_timer_ownership_hardening.sql precedent).
--
-- Rerunnable: CREATE OR REPLACE FUNCTION is idempotent; no DROP needed.
-- Creates no tables/policies/triggers/indexes and changes no GRANT/REVOKE
-- (trigger functions are not SECURITY DEFINER). Never touches coin logic
-- and never edits shipped migrations.
-- ============================================================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_game_save_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.vcw_runs_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
