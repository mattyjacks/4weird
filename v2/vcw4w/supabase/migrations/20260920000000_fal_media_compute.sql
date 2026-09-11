-- ============================================================================
-- fal.ai media compute (/fal studio) - 25% cut on all 15 fal ops, same rule
-- as every other compute surface (SERVICE_CUT_PCT / GAME_AI_COMPUTE_CUT_PCT
-- / WORKSPACE_COMPUTE_CUT_PCT). Fully rerunnable: IF NOT EXISTS /
-- OR REPLACE / DROP ... IF EXISTS guards (repo rule).
--
-- Rule (mirrors lib/economy.ts SERVICE_CUT_PCT = 25 and lib/fal.ts
-- FAL_COMPUTE_CUT_PCT = 25):
--   * Listed fal prices are GROSS, cut INCLUDED, never added on top.
--   * meter_fal_usage() debits the caller's personal coin balance (gross),
--     splits 25% platform / 75% provider, and records the split per game +
--     op. Ops: concept-art | sprite-edit | icon-logo | texture-tile |
--     upscale-hd | remove-bg | render-3d | trailer-clip | animate-sprite |
--     npc-voice | sfx-burst | theme-music | lipsync-take | playtest-notes |
--     app-promo. Sources: fal-studio | vcw | api | manual.
--   * Never faked, never negative. Wallets move only here.
-- ============================================================================

create table if not exists public.fal_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_slug text not null default 'lobby' check (game_slug ~ '^[a-z0-9-]{1,64}$'),
  op text not null check (op in ('concept-art','sprite-edit','icon-logo','texture-tile','upscale-hd','remove-bg','render-3d','trailer-clip','animate-sprite','npc-voice','sfx-burst','theme-music','lipsync-take','playtest-notes','app-promo')),
  qty numeric not null default 1 check (qty > 0 and qty <= 100000000),
  gross_coins integer not null check (gross_coins >= 0 and gross_coins <= 100000000),
  cut_coins integer not null check (cut_coins >= 0 and cut_coins <= 100000000),
  provider_coins integer not null check (provider_coins >= 0 and provider_coins <= 100000000),
  source text not null default 'fal-studio' check (source in ('fal-studio','vcw','api','manual')),
  fal_request_id text not null default '' check (char_length(fal_request_id) <= 128),
  model text not null default '' check (char_length(model) <= 128),
  created_at timestamptz not null default now(),
  check (cut_coins + provider_coins = gross_coins)
);
create index if not exists idx_fal_usage_user on public.fal_usage (user_id, created_at desc);
create index if not exists idx_fal_usage_op on public.fal_usage (op, created_at desc);
create index if not exists idx_fal_usage_game on public.fal_usage (game_slug, created_at desc);

alter table public.fal_usage enable row level security;

drop policy if exists fal_usage_own on public.fal_usage;
create policy fal_usage_own on public.fal_usage
  for select to authenticated using (user_id = auth.uid());

revoke all on public.fal_usage from anon, authenticated;
grant select on public.fal_usage to authenticated;

-- SQL mirror of the TS split (single source of truth stays 25).
create or replace function public.fal_compute_split(p_gross integer)
returns table(gross integer, cut integer, provider integer)
language plpgsql immutable set search_path = public as $$
begin
  if p_gross is null or p_gross < 0 then raise exception 'invalid gross'; end if;
  gross := p_gross;
  cut := round(p_gross * 25 / 100.0)::integer;
  provider := p_gross - cut;
  return next;
end; $$;
revoke all on function public.fal_compute_split(integer) from public, anon, authenticated;
grant execute on function public.fal_compute_split(integer) to authenticated;

-- meter_fal_usage: debit personal coins (gross), split 25/75, record.
create or replace function public.meter_fal_usage(
  p_game text,
  p_op text,
  p_qty numeric,
  p_source text default 'fal-studio'
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_game text; v_gross integer; v_cut integer; v_provider integer; v_bal integer;
  v_fee record; v_model text := '';
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  v_game := lower(trim(coalesce(p_game, 'lobby')));
  if v_game !~ '^[a-z0-9-]{1,64}$' then raise exception 'invalid game'; end if;
  if p_op not in ('concept-art','sprite-edit','icon-logo','texture-tile','upscale-hd','remove-bg','render-3d','trailer-clip','animate-sprite','npc-voice','sfx-burst','theme-music','lipsync-take','playtest-notes','app-promo') then
    raise exception 'invalid op';
  end if;
  if p_qty is null or p_qty <= 0 or p_qty > 100000000 then raise exception 'invalid qty'; end if;
  if p_source not in ('fal-studio','vcw','api','manual') then raise exception 'invalid source'; end if;

  -- Gross price by op (coins, cut INCLUDED; mirrors lib/fal.ts FAL_OPS).
  v_gross := case p_op
    when 'concept-art' then greatest(1, ceil(8 * p_qty)::integer)
    when 'sprite-edit' then greatest(1, ceil(8 * p_qty)::integer)
    when 'icon-logo' then greatest(1, ceil(10 * p_qty)::integer)
    when 'texture-tile' then greatest(1, ceil(8 * p_qty)::integer)
    when 'upscale-hd' then greatest(1, ceil(6 * p_qty)::integer)
    when 'remove-bg' then greatest(1, ceil(3 * p_qty)::integer)
    when 'render-3d' then greatest(1, ceil(15 * p_qty)::integer)
    when 'trailer-clip' then greatest(1, ceil(25 * p_qty)::integer)
    when 'animate-sprite' then greatest(1, ceil(20 * p_qty)::integer)
    when 'npc-voice' then greatest(1, ceil(4 * p_qty)::integer)
    when 'sfx-burst' then greatest(1, ceil(6 * p_qty)::integer)
    when 'theme-music' then greatest(1, ceil(10 * p_qty)::integer)
    when 'lipsync-take' then greatest(1, ceil(18 * p_qty)::integer)
    when 'playtest-notes' then greatest(1, ceil(3 * p_qty)::integer)
    when 'app-promo' then greatest(1, ceil(8 * p_qty)::integer)
    else 1 end;
  -- FAL_COMPUTE_CUT_PCT = 25 (lib/economy.ts + lib/fal.ts).
  v_cut := round(v_gross * 25 / 100.0)::integer;
  v_provider := v_gross - v_cut;

  select coalesce(sum(delta), 0)::integer into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_gross then
    raise exception 'insufficient balance: need % coins, have %', v_gross, v_bal;
  end if;

  select * into v_fee from public.fal_compute_split(v_gross);
  v_cut := v_fee.cut; v_provider := v_fee.provider;

  v_model := case p_op
    when 'concept-art' then 'fal-ai/flux/schnell'
    when 'sprite-edit' then 'fal-ai/nano-banana-2/edit'
    when 'icon-logo' then 'fal-ai/ideogram/v3'
    when 'texture-tile' then 'fal-ai/recraft-v3'
    when 'upscale-hd' then 'fal-ai/topaz/upscale/image'
    when 'remove-bg' then 'fal-ai/birefnet'
    when 'render-3d' then 'fal-ai/trellis/image-to-3d'
    when 'trailer-clip' then 'fal-ai/kling-video/v3/pro/text-to-video'
    when 'animate-sprite' then 'fal-ai/minimax/h3/image-to-video'
    when 'npc-voice' then 'fal-ai/minimax/speech-02-hd'
    when 'sfx-burst' then 'fal-ai/stable-audio-v2'
    when 'theme-music' then 'fal-ai/musicgen/medium'
    when 'lipsync-take' then 'fal-ai/sync-lipsync'
    when 'playtest-notes' then 'fal-ai/whisper-v3'
    when 'app-promo' then 'fal-ai/flux/dev'
    else '' end;

  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_gross, substr('fal.ai (' || v_game || '/' || p_op || ')', 1, 120));
  insert into public.fal_usage
    (user_id, game_slug, op, qty, gross_coins, cut_coins, provider_coins, source, model)
  values
    (auth.uid(), v_game, p_op, p_qty, v_gross, v_cut, v_provider, p_source, v_model);
  return jsonb_build_object(
    'gross_coins', v_gross, 'cut_coins', v_cut, 'provider_coins', v_provider,
    'op', p_op, 'model', v_model
  );
end; $$;
revoke all on function public.meter_fal_usage(text, text, numeric, text) from public, anon, authenticated;
grant execute on function public.meter_fal_usage(text, text, numeric, text) to authenticated;

-- my_fal_usage: one rollup for /my/usage; total + by-op + by-game + recent.
create or replace function public.my_fal_usage()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_total jsonb; v_byop jsonb; v_bygame jsonb; v_recent jsonb;
begin
  if auth.uid() is null then raise exception 'login required'; end if;

  select jsonb_build_object(
    'gross', coalesce(sum(gross_coins), 0)::integer,
    'cut', coalesce(sum(cut_coins), 0)::integer,
    'provider', coalesce(sum(provider_coins), 0)::integer,
    'charges', count(*)::integer
  ) into v_total from public.fal_usage where user_id = auth.uid();

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_byop from (
    select op, count(*)::integer as charges,
      coalesce(sum(gross_coins), 0)::integer as gross,
      coalesce(sum(cut_coins), 0)::integer as cut,
      coalesce(sum(provider_coins), 0)::integer as provider
    from public.fal_usage where user_id = auth.uid()
    group by op order by gross desc
  ) t;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_bygame from (
    select game_slug, count(*)::integer as charges,
      coalesce(sum(gross_coins), 0)::integer as gross,
      coalesce(sum(cut_coins), 0)::integer as cut,
      coalesce(sum(provider_coins), 0)::integer as provider
    from public.fal_usage where user_id = auth.uid()
    group by game_slug order by gross desc limit 50
  ) t;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_recent from (
    select game_slug, op, qty, gross_coins, cut_coins, provider_coins, source, model, created_at
    from public.fal_usage where user_id = auth.uid()
    order by created_at desc limit 25
  ) t;

  return jsonb_build_object(
    'total', v_total, 'byOp', v_byop, 'byGame', v_bygame, 'recent', v_recent
  );
end; $$;
revoke all on function public.my_fal_usage() from public, anon, authenticated;
grant execute on function public.my_fal_usage() to authenticated;

-- Spend view (per user + game + op; RLS still applies via base table).
create or replace view public.v_fal_spend as
select
  user_id,
  game_slug,
  op,
  count(*)::integer as charges,
  coalesce(sum(gross_coins), 0)::integer as gross_coins,
  coalesce(sum(cut_coins), 0)::integer as cut_coins,
  coalesce(sum(provider_coins), 0)::integer as provider_coins
from public.fal_usage
group by user_id, game_slug, op;
