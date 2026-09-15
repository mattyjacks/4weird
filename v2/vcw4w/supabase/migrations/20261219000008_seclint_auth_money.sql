-- ============================================================================
-- DS-SECLINT-08: harden money/metering 0029-flagged RPC grants WITHOUT
-- breaking legitimate user flows.
--
-- Treatment per function (exact signatures confirmed by grep over
-- supabase/migrations CREATE OR REPLACE FUNCTION lines; latest defining
-- migration wins):
--   revoke all on function public.<sig> from anon, public;
--   grant execute on function public.<sig> to authenticated, service_role;
-- Belt-and-braces: 0028 siblings already revoked some of these from anon;
-- re-applying is idempotent. service_role is granted everywhere so
-- server-side callers (bot-key routes, cron, backfills) keep working.
-- No bodies are touched here (owning lanes own CREATE OR REPLACE).
--
-- "Both overloads" of meter_submission_charge:
--   * meter_submission_charge(uuid, text, numeric, numeric) -- user-facing,
--     granted to authenticated + service_role below.
--   * meter_submission_charge_for(uuid, uuid, text, numeric, numeric) --
--     bot-key twin that debits an EXPLICIT p_user wallet
--     (20261013000000_zip_vault_meshy.sql:305-312, deliberately carries NO
--     grant: "only the service_role key ... can call them"). Granting it to
--     authenticated would let any login debit ARBITRARY users' wallets, so
--     Section B revokes anon/public/authenticated and grants service_role
--     ONLY. This preserves the existing server flow and closes nothing
--     legitimate (no user-JWT path calls the _for twin).
--
-- Auth-guard audit (grep of each latest body for an `auth.uid() IS NULL`
-- guard). Bodies are NOT changed here; missing guards are follow-ups for
-- the owning lanes:
--   MISSING-GUARD (no auth.uid() reference at all in body):
--   * record_platform_cut(text, numeric, numeric, text, uuid) -- internal
--     ledger helper, callable by authenticated. Follow-up: restrict EXECUTE
--     to service_role or add a caller auth check (owning lane).
--   * process_easydnc_batch_payment(uuid, integer, text, boolean, uuid) --
--     debits caller-supplied p_user_id with no p_user_id = auth.uid()
--     check. Follow-up: add `if p_user_id is distinct from auth.uid()`
--     gate (with service_role bypass) in owning lane.
--   * accrue_clan_upkeep(uuid) -- debits clan wallet by id, no auth check.
--     Follow-up: verify intended callers (cron/service) and consider
--     service_role-only EXECUTE (owning lane).
--   * accrue_clan_minute_upkeep(uuid) -- same as accrue_clan_upkeep.
--   NO-EXPLICIT-GUARD (auth.uid() used null-safely in WHERE, fails
--   closed/empty for anon, but no explicit `IS NULL ... raise`):
--   * get_my_coin_balance(), get_my_coin_refunds(),
--     get_my_crown_converts(), get_my_eligible_crown_lots() -- follow-up:
--     optional explicit `if auth.uid() is null then raise exception
--     'login required'` for consistency (owning lane).
--   EQUIVALENT-GUARD (no literal IS NULL, but fail-closed perm check):
--   * set_org_budget(uuid, numeric, integer, boolean) -- gated by
--     has_org_perm(p_org, 'org.billing.manage'). Follow-up: verify
--     has_org_perm returns false for null uid (owning lane).
--   BY-DESIGN (explicit user param, service_role-only, no grant):
--   * meter_submission_charge_for(uuid, uuid, text, numeric, numeric) --
--     see Section B note above; no body change needed.
--   All other functions below already contain
--   `if auth.uid() is null then raise exception 'login required'`.
--
-- Rerunnable: REVOKE / GRANT are idempotent. No tables, policies,
-- triggers, or indexes are created here.
-- ============================================================================

-- ---- Section A: user-facing money/metering RPCs. Revoke anon/PUBLIC,
-- grant back authenticated + service_role (no flow change for logins).

revoke all on function public.charge_dev_action(text, text, numeric, text, text, text, text) from anon, public;
grant execute on function public.charge_dev_action(text, text, numeric, text, text, text, text) to authenticated, service_role;

revoke all on function public.charge_mmo_minutes(uuid, uuid, timestamptz, integer) from anon, public;
grant execute on function public.charge_mmo_minutes(uuid, uuid, timestamptz, integer) to authenticated, service_role;

revoke all on function public.fund_clan_wallet(uuid, numeric) from anon, public;
grant execute on function public.fund_clan_wallet(uuid, numeric) to authenticated, service_role;

revoke all on function public.fund_kid_wallet(uuid, numeric) from anon, public;
grant execute on function public.fund_kid_wallet(uuid, numeric) to authenticated, service_role;

revoke all on function public.fund_org_wallet(uuid, integer) from anon, public;
grant execute on function public.fund_org_wallet(uuid, integer) to authenticated, service_role;

revoke all on function public.meter_clan_posting_fee(uuid, text, integer, boolean) from anon, public;
grant execute on function public.meter_clan_posting_fee(uuid, text, integer, boolean) to authenticated, service_role;

revoke all on function public.meter_fal_usage(text, text, numeric, text) from anon, public;
grant execute on function public.meter_fal_usage(text, text, numeric, text) to authenticated, service_role;

revoke all on function public.meter_game_ai_usage(text, text, numeric, uuid, text) from anon, public;
grant execute on function public.meter_game_ai_usage(text, text, numeric, uuid, text) to authenticated, service_role;

revoke all on function public.meter_meshy_usage(text, numeric, uuid) from anon, public;
grant execute on function public.meter_meshy_usage(text, numeric, uuid) to authenticated, service_role;

revoke all on function public.meter_newgameplus_build(uuid, text, text, integer, integer, numeric, text) from anon, public;
grant execute on function public.meter_newgameplus_build(uuid, text, text, integer, integer, numeric, text) to authenticated, service_role;

revoke all on function public.meter_openrouter_usage(text, text, text, numeric, text) from anon, public;
grant execute on function public.meter_openrouter_usage(text, text, text, numeric, text) to authenticated, service_role;

revoke all on function public.meter_outscraper_usage(text, text, text, numeric, text, text) from anon, public;
grant execute on function public.meter_outscraper_usage(text, text, text, numeric, text, text) to authenticated, service_role;

revoke all on function public.meter_submission_charge(uuid, text, numeric, numeric) from anon, public;
grant execute on function public.meter_submission_charge(uuid, text, numeric, numeric) to authenticated, service_role;

revoke all on function public.meter_usage(uuid, integer) from anon, public;
grant execute on function public.meter_usage(uuid, integer) to authenticated, service_role;

revoke all on function public.meter_vault_storage(uuid, numeric, numeric) from anon, public;
grant execute on function public.meter_vault_storage(uuid, numeric, numeric) to authenticated, service_role;

revoke all on function public.meter_vcw_usage(text, numeric, uuid, text) from anon, public;
grant execute on function public.meter_vcw_usage(text, numeric, uuid, text) to authenticated, service_role;

revoke all on function public.record_platform_cut(text, numeric, numeric, text, uuid) from anon, public;
grant execute on function public.record_platform_cut(text, numeric, numeric, text, uuid) to authenticated, service_role;

revoke all on function public.refund_coin_lot(uuid, numeric) from anon, public;
grant execute on function public.refund_coin_lot(uuid, numeric) to authenticated, service_role;

revoke all on function public.refund_vendor_usage(text, uuid) from anon, public;
grant execute on function public.refund_vendor_usage(text, uuid) to authenticated, service_role;

revoke all on function public.convert_crown_to_coins(numeric) from anon, public;
grant execute on function public.convert_crown_to_coins(numeric) to authenticated, service_role;

revoke all on function public.request_crown_payout(numeric) from anon, public;
grant execute on function public.request_crown_payout(numeric) to authenticated, service_role;

revoke all on function public.get_my_coin_balance() from anon, public;
grant execute on function public.get_my_coin_balance() to authenticated, service_role;

revoke all on function public.get_my_coin_refunds() from anon, public;
grant execute on function public.get_my_coin_refunds() to authenticated, service_role;

revoke all on function public.get_my_crown_balances() from anon, public;
grant execute on function public.get_my_crown_balances() to authenticated, service_role;

revoke all on function public.get_my_crown_converts() from anon, public;
grant execute on function public.get_my_crown_converts() to authenticated, service_role;

revoke all on function public.get_my_eligible_crown_lots() from anon, public;
grant execute on function public.get_my_eligible_crown_lots() to authenticated, service_role;

revoke all on function public.get_my_refundable_lots() from anon, public;
grant execute on function public.get_my_refundable_lots() to authenticated, service_role;

revoke all on function public.claim_daily_bonus() from anon, public;
grant execute on function public.claim_daily_bonus() to authenticated, service_role;

revoke all on function public.claim_alpha_tester_bonus() from anon, public;
grant execute on function public.claim_alpha_tester_bonus() to authenticated, service_role;

revoke all on function public.apply_referral(text) from anon, public;
grant execute on function public.apply_referral(text) to authenticated, service_role;

revoke all on function public.get_or_create_referral_code() from anon, public;
grant execute on function public.get_or_create_referral_code() to authenticated, service_role;

revoke all on function public.tip_creator(uuid, uuid, numeric) from anon, public;
grant execute on function public.tip_creator(uuid, uuid, numeric) to authenticated, service_role;

revoke all on function public.purchase_cosmetic_item(text, text, numeric) from anon, public;
grant execute on function public.purchase_cosmetic_item(text, text, numeric) to authenticated, service_role;

revoke all on function public.settle_booking_escrow(uuid) from anon, public;
grant execute on function public.settle_booking_escrow(uuid) to authenticated, service_role;

revoke all on function public.cancel_subscription(uuid) from anon, public;
grant execute on function public.cancel_subscription(uuid) to authenticated, service_role;

revoke all on function public.process_easydnc_batch_payment(uuid, integer, text, boolean, uuid) from anon, public;
grant execute on function public.process_easydnc_batch_payment(uuid, integer, text, boolean, uuid) to authenticated, service_role;

revoke all on function public.contribute_launch_campaign(uuid, numeric) from anon, public;
grant execute on function public.contribute_launch_campaign(uuid, numeric) to authenticated, service_role;

revoke all on function public.donate_clan_upkeep(uuid, numeric) from anon, public;
grant execute on function public.donate_clan_upkeep(uuid, numeric) to authenticated, service_role;

revoke all on function public.accrue_clan_upkeep(uuid) from anon, public;
grant execute on function public.accrue_clan_upkeep(uuid) to authenticated, service_role;

revoke all on function public.accrue_clan_minute_upkeep(uuid) from anon, public;
grant execute on function public.accrue_clan_minute_upkeep(uuid) to authenticated, service_role;

revoke all on function public.my_clan_usage() from anon, public;
grant execute on function public.my_clan_usage() to authenticated, service_role;

revoke all on function public.my_compute_usage(uuid) from anon, public;
grant execute on function public.my_compute_usage(uuid) to authenticated, service_role;

revoke all on function public.my_fal_usage() from anon, public;
grant execute on function public.my_fal_usage() to authenticated, service_role;

revoke all on function public.my_game_play_usage() from anon, public;
grant execute on function public.my_game_play_usage() to authenticated, service_role;

revoke all on function public.my_meshy_spend() from anon, public;
grant execute on function public.my_meshy_spend() to authenticated, service_role;

revoke all on function public.my_newgameplus_spend() from anon, public;
grant execute on function public.my_newgameplus_spend() to authenticated, service_role;

revoke all on function public.my_openrouter_usage() from anon, public;
grant execute on function public.my_openrouter_usage() to authenticated, service_role;

revoke all on function public.my_outscraper_usage() from anon, public;
grant execute on function public.my_outscraper_usage() to authenticated, service_role;

revoke all on function public.my_submission_spend() from anon, public;
grant execute on function public.my_submission_spend() to authenticated, service_role;

revoke all on function public.my_vault_spend() from anon, public;
grant execute on function public.my_vault_spend() to authenticated, service_role;

revoke all on function public.my_vcw_usage() from anon, public;
grant execute on function public.my_vcw_usage() to authenticated, service_role;

revoke all on function public.my_team_perms(uuid) from anon, public;
grant execute on function public.my_team_perms(uuid) to authenticated, service_role;

revoke all on function public.subscribe_to_tier(uuid) from anon, public;
grant execute on function public.subscribe_to_tier(uuid) to authenticated, service_role;

revoke all on function public.set_my_budget(numeric, integer, boolean) from anon, public;
grant execute on function public.set_my_budget(numeric, integer, boolean) to authenticated, service_role;

revoke all on function public.set_org_budget(uuid, numeric, integer, boolean) from anon, public;
grant execute on function public.set_org_budget(uuid, numeric, integer, boolean) to authenticated, service_role;

-- ---- Section B: service-role-only twin. NO authenticated grant by design
-- (p_user-parameterized debit; any-login access would let one user drain
-- another's wallet). Revoke anon/public/authenticated, grant service_role.

revoke all on function public.meter_submission_charge_for(uuid, uuid, text, numeric, numeric) from anon, public, authenticated;
grant execute on function public.meter_submission_charge_for(uuid, uuid, text, numeric, numeric) to service_role;
