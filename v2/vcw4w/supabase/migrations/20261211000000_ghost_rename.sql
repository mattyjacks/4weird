-- ============================================================================
-- Ghost rename: drop "cash" from Ghost-unit column names.
--
--   public.timer_entries.ghost_cash_owed  ->  public.timer_entries.ghost_owed
--   public.timer_debts.amount_ghost_cash   ->  public.timer_debts.amount_ghost
--   public.timer_projects.ghost_rate       ->  UNCHANGED (rate has no "cash")
--   public.ghost_debts.amount_ghost        ->  UNCHANGED (already Ghost-named,
--                                             separate table from watcher_multirole_ghost)
--
-- The Ghosts unit has no monetary value; the old names wrongly implied cash.
-- Pure rename: no backfill, no data change. CHECK constraints ride along with
-- RENAME COLUMN automatically (anonymous checks need no rebuild), and no RLS
-- policy references the renamed columns (policies key on user/org/debtor ids).
--
-- Only dependents referencing the renamed columns are start_timer() and
-- stop_timer() (current bodies: 20261113000000_timer_ownership_hardening.sql).
-- No views reference these columns (verified: no CREATE VIEW on timer tables
-- in any migration). Both functions are DROP+CREATE recreated below with the
-- new column names, preserving the ownership-hardening logic, SET
-- search_path = public, and authenticated-only grants.
--
-- Rerunnable: renames are information_schema-guarded DO blocks (Postgres has
-- no RENAME COLUMN IF EXISTS), DROP FUNCTION IF EXISTS + CREATE + REVOKE +
-- GRANT are idempotent, COMMENTs are guarded. DO NOT edit prior migrations.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Pure column renames (guarded, rerunnable)
-- --------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'timer_entries'
      AND column_name = 'ghost_cash_owed'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'timer_entries'
      AND column_name = 'ghost_owed'
  ) THEN
    ALTER TABLE public.timer_entries RENAME COLUMN ghost_cash_owed TO ghost_owed;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'timer_debts'
      AND column_name = 'amount_ghost_cash'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'timer_debts'
      AND column_name = 'amount_ghost'
  ) THEN
    ALTER TABLE public.timer_debts RENAME COLUMN amount_ghost_cash TO amount_ghost;
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- 2. Recreate dependents with new column names.
-- Bodies are verbatim copies of 20261113000000_timer_ownership_hardening.sql
-- except ghost_cash_owed -> ghost_owed and amount_ghost_cash -> amount_ghost.
-- --------------------------------------------------------------------------

drop function if exists public.start_timer(uuid, uuid, text, boolean, boolean, text, text);

create function public.start_timer(
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
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_running public.timer_entries;
  v_rate numeric(12,2) := 0.00;
  v_org_id uuid := null;
  v_proj_owner uuid := null;
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
    select ghost_rate, org_id, user_id into v_rate, v_org_id, v_proj_owner
    from public.timer_projects
    where id = p_project_id;
    if not found then
      raise exception 'Project not found.' using errcode = 'P0001';
    end if;
    -- Ownership: caller owns the project OR belongs to the project org.
    if v_proj_owner is distinct from v_uid
      and (v_org_id is null or not exists (
        select 1 from public.org_members m
        where m.org_id = v_org_id and m.user_id = v_uid
      )) then
      raise exception 'forbidden' using errcode = 'P0001';
    end if;
  end if;

  -- Debtor: self always; others only when they share the timer org.
  if p_debtor_id is not null and p_debtor_id is distinct from v_uid then
    if v_org_id is null or not exists (
      select 1 from public.org_members m
      where m.org_id = v_org_id and m.user_id = p_debtor_id
    ) then
      raise exception 'forbidden' using errcode = 'P0001';
    end if;
  end if;

  insert into public.timer_entries (
    user_id, project_id, debtor_id, org_id,
    description, start_time, is_running,
    is_billable, ghost_rate, ghost_owed,
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

revoke all on function public.start_timer(uuid, uuid, text, boolean, boolean, text, text) from public, anon;
grant execute on function public.start_timer(uuid, uuid, text, boolean, boolean, text, text) to authenticated;

drop function if exists public.stop_timer(uuid, text, uuid, boolean, integer);

create function public.stop_timer(
  p_entry_id uuid,
  p_description text default null,
  p_project_id uuid default null,
  p_is_billable boolean default null,
  p_activity_score integer default null
)
returns public.timer_entries
language plpgsql
security definer
set search_path = public
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
    ghost_owed = v_owed,
    activity_score = v_act,
    updated_at = v_end
  where id = p_entry_id
  returning * into v_entry;

  -- If billable and owes ghosts to debtor / org, record pending debt ledger row.
  -- The Ghosts unit has no monetary value; this ledger tracks Ghosts only.
  if v_owed > 0 and (v_entry.debtor_id is not null or v_entry.org_id is not null) then
    insert into public.timer_debts (
      org_id, project_id, creditor_id, debtor_id,
      amount_ghost, status, memo
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

revoke all on function public.stop_timer(uuid, text, uuid, boolean, integer) from public, anon;
grant execute on function public.stop_timer(uuid, text, uuid, boolean, integer) to authenticated;

-- --------------------------------------------------------------------------
-- 3. Column comments: Ghosts unit has no monetary value (guarded, rerunnable)
-- --------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'timer_entries'
      AND column_name = 'ghost_owed'
  ) THEN
    EXECUTE 'COMMENT ON COLUMN public.timer_entries.ghost_owed IS '
      || quote_literal('Ghosts owed for this entry. The Ghosts unit has no monetary value.');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'timer_debts'
      AND column_name = 'amount_ghost'
  ) THEN
    EXECUTE 'COMMENT ON COLUMN public.timer_debts.amount_ghost IS '
      || quote_literal('Ghosts amount of this debt. The Ghosts unit has no monetary value.');
  END IF;
END $$;
