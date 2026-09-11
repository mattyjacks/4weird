-- ============================================================================
-- UnitUnite workspace compute cut - 25% per individual workspace.
-- Fully rerunnable: IF NOT EXISTS / OR REPLACE / ADD COLUMN IF NOT EXISTS.
--
-- Rule (mirrors lib/economy.ts WORKSPACE_COMPUTE_CUT_PCT = 25):
--   * Listed cloud prices are GROSS, cut INCLUDED, never added on top.
--   * meter_usage() debits the org wallet the gross, then splits it
--     25% platform / 75% provider and records the split per workspace.
--   * Each workspace's cut is attributable: platform_compute_cuts carries
--     org_id + team_id + provision so a team's ledger shows its own cut.
-- ============================================================================

-- 1. Split columns on cloud_usage (gross stays in `coins` for back-compat).
alter table public.cloud_usage
  add column if not exists cut_coins integer not null default 0
    check (cut_coins >= 0 and cut_coins <= 100000000);
alter table public.cloud_usage
  add column if not exists provider_coins integer not null default 0
    check (provider_coins >= 0 and provider_coins <= 100000000);

-- Backfill any pre-cut rows: 25% cut included in the stored gross.
update public.cloud_usage
set cut_coins = round(coins * 25 / 100.0)::integer,
    provider_coins = coins - round(coins * 25 / 100.0)::integer
where cut_coins = 0 and provider_coins = 0 and coins > 0;

-- 2. Per-workspace cut ledger (platform 25% attribution).
create table if not exists public.platform_compute_cuts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  provision_id uuid references public.cloud_provisions(id) on delete set null,
  gross_coins integer not null check (gross_coins > 0 and gross_coins <= 100000000),
  cut_coins integer not null check (cut_coins >= 0 and cut_coins <= 100000000),
  provider_coins integer not null check (provider_coins >= 0 and provider_coins <= 100000000),
  created_at timestamptz not null default now(),
  check (cut_coins + provider_coins = gross_coins)
);
create index if not exists idx_platform_cuts_org on public.platform_compute_cuts (org_id, created_at desc);
create index if not exists idx_platform_cuts_team on public.platform_compute_cuts (team_id, created_at desc);

alter table public.platform_compute_cuts enable row level security;
drop policy if exists platform_cuts_read on public.platform_compute_cuts;
create policy platform_cuts_read on public.platform_compute_cuts
  for select to authenticated using (
    public.has_org_perm(org_id, 'cloud.usage.view')
  );
grant select on public.platform_compute_cuts to authenticated;
revoke all on public.platform_compute_cuts from anon;

-- 3. SQL mirror of the TS split (single source of truth stays 25).
create or replace function public.workspace_compute_split(p_gross integer)
returns table(gross integer, cut integer, provider integer)
language plpgsql immutable set search_path = public as $$
begin
  if p_gross is null or p_gross < 0 then raise exception 'invalid gross'; end if;
  gross := p_gross;
  cut := round(p_gross * 25 / 100.0)::integer;
  provider := p_gross - cut;
  return next;
end; $$;
revoke all on function public.workspace_compute_split(integer) from public, anon, authenticated;
grant execute on function public.workspace_compute_split(integer) to authenticated;

-- 4. meter_usage: same signature, now splits 25% per workspace.
--    Wallet debit (gross) is unchanged; the split is recorded on the usage
--    row + the per-workspace cut ledger. Never faked, never negative.
create or replace function public.meter_usage(p_provision uuid, p_qty integer)
returns integer language plpgsql security definer set search_path = public as $$
declare v_prov public.cloud_provisions%rowtype; v_rate integer; v_cost integer;
  v_bal integer; v_cut integer; v_provider integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_qty is null or p_qty < 1 or p_qty > 100000000 then raise exception 'invalid qty'; end if;
  select * into v_prov from public.cloud_provisions where id = p_provision;
  if not found then raise exception 'provision not found'; end if;
  if v_prov.status <> 'running' then raise exception 'not running'; end if;
  if not public.has_org_perm(v_prov.org_id, 'cloud.usage.view') then raise exception 'forbidden'; end if;
  select s.coins_per_unit into v_rate from public.cloud_services s where s.key = v_prov.service_key;
  if v_rate is null then raise exception 'unknown service'; end if;
  v_cost := v_rate * p_qty;
  v_cut := round(v_cost * 25 / 100.0)::integer;
  v_provider := v_cost - v_cut;
  select coalesce(sum(delta),0)::integer into v_bal from public.org_wallet_ledger where org_id = v_prov.org_id;
  if v_bal < v_cost then raise exception 'org wallet insufficient; fund with Vibe Coins'; end if;
  insert into public.org_wallet_ledger (org_id, actor_id, delta, reason)
  values (v_prov.org_id, auth.uid(), -v_cost, substr('UnitUnite compute: ' || v_prov.service_key,1,140));
  insert into public.cloud_usage (provision_id, qty, coins, cut_coins, provider_coins, source)
  values (p_provision, p_qty, v_cost, v_cut, v_provider, 'heartbeat');
  insert into public.platform_compute_cuts (org_id, team_id, provision_id, gross_coins, cut_coins, provider_coins)
  values (v_prov.org_id, v_prov.team_id, p_provision, v_cost, v_cut, v_provider);
  update public.org_wallets set balance_cached = balance_cached - v_cost, updated_at = now()
  where org_id = v_prov.org_id;
  return v_cost;
end; $$;
revoke all on function public.meter_usage(uuid, integer) from public, anon, authenticated;
grant execute on function public.meter_usage(uuid, integer) to authenticated;

-- 5. Per-workspace spend rollup (gross + cut + provider, by team).
create or replace view public.v_workspace_compute_spend as
select
  p.org_id,
  p.team_id,
  count(*)::integer as charges,
  coalesce(sum(u.coins), 0)::integer as gross_coins,
  coalesce(sum(u.cut_coins), 0)::integer as cut_coins,
  coalesce(sum(u.provider_coins), 0)::integer as provider_coins
from public.cloud_usage u
join public.cloud_provisions p on p.id = u.provision_id
group by p.org_id, p.team_id;
