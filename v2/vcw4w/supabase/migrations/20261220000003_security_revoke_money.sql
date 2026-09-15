-- ============================================================================
-- DS-SECWARN-04: revoke money-write RPCs (infra lane, secwarn-04).
--
-- REVOKE-ONLY hardening. This file NEVER alters function bodies, amounts,
-- splits, or ledger pairing: no CREATE, no OR REPLACE, no tables/policies/
-- triggers/indexes. Plain REVOKE/GRANT statements are idempotent (revoking
-- an absent privilege is a WARNING, not an error; granting an existing one
-- is a no-op), so the file is rerunnable. Follows the timer_ownership
-- pattern (20261113000000_timer_ownership_hardening.sql) and the sibling
-- sqlint/seclint revoke files (20261219000006_sqlint_revoke_ledger_meter.sql,
-- 20261219000008_seclint_auth_money.sql): restating an already-present
-- revoke is a harmless no-op kept so every envelope signature carries a
-- REVOKE line in exactly one auditable place.
--
-- Classification (verified 2026-09-15 by grepping migrations for existing
-- identical revokes AND grepping app/lib/components/programs/scripts for
-- .rpc("name") / .rpc('name') client calls; user-JWT callers use the
-- user-scoped createClient() from lib/supabase/server.ts, which is the
-- anon key + user cookies, i.e. the `authenticated` role):
--
-- KEEP authenticated (revoke public + anon only, re-grant authenticated so
-- the user-session call path stays intact). Each of these has at least one
-- legit supabase.rpc() call from an app/api route via createClient():
--   meter_meshy_usage (meshy/generate), meter_submission_charge base
--   (code/[id]/audit, code/zip), meter_vault_storage (vault/blobs/[id]),
--   meter_fal_usage (fal/generate), meter_game_ai_usage (game-ai/meter,
--   buddy/*, swarm chat), meter_newgameplus_build (newgameplus/build),
--   meter_openrouter_usage (openrouter-vendor/generate),
--   meter_outscraper_usage (outscraper/search), meter_vcw_usage (vcw/*),
--   meter_clan_posting_fee (clans/*/post, comment, channels),
--   charge_dev_action (dev-charges), process_easydnc_batch_payment
--   (easydnc/check, crm scrub-dnc), refund_coin_lot (coins/refund),
--   refund_vendor_usage (openrouter-vendor, outscraper),
--   claim_daily_bonus (coins/daily), claim_alpha_tester_bonus (coins/alpha),
--   apply_referral (referrals), fund_clan_wallet + donate_clan_upkeep
--   (clans/[slug]/economy), fund_kid_wallet (family/fund),
--   tip_creator (support/tip), contribute_launch_campaign
--   (fundraisers/[id]/contribute), accrue_clan_minute_upkeep
--   (clans/[slug]), credit_clan_channel_revenue (clans/[slug]/economy),
--   award_clan_xp (clans post/comment), award_love_letter (love/award),
--   give_love_letter (love/give), settle_booking_escrow + end_booking
--   (agents/bookings/[id]/end), purchase_cosmetic_item (cosmetics/buy),
--   subscribe_to_tier (support/subscribe), create_listing (agents),
--   book_listing (agents/[id]/book), heartbeat_usage
--   (agents/bookings/[id]/heartbeat), set_creator_monetization
--   (code/[id]/monetization).
--   service_role is untouched throughout (revokes are per-role).
--
-- SERVER-SIDE-ONLY (revoke public, anon AND authenticated; service_role and
-- the function owner keep execute):
--   apply_coin_lot_to_ledger() -- trigger function only (FOR EACH ROW on
--     coin_lots/coin_ledger), never an RPC target; zero .rpc hits.
--   meter_submission_charge(uuid,uuid,text,numeric,numeric) -- 5-arg overload
--     is ABSENT from this fleet (it ships as meter_submission_charge_for);
--     guarded DO block below so the file cannot 42883-fail.
--   meter_usage(uuid,integer) -- zero .rpc hits (comment-only mention).
--   charge_mmo_minutes(uuid,uuid,timestamptz,integer) -- zero .rpc hits.
--     NOTE: body raises unless auth.uid() is set, so IF mmo host-billing
--     ever wires it via a user session, authenticated must be re-granted
--     (queued for steward/economy).
--   record_platform_cut(text,numeric,numeric,text,uuid) -- serviceClient()
--     only (budgets/heal-meter settle).
--   convert_crown_to_coins(numeric), request_crown_payout(numeric) --
--     zero .rpc hits; payout-adjacent, must not be user-reachable.
--   fund_org_wallet(uuid,integer), accrue_clan_upkeep(uuid) -- zero .rpc
--     hits (only accrue_clan_minute_upkeep is app-called).
-- ============================================================================

-- ---- Server-side-only money writes: full revoke ---------------------------
revoke all on function public.apply_coin_lot_to_ledger() from public, anon, authenticated;
revoke all on function public.meter_usage(uuid, integer) from public, anon, authenticated;
revoke all on function public.charge_mmo_minutes(uuid, uuid, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.record_platform_cut(text, numeric, numeric, text, uuid) from public, anon, authenticated;
revoke all on function public.convert_crown_to_coins(numeric) from public, anon, authenticated;
revoke all on function public.request_crown_payout(numeric) from public, anon, authenticated;
revoke all on function public.fund_org_wallet(uuid, integer) from public, anon, authenticated;
revoke all on function public.accrue_clan_upkeep(uuid) from public, anon, authenticated;

-- Envelope-literal 5-arg overload: only applied where that exact overload
-- exists (this fleet holds it as meter_submission_charge_for; same guard
-- shape as 20261219000006_seclint_anon_reads.sql:195-210).
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'meter_submission_charge'
      and pg_get_function_identity_arguments(p.oid) = 'uuid, uuid, text, numeric, numeric'
  ) then
    revoke all on function public.meter_submission_charge(uuid, uuid, text, numeric, numeric) from public, anon, authenticated;
  end if;
end
$$;

-- ---- App-called meters: revoke anon, keep authenticated -------------------
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
revoke all on function public.meter_clan_posting_fee(uuid, text, integer, boolean) from public, anon;
grant execute on function public.meter_clan_posting_fee(uuid, text, integer, boolean) to authenticated;

-- ---- App-called charges/refunds/cuts: revoke anon, keep authenticated -----
revoke all on function public.charge_dev_action(text, text, numeric, text, text, text, text) from public, anon;
grant execute on function public.charge_dev_action(text, text, numeric, text, text, text, text) to authenticated;
revoke all on function public.process_easydnc_batch_payment(uuid, integer, text, boolean, uuid) from public, anon;
grant execute on function public.process_easydnc_batch_payment(uuid, integer, text, boolean, uuid) to authenticated;
revoke all on function public.refund_coin_lot(uuid, numeric) from public, anon;
grant execute on function public.refund_coin_lot(uuid, numeric) to authenticated;
revoke all on function public.refund_vendor_usage(text, uuid) from public, anon;
grant execute on function public.refund_vendor_usage(text, uuid) to authenticated;

-- ---- App-called user money actions: revoke anon, keep authenticated -------
revoke all on function public.claim_daily_bonus() from public, anon;
grant execute on function public.claim_daily_bonus() to authenticated;
revoke all on function public.claim_alpha_tester_bonus() from public, anon;
grant execute on function public.claim_alpha_tester_bonus() to authenticated;
revoke all on function public.apply_referral(text) from public, anon;
grant execute on function public.apply_referral(text) to authenticated;
revoke all on function public.fund_clan_wallet(uuid, numeric) from public, anon;
grant execute on function public.fund_clan_wallet(uuid, numeric) to authenticated;
revoke all on function public.fund_kid_wallet(uuid, numeric) from public, anon;
grant execute on function public.fund_kid_wallet(uuid, numeric) to authenticated;
revoke all on function public.tip_creator(uuid, uuid, numeric) from public, anon;
grant execute on function public.tip_creator(uuid, uuid, numeric) to authenticated;
revoke all on function public.contribute_launch_campaign(uuid, numeric) from public, anon;
grant execute on function public.contribute_launch_campaign(uuid, numeric) to authenticated;
revoke all on function public.donate_clan_upkeep(uuid, numeric) from public, anon;
grant execute on function public.donate_clan_upkeep(uuid, numeric) to authenticated;
revoke all on function public.accrue_clan_minute_upkeep(uuid) from public, anon;
grant execute on function public.accrue_clan_minute_upkeep(uuid) to authenticated;
revoke all on function public.credit_clan_channel_revenue(uuid, text) from public, anon;
grant execute on function public.credit_clan_channel_revenue(uuid, text) to authenticated;
revoke all on function public.award_clan_xp(uuid, text, integer) from public, anon;
grant execute on function public.award_clan_xp(uuid, text, integer) to authenticated;
revoke all on function public.award_love_letter(uuid, text) from public, anon;
grant execute on function public.award_love_letter(uuid, text) to authenticated;
revoke all on function public.give_love_letter(uuid) from public, anon;
grant execute on function public.give_love_letter(uuid) to authenticated;
revoke all on function public.settle_booking_escrow(uuid) from public, anon;
grant execute on function public.settle_booking_escrow(uuid) to authenticated;
revoke all on function public.purchase_cosmetic_item(text, text, numeric) from public, anon;
grant execute on function public.purchase_cosmetic_item(text, text, numeric) to authenticated;
revoke all on function public.subscribe_to_tier(uuid) from public, anon;
grant execute on function public.subscribe_to_tier(uuid) to authenticated;
revoke all on function public.create_listing(text, text, text, text, integer) from public, anon;
grant execute on function public.create_listing(text, text, text, text, integer) to authenticated;
revoke all on function public.book_listing(uuid, integer) from public, anon;
grant execute on function public.book_listing(uuid, integer) to authenticated;
revoke all on function public.end_booking(uuid) from public, anon;
grant execute on function public.end_booking(uuid) to authenticated;
revoke all on function public.heartbeat_usage(uuid, integer) from public, anon;
grant execute on function public.heartbeat_usage(uuid, integer) to authenticated;
revoke all on function public.set_creator_monetization(uuid, boolean) from public, anon;
grant execute on function public.set_creator_monetization(uuid, boolean) to authenticated;
