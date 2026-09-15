-- ============================================================================
-- Grant repair for 42501 "permission denied for table" on
-- public.feedback_reports (service_role) and public.account_settings
-- (authenticated).
--
-- Root cause: the base migrations created the tables + RLS policies but
-- never issued table-level GRANTs. Postgres denies everything without an
-- explicit GRANT — RLS policies alone do not confer table access — so:
--   * POST /api/feedback (serviceClient with the service key) fails
--     INSERT with 42501 even though service_role bypasses RLS.
--   * GET /api/settings (user JWT via createClient) fails SELECT with
--     42501 even though the account_settings_own policy allows it.
-- Idempotent, append-only: GRANT is naturally rerunnable; each block
-- no-ops when its table is not provisioned yet.
-- ============================================================================

-- feedback_reports: service writes via the service key (insert + select id
-- + best-effort ai update), admin reads via the service key. Authenticated
-- browser reads stay limited by the admin-read RLS policy, but the GRANT
-- must exist for the policy to ever allow a row through.
do $$
begin
  grant select, insert, update, delete on public.feedback_reports to service_role;
exception when undefined_table then
  null;
end $$;

do $$
begin
  grant select on public.feedback_reports to authenticated;
exception when undefined_table then
  null;
end $$;

-- Sibling log tables hit the same service-key path (status route +
-- enrich route), so they get the same service grant.
do $$
begin
  grant select, insert, update, delete on public.feedback_events to service_role;
exception when undefined_table then
  null;
end $$;

do $$
begin
  grant select, insert, update, delete on public.feedback_ai_logs to service_role;
exception when undefined_table then
  null;
end $$;

-- account_settings: user-JWT reads (GET) + upserts (PUT) via createClient.
-- Policy account_settings_own is FOR ALL TO authenticated, so the grant
-- must cover all DML the policy allows. No anon access by design.
do $$
begin
  grant select, insert, update, delete on public.account_settings to authenticated;
exception when undefined_table then
  null;
end $$;

do $$
begin
  grant select, insert, update, delete on public.account_settings to service_role;
exception when undefined_table then
  null;
end $$;
