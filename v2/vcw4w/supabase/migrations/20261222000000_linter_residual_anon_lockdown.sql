-- ============================================================================
-- Linter residual lockdown (2026-09-15 WARN sweep: 0014 + 0028 anon rows).
--
-- CONTEXT: the 0028/0029 sweep in 20261219 seclint_* + 20261220 sqlint_* +
-- 20261221 community_stat_averages already sets the intended grant policy.
-- Almost every row in the pasted report is BY DESIGN and must keep firing:
--   * 0014 pgcrypto-in-public: deliberate KEEP (see
--     20261220000011_sqlint_pgcrypto_schema.sql — 100+ shipped call sites
--     pin search_path=public and call gen_random_bytes/digest unqualified;
--     moving the extension breaks them, editing shipped files is forbidden).
--   * 0028 anon rows for clan_leaderboard / clan_minute_rate /
--     clan_roster_page (20261220000012 §2), game_chart_summary /
--     leaderboard_top (20261220000015 header), love_post_totals /
--     love_profile_stats (20261220000017 §2), and the kid session trio
--     start/heartbeat/end_kid_session (20261220000014 §1, anon cookie
--     callers in app/api/games/session/route.ts) are intentionally public.
--     Revoking anon would break public pages / child play.
--   * 0029 authenticated rows are the app's intentional RPC surface (every
--     user-JWT .rpc caller); revoking authenticated would break the app.
--   * auth_leaked_password_protection is a dashboard Auth toggle, not SQL
--     (Supabase dashboard → Authentication → Password protection → enable
--     "Leaked password protection"). No migration can set it.
--
-- RESIDUAL GAP this file closes: the sweep still lists anon EXECUTE on a
-- 5-arg overload
--   meter_submission_charge(p_user uuid, p_submission uuid, p_kind text,
--                           p_gross numeric, p_cut numeric)
-- No app .rpc caller references that overload (app calls the 4-arg
-- meter_submission_charge(uuid, text, numeric, numeric) via user JWT and
-- meter_submission_charge_for via serviceClient only). A p_user-first
-- signature must never be client-callable (any caller could charge any
-- user), so IF that overload exists in the target DB it is locked to
-- server-side-only here. The 20261219 seclint file granted authenticated
-- on it conditionally; this supersedes that to server-only, matching the
-- _for policy in 20261220000016. Conditional DO blocks keep the file
-- rerunnable whether or not the overload exists.
-- ============================================================================

-- 1. Phantom / legacy 5-arg overload: server-side-only if present. ---------
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'meter_submission_charge'
      and pg_get_function_identity_arguments(p.oid) = 'uuid, uuid, text, numeric, numeric'
  ) then
    revoke all on function public.meter_submission_charge(uuid, uuid, text, numeric, numeric)
      from public, anon, authenticated;
  end if;
end
$$;

-- 2. Re-assert the 4-arg app-called overload stays anon-free. ---------------
-- (Idempotent restate of 20261220000016; guards against any future anon
-- restore. Authenticated is KEPT: code/[id]/audit + code/zip call it via
-- the user-JWT client.)
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'meter_submission_charge'
      and pg_get_function_identity_arguments(p.oid) = 'uuid, text, numeric, numeric'
  ) then
    revoke all on function public.meter_submission_charge(uuid, text, numeric, numeric)
      from public, anon;
    grant execute on function public.meter_submission_charge(uuid, text, numeric, numeric)
      to authenticated;
  end if;
end
$$;

-- 3. Re-assert community_stat_averages stays anon-free. ---------------------
-- (Idempotent restate of 20261221000000: sole caller is the login-gated
-- GET /api/stats, which 401s without a session.)
revoke all on function public.community_stat_averages() from public, anon;
grant execute on function public.community_stat_averages() to authenticated, service_role;
