-- The sole RPC caller is the login-gated /api/stats route.  A later lint
-- migration accidentally restored anon EXECUTE after the authenticated-only
-- policy in 20261219000006_seclint_anon_reads.sql.
--
-- Rerunnable: REVOKE and GRANT safely converge on the intended grants.
revoke all on function public.community_stat_averages() from public, anon;
grant execute on function public.community_stat_averages() to authenticated, service_role;
