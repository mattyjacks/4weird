-- ============================================================================
-- RLS no-policy DELTA over sibling 20261219000011_rls_no_policy_remediation.sql.
--
-- Convergence note (crowded tree, 2026-09-15): sibling crew DS-RLS-01..10
-- landed ..11 mid-wave covering all 41 linter-0008 tables (39 deny-all
-- USING(false) + chat_participants SELECT/INSERT own + clan_reports SELECT
-- own). Verified on disk: 39 deny policies + chat select/insert own + clan
-- owner select all present. Per converge-to-disk-truth (never re-land a
-- sibling win), this file adds ONLY the evidence-backed delta ..11 left out:
--  1. chat_participants UPDATE own + DELETE own — completes self-membership:
--     last_read_at read-receipt writes and leave-thread deletes are
--     owner-row-only. SELECT/INSERT own already ship in ..11 (re-asserted by
--     scripts/verify-sec-sweep.mjs §5, untouched here).
--  2. do_usage SELECT own — app/api/my/usage/route.ts reads
--     .from("do_usage")...eq("user_id", user.id) with the USER jwt today and
--     degrades to zeros while RLS denies (..11 keeps it deny-all by choice and
--     defers a serviceClient switch). Owner-scoped SELECT restores the user's
--     own usage rows with zero new exposure (route already filters by
--     user_id; no INSERT/UPDATE/DELETE policy, writes stay service-only).
--  3. org_invites SELECT for inviters via public.has_org_perm(org_id,
--     'org.members.invite') (SECURITY DEFINER, recursion-safe, mirrors the
--     list_org_invites RPC gate) — app/api/orgs/[id]/invites/route.ts does a
--     direct user-JWT pre-read .eq("id", inviteId) for the IDOR bind before
--     calling revoke_org_invite; under deny-all that pre-read is always null
--     (revoke UI 404s for legitimate inviters). Inviter-scoped SELECT fixes
--     the bind while keeping tokens hidden from plain members and strangers.
--     Writes stay in create/redeem/revoke RPCs only.
-- Adopted from ..11 without change: clan_reports owner SELECT (GDPR export),
-- all 39 deny-alls, all revokes/grants. No money-table or secret-table reads
-- added (coin/crown/ledger/kid/bot-key/vault-share tables stay deny-all).
--
-- Rerunnable: GRANT / DROP POLICY IF EXISTS + CREATE POLICY are idempotent.
-- No tables, columns, triggers, indexes, or functions touched.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 0. Least-privilege grants for the delta (policies below do the scoping).
-- --------------------------------------------------------------------------
grant select, insert, update, delete on public.chat_participants to authenticated;
grant select on public.do_usage to authenticated;
grant select on public.org_invites to authenticated;

-- --------------------------------------------------------------------------
-- 1. chat_participants: complete self-membership (SELECT/INSERT ship in ..11).
-- --------------------------------------------------------------------------
alter table public.chat_participants enable row level security;
drop policy if exists chat_participants_update_own on public.chat_participants;
create policy chat_participants_update_own on public.chat_participants
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists chat_participants_delete_own on public.chat_participants;
create policy chat_participants_delete_own on public.chat_participants
  for delete to authenticated using (user_id = auth.uid());

-- --------------------------------------------------------------------------
-- 2. do_usage: SELECT own only (writes stay service-only by design).
-- --------------------------------------------------------------------------
alter table public.do_usage enable row level security;
drop policy if exists do_usage_select_own on public.do_usage;
create policy do_usage_select_own on public.do_usage
  for select to authenticated using (user_id = auth.uid());

-- --------------------------------------------------------------------------
-- 3. org_invites: SELECT for inviters only (writes stay in RPCs by design).
-- --------------------------------------------------------------------------
alter table public.org_invites enable row level security;
drop policy if exists org_invites_inviter_read on public.org_invites;
create policy org_invites_inviter_read on public.org_invites
  for select to authenticated using (public.has_org_perm(org_id, 'org.members.invite'));
