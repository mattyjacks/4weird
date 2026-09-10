-- ============================================================================
-- 4weird Games - Supabase schema: profiles, game saves, Vibe Coins ledger.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- Money safety, enforced by the DATABASE (not by client code):
--  1. coin_grants / coin_ledger have NO client write policies at all. The
--     browser uses the anon key, so without a policy every INSERT/UPDATE/
--     DELETE is denied. Only the shopify-coins Edge Function (service_role,
--     bypasses RLS) can move coins.
--  2. Balances are always SUM(delta) over the append-only ledger. There is
--     no balance column to tamper with, and grant_id is UNIQUE so one paid
--     order can never mint coins twice, even on webhook retries/races.
--  3. shopify_order_id is UNIQUE: Shopify redeliveries are idempotent.
-- ============================================================================

-- --------------------------------------------------------------------------
-- Helpers
-- --------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --------------------------------------------------------------------------
-- profiles: one row per auth user, created by trigger (never by the client).
-- --------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name varchar(40) not null default '' check (char_length(display_name) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Runs as definer (bypasses RLS) so signup works with zero client INSERT.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wanted text;
begin
  wanted := coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1), 'player');
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, substring(wanted from 1 for 40))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------------------------------
-- game_saves: per-user, per-game, per-slot JSON saves (max 1 MiB each).
-- --------------------------------------------------------------------------
create table if not exists public.game_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_slug text not null check (game_slug ~ '^[a-z0-9-]{1,64}$'),
  slot smallint not null check (slot between 1 and 3),
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) <= 1048576),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, game_slug, slot)
);

drop trigger if exists trg_game_saves_updated_at on public.game_saves;
create trigger trg_game_saves_updated_at
  before update on public.game_saves
  for each row execute function public.handle_updated_at();

-- --------------------------------------------------------------------------
-- coin_grants: one row per paid Shopify order (or part of one). Audit trail.
-- user_id stays NULL until the paid-order email is matched to an account.
-- --------------------------------------------------------------------------
create table if not exists public.coin_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  email text not null check (char_length(email) between 3 and 254),
  shopify_order_id text not null unique,
  shopify_order_name text,
  sku text not null,
  coins integer not null check (coins > 0 and coins <= 1000000),
  claimed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_coin_grants_email on public.coin_grants (lower(email));
create index if not exists idx_coin_grants_user on public.coin_grants (user_id);

-- --------------------------------------------------------------------------
-- coin_ledger: append-only. Balance = SUM(delta) WHERE user_id = me.
-- grant_id UNIQUE: one grant mints exactly one ledger row, ever.
-- --------------------------------------------------------------------------
create table if not exists public.coin_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta integer not null check (delta <> 0 and delta >= -1000000 and delta <= 1000000),
  reason varchar(120) not null check (char_length(reason) <= 120),
  grant_id uuid unique references public.coin_grants (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_coin_ledger_user on public.coin_ledger (user_id, created_at desc);

-- --------------------------------------------------------------------------
-- Convenience balance function (fixed logic, no arguments to inject).
-- --------------------------------------------------------------------------
create or replace function public.get_my_coin_balance()
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(delta), 0)::integer from public.coin_ledger where user_id = auth.uid();
$$;
grant execute on function public.get_my_coin_balance() to authenticated;

-- ============================================================================
-- Row Level Security: deny-by-default; each policy below scopes to auth.uid()
-- (or the JWT email for unclaimed grants). No money-table write policies.
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.game_saves enable row level security;
alter table public.coin_grants enable row level security;
alter table public.coin_ledger enable row level security;

-- profiles: read + rename yourself. Creation is trigger-only.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- game_saves: full CRUD on your own rows only.
drop policy if exists game_saves_own on public.game_saves;
create policy game_saves_own on public.game_saves
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- coin_grants: read your own (by id, or by matching order email while
-- unclaimed). No INSERT / UPDATE / DELETE policies: client writes denied.
drop policy if exists coin_grants_select_own on public.coin_grants;
create policy coin_grants_select_own on public.coin_grants
  for select to authenticated using (
    user_id = auth.uid()
    or (claimed = false and lower(email) = lower(auth.jwt() ->> 'email'))
  );

-- coin_ledger: read your own rows. No write policies: client writes denied.
drop policy if exists coin_ledger_select_own on public.coin_ledger;
create policy coin_ledger_select_own on public.coin_ledger
  for select to authenticated using (user_id = auth.uid());

-- Explicit table grants (belt + suspenders over RLS deny-by-default).
revoke all on public.coin_grants from anon, authenticated;
revoke all on public.coin_ledger from anon, authenticated;
grant select on public.coin_grants to authenticated;
grant select on public.coin_ledger to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.game_saves to authenticated;
