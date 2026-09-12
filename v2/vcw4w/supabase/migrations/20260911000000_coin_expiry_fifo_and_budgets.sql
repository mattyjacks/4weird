-- Coin lots make expiry and FIFO settlement enforceable for every existing
-- ledger writer. A credit is usable for one calendar year from receipt.
create table if not exists public.coin_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_ledger_id uuid unique references public.coin_ledger(id) on delete cascade,
  original_coins numeric(12,2) not null check (original_coins > 0),
  remaining_coins numeric(12,2) not null check (remaining_coins >= 0),
  received_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (expires_at = received_at + interval '1 year')
);
create index if not exists idx_coin_lots_fifo on public.coin_lots(user_id, expires_at, received_at, id)
  where remaining_coins > 0;

create table if not exists public.coin_lot_spends (
  debit_ledger_id uuid not null references public.coin_ledger(id) on delete cascade,
  lot_id uuid not null references public.coin_lots(id) on delete restrict,
  coins numeric(12,2) not null check (coins > 0),
  created_at timestamptz not null default now(),
  primary key (debit_ledger_id, lot_id)
);

-- Backfill all historical credits with a receipt date from the original ledger.
insert into public.coin_lots (user_id, source_ledger_id, original_coins, remaining_coins, received_at, expires_at)
select l.user_id, l.id, l.delta, l.delta, l.created_at, l.created_at + interval '1 year'
from public.coin_ledger l
where l.delta > 0
on conflict (source_ledger_id) do nothing;

-- Reconstruct the remaining balance for credits that existed before this
-- migration. This uses each historic debit's own timestamp, not today's
-- validity, and follows the same FIFO rule used for future debits.
do $$
declare d record; l record; needed numeric(12,2); used numeric(12,2);
begin
  for d in select id, user_id, -delta as coins, created_at from public.coin_ledger where delta < 0 and not exists (select 1 from public.coin_lot_spends s where s.debit_ledger_id = coin_ledger.id) order by created_at, id loop
    needed := d.coins;
    for l in select id, remaining_coins from public.coin_lots where user_id = d.user_id and received_at <= d.created_at and expires_at > d.created_at and remaining_coins > 0 order by expires_at, received_at, id loop
      exit when needed <= 0;
      used := least(needed, l.remaining_coins);
      update public.coin_lots set remaining_coins = remaining_coins - used where id = l.id;
      insert into public.coin_lot_spends(debit_ledger_id, lot_id, coins) values(d.id, l.id, used) on conflict do nothing;
      needed := needed - used;
    end loop;
  end loop;
end $$;

create or replace function public.apply_coin_lot_to_ledger()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_needed numeric(12,2); v_lot record; v_used numeric(12,2);
begin
  if new.delta > 0 then
    insert into public.coin_lots (user_id, source_ledger_id, original_coins, remaining_coins, received_at, expires_at)
    values (new.user_id, new.id, new.delta, new.delta, new.created_at, new.created_at + interval '1 year');
    return new;
  end if;
  if new.delta >= 0 then return new; end if;
  v_needed := -new.delta;
  -- Lock candidate lots so simultaneous spends cannot consume the same cents.
  for v_lot in select id, remaining_coins from public.coin_lots
    where user_id = new.user_id and expires_at > new.created_at and remaining_coins > 0
    order by expires_at asc, received_at asc, id asc for update
  loop
    exit when v_needed <= 0;
    v_used := least(v_needed, v_lot.remaining_coins);
    update public.coin_lots set remaining_coins = remaining_coins - v_used where id = v_lot.id;
    insert into public.coin_lot_spends (debit_ledger_id, lot_id, coins) values (new.id, v_lot.id, v_used);
    v_needed := v_needed - v_used;
  end loop;
  if v_needed > 0 then raise exception 'insufficient unexpired Vibe Coins'; end if;
  return new;
end; $$;
drop trigger if exists trg_coin_ledger_lots on public.coin_ledger;
create trigger trg_coin_ledger_lots after insert on public.coin_ledger
  for each row execute function public.apply_coin_lot_to_ledger();

-- A personal hard stop is checked before the debit is accepted. Monitoring
-- budgets (cap = 0 or hard_stop = false) never interrupt a purchase.
create or replace function public.enforce_personal_budget()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_cap numeric(12,2); v_stop boolean; v_spent numeric(12,2);
begin
  if new.delta >= 0 then return new; end if;
  select monthly_cap_coins, hard_stop into v_cap, v_stop from public.personal_budgets where user_id = new.user_id;
  if coalesce(v_stop,false) and coalesce(v_cap,0) > 0 then
    select coalesce(sum(-delta),0) into v_spent from public.coin_ledger
      where user_id = new.user_id and delta < 0 and created_at >= date_trunc('month', new.created_at);
    if v_spent + (-new.delta) > v_cap then raise exception 'personal monthly budget cap reached'; end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_coin_ledger_budget on public.coin_ledger;
create trigger trg_coin_ledger_budget before insert on public.coin_ledger for each row execute function public.enforce_personal_budget();

-- The public balance is intentionally lots-based, so expired coins disappear
-- without a lossy batch job or a mutable ledger row.
create or replace function public.get_my_coin_balance()
returns numeric(12,2) language sql security definer set search_path = public as $$
  select coalesce(sum(remaining_coins) filter (where expires_at > now()), 0)::numeric(12,2)
  from public.coin_lots where user_id = auth.uid();
$$;
revoke all on function public.get_my_coin_balance() from public, anon;
grant execute on function public.get_my_coin_balance() to authenticated;

-- Budget controls work for a personal account and at the org and workspace levels.
create table if not exists public.personal_budgets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  monthly_cap_coins numeric(12,2) not null default 0 check (monthly_cap_coins >= 0),
  alert_at_pct integer not null default 80 check (alert_at_pct between 1 and 100),
  hard_stop boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.org_budgets (
  org_id uuid primary key references public.orgs(id) on delete cascade,
  monthly_cap_coins numeric(12,2) not null default 0 check (monthly_cap_coins >= 0),
  alert_at_pct integer not null default 80 check (alert_at_pct between 1 and 100),
  hard_stop boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.personal_budgets enable row level security;
alter table public.org_budgets enable row level security;
-- DROP first: live copies of these policies already exist (dashboard-applied).
drop policy if exists personal_budgets_read_own on public.personal_budgets;
drop policy if exists org_budgets_read_member on public.org_budgets;
create policy personal_budgets_read_own on public.personal_budgets for select to authenticated using (user_id = auth.uid());
create policy org_budgets_read_member on public.org_budgets for select to authenticated using (public.has_org_perm(org_id, 'org.billing.view'));
grant select on public.personal_budgets, public.org_budgets to authenticated;

create or replace function public.set_my_budget(p_cap numeric, p_alert integer, p_hard_stop boolean)
returns public.personal_budgets language plpgsql security definer set search_path = public as $$
declare v_row public.personal_budgets%rowtype;
begin
 if auth.uid() is null then raise exception 'login required'; end if;
 if p_cap < 0 or p_cap > 100000000 or p_alert not between 1 and 100 then raise exception 'invalid budget'; end if;
 insert into public.personal_budgets(user_id,monthly_cap_coins,alert_at_pct,hard_stop,updated_at)
 values(auth.uid(),p_cap,p_alert,coalesce(p_hard_stop,false),now())
 on conflict(user_id) do update set monthly_cap_coins=excluded.monthly_cap_coins,alert_at_pct=excluded.alert_at_pct,hard_stop=excluded.hard_stop,updated_at=now()
 returning * into v_row; return v_row;
end; $$;
create or replace function public.set_org_budget(p_org uuid, p_cap numeric, p_alert integer, p_hard_stop boolean)
returns public.org_budgets language plpgsql security definer set search_path = public as $$
declare v_row public.org_budgets%rowtype;
begin
 if not public.has_org_perm(p_org, 'org.billing.manage') then raise exception 'forbidden'; end if;
 if p_cap < 0 or p_cap > 100000000 or p_alert not between 1 and 100 then raise exception 'invalid budget'; end if;
 insert into public.org_budgets(org_id,monthly_cap_coins,alert_at_pct,hard_stop,updated_at)
 values(p_org,p_cap,p_alert,coalesce(p_hard_stop,false),now())
 on conflict(org_id) do update set monthly_cap_coins=excluded.monthly_cap_coins,alert_at_pct=excluded.alert_at_pct,hard_stop=excluded.hard_stop,updated_at=now()
 returning * into v_row; return v_row;
end; $$;
revoke all on function public.set_my_budget(numeric, integer, boolean), public.set_org_budget(uuid, numeric, integer, boolean) from public, anon;
grant execute on function public.set_my_budget(numeric, integer, boolean), public.set_org_budget(uuid, numeric, integer, boolean) to authenticated;

create or replace function public.enforce_org_budget()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_cap numeric(12,2); v_stop boolean; v_spent numeric(12,2);
begin
  if new.delta >= 0 then return new; end if;
  select monthly_cap_coins, hard_stop into v_cap, v_stop from public.org_budgets where org_id = new.org_id;
  if coalesce(v_stop,false) and coalesce(v_cap,0) > 0 then
    select coalesce(sum(-delta),0) into v_spent from public.org_wallet_ledger
      where org_id = new.org_id and delta < 0 and created_at >= date_trunc('month', new.created_at);
    if v_spent + (-new.delta) > v_cap then raise exception 'organization monthly budget cap reached'; end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_org_wallet_budget on public.org_wallet_ledger;
create trigger trg_org_wallet_budget before insert on public.org_wallet_ledger for each row execute function public.enforce_org_budget();
