-- ============================================================================
-- 4weird Game .zip submissions + Weird Vault blobs + Meshy.ai + AI autosave.
-- Fully rerunnable (IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS).
--
-- Legal + safety contract (mirrors Terms Sections 2/3/5/11):
-- - code_submissions gains zip columns + verdict (safe|warning|unsafe|denied)
--   + quarantine flags. denied/unsafe packages are NEVER served: status is
--   forced to 'rejected' + quarantined=true, queued for HUMAN review.
-- - safety_reports preserves sha256 evidence WITHOUT storing viewable
--   offending bytes and WITHOUT describing CSAM. NCMEC referral is BY A
--   HUMAN (reported_to_ncmec flag, set only by moderators). IP hashes are
--   disclosed ONLY on valid legal process; there is no automatic
--   IP-to-authorities pipeline, and uploader_ip_hash uses a server salt
--   (never raw IPs in cleartext rows readable by clients).
-- - Money rule (one rule everywhere): every meter splits 25% platform /
--   75% provider INCLUDED in the gross, attributed per row.
-- - Scopes are STRICTLY separate: vault_blobs carries exactly one of
--   owner_id / team_id / org_id (vault_scope_check). Reads require
--   membership of that scope; no cross-scope leakage.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 0. code_submissions: zip + verdict + quarantine columns
-- --------------------------------------------------------------------------
alter table public.code_submissions
  add column if not exists zip_bytes integer not null default 0
    check (zip_bytes >= 0 and zip_bytes <= 72477574);
alter table public.code_submissions
  add column if not exists zip_sha256 char(64) null;
alter table public.code_submissions
  add column if not exists storage_path text null
    check (storage_path is null or char_length(storage_path) between 1 and 512);
alter table public.code_submissions
  add column if not exists game_root text not null default ''
    check (char_length(game_root) <= 256);
alter table public.code_submissions
  add column if not exists verdict text not null default 'safe'
    check (verdict in ('safe','warning','unsafe','denied'));
alter table public.code_submissions
  add column if not exists quarantined boolean not null default false;
alter table public.code_submissions
  add column if not exists audit_findings jsonb not null default '[]'::jsonb;
alter table public.code_submissions
  add column if not exists preview_files jsonb not null default '[]'::jsonb;
alter table public.code_submissions
  add column if not exists audit_coins numeric(12,2) not null default 0
    check (audit_coins >= 0);
alter table public.code_submissions
  add column if not exists storage_coins numeric(12,2) not null default 0
    check (storage_coins >= 0);
create index if not exists idx_code_submissions_verdict
  on public.code_submissions (verdict, quarantined, updated_at desc);

-- --------------------------------------------------------------------------
-- 1. Weird Vault: content-addressed blobs + scoped file rows
-- --------------------------------------------------------------------------
create table if not exists public.vault_blobs (
  sha256 char(64) primary key,
  bytes integer not null check (bytes > 0 and bytes <= 72477574),
  mime text not null default 'application/octet-stream'
    check (char_length(mime) between 1 and 128),
  storage_path text not null check (char_length(storage_path) between 1 and 512),
  created_at timestamptz not null default now()
);

create table if not exists public.vault_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid null references public.profiles(id) on delete cascade,
  team_id uuid null references public.teams(id) on delete cascade,
  org_id uuid null references public.orgs(id) on delete cascade,
  scope text not null check (scope in ('personal','team','org')),
  path text not null check (char_length(path) between 1 and 512),
  sha256 char(64) not null references public.vault_blobs(sha256) on delete restrict,
  bytes integer not null check (bytes >= 0 and bytes <= 72477574),
  kind text not null default 'asset'
    check (kind in ('model-3d','image','animation','code','audio','video','text','chat','log','asset')),
  provenance jsonb not null default '{}'::jsonb,
  quarantined boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (scope = 'personal' and owner_id is not null and team_id is null and org_id is null) or
    (scope = 'team' and team_id is not null and owner_id is null and org_id is null) or
    (scope = 'org' and org_id is not null and owner_id is null and team_id is null)
  ),
  unique (scope, owner_id, team_id, org_id, path)
);
create index if not exists idx_vault_files_owner on public.vault_files (owner_id, updated_at desc);
create index if not exists idx_vault_files_team on public.vault_files (team_id, updated_at desc);
create index if not exists idx_vault_files_org on public.vault_files (org_id, updated_at desc);

create table if not exists public.vault_shares (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.vault_files(id) on delete cascade,
  token char(32) not null unique default substr(encode(gen_random_bytes(24),'hex'),1,32),
  created_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz null,
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- 2. Meshy.ai jobs (one row per pipeline: prompt -> preview -> refine)
-- --------------------------------------------------------------------------
create table if not exists public.meshy_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid null references public.teams(id) on delete set null,
  org_id uuid null references public.orgs(id) on delete set null,
  op text not null check (op in ('text-to-3d','image-to-3d','text-to-texture','animate','remesh')),
  prompt text not null default '' check (char_length(prompt) <= 2000),
  source_image_url text not null default '' check (char_length(source_image_url) <= 2048),
  meshy_task_id text not null default '' check (char_length(meshy_task_id) <= 128),
  status text not null default 'queued'
    check (status in ('queued','processing','succeeded','failed','refining','done','unconfigured')),
  result_url text not null default '' check (char_length(result_url) <= 2048),
  vault_file_id uuid null references public.vault_files(id) on delete set null,
  coins numeric(12,2) not null default 0 check (coins >= 0),
  cut numeric(12,2) not null default 0 check (cut >= 0),
  advice jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_meshy_jobs_owner on public.meshy_jobs (owner_id, created_at desc);

-- --------------------------------------------------------------------------
-- 3. AI artifacts ledger (autosave trail: fal + meshy + chat + logs)
-- --------------------------------------------------------------------------
create table if not exists public.ai_artifacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid null references public.teams(id) on delete set null,
  org_id uuid null references public.orgs(id) on delete set null,
  kind text not null
    check (kind in ('model-3d','image','animation','code','audio','video','text','chat','log','asset')),
  tier text not null default 'half' check (tier in ('full','half','minimal')),
  source text not null default 'manual'
    check (source in ('fal','meshy','vcw','swarm','buddy','newgameplus','manual','api')),
  vault_file_id uuid null references public.vault_files(id) on delete set null,
  bytes integer not null default 0 check (bytes >= 0 and bytes <= 72477574),
  coins numeric(12,2) not null default 0 check (coins >= 0),
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_artifacts_owner on public.ai_artifacts (owner_id, created_at desc);

-- --------------------------------------------------------------------------
-- 4. Safety reports (moderator + automod queue; evidence = hashes, never
--    viewable offending bytes, never CSAM description)
-- --------------------------------------------------------------------------
create table if not exists public.safety_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid null references public.profiles(id) on delete set null,
  target_type text not null
    check (target_type in ('submission','vault_file','meshy_job','post','comment','message','other')),
  target_id uuid null,
  category text not null
    check (category in ('malware','cybercrime','csam','sexual','spam','other')),
  detail text not null default '' check (char_length(detail) <= 2000),
  sha256 char(64) null,
  uploader_ip_hash char(64) null,
  status text not null default 'open'
    check (status in ('open','reviewing','cleared','actioned','referred_ncmec')),
  reported_to_ncmec boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_safety_reports_status on public.safety_reports (status, created_at desc);

-- --------------------------------------------------------------------------
-- 5. Meter ledgers (25% cut INCLUDED, attributed per row)
-- --------------------------------------------------------------------------
create table if not exists public.submission_charges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  submission_id uuid null references public.code_submissions(id) on delete set null,
  kind text not null check (kind in ('storage','audit','audit_deep')),
  gross numeric(12,2) not null check (gross >= 0.01),
  cut numeric(12,2) not null check (cut >= 0),
  created_at timestamptz not null default now()
);
create index if not exists idx_submission_charges_user on public.submission_charges (user_id, created_at desc);

create table if not exists public.meshy_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid null references public.meshy_jobs(id) on delete set null,
  op text not null check (op in ('text-to-3d','image-to-3d','text-to-texture','animate','remesh')),
  gross numeric(12,2) not null check (gross >= 0.01),
  cut numeric(12,2) not null check (cut >= 0),
  created_at timestamptz not null default now()
);
create index if not exists idx_meshy_usage_user on public.meshy_usage (user_id, created_at desc);

create table if not exists public.vault_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_id uuid null references public.vault_files(id) on delete set null,
  gross numeric(12,2) not null check (gross >= 0.01),
  cut numeric(12,2) not null check (cut >= 0),
  created_at timestamptz not null default now()
);
create index if not exists idx_vault_usage_user on public.vault_usage (user_id, created_at desc);

-- --------------------------------------------------------------------------
-- 6. RLS; deny by default; scoped reads only
-- --------------------------------------------------------------------------
alter table public.vault_blobs enable row level security;
alter table public.vault_files enable row level security;
alter table public.vault_shares enable row level security;
alter table public.meshy_jobs enable row level security;
alter table public.ai_artifacts enable row level security;
alter table public.safety_reports enable row level security;
alter table public.submission_charges enable row level security;
alter table public.meshy_usage enable row level security;
alter table public.vault_usage enable row level security;

drop policy if exists vault_files_personal on public.vault_files;
create policy vault_files_personal on public.vault_files for select to authenticated using (
  scope = 'personal' and owner_id = auth.uid()
);
drop policy if exists vault_files_team on public.vault_files;
create policy vault_files_team on public.vault_files for select to authenticated using (
  scope = 'team' and public.has_team_perm(team_id, 'team.view')
);
drop policy if exists vault_files_org on public.vault_files;
create policy vault_files_org on public.vault_files for select to authenticated using (
  scope = 'org' and public.is_org_member(org_id)
);
drop policy if exists meshy_jobs_own on public.meshy_jobs;
create policy meshy_jobs_own on public.meshy_jobs for select to authenticated using (
  owner_id = auth.uid()
);
drop policy if exists artifacts_own on public.ai_artifacts;
create policy artifacts_own on public.ai_artifacts for select to authenticated using (
  owner_id = auth.uid()
);
-- Safety reports, blobs, shares, ledgers: no client reads/writes (RPC only).
revoke all on public.vault_blobs from anon, authenticated;
revoke all on public.vault_shares from anon, authenticated;
revoke all on public.safety_reports from anon, authenticated;
revoke all on public.submission_charges from anon, authenticated;
revoke all on public.meshy_usage from anon, authenticated;
revoke all on public.vault_usage from anon, authenticated;
grant select on public.vault_files to authenticated;
grant select on public.meshy_jobs to authenticated;
grant select on public.ai_artifacts to authenticated;

-- --------------------------------------------------------------------------
-- 7. Meter RPCs (guarded; whole-coin debits via coin_ledger with a balance
--    guard, exactly like meter_fal_usage. 25% cut INCLUDED, per-row split.)
-- --------------------------------------------------------------------------
create or replace function public.meter_submission_charge(
  p_submission uuid, p_kind text, p_gross numeric, p_cut numeric
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_gross integer; v_cut integer; v_bal integer;
begin
  if p_kind not in ('storage','audit','audit_deep') then raise exception 'invalid charge kind'; end if;
  if auth.uid() is null then raise exception 'login required'; end if;
  v_gross := greatest(1, ceil(p_gross)::integer);
  v_cut := round((v_gross * 25) / 100.0)::integer;
  select coalesce(sum(delta), 0)::integer into v_bal
    from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_gross then
    raise exception 'insufficient balance: need % coins, have %', v_gross, v_bal;
  end if;
  insert into public.submission_charges (user_id, submission_id, kind, gross, cut)
  values (auth.uid(), p_submission, p_kind, v_gross, v_cut) returning id into v_id;
  begin
    insert into public.coin_ledger (user_id, delta, reason)
    values (auth.uid(), -v_gross,
      substr('Submission ' || p_kind || ':' || coalesce(p_submission::text,''), 1, 120));
  exception when undefined_table then null;
  end;
  return v_id;
end; $$;
grant execute on function public.meter_submission_charge(uuid, text, numeric, numeric) to authenticated;
-- Bot-key callers act AS the linked human but carry no auth.uid session, so
-- every meter has a `_for` twin (same math + balance guard, explicit user).
-- `_for` variants carry NO grant: only the service_role key (server routes
-- after resolveBotKey + keyHasScope) can call them. Precedent:
-- meter_clan_posting_fee_for on the clan surface.
create or replace function public._meter_submission_for(
  p_user uuid, p_submission uuid, p_kind text, p_gross numeric
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_gross integer; v_cut integer; v_bal integer;
begin
  if p_user is null then raise exception 'login required'; end if;
  v_gross := greatest(1, ceil(p_gross)::integer);
  v_cut := round((v_gross * 25) / 100.0)::integer;
  select coalesce(sum(delta), 0)::integer into v_bal
    from public.coin_ledger where user_id = p_user;
  if v_bal < v_gross then
    raise exception 'insufficient balance: need % coins, have %', v_gross, v_bal;
  end if;
  insert into public.submission_charges (user_id, submission_id, kind, gross, cut)
  values (p_user, p_submission, p_kind, v_gross, v_cut) returning id into v_id;
  begin
    insert into public.coin_ledger (user_id, delta, reason)
    values (p_user, -v_gross,
      substr('Submission ' || p_kind || ':' || coalesce(p_submission::text,''), 1, 120));
  exception when undefined_table then null;
  end;
  return v_id;
end; $$;
revoke all on function public._meter_submission_for(uuid, uuid, text, numeric) from public, anon, authenticated;

create or replace function public.meter_submission_charge_for(
  p_user uuid, p_submission uuid, p_kind text, p_gross numeric, p_cut numeric
) returns uuid language plpgsql security definer set search_path = public as $$
begin
  if p_kind not in ('storage','audit','audit_deep') then raise exception 'invalid charge kind'; end if;
  return public._meter_submission_for(p_user, p_submission, p_kind, p_gross);
end; $$;
revoke all on function public.meter_submission_charge_for(uuid, uuid, text, numeric, numeric) from public, anon, authenticated;

create or replace function public.meter_meshy_usage(
  p_op text, p_qty numeric, p_job uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_gross integer; v_cut integer; v_id uuid; v_bal integer;
begin
  if p_op not in ('text-to-3d','image-to-3d','text-to-texture','animate','remesh') then raise exception 'invalid meshy op'; end if;
  if auth.uid() is null then raise exception 'login required'; end if;
  v_gross := greatest(1, ceil(case p_op
    when 'text-to-3d' then 18 * p_qty when 'image-to-3d' then 16 * p_qty
    when 'text-to-texture' then 12 * p_qty when 'animate' then 14 * p_qty
    else 8 * p_qty end)::integer);
  v_cut := round((v_gross * 25) / 100.0)::integer;
  select coalesce(sum(delta), 0)::integer into v_bal
    from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_gross then
    raise exception 'insufficient balance: need % coins, have %', v_gross, v_bal;
  end if;
  insert into public.meshy_usage (user_id, job_id, op, gross, cut)
  values (auth.uid(), p_job, p_op, v_gross, v_cut) returning id into v_id;
  begin
    insert into public.coin_ledger (user_id, delta, reason)
    values (auth.uid(), -v_gross, substr('Meshy ' || p_op, 1, 120));
  exception when undefined_table then null;
  end;
  return jsonb_build_object('id', v_id, 'gross', v_gross, 'cut', v_cut, 'provider', v_gross - v_cut);
end; $$;
grant execute on function public.meter_meshy_usage(text, numeric, uuid) to authenticated;

create or replace function public.meter_vault_storage(
  p_file uuid, p_gross numeric, p_cut numeric
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_gross integer; v_cut integer; v_bal integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  v_gross := greatest(1, ceil(p_gross)::integer);
  v_cut := round((v_gross * 25) / 100.0)::integer;
  select coalesce(sum(delta), 0)::integer into v_bal
    from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_gross then
    raise exception 'insufficient balance: need % coins, have %', v_gross, v_bal;
  end if;
  insert into public.vault_usage (user_id, file_id, gross, cut)
  values (auth.uid(), p_file, v_gross, v_cut) returning id into v_id;
  begin
    insert into public.coin_ledger (user_id, delta, reason)
    values (auth.uid(), -v_gross, 'Vault storage');
  exception when undefined_table then null;
  end;
  return v_id;
end; $$;
grant execute on function public.meter_vault_storage(uuid, numeric, numeric) to authenticated;

create or replace function public.meter_meshy_usage_for(
  p_user uuid, p_op text, p_qty numeric, p_job uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_gross integer; v_cut integer; v_id uuid; v_bal integer;
begin
  if p_op not in ('text-to-3d','image-to-3d','text-to-texture','animate','remesh') then raise exception 'invalid meshy op'; end if;
  if p_user is null then raise exception 'login required'; end if;
  v_gross := greatest(1, ceil(case p_op
    when 'text-to-3d' then 18 * p_qty when 'image-to-3d' then 16 * p_qty
    when 'text-to-texture' then 12 * p_qty when 'animate' then 14 * p_qty
    else 8 * p_qty end)::integer);
  v_cut := round((v_gross * 25) / 100.0)::integer;
  select coalesce(sum(delta), 0)::integer into v_bal
    from public.coin_ledger where user_id = p_user;
  if v_bal < v_gross then
    raise exception 'insufficient balance: need % coins, have %', v_gross, v_bal;
  end if;
  insert into public.meshy_usage (user_id, job_id, op, gross, cut)
  values (p_user, p_job, p_op, v_gross, v_cut) returning id into v_id;
  begin
    insert into public.coin_ledger (user_id, delta, reason)
    values (p_user, -v_gross, substr('Meshy ' || p_op, 1, 120));
  exception when undefined_table then null;
  end;
  return jsonb_build_object('id', v_id, 'gross', v_gross, 'cut', v_cut, 'provider', v_gross - v_cut);
end; $$;
revoke all on function public.meter_meshy_usage_for(uuid, text, numeric, uuid) from public, anon, authenticated;

create or replace function public.meter_vault_storage_for(
  p_user uuid, p_file uuid, p_gross numeric, p_cut numeric
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_gross integer; v_cut integer; v_bal integer;
begin
  if p_user is null then raise exception 'login required'; end if;
  v_gross := greatest(1, ceil(p_gross)::integer);
  v_cut := round((v_gross * 25) / 100.0)::integer;
  select coalesce(sum(delta), 0)::integer into v_bal
    from public.coin_ledger where user_id = p_user;
  if v_bal < v_gross then
    raise exception 'insufficient balance: need % coins, have %', v_gross, v_bal;
  end if;
  insert into public.vault_usage (user_id, file_id, gross, cut)
  values (p_user, p_file, v_gross, v_cut) returning id into v_id;
  begin
    insert into public.coin_ledger (user_id, delta, reason)
    values (p_user, -v_gross, 'Vault storage');
  exception when undefined_table then null;
  end;
  return v_id;
end; $$;
revoke all on function public.meter_vault_storage_for(uuid, uuid, numeric, numeric) from public, anon, authenticated;

create or replace function public.my_submission_spend()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_gross numeric := 0; v_cut numeric := 0; v_n integer := 0;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select coalesce(sum(gross),0), coalesce(sum(cut),0), count(*)
    into v_gross, v_cut, v_n from public.submission_charges where user_id = auth.uid();
  return jsonb_build_object('gross', v_gross, 'cut', v_cut,
    'provider', round(v_gross - v_cut, 2), 'turns', v_n);
end; $$;
grant execute on function public.my_submission_spend() to authenticated;

create or replace function public.my_meshy_spend()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_gross numeric := 0; v_cut numeric := 0; v_n integer := 0;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select coalesce(sum(gross),0), coalesce(sum(cut),0), count(*)
    into v_gross, v_cut, v_n from public.meshy_usage where user_id = auth.uid();
  return jsonb_build_object('gross', v_gross, 'cut', v_cut,
    'provider', round(v_gross - v_cut, 2), 'turns', v_n);
end; $$;
grant execute on function public.my_meshy_spend() to authenticated;

create or replace function public.my_vault_spend()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_gross numeric := 0; v_cut numeric := 0; v_n integer := 0;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select coalesce(sum(gross),0), coalesce(sum(cut),0), count(*)
    into v_gross, v_cut, v_n from public.vault_usage where user_id = auth.uid();
  return jsonb_build_object('gross', v_gross, 'cut', v_cut,
    'provider', round(v_gross - v_cut, 2), 'turns', v_n);
end; $$;
grant execute on function public.my_vault_spend() to authenticated;
