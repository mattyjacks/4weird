-- Vault storage metering: fail-closed file-ownership check.
--
-- meter_vault_storage(p_file, ...) and meter_vault_storage_for(p_user, p_file, ...)
-- previously debited the payer and inserted a vault_usage row for ANY file id
-- with no ownership check, letting any authed caller mint ledger rows against
-- others' files. This migration redefines both function bodies with identical
-- signatures and identical math (gross = greatest(1, ceil(p_gross)), cut = 25%
-- recompute), adding a lookup of the file's (scope, owner_id, team_id, org_id)
-- BEFORE the balance check/insert:
--   personal -> owner_id must equal the payer
--   team     -> payer must be a row in team_members for the file's team_id
--   org      -> payer must be a row in org_members for the file's org_id
-- otherwise `raise exception 'not your file'` (P0001, surfaces via rpcFail).
-- No table schemas, amounts, or grants change here -- function bodies only.

create or replace function public.meter_vault_storage(
  p_file uuid, p_gross numeric, p_cut numeric
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_gross integer;
  v_cut integer;
  v_bal integer;
  v_payer uuid;
  v_scope text;
  v_owner uuid;
  v_team uuid;
  v_org uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  v_payer := auth.uid();
  select scope, owner_id, team_id, org_id
    into v_scope, v_owner, v_team, v_org
    from public.vault_files where id = p_file;
  if not found then raise exception 'not your file'; end if;
  if v_scope = 'personal' then
    if v_owner is distinct from v_payer then raise exception 'not your file'; end if;
  elsif v_scope = 'team' then
    if not exists (select 1 from public.team_members m
      where m.team_id = v_team and m.user_id = v_payer) then
      raise exception 'not your file';
    end if;
  elsif v_scope = 'org' then
    if not exists (select 1 from public.org_members m
      where m.org_id = v_org and m.user_id = v_payer) then
      raise exception 'not your file';
    end if;
  else
    raise exception 'not your file';
  end if;
  v_gross := greatest(1, ceil(p_gross)::integer);
  v_cut := round((v_gross * 25) / 100.0)::integer;
  select coalesce(sum(delta), 0)::integer into v_bal
    from public.coin_ledger where user_id = v_payer;
  if v_bal < v_gross then
    raise exception 'insufficient balance: need % coins, have %', v_gross, v_bal;
  end if;
  insert into public.vault_usage (user_id, file_id, gross, cut)
  values (v_payer, p_file, v_gross, v_cut) returning id into v_id;
  begin
    insert into public.coin_ledger (user_id, delta, reason)
    values (v_payer, -v_gross, 'Vault storage');
  exception when undefined_table then null;
  end;
  return v_id;
end; $$;
grant execute on function public.meter_vault_storage(uuid, numeric, numeric) to authenticated;

create or replace function public.meter_vault_storage_for(
  p_user uuid, p_file uuid, p_gross numeric, p_cut numeric
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_gross integer;
  v_cut integer;
  v_bal integer;
  v_scope text;
  v_owner uuid;
  v_team uuid;
  v_org uuid;
begin
  if p_user is null then raise exception 'login required'; end if;
  select scope, owner_id, team_id, org_id
    into v_scope, v_owner, v_team, v_org
    from public.vault_files where id = p_file;
  if not found then raise exception 'not your file'; end if;
  if v_scope = 'personal' then
    if v_owner is distinct from p_user then raise exception 'not your file'; end if;
  elsif v_scope = 'team' then
    if not exists (select 1 from public.team_members m
      where m.team_id = v_team and m.user_id = p_user) then
      raise exception 'not your file';
    end if;
  elsif v_scope = 'org' then
    if not exists (select 1 from public.org_members m
      where m.org_id = v_org and m.user_id = p_user) then
      raise exception 'not your file';
    end if;
  else
    raise exception 'not your file';
  end if;
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
