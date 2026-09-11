-- ============================================================================
-- Virtual Desktop ownership (/desktop + /runpods dashboard): one row per
-- provisioned desktop pod so the user who created it can stop / start /
-- restart / terminate / delete it later. Fully rerunnable: IF NOT EXISTS /
-- DROP ... IF EXISTS guards (repo rule).
--
-- Design notes:
--  * POST /api/desktop/provision used to be stateless (pod id returned once,
--    never stored) — desktops were unmanageable after the response. The
--    provision route now inserts here (service role) before returning.
--  * RLS is enabled with NO client policies: only the service_role server
--    routes read/write this table. Browser anon/auth keys get nothing
--    (same pattern as blender_renders + privacy_requests).
-- ============================================================================

create table if not exists public.desktop_pods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pod_id text not null default '',
  kind text not null default 'gpu'
    check (kind in ('cpu', 'gpu')),
  interface text not null default 'gui'
    check (interface in ('gui', 'jupyter')),
  endpoint_url text not null default '',
  gpu_id text not null default '',
  cpu_id text not null default '',
  hourly_usd numeric(12,4) not null default 0,
  status text not null default 'running'
    check (status in ('running', 'stopped', 'terminated', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_desktop_pods_user on public.desktop_pods (user_id, created_at desc);
create index if not exists idx_desktop_pods_pod on public.desktop_pods (pod_id);
create index if not exists idx_desktop_pods_status on public.desktop_pods (status, created_at desc);

alter table public.desktop_pods enable row level security;

-- No client policies are created here by design (service_role only).
-- Revoke direct client access so anon/authenticated keys cannot read desktop
-- rows even if a permissive policy is added later by mistake.
revoke all on public.desktop_pods from anon, authenticated;
