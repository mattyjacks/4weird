-- ============================================================================
-- VCW gateway foundation (Option C Hybrid): hosted coin metering + BYOK
-- provider refs + API keys + dispatch quotes.
--
-- Economics (mirrors lib/vcw-gateway.ts + lib/vcw-byok.ts, keep in sync):
--   * Closed-loop Vibe Coins only; no cash-out anywhere in this app.
--   * Every metered gross INCLUDES the 25% platform cut (cut + provider =
--     gross), never added on top. The wallet is debited the gross; the
--     platform cut is paired into public.platform_ledger ('compute-cut').
--   * Gateway ops: run-open | action-step | bug-file | handoff |
--     worker-min | byok-route. Sources: gateway | vcw | api | manual.
--   * BYOK secrets are NEVER stored here: vcw_byok_providers keeps only the
--     kind + label + last4 + endpoint_url. Full keys live server-side only.
--
-- Fully rerunnable: IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS.
-- Run migrations in filename order (this one needs profiles, vcw_runs,
-- coin_ledger, and -- when present -- coin_spend_lock/record_platform_cut).
-- ============================================================================

-- 1. API keys: tag-prefixed (vcw_live_ + 32 alphanum), only a sha hash +
-- prefix are stored; the full secret is shown once at creation and never
-- again. Budgets/quota counters are enforced by the gateway route, with
-- hard_stop_enabled failing closed when any cap is hit.
create table if not exists public.vcw_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prefix text not null check (char_length(prefix) between 1 and 16),
  key_hash text not null check (char_length(key_hash) between 1 and 256),
  label text not null default '' check (char_length(label) <= 80),
  org_id uuid null,
  scopes text[] not null default '{vcw:read,vcw:write}',
  revoked boolean not null default false,
  expires_at timestamptz null,
  max_uses integer not null default 0 check (max_uses >= 0),
  use_count integer not null default 0 check (use_count >= 0),
  lifetime_budget numeric(12, 2) not null default 0 check (lifetime_budget >= 0),
  lifetime_spent numeric(12, 2) not null default 0 check (lifetime_spent >= 0),
  daily_budget numeric(12, 2) not null default 0 check (daily_budget >= 0),
  daily_spent numeric(12, 2) not null default 0 check (daily_spent >= 0),
  daily_day date null,
  hard_stop_enabled boolean not null default true,
  last_used_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_vcw_api_keys_owner on public.vcw_api_keys (user_id, created_at desc);
create index if not exists idx_vcw_api_keys_prefix on public.vcw_api_keys (prefix);

-- 2. BYOK providers: one row per user-supplied upstream key. The secret
-- itself is never stored -- only kind/label/last4/endpoint_url.
create table if not exists public.vcw_byok_providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('runpod', 'openai', 'fal', 'meshy', 'custom')),
  label text not null default '' check (char_length(label) <= 80),
  last4 text not null default '' check (char_length(last4) <= 8),
  endpoint_url text not null default '' check (char_length(endpoint_url) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists idx_vcw_byok_providers_owner on public.vcw_byok_providers (user_id, created_at desc);

-- 3. Usage: one metered row per gateway op. Money moves only in
-- meter_vcw_usage(); these rows are the audit trail (cut + provider = gross).
create table if not exists public.vcw_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  key_id uuid null references public.vcw_api_keys(id) on delete set null,
  run_id uuid null references public.vcw_runs(id) on delete set null,
  op text not null check (op in ('run-open', 'action-step', 'bug-file', 'handoff', 'worker-min', 'byok-route')),
  qty numeric(12, 2) not null default 1 check (qty >= 0 and qty <= 100000000),
  gross numeric(12, 2) not null default 0 check (gross >= 0 and gross <= 100000000),
  cut numeric(12, 2) not null default 0 check (cut >= 0 and cut <= 100000000),
  provider numeric(12, 2) not null default 0 check (provider >= 0 and provider <= 100000000),
  source text not null default 'gateway' check (source in ('gateway', 'vcw', 'api', 'manual')),
  created_at timestamptz not null default now(),
  check (cut + provider = gross)
);
create index if not exists idx_vcw_usage_owner on public.vcw_usage (user_id, created_at desc);
create index if not exists idx_vcw_usage_key on public.vcw_usage (key_id, created_at desc);
create index if not exists idx_vcw_usage_run on public.vcw_usage (run_id, created_at desc);
create index if not exists idx_vcw_usage_op on public.vcw_usage (op, created_at desc);

-- 4. Dispatches: one quote/dispatch row per gateway run request. The
-- gateway route quotes first (status 'quoted'), then meters hosted usage
-- or routes to the caller's BYOK provider (mode 'byok' bills byok-route).
create table if not exists public.vcw_dispatches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  key_id uuid null references public.vcw_api_keys(id) on delete set null,
  game_slug text not null check (game_slug ~ '^[a-z0-9-]{1,64}$'),
  compute text not null default 'cpu' check (compute in ('cpu', 'gpu') and char_length(compute) <= 16),
  mode text not null default 'hosted' check (mode in ('hosted', 'byok')),
  provider_id uuid null references public.vcw_byok_providers(id) on delete set null,
  status text not null default 'quoted' check (char_length(status) between 1 and 32),
  quote_gross numeric(12, 2) not null default 0 check (quote_gross >= 0 and quote_gross <= 100000000),
  created_at timestamptz not null default now()
);
create index if not exists idx_vcw_dispatches_owner on public.vcw_dispatches (user_id, created_at desc);
create index if not exists idx_vcw_dispatches_key on public.vcw_dispatches (key_id, created_at desc);
create index if not exists idx_vcw_dispatches_provider on public.vcw_dispatches (provider_id, created_at desc);
create index if not exists idx_vcw_dispatches_game on public.vcw_dispatches (game_slug, created_at desc);

-- 5. RLS: owner-only (service_role bypasses for gateway jobs).
alter table public.vcw_api_keys enable row level security;
alter table public.vcw_byok_providers enable row level security;
alter table public.vcw_usage enable row level security;
alter table public.vcw_dispatches enable row level security;

drop policy if exists vcw_api_keys_owner_all on public.vcw_api_keys;
create policy vcw_api_keys_owner_all on public.vcw_api_keys
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists vcw_byok_providers_owner_all on public.vcw_byok_providers;
create policy vcw_byok_providers_owner_all on public.vcw_byok_providers
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Usage rows are written by meter_vcw_usage() only (mirrors fal_usage):
-- the owner can read their trail, never insert/update/delete it directly.
drop policy if exists vcw_usage_own on public.vcw_usage;
create policy vcw_usage_own on public.vcw_usage
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists vcw_dispatches_owner_all on public.vcw_dispatches;
create policy vcw_dispatches_owner_all on public.vcw_dispatches
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke all on public.vcw_api_keys from anon, authenticated;
grant select, insert, update, delete on public.vcw_api_keys to authenticated;
revoke all on public.vcw_byok_providers from anon, authenticated;
grant select, insert, update, delete on public.vcw_byok_providers to authenticated;
revoke all on public.vcw_usage from anon, authenticated;
grant select on public.vcw_usage to authenticated;
revoke all on public.vcw_dispatches from anon, authenticated;
grant select, insert, update, delete on public.vcw_dispatches to authenticated;

-- 6. updated_at maintenance for API keys (reuses the shared trigger fn).
drop trigger if exists trg_vcw_api_keys_updated_at on public.vcw_api_keys;
create trigger trg_vcw_api_keys_updated_at
  before update on public.vcw_api_keys
  for each row execute function public.handle_updated_at();

-- 7. meter_vcw_usage: debit personal coins (gross), split 25/75, record.
-- Mirrors meter_fal_usage. Gross table (coins per unit, cut INCLUDED):
-- run-open 10 | action-step 1 | bug-file 2 | handoff 5 | worker-min 6 |
-- byok-route 2. Floor 0.01 coin (one centicentcoin). Never faked, never
-- negative. Wallets move only here.
create or replace function public.meter_vcw_usage(
  p_op text,
  p_qty numeric default 1,
  p_run uuid default null,
  p_source text default 'gateway'
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_rate numeric(12, 2);
  v_qty numeric(12, 2);
  v_gross numeric(12, 2);
  v_cut numeric(12, 2);
  v_provider numeric(12, 2);
  v_bal numeric(12, 2);
  v_usage_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_op not in ('run-open', 'action-step', 'bug-file', 'handoff', 'worker-min', 'byok-route') then
    raise exception 'invalid op';
  end if;
  if p_qty is null or p_qty < 0 or p_qty > 100000000 then raise exception 'invalid qty'; end if;
  if p_source not in ('gateway', 'vcw', 'api', 'manual') then raise exception 'invalid source'; end if;
  if p_run is not null and not exists (
    select 1 from public.vcw_runs where id = p_run and user_id = auth.uid()
  ) then
    raise exception 'run not found';
  end if;

  -- Gross price by op (coins, cut INCLUDED; mirrors lib/vcw-gateway.ts
  -- VCW_GATEWAY_RATES).
  v_rate := case p_op
    when 'run-open' then 10
    when 'action-step' then 1
    when 'bug-file' then 2
    when 'handoff' then 5
    when 'worker-min' then 6
    when 'byok-route' then 2
    else 1 end;
  v_qty := round(coalesce(p_qty, 0), 2);
  v_gross := greatest(0.01, round(v_rate * v_qty, 2));
  -- VCW_GATEWAY_CUT_PCT = 25 (lib/economy.ts SERVICE_CUT_PCT + lib/vcw-gateway.ts).
  v_cut := round(v_gross * 25 / 100.0, 2);
  v_provider := round(v_gross - v_cut, 2);

  -- Serialize concurrent spends when the lock helper exists (see
  -- 20261018000000_ledger_pairing_hardening.sql); debit stays first.
  if exists (select 1 from pg_proc where proname = 'coin_spend_lock') then
    perform public.coin_spend_lock(auth.uid());
  end if;

  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_gross then
    raise exception 'insufficient balance: need % coins, have %', v_gross, v_bal;
  end if;

  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_gross, substr('VCW gateway (' || p_op || ')', 1, 120));

  insert into public.vcw_usage
    (user_id, run_id, op, qty, gross, cut, provider, source)
  values
    (auth.uid(), p_run, p_op, v_qty, v_gross, v_cut, v_provider, p_source)
  returning id into v_usage_id;

  -- Pair the 25% cut into the platform ledger when it exists, so
  -- reconciliation can pair every debit (debit-first ordering kept above).
  if exists (select 1 from pg_proc where proname = 'record_platform_cut') then
    perform public.record_platform_cut('compute-cut', v_gross, v_cut, 'vcw_usage', v_usage_id);
  end if;

  return jsonb_build_object(
    'gross', v_gross, 'cut', v_cut, 'provider', v_provider, 'op', p_op
  );
end; $$;
revoke all on function public.meter_vcw_usage(text, numeric, uuid, text) from public, anon, authenticated;
grant execute on function public.meter_vcw_usage(text, numeric, uuid, text) to authenticated;

-- 8. my_vcw_usage: one rollup for /my/usage; total + by-op + recent.
-- Best-effort: empty history returns zeros / empty arrays, never null.
create or replace function public.my_vcw_usage()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_total jsonb; v_byop jsonb; v_recent jsonb;
begin
  if auth.uid() is null then raise exception 'login required'; end if;

  select jsonb_build_object(
    'gross', coalesce(sum(gross), 0)::numeric(12, 2),
    'cut', coalesce(sum(cut), 0)::numeric(12, 2),
    'provider', coalesce(sum(provider), 0)::numeric(12, 2),
    'charges', count(*)::integer
  ) into v_total from public.vcw_usage where user_id = auth.uid();

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_byop from (
    select op, count(*)::integer as charges,
      coalesce(sum(gross), 0)::numeric(12, 2) as gross,
      coalesce(sum(cut), 0)::numeric(12, 2) as cut,
      coalesce(sum(provider), 0)::numeric(12, 2) as provider
    from public.vcw_usage where user_id = auth.uid()
    group by op order by gross desc
  ) t;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_recent from (
    select op, qty, gross, cut, provider, source, run_id, created_at
    from public.vcw_usage where user_id = auth.uid()
    order by created_at desc limit 25
  ) t;

  return jsonb_build_object(
    'total', v_total, 'byOp', v_byop, 'recent', v_recent
  );
end; $$;
revoke all on function public.my_vcw_usage() from public, anon, authenticated;
grant execute on function public.my_vcw_usage() to authenticated;

-- Spend view (per user + op). SECURITY INVOKER so the view respects the
-- caller's RLS on vcw_usage instead of leaking cross-user aggregates under
-- the view owner's rights. Revoked from anon/authenticated direct access;
-- read it through service_role or the my_vcw_usage() RPC instead.
drop view if exists public.v_vcw_spend;
create or replace view public.v_vcw_spend with (security_invoker = true) as
select
  user_id,
  op,
  count(*)::integer as charges,
  coalesce(sum(gross), 0)::numeric(12, 2) as gross,
  coalesce(sum(cut), 0)::numeric(12, 2) as cut,
  coalesce(sum(provider), 0)::numeric(12, 2) as provider
from public.vcw_usage
group by user_id, op;
revoke all on table public.v_vcw_spend from public, anon, authenticated;

-- 9. meter_vcw_usage_for: service-role metering for key callers (bot keys,
-- gateway vcw_live_ keys) that carry no Supabase session, so auth.uid() is
-- null. Mirrors meter_meshy_usage_for: p_user is explicit, revoked from
-- public/anon/authenticated (service_role only). Session callers keep using
-- meter_vcw_usage() above.
create or replace function public.meter_vcw_usage_for(
  p_user uuid,
  p_op text,
  p_qty numeric default 1,
  p_run uuid default null,
  p_source text default 'gateway'
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_rate numeric(12, 2);
  v_qty numeric(12, 2);
  v_gross numeric(12, 2);
  v_cut numeric(12, 2);
  v_provider numeric(12, 2);
  v_bal numeric(12, 2);
  v_usage_id uuid;
begin
  if p_user is null then raise exception 'login required'; end if;
  if p_op not in ('run-open', 'action-step', 'bug-file', 'handoff', 'worker-min', 'byok-route') then
    raise exception 'invalid op';
  end if;
  if p_qty is null or p_qty < 0 or p_qty > 100000000 then raise exception 'invalid qty'; end if;
  if p_source not in ('gateway', 'vcw', 'api', 'manual') then raise exception 'invalid source'; end if;
  if p_run is not null and not exists (
    select 1 from public.vcw_runs where id = p_run and user_id = p_user
  ) then
    raise exception 'run not found';
  end if;

  v_rate := case p_op
    when 'run-open' then 10
    when 'action-step' then 1
    when 'bug-file' then 2
    when 'handoff' then 5
    when 'worker-min' then 6
    when 'byok-route' then 2
    else 1 end;
  v_qty := round(coalesce(p_qty, 0), 2);
  v_gross := greatest(0.01, round(v_rate * v_qty, 2));
  v_cut := round(v_gross * 25 / 100.0, 2);
  v_provider := round(v_gross - v_cut, 2);

  if exists (select 1 from pg_proc where proname = 'coin_spend_lock') then
    perform public.coin_spend_lock(p_user);
  end if;

  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
  from public.coin_ledger where user_id = p_user;
  if v_bal < v_gross then
    raise exception 'insufficient balance: need % coins, have %', v_gross, v_bal;
  end if;

  insert into public.coin_ledger (user_id, delta, reason)
  values (p_user, -v_gross, substr('VCW gateway (' || p_op || ')', 1, 120));

  insert into public.vcw_usage
    (user_id, run_id, op, qty, gross, cut, provider, source)
  values
    (p_user, p_run, p_op, v_qty, v_gross, v_cut, v_provider, p_source)
  returning id into v_usage_id;

  if exists (select 1 from pg_proc where proname = 'record_platform_cut') then
    perform public.record_platform_cut('compute-cut', v_gross, v_cut, 'vcw_usage', v_usage_id);
  end if;

  return jsonb_build_object(
    'gross', v_gross, 'cut', v_cut, 'provider', v_provider, 'op', p_op
  );
end; $$;
revoke all on function public.meter_vcw_usage_for(uuid, text, numeric, uuid, text) from public, anon, authenticated;
