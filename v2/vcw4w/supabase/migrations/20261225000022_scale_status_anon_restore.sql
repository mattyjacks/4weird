-- ============================================================================
-- 20261225000022: restore anon EXECUTE on the three public clan scale reads.
--
-- CONFLICT FOUND by the 20-agent CHEAP audit of
-- Supabase Performance Security Lints (dwpwzfwdqjguvtvkfaxu).csv
-- (batch 05 vs 20261225000018_seclint3_auth_o.sql + 20261222000006):
-- clan_scale_status, clan_supporter_status and clan_tribute_status were
-- locked to authenticated-only, but GET /api/clans/[slug]/scale
-- (v2/vcw4w/app/api/clans/[slug]/scale/route.ts:64-93) is explicitly
-- PUBLIC ("public: member count, cap ..., supporter status, tribute
-- status") with NO getUser/401 gate, and calls all three RPCs for
-- logged-out visitors. With anon revoked, logged-out clan pages get a
-- permission-denied rpcFail instead of data (the route only falls back
-- on isMissingRpc, not on 42501). Restoring anon fixes the public panel.
--
-- SAFETY: all three are read-only status views (counts/flags, no writes,
-- no PII beyond public clan aggregates) -- same class as clan_minute_rate
-- and clan_roster_page, which correctly kept anon (20261225000002).
-- Signatures re-verified against CREATE sites in
-- 20261015000100_scale_prune_tribute.sql (:963, :1189, :1296), all
-- SECURITY DEFINER with SET search_path = public at definition.
--
-- Rerunnable: ALTER/REVOKE/GRANT are idempotent. No tables/policies/
-- triggers/indexes created here.
-- ============================================================================

alter function public.clan_scale_status(uuid) set search_path = public, pg_temp;
revoke all on function public.clan_scale_status(uuid) from public;
grant execute on function public.clan_scale_status(uuid) to anon, authenticated, service_role;

alter function public.clan_supporter_status(uuid) set search_path = public, pg_temp;
revoke all on function public.clan_supporter_status(uuid) from public;
grant execute on function public.clan_supporter_status(uuid) to anon, authenticated, service_role;

alter function public.clan_tribute_status(uuid) set search_path = public, pg_temp;
revoke all on function public.clan_tribute_status(uuid) from public;
grant execute on function public.clan_tribute_status(uuid) to anon, authenticated, service_role;
