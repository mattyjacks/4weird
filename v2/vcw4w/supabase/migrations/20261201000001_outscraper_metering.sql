-- ============================================================================
-- Outscraper metering (outscraper-studio) - 25% cut on all 34 outscraper ops,
-- same rule as every other compute surface (SERVICE_CUT_PCT /
-- OUTSCRAPER_*_CUT_PCT). Fully rerunnable: IF NOT EXISTS / OR REPLACE /
-- DROP ... IF EXISTS guards (repo rule). Mirrors
-- 20260920000000_fal_media_compute.sql structure exactly: usage table +
-- 3 indexes + RLS (own-select, revoke anon/authenticated, grant select) +
-- split mirror + SECURITY DEFINER meter RPC (debit-first, fail-closed,
-- balance check, 25/75 split, ledger + usage inserts, jsonb receipt) +
-- my_* rollup + spend view.
--
-- Rule (mirrors lib/economy.ts SERVICE_CUT_PCT = 25 and
-- lib/outscraper-maps.ts / outscraper-reviews.ts / outscraper-search.ts /
-- lib/outscraper-leads.ts *_CUT_PCT = 25):
--   * Listed outscraper prices are GROSS, cut INCLUDED, never added on top.
--   * meter_outscraper_usage() debits the caller's personal coin balance
--     (gross), splits 25% platform / 75% provider, and records the split per
--     vendor + game + op. Vendors: outscraper-maps | outscraper-reviews |
--     outscraper-search | outscraper-leads. Sources: outscraper-studio |
--     vcw | api | manual.
--   * Never faked, never negative. Wallets move only here.
--
-- Rate sources (read 2026-09-13, coinsPerUnit per lib file; NO fallback used
-- - all four files present):
--   * maps (10, lib/outscraper-maps.ts): maps-search=8, place-details=5,
--     maps-reviews-lite=4, maps-photos=6, maps-directions=3,
--     traffic-extractor=5, geocode=3, reverse-geocode=3, new-businesses=12,
--     maps-search-bulk=10.
--   * reviews (8, lib/outscraper-reviews.ts): maps-reviews=8,
--     play-reviews=6, trustpilot=5, tripadvisor=5, shopping-reviews=4,
--     youtube-comments=3, sentiment-rollup=12, review-monitor=7.
--   * search (8, lib/outscraper-search.ts): google-search=6,
--     google-images=5, google-news=4, google-shopping=7, amazon-products=8,
--     amazon-reviews=6, universal-scrape=12, yellow-pages=3.
--   * leads (8, lib/outscraper-leads.ts): emails-scrape=8,
--     domain-contacts=10, email-validate=2, email-clean=12,
--     phones-enrich=6, b2b-database=9, lead-services=12, crm-export=3.
--   * Total CASE arms: 34.
-- Fallbacks used: none.
--
-- NOTE: p_query is an extra OPTIONAL trailing param (default '') beyond the
-- requested 5-param signature; calls with 5 args still resolve. Without it
-- the query audit column could never be populated (there is nothing to
-- derive it from, unlike the fal model CASE).
-- ============================================================================

create table if not exists public.outscraper_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_slug text not null default 'lobby' check (game_slug ~ '^[a-z0-9-]{1,64}$'),
  vendor text not null check (vendor in ('outscraper-maps','outscraper-reviews','outscraper-search','outscraper-leads')),
  op text not null check (op in ('maps-search','place-details','maps-reviews-lite','maps-photos','maps-directions','traffic-extractor','geocode','reverse-geocode','new-businesses','maps-search-bulk','maps-reviews','play-reviews','trustpilot','tripadvisor','shopping-reviews','youtube-comments','sentiment-rollup','review-monitor','google-search','google-images','google-news','google-shopping','amazon-products','amazon-reviews','universal-scrape','yellow-pages','emails-scrape','domain-contacts','email-validate','email-clean','phones-enrich','b2b-database','lead-services','crm-export')),
  qty numeric not null default 1 check (qty > 0 and qty <= 100000000),
  gross_coins integer not null check (gross_coins >= 0 and gross_coins <= 100000000),
  cut_coins integer not null check (cut_coins >= 0 and cut_coins <= 100000000),
  provider_coins integer not null check (provider_coins >= 0 and provider_coins <= 100000000),
  source text not null default 'outscraper-studio' check (source in ('outscraper-studio','vcw','api','manual')),
  query text not null default '' check (char_length(query) <= 256),
  created_at timestamptz not null default now(),
  check (cut_coins + provider_coins = gross_coins)
);
create index if not exists idx_outscraper_usage_user on public.outscraper_usage (user_id, created_at desc);
create index if not exists idx_outscraper_usage_op on public.outscraper_usage (op, created_at desc);
create index if not exists idx_outscraper_usage_game on public.outscraper_usage (game_slug, created_at desc);

alter table public.outscraper_usage enable row level security;

drop policy if exists outscraper_usage_own on public.outscraper_usage;
create policy outscraper_usage_own on public.outscraper_usage
  for select to authenticated using (user_id = auth.uid());

revoke all on public.outscraper_usage from anon, authenticated;
grant select on public.outscraper_usage to authenticated;

-- SQL mirror of the TS split (single source of truth stays 25).
create or replace function public.outscraper_compute_split(p_gross integer)
returns table(gross integer, cut integer, provider integer)
language plpgsql immutable set search_path = public as $$
begin
  if p_gross is null or p_gross < 0 then raise exception 'invalid gross'; end if;
  gross := p_gross;
  cut := round(p_gross * 25 / 100.0)::integer;
  provider := p_gross - cut;
  return next;
end; $$;
revoke all on function public.outscraper_compute_split(integer) from public, anon, authenticated;
grant execute on function public.outscraper_compute_split(integer) to authenticated;

-- meter_outscraper_usage: debit personal coins (gross), split 25/75, record.
create or replace function public.meter_outscraper_usage(
  p_vendor text,
  p_game text,
  p_op text,
  p_qty numeric,
  p_source text default 'outscraper-studio',
  p_query text default ''
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_game text; v_gross integer; v_cut integer; v_provider integer; v_bal integer;
  v_fee record; v_query text := '';
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_vendor not in ('outscraper-maps','outscraper-reviews','outscraper-search','outscraper-leads') then
    raise exception 'invalid vendor';
  end if;
  v_game := lower(trim(coalesce(p_game, 'lobby')));
  if v_game !~ '^[a-z0-9-]{1,64}$' then raise exception 'invalid game'; end if;
  if p_op not in ('maps-search','place-details','maps-reviews-lite','maps-photos','maps-directions','traffic-extractor','geocode','reverse-geocode','new-businesses','maps-search-bulk','maps-reviews','play-reviews','trustpilot','tripadvisor','shopping-reviews','youtube-comments','sentiment-rollup','review-monitor','google-search','google-images','google-news','google-shopping','amazon-products','amazon-reviews','universal-scrape','yellow-pages','emails-scrape','domain-contacts','email-validate','email-clean','phones-enrich','b2b-database','lead-services','crm-export') then
    raise exception 'invalid op';
  end if;
  -- Vendor + op combo must match (each op belongs to exactly one vendor).
  if p_vendor = 'outscraper-maps' and p_op not in ('maps-search','place-details','maps-reviews-lite','maps-photos','maps-directions','traffic-extractor','geocode','reverse-geocode','new-businesses','maps-search-bulk') then
    raise exception 'op % does not belong to vendor %', p_op, p_vendor;
  end if;
  if p_vendor = 'outscraper-reviews' and p_op not in ('maps-reviews','play-reviews','trustpilot','tripadvisor','shopping-reviews','youtube-comments','sentiment-rollup','review-monitor') then
    raise exception 'op % does not belong to vendor %', p_op, p_vendor;
  end if;
  if p_vendor = 'outscraper-search' and p_op not in ('google-search','google-images','google-news','google-shopping','amazon-products','amazon-reviews','universal-scrape','yellow-pages') then
    raise exception 'op % does not belong to vendor %', p_op, p_vendor;
  end if;
  if p_vendor = 'outscraper-leads' and p_op not in ('emails-scrape','domain-contacts','email-validate','email-clean','phones-enrich','b2b-database','lead-services','crm-export') then
    raise exception 'op % does not belong to vendor %', p_op, p_vendor;
  end if;
  if p_qty is null or p_qty <= 0 or p_qty > 100000000 then raise exception 'invalid qty'; end if;
  if p_source not in ('outscraper-studio','vcw','api','manual') then raise exception 'invalid source'; end if;
  v_query := substr(coalesce(p_query, ''), 1, 256);

  -- Gross price by op (coins, cut INCLUDED; mirrors coinsPerUnit in
  -- lib/outscraper-maps.ts, lib/outscraper-reviews.ts,
  -- lib/outscraper-search.ts, lib/outscraper-leads.ts).
  v_gross := case p_op
    when 'maps-search' then greatest(1, ceil(8 * p_qty)::integer)
    when 'place-details' then greatest(1, ceil(5 * p_qty)::integer)
    when 'maps-reviews-lite' then greatest(1, ceil(4 * p_qty)::integer)
    when 'maps-photos' then greatest(1, ceil(6 * p_qty)::integer)
    when 'maps-directions' then greatest(1, ceil(3 * p_qty)::integer)
    when 'traffic-extractor' then greatest(1, ceil(5 * p_qty)::integer)
    when 'geocode' then greatest(1, ceil(3 * p_qty)::integer)
    when 'reverse-geocode' then greatest(1, ceil(3 * p_qty)::integer)
    when 'new-businesses' then greatest(1, ceil(12 * p_qty)::integer)
    when 'maps-search-bulk' then greatest(1, ceil(10 * p_qty)::integer)
    when 'maps-reviews' then greatest(1, ceil(8 * p_qty)::integer)
    when 'play-reviews' then greatest(1, ceil(6 * p_qty)::integer)
    when 'trustpilot' then greatest(1, ceil(5 * p_qty)::integer)
    when 'tripadvisor' then greatest(1, ceil(5 * p_qty)::integer)
    when 'shopping-reviews' then greatest(1, ceil(4 * p_qty)::integer)
    when 'youtube-comments' then greatest(1, ceil(3 * p_qty)::integer)
    when 'sentiment-rollup' then greatest(1, ceil(12 * p_qty)::integer)
    when 'review-monitor' then greatest(1, ceil(7 * p_qty)::integer)
    when 'google-search' then greatest(1, ceil(6 * p_qty)::integer)
    when 'google-images' then greatest(1, ceil(5 * p_qty)::integer)
    when 'google-news' then greatest(1, ceil(4 * p_qty)::integer)
    when 'google-shopping' then greatest(1, ceil(7 * p_qty)::integer)
    when 'amazon-products' then greatest(1, ceil(8 * p_qty)::integer)
    when 'amazon-reviews' then greatest(1, ceil(6 * p_qty)::integer)
    when 'universal-scrape' then greatest(1, ceil(12 * p_qty)::integer)
    when 'yellow-pages' then greatest(1, ceil(3 * p_qty)::integer)
    when 'emails-scrape' then greatest(1, ceil(8 * p_qty)::integer)
    when 'domain-contacts' then greatest(1, ceil(10 * p_qty)::integer)
    when 'email-validate' then greatest(1, ceil(2 * p_qty)::integer)
    when 'email-clean' then greatest(1, ceil(12 * p_qty)::integer)
    when 'phones-enrich' then greatest(1, ceil(6 * p_qty)::integer)
    when 'b2b-database' then greatest(1, ceil(9 * p_qty)::integer)
    when 'lead-services' then greatest(1, ceil(12 * p_qty)::integer)
    when 'crm-export' then greatest(1, ceil(3 * p_qty)::integer)
    else 1 end;
  -- OUTSCRAPER_*_CUT_PCT = 25 (lib/economy.ts SERVICE_CUT_PCT).
  v_cut := round(v_gross * 25 / 100.0)::integer;
  v_provider := v_gross - v_cut;

  select coalesce(sum(delta), 0)::integer into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_gross then
    raise exception 'insufficient balance: need % coins, have %', v_gross, v_bal;
  end if;

  select * into v_fee from public.outscraper_compute_split(v_gross);
  v_cut := v_fee.cut; v_provider := v_fee.provider;

  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_gross, substr('outscraper (' || v_game || '/' || p_op || ')', 1, 120));
  insert into public.outscraper_usage
    (user_id, game_slug, vendor, op, qty, gross_coins, cut_coins, provider_coins, source, query)
  values
    (auth.uid(), v_game, p_vendor, p_op, p_qty, v_gross, v_cut, v_provider, p_source, v_query);
  return jsonb_build_object(
    'gross_coins', v_gross, 'cut_coins', v_cut, 'provider_coins', v_provider,
    'vendor', p_vendor, 'op', p_op, 'game', v_game
  );
end; $$;
revoke all on function public.meter_outscraper_usage(text, text, text, numeric, text, text) from public, anon, authenticated;
grant execute on function public.meter_outscraper_usage(text, text, text, numeric, text, text) to authenticated;

-- my_outscraper_usage: one rollup for /my/usage; total + by-op + by-vendor + by-game + recent.
create or replace function public.my_outscraper_usage()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_total jsonb; v_byop jsonb; v_byvendor jsonb; v_bygame jsonb; v_recent jsonb;
begin
  if auth.uid() is null then raise exception 'login required'; end if;

  select jsonb_build_object(
    'gross', coalesce(sum(gross_coins), 0)::integer,
    'cut', coalesce(sum(cut_coins), 0)::integer,
    'provider', coalesce(sum(provider_coins), 0)::integer,
    'charges', count(*)::integer
  ) into v_total from public.outscraper_usage where user_id = auth.uid();

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_byop from (
    select op, count(*)::integer as charges,
      coalesce(sum(gross_coins), 0)::integer as gross,
      coalesce(sum(cut_coins), 0)::integer as cut,
      coalesce(sum(provider_coins), 0)::integer as provider
    from public.outscraper_usage where user_id = auth.uid()
    group by op order by gross desc
  ) t;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_byvendor from (
    select vendor, count(*)::integer as charges,
      coalesce(sum(gross_coins), 0)::integer as gross,
      coalesce(sum(cut_coins), 0)::integer as cut,
      coalesce(sum(provider_coins), 0)::integer as provider
    from public.outscraper_usage where user_id = auth.uid()
    group by vendor order by gross desc
  ) t;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_bygame from (
    select game_slug, count(*)::integer as charges,
      coalesce(sum(gross_coins), 0)::integer as gross,
      coalesce(sum(cut_coins), 0)::integer as cut,
      coalesce(sum(provider_coins), 0)::integer as provider
    from public.outscraper_usage where user_id = auth.uid()
    group by game_slug order by gross desc limit 50
  ) t;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_recent from (
    select game_slug, vendor, op, qty, gross_coins, cut_coins, provider_coins, source, query, created_at
    from public.outscraper_usage where user_id = auth.uid()
    order by created_at desc limit 25
  ) t;

  return jsonb_build_object(
    'total', v_total, 'byOp', v_byop, 'byVendor', v_byvendor, 'byGame', v_bygame, 'recent', v_recent
  );
end; $$;
revoke all on function public.my_outscraper_usage() from public, anon, authenticated;
grant execute on function public.my_outscraper_usage() to authenticated;

-- Spend view (per user + vendor + game + op; RLS still applies via base table).
create or replace view public.v_outscraper_spend as
select
  user_id,
  vendor,
  game_slug,
  op,
  count(*)::integer as charges,
  coalesce(sum(gross_coins), 0)::integer as gross_coins,
  coalesce(sum(cut_coins), 0)::integer as cut_coins,
  coalesce(sum(provider_coins), 0)::integer as provider_coins
from public.outscraper_usage
group by user_id, vendor, game_slug, op;
