-- ============================================================================
-- Per-account audit log for profile changes (age-band changes first).
-- Self-service bands stay open in both directions (teen<->adult), but every
-- age-band change lands a tamper-evident row (old → new + timestamp) that the
-- account holder — and a parent checking the account — can read on /account
-- and in the data export. Fully rerunnable: IF NOT EXISTS / DROP ... IF
-- EXISTS guards.
--
-- Design notes:
--  * ONE SELECT-own policy only: the owner reads their own log. NO
--    insert/update/delete policies, so browser anon/authenticated keys can
--    never forge, edit, or erase rows — only service_role writes, from
--    PATCH /api/me/profile. A kid cannot wipe the trail short of full
--    account deletion (which erases everything via /api/my/rights, and that
--    itself is the visible outcome).
--  * Values stored are band labels only (teen/adult/unknown/legacy) — no DOB,
--    no PII beyond what profiles already holds.
-- ============================================================================

create table if not exists public.profile_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  action text not null default 'age_band_changed',
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

create index if not exists idx_profile_audit_log_user on public.profile_audit_log (user_id, created_at desc);

alter table public.profile_audit_log enable row level security;

drop policy if exists profile_audit_log_read_own on public.profile_audit_log;
create policy profile_audit_log_read_own on public.profile_audit_log
  for select to authenticated using (user_id = auth.uid());

-- No insert/update/delete policies by design (service_role writes only).
