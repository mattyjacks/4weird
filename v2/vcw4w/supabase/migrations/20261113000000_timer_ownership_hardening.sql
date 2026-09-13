-- ============================================================================
-- Timer ownership hardening: close start_timer IDOR + pin search_path.
--
-- Record: start_timer() accepted any p_project_id/p_debtor_id with zero
-- ownership checks, so any authenticated caller could stamp another user's
-- org/project rate onto their own timer rows and mint "pending" ghost debts
-- where someone else owes them. Ghost Cash has no cash value, but forged
-- debts are an integrity abuse. Both timer RPCs also ran SECURITY DEFINER
-- without SET search_path and with default PUBLIC execute.
--
-- Fix (rerunnable, DROP+CREATE):
--  1. start_timer: project must belong to the caller (owner) or to an org
--     the caller belongs to; debtor must be self or a member of that org
--     (or any profile when no org). Violations raise P0001 'forbidden'.
--  2. Both functions get SET search_path = public + REVOKE from
--     public/anon + GRANT EXECUTE to authenticated only.
--
-- Rerunnable: DROP FUNCTION IF EXISTS + CREATE + REVOKE + GRANT are all
-- idempotent. No tables/policies/triggers created here. NEVER touches coin
-- tables (inserts/selects only via existing paths).
-- ============================================================================

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

revoke all on function public.start_timer(uuid, uuid, text, boolean, boolean, text, text) from public, anon;
grant execute on function public.start_timer(uuid, uuid, text, boolean, boolean, text, text) to authenticated;

-- stop_timer: pin search_path + grants (body already scopes by user_id).
-- DROP+CREATE so the config change applies even where OR REPLACE is picky.
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

revoke all on function public.stop_timer(uuid, text, uuid, boolean, integer) from public, anon;
grant execute on function public.stop_timer(uuid, text, uuid, boolean, integer) to authenticated;
