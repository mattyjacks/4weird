-- ============================================================================
-- Privacy rights self-service (/my/rights/): audit log for data-subject
-- requests (access/export + erasure) with built-in abuse resistance.
-- Fully rerunnable: IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS guards.
--
-- Design notes:
--  * user_id has NO foreign key on purpose: the audit row must survive the
--    account deletion it records. The API always scopes rows by the
--    signed-in session user, so one account can never read another's log.
--  * ip_hash preserves a fraud-prevention signal (trial farming, bulk
--    request abuse) after personal rows are erased, using the same salted
--    sha256 approach as signup_ip_credits when SIGNUP_IP_HASH_SALT is set.
--  * RLS is enabled with NO client policies: only the service_role server
--    route (app/api/my/rights) reads/writes this table. Browser anon/auth
--    keys get nothing.
-- ============================================================================

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text,
  type text not null check (type in ('export', 'delete')),
  status text not null default 'requested'
    check (status in ('requested', 'confirmed', 'completed', 'denied', 'expired')),
  ip_hash char(64),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  completed_at timestamptz,
  note text
);

create index if not exists idx_privacy_requests_user on public.privacy_requests (user_id, created_at desc);
create index if not exists idx_privacy_requests_status on public.privacy_requests (status, created_at desc);

alter table public.privacy_requests enable row level security;

-- No client policies are created here by design (service_role only).
-- Revoke direct client access so anon/authenticated keys cannot read the log
-- even if a permissive policy is added later by mistake.
revoke all on public.privacy_requests from anon, authenticated;
