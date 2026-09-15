-- DS-SECWARN-01: pin search_path on the 3 updated_at trigger helpers.
--
-- Clears the 3 function_search_path_mutable WARNs (public.handle_updated_at,
-- public.touch_game_save_updated_at, public.vcw_runs_touch_updated_at).
--
-- Each body below is byte-identical to the current definition in the repo
-- (NEW.updated_at = now() only; no unqualified table references, so no
-- schema-qualification is needed) with `SET search_path = public` added,
-- matching the repo convention (handle_new_user uses
-- `security definer set search_path = public`; the security_fixes trigger
-- helpers use plain `set search_path = public`, which is what these three
-- plain trigger helpers get -- no SECURITY DEFINER change, semantics intact).
-- pg_catalog stays visible under a pinned search_path, so now() is unaffected.
--
-- Fully rerunnable: CREATE OR REPLACE only, no DROP, no DDL on tables.

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
as $save_touch$
begin
  new.updated_at = now();
  return new;
end;
$save_touch$;

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
