-- ============================================================================
-- Vault storage metering: charge the QUOTED gross (centicentcoins).
--
-- meter_vault_storage(p_file, p_gross, p_cut) and
-- meter_vault_storage_for(p_user, p_file, p_gross, p_cut) previously billed
--   v_gross := greatest(1, ceil(p_gross)::integer)
-- i.e. whole coins with a 1-coin floor, while every quote surface
-- (quoteVaultStorage / quoteVaultStorageSplit in lib/blob-vault.ts, returned
-- to the caller by POST /api/vault/blobs and POST /api/vault/blobs/[id])
-- prices storage fractionally at VAULT_COINS_PER_GB_MO = 3 coins/GB-month
-- with a VAULT_MIN_COINS = 0.01 dust guard, 25% cut INCLUDED.
--
-- A 10 KiB file quoted 0.01 coins was therefore charged 1 coin (100x), and a
-- 100 MB file quoted 0.29 was charged 1 coin (3.45x): the debit exceeded the
-- quoted gross, breaking the site-wide money rule (prices are GROSS with the
-- 25% cut INCLUDED, never on top). The integer cast also truncated fractional
-- coin_ledger balances in the sufficiency check.
--
-- This migration redefines both function bodies with identical signatures,
-- identical file-ownership checks (20261109000000_vault_meter_ownership.sql),
-- and identical grants -- only the money math changes to centicentcoins:
--   v_gross := greatest(0.01, round(p_gross, 2))   -- the quoted gross, as-is
--   v_cut   := round(v_gross * 25 / 100.0, 2)      -- 25% INCLUDED, never added
--   v_bal   numeric(12, 2)                         -- no balance truncation
-- so cut + provider == gross on every vault_usage row, and the debit equals
-- the quote the route showed. vault_usage.gross is numeric(12, 2) with
-- check (gross >= 0.01): no schema change needed. Fully rerunnable.
-- ============================================================================

create or replace function public.meter_vault_storage(
  p_file uuid, p_gross numeric, p_cut numeric
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_gross numeric(12, 2);
  v_cut numeric(12, 2);
  v_bal numeric(12, 2);
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
  -- Charge the quoted gross (centicentcoins, 0.01 floor): the 25% cut is
  -- INCLUDED in v_gross, recomputed here so cut + provider == gross.
  v_gross := greatest(0.01, round(coalesce(p_gross, 0), 2));
  v_cut := round(v_gross * 25 / 100.0, 2);
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
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
  v_gross numeric(12, 2);
  v_cut numeric(12, 2);
  v_bal numeric(12, 2);
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
  -- Same centicentcoin math as meter_vault_storage: quoted gross, cut included.
  v_gross := greatest(0.01, round(coalesce(p_gross, 0), 2));
  v_cut := round(v_gross * 25 / 100.0, 2);
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
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
