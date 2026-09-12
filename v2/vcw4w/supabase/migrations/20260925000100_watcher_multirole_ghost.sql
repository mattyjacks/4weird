-- ============================================================================
-- Watcher role + multi-role presets + 100-org cap + Ghost Cash (👻💵) + timer.
-- Fully rerunnable: IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS.
--
-- 1. WATCHER; sees everything, changes nothing. Org-scope template with
--    view-only keys. Optionally SCOPED to certain users via org_watch_scopes:
--    no scope rows = whole org; rows = only those targets. Enforced in
--    org_watch_visible() and honored by the Ghost summary RPC.
-- 2. MULTI-ROLE presets; org_member_roles lets one user hold several
--    templates at once (e.g. Banker + Watcher, or Lord + Banker), different
--    per org (org_id is in the key). Effective power = UNION of the legacy
--    single role_key and every junction row (has_org_perm upgraded below;
--    team/project fallbacks inherit through it with no other changes).
-- 3. ORG CAP; one user may join at most 100 orgs (trigger; generous enough
--    to never bind a real community, strict enough to bound fan-out reads).
--    Different org = different bosses: memberships stay fully per-org.
-- 4. GHOST CASH (👻💵); a centrally-controlled HYPOTHETICAL unit with NO
--    legal value, NO cash-out, NO store of value. It only measures who owes
--    whom inside an org (e.g. marketer owes freelancer for hours worked).
--    Completely separate tables from Vibe Coins; no trigger, view, or RPC
--    below touches coin_ledger, org wallets, or any money path. Amounts are
--    tracked to the second via timer heartbeats (rate/hr × seconds/3600).
--    Activity proof = visible-tab heartbeat beats + optional worker-attached
--    screenshot proofs (manual uploads, ≤1 MB, like clan images). We never
--    capture anyone's screen: proof is supplied by the worker, not taken.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Watcher template + scoped watch targets.
-- --------------------------------------------------------------------------
alter table public.role_templates drop constraint if exists role_templates_key_check;
alter table public.role_templates
  add constraint role_templates_key_check check (key in (
    'owner', 'admin', 'maintainer', 'developer', 'viewer', 'billing', 'security',
    'lord', 'captain', 'infantry', 'banker', 'banker_readonly', 'watcher'
  ));

alter table public.org_members drop constraint if exists org_members_role_key_check;
alter table public.org_members
  add constraint org_members_role_key_check check (
    role_key in ('owner', 'admin', 'billing', 'security', 'viewer', 'lord', 'banker', 'banker_readonly', 'watcher')
    or role_key = 'custom'
  );

insert into public.role_templates (key, scope, label, permissions) values
  ('watcher','org','Watcher', array[
    'org.view','org.members.view','org.roles.view',
    'org.billing.view','org.audit.view',
    'team.view','team.members.view','team.roles.view',
    'project.view','project.code.view','project.issues.view',
    'cloud.catalog.view','cloud.usage.view',
    'rooms.view',
    'security.devices.view','security.audit.view','security.reports.view'])
on conflict (key) do update set scope = excluded.scope, label = excluded.label, permissions = excluded.permissions, is_default = true;

-- Scoped watching: which org members this watcher may observe. NO rows for a
-- watcher = whole org. Rows = restricted to exactly those targets.
create table if not exists public.org_watch_scopes (
  org_id uuid not null references public.orgs(id) on delete cascade,
  watcher_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (org_id, watcher_id, target_user_id),
  check (watcher_id <> target_user_id)
);
alter table public.org_watch_scopes enable row level security;
drop policy if exists watch_scopes_read on public.org_watch_scopes;
create policy watch_scopes_read on public.org_watch_scopes
  for select to authenticated using (public.is_org_member(org_id));

-- --------------------------------------------------------------------------
-- 2. Multi-role presets: several templates per user per org (union power).
-- --------------------------------------------------------------------------
create table if not exists public.org_member_roles (
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_key text not null,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id, role_key)
);
alter table public.org_member_roles enable row level security;
drop policy if exists member_roles_read on public.org_member_roles;
create policy member_roles_read on public.org_member_roles
  for select to authenticated using (public.is_org_member(org_id));

-- Every template key a user holds in this org (legacy single + junction).
create or replace function public.org_roles_of(p_org uuid, p_user uuid)
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct k), '{}') from (
    select m.role_key as k from public.org_members m
    where m.org_id = p_org and m.user_id = p_user and m.role_key <> 'custom'
    union
    select r.role_key as k from public.org_member_roles r
    where r.org_id = p_org and r.user_id = p_user
  ) s;
$$;

-- has_org_perm, upgraded: UNION of legacy role + junction presets. (Same
-- signature/semantics as the teams bundle + rls-recursion fix; team and
-- project fallbacks inherit through this single choke point.)
create or replace function public.has_org_perm(p_org uuid, p_perm text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare m record; k text;
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.orgs o where o.id = p_org and o.owner_id = auth.uid()) then return true; end if;
  select m.role_key, m.custom_role_id into m from public.org_members m
    where m.org_id = p_org and m.user_id = auth.uid();
  if not found then return false; end if;
  if p_perm = any (public.effective_perms(m.role_key, m.custom_role_id)) then return true; end if;
  for k in select r.role_key from public.org_member_roles r
    where r.org_id = p_org and r.user_id = auth.uid()
  loop
    if p_perm = any (public.effective_perms(k, null)) then return true; end if;
  end loop;
  return false;
end; $$;

-- my_team_perms, upgraded: org fallback unions the junction too, so the
-- "presented simply" UI lights up preset powers correctly.
create or replace function public.my_team_perms(p_team uuid)
returns text[] language plpgsql security definer set search_path = public as $$
declare m record; v_org uuid; v_perms text[] := '{}'; k text;
begin
  if auth.uid() is null then return '{}'; end if;
  select t.org_id into v_org from public.teams t where t.id = p_team;
  if v_org is null then return '{}'; end if;
  if exists (select 1 from public.orgs o where o.id = v_org and o.owner_id = auth.uid()) then
    return array(select key from public.permission_catalog);
  end if;
  select m.role_key, m.custom_role_id into m from public.team_members m
  where m.team_id = p_team and m.user_id = auth.uid();
  if found then return public.effective_perms(m.role_key, m.custom_role_id); end if;
  select m.role_key, m.custom_role_id into m from public.org_members m
  where m.org_id = v_org and m.user_id = auth.uid();
  if found then v_perms := public.effective_perms(m.role_key, m.custom_role_id); end if;
  for k in select r.role_key from public.org_member_roles r
    where r.org_id = v_org and r.user_id = auth.uid()
  loop
    v_perms := array(select distinct unnest(v_perms || public.effective_perms(k, null)));
  end loop;
  return v_perms;
end; $$;

-- Assign a preset bundle (1..5 templates) to a member. Replaces the junction
-- set wholesale; the legacy single role_key is untouched (union semantics).
create or replace function public.set_member_roles(p_org uuid, p_user uuid, p_roles text[])
returns text[] language plpgsql security definer set search_path = public as $$
declare v_roles text[] := coalesce(p_roles, '{}'); r text;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.has_org_perm(p_org, 'org.members.change_role') then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.org_members where org_id = p_org and user_id = p_user) then
    raise exception 'not a member';
  end if;
  if array_length(v_roles, 1) is null or array_length(v_roles, 1) > 5 then
    raise exception 'give 1..5 roles';
  end if;
  for r in select distinct unnest(v_roles) loop
    if not exists (select 1 from public.role_templates t where t.key = r) then
      raise exception 'unknown role: %', r;
    end if;
  end loop;
  delete from public.org_member_roles where org_id = p_org and user_id = p_user;
  insert into public.org_member_roles (org_id, user_id, role_key, assigned_by)
  select p_org, p_user, distinct_r, auth.uid() from (select distinct unnest(v_roles) as distinct_r) s;
  return public.org_roles_of(p_org, p_user);
end; $$;
revoke all on function public.set_member_roles(uuid, uuid, text[]) from public, anon;
grant execute on function public.set_member_roles(uuid, uuid, text[]) to authenticated;

-- Scoped-watch management (same change_role gate as member roles).
create or replace function public.set_watch_scope(p_org uuid, p_watcher uuid, p_targets uuid[])
returns integer language plpgsql security definer set search_path = public as $$
declare t uuid; v_n integer := 0;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.has_org_perm(p_org, 'org.members.change_role') then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.org_members where org_id = p_org and user_id = p_watcher) then
    raise exception 'watcher is not a member';
  end if;
  delete from public.org_watch_scopes where org_id = p_org and watcher_id = p_watcher;
  for t in select distinct unnest(coalesce(p_targets, '{}')) loop
    if t = p_watcher then raise exception 'cannot watch yourself'; end if;
    if not exists (select 1 from public.org_members where org_id = p_org and user_id = t) then
      raise exception 'target is not a member';
    end if;
    insert into public.org_watch_scopes (org_id, watcher_id, target_user_id, created_by)
    values (p_org, p_watcher, t, auth.uid())
    on conflict do nothing;
    v_n := v_n + 1;
  end loop;
  return v_n;
end; $$;
revoke all on function public.set_watch_scope(uuid, uuid, uuid[]) from public, anon;
grant execute on function public.set_watch_scope(uuid, uuid, uuid[]) to authenticated;

-- May the caller observe this member? Owners + unscoped watchers see all;
-- scoped watchers see only their targets. (Non-watchers: not their business
-- via THIS helper; normal member reads use the table RLS policies.)
create or replace function public.org_watch_visible(p_org uuid, p_target uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_roles text[];
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.orgs o where o.id = p_org and o.owner_id = auth.uid()) then return true; end if;
  v_roles := public.org_roles_of(p_org, auth.uid());
  if not ('watcher' = any (v_roles)) then return false; end if;
  if not exists (select 1 from public.org_watch_scopes where org_id = p_org and watcher_id = auth.uid()) then
    return true;
  end if;
  return exists (select 1 from public.org_watch_scopes
    where org_id = p_org and watcher_id = auth.uid() and target_user_id = p_target);
end; $$;

-- --------------------------------------------------------------------------
-- 3. One user, at most 100 orgs. Different org, different bosses; the cap
--    only bounds fan-out, never choice.
-- --------------------------------------------------------------------------
create or replace function public.enforce_org_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  select count(*) into v_n from public.org_members where user_id = new.user_id;
  if v_n >= 100 then raise exception 'organization limit reached (100 per user)'; end if;
  return new;
end; $$;
drop trigger if exists trg_org_members_count on public.org_members;
create trigger trg_org_members_count before insert on public.org_members
  for each row execute function public.enforce_org_count();

-- --------------------------------------------------------------------------
-- 4. Ghost Cash (👻💵): hypothetical IOU unit. NO legal value, NO cash-out,
--    NO store of value; a ruler for debts, not money. Separate tables only.
-- --------------------------------------------------------------------------
create table if not exists public.ghost_contracts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  title varchar(120) not null check (char_length(trim(title)) between 2 and 120),
  worker_id uuid not null references public.profiles(id) on delete cascade,
  payer_id uuid not null references public.profiles(id) on delete cascade,
  rate_ghost numeric(12, 2) not null check (rate_ghost >= 0 and rate_ghost <= 100000000),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (worker_id <> payer_id)
);
create index if not exists idx_ghost_contracts_org on public.ghost_contracts (org_id, created_at desc);

-- Timer sessions, tracked to the second. active_seconds grows ONLY through
-- ghost_beat() heartbeats (visible-tab seconds the worker's client reports);
-- beats/total_beats give the work-diary activity score. clock_out freezes.
create table if not exists public.ghost_timers (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.ghost_contracts(id) on delete cascade,
  worker_id uuid not null references public.profiles(id) on delete cascade,
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  active_seconds integer not null default 0 check (active_seconds >= 0 and active_seconds <= 315360000),
  beats integer not null default 0,
  total_beats integer not null default 0,
  note varchar(500) not null default '',
  created_at timestamptz not null default now(),
  check (clock_out is null or clock_out > clock_in),
  check (beats <= total_beats)
);
create index if not exists idx_ghost_timers_contract on public.ghost_timers (contract_id, clock_in desc);
create index if not exists idx_ghost_timers_open on public.ghost_timers (worker_id, contract_id) where clock_out is null;

-- Worker-attached proof screenshots (manual uploads ≤1 MB; we never capture
-- screens; proof is supplied, not taken).
create table if not exists public.ghost_proofs (
  id uuid primary key default gen_random_uuid(),
  timer_id uuid not null references public.ghost_timers(id) on delete cascade,
  worker_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  sha256 char(64) not null,
  bytes integer not null check (bytes > 0 and bytes <= 1048576),
  mime text not null check (mime in ('image/png', 'image/jpeg', 'image/webp', 'image/gif')),
  caption varchar(140) not null default '',
  created_at timestamptz not null default now()
);

-- Debts: payer owes worker. Owed amounts are hypothetical Ghost Cash.
create table if not exists public.ghost_debts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  contract_id uuid references public.ghost_contracts(id) on delete set null,
  timer_id uuid references public.ghost_timers(id) on delete set null,
  debtor_id uuid not null references public.profiles(id) on delete cascade,
  creditor_id uuid not null references public.profiles(id) on delete cascade,
  amount_ghost numeric(12, 2) not null check (amount_ghost > 0 and amount_ghost <= 100000000),
  reason varchar(240) not null check (char_length(trim(reason)) between 2 and 240),
  status text not null default 'owed' check (status in ('owed', 'settled', 'void')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (debtor_id <> creditor_id)
);
create index if not exists idx_ghost_debts_org on public.ghost_debts (org_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('ghost-proofs', 'ghost-proofs', true)
on conflict (id) do update set public = excluded.public;

alter table public.ghost_contracts enable row level security;
alter table public.ghost_timers enable row level security;
alter table public.ghost_proofs enable row level security;
alter table public.ghost_debts enable row level security;

-- Org members read their org's ghost books (watchers included; reading is
-- the whole point of watching). Writes go through the RPCs below.
drop policy if exists ghost_contracts_read on public.ghost_contracts;
create policy ghost_contracts_read on public.ghost_contracts
  for select to authenticated using (public.is_org_member(org_id));
drop policy if exists ghost_timers_read on public.ghost_timers;
create policy ghost_timers_read on public.ghost_timers
  for select to authenticated using (
    exists (select 1 from public.ghost_contracts c where c.id = contract_id and public.is_org_member(c.org_id))
  );
drop policy if exists ghost_proofs_read on public.ghost_proofs;
create policy ghost_proofs_read on public.ghost_proofs
  for select to authenticated using (
    exists (select 1 from public.ghost_timers t join public.ghost_contracts c on c.id = t.contract_id
      where t.id = timer_id and public.is_org_member(c.org_id))
  );
drop policy if exists ghost_debts_read on public.ghost_debts;
create policy ghost_debts_read on public.ghost_debts
  for select to authenticated using (public.is_org_member(org_id));

-- --------------------------------------------------------------------------
-- 5. Ghost RPCs (all definer; membership checked inside).
-- --------------------------------------------------------------------------
create or replace function public.ghost_create_contract(p_org uuid, p_title text, p_worker uuid, p_payer uuid, p_rate numeric)
returns public.ghost_contracts language plpgsql security definer set search_path = public as $$
declare v_row public.ghost_contracts;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.has_org_perm(p_org, 'org.members.invite') then raise exception 'forbidden'; end if;
  if char_length(trim(coalesce(p_title, ''))) < 2 then raise exception 'title too short'; end if;
  if p_rate is null or p_rate < 0 or p_rate > 100000000 then raise exception 'invalid rate'; end if;
  if p_worker = p_payer then raise exception 'worker and payer differ'; end if;
  if not exists (select 1 from public.org_members where org_id = p_org and user_id = p_worker) then
    raise exception 'worker is not a member';
  end if;
  if not exists (select 1 from public.org_members where org_id = p_org and user_id = p_payer) then
    raise exception 'payer is not a member';
  end if;
  insert into public.ghost_contracts (org_id, title, worker_id, payer_id, rate_ghost, created_by)
  values (p_org, trim(p_title), p_worker, p_payer, p_rate, auth.uid())
  returning * into v_row;
  return v_row;
end; $$;
revoke all on function public.ghost_create_contract(uuid, text, uuid, uuid, numeric) from public, anon;
grant execute on function public.ghost_create_contract(uuid, text, uuid, uuid, numeric) to authenticated;

-- Clock in: only the contract worker; one open timer per worker per org
-- (server efficiency: no overlapping sessions to reconcile).
create or replace function public.ghost_clock_in(p_contract uuid, p_note text)
returns public.ghost_timers language plpgsql security definer set search_path = public as $$
declare v_c public.ghost_contracts; v_row public.ghost_timers;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select * into v_c from public.ghost_contracts where id = p_contract;
  if not found then raise exception 'unknown contract'; end if;
  if v_c.status <> 'open' then raise exception 'contract is closed'; end if;
  if v_c.worker_id <> auth.uid() then raise exception 'only the worker clocks in'; end if;
  if exists (
    select 1 from public.ghost_timers t join public.ghost_contracts c on c.id = t.contract_id
    where t.worker_id = auth.uid() and t.clock_out is null and c.org_id = v_c.org_id
  ) then raise exception 'a timer is already running'; end if;
  insert into public.ghost_timers (contract_id, worker_id, note)
  values (p_contract, auth.uid(), substr(trim(coalesce(p_note, '')), 1, 500))
  returning * into v_row;
  return v_row;
end; $$;
revoke all on function public.ghost_clock_in(uuid, text) from public, anon;
grant execute on function public.ghost_clock_in(uuid, text) to authenticated;

-- Heartbeat: visible-tab active seconds accumulate (0..300/beat). One UPDATE.
create or replace function public.ghost_beat(p_timer uuid, p_active_seconds integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row public.ghost_timers;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_active_seconds is null or p_active_seconds < 0 or p_active_seconds > 300 then
    raise exception 'active seconds must be 0..300';
  end if;
  update public.ghost_timers
  set active_seconds = active_seconds + p_active_seconds,
      beats = beats + case when p_active_seconds > 0 then 1 else 0 end,
      total_beats = total_beats + 1
  where id = p_timer and worker_id = auth.uid() and clock_out is null
  returning * into v_row;
  if not found then raise exception 'no open timer'; end if;
  return jsonb_build_object(
    'active_seconds', v_row.active_seconds,
    'beats', v_row.beats, 'total_beats', v_row.total_beats,
    'activity_pct', case when v_row.total_beats = 0 then 0
      else round((v_row.beats::numeric * 100) / v_row.total_beats) end
  );
end; $$;
revoke all on function public.ghost_beat(uuid, integer) from public, anon;
grant execute on function public.ghost_beat(uuid, integer) to authenticated;

create or replace function public.ghost_clock_out(p_timer uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row public.ghost_timers; v_rate numeric(12, 2);
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  update public.ghost_timers
  set clock_out = now()
  where id = p_timer and worker_id = auth.uid() and clock_out is null
  returning * into v_row;
  if not found then raise exception 'no open timer'; end if;
  select rate_ghost into v_rate from public.ghost_contracts where id = v_row.contract_id;
  return jsonb_build_object(
    'active_seconds', v_row.active_seconds,
    'hours', round((v_row.active_seconds::numeric) / 3600, 4),
    'beats', v_row.beats, 'total_beats', v_row.total_beats,
    'earned_ghost', round(coalesce(v_rate, 0) * v_row.active_seconds / 3600.0, 2)
  );
end; $$;
revoke all on function public.ghost_clock_out(uuid) from public, anon;
grant execute on function public.ghost_clock_out(uuid) to authenticated;

-- Invoice a finished timer: payer owes worker rate × tracked seconds.
create or replace function public.ghost_invoice_timer(p_timer uuid)
returns public.ghost_debts language plpgsql security definer set search_path = public as $$
declare v_t public.ghost_timers; v_c public.ghost_contracts; v_amount numeric(12, 2); v_row public.ghost_debts;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select * into v_t from public.ghost_timers where id = p_timer;
  if not found then raise exception 'unknown timer'; end if;
  if v_t.clock_out is null then raise exception 'timer still running'; end if;
  select * into v_c from public.ghost_contracts where id = v_t.contract_id;
  if v_c.worker_id <> auth.uid() and v_c.created_by <> auth.uid()
    and not public.has_org_perm(v_c.org_id, 'org.billing.view') then
    raise exception 'forbidden';
  end if;
  if exists (select 1 from public.ghost_debts where timer_id = p_timer and status = 'owed') then
    raise exception 'already invoiced';
  end if;
  v_amount := round(v_c.rate_ghost * v_t.active_seconds / 3600.0, 2);
  if v_amount <= 0 then raise exception 'nothing tracked'; end if;
  insert into public.ghost_debts (org_id, contract_id, timer_id, debtor_id, creditor_id, amount_ghost, reason, created_by)
  values (v_c.org_id, v_c.id, p_timer, v_c.payer_id, v_c.worker_id, v_amount,
    substr('Timer ' || round((v_t.active_seconds::numeric) / 3600, 2) || 'h @ ' || v_c.rate_ghost || ' 👻💵/h', 1, 240),
    auth.uid())
  returning * into v_row;
  return v_row;
end; $$;
revoke all on function public.ghost_invoice_timer(uuid) from public, anon;
grant execute on function public.ghost_invoice_timer(uuid) to authenticated;

-- Mark an arbitrary amount owed (any member can record; honesty is social,
-- void/settle rights are restricted below).
create or replace function public.ghost_mark_debt(p_org uuid, p_debtor uuid, p_creditor uuid, p_amount numeric, p_reason text)
returns public.ghost_debts language plpgsql security definer set search_path = public as $$
declare v_row public.ghost_debts;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.is_org_member(p_org) then raise exception 'forbidden'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000000 then raise exception 'invalid amount'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 2 then raise exception 'reason too short'; end if;
  if p_debtor = p_creditor then raise exception 'debtor and creditor differ'; end if;
  if not exists (select 1 from public.org_members where org_id = p_org and user_id = p_debtor) then
    raise exception 'debtor is not a member';
  end if;
  if not exists (select 1 from public.org_members where org_id = p_org and user_id = p_creditor) then
    raise exception 'creditor is not a member';
  end if;
  insert into public.ghost_debts (org_id, debtor_id, creditor_id, amount_ghost, reason, created_by)
  values (p_org, p_debtor, p_creditor, round(p_amount, 2), trim(p_reason), auth.uid())
  returning * into v_row;
  return v_row;
end; $$;
revoke all on function public.ghost_mark_debt(uuid, uuid, uuid, numeric, text) from public, anon;
grant execute on function public.ghost_mark_debt(uuid, uuid, uuid, numeric, text) to authenticated;

-- Settle/void: the two parties, or finance power (banker/lord/owner).
create or replace function public.ghost_settle_debt(p_debt uuid, p_status text)
returns public.ghost_debts language plpgsql security definer set search_path = public as $$
declare v_row public.ghost_debts;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_status not in ('settled', 'void') then raise exception 'invalid status'; end if;
  select * into v_row from public.ghost_debts where id = p_debt;
  if not found then raise exception 'unknown debt'; end if;
  if v_row.status <> 'owed' then raise exception 'already closed'; end if;
  if auth.uid() <> v_row.debtor_id and auth.uid() <> v_row.creditor_id
    and not public.has_org_perm(v_row.org_id, 'org.wallet.spend') then
    raise exception 'forbidden';
  end if;
  update public.ghost_debts set status = p_status where id = p_debt returning * into v_row;
  return v_row;
end; $$;
revoke all on function public.ghost_settle_debt(uuid, text) from public, anon;
grant execute on function public.ghost_settle_debt(uuid, text) to authenticated;

-- Roster for rank management UIs: every member with display name, full role
-- set (legacy + presets), and each watcher's current scope targets.
create or replace function public.org_roster(p_org uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.is_org_member(p_org) then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'members', (
      select coalesce(jsonb_agg(t order by t.display_name), '[]'::jsonb) from (
        select m.user_id as id,
          coalesce(p.display_name, p.public_handle, 'member') as display_name,
          public.org_roles_of(p_org, m.user_id) as roles
        from public.org_members m left join public.profiles p on p.id = m.user_id
        where m.org_id = p_org limit 500
      ) t
    ),
    'scopes', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select watcher_id, array_agg(target_user_id) as targets
        from public.org_watch_scopes where org_id = p_org
        group by watcher_id limit 200
      ) t
    )
  );
end; $$;
revoke all on function public.org_roster(uuid) from public, anon;
grant execute on function public.org_roster(uuid) to authenticated;

-- One-round-trip book for the /timer page: contracts, open timers, debts,
-- and net balances. Scoped watchers see only rows touching their targets.
create or replace function public.ghost_org_summary(p_org uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_scoped boolean := false; v_targets uuid[];
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.is_org_member(p_org) then raise exception 'forbidden'; end if;
  if 'watcher' = any (public.org_roles_of(p_org, auth.uid()))
    and exists (select 1 from public.org_watch_scopes where org_id = p_org and watcher_id = auth.uid()) then
    v_scoped := true;
    select array_agg(target_user_id) into v_targets from public.org_watch_scopes
    where org_id = p_org and watcher_id = auth.uid();
  end if;
  return jsonb_build_object(
    'members', (
      select coalesce(jsonb_agg(t order by t.display_name), '[]'::jsonb) from (
        select m.user_id as id,
          coalesce(p.display_name, p.public_handle, 'member') as display_name,
          public.org_roles_of(p_org, m.user_id) as roles
        from public.org_members m left join public.profiles p on p.id = m.user_id
        where m.org_id = p_org
          and (not v_scoped or m.user_id = any (v_targets) or m.user_id = auth.uid())
        limit 500
      ) t
    ),
    'contracts', (
      select coalesce(jsonb_agg(t order by t.created_at desc), '[]'::jsonb) from (
        select c.*, public.org_roles_of(p_org, c.worker_id) as worker_roles
        from public.ghost_contracts c where c.org_id = p_org limit 100
      ) t
    ),
    'open_timers', (
      select coalesce(jsonb_agg(t order by t.clock_in desc), '[]'::jsonb) from (
        select t.* from public.ghost_timers t
        join public.ghost_contracts c on c.id = t.contract_id
        where c.org_id = p_org and t.clock_out is null
          and (not v_scoped or t.worker_id = any (v_targets))
        limit 100
      ) t
    ),
    'debts', (
      select coalesce(jsonb_agg(t order by t.created_at desc), '[]'::jsonb) from (
        select d.* from public.ghost_debts d
        where d.org_id = p_org
          and (not v_scoped or d.debtor_id = any (v_targets) or d.creditor_id = any (v_targets))
        limit 200
      ) t
    ),
    'balances', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select u as user_id,
          coalesce(sum(case when d.creditor_id = u then d.amount_ghost else 0 end), 0) as owed_to_me,
          coalesce(sum(case when d.debtor_id = u then d.amount_ghost else 0 end), 0) as i_owe
        from (select distinct unnest(array[d.debtor_id, d.creditor_id]) as u from public.ghost_debts d
          where d.org_id = p_org and d.status = 'owed'
            and (not v_scoped or d.debtor_id = any (v_targets) or d.creditor_id = any (v_targets))) s
        join public.ghost_debts d on d.org_id = p_org and d.status = 'owed'
          and (d.debtor_id = s.u or d.creditor_id = s.u)
          and (not v_scoped or d.debtor_id = any (v_targets) or d.creditor_id = any (v_targets))
        group by u
      ) t
    )
  );
end; $$;
revoke all on function public.ghost_org_summary(uuid) from public, anon;
grant execute on function public.ghost_org_summary(uuid) to authenticated;
