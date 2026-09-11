-- Unified cosmetics shop + guarded dev charges.
-- Rerunnable (IF NOT EXISTS / DROP IF EXISTS / CREATE OR REPLACE).
--
-- Tables:
--   user_cosmetics (own-once inventory, PK blocks double-buys)
--   user_loadouts   (one equipped look per player, avatar is universal)
--   dev_charges     (every dev-initiated charge, idempotent + auditable)
-- RPCs (atomic debit + grant, SECURITY DEFINER like meter_game_ai_usage):
--   purchase_cosmetic_item: fixed catalog price, 10k cap, balance checked.
--   charge_dev_action:      cosmetic/singleplayer-boost ONLY (multiplayer
--                           boosts can never be recorded), 10k cap, balance
--                           checked, unique (user, idem) blocks double-taps.
-- Until this migration is applied the shop APIs quote honestly with
-- pendingMigration:true and move no coins.

create table if not exists public.user_cosmetics (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id text not null check (item_id ~ '^[a-z0-9-]{1,64}$'),
  game_slug text not null default 'lobby' check (game_slug ~ '^[a-z0-9-]{1,64}$'),
  price_coins numeric(12, 2) not null check (price_coins > 0 and price_coins <= 10000),
  purchased_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
create index if not exists idx_user_cosmetics_user on public.user_cosmetics (user_id, purchased_at desc);

create table if not exists public.user_loadouts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  items text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.dev_charges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_slug text not null check (game_slug ~ '^[a-z0-9-]{1,64}$'),
  category text not null check (category in ('cosmetic','singleplayer-boost')),
  amount numeric(12, 2) not null check (amount > 0 and amount <= 10000),
  label varchar(80) not null default '' check (char_length(label) <= 80),
  idem text not null check (char_length(idem) between 8 and 64),
  region text not null default 'XX',
  profile text not null default 'cosmetics-only',
  created_at timestamptz not null default now(),
  unique (user_id, idem)
);
create index if not exists idx_dev_charges_user on public.dev_charges (user_id, created_at desc);
create index if not exists idx_dev_charges_game_day on public.dev_charges (game_slug, user_id, created_at desc);

alter table public.user_cosmetics enable row level security;
alter table public.user_loadouts enable row level security;
alter table public.dev_charges enable row level security;

drop policy if exists user_cosmetics_own on public.user_cosmetics;
create policy user_cosmetics_own on public.user_cosmetics
  for select to authenticated using (user_id = auth.uid());

drop policy if exists user_loadouts_own on public.user_loadouts;
create policy user_loadouts_own on public.user_loadouts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists dev_charges_own on public.dev_charges;
create policy dev_charges_own on public.dev_charges
  for select to authenticated using (user_id = auth.uid());

revoke all on public.user_cosmetics from anon, authenticated;
grant select on public.user_cosmetics to authenticated;
revoke all on public.user_loadouts from anon, authenticated;
grant select, insert, update on public.user_loadouts to authenticated;
revoke all on public.dev_charges from anon, authenticated;
grant select on public.dev_charges to authenticated;

-- Own-once cosmetic purchase: debit + grant atomically.
create or replace function public.purchase_cosmetic_item(
  p_game text,
  p_item text,
  p_price numeric
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_game text; v_item text; v_price numeric(12, 2); v_bal numeric(12, 2); v_fee record;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  v_game := lower(trim(coalesce(p_game, '')));
  if v_game !~ '^[a-z0-9-]{1,64}$' then raise exception 'invalid game'; end if;
  v_item := lower(trim(coalesce(p_item, '')));
  if v_item !~ '^[a-z0-9-]{1,64}$' then raise exception 'invalid item'; end if;
  if p_price is null or p_price <= 0 or p_price > 10000 then raise exception 'invalid price'; end if;
  v_price := round(p_price, 2);
  if exists (select 1 from public.user_cosmetics where user_id = auth.uid() and item_id = v_item) then
    raise exception 'already owned';
  end if;
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_price then
    raise exception 'insufficient balance: need % coins, have %', v_price, v_bal;
  end if;
  select * into v_fee from public.game_ai_compute_split_numeric(v_price);
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_price, substr('Cosmetic (' || v_game || '/' || v_item || ')', 1, 120));
  insert into public.user_cosmetics (user_id, item_id, game_slug, price_coins)
  values (auth.uid(), v_item, v_game, v_price);
  return jsonb_build_object(
    'item', v_item, 'gross_coins', v_price,
    'cut_coins', v_fee.cut, 'provider_coins', v_fee.provider,
    'gross_centicentcoins', round(v_price * 100)::integer
  );
end; $$;
revoke all on function public.purchase_cosmetic_item(text, text, numeric) from public, anon, authenticated;
grant execute on function public.purchase_cosmetic_item(text, text, numeric) to authenticated;

-- Guarded dev charge: category allowlist (never multiplayer-boost), caps,
-- balance, idempotent audit row. Atomic: any failure moves nothing.
create or replace function public.charge_dev_action(
  p_game text,
  p_category text,
  p_amount numeric,
  p_label text,
  p_idem text,
  p_region text default 'XX',
  p_profile text default 'cosmetics-only'
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_game text; v_amount numeric(12, 2); v_bal numeric(12, 2); v_fee record; v_row record;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  v_game := lower(trim(coalesce(p_game, '')));
  if v_game !~ '^[a-z0-9-]{1,64}$' then raise exception 'invalid game'; end if;
  if p_category not in ('cosmetic','singleplayer-boost') then
    raise exception 'invalid category';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 10000 then raise exception 'invalid amount'; end if;
  v_amount := round(p_amount, 2);
  if coalesce(char_length(trim(coalesce(p_label, ''))), 0) = 0
    or char_length(p_label) > 80 then raise exception 'invalid label'; end if;
  if coalesce(char_length(p_idem), 0) not between 8 and 64 then raise exception 'invalid idem'; end if;
  if exists (select 1 from public.dev_charges where user_id = auth.uid() and idem = p_idem) then
    select * into v_row from public.dev_charges where user_id = auth.uid() and idem = p_idem;
    return jsonb_build_object(
      'id', v_row.id, 'duplicate', true, 'gross_coins', v_row.amount,
      'gross_centicentcoins', round(v_row.amount * 100)::integer
    );
  end if;
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_amount then
    raise exception 'insufficient balance: need % coins, have %', v_amount, v_bal;
  end if;
  select * into v_fee from public.game_ai_compute_split_numeric(v_amount);
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_amount, substr('Game (' || v_game || '/' || p_category || ') ' || trim(p_label), 1, 120));
  insert into public.dev_charges (user_id, game_slug, category, amount, label, idem, region, profile)
  values (auth.uid(), v_game, p_category, v_amount, trim(p_label), p_idem,
    substr(coalesce(p_region, 'XX'), 1, 8), substr(coalesce(p_profile, 'cosmetics-only'), 1, 32))
  returning * into v_row;
  return jsonb_build_object(
    'id', v_row.id, 'duplicate', false, 'gross_coins', v_amount,
    'cut_coins', v_fee.cut, 'provider_coins', v_fee.provider,
    'gross_centicentcoins', round(v_amount * 100)::integer
  );
end; $$;
revoke all on function public.charge_dev_action(text, text, numeric, text, text, text, text) from public, anon, authenticated;
grant execute on function public.charge_dev_action(text, text, numeric, text, text, text, text) to authenticated;
