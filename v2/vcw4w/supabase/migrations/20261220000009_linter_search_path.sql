-- Linter fix: function_search_path_mutable WARNs.
--
-- Pins an empty search_path on the three trigger helpers flagged by the
-- Supabase linter (function_search_path_mutable). All three bodies were
-- verified to touch only NEW/now() with no unqualified table references,
-- so an empty search_path is safe (no SET search_path = public needed).
--
-- ALTER FUNCTION ... SET is idempotent, so this file is rerunnable as-is.
-- NOTE: version 20261219000000 was chosen because 20261217000000 (the
-- originally requested stamp) is already taken by
-- 20261217000000_feedback_neutral_critique.sql, and migration versions
-- must be unique (see scripts/verify-migration-versions.mjs).

alter function public.handle_updated_at() set search_path = '';
alter function public.touch_game_save_updated_at() set search_path = '';
alter function public.vcw_runs_touch_updated_at() set search_path = '';
