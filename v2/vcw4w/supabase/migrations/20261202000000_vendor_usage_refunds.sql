-- ============================================================================
-- Vendor usage refunds: credit back a metered OpenRouter / Outscraper charge
-- when the provider call fails AFTER the debit (debit-first leaves the user
-- poorer for a run that never happened). Fully rerunnable: IF NOT EXISTS /
-- OR REPLACE / DROP ... IF EXISTS guards (repo rule).
--
-- Design (mirrors the coin_refunds audit discipline, but for usage debits —
-- refund_coin_lot() only reverses PURCHASED lots, so it cannot help here):
--   * Each usage table gains refunded_at (null = live charge). One charge
--     refunds at most once: the RPC raises 'already refunded' on replay, and
--     the row lock (FOR UPDATE) serializes concurrent refund attempts.
--   * refund_vendor_usage(p_family, p_usage_id) credits the FULL gross back
--     to coin_ledger with reason '<family> refund (<game>/<op>)'. In prod the
--     FIFO lots trigger mints a fresh lot for the credit, so refunded coins
--     return as spendable balance immediately.
--   * Ownership enforced: a caller can refund ONLY their own rows. Unknown id
--     and foreign id both raise 'usage charge not found' (no oracle).
--   * my_* rollups report NET spend (refunded rows excluded from totals) plus
--     explicit refunded_charges / refunded_coins counters. v_*_spend views
--     stay gross-charge audits (a refunded charge still happened).
--   * meter_* receipts gain usage_id so routes can target the exact row.
-- ============================================================================

-- 1. Refund marker columns.
alter table public.openrouter_usage
  add column if not exists refunded_at timestamptz;
alter table public.outscraper_usage
  add column if not exists refunded_at timestamptz;
create index if not exists idx_openrouter_usage_refunded
  on public.openrouter_usage (user_id, refunded_at) where refunded_at is not null;
create index if not exists idx_outscraper_usage_refunded
  on public.outscraper_usage (user_id, refunded_at) where refunded_at is not null;

-- 2. meter_openrouter_usage: identical pricing/validation to
-- 20261201000000, plus the charged row id in the receipt (needed by the
-- refund path in POST /api/openrouter-vendor/generate).
create or replace function public.meter_openrouter_usage(
  p_vendor text,
  p_game text,
  p_op text,
  p_qty numeric,
  p_source text default 'openrouter-studio'
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_game text; v_gross integer; v_cut integer; v_provider integer; v_bal integer;
  v_fee record; v_model text := ''; v_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_vendor not in ('openrouter-chat','openrouter-agent','openrouter-meta') then
    raise exception 'invalid vendor';
  end if;
  v_game := lower(trim(coalesce(p_game, 'lobby')));
  if v_game !~ '^[a-z0-9-]{1,64}$' then raise exception 'invalid game'; end if;
  -- Op must belong to the vendor's own op set (fail-closed on mismatch).
  if p_vendor = 'openrouter-chat' and p_op not in ('chat','chat-stream','prompt-completion','vision-chat','assistant-prefill','reasoning','max-tokens','seeded','stop-sequences','logit-bias','prediction','multi-turn') then
    raise exception 'invalid op for vendor';
  end if;
  if p_vendor = 'openrouter-agent' and p_op not in ('tool-calling','structured-json','structured-schema','web-search','file-parse','response-healing','context-compress','fallback-route','provider-pin','audio-input','usage-metered','debug-echo') then
    raise exception 'invalid op for vendor';
  end if;
  if p_vendor = 'openrouter-meta' and p_op not in ('models-list','model-detail','endpoints-list','credits-balance','key-manage','generation-stats','activity-feed','model-router') then
    raise exception 'invalid op for vendor';
  end if;
  if p_qty is null or p_qty <= 0 or p_qty > 100000000 then raise exception 'invalid qty'; end if;
  if p_source not in ('openrouter-studio','vcw','api','manual') then raise exception 'invalid source'; end if;

  -- Gross price by op (coins, cut INCLUDED; mirrors lib/openrouter-chat.ts
  -- OPENROUTER_CHAT_OPS + lib/openrouter-agent.ts OPENROUTER_AGENT_OPS +
  -- lib/openrouter-meta.ts OPENROUTER_META_OPS).
  v_gross := case p_op
    when 'chat' then greatest(1, ceil(4 * p_qty)::integer)
    when 'chat-stream' then greatest(1, ceil(4 * p_qty)::integer)
    when 'prompt-completion' then greatest(1, ceil(2 * p_qty)::integer)
    when 'vision-chat' then greatest(1, ceil(8 * p_qty)::integer)
    when 'assistant-prefill' then greatest(1, ceil(3 * p_qty)::integer)
    when 'reasoning' then greatest(1, ceil(8 * p_qty)::integer)
    when 'max-tokens' then greatest(1, ceil(2 * p_qty)::integer)
    when 'seeded' then greatest(1, ceil(3 * p_qty)::integer)
    when 'stop-sequences' then greatest(1, ceil(3 * p_qty)::integer)
    when 'logit-bias' then greatest(1, ceil(3 * p_qty)::integer)
    when 'prediction' then greatest(1, ceil(5 * p_qty)::integer)
    when 'multi-turn' then greatest(1, ceil(6 * p_qty)::integer)
    when 'tool-calling' then greatest(1, ceil(5 * p_qty)::integer)
    when 'structured-json' then greatest(1, ceil(4 * p_qty)::integer)
    when 'structured-schema' then greatest(1, ceil(6 * p_qty)::integer)
    when 'web-search' then greatest(1, ceil(7 * p_qty)::integer)
    when 'file-parse' then greatest(1, ceil(6 * p_qty)::integer)
    when 'response-healing' then greatest(1, ceil(3 * p_qty)::integer)
    when 'context-compress' then greatest(1, ceil(8 * p_qty)::integer)
    when 'fallback-route' then greatest(1, ceil(5 * p_qty)::integer)
    when 'provider-pin' then greatest(1, ceil(4 * p_qty)::integer)
    when 'audio-input' then greatest(1, ceil(10 * p_qty)::integer)
    when 'usage-metered' then greatest(1, ceil(2 * p_qty)::integer)
    when 'debug-echo' then greatest(1, ceil(2 * p_qty)::integer)
    when 'models-list' then greatest(1, ceil(1 * p_qty)::integer)
    when 'model-detail' then greatest(1, ceil(1 * p_qty)::integer)
    when 'endpoints-list' then greatest(1, ceil(2 * p_qty)::integer)
    when 'credits-balance' then greatest(1, ceil(1 * p_qty)::integer)
    when 'key-manage' then greatest(1, ceil(2 * p_qty)::integer)
    when 'generation-stats' then greatest(1, ceil(1 * p_qty)::integer)
    when 'activity-feed' then greatest(1, ceil(2 * p_qty)::integer)
    when 'model-router' then greatest(1, ceil(4 * p_qty)::integer)
    else 1 end;
  -- OPENROUTER_*_CUT_PCT = 25 (lib/economy.ts + openrouter libs).
  v_cut := round(v_gross * 25 / 100.0)::integer;
  v_provider := v_gross - v_cut;

  -- Spend lock: serialize concurrent meters per caller so the balance check
  -- below cannot race; debit-first, fail-closed.
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));

  select coalesce(sum(delta), 0)::integer into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_gross then
    raise exception 'insufficient balance: need % coins, have %', v_gross, v_bal;
  end if;

  select * into v_fee from public.openrouter_compute_split(v_gross);
  v_cut := v_fee.cut; v_provider := v_fee.provider;

  v_model := case p_op
    when 'chat' then 'meta-llama/llama-4-scout-17b-16e-instruct'
    when 'chat-stream' then 'openai/gpt-5.2'
    when 'prompt-completion' then 'meta-llama/llama-4-scout-17b-16e-instruct'
    when 'vision-chat' then 'openai/gpt-5.2'
    when 'assistant-prefill' then 'anthropic/claude-opus-4.6'
    when 'reasoning' then 'openai/gpt-5.2'
    when 'max-tokens' then 'google/gemini-2.5-flash'
    when 'seeded' then 'meta-llama/llama-4-scout-17b-16e-instruct'
    when 'stop-sequences' then 'anthropic/claude-opus-4.6'
    when 'logit-bias' then 'openai/gpt-5.2'
    when 'prediction' then 'google/gemini-2.5-flash'
    when 'multi-turn' then 'anthropic/claude-opus-4.6'
    when 'tool-calling' then 'anthropic/claude-sonnet-4'
    when 'structured-json' then 'openai/gpt-4o-mini'
    when 'structured-schema' then 'openai/gpt-4o-2024-11-20'
    when 'web-search' then 'google/gemini-2.0-flash-001'
    when 'file-parse' then 'anthropic/claude-sonnet-4'
    when 'response-healing' then 'meta-llama/llama-3.3-70b-instruct'
    when 'context-compress' then 'google/gemini-2.0-flash-001'
    when 'fallback-route' then 'openai/gpt-4o-mini'
    when 'provider-pin' then 'mistralai/mistral-large'
    when 'audio-input' then 'openai/gpt-4o-audio-preview'
    when 'usage-metered' then 'openai/gpt-4o-mini'
    when 'debug-echo' then 'meta-llama/llama-3.3-70b-instruct'
    else 'n/a' end;

  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_gross, substr('openrouter (' || v_game || '/' || p_op || ')', 1, 120));
  insert into public.openrouter_usage
    (user_id, game_slug, vendor, op, qty, gross_coins, cut_coins, provider_coins, source, model)
  values
    (auth.uid(), v_game, p_vendor, p_op, p_qty, v_gross, v_cut, v_provider, p_source, v_model)
  returning id into v_id;
  return jsonb_build_object(
    'gross_coins', v_gross, 'cut_coins', v_cut, 'provider_coins', v_provider,
    'vendor', p_vendor, 'op', p_op, 'model', v_model, 'usage_id', v_id
  );
end; $$;
revoke all on function public.meter_openrouter_usage(text, text, text, numeric, text) from public, anon, authenticated;
grant execute on function public.meter_openrouter_usage(text, text, text, numeric, text) to authenticated;

-- 3. meter_outscraper_usage: identical pricing/validation to 20261201000001,
-- plus the charged row id in the receipt (refund path in
-- POST /api/outscraper/search).
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
  v_fee record; v_query text := ''; v_id uuid;
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

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));

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
    (auth.uid(), v_game, p_vendor, p_op, p_qty, v_gross, v_cut, v_provider, p_source, v_query)
  returning id into v_id;
  return jsonb_build_object(
    'gross_coins', v_gross, 'cut_coins', v_cut, 'provider_coins', v_provider,
    'vendor', p_vendor, 'op', p_op, 'game', v_game, 'usage_id', v_id
  );
end; $$;
revoke all on function public.meter_outscraper_usage(text, text, text, numeric, text, text) from public, anon, authenticated;
grant execute on function public.meter_outscraper_usage(text, text, text, numeric, text, text) to authenticated;

-- 4. refund_vendor_usage: credit the FULL gross of one metered charge back
-- to the caller's wallet and mark the row refunded. Called by the vendor
-- POST routes when the provider call fails AFTER a successful debit.
-- p_family is 'openrouter' (-> openrouter_usage) or 'outscraper'
-- (-> outscraper_usage); the table name is allowlisted, never interpolated
-- from raw input. One charge refunds at most once.
create or replace function public.refund_vendor_usage(
  p_family text,
  p_usage_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_table text; v_row record; v_reason text;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_usage_id is null then raise exception 'invalid usage id'; end if;
  v_table := case p_family
    when 'openrouter' then 'openrouter_usage'
    when 'outscraper' then 'outscraper_usage'
    else null end;
  if v_table is null then raise exception 'invalid family'; end if;

  -- Serialize concurrent refunds of the same charge per caller; the row lock
  -- below then guarantees the second attempt sees refunded_at set.
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text || ':' || p_usage_id::text));

  execute format(
    'select id, user_id, game_slug, vendor, op, gross_coins, refunded_at '
    'from public.%I where id = $1 for update',
    v_table)
  into v_row using p_usage_id;
  if not found then raise exception 'usage charge not found'; end if;
  if v_row.user_id is distinct from auth.uid() then
    raise exception 'usage charge not found';
  end if;
  if v_row.refunded_at is not null then raise exception 'already refunded'; end if;
  if v_row.gross_coins is null or v_row.gross_coins <= 0 then
    raise exception 'nothing to refund';
  end if;

  v_reason := substr(p_family || ' refund (' || v_row.game_slug || '/' || v_row.op || ')', 1, 120);
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), v_row.gross_coins, v_reason);
  execute format('update public.%I set refunded_at = now() where id = $1', v_table)
  using p_usage_id;
  return jsonb_build_object(
    'usage_id', p_usage_id, 'family', p_family, 'vendor', v_row.vendor,
    'op', v_row.op, 'game', v_row.game_slug,
    'refunded_coins', v_row.gross_coins, 'reason', v_reason
  );
end; $$;
revoke all on function public.refund_vendor_usage(text, uuid) from public, anon, authenticated;
grant execute on function public.refund_vendor_usage(text, uuid) to authenticated;

-- 5. Refund-aware rollups: totals go NET (refunded rows excluded) with
-- explicit refunded_charges / refunded_coins counters; recent trails carry
-- refunded_at so /my/usage can badge refunded rows.
create or replace function public.my_openrouter_usage()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_total jsonb; v_byvendor jsonb; v_byop jsonb; v_bygame jsonb; v_recent jsonb;
begin
  if auth.uid() is null then raise exception 'login required'; end if;

  select jsonb_build_object(
    'gross', coalesce(sum(gross_coins) filter (where refunded_at is null), 0)::integer,
    'cut', coalesce(sum(cut_coins) filter (where refunded_at is null), 0)::integer,
    'provider', coalesce(sum(provider_coins) filter (where refunded_at is null), 0)::integer,
    'charges', count(*) filter (where refunded_at is null),
    'refunded_charges', count(*) filter (where refunded_at is not null),
    'refunded_coins', coalesce(sum(gross_coins) filter (where refunded_at is not null), 0)::integer
  ) into v_total from public.openrouter_usage where user_id = auth.uid();

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_byvendor from (
    select vendor, count(*)::integer as charges,
      coalesce(sum(gross_coins), 0)::integer as gross,
      coalesce(sum(cut_coins), 0)::integer as cut,
      coalesce(sum(provider_coins), 0)::integer as provider
    from public.openrouter_usage where user_id = auth.uid() and refunded_at is null
    group by vendor order by gross desc
  ) t;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_byop from (
    select vendor, op, count(*)::integer as charges,
      coalesce(sum(gross_coins), 0)::integer as gross,
      coalesce(sum(cut_coins), 0)::integer as cut,
      coalesce(sum(provider_coins), 0)::integer as provider
    from public.openrouter_usage where user_id = auth.uid() and refunded_at is null
    group by vendor, op order by gross desc
  ) t;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_bygame from (
    select game_slug, count(*)::integer as charges,
      coalesce(sum(gross_coins), 0)::integer as gross,
      coalesce(sum(cut_coins), 0)::integer as cut,
      coalesce(sum(provider_coins), 0)::integer as provider
    from public.openrouter_usage where user_id = auth.uid() and refunded_at is null
    group by game_slug order by gross desc limit 50
  ) t;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_recent from (
    select game_slug, vendor, op, qty, gross_coins, cut_coins, provider_coins, source, model, generation_id, refunded_at, created_at
    from public.openrouter_usage where user_id = auth.uid()
    order by created_at desc limit 25
  ) t;

  return jsonb_build_object(
    'total', v_total, 'byVendor', v_byvendor, 'byOp', v_byop, 'byGame', v_bygame, 'recent', v_recent
  );
end; $$;
revoke all on function public.my_openrouter_usage() from public, anon, authenticated;
grant execute on function public.my_openrouter_usage() to authenticated;

create or replace function public.my_outscraper_usage()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_total jsonb; v_byop jsonb; v_byvendor jsonb; v_bygame jsonb; v_recent jsonb;
begin
  if auth.uid() is null then raise exception 'login required'; end if;

  select jsonb_build_object(
    'gross', coalesce(sum(gross_coins) filter (where refunded_at is null), 0)::integer,
    'cut', coalesce(sum(cut_coins) filter (where refunded_at is null), 0)::integer,
    'provider', coalesce(sum(provider_coins) filter (where refunded_at is null), 0)::integer,
    'charges', count(*) filter (where refunded_at is null),
    'refunded_charges', count(*) filter (where refunded_at is not null),
    'refunded_coins', coalesce(sum(gross_coins) filter (where refunded_at is not null), 0)::integer
  ) into v_total from public.outscraper_usage where user_id = auth.uid();

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_byop from (
    select op, count(*)::integer as charges,
      coalesce(sum(gross_coins), 0)::integer as gross,
      coalesce(sum(cut_coins), 0)::integer as cut,
      coalesce(sum(provider_coins), 0)::integer as provider
    from public.outscraper_usage where user_id = auth.uid() and refunded_at is null
    group by op order by gross desc
  ) t;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_byvendor from (
    select vendor, count(*)::integer as charges,
      coalesce(sum(gross_coins), 0)::integer as gross,
      coalesce(sum(provider_coins), 0)::integer as provider,
      coalesce(sum(cut_coins), 0)::integer as cut
    from public.outscraper_usage where user_id = auth.uid() and refunded_at is null
    group by vendor order by gross desc
  ) t;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_bygame from (
    select game_slug, count(*)::integer as charges,
      coalesce(sum(gross_coins), 0)::integer as gross,
      coalesce(sum(cut_coins), 0)::integer as cut,
      coalesce(sum(provider_coins), 0)::integer as provider
    from public.outscraper_usage where user_id = auth.uid() and refunded_at is null
    group by game_slug order by gross desc limit 50
  ) t;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_recent from (
    select game_slug, vendor, op, qty, gross_coins, cut_coins, provider_coins, source, query, refunded_at, created_at
    from public.outscraper_usage where user_id = auth.uid()
    order by created_at desc limit 25
  ) t;

  return jsonb_build_object(
    'total', v_total, 'byOp', v_byop, 'byVendor', v_byvendor, 'byGame', v_bygame, 'recent', v_recent
  );
end; $$;
revoke all on function public.my_outscraper_usage() from public, anon, authenticated;
grant execute on function public.my_outscraper_usage() to authenticated;
