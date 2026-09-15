-- secfix_02_coins_economy.sql — slice 02: harden coins/economy/metering RPCs.
--
-- ENVELOPE NOTE: filed DS-SECLINT-02 asks for a pgcrypto move
--   (20261219000002_seclint_pgcrypto.sql), but the user brief for this slice orders
--   coins/economy hardening into this _secfix file instead. Filed goal NOT done
--   here; discrepancy logged on the envelope. This file touches ONLY grants/search_path.
--
-- METHOD per function: grepped supabase/migrations for the CREATE FUNCTION definition
--   (exact arg list, SECURITY DEFINER + SET search_path, existing REVOKE/GRANT lines);
--   grepped v2/vcw4w/{app,lib,components} for `.rpc("name"` callers for anon analysis.
--   FINDING: every target's LATEST definition already carries
--   `security definer set search_path = public` inline, and every prior migration
--   already revokes PUBLIC/anon and grants authenticated. The ALTERs below are
--   idempotent restatements (belt-and-braces; self-heal if any env missed a migration).
--   No anon callers found repo-wide: all app callers are session-authenticated API
--   routes (user JWT -> authenticated role); `*_for` twins are service_role-only
--   (svc/db rpc). Bodies `raise 'login required'` on auth.uid() NULL (or are
--   trigger-only), so anon EXECUTE is dead privilege everywhere below.
--
-- HARD RULES honored: never REVOKE from authenticated (revokes are FROM PUBLIC, anon
--   only); anon revoked only with the evidence cited per function; no old migration
--   edited; no app code; every statement idempotent -> rerunnable.
--
-- DECISION TABLE (sig | latest def | prior grants | app caller | verdict):
--   apply_coin_lot_to_ledger() | refunds:72 trigger secdefiner search_path=public,
--     NO prior revoke (trigger-only) | none (trigger trg_coin_ledger_lots fires as
--     owner) | REVOKE anon, NO grant change (also owned by slice 03)
--   convert_crown_to_coins(numeric) | crowns:478 secdefiner search_path=public, prior
--     revoke+grant auth | no .rpc found (crowns UI path; body login-gated) |
--     REVOKE anon + re-GRANT auth (no widening)
--   refund_coin_lot(uuid,numeric) | refund_floor:58 secdefiner search_path=public,
--     prior revoke+grant | coins/refund/route.ts:72 (auth) | REVOKE + re-GRANT
--   claim_daily_bonus() | race_fix:12 returns table, secdefiner search_path=public,
--     prior revoke+grant | coins/daily/route.ts:41 (auth) | REVOKE + re-GRANT
--   claim_alpha_tester_bonus() | alpha_cap:5 secdefiner search_path=public, prior
--     revoke+grant | coins/alpha/route.ts:22 (auth) | REVOKE + re-GRANT
--   get_my_coin_balance() | fifo:99 sql secdefiner search_path=public, prior
--     revoke+grant | 12+ authed routes (coins/balance:14, buddy, fal, meshy...) |
--     REVOKE + re-GRANT
--   get_my_coin_refunds() | refunds:219 sql secdefiner search_path=public, prior
--     revoke+grant | coins/refunds/route.ts:18 (auth) | REVOKE + re-GRANT
--   get_my_crown_balances() | crowns:135 secdefiner search_path=public, login-gated,
--     prior revoke+grant | crowns/balance/route.ts:19 (auth) | REVOKE + re-GRANT
--   get_my_crown_converts() | crowns:519 sql secdefiner search_path=public, prior
--     revoke+grant | no .rpc found (crowns UI path; auth.uid-scoped) | REVOKE + re-GRANT
--   get_my_eligible_crown_lots() | crowns:160 sql secdefiner search_path=public,
--     prior revoke+grant | no .rpc found (auth.uid-scoped read) | REVOKE + re-GRANT
--   get_my_refundable_lots() | refund_floor:11 secdefiner search_path=public, prior
--     revoke+grant | coins/refunds/route.ts:17 (auth) | REVOKE + re-GRANT
--   get_or_create_referral_code() | daily:56 secdefiner search_path=public, prior
--     revoke+grant | referrals/route.ts:21 (auth) | REVOKE + re-GRANT
--   apply_referral(text) | daily:74 secdefiner search_path=public, prior revoke+grant |
--     referrals/route.ts:70 (auth) | REVOKE + re-GRANT
--   fund_kid_wallet(uuid,numeric) | pairing:267 secdefiner search_path=public, prior
--     revoke+grant | family/fund/route.ts:39 (auth) | REVOKE + re-GRANT
--   fund_clan_wallet(uuid,numeric) | audit_fixes:403 secdefiner search_path=public,
--     prior revoke+grant | clans/[slug]/economy/route.ts:138 (auth) | REVOKE + re-GRANT
--   fund_org_wallet(uuid,integer) | bundle:1072 secdefiner search_path=public, prior
--     revoke+grant auth | no .rpc found (lib/cloud-catalog.ts:11 documents user flow;
--     sibling 20261219000003_sqlint_revoke_org_team.sql:58 revoked auth with no grant
--     -> this slice RESTORES authenticated per HARD RULES) | REVOKE anon + GRANT auth
--   meter_fal_usage(text,text,numeric,text) | fal_30:18 secdefiner search_path=public
--     (p_source default), prior revoke+grant | fal/generate/route.ts:115 (auth) |
--     REVOKE + re-GRANT
--   meter_meshy_usage(text,numeric,uuid) | zip:314 secdefiner search_path=public,
--     prior grant auth | meshy/generate/route.ts:143 (auth; :132 svc _for twin) |
--     REVOKE + re-GRANT
--   meter_openrouter_usage(text,text,text,numeric,text) | vendor_refunds:37 secdefiner
--     search_path=public, prior revoke+grant | openrouter-vendor/generate:291 (auth) |
--     REVOKE + re-GRANT
--   meter_outscraper_usage(text,text,text,numeric,text,text) | vendor_refunds:168
--     secdefiner search_path=public, prior revoke+grant | outscraper/search:287 (auth;
--     :180 refund_vendor_usage) | REVOKE + re-GRANT
--   meter_submission_charge(uuid,text,numeric,numeric) | zip:250 secdefiner
--     search_path=public, prior grant auth | code/zip:159 + code/audit:75 (auth; svc
--     _for twins at :150/:66) | REVOKE + GRANT auth
--   meter_submission_charge_for(uuid,uuid,text,numeric,numeric) | zip:305 secdefiner
--     search_path=public, prior revoke incl. authenticated (service-only twin) |
--     svc-only callers | REVOKE anon, NO grant (stay service-only)
--   meter_vault_storage(uuid,numeric,numeric) | vault_cents:30 secdefiner
--     search_path=public, prior grant auth | vault/blobs:334 (auth; svc _for at :326) |
--     REVOKE + GRANT auth
--   meter_vcw_usage(text,numeric,uuid,text) | byok:147 secdefiner search_path=public,
--     prior revoke+grant | 10+ authed vcw routes (runs, actions, handoff...) |
--     REVOKE + re-GRANT
--   meter_game_ai_usage(text,text,numeric,uuid,text) | presence_restore:12 secdefiner
--     search_path=public (defaults on p_session/p_source), prior revoke+grant |
--     buddy/chat+tts, game-ai/meter, swarm chat (all auth) | REVOKE + re-GRANT
--   meter_newgameplus_build(uuid,text,text,integer,integer,numeric,text) | ngp:47
--     secdefiner search_path=public, prior revoke+grant | newgameplus/build:279 (auth) |
--     REVOKE + re-GRANT
--   record_platform_cut(text,numeric,numeric,text,uuid) | pairing:75 secdefiner
--     search_path=public, prior revoke + grant auth,service_role | budgets/heal-meter
--     db.rpc (server-side) | REVOKE + re-GRANT auth,service_role
--   refund_vendor_usage(text,uuid) | vendor_refunds:283 secdefiner search_path=public,
--     prior revoke+grant | openrouter-vendor:180 + outscraper:180 (auth) | REVOKE + re-GRANT
--   request_crown_payout(numeric) | crowns:185 secdefiner search_path=public,
--     login-gated, prior revoke+grant | no .rpc found (crowns UI path) | REVOKE + re-GRANT
--   charge_dev_action(text,text,numeric,text,text,text,text) | sec_econ:86 secdefiner
--     search_path=public, prior revoke+grant | dev-charges/route.ts:109 (auth) |
--     REVOKE + re-GRANT
--   my_fal_usage() | fal_compute:147 secdefiner search_path=public, prior revoke+grant |
--     my/usage/route.ts:344 (auth) | REVOKE + re-GRANT
--   my_meshy_spend() | zip:430 secdefiner search_path=public, prior grant auth |
--     my/usage/route.ts:384 spendRollup (auth) | REVOKE + GRANT auth
--   my_submission_spend() | zip:418 secdefiner search_path=public, prior grant auth |
--     my/usage/route.ts:383 (auth) | REVOKE + GRANT auth
--   my_vault_spend() | zip:442 secdefiner search_path=public, prior grant auth |
--     my/usage/route.ts:385 (auth) | REVOKE + GRANT auth
--   my_openrouter_usage() | vendor_refunds:335 secdefiner search_path=public, prior
--     revoke+grant | openrouter-vendor/usage/route.ts:26 (auth) | REVOKE + re-GRANT
--   my_outscraper_usage() | vendor_refunds:392 secdefiner search_path=public, prior
--     revoke+grant | outscraper/usage/route.ts:26 (auth) | REVOKE + re-GRANT
--   my_newgameplus_spend() | ngp:118 secdefiner search_path=public, prior revoke+grant |
--     my/usage/route.ts:386 (auth) | REVOKE + re-GRANT
--   my_vcw_usage() | byok:228 secdefiner search_path=public, prior revoke+grant |
--     vcw/gateway/usage path (auth) | REVOKE + re-GRANT
--   my_game_play_usage() | ngp:330 secdefiner search_path=public, prior revoke+grant |
--     my/usage/route.ts:242 (auth) | REVOKE + re-GRANT
--
-- SKIPS (owned by sibling slices, NOT hardened here):
--   - meter_meshy_usage_for, meter_vault_storage_for, meter_vcw_usage_for,
--     meter_newgameplus_build_for, meter_openrouter_usage_for, _meter_submission_for,
--     clawback_crown, mint_crown, accrue_*, donate_clan_upkeep, tip_*, subscribe_*,
--     purchase_cosmetic_item -> sibling slices (DS-SECLINT-08 / service-only twins).
--   - my_compute_usage, my_clan_usage, my_team_perms, leaderboard_top (anon-granted
--     public read by design) -> out of slice scope.
--
-- NEEDS-HUMAN (advisory, NOT blockers — anon revoke applied on stated evidence):
--   1. fund_org_wallet: sibling 20261219000003_sqlint_revoke_org_team.sql:58 revoked
--      EXECUTE from authenticated with no grant; this slice restores GRANT to
--      authenticated (owning migration granted it; lib/cloud-catalog.ts:11 documents
--      the user funding flow). Human: reconcile the two slices, keep ONE verdict.
--   2. convert_crown_to_coins / request_crown_payout / get_my_crown_converts /
--      get_my_eligible_crown_lots: no `.rpc("` caller found in app (crowns UI likely
--      calls via server client under different naming or a pending page). Anon revoke
--      is safe (bodies raise 'login required' / scope to auth.uid(); zero anon
--      callers repo-wide), but human: confirm the crowns UI path still works post-apply.
--   3. apply_coin_lot_to_ledger: also claimed by DS-SECLINT-03 (trigger/internal).
--      This slice only revokes anon (no grant change); keep ONE owner for its grants.

-- ================= ledger trigger (no grant change: fires as owner) =================
-- EVIDENCE: def 20261012000000_coin_refunds.sql:72 trigger, secdefiner
--   search_path=public; caller = trigger trg_coin_ledger_lots only, runs as owner.
alter function public.apply_coin_lot_to_ledger() set search_path = public;
revoke all on function public.apply_coin_lot_to_ledger() from public, anon;

-- ================= coins: converts / refunds =================
-- EVIDENCE: def 20261019000000_crowns_earn_ledger.sql:478 secdefiner
--   search_path=public, login-gated; prior revoke+grant auth (:516-517); no anon caller.
alter function public.convert_crown_to_coins(numeric) set search_path = public;
revoke all on function public.convert_crown_to_coins(numeric) from public, anon;
grant execute on function public.convert_crown_to_coins(numeric) to authenticated;

-- EVIDENCE: def 20261025000007_refund_floor_cents.sql:58 secdefiner
--   search_path=public; prior revoke+grant (:116-117); caller
--   app/api/coins/refund/route.ts:72 (session-authenticated).
alter function public.refund_coin_lot(uuid, numeric) set search_path = public;
revoke all on function public.refund_coin_lot(uuid, numeric) from public, anon;
grant execute on function public.refund_coin_lot(uuid, numeric) to authenticated;

-- ================= coins: bonuses / balance / referrals =================
-- EVIDENCE: def 20261025000000_daily_bonus_race_fix.sql:12 secdefiner
--   search_path=public; prior revoke+grant (:38-39); caller
--   app/api/coins/daily/route.ts:41 (session-authenticated).
alter function public.claim_daily_bonus() set search_path = public;
revoke all on function public.claim_daily_bonus() from public, anon;
grant execute on function public.claim_daily_bonus() to authenticated;

-- EVIDENCE: def 20260925000000_alpha_cap_and_amount.sql:5 secdefiner
--   search_path=public, advisory-locked pool; prior revoke+grant (:27-28); caller
--   app/api/coins/alpha/route.ts:22 (session-authenticated).
alter function public.claim_alpha_tester_bonus() set search_path = public;
revoke all on function public.claim_alpha_tester_bonus() from public, anon;
grant execute on function public.claim_alpha_tester_bonus() to authenticated;

-- EVIDENCE: def 20260911000000_coin_expiry_fifo_and_budgets.sql:99 sql secdefiner
--   search_path=public; prior revoke+grant (:104-105); 12+ authed callers incl.
--   app/api/coins/balance/route.ts:14.
alter function public.get_my_coin_balance() set search_path = public;
revoke all on function public.get_my_coin_balance() from public, anon;
grant execute on function public.get_my_coin_balance() to authenticated;

-- EVIDENCE: def 20261012000000_coin_refunds.sql:219 sql secdefiner
--   search_path=public; prior revoke+grant (:240-241); caller
--   app/api/coins/refunds/route.ts:18 (session-authenticated).
alter function public.get_my_coin_refunds() set search_path = public;
revoke all on function public.get_my_coin_refunds() from public, anon;
grant execute on function public.get_my_coin_refunds() to authenticated;

-- EVIDENCE: def 20261019000000_crowns_earn_ledger.sql:135 secdefiner
--   search_path=public, login-gated; prior revoke+grant (:157-158); caller
--   app/api/crowns/balance/route.ts:19 (session-authenticated).
alter function public.get_my_crown_balances() set search_path = public;
revoke all on function public.get_my_crown_balances() from public, anon;
grant execute on function public.get_my_crown_balances() to authenticated;

-- EVIDENCE: def 20261019000000_crowns_earn_ledger.sql:519 sql secdefiner
--   search_path=public; prior revoke+grant (:525-526); auth.uid-scoped read, no anon caller.
alter function public.get_my_crown_converts() set search_path = public;
revoke all on function public.get_my_crown_converts() from public, anon;
grant execute on function public.get_my_crown_converts() to authenticated;

-- EVIDENCE: def 20261019000000_crowns_earn_ledger.sql:160 sql secdefiner
--   search_path=public; prior revoke+grant (:167-168); auth.uid-scoped read, no anon caller.
alter function public.get_my_eligible_crown_lots() set search_path = public;
revoke all on function public.get_my_eligible_crown_lots() from public, anon;
grant execute on function public.get_my_eligible_crown_lots() to authenticated;

-- EVIDENCE: def 20261025000007_refund_floor_cents.sql:11 secdefiner
--   search_path=public; prior revoke+grant (:55-56); caller
--   app/api/coins/refunds/route.ts:17 (session-authenticated).
alter function public.get_my_refundable_lots() set search_path = public;
revoke all on function public.get_my_refundable_lots() from public, anon;
grant execute on function public.get_my_refundable_lots() to authenticated;

-- EVIDENCE: def 20260910070000_daily_and_referrals.sql:56 secdefiner
--   search_path=public, login-gated; prior revoke+grant (:71-72); caller
--   app/api/referrals/route.ts:21 (session-authenticated).
alter function public.get_or_create_referral_code() set search_path = public;
revoke all on function public.get_or_create_referral_code() from public, anon;
grant execute on function public.get_or_create_referral_code() to authenticated;

-- EVIDENCE: def 20260910070000_daily_and_referrals.sql:74 secdefiner
--   search_path=public, login+format-gated; prior revoke+grant (:89-90); caller
--   app/api/referrals/route.ts:70 (session-authenticated).
alter function public.apply_referral(text) set search_path = public;
revoke all on function public.apply_referral(text) from public, anon;
grant execute on function public.apply_referral(text) to authenticated;

-- ================= wallets =================
-- EVIDENCE: def 20261018000000_ledger_pairing_hardening.sql:267 secdefiner
--   search_path=public, login+parent-gated; prior revoke+grant (:285-286); caller
--   app/api/family/fund/route.ts:39 (session-authenticated).
alter function public.fund_kid_wallet(uuid, numeric) set search_path = public;
revoke all on function public.fund_kid_wallet(uuid, numeric) from public, anon;
grant execute on function public.fund_kid_wallet(uuid, numeric) to authenticated;

-- EVIDENCE: def 20261207000000_security_audit_fixes.sql:403 secdefiner
--   search_path=public, login+owner-gated; prior revoke+grant (:452-453); caller
--   app/api/clans/[slug]/economy/route.ts:138 (session-authenticated).
alter function public.fund_clan_wallet(uuid, numeric) set search_path = public;
revoke all on function public.fund_clan_wallet(uuid, numeric) from public, anon;
grant execute on function public.fund_clan_wallet(uuid, numeric) to authenticated;

-- EVIDENCE: def 20260910130000_teams_enterprise_bundle.sql:1072 secdefiner
--   search_path=public, login+perm-gated; owning migration granted authenticated
--   (:1090-1091); flow documented lib/cloud-catalog.ts:11. Restores authenticated
--   grant (see NEEDS-HUMAN 1: sibling sqlint file revoked it).
alter function public.fund_org_wallet(uuid, integer) set search_path = public;
revoke all on function public.fund_org_wallet(uuid, integer) from public, anon;
grant execute on function public.fund_org_wallet(uuid, integer) to authenticated;

-- ================= metering =================
-- EVIDENCE: def 20260924000000_fal_30_ops.sql:18 secdefiner search_path=public,
--   login-gated; prior revoke+grant (:129-130); caller
--   app/api/fal/generate/route.ts:115 (session-authenticated).
alter function public.meter_fal_usage(text, text, numeric, text) set search_path = public;
revoke all on function public.meter_fal_usage(text, text, numeric, text) from public, anon;
grant execute on function public.meter_fal_usage(text, text, numeric, text) to authenticated;

-- EVIDENCE: def 20261013000000_zip_vault_meshy.sql:314 secdefiner
--   search_path=public, login-gated; prior grant auth (:340); caller
--   app/api/meshy/generate/route.ts:143 (session-authenticated).
alter function public.meter_meshy_usage(text, numeric, uuid) set search_path = public;
revoke all on function public.meter_meshy_usage(text, numeric, uuid) from public, anon;
grant execute on function public.meter_meshy_usage(text, numeric, uuid) to authenticated;

-- EVIDENCE: def 20261202000000_vendor_usage_refunds.sql:37 secdefiner
--   search_path=public; prior revoke+grant (:162-163); caller
--   app/api/openrouter-vendor/generate/route.ts:291 (session-authenticated).
alter function public.meter_openrouter_usage(text, text, text, numeric, text) set search_path = public;
revoke all on function public.meter_openrouter_usage(text, text, text, numeric, text) from public, anon;
grant execute on function public.meter_openrouter_usage(text, text, text, numeric, text) to authenticated;

-- EVIDENCE: def 20261202000000_vendor_usage_refunds.sql:168 secdefiner
--   search_path=public; prior revoke+grant (:274-275); caller
--   app/api/outscraper/search/route.ts:287 (session-authenticated).
alter function public.meter_outscraper_usage(text, text, text, numeric, text, text) set search_path = public;
revoke all on function public.meter_outscraper_usage(text, text, text, numeric, text, text) from public, anon;
grant execute on function public.meter_outscraper_usage(text, text, text, numeric, text, text) to authenticated;

-- EVIDENCE: def 20261013000000_zip_vault_meshy.sql:250 secdefiner
--   search_path=public, login-gated; prior grant auth (:274); callers
--   app/api/code/zip/route.ts:159 + code/[id]/audit/route.ts:75 (session-authenticated).
alter function public.meter_submission_charge(uuid, text, numeric, numeric) set search_path = public;
revoke all on function public.meter_submission_charge(uuid, text, numeric, numeric) from public, anon;
grant execute on function public.meter_submission_charge(uuid, text, numeric, numeric) to authenticated;

-- EVIDENCE: def 20261013000000_zip_vault_meshy.sql:305 service-only `_for' twin,
--   secdefiner search_path=public; prior revoke incl. authenticated (:312); callers are
--   svc-key only (code/zip:150, code/audit:66). Stays service-only: NO grant.
alter function public.meter_submission_charge_for(uuid, uuid, text, numeric, numeric) set search_path = public;
revoke all on function public.meter_submission_charge_for(uuid, uuid, text, numeric, numeric) from public, anon;

-- EVIDENCE: def 20261205000001_vault_meter_cents.sql:30 secdefiner
--   search_path=public, login-gated; prior grant auth (:83); caller
--   app/api/vault/blobs/[id]/route.ts:334 (session-authenticated; svc _for at :326).
alter function public.meter_vault_storage(uuid, numeric, numeric) set search_path = public;
revoke all on function public.meter_vault_storage(uuid, numeric, numeric) from public, anon;
grant execute on function public.meter_vault_storage(uuid, numeric, numeric) to authenticated;

-- EVIDENCE: def 20261020000000_vcw_gateway_byok.sql:147 secdefiner
--   search_path=public; prior revoke+grant (:223-224); 10+ authed vcw callers
--   (runs, actions, handoff, autoplay...).
alter function public.meter_vcw_usage(text, numeric, uuid, text) set search_path = public;
revoke all on function public.meter_vcw_usage(text, numeric, uuid, text) from public, anon;
grant execute on function public.meter_vcw_usage(text, numeric, uuid, text) to authenticated;

-- EVIDENCE: def 20261025000002_buddy_presence_kinds_restore.sql:12 secdefiner
--   search_path=public, login-gated; prior revoke+grant (:81-82); callers buddy/chat,
--   buddy/tts, game-ai/meter, swarm chat (all session-authenticated).
alter function public.meter_game_ai_usage(text, text, numeric, uuid, text) set search_path = public;
revoke all on function public.meter_game_ai_usage(text, text, numeric, uuid, text) from public, anon;
grant execute on function public.meter_game_ai_usage(text, text, numeric, uuid, text) to authenticated;

-- EVIDENCE: def 20261022000000_newgameplus_metering.sql:47 secdefiner
--   search_path=public; prior revoke+grant (:79-80); caller
--   app/api/newgameplus/build/route.ts:279 (session-authenticated).
alter function public.meter_newgameplus_build(uuid, text, text, integer, integer, numeric, text) set search_path = public;
revoke all on function public.meter_newgameplus_build(uuid, text, text, integer, integer, numeric, text) from public, anon;
grant execute on function public.meter_newgameplus_build(uuid, text, text, integer, integer, numeric, text) to authenticated;

-- EVIDENCE: def 20261018000000_ledger_pairing_hardening.sql:75 secdefiner
--   search_path=public; prior revoke + grant auth,service_role (:88-89); caller
--   app/api/budgets/heal-meter/route.ts:200 db.rpc (server-side).
alter function public.record_platform_cut(text, numeric, numeric, text, uuid) set search_path = public;
revoke all on function public.record_platform_cut(text, numeric, numeric, text, uuid) from public, anon;
grant execute on function public.record_platform_cut(text, numeric, numeric, text, uuid) to authenticated, service_role;

-- EVIDENCE: def 20261202000000_vendor_usage_refunds.sql:283 secdefiner
--   search_path=public; prior revoke+grant (:329-330); callers
--   openrouter-vendor/generate:180 + outscraper/search:180 (session-authenticated).
alter function public.refund_vendor_usage(text, uuid) set search_path = public;
revoke all on function public.refund_vendor_usage(text, uuid) from public, anon;
grant execute on function public.refund_vendor_usage(text, uuid) to authenticated;

-- EVIDENCE: def 20261019000000_crowns_earn_ledger.sql:185 secdefiner
--   search_path=public, login-gated (min 5000); prior revoke+grant (:217-218);
--   no anon caller.
alter function public.request_crown_payout(numeric) set search_path = public;
revoke all on function public.request_crown_payout(numeric) from public, anon;
grant execute on function public.request_crown_payout(numeric) to authenticated;

-- EVIDENCE: def 20261116000004_sec_econ_hardening.sql:86 secdefiner
--   search_path=public; prior revoke+grant (:148-149); caller
--   app/api/dev-charges/route.ts:109 (session-authenticated).
alter function public.charge_dev_action(text, text, numeric, text, text, text, text) set search_path = public;
revoke all on function public.charge_dev_action(text, text, numeric, text, text, text, text) from public, anon;
grant execute on function public.charge_dev_action(text, text, numeric, text, text, text, text) to authenticated;

-- ================= my_* usage reads =================
-- EVIDENCE: def 20260920000000_fal_media_compute.sql:147 secdefiner
--   search_path=public; prior revoke+grant (:190-191); caller
--   app/api/my/usage/route.ts:344 (session-authenticated).
alter function public.my_fal_usage() set search_path = public;
revoke all on function public.my_fal_usage() from public, anon;
grant execute on function public.my_fal_usage() to authenticated;

-- EVIDENCE: def 20261013000000_zip_vault_meshy.sql:430 secdefiner
--   search_path=public, login-gated; prior grant auth (:440); caller
--   app/api/my/usage/route.ts:384 spendRollup (session-authenticated).
alter function public.my_meshy_spend() set search_path = public;
revoke all on function public.my_meshy_spend() from public, anon;
grant execute on function public.my_meshy_spend() to authenticated;

-- EVIDENCE: def 20261013000000_zip_vault_meshy.sql:418 secdefiner
--   search_path=public, login-gated; prior grant auth (:428); caller
--   app/api/my/usage/route.ts:383 (session-authenticated).
alter function public.my_submission_spend() set search_path = public;
revoke all on function public.my_submission_spend() from public, anon;
grant execute on function public.my_submission_spend() to authenticated;

-- EVIDENCE: def 20261013000000_zip_vault_meshy.sql:442 secdefiner
--   search_path=public, login-gated; prior grant auth (:452); caller
--   app/api/my/usage/route.ts:385 (session-authenticated).
alter function public.my_vault_spend() set search_path = public;
revoke all on function public.my_vault_spend() from public, anon;
grant execute on function public.my_vault_spend() to authenticated;

-- EVIDENCE: def 20261202000000_vendor_usage_refunds.sql:335 secdefiner
--   search_path=public; prior revoke+grant (:389-390); caller
--   app/api/openrouter-vendor/usage/route.ts:26 (session-authenticated).
alter function public.my_openrouter_usage() set search_path = public;
revoke all on function public.my_openrouter_usage() from public, anon;
grant execute on function public.my_openrouter_usage() to authenticated;

-- EVIDENCE: def 20261202000000_vendor_usage_refunds.sql:392 secdefiner
--   search_path=public; prior revoke+grant (:446-447); caller
--   app/api/outscraper/usage/route.ts:26 (session-authenticated).
alter function public.my_outscraper_usage() set search_path = public;
revoke all on function public.my_outscraper_usage() from public, anon;
grant execute on function public.my_outscraper_usage() to authenticated;

-- EVIDENCE: def 20261022000000_newgameplus_metering.sql:118 secdefiner
--   search_path=public, login-gated; prior revoke+grant (:128-129); caller
--   app/api/my/usage/route.ts:386 (session-authenticated).
alter function public.my_newgameplus_spend() set search_path = public;
revoke all on function public.my_newgameplus_spend() from public, anon;
grant execute on function public.my_newgameplus_spend() to authenticated;

-- EVIDENCE: def 20261020000000_vcw_gateway_byok.sql:228 secdefiner
--   search_path=public; prior revoke+grant (:262-263); vcw gateway usage path (auth).
alter function public.my_vcw_usage() set search_path = public;
revoke all on function public.my_vcw_usage() from public, anon;
grant execute on function public.my_vcw_usage() to authenticated;

-- EVIDENCE: def 20261022000000_newgameplus_metering.sql:330 secdefiner
--   search_path=public; prior revoke+grant (:391-392); caller
--   app/api/my/usage/route.ts:242 (session-authenticated).
alter function public.my_game_play_usage() set search_path = public;
revoke all on function public.my_game_play_usage() from public, anon;
grant execute on function public.my_game_play_usage() to authenticated;
