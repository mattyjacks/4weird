-- ============================================================================
-- OpenRouter compute (/openrouter studio) - 25% cut on all 32 OpenRouter ops,
-- same rule as every other compute surface (SERVICE_CUT_PCT /
-- GAME_AI_COMPUTE_CUT_PCT / WORKSPACE_COMPUTE_CUT_PCT / FAL_COMPUTE_CUT_PCT).
-- Fully rerunnable: IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS guards
-- (repo rule).
--
-- Rule (mirrors lib/economy.ts SERVICE_CUT_PCT = 25 and
-- lib/openrouter-chat.ts OPENROUTER_CHAT_CUT_PCT = 25,
-- lib/openrouter-agent.ts OPENROUTER_AGENT_CUT_PCT = 25,
-- lib/openrouter-meta.ts OPENROUTER_META_CUT_PCT = 25):
--   * Listed OpenRouter prices are GROSS, cut INCLUDED, never added on top.
--   * meter_openrouter_usage() debits the caller's personal coin balance
--     (gross), splits 25% platform / 75% provider, and records the split per
--     game + vendor + op. Vendors: openrouter-chat | openrouter-agent |
--     openrouter-meta. Sources: openrouter-studio | vcw | api | manual.
--   * Never faked, never negative. Wallets move only here.
--
-- Rate sources (ALL THREE lib files read and verified, no fallback used):
--   * v2/vcw4w/lib/openrouter-chat.ts OPENROUTER_CHAT_OPS (12 ops, unit
--     1k_tokens): chat 4 | chat-stream 4 | prompt-completion 2 |
--     vision-chat 8 | assistant-prefill 3 | reasoning 8 | max-tokens 2 |
--     seeded 3 | stop-sequences 3 | logit-bias 3 | prediction 5 |
--     multi-turn 6.
--   * v2/vcw4w/lib/openrouter-agent.ts OPENROUTER_AGENT_OPS (12 ops; unit
--     1k_tokens except usage-metered + debug-echo per generation):
--     tool-calling 5 | structured-json 4 | structured-schema 6 |
--     web-search 7 | file-parse 6 | response-healing 3 | context-compress 8 |
--     fallback-route 5 | provider-pin 4 | audio-input 10 | usage-metered 2 |
--     debug-echo 2.
--   * v2/vcw4w/lib/openrouter-meta.ts OPENROUTER_META_OPS (8 ops; unit sync /
--     lookup / generation): models-list 1 | model-detail 1 |
--     endpoints-list 2 | credits-balance 1 | key-manage 2 |
--     generation-stats 1 | activity-feed 2 | model-router 4.
--   * Gross quote mirrors the TS quoters (quoteOpenRouterChat /
--     quoteOpenRouterAgent / quoteOpenRouterMeta):
--     gross = greatest(1, ceil(rate * p_qty)).
-- ============================================================================

create table if not exists public.openrouter_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_slug text not null default 'lobby' check (game_slug ~ '^[a-z0-9-]{1,64}$'),
  vendor text not null check (vendor in ('openrouter-chat','openrouter-agent','openrouter-meta')),
  op text not null check (op in ('chat','chat-stream','prompt-completion','vision-chat','assistant-prefill','reasoning','max-tokens','seeded','stop-sequences','logit-bias','prediction','multi-turn','tool-calling','structured-json','structured-schema','web-search','file-parse','response-healing','context-compress','fallback-route','provider-pin','audio-input','usage-metered','debug-echo','models-list','model-detail','endpoints-list','credits-balance','key-manage','generation-stats','activity-feed','model-router')),
  qty numeric not null default 1 check (qty > 0 and qty <= 100000000),
  gross_coins integer not null check (gross_coins >= 0 and gross_coins <= 100000000),
  cut_coins integer not null check (cut_coins >= 0 and cut_coins <= 100000000),
  provider_coins integer not null check (provider_coins >= 0 and provider_coins <= 100000000),
  source text not null default 'openrouter-studio' check (source in ('openrouter-studio','vcw','api','manual')),
  model text not null default '' check (char_length(model) <= 128),
  generation_id text not null default '' check (char_length(generation_id) <= 128),
  created_at timestamptz not null default now(),
  check (cut_coins + provider_coins = gross_coins)
);
create index if not exists idx_openrouter_usage_user on public.openrouter_usage (user_id, created_at desc);
create index if not exists idx_openrouter_usage_op on public.openrouter_usage (op, created_at desc);
create index if not exists idx_openrouter_usage_game on public.openrouter_usage (game_slug, created_at desc);

alter table public.openrouter_usage enable row level security;

drop policy if exists openrouter_usage_own on public.openrouter_usage;
create policy openrouter_usage_own on public.openrouter_usage
  for select to authenticated using (user_id = auth.uid());

revoke all on public.openrouter_usage from anon, authenticated;
grant select on public.openrouter_usage to authenticated;

-- SQL mirror of the TS split (single source of truth stays 25).
create or replace function public.openrouter_compute_split(p_gross integer)
returns table(gross integer, cut integer, provider integer)
language plpgsql immutable set search_path = public as $$
begin
  if p_gross is null or p_gross < 0 then raise exception 'invalid gross'; end if;
  gross := p_gross;
  cut := round(p_gross * 25 / 100.0)::integer;
  provider := p_gross - cut;
  return next;
end; $$;
revoke all on function public.openrouter_compute_split(integer) from public, anon, authenticated;
grant execute on function public.openrouter_compute_split(integer) to authenticated;

-- meter_openrouter_usage: debit personal coins (gross), split 25/75, record.
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
  v_fee record; v_model text := '';
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
    (auth.uid(), v_game, p_vendor, p_op, p_qty, v_gross, v_cut, v_provider, p_source, v_model);
  return jsonb_build_object(
    'gross_coins', v_gross, 'cut_coins', v_cut, 'provider_coins', v_provider,
    'vendor', p_vendor, 'op', p_op, 'model', v_model
  );
end; $$;
revoke all on function public.meter_openrouter_usage(text, text, text, numeric, text) from public, anon, authenticated;
grant execute on function public.meter_openrouter_usage(text, text, text, numeric, text) to authenticated;

-- my_openrouter_usage: one rollup for /my/usage; total + by-vendor + by-op + by-game + recent.
create or replace function public.my_openrouter_usage()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_total jsonb; v_byvendor jsonb; v_byop jsonb; v_bygame jsonb; v_recent jsonb;
begin
  if auth.uid() is null then raise exception 'login required'; end if;

  select jsonb_build_object(
    'gross', coalesce(sum(gross_coins), 0)::integer,
    'cut', coalesce(sum(cut_coins), 0)::integer,
    'provider', coalesce(sum(provider_coins), 0)::integer,
    'charges', count(*)::integer
  ) into v_total from public.openrouter_usage where user_id = auth.uid();

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_byvendor from (
    select vendor, count(*)::integer as charges,
      coalesce(sum(gross_coins), 0)::integer as gross,
      coalesce(sum(cut_coins), 0)::integer as cut,
      coalesce(sum(provider_coins), 0)::integer as provider
    from public.openrouter_usage where user_id = auth.uid()
    group by vendor order by gross desc
  ) t;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_byop from (
    select vendor, op, count(*)::integer as charges,
      coalesce(sum(gross_coins), 0)::integer as gross,
      coalesce(sum(cut_coins), 0)::integer as cut,
      coalesce(sum(provider_coins), 0)::integer as provider
    from public.openrouter_usage where user_id = auth.uid()
    group by vendor, op order by gross desc
  ) t;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_bygame from (
    select game_slug, count(*)::integer as charges,
      coalesce(sum(gross_coins), 0)::integer as gross,
      coalesce(sum(cut_coins), 0)::integer as cut,
      coalesce(sum(provider_coins), 0)::integer as provider
    from public.openrouter_usage where user_id = auth.uid()
    group by game_slug order by gross desc limit 50
  ) t;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_recent from (
    select game_slug, vendor, op, qty, gross_coins, cut_coins, provider_coins, source, model, generation_id, created_at
    from public.openrouter_usage where user_id = auth.uid()
    order by created_at desc limit 25
  ) t;

  return jsonb_build_object(
    'total', v_total, 'byVendor', v_byvendor, 'byOp', v_byop, 'byGame', v_bygame, 'recent', v_recent
  );
end; $$;
revoke all on function public.my_openrouter_usage() from public, anon, authenticated;
grant execute on function public.my_openrouter_usage() to authenticated;

-- Spend view (per user + game + vendor + op; RLS still applies via base table).
create or replace view public.v_openrouter_spend as
select
  user_id,
  game_slug,
  vendor,
  op,
  count(*)::integer as charges,
  coalesce(sum(gross_coins), 0)::integer as gross_coins,
  coalesce(sum(cut_coins), 0)::integer as cut_coins,
  coalesce(sum(provider_coins), 0)::integer as provider_coins
from public.openrouter_usage
group by user_id, game_slug, vendor, op;
