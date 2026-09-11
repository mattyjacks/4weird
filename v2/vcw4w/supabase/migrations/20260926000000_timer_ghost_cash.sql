-- ============================================================================
-- 4weird Timer & Work Diary - Ghost Cash (👻💵) Debt Ledger & Screen Proofs
--
-- Adds:
--  * timer_projects: projects with Ghost Cash hourly rate (ghost_rate), budget, org attribution
--  * timer_entries: duration down to the second, ghost_cash_owed, activity metrics
--  * timer_debts: debts owed between org members / contractors in Ghost Cash (mark settled/forgiven)
--  * timer_screenshots: periodic Upwork-style work diary screen captures with privacy flags
--
-- Rerunnable: IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Tables
-- --------------------------------------------------------------------------

create table if not exists public.timer_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  org_id uuid null references public.orgs(id) on delete set null,
  team_id uuid null references public.teams(id) on delete set null,
  client_id uuid null references public.profiles(id) on delete set null,
  name varchar(100) not null check (char_length(name) between 1 and 100),
  color char(7) not null default '#3b82f6' check (color ~ '^#[0-9a-fA-F]{6}$'),
  ghost_rate numeric(12, 2) not null default 0.00 check (ghost_rate >= 0),
  budget_hours numeric(10, 2) null check (budget_hours is null or budget_hours >= 0),
  is_billable boolean not null default true,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_timer_projects_user on public.timer_projects (user_id);
create index if not exists idx_timer_projects_org on public.timer_projects (org_id);

drop trigger if exists trg_timer_projects_updated on public.timer_projects;
create trigger trg_timer_projects_updated before update on public.timer_projects
  for each row execute function public.handle_updated_at();

create table if not exists public.timer_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid null references public.timer_projects(id) on delete set null,
  debtor_id uuid null references public.profiles(id) on delete set null, -- person or org who owes the ghost cash
  org_id uuid null references public.orgs(id) on delete set null,
  description text null check (description is null or char_length(description) <= 2000),
  start_time timestamptz not null default now(),
  end_time timestamptz null,
  duration integer null check (duration is null or duration >= 0), -- exact seconds
  is_billable boolean not null default true,
  is_running boolean not null default false,
  ghost_rate numeric(12, 2) not null default 0.00 check (ghost_rate >= 0),
  ghost_cash_owed numeric(14, 4) not null default 0.0000 check (ghost_cash_owed >= 0),
  activity_score integer not null default 100 check (activity_score between 0 and 100), -- Upwork-like % activity
  upwork_sync_mode boolean not null default false, -- runs in dual-timer mode alongside official Upwork app
  upwork_contract_id varchar(100) null check (upwork_contract_id is null or char_length(upwork_contract_id) <= 100),
  upwork_memo varchar(200) null check (upwork_memo is null or char_length(upwork_memo) <= 200),
  tags text null check (tags is null or char_length(tags) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_timer_entries_user on public.timer_entries (user_id);
create index if not exists idx_timer_entries_project on public.timer_entries (project_id);
create index if not exists idx_timer_entries_running on public.timer_entries (user_id, is_running);

drop trigger if exists trg_timer_entries_updated on public.timer_entries;
create trigger trg_timer_entries_updated before update on public.timer_entries
  for each row execute function public.handle_updated_at();

create table if not exists public.timer_screenshots (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.timer_entries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  is_blurred boolean not null default false,
  activity_level integer not null default 100 check (activity_level between 0 and 100),
  memo varchar(200) null check (memo is null or char_length(memo) <= 200),
  captured_at timestamptz not null default now()
);
create index if not exists idx_timer_screenshots_entry on public.timer_screenshots (entry_id);

create table if not exists public.timer_debts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid null references public.orgs(id) on delete cascade,
  project_id uuid null references public.timer_projects(id) on delete set null,
  creditor_id uuid not null references public.profiles(id) on delete cascade, -- who worked and is owed Ghost Cash
  debtor_id uuid not null references public.profiles(id) on delete cascade,   -- who owes the Ghost Cash
  amount_ghost_cash numeric(14, 4) not null check (amount_ghost_cash > 0),
  status text not null default 'pending' check (status in ('pending', 'settled', 'forgiven')),
  memo varchar(300) not null default '' check (char_length(memo) <= 300),
  settled_at timestamptz null,
  settled_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_timer_debts_creditor on public.timer_debts (creditor_id);
create index if not exists idx_timer_debts_debtor on public.timer_debts (debtor_id);
create index if not exists idx_timer_debts_org on public.timer_debts (org_id);

drop trigger if exists trg_timer_debts_updated on public.timer_debts;
create trigger trg_timer_debts_updated before update on public.timer_debts
  for each row execute function public.handle_updated_at();

-- --------------------------------------------------------------------------
-- 2. Seed Permissions
-- --------------------------------------------------------------------------

insert into public.permission_catalog (key, grp, label, blurb) values
  ('org.timer.view', 'org', 'View timer & debts', 'View work diaries, logged hours, and Ghost Cash balances'),
  ('org.timer.manage', 'org', 'Manage timer & rates', 'Create projects, set Ghost Cash hourly rates, manage entries'),
  ('org.timer.settle', 'org', 'Settle Ghost debts', 'Mark Ghost Cash contractor debts as settled or forgiven')
on conflict (key) do update set grp = excluded.grp, label = excluded.label, blurb = excluded.blurb;

-- --------------------------------------------------------------------------
-- 3. RLS
-- --------------------------------------------------------------------------

alter table public.timer_projects enable row level security;
alter table public.timer_entries enable row level security;
alter table public.timer_screenshots enable row level security;
alter table public.timer_debts enable row level security;

-- timer_projects
drop policy if exists timer_projects_select on public.timer_projects;
create policy timer_projects_select on public.timer_projects
  for select using (
    user_id = auth.uid() or
    client_id = auth.uid() or
    (org_id is not null and exists (
      select 1 from public.org_members m where m.org_id = timer_projects.org_id and m.user_id = auth.uid()
    ))
  );

drop policy if exists timer_projects_modify on public.timer_projects;
create policy timer_projects_modify on public.timer_projects
  for all using (
    user_id = auth.uid() or
    (org_id is not null and exists (
      select 1 from public.org_members m
      where m.org_id = timer_projects.org_id
        and m.user_id = auth.uid()
        and m.role_key in ('owner', 'admin', 'lord', 'banker')
    ))
  );

-- timer_entries
drop policy if exists timer_entries_select on public.timer_entries;
create policy timer_entries_select on public.timer_entries
  for select using (
    user_id = auth.uid() or
    debtor_id = auth.uid() or
    (org_id is not null and exists (
      select 1 from public.org_members m where m.org_id = timer_entries.org_id and m.user_id = auth.uid()
    ))
  );

drop policy if exists timer_entries_modify on public.timer_entries;
create policy timer_entries_modify on public.timer_entries
  for all using (user_id = auth.uid());

-- timer_screenshots
drop policy if exists timer_screenshots_select on public.timer_screenshots;
create policy timer_screenshots_select on public.timer_screenshots
  for select using (
    user_id = auth.uid() or
    exists (
      select 1 from public.timer_entries e
      where e.id = timer_screenshots.entry_id
        and (
          e.debtor_id = auth.uid() or
          (e.org_id is not null and exists (
            select 1 from public.org_members m where m.org_id = e.org_id and m.user_id = auth.uid()
          ))
        )
    )
  );

drop policy if exists timer_screenshots_modify on public.timer_screenshots;
create policy timer_screenshots_modify on public.timer_screenshots
  for all using (user_id = auth.uid());

-- timer_debts
drop policy if exists timer_debts_select on public.timer_debts;
create policy timer_debts_select on public.timer_debts
  for select using (
    creditor_id = auth.uid() or
    debtor_id = auth.uid() or
    (org_id is not null and exists (
      select 1 from public.org_members m where m.org_id = timer_debts.org_id and m.user_id = auth.uid()
    ))
  );

-- --------------------------------------------------------------------------
-- 4. RPCs: start_timer, stop_timer, settle_ghost_debt
-- --------------------------------------------------------------------------

create or replace function public.start_timer(
  p_project_id uuid default null,
  p_debtor_id uuid default null,
  p_description text default null,
  p_is_billable boolean default true,
  p_upwork_sync_mode boolean default false,
  p_upwork_contract_id text default null,
  p_upwork_memo text default null
)
returns public.timer_entries
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_running public.timer_entries;
  v_rate numeric(12,2) := 0.00;
  v_org_id uuid := null;
  v_new public.timer_entries;
begin
  if v_uid is null then
    raise exception 'Login required.' using errcode = 'P0001';
  end if;

  select * into v_running from public.timer_entries
  where user_id = v_uid and is_running = true limit 1;

  if v_running.id is not null then
    raise exception 'A timer is already running. Please stop it first.' using errcode = 'P0001';
  end if;

  if p_project_id is not null then
    select ghost_rate, org_id into v_rate, v_org_id
    from public.timer_projects
    where id = p_project_id;
  end if;

  insert into public.timer_entries (
    user_id, project_id, debtor_id, org_id,
    description, start_time, is_running,
    is_billable, ghost_rate, ghost_cash_owed,
    upwork_sync_mode, upwork_contract_id, upwork_memo
  ) values (
    v_uid, p_project_id, p_debtor_id, v_org_id,
    p_description, now(), true,
    coalesce(p_is_billable, true), coalesce(v_rate, 0.00), 0.0000,
    coalesce(p_upwork_sync_mode, false), p_upwork_contract_id, p_upwork_memo
  ) returning * into v_new;

  return v_new;
end;
$$;

create or replace function public.stop_timer(
  p_entry_id uuid,
  p_description text default null,
  p_project_id uuid default null,
  p_is_billable boolean default null,
  p_activity_score integer default null
)
returns public.timer_entries
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_entry public.timer_entries;
  v_duration integer;
  v_rate numeric(12,2);
  v_owed numeric(14,4) := 0.0000;
  v_end timestamptz := now();
  v_proj_id uuid;
  v_billable boolean;
  v_desc text;
  v_act integer;
begin
  if v_uid is null then
    raise exception 'Login required.' using errcode = 'P0001';
  end if;

  select * into v_entry from public.timer_entries
  where id = p_entry_id and user_id = v_uid;

  if v_entry.id is null then
    raise exception 'Timer entry not found.' using errcode = 'P0001';
  end if;

  if not v_entry.is_running then
    return v_entry;
  end if;

  v_proj_id := coalesce(p_project_id, v_entry.project_id);
  v_billable := coalesce(p_is_billable, v_entry.is_billable);
  v_desc := coalesce(p_description, v_entry.description);
  v_act := coalesce(p_activity_score, v_entry.activity_score, 100);

  if v_proj_id is not null then
    select ghost_rate into v_rate from public.timer_projects where id = v_proj_id;
  else
    v_rate := v_entry.ghost_rate;
  end if;

  v_duration := greatest(1, floor(extract(epoch from (v_end - v_entry.start_time)))::integer);

  if v_billable and v_rate > 0 then
    -- exact to 4 decimal places: (seconds / 3600) * rate
    v_owed := round(((v_duration::numeric / 3600.0) * v_rate), 4);
  else
    v_owed := 0.0000;
  end if;

  update public.timer_entries
  set
    end_time = v_end,
    duration = v_duration,
    is_running = false,
    project_id = v_proj_id,
    is_billable = v_billable,
    description = v_desc,
    ghost_rate = coalesce(v_rate, 0.00),
    ghost_cash_owed = v_owed,
    activity_score = v_act,
    updated_at = v_end
  where id = p_entry_id
  returning * into v_entry;

  -- If billable and owes ghost cash to debtor / org, record pending debt ledger row
  if v_owed > 0 and (v_entry.debtor_id is not null or v_entry.org_id is not null) then
    insert into public.timer_debts (
      org_id, project_id, creditor_id, debtor_id,
      amount_ghost_cash, status, memo
    ) values (
      v_entry.org_id,
      v_entry.project_id,
      v_uid,
      coalesce(v_entry.debtor_id, v_uid),
      v_owed,
      'pending',
      concat('Work logged: ', coalesce(v_entry.description, 'Timer session'))
    );
  end if;

  return v_entry;
end;
$$;
