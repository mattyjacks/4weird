-- Linter fix: `*_security_definer_function_executable` WARNs, M–Q slice.
--
-- Closes anonymous EXECUTE on 59 SECURITY DEFINER functions whose names
-- start with M–Q (maintain_*, mark_channel_read, meter_*, mint_crown,
-- moderate_set_status, my_*, open_issue, org_*, party_* writes,
-- post_*, provision_service, prune_*, purchase_cosmetic_item,
-- purge_expired_bot_key_logs, push_file, quick_match). Every function
-- below either raises on null auth.uid() (verified in its defining
-- migration; full per-function table with file:line evidence lives in
-- the triage doc) or is already locked to service_role / nobody by a
-- prior seclint lane (restated here idempotently).
--
-- Anon-legit paths were checked and are NOT touched:
--   * party_feed(integer), party_search(text), party_resolve(text, text)
--     keep their explicit anon grants (public directory, by design).
--   * process_easydnc_batch_payment(...) is NOT revoked here: it needs a
--     body-level p_user_id = auth.uid() gate (owning lane), reported as
--     the lane's GENUINE-VULN finding.
--
-- Overlap note: most lines below restate revokes already shipped by
-- defining migrations or DS-SECLINT-07/08 lanes (e.g.
-- 20261219000008_seclint_auth_money.sql). REVOKE EXECUTE ... FROM anon
-- is idempotent, so restating is safe and makes this file the final
-- word for the M–Q slice at push time. Authenticated grants are never
-- touched here (no GRANT statements in this file).
--
-- Rerunnable: all statements idempotent. No tables, policies, triggers,
-- or indexes created here. Append-only: never edit once pushed.

revoke execute on function public.maintain_clan_comment_count() from anon;
revoke execute on function public.mark_channel_read(uuid) from anon;
revoke execute on function public.meter_clan_posting_fee(uuid, text, integer, boolean) from anon;
revoke execute on function public.meter_clan_posting_fee_for(uuid, uuid, text, integer, boolean) from anon;
revoke execute on function public.meter_fal_usage(text, text, numeric, text) from anon;
revoke execute on function public.meter_game_ai_usage(text, text, numeric, uuid, text) from anon;
revoke execute on function public.meter_meshy_usage(text, numeric, uuid) from anon;
revoke execute on function public.meter_meshy_usage_for(uuid, text, numeric, uuid) from anon;
revoke execute on function public.meter_newgameplus_build(uuid, text, text, integer, integer, numeric, text) from anon;
revoke execute on function public.meter_newgameplus_build_for(uuid, uuid, text, text, integer, integer, numeric, text) from anon;
revoke execute on function public.meter_openrouter_usage(text, text, text, numeric, text) from anon;
revoke execute on function public.meter_outscraper_usage(text, text, text, numeric, text, text) from anon;
revoke execute on function public.meter_submission_charge(uuid, text, numeric, numeric) from anon;
revoke execute on function public.meter_submission_charge_for(uuid, uuid, text, numeric, numeric) from anon;
revoke execute on function public.meter_usage(uuid, integer) from anon;
revoke execute on function public.meter_vault_storage(uuid, numeric, numeric) from anon;
revoke execute on function public.meter_vault_storage_for(uuid, uuid, numeric, numeric) from anon;
revoke execute on function public.meter_vcw_usage(text, numeric, uuid, text) from anon;
revoke execute on function public.meter_vcw_usage_for(uuid, text, numeric, uuid, text) from anon;
revoke execute on function public.mint_crown(uuid, numeric, text, text, uuid) from anon;
revoke execute on function public.moderate_set_status(text, uuid, text) from anon;
revoke execute on function public.my_clan_usage() from anon;
revoke execute on function public.my_compute_usage(uuid) from anon;
revoke execute on function public.my_fal_usage() from anon;
revoke execute on function public.my_friends() from anon;
revoke execute on function public.my_game_play_usage() from anon;
revoke execute on function public.my_meshy_spend() from anon;
revoke execute on function public.my_newgameplus_spend() from anon;
revoke execute on function public.my_openrouter_usage() from anon;
revoke execute on function public.my_outscraper_usage() from anon;
revoke execute on function public.my_submission_spend() from anon;
revoke execute on function public.my_team_perms(uuid) from anon;
revoke execute on function public.my_vault_spend() from anon;
revoke execute on function public.my_vcw_usage() from anon;
revoke execute on function public.open_issue(uuid, text, text) from anon;
revoke execute on function public.org_roles_of(uuid, uuid) from anon;
revoke execute on function public.org_roster(uuid) from anon;
revoke execute on function public.org_roster_page(uuid, integer, timestamptz, uuid, text) from anon;
revoke execute on function public.org_scale_status(uuid) from anon;
revoke execute on function public.org_member_cap(uuid) from anon;
revoke execute on function public.party_entity_exists(text, uuid) from anon;
revoke execute on function public.party_label(text, uuid) from anon;
revoke execute on function public.party_follow(text, uuid, text, uuid) from anon;
revoke execute on function public.party_unfollow(text, uuid, text, uuid) from anon;
revoke execute on function public.party_invite_create(text, uuid, text, uuid, text) from anon;
revoke execute on function public.party_invite_decide(uuid, boolean) from anon;
revoke execute on function public.party_my_invites() from anon;
revoke execute on function public.party_challenge_create(text, uuid, text, uuid, text, text) from anon;
revoke execute on function public.party_challenge_decide(uuid, text, text, uuid) from anon;
revoke execute on function public.party_post_create(text, uuid, text, uuid, text, text, text) from anon;
revoke execute on function public.post_clan_message(uuid, text, text, uuid, text) from anon;
revoke execute on function public.post_mp_event(uuid, text, text) from anon;
revoke execute on function public.provision_service(uuid, uuid, text, text) from anon;
revoke execute on function public.prune_clan_members(uuid, text, integer, uuid[], boolean) from anon;
revoke execute on function public.prune_org_members(uuid, text, integer, uuid[], boolean) from anon;
revoke execute on function public.purchase_cosmetic_item(text, text, numeric) from anon;
revoke execute on function public.purge_expired_bot_key_logs() from anon;
revoke execute on function public.push_file(uuid, text, text, text, text) from anon;
revoke execute on function public.quick_match(text, text) from anon;
