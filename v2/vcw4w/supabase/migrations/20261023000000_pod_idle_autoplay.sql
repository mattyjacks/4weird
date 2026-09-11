-- ============================================================================
-- Pod idle lifecycle (warn-chime → stop → terminate) + autoplay ownership.
--
-- 1. desktop_pods gains activity + per-pod policy overrides + image record:
--    * last_activity_at: last heartbeat / control action (UTC). The client
--      watchdog POSTs here on input; stop/start/restart refresh it too.
--    * warn_chimed_at: when the 60-min warning fired (so the sweep + UI
--      don't chime twice and can show "warned, stopping in N min").
--    * warn_minutes / stop_grace_minutes / terminate_hours: nullable
--      per-pod overrides (NULL = account default from lib/pod-idle.ts env).
--    * image: the container image the pod booted (custom launches recorded).
-- 2. New vcw_autoplay_remotes: autoplay pods were previously fire-and-forget
--    (pod id returned once, never stored) so they could never be stopped
--    from /runpods or /desktop. Now recorded like desktops: creator-owned,
--    controllable, idle-tracked.
--
-- Fully rerunnable: IF NOT EXISTS / ADD COLUMN IF NOT EXISTS guards.
-- RLS enabled with NO client policies (service_role only, same pattern as
-- desktop_pods + blender_renders + privacy_requests).
-- ============================================================================

alter table if exists public.desktop_pods
  add column if not exists last_activity_at timestamptz not null default now();

alter table if exists public.desktop_pods
  add column if not exists warn_chimed_at timestamptz null;

alter table if exists public.desktop_pods
  add column if not exists warn_minutes integer null
    check (warn_minutes is null or (warn_minutes >= 5 and warn_minutes <= 240));

alter table if exists public.desktop_pods
  add column if not exists stop_grace_minutes integer null
    check (stop_grace_minutes is null or (stop_grace_minutes >= 1 and stop_grace_minutes <= 120));

alter table if exists public.desktop_pods
  add column if not exists terminate_hours integer null
    check (terminate_hours is null or (terminate_hours >= 1 and terminate_hours <= 168));

alter table if exists public.desktop_pods
  add column if not exists image text not null default '';

create index if not exists idx_desktop_pods_activity on public.desktop_pods (last_activity_at desc);

create table if not exists public.vcw_autoplay_remotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pod_id text not null default '',
  game_slug text not null default '',
  compute text not null default 'cpu'
    check (compute in ('cpu', 'gpu', 'gpu-boosted')),
  site_mode text not null default 'on-site'
    check (site_mode in ('on-site', 'off-site')),
  endpoint_url text not null default '',
  gpu_id text not null default '',
  cpu_id text not null default '',
  image text not null default '',
  hourly_usd numeric(12,4) not null default 0,
  status text not null default 'running'
    check (status in ('running', 'stopped', 'terminated', 'deleted')),
  last_activity_at timestamptz not null default now(),
  warn_chimed_at timestamptz null,
  warn_minutes integer null
    check (warn_minutes is null or (warn_minutes >= 5 and warn_minutes <= 240)),
  stop_grace_minutes integer null
    check (stop_grace_minutes is null or (stop_grace_minutes >= 1 and stop_grace_minutes <= 120)),
  terminate_hours integer null
    check (terminate_hours is null or (terminate_hours >= 1 and terminate_hours <= 168)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vcw_autoplay_remotes_user on public.vcw_autoplay_remotes (user_id, created_at desc);
create index if not exists idx_vcw_autoplay_remotes_pod on public.vcw_autoplay_remotes (pod_id);
create index if not exists idx_vcw_autoplay_remotes_status on public.vcw_autoplay_remotes (status, created_at desc);
create index if not exists idx_vcw_autoplay_remotes_activity on public.vcw_autoplay_remotes (last_activity_at desc);

alter table public.vcw_autoplay_remotes enable row level security;

-- No client policies by design (service_role only).
revoke all on public.vcw_autoplay_remotes from anon, authenticated;
