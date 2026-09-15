-- ============================================================================
-- DS-SECFIX2-08 (seclint2-08): Supabase lints 0028/0029 — reconcile
-- KID/FAMILY-domain RPC EXECUTE grants against
-- 20261220000014_sqlint_revoke_kid_family.sql.
--
-- ROUTE-GREP PROOF (verified 2026-09-15, .rpc( over app/):
--
--   Session trio — ANON (logged-out kids client). KEEP anon.
--     app/api/games/session/route.ts:78 builds `supabase` via
--     createClient() = anon-key server client; :80-85 with no Supabase
--     user the SAME anon client runs kidSessionPlay(); :320/:346/:363
--     call .rpc("start_kid_session" / "heartbeat_kid_session" /
--     "end_kid_session"). A logged-out kid carries no JWT, so PostgREST
--     executes these AS anon. Revoking anon breaks ALL child play
--     (see also scripts/verify-family.mjs anon requirement).
--     => REVOKE public only; re-assert anon + authenticated.
--
--   Parent RPCs — AUTHENTICATED (parent session, 401 login gates).
--   Every route 401s without a user session before reaching the RPC:
--     create_kid_account  app/api/family/kids/route.ts:129 (gate :77-79)
--     set_kid_controls    app/api/family/kids/[id]/route.ts:112 (gate :44-46)
--     set_kid_password    app/api/family/kids/[id]/route.ts:128 (same gate)
--     close_kid_account   app/api/family/kids/[id]/route.ts:154 (gate :143-145)
--     fund_kid_wallet     app/api/family/fund/route.ts:39 (gate :19-21)
--   Bodies additionally enforce auth.uid() (family_accounts.sql + later
--   redefinitions). Zero logged-out callers exist, so parent-auth suffices.
--     => REVOKE public + anon; KEEP authenticated.
--
--   Server-internal helpers — ZERO .rpc( callers in app/lib/components
--   (SQL-internal only: fund_kid_wallet/close_kid_account call
--   kid_wallet_balance; start_kid_session calls kid_session_owner /
--   kid_in_window / kid_seconds_today; nested SECURITY DEFINER calls
--   bypass grants anyway):
--     kid_session_owner, kid_in_window, kid_wallet_balance, kid_seconds_today
--     => REVOKE public + anon + authenticated (service_role/definer only).
--
-- RECONCILIATION vs 20261220000014: that file sets exactly the policy
-- above with unconditional statements. This delta re-asserts the SAME
-- grants idempotently inside existence-guarded DO blocks (pattern from
-- 20261222000000), so it converges no matter the apply order and stays a
-- no-op if a signature is ever absent. Grants are never widened beyond
-- shipped state. No bodies, session semantics, caps, or wallet logic
-- touched. No tables/policies/triggers/indexes created here.
--
-- SEARCH_PATH (lint 0029 companion): every function below already carries
-- an explicit SET in ALL definitions (family_accounts.sql:119,127,153,
-- 159,167,193,241,258,280,308,402,478; newgameplus:228; audit_fixes:159;
-- kid_unlimited_time:14; ledger_pairing:268,334), so §4 only pins
-- search_path = public WHERE it is currently unset — a no-op today and a
-- guard against future redefinitions. No body is rewritten.
--
-- Exact signatures copied from the shipped definitions
-- (20260924000002_family_accounts.sql; heartbeat re-affirmed by
-- 20261207000000_security_audit_fixes.sql; controls re-affirmed by
-- 20261025000004_kid_unlimited_time.sql; fund/close re-affirmed by
-- 20261018000000_ledger_pairing_hardening.sql). `char(64)` is the exact
-- form (`character` without length would mean character(1) and match
-- nothing). Rerunnable: guarded REVOKE + GRANT are idempotent no-ops
-- when the privilege is already absent/held.
-- ============================================================================

-- --------------------------------------------------------------------------
-- §1. Session trio: revoke PUBLIC only; re-assert anon + authenticated.
-- Anon EXECUTE is load-bearing for logged-out kid play (proof above).
-- --------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'start_kid_session'
      and pg_get_function_identity_arguments(p.oid) = 'uuid, character(64), text, text, integer, integer'
  ) then
    revoke all on function public.start_kid_session(uuid, char(64), text, text, integer, integer) from public;
    grant execute on function public.start_kid_session(uuid, char(64), text, text, integer, integer) to anon, authenticated;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'heartbeat_kid_session'
      and pg_get_function_identity_arguments(p.oid) = 'uuid, character(64), uuid, integer'
  ) then
    revoke all on function public.heartbeat_kid_session(uuid, char(64), uuid, integer) from public;
    grant execute on function public.heartbeat_kid_session(uuid, char(64), uuid, integer) to anon, authenticated;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'end_kid_session'
      and pg_get_function_identity_arguments(p.oid) = 'uuid, character(64), uuid'
  ) then
    revoke all on function public.end_kid_session(uuid, char(64), uuid) from public;
    grant execute on function public.end_kid_session(uuid, char(64), uuid) to anon, authenticated;
  end if;
end
$$;

-- --------------------------------------------------------------------------
-- §2. Parent RPCs: revoke PUBLIC + ANON; keep authenticated.
-- Parent-auth suffices: every caller is a 401-gated parent-session route
-- (proof above) plus auth.uid() guards inside the bodies.
-- --------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_kid_account'
      and pg_get_function_identity_arguments(p.oid) = 'text, character(4), text, text'
  ) then
    revoke all on function public.create_kid_account(text, char(4), text, text) from public, anon, authenticated;
    grant execute on function public.create_kid_account(text, char(4), text, text) to authenticated;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_kid_controls'
      and pg_get_function_identity_arguments(p.oid) = 'uuid, integer, time without time zone, time without time zone, text, numeric, boolean, text, text'
  ) then
    revoke all on function public.set_kid_controls(uuid, integer, time, time, text, numeric, boolean, text, text) from public, anon, authenticated;
    grant execute on function public.set_kid_controls(uuid, integer, time, time, text, numeric, boolean, text, text) to authenticated;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_kid_password'
      and pg_get_function_identity_arguments(p.oid) = 'uuid, text'
  ) then
    revoke all on function public.set_kid_password(uuid, text) from public, anon, authenticated;
    grant execute on function public.set_kid_password(uuid, text) to authenticated;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'fund_kid_wallet'
      and pg_get_function_identity_arguments(p.oid) = 'uuid, numeric'
  ) then
    revoke all on function public.fund_kid_wallet(uuid, numeric) from public, anon, authenticated;
    grant execute on function public.fund_kid_wallet(uuid, numeric) to authenticated;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'close_kid_account'
      and pg_get_function_identity_arguments(p.oid) = 'uuid'
  ) then
    revoke all on function public.close_kid_account(uuid) from public, anon, authenticated;
    grant execute on function public.close_kid_account(uuid) to authenticated;
  end if;
end
$$;

-- --------------------------------------------------------------------------
-- §3. Server-internal helpers: revoke PUBLIC + ANON + AUTHENTICATED.
-- Zero direct app callers; nested SECURITY DEFINER calls bypass grants.
-- --------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'kid_session_owner'
      and pg_get_function_identity_arguments(p.oid) = 'character(64)'
  ) then
    revoke all on function public.kid_session_owner(char(64)) from public, anon, authenticated;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'kid_in_window'
      and pg_get_function_identity_arguments(p.oid) = 'uuid'
  ) then
    revoke all on function public.kid_in_window(uuid) from public, anon, authenticated;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'kid_wallet_balance'
      and pg_get_function_identity_arguments(p.oid) = 'uuid'
  ) then
    revoke all on function public.kid_wallet_balance(uuid) from public, anon, authenticated;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'kid_seconds_today'
      and pg_get_function_identity_arguments(p.oid) = 'uuid'
  ) then
    revoke all on function public.kid_seconds_today(uuid) from public, anon, authenticated;
  end if;
end
$$;

-- --------------------------------------------------------------------------
-- §4. search_path: pin to public ONLY where currently unset.
-- All twelve functions already carry an explicit SET (see header), so this
-- is a no-op today; it guards against a future redefinition dropping it.
-- ALTER ... SET does not rewrite bodies.
-- --------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.oid,
           format('alter function %s(%s) set search_path = public;',
                  quote_ident(n.nspname) || '.' || quote_ident(p.proname),
                  pg_get_function_identity_arguments(p.oid)) as stmt
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (
        (p.proname = 'start_kid_session' and pg_get_function_identity_arguments(p.oid) = 'uuid, character(64), text, text, integer, integer')
        or (p.proname = 'heartbeat_kid_session' and pg_get_function_identity_arguments(p.oid) = 'uuid, character(64), uuid, integer')
        or (p.proname = 'end_kid_session' and pg_get_function_identity_arguments(p.oid) = 'uuid, character(64), uuid')
        or (p.proname = 'create_kid_account' and pg_get_function_identity_arguments(p.oid) = 'text, character(4), text, text')
        or (p.proname = 'set_kid_controls' and pg_get_function_identity_arguments(p.oid) = 'uuid, integer, time without time zone, time without time zone, text, numeric, boolean, text, text')
        or (p.proname = 'set_kid_password' and pg_get_function_identity_arguments(p.oid) = 'uuid, text')
        or (p.proname = 'fund_kid_wallet' and pg_get_function_identity_arguments(p.oid) = 'uuid, numeric')
        or (p.proname = 'close_kid_account' and pg_get_function_identity_arguments(p.oid) = 'uuid')
        or (p.proname = 'kid_session_owner' and pg_get_function_identity_arguments(p.oid) = 'character(64)')
        or (p.proname = 'kid_in_window' and pg_get_function_identity_arguments(p.oid) = 'uuid')
        or (p.proname = 'kid_wallet_balance' and pg_get_function_identity_arguments(p.oid) = 'uuid')
        or (p.proname = 'kid_seconds_today' and pg_get_function_identity_arguments(p.oid) = 'uuid')
      )
      and (p.proconfig is null or not exists (
        select 1 from unnest(p.proconfig) c where c like 'search_path=%'
      ))
  loop
    execute r.stmt;
  end loop;
end
$$;
