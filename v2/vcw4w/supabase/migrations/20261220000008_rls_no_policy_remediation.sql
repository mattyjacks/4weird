-- RLS_ENABLED_NO_POLICY remediation (41 tables, Supabase linter 0008).
-- 10-lane triage: every table below has RLS enabled + zero policies.
-- Posture today is already deny-all for anon/authenticated (plus REVOKE on most),
-- service_role + SECURITY DEFINER RPCs bypass RLS, so this is explicitness, not a behavior change —
-- except the two noted owner-policy exceptions backed by user-JWT evidence.
--
-- Rule: rerunnable only (ENABLE RLS idempotent, DROP POLICY IF EXISTS guards).
-- Never edit shipped migrations; this file is append-only.
--
-- Lane findings summary:
--  G1  abuse_buckets / blender_renders / booking_settlements / bot_api_keys: service/RPC-only, deny-all.
--      (bot_api_keys has user_id but exposing key_hash to browser is worse than the
--       my/rights export staying null; keeps writes service-only.)
--  G2  bot_identities / bot_key_request_logs: service-only deny-all;
--      chat_participants: NEEDS USER POLICY (threads/messages policies read it);
--      clan_donation_vintages: RPC-only deny-all.
--  G3  clan_reports: owner SELECT (GDPR export reads it with user JWT);
--      clan_scale_settings / coin_lots / coin_lot_spends: deny-all.
--  G4  crown_lot_converts / crown_lot_payouts / desktop_pods / do_usage: deny-all
--      (do_usage my/usage route degrades to zeros by design; switch it to serviceClient
--       separately if user-visible usage is wanted — not in this migration).
--  G5  federation_outbox / kid_accounts / kid_controls / kid_play_days: deny-all
--      (kids carry no JWT; password_hash must never be client-readable).
--  G6  kid_sessions / kid_wallet_ledger / kid_wallet_tombstones / meshy_usage: deny-all.
--  G7  mmo_minute_settlements / newgameplus_builds / org_invites / org_scale_settings: deny-all.
--  G8  platform_ledger / privacy_requests / safety_reports / signup_ip_credits: deny-all
--      (+ missing REVOKE backfilled for signup_ip_credits).
--  G9  submission_charges / support_renewal_failures / team_api_keys / team_invites: deny-all
--      (key_hash / invite token must never be PostgREST-readable).
--  G10 valleynet_actions / vault_blobs / vault_shares / vault_usage / vcw_autoplay_remotes: deny-all
--      (vault_files keeps its own owner/team/org SELECTs — untouched).

-- ---------------------------------------------------------------------------
-- 0. Make sure RLS is on everywhere (idempotent) and close grant gaps.
-- ---------------------------------------------------------------------------
alter table public.abuse_buckets enable row level security;
alter table public.blender_renders enable row level security;
alter table public.booking_settlements enable row level security;
alter table public.bot_api_keys enable row level security;
alter table public.bot_identities enable row level security;
alter table public.bot_key_request_logs enable row level security;
alter table public.chat_participants enable row level security;
alter table public.clan_donation_vintages enable row level security;
alter table public.clan_reports enable row level security;
alter table public.clan_scale_settings enable row level security;
alter table public.coin_lot_spends enable row level security;
alter table public.coin_lots enable row level security;
alter table public.crown_lot_converts enable row level security;
alter table public.crown_lot_payouts enable row level security;
alter table public.desktop_pods enable row level security;
alter table public.do_usage enable row level security;
alter table public.federation_outbox enable row level security;
alter table public.kid_accounts enable row level security;
alter table public.kid_controls enable row level security;
alter table public.kid_play_days enable row level security;
alter table public.kid_sessions enable row level security;
alter table public.kid_wallet_ledger enable row level security;
alter table public.kid_wallet_tombstones enable row level security;
alter table public.meshy_usage enable row level security;
alter table public.mmo_minute_settlements enable row level security;
alter table public.newgameplus_builds enable row level security;
alter table public.org_invites enable row level security;
alter table public.org_scale_settings enable row level security;
alter table public.platform_ledger enable row level security;
alter table public.privacy_requests enable row level security;
alter table public.safety_reports enable row level security;
alter table public.signup_ip_credits enable row level security;
alter table public.submission_charges enable row level security;
alter table public.support_renewal_failures enable row level security;
alter table public.team_api_keys enable row level security;
alter table public.team_invites enable row level security;
alter table public.valleynet_actions enable row level security;
alter table public.vault_blobs enable row level security;
alter table public.vault_shares enable row level security;
alter table public.vault_usage enable row level security;
alter table public.vcw_autoplay_remotes enable row level security;

-- Deny-by-default grants: nothing for anon/authenticated on service-only tables.
-- (chat_participants + clan_reports get their narrow GRANTs in their own sections.)
revoke all on public.abuse_buckets from anon, authenticated;
revoke all on public.blender_renders from anon, authenticated;
revoke all on public.booking_settlements from anon, authenticated;
revoke all on public.bot_api_keys from anon, authenticated;
revoke all on public.bot_identities from anon, authenticated;
revoke all on public.bot_key_request_logs from anon, authenticated;
revoke all on public.clan_donation_vintages from anon, authenticated;
revoke all on public.clan_scale_settings from anon, authenticated;
revoke all on public.coin_lot_spends from anon, authenticated;
revoke all on public.coin_lots from anon, authenticated;
revoke all on public.crown_lot_converts from anon, authenticated;
revoke all on public.crown_lot_payouts from anon, authenticated;
revoke all on public.desktop_pods from anon, authenticated;
revoke all on public.do_usage from anon, authenticated;
revoke all on public.federation_outbox from anon, authenticated;
revoke all on public.kid_accounts from anon, authenticated;
revoke all on public.kid_controls from anon, authenticated;
revoke all on public.kid_play_days from anon, authenticated;
revoke all on public.kid_sessions from anon, authenticated;
revoke all on public.kid_wallet_ledger from anon, authenticated;
revoke all on public.kid_wallet_tombstones from anon, authenticated;
revoke all on public.meshy_usage from anon, authenticated;
revoke all on public.mmo_minute_settlements from anon, authenticated;
revoke all on public.newgameplus_builds from anon, authenticated;
revoke all on public.org_invites from anon, authenticated;
revoke all on public.org_scale_settings from anon, authenticated;
revoke all on public.platform_ledger from anon, authenticated;
revoke all on public.privacy_requests from anon, authenticated;
revoke all on public.safety_reports from anon, authenticated;
revoke all on public.signup_ip_credits from anon, authenticated;
revoke all on public.submission_charges from anon, authenticated;
revoke all on public.support_renewal_failures from anon, authenticated;
revoke all on public.team_api_keys from anon, authenticated;
revoke all on public.team_invites from anon, authenticated;
revoke all on public.valleynet_actions from anon, authenticated;
revoke all on public.vault_blobs from anon, authenticated;
revoke all on public.vault_shares from anon, authenticated;
revoke all on public.vault_usage from anon, authenticated;
revoke all on public.vcw_autoplay_remotes from anon, authenticated;
-- clan_reports: revoke everything, then grant back SELECT only (owner policy below).
revoke all on public.clan_reports from anon, authenticated;
-- chat_participants: revoke everything, then grant back SELECT+INSERT only.
revoke all on public.chat_participants from anon, authenticated;

-- Service-role grants (PostgREST service client + cron/worker paths).
-- Idempotent; several already exist — re-granting is harmless.
grant all on public.abuse_buckets to service_role;
grant all on public.blender_renders to service_role;
grant all on public.booking_settlements to service_role;
grant all on public.bot_api_keys to service_role;
grant all on public.bot_identities to service_role;
grant all on public.bot_key_request_logs to service_role;
grant all on public.chat_participants to service_role;
grant all on public.clan_donation_vintages to service_role;
grant all on public.clan_reports to service_role;
grant all on public.clan_scale_settings to service_role;
grant all on public.coin_lot_spends to service_role;
grant all on public.coin_lots to service_role;
grant all on public.crown_lot_converts to service_role;
grant all on public.crown_lot_payouts to service_role;
grant all on public.desktop_pods to service_role;
grant all on public.do_usage to service_role;
grant all on public.federation_outbox to service_role;
grant all on public.kid_accounts to service_role;
grant all on public.kid_controls to service_role;
grant all on public.kid_play_days to service_role;
grant all on public.kid_sessions to service_role;
grant all on public.kid_wallet_ledger to service_role;
grant all on public.kid_wallet_tombstones to service_role;
grant all on public.meshy_usage to service_role;
grant all on public.mmo_minute_settlements to service_role;
grant all on public.newgameplus_builds to service_role;
grant all on public.org_invites to service_role;
grant all on public.org_scale_settings to service_role;
grant all on public.platform_ledger to service_role;
grant all on public.privacy_requests to service_role;
grant all on public.safety_reports to service_role;
grant all on public.signup_ip_credits to service_role;
grant all on public.submission_charges to service_role;
grant all on public.support_renewal_failures to service_role;
grant all on public.team_api_keys to service_role;
grant all on public.team_invites to service_role;
grant all on public.valleynet_actions to service_role;
grant all on public.vault_blobs to service_role;
grant all on public.vault_shares to service_role;
grant all on public.vault_usage to service_role;
grant all on public.vcw_autoplay_remotes to service_role;

-- ---------------------------------------------------------------------------
-- 1. Explicit deny-all policies (39 service/RPC-only tables).
-- USING (false) / WITH CHECK (false) grants nothing; it makes the
-- fail-closed posture visible so linter 0008 clears without opening access.
-- ---------------------------------------------------------------------------
drop policy if exists abuse_buckets_no_client_access on public.abuse_buckets;
create policy abuse_buckets_no_client_access on public.abuse_buckets
  for all to anon, authenticated using (false) with check (false);

drop policy if exists blender_renders_no_client_access on public.blender_renders;
create policy blender_renders_no_client_access on public.blender_renders
  for all to anon, authenticated using (false) with check (false);

drop policy if exists booking_settlements_no_client_access on public.booking_settlements;
create policy booking_settlements_no_client_access on public.booking_settlements
  for all to anon, authenticated using (false) with check (false);

drop policy if exists bot_api_keys_no_client_access on public.bot_api_keys;
create policy bot_api_keys_no_client_access on public.bot_api_keys
  for all to anon, authenticated using (false) with check (false);

drop policy if exists bot_identities_deny_all on public.bot_identities;
create policy bot_identities_deny_all on public.bot_identities
  for all to anon, authenticated using (false) with check (false);

drop policy if exists bot_key_request_logs_deny_all on public.bot_key_request_logs;
create policy bot_key_request_logs_deny_all on public.bot_key_request_logs
  for all to anon, authenticated using (false) with check (false);

drop policy if exists clan_donation_vintages_deny_all on public.clan_donation_vintages;
create policy clan_donation_vintages_deny_all on public.clan_donation_vintages
  for all to anon, authenticated using (false) with check (false);

drop policy if exists clan_scale_settings_no_client on public.clan_scale_settings;
create policy clan_scale_settings_no_client on public.clan_scale_settings
  for all to anon, authenticated using (false) with check (false);

drop policy if exists coin_lot_spends_no_client on public.coin_lot_spends;
create policy coin_lot_spends_no_client on public.coin_lot_spends
  for all to anon, authenticated using (false) with check (false);

drop policy if exists coin_lots_no_client on public.coin_lots;
create policy coin_lots_no_client on public.coin_lots
  for all to anon, authenticated using (false) with check (false);

drop policy if exists crown_lot_converts_deny_all on public.crown_lot_converts;
create policy crown_lot_converts_deny_all on public.crown_lot_converts
  for all to anon, authenticated using (false) with check (false);

drop policy if exists crown_lot_payouts_deny_all on public.crown_lot_payouts;
create policy crown_lot_payouts_deny_all on public.crown_lot_payouts
  for all to anon, authenticated using (false) with check (false);

drop policy if exists desktop_pods_deny_all on public.desktop_pods;
create policy desktop_pods_deny_all on public.desktop_pods
  for all to anon, authenticated using (false) with check (false);

drop policy if exists do_usage_deny_all on public.do_usage;
create policy do_usage_deny_all on public.do_usage
  for all to anon, authenticated using (false) with check (false);

drop policy if exists federation_outbox_no_access on public.federation_outbox;
create policy federation_outbox_no_access on public.federation_outbox
  for all to anon, authenticated using (false) with check (false);

drop policy if exists kid_accounts_no_access on public.kid_accounts;
create policy kid_accounts_no_access on public.kid_accounts
  for all to anon, authenticated using (false) with check (false);

drop policy if exists kid_controls_no_access on public.kid_controls;
create policy kid_controls_no_access on public.kid_controls
  for all to anon, authenticated using (false) with check (false);

drop policy if exists kid_play_days_no_access on public.kid_play_days;
create policy kid_play_days_no_access on public.kid_play_days
  for all to anon, authenticated using (false) with check (false);

drop policy if exists kid_sessions_deny_all on public.kid_sessions;
create policy kid_sessions_deny_all on public.kid_sessions
  for all to anon, authenticated using (false) with check (false);

drop policy if exists kid_wallet_ledger_deny_all on public.kid_wallet_ledger;
create policy kid_wallet_ledger_deny_all on public.kid_wallet_ledger
  for all to anon, authenticated using (false) with check (false);

drop policy if exists kid_wallet_tombstones_deny_all on public.kid_wallet_tombstones;
create policy kid_wallet_tombstones_deny_all on public.kid_wallet_tombstones
  for all to anon, authenticated using (false) with check (false);

drop policy if exists meshy_usage_deny_all on public.meshy_usage;
create policy meshy_usage_deny_all on public.meshy_usage
  for all to anon, authenticated using (false) with check (false);

drop policy if exists mmo_minute_settlements_deny_all on public.mmo_minute_settlements;
create policy mmo_minute_settlements_deny_all on public.mmo_minute_settlements
  for all to anon, authenticated using (false) with check (false);

drop policy if exists newgameplus_builds_deny_all on public.newgameplus_builds;
create policy newgameplus_builds_deny_all on public.newgameplus_builds
  for all to anon, authenticated using (false) with check (false);

drop policy if exists org_invites_deny_all on public.org_invites;
create policy org_invites_deny_all on public.org_invites
  for all to anon, authenticated using (false) with check (false);

drop policy if exists org_scale_settings_deny_all on public.org_scale_settings;
create policy org_scale_settings_deny_all on public.org_scale_settings
  for all to anon, authenticated using (false) with check (false);

drop policy if exists platform_ledger_deny_all on public.platform_ledger;
create policy platform_ledger_deny_all on public.platform_ledger
  for all to anon, authenticated using (false) with check (false);

drop policy if exists privacy_requests_deny_all on public.privacy_requests;
create policy privacy_requests_deny_all on public.privacy_requests
  for all to anon, authenticated using (false) with check (false);

drop policy if exists safety_reports_deny_all on public.safety_reports;
create policy safety_reports_deny_all on public.safety_reports
  for all to anon, authenticated using (false) with check (false);

drop policy if exists signup_ip_credits_deny_all on public.signup_ip_credits;
create policy signup_ip_credits_deny_all on public.signup_ip_credits
  for all to anon, authenticated using (false) with check (false);

drop policy if exists submission_charges_deny_all on public.submission_charges;
create policy submission_charges_deny_all on public.submission_charges
  for all to anon, authenticated using (false) with check (false);

drop policy if exists support_renewal_failures_deny_all on public.support_renewal_failures;
create policy support_renewal_failures_deny_all on public.support_renewal_failures
  for all to anon, authenticated using (false) with check (false);

drop policy if exists team_api_keys_deny_all on public.team_api_keys;
create policy team_api_keys_deny_all on public.team_api_keys
  for all to anon, authenticated using (false) with check (false);

drop policy if exists team_invites_deny_all on public.team_invites;
create policy team_invites_deny_all on public.team_invites
  for all to anon, authenticated using (false) with check (false);

drop policy if exists valleynet_actions_deny_all on public.valleynet_actions;
create policy valleynet_actions_deny_all on public.valleynet_actions
  for all to anon, authenticated using (false) with check (false);

drop policy if exists vault_blobs_deny_all on public.vault_blobs;
create policy vault_blobs_deny_all on public.vault_blobs
  for all to anon, authenticated using (false) with check (false);

drop policy if exists vault_shares_deny_all on public.vault_shares;
create policy vault_shares_deny_all on public.vault_shares
  for all to anon, authenticated using (false) with check (false);

drop policy if exists vault_usage_deny_all on public.vault_usage;
create policy vault_usage_deny_all on public.vault_usage
  for all to anon, authenticated using (false) with check (false);

drop policy if exists vcw_autoplay_remotes_deny_all on public.vcw_autoplay_remotes;
create policy vcw_autoplay_remotes_deny_all on public.vcw_autoplay_remotes
  for all to anon, authenticated using (false) with check (false);

-- ---------------------------------------------------------------------------
-- 2. Owner-policy exceptions (2 tables with user-JWT evidence).
-- ---------------------------------------------------------------------------

-- 2a. chat_participants: participant-gated. Sibling chat_threads / chat_messages
-- policies already EXISTS() against this table; without these two they stay dead.
-- Queued as DS-SEC-INFRA-01a (QUEUE.md) — this closes it.
grant select, insert on public.chat_participants to authenticated;
drop policy if exists chat_participants_select_own on public.chat_participants;
create policy chat_participants_select_own on public.chat_participants
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists chat_participants_insert_own on public.chat_participants;
create policy chat_participants_insert_own on public.chat_participants
  for insert to authenticated with check (auth.uid() = user_id);

-- 2b. clan_reports: owner read-only for the GDPR export
-- (app/api/my/rights/route.ts reads own reports with the user JWT; writes stay
-- RPC file_report + service_role only, so no INSERT/UPDATE/DELETE policy).
grant select on public.clan_reports to authenticated;
drop policy if exists clan_reports_select_own on public.clan_reports;
create policy clan_reports_select_own on public.clan_reports
  for select to authenticated using (reporter_id = auth.uid());
