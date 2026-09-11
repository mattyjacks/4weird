-- ============================================================================
-- Blender GPU render farm (/blender): job rows for .blend → .mp4 renders on
-- a pinned RTX 4090 pod. Fully rerunnable: IF NOT EXISTS / ON CONFLICT /
-- DROP ... IF EXISTS guards (repo rule).
--
-- Design notes:
--  * Scenes upload DIRECTLY from the browser to storage via a server-minted
--    signed upload URL (Vercel's ~4.5 MB body limit cannot take .blend
--    files). The API only ever sees metadata + short callbacks.
--  * The pod reports each phase to /api/blender/progress with an opaque
--    per-job callback token. The worker exits itself after a terminal
--    callback, which releases the GPU; billing ends with no clicks.
--  * RLS is enabled with NO client policies: only the service_role server
--    routes read/write this table. Browser anon/auth keys get nothing
--    (same pattern as privacy_requests).
-- ============================================================================

-- Private bucket for scenes + finished mp4s (service-role + signed URLs only).
insert into storage.buckets (id, name, public)
values ('blender-scenes', 'blender-scenes', false)
on conflict (id) do update set public = excluded.public;

create table if not exists public.blender_renders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scene_path text not null,
  scene_bytes integer not null default 0 check (scene_bytes >= 0),
  start_frame integer not null default 1 check (start_frame >= 1),
  end_frame integer not null default 1 check (end_frame >= 1),
  frame_count integer not null default 1 check (frame_count >= 1),
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'starting', 'rendering', 'done', 'done_unstored', 'failed', 'stopped')),
  pod_id text not null default '',
  gpu_id text not null default '',
  hourly_usd numeric(12,4) not null default 0,
  output_path text,
  callback_token text not null default '',
  error text,
  last_ping_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_blender_renders_user on public.blender_renders (user_id, created_at desc);
create index if not exists idx_blender_renders_status on public.blender_renders (status, created_at desc);

alter table public.blender_renders enable row level security;

-- No client policies are created here by design (service_role only).
-- Revoke direct client access so anon/authenticated keys cannot read job
-- rows even if a permissive policy is added later by mistake.
revoke all on public.blender_renders from anon, authenticated;
