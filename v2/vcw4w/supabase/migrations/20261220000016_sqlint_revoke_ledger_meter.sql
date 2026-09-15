-- ============================================================================
-- DS-SQLINT-07: lint 0028/0029 on LEDGER/METER/MONEY-domain functions.
--
-- REVOKE-ONLY hardening (economy-adjacent). This file NEVER alters function
-- bodies, amounts, splits, or ledger pairing: no CREATE, no OR REPLACE, no
-- tables/policies/triggers/indexes. Plain REVOKE/GRANT statements are
-- idempotent (revoking an absent privilege is a WARNING, not an error), so
-- the file is rerunnable. Follows the timer_ownership pattern
-- (20261113000000_timer_ownership_hardening.sql):
--   revoke all ... from public, anon; + grant execute ... to authenticated;
-- service_role is unaffected by every statement below (revokes are per-role;
-- record_platform_cut keeps its service_role grant, used by the heal-meter
-- settle route via serviceClient()).
--
-- Classification (verified 2026-09-15 by grepping .rpc( usage across
-- v2/vcw4w app/components/lib, *.ts/*.tsx):
--
-- KEEP authenticated (revoke public+anon only; re-grant authenticated so the
-- user-session call path stays intact). Every one of these is called from a
-- user session via the user-scoped createClient():
--   meter_meshy_usage, meter_submission_charge, meter_vault_storage,
--   meter_fal_usage, meter_game_ai_usage, meter_newgameplus_build,
--   meter_openrouter_usage, meter_outscraper_usage, meter_vcw_usage,
--   refund_coin_lot, refund_vendor_usage, get_my_coin_balance,
--   get_my_coin_refunds, get_my_crown_balances, get_my_refundable_lots,
--   my_compute_usage, my_fal_usage, my_openrouter_usage, my_outscraper_usage,
--   my_meshy_spend, my_submission_spend, my_vault_spend, my_newgameplus_spend,
--   claim_daily_bonus, claim_alpha_tester_bonus, apply_referral,
--   get_or_create_referral_code, subscribe_to_tier, cancel_subscription,
--   tip_creator, contribute_launch_campaign, close_launch_campaign,
--   launch_campaign_progress, create_launch_campaign, purchase_cosmetic_item,
--   process_easydnc_batch_payment, charge_dev_action.
--   (my_*_spend wrappers go through spendRollup() in app/api/my/usage with
--   the user client; process_easydnc_batch_payment is called with the user
--   client from easydnc/check + crm scrub-dnc.)
--
-- SERVER-SIDE-ONLY (revoke public, anon AND authenticated; service_role and
-- the function owner keep execute):
--   apply_coin_lot_to_ledger() -- trigger function only (FOR EACH ROW), never
--     an RPC target.
--   meter_submission_charge_for(uuid, uuid, text, numeric, numeric) -- 2nd
--     overload family member; called only via svc/serviceClient().
--   meter_usage(uuid, integer) -- no app .rpc reference (comment-only).
--   record_platform_cut(text, numeric, numeric, text, uuid) -- called only
--     via serviceClient() in budgets/heal-meter settle.
--   get_my_crown_converts(), get_my_eligible_crown_lots(), my_vcw_usage(),
--     convert_crown_to_coins(numeric), request_crown_payout(numeric) -- zero
--     app .rpc references; authenticated must not reach money-moving or
--     payout-adjacent RPCs the app never calls.
-- ============================================================================

-- ---- App-called meter functions: revoke anon, keep authenticated ---------
revoke all on function public.meter_meshy_usage(text, numeric, uuid) from public, anon;
grant execute on function public.meter_meshy_usage(text, numeric, uuid) to authenticated;

revoke all on function public.meter_submission_charge(uuid, text, numeric, numeric) from public, anon;
grant execute on function public.meter_submission_charge(uuid, text, numeric, numeric) to authenticated;

revoke all on function public.meter_vault_storage(uuid, numeric, numeric) from public, anon;
grant execute on function public.meter_vault_storage(uuid, numeric, numeric) to authenticated;

revoke all on function public.meter_fal_usage(text, text, numeric, text) from public, anon;
grant execute on function public.meter_fal_usage(text, text, numeric, text) to authenticated;

revoke all on function public.meter_game_ai_usage(text, text, numeric, uuid, text) from public, anon;
grant execute on function public.meter_game_ai_usage(text, text, numeric, uuid, text) to authenticated;

revoke all on function public.meter_newgameplus_build(uuid, text, text, integer, integer, numeric, text) from public, anon;
grant execute on function public.meter_newgameplus_build(uuid, text, text, integer, integer, numeric, text) to authenticated;

revoke all on function public.meter_openrouter_usage(text, text, text, numeric, text) from public, anon;
grant execute on function public.meter_openrouter_usage(text, text, text, numeric, text) to authenticated;

revoke all on function public.meter_outscraper_usage(text, text, text, numeric, text, text) from public, anon;
grant execute on function public.meter_outscraper_usage(text, text, text, numeric, text, text) to authenticated;

revoke all on function public.meter_vcw_usage(text, numeric, uuid, text) from public, anon;
grant execute on function public.meter_vcw_usage(text, numeric, uuid, text) to authenticated;

-- ---- App-called money/claim/refund/subscribe/tip/fundraiser/shop paths ---
revoke all on function public.refund_coin_lot(uuid, numeric) from public, anon;
grant execute on function public.refund_coin_lot(uuid, numeric) to authenticated;

revoke all on function public.refund_vendor_usage(text, uuid) from public, anon;
grant execute on function public.refund_vendor_usage(text, uuid) to authenticated;

revoke all on function public.get_my_coin_balance() from public, anon;
grant execute on function public.get_my_coin_balance() to authenticated;

revoke all on function public.get_my_coin_refunds() from public, anon;
grant execute on function public.get_my_coin_refunds() to authenticated;

revoke all on function public.get_my_crown_balances() from public, anon;
grant execute on function public.get_my_crown_balances() to authenticated;

revoke all on function public.get_my_refundable_lots() from public, anon;
grant execute on function public.get_my_refundable_lots() to authenticated;

revoke all on function public.my_compute_usage(uuid) from public, anon;
grant execute on function public.my_compute_usage(uuid) to authenticated;

revoke all on function public.my_fal_usage() from public, anon;
grant execute on function public.my_fal_usage() to authenticated;

revoke all on function public.my_openrouter_usage() from public, anon;
grant execute on function public.my_openrouter_usage() to authenticated;

revoke all on function public.my_outscraper_usage() from public, anon;
grant execute on function public.my_outscraper_usage() to authenticated;

revoke all on function public.my_meshy_spend() from public, anon;
grant execute on function public.my_meshy_spend() to authenticated;

revoke all on function public.my_submission_spend() from public, anon;
grant execute on function public.my_submission_spend() to authenticated;

revoke all on function public.my_vault_spend() from public, anon;
grant execute on function public.my_vault_spend() to authenticated;

revoke all on function public.my_newgameplus_spend() from public, anon;
grant execute on function public.my_newgameplus_spend() to authenticated;

revoke all on function public.claim_daily_bonus() from public, anon;
grant execute on function public.claim_daily_bonus() to authenticated;

revoke all on function public.claim_alpha_tester_bonus() from public, anon;
grant execute on function public.claim_alpha_tester_bonus() to authenticated;

revoke all on function public.apply_referral(text) from public, anon;
grant execute on function public.apply_referral(text) to authenticated;

revoke all on function public.get_or_create_referral_code() from public, anon;
grant execute on function public.get_or_create_referral_code() to authenticated;

revoke all on function public.subscribe_to_tier(uuid) from public, anon;
grant execute on function public.subscribe_to_tier(uuid) to authenticated;

revoke all on function public.cancel_subscription(uuid) from public, anon;
grant execute on function public.cancel_subscription(uuid) to authenticated;

revoke all on function public.tip_creator(uuid, uuid, numeric) from public, anon;
grant execute on function public.tip_creator(uuid, uuid, numeric) to authenticated;

revoke all on function public.contribute_launch_campaign(uuid, numeric) from public, anon;
grant execute on function public.contribute_launch_campaign(uuid, numeric) to authenticated;

revoke all on function public.close_launch_campaign(uuid, text) from public, anon;
grant execute on function public.close_launch_campaign(uuid, text) to authenticated;

revoke all on function public.launch_campaign_progress(uuid) from public, anon;
grant execute on function public.launch_campaign_progress(uuid) to authenticated;

revoke all on function public.create_launch_campaign(uuid, text, text, numeric, text, text, timestamptz) from public, anon;
grant execute on function public.create_launch_campaign(uuid, text, text, numeric, text, text, timestamptz) to authenticated;

revoke all on function public.purchase_cosmetic_item(text, text, numeric) from public, anon;
grant execute on function public.purchase_cosmetic_item(text, text, numeric) to authenticated;

revoke all on function public.process_easydnc_batch_payment(uuid, integer, text, boolean, uuid) from public, anon;
grant execute on function public.process_easydnc_batch_payment(uuid, integer, text, boolean, uuid) to authenticated;

revoke all on function public.charge_dev_action(text, text, numeric, text, text, text, text) from public, anon;
grant execute on function public.charge_dev_action(text, text, numeric, text, text, text, text) to authenticated;

-- ---- Server-side-only: revoke authenticated as well (service_role kept) --
revoke all on function public.apply_coin_lot_to_ledger() from public, anon, authenticated;

revoke all on function public.meter_submission_charge_for(uuid, uuid, text, numeric, numeric) from public, anon, authenticated;

revoke all on function public.meter_usage(uuid, integer) from public, anon, authenticated;

revoke all on function public.record_platform_cut(text, numeric, numeric, text, uuid) from public, anon, authenticated;

revoke all on function public.get_my_crown_converts() from public, anon, authenticated;

revoke all on function public.get_my_eligible_crown_lots() from public, anon, authenticated;

revoke all on function public.my_vcw_usage() from public, anon, authenticated;

revoke all on function public.convert_crown_to_coins(numeric) from public, anon, authenticated;

revoke all on function public.request_crown_payout(numeric) from public, anon, authenticated;
