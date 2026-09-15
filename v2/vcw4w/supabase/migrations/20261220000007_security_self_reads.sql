-- ============================================================================
-- DS-SECWARN-08: self-read RPC audit + anon revoke.
--
-- VERSION NOTE: envelope scope named 20261219000007_security_self_reads.sql,
-- but on current disk versions 06/07/08 are ALL occupied by sibling-lane
-- working files (06: seclint_anon_reads + security_revoke_social +
-- sqlint_revoke_ledger_meter; 07: committed 20261219000007_sqlint_revoke_social
-- (DS-SQLINT-08) + seclint_auth_internal; 08: seclint_auth_money +
-- sqlint_revoke_booking_mmo). Landed as 20261219000009 (nearest free version;
-- applies AFTER 07 so these grants are the final word at push time).
-- REVOKE-only, rerunnable (all statements idempotent). No tables/policies/
-- triggers/indexes created here.
--
-- AUDIT METHOD: for each function below, the CREATE FUNCTION source was
-- re-read and checked for caller-identity scoping (auth.uid()). Per-function
-- verdicts + line evidence live in TASKS/DS-SECWARN-08.json log.
--   23/24 PASS (body scopes every row/write by auth.uid()) -> revoke anon,
--     keep authenticated (accepted-risk QUEUE lines filed per function).
--   1/24 FAILS: kid_wallet_balance(uuid)
--     (20260924000002_family_accounts.sql:152 body
--     `... where kid_id = p_kid`, zero auth.uid() refs in the function) ->
--     revoke authenticated TOO + QUEUE security flag (real bug: any login can
--     read any kid's balance). Server-side callers unaffected: SECURITY
--     DEFINER parents (fund_kid_wallet et al.) run as owner; service_role
--     re-granted here.
--
-- CONFLICT NOTE: 20261219000007_sqlint_revoke_social.sql revoked
-- authenticated on update_bot_key_policy(...) citing zero .rpc callers
-- (verified true on current disk: zero app/lib matches). DS-SECWARN-08
-- envelope lists it as keep-authenticated (body IS caller-scoped:
-- `where id = p_key_id and user_id = auth.uid()`). This file re-grants
-- authenticated per envelope; steward ruling requested in QUEUE (if sqlint
-- wins, revoke again in a later file).
-- ============================================================================

-- -- 1. get_my_* self-reads (6): revoke anon, keep authenticated. --------------
revoke all on function public.get_my_coin_balance() from public, anon;
grant execute on function public.get_my_coin_balance() to authenticated;

revoke all on function public.get_my_coin_refunds() from public, anon;
grant execute on function public.get_my_coin_refunds() to authenticated;

revoke all on function public.get_my_crown_balances() from public, anon;
grant execute on function public.get_my_crown_balances() to authenticated;

revoke all on function public.get_my_crown_converts() from public, anon;
grant execute on function public.get_my_crown_converts() to authenticated;

revoke all on function public.get_my_eligible_crown_lots() from public, anon;
grant execute on function public.get_my_eligible_crown_lots() to authenticated;

revoke all on function public.get_my_refundable_lots() from public, anon;
grant execute on function public.get_my_refundable_lots() to authenticated;

-- -- 2. my_* usage rollups (13): revoke anon, keep authenticated. --------------
revoke all on function public.my_clan_usage() from public, anon;
grant execute on function public.my_clan_usage() to authenticated;

revoke all on function public.my_compute_usage(uuid) from public, anon;
grant execute on function public.my_compute_usage(uuid) to authenticated;

revoke all on function public.my_fal_usage() from public, anon;
grant execute on function public.my_fal_usage() to authenticated;

revoke all on function public.my_friends() from public, anon;
grant execute on function public.my_friends() to authenticated;

revoke all on function public.my_game_play_usage() from public, anon;
grant execute on function public.my_game_play_usage() to authenticated;

revoke all on function public.my_meshy_spend() from public, anon;
grant execute on function public.my_meshy_spend() to authenticated;

revoke all on function public.my_newgameplus_spend() from public, anon;
grant execute on function public.my_newgameplus_spend() to authenticated;

revoke all on function public.my_openrouter_usage() from public, anon;
grant execute on function public.my_openrouter_usage() to authenticated;

revoke all on function public.my_outscraper_usage() from public, anon;
grant execute on function public.my_outscraper_usage() to authenticated;

revoke all on function public.my_submission_spend() from public, anon;
grant execute on function public.my_submission_spend() to authenticated;

revoke all on function public.my_team_perms(uuid) from public, anon;
grant execute on function public.my_team_perms(uuid) to authenticated;

revoke all on function public.my_vault_spend() from public, anon;
grant execute on function public.my_vault_spend() to authenticated;

revoke all on function public.my_vcw_usage() from public, anon;
grant execute on function public.my_vcw_usage() to authenticated;

-- -- 3. love_me + update_bot_key_policy + vocrehab pair: same pattern. --------
revoke all on function public.love_me() from public, anon;
grant execute on function public.love_me() to authenticated;

revoke all on function public.update_bot_key_policy(uuid, text, timestamptz, boolean, integer, numeric, numeric, integer, boolean, numeric, numeric, text, text[], text[], text[], text, integer, text) from public, anon;
grant execute on function public.update_bot_key_policy(uuid, text, timestamptz, boolean, integer, numeric, numeric, integer, boolean, numeric, numeric, text, text[], text[], text[], text, integer, text) to authenticated;

revoke all on function public.vocrehab_export_snapshot() from public, anon;
grant execute on function public.vocrehab_export_snapshot() to authenticated;

revoke all on function public.vocrehab_log_export(text, integer) from public, anon;
grant execute on function public.vocrehab_log_export(text, integer) to authenticated;

-- -- 4. REAL BUG: kid_wallet_balance(uuid) has NO auth.uid() scoping. ---------
-- Body (20260924000002_family_accounts.sql:152-156) selects by p_kid only,
-- so any authenticated caller could read ANY kid's balance. Revoke
-- authenticated too; keep service_role + SECURITY DEFINER internal callers.
-- App never rpc-calls it directly (verified: zero app/lib matches; only
-- server routes via fund_kid_wallet-style definer parents + service key).
revoke all on function public.kid_wallet_balance(uuid) from public, anon, authenticated;
grant execute on function public.kid_wallet_balance(uuid) to service_role;
