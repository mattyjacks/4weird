-- ============================================================================
-- DigitalOcean spend mirror (per user; service-written only).
--
-- do_usage mirrors real DigitalOcean billing rows pulled server-side with a
-- DO API token (droplets + volumes + snapshots in USD). Billed by
-- DigitalOcean directly; no Vibe cut applies and no coin movement happens
-- here. Reads in GET /api/my/usage are SELECT-only and degrade to zeros
-- when the table is missing (pre-migration) or RLS denies the caller.
--
-- Rerunnable: CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
-- RLS: service_role only (no client policies; service_role bypasses RLS).
-- NEVER touches coin tables (no coin_ledger / coin_lots / coin_spends here).
-- Inserts/selects only: rows are appended by the service role (unique on
-- user_id + kind + remote_id + time_bucket makes re-syncs idempotent);
-- this migration performs no UPDATE or DELETE.
-- ============================================================================

create table if not exists public.do_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  remote_id text not null default '',
  kind text not null check (char_length(kind) between 1 and 64),
  amount_usd numeric(12, 4) not null check (amount_usd >= 0 and amount_usd <= 1000000),
  time_bucket timestamptz not null,
  unique (user_id, kind, remote_id, time_bucket)
);

create index if not exists do_usage_user_idx
  on public.do_usage (user_id, time_bucket desc);

alter table public.do_usage enable row level security;

-- Service-role only: strip every client privilege. No SELECT / INSERT /
-- UPDATE / DELETE policy is created, so anon + authenticated callers get
-- zero rows (the /my/usage reader treats that like pre-migration) while
-- the service_role key bypasses RLS for the mirror writer.
revoke all on public.do_usage from anon, authenticated;
