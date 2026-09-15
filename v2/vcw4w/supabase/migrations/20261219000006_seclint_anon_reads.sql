-- ============================================================================
-- 4WEIRD SECLINT DEFAULT-DENY ANON ON READ/HELPER RPCs (DS-SECLINT-06, seclint-06)
--
-- Lint 0028 leftovers: every function below historically carried GRANT EXECUTE
-- TO anon (directly or via PUBLIC). Default-deny: REVOKE ALL ON FUNCTION
-- public.<exact-sig> FROM anon, PUBLIC on all 41 envelope signatures, then an
-- explicit per-function grant-back. Two grant tiers:
--
--   TIER 1 — ANON KEPT (13): pure public reads served to logged-out visitors
--   on public pages (server client runs logged-out traffic as anon; the
--   analytics route even builds an explicit anon client). Explicit
--   GRANT EXECUTE TO anon, authenticated, service_role + evidence:
--     * game_chart_summary() — app/api/analytics/route.ts:14 anon.rpc(...);
--       header comment "so anonymous visitors can read aggregate player counts".
--     * leaderboard_top(text,text) — app/api/leaderboard/route.ts:26, "Public
--       per-game leaderboard", no login gate.
--     * love_profile_stats(text) — app/api/love/profile/route.ts:17, "public"
--       Earned/Received/Given, no login gate.
--     * love_post_totals(uuid) — app/api/love/post/[id]/route.ts:13, "public
--       totals for a post", no login gate.
--     * party_search(text) + party_resolve(text,text) —
--       app/api/parties/resolve/route.ts:29,41, public directory lookup, no
--       login gate (rate-limited only).
--     * party_feed(integer) — app/api/parties/feed/route.ts:37, GET has no
--       login gate (only POST requires login).
--     * clan_leaderboard(uuid) + clan_roster_page(uuid,integer,timestamptz,uuid)
--       + clan_minute_rate(uuid) — app/api/clans/[slug]/route.ts:140,180,201,
--       public clan page GET, no login gate.
--     * clan_scale_status(uuid) + clan_supporter_status(uuid) +
--       clan_tribute_status(uuid) — app/api/clans/[slug]/scale/route.ts:81-83,
--       public scale GET, no login gate.
--
--   TIER 2 — AUTHENTICATED + SERVICE_ROLE ONLY (28): everything else, never
--   anon. Includes the hard rule set: meter_*, file_report, set_cheat_setting,
--   process_easydnc_batch_payment. Downgraded-from-anon notes:
--     * community_stat_averages() — sole app caller is
--       app/api/stats/route.ts:47, which 401s without a session, so no public
--       page needs anon; authenticated-only.
--     * party_label(text,uuid) — zero .rpc callers in app/lib (used only
--       inside other function bodies, e.g. 20261014000000_party_interop.sql);
--       authenticated-only.
--     * clan_member_cap(uuid) — zero .rpc callers in app/lib (trigger helper
--       for enforce_clan_member_cap + SQL-side use); authenticated-only.
--     * file_report(text,uuid,text,text) — CONFLICT LOGGED: envelope rule says
--       never anon, so authenticated-only here, BUT app/api/clans/report/
--       route.ts:12 documents "anonymous allowed" POST filing via this RPC.
--       After this migration logged-out reports fail closed at the privilege
--       layer (sameOrigin + rate limits remain). Owning lane: either gate the
--       route to login or proxy anonymous reports through service_role.
--
-- Signature verification (grep over supabase/migrations; REVOKE/GRANT match on
-- arg TYPES only, defaults do not change identity):
--   * clan_* reads: 20260912000000_clan_types_upkeep_valleynet_runpod.sql:548
--     (leaderboard), 20260916000000_clan_social_perminute.sql (minute_rate),
--     20261015000100_scale_prune_tribute.sql (member_cap:100, roster_page,
--     scale/supporter/tribute statuses).
--   * org/team/perm helpers: 20260910130000_teams_enterprise_bundle.sql +
--     20260910190000_rls_recursion_fix.sql + 20260925000100_watcher_multirole_
--     ghost.sql (org_roles_of, org_watch_visible).
--   * party_*: 20261014000000_party_interop.sql (can_act/can_admin/entity_
--     exists/feed/label/resolve/search).
--   * community_stat_averages(): 20260910020000_multiplayer_and_social_
--     actions.sql; game_chart_summary(): 20260910030000_lobbies_analytics_and_
--     trial_credit.sql; leaderboard_top(text,text): 20260910070000_daily_and_
--     referrals.sql; file_report(text,uuid,text,text): 20260910080000_clans.sql.
--   * love_post_totals(uuid)/love_profile_stats(text): 20261001000000_love_
--     letters.sql; my_friends()/request_friend_by_handle(text)/respond_friend_
--     request(uuid,boolean): 20260910020000_multiplayer_and_social_actions.sql.
--   * my_meshy_spend()/my_submission_spend()/my_vault_spend()/
--     meter_meshy_usage(text,numeric,uuid)/meter_submission_charge(uuid,text,
--     numeric,numeric)/meter_vault_storage(uuid,numeric,numeric):
--     20261013000000_zip_vault_meshy.sql.
--   * set_cheat_setting(text,smallint,boolean): 20260910010000_social_
--     platform_wars.sql; process_easydnc_batch_payment(uuid,integer,text,
--     boolean,uuid): 20261117000000_easydnc_compliance_ledger.sql (last two
--     args have DEFAULTs — identity unchanged).
--   * OVERLOAD DISCREPANCY: the envelope's second form
--     meter_submission_charge(uuid,uuid,text,numeric,numeric) does NOT exist
--     under that name — grep finds exactly one meter_submission_charge(
--     definition (uuid,text,numeric,numeric, :250) and the 5-arg body as
--     meter_submission_charge_for(uuid,uuid,text,numeric,numeric) (:305-312).
--     This file revokes the real _for variant explicitly AND carries a
--     conditional DO block for the envelope-literal 5-arg overload so the
--     migration never errors on a missing signature, whichever shape a given
--     environment holds.
--
-- Rerunnable: REVOKE/GRANT are idempotent; the DO block is existence-guarded.
-- Append-only: never edit a shipped migration — repairs go in a NEW file.
-- Scope: function EXECUTE grants only. No bodies, tables, policies, triggers.
-- ============================================================================

-- -- TIER 1: public reads keep explicit anon (evidence in header) --------------

revoke all on function public.clan_leaderboard(uuid) from anon, public;
grant execute on function public.clan_leaderboard(uuid) to anon, authenticated, service_role;

revoke all on function public.clan_minute_rate(uuid) from anon, public;
grant execute on function public.clan_minute_rate(uuid) to anon, authenticated, service_role;

revoke all on function public.clan_roster_page(uuid, integer, timestamptz, uuid) from anon, public;
grant execute on function public.clan_roster_page(uuid, integer, timestamptz, uuid) to anon, authenticated, service_role;

revoke all on function public.clan_scale_status(uuid) from anon, public;
grant execute on function public.clan_scale_status(uuid) to anon, authenticated, service_role;

revoke all on function public.clan_supporter_status(uuid) from anon, public;
grant execute on function public.clan_supporter_status(uuid) to anon, authenticated, service_role;

revoke all on function public.clan_tribute_status(uuid) from anon, public;
grant execute on function public.clan_tribute_status(uuid) to anon, authenticated, service_role;

revoke all on function public.party_feed(integer) from anon, public;
grant execute on function public.party_feed(integer) to anon, authenticated, service_role;

revoke all on function public.party_resolve(text, text) from anon, public;
grant execute on function public.party_resolve(text, text) to anon, authenticated, service_role;

revoke all on function public.party_search(text) from anon, public;
grant execute on function public.party_search(text) to anon, authenticated, service_role;

revoke all on function public.game_chart_summary() from anon, public;
grant execute on function public.game_chart_summary() to anon, authenticated, service_role;

revoke all on function public.leaderboard_top(text, text) from anon, public;
grant execute on function public.leaderboard_top(text, text) to anon, authenticated, service_role;

revoke all on function public.love_post_totals(uuid) from anon, public;
grant execute on function public.love_post_totals(uuid) to anon, authenticated, service_role;

revoke all on function public.love_profile_stats(text) from anon, public;
grant execute on function public.love_profile_stats(text) to anon, authenticated, service_role;

-- -- TIER 2: authenticated + service_role only, never anon ---------------------

revoke all on function public.clan_member_cap(uuid) from anon, public;
grant execute on function public.clan_member_cap(uuid) to authenticated, service_role;

revoke all on function public.has_org_perm(uuid, text) from anon, public;
grant execute on function public.has_org_perm(uuid, text) to authenticated, service_role;

revoke all on function public.has_project_perm(uuid, text) from anon, public;
grant execute on function public.has_project_perm(uuid, text) to authenticated, service_role;

revoke all on function public.has_team_perm(uuid, text) from anon, public;
grant execute on function public.has_team_perm(uuid, text) to authenticated, service_role;

revoke all on function public.is_org_member(uuid) from anon, public;
grant execute on function public.is_org_member(uuid) to authenticated, service_role;

revoke all on function public.org_roles_of(uuid, uuid) from anon, public;
grant execute on function public.org_roles_of(uuid, uuid) to authenticated, service_role;

revoke all on function public.org_watch_visible(uuid, uuid) from anon, public;
grant execute on function public.org_watch_visible(uuid, uuid) to authenticated, service_role;

revoke all on function public.effective_perms(text, uuid) from anon, public;
grant execute on function public.effective_perms(text, uuid) to authenticated, service_role;

revoke all on function public.party_can_act(text, uuid) from anon, public;
grant execute on function public.party_can_act(text, uuid) to authenticated, service_role;

revoke all on function public.party_can_admin(text, uuid) from anon, public;
grant execute on function public.party_can_admin(text, uuid) to authenticated, service_role;

revoke all on function public.party_entity_exists(text, uuid) from anon, public;
grant execute on function public.party_entity_exists(text, uuid) to authenticated, service_role;

revoke all on function public.party_label(text, uuid) from anon, public;
grant execute on function public.party_label(text, uuid) to authenticated, service_role;

revoke all on function public.community_stat_averages() from anon, public;
grant execute on function public.community_stat_averages() to authenticated, service_role;

revoke all on function public.file_report(text, uuid, text, text) from anon, public;
grant execute on function public.file_report(text, uuid, text, text) to authenticated, service_role;

revoke all on function public.my_friends() from anon, public;
grant execute on function public.my_friends() to authenticated, service_role;

revoke all on function public.my_meshy_spend() from anon, public;
grant execute on function public.my_meshy_spend() to authenticated, service_role;

revoke all on function public.my_submission_spend() from anon, public;
grant execute on function public.my_submission_spend() to authenticated, service_role;

revoke all on function public.my_vault_spend() from anon, public;
grant execute on function public.my_vault_spend() to authenticated, service_role;

revoke all on function public.meter_meshy_usage(text, numeric, uuid) from anon, public;
grant execute on function public.meter_meshy_usage(text, numeric, uuid) to authenticated, service_role;

revoke all on function public.meter_submission_charge(uuid, text, numeric, numeric) from anon, public;
grant execute on function public.meter_submission_charge(uuid, text, numeric, numeric) to authenticated, service_role;

-- Envelope-literal 5-arg overload: only applied where that exact overload
-- exists (grep shows this fleet holds it as meter_submission_charge_for).
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'meter_submission_charge'
      and pg_get_function_identity_arguments(p.oid) = 'uuid, uuid, text, numeric, numeric'
  ) then
    revoke all on function public.meter_submission_charge(uuid, uuid, text, numeric, numeric) from anon, public;
    grant execute on function public.meter_submission_charge(uuid, uuid, text, numeric, numeric) to authenticated, service_role;
  end if;
end
$$;

-- Verified 5-arg sibling actually present in this fleet (20261013000000_zip_
-- vault_meshy.sql:305-312).
revoke all on function public.meter_submission_charge_for(uuid, uuid, text, numeric, numeric) from anon, public;
grant execute on function public.meter_submission_charge_for(uuid, uuid, text, numeric, numeric) to authenticated, service_role;

revoke all on function public.meter_vault_storage(uuid, numeric, numeric) from anon, public;
grant execute on function public.meter_vault_storage(uuid, numeric, numeric) to authenticated, service_role;

revoke all on function public.request_friend_by_handle(text) from anon, public;
grant execute on function public.request_friend_by_handle(text) to authenticated, service_role;

revoke all on function public.respond_friend_request(uuid, boolean) from anon, public;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated, service_role;

revoke all on function public.set_cheat_setting(text, smallint, boolean) from anon, public;
grant execute on function public.set_cheat_setting(text, smallint, boolean) to authenticated, service_role;

revoke all on function public.team_org(uuid) from anon, public;
grant execute on function public.team_org(uuid) to authenticated, service_role;

revoke all on function public.project_team(uuid) from anon, public;
grant execute on function public.project_team(uuid) to authenticated, service_role;

revoke all on function public.process_easydnc_batch_payment(uuid, integer, text, boolean, uuid) from anon, public;
grant execute on function public.process_easydnc_batch_payment(uuid, integer, text, boolean, uuid) to authenticated, service_role;
