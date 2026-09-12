-- ============================================================================
-- Weird Vault: explicit service_role grants (production 42501 hotfix).
--
-- Prod log: `[api] api/vault/blobs db error { code: "42501", message:
-- "permission denied for table vault_blobs", hint: "... TO service_role" }`
-- -> HTTP 500 ("Vault unavailable.") on every register, plus
-- GET /api/vault/usage. Vercel's External APIs table shows the same denial
-- as PostgREST 403s on the service client's vault reads/writes.
--
-- The base migration correctly revokes vault tables from anon/authenticated
-- (browsers must only use server-minted signed URLs), but this database has
-- no usable grant left for service_role either, so every serviceClient call
-- on these tables 42501s. These GRANTs restore the intended shape:
-- service_role full access; anon/authenticated exactly what the base
-- migration allows (SELECT on vault_files/meshy_jobs/ai_artifacts behind
-- RLS, nothing else - untouched here).
-- Fully rerunnable (repo rule): GRANT is idempotent, no guards needed.
-- Coin tables untouched (no ALTER/CREATE/DROP on coin tables, ever).
-- ============================================================================

grant all on public.vault_blobs to service_role;
grant all on public.vault_files to service_role;
grant all on public.vault_shares to service_role;
grant all on public.meshy_jobs to service_role;
grant all on public.ai_artifacts to service_role;
grant all on public.safety_reports to service_role;
grant all on public.submission_charges to service_role;
grant all on public.meshy_usage to service_role;
grant all on public.vault_usage to service_role;

-- Membership reads the vault routes perform through the service client.
grant select on public.team_members to service_role;
grant select on public.org_members to service_role;
