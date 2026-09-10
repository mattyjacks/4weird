-- ============================================================================
-- Game AI compute + Gaming Buddy — 25% cut on ALL game AI, same rule as
-- every other compute surface (SERVICE_CUT_PCT / WORKSPACE_COMPUTE_CUT_PCT).
-- Fully rerunnable: IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS.
--
-- Rule (mirrors lib/economy.ts GAME_AI_COMPUTE_CUT_PCT = 25 and
-- lib/game-ai.ts GAME_AI_COMPUTE_CUT_PCT = 25):
--   * Listed game-AI prices are GROSS, cut INCLUDED, never added on top.
--   * meter_game_ai_usage() debits the caller's personal coin balance (gross),
--     splits 25% platform / 75% provider, and records the split per game +
--     feature kind. Kinds: dialogue | director | tts | runpod-gpu |
--     inference | buddy-chat | buddy-tts. Modes: required | optional.
--   * Buddy sessions group turns: start_buddy_session() opens one row,
--     turns append game_ai_usage rows with that session_id, end_buddy_session()
--     stamps totals. Session / total / last-hour / last-24h rollups power
--     /my/usage and the buddy widget's live credit readout.
--   * Never faked, never negative. Wallets move only here.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Operator-wired feature catalog (static registry in lib/game-ai.ts renders
--    without DB; these rows override/augment it when real providers exist).
-- --------------------------------------------------------------------------
create table if not exists public.game_ai_features (
  id uuid primary key default gen_random_uuid(),
  game_slug text not null check (game_slug ~ '^[a-z0-9-]{1,64}$'),
  kind text not null check (kind in ('dialogue','director','tts','runpod-gpu','inference','buddy-chat','buddy-tts')),
  mode text not null check (mode in ('required','optional')),
  provider text not null default 'openai' check (provider in ('runpod','openai','inference-api','custom')),
  label varchar(80) not null default '' check (char_length(label) <= 80),
  blurb varchar(300) not null default '' check (char_length(blurb) <= 300),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (game_slug, kind)
);
create index if not exists idx_game_ai_features_slug on public.game_ai_features (game_slug);

-- --------------------------------------------------------------------------
-- 2. Buddy sessions (one per widget run; universal across games).
-- --------------------------------------------------------------------------
create table if not exists public.buddy_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_slug text not null default 'lobby' check (game_slug ~ '^[a-z0-9-]{1,64}$'),
  voice text not null default 'alloy' check (voice in ('alloy','ash','coral','echo','fable','onyx','nova','sage','shimmer')),
  status text not null default 'open' check (status in ('open','ended')),
  gross_coins integer not null default 0 check (gross_coins >= 0 and gross_coins <= 100000000),
  cut_coins integer not null default 0 check (cut_coins >= 0 and cut_coins <= 100000000),
  turns integer not null default 0 check (turns >= 0 and turns <= 100000),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists idx_buddy_sessions_user on public.buddy_sessions (user_id, started_at desc);

-- --------------------------------------------------------------------------
-- 3. Metered game-AI usage (gross INCLUDES the 25% cut; cut+provider=gross).
-- --------------------------------------------------------------------------
create table if not exists public.game_ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_slug text not null check (game_slug ~ '^[a-z0-9-]{1,64}$'),
  kind text not null check (kind in ('dialogue','director','tts','runpod-gpu','inference','buddy-chat','buddy-tts')),
  mode text not null default 'optional' check (mode in ('required','optional')),
  session_id uuid references public.buddy_sessions (id) on delete set null,
  qty numeric not null default 1 check (qty > 0 and qty <= 100000000),
  gross_coins integer not null check (gross_coins >= 0 and gross_coins <= 100000000),
  cut_coins integer not null check (cut_coins >= 0 and cut_coins <= 100000000),
  provider_coins integer not null check (provider_coins >= 0 and provider_coins <= 100000000),
  source text not null default 'meter' check (source in ('meter','chat','tts','heartbeat','manual')),
  created_at timestamptz not null default now(),
  check (cut_coins + provider_coins = gross_coins)
);
create index if not exists idx_game_ai_usage_user on public.game_ai_usage (user_id, created_at desc);
create index if not exists idx_game_ai_usage_session on public.game_ai_usage (session_id, created_at desc);
create index if not exists idx_game_ai_usage_game on public.game_ai_usage (game_slug, created_at desc);

-- --------------------------------------------------------------------------
-- 4. RLS — deny by default; users read their own rows only.
-- --------------------------------------------------------------------------
alter table public.game_ai_features enable row level security;
alter table public.buddy_sessions enable row level security;
alter table public.game_ai_usage enable row level security;

drop policy if exists game_ai_features_read on public.game_ai_features;
create policy game_ai_features_read on public.game_ai_features
  for select to anon, authenticated using (enabled = true);

drop policy if exists buddy_sessions_own on public.buddy_sessions;
create policy buddy_sessions_own on public.buddy_sessions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists game_ai_usage_own on public.game_ai_usage;
create policy game_ai_usage_own on public.game_ai_usage
  for select to authenticated using (user_id = auth.uid());

revoke all on public.game_ai_features from anon, authenticated;
revoke all on public.buddy_sessions from anon, authenticated;
revoke all on public.game_ai_usage from anon, authenticated;
grant select on public.game_ai_features to anon, authenticated;
grant select on public.buddy_sessions to authenticated;
grant select on public.game_ai_usage to authenticated;

-- --------------------------------------------------------------------------
-- 5. SQL mirror of the TS split (single source of truth stays 25).
-- --------------------------------------------------------------------------
create or replace function public.game_ai_compute_split(p_gross integer)
returns table(gross integer, cut integer, provider integer)
language plpgsql immutable set search_path = public as $$
begin
  if p_gross is null or p_gross < 0 then raise exception 'invalid gross'; end if;
  gross := p_gross;
  cut := round(p_gross * 25 / 100.0)::integer;
  provider := p_gross - cut;
  return next;
end; $$;
revoke all on function public.game_ai_compute_split(integer) from public, anon, authenticated;
grant execute on function public.game_ai_compute_split(integer) to authenticated;

-- --------------------------------------------------------------------------
-- 6. RPCs — the ONLY writers.
-- --------------------------------------------------------------------------

-- start_buddy_session: open a universal buddy session (any game, 9 voices).
create or replace function public.start_buddy_session(p_game text, p_voice text)
returns public.buddy_sessions
language plpgsql security definer set search_path = public as $$
declare v_game text; v_voice text; v_row public.buddy_sessions;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  v_game := lower(trim(coalesce(p_game, 'lobby')));
  if v_game !~ '^[a-z0-9-]{1,64}$' then raise exception 'invalid game'; end if;
  v_voice := lower(trim(coalesce(p_voice, 'alloy')));
  if v_voice not in ('alloy','ash','coral','echo','fable','onyx','nova','sage','shimmer') then
    raise exception 'invalid voice';
  end if;
  insert into public.buddy_sessions (user_id, game_slug, voice)
  values (auth.uid(), v_game, v_voice)
  returning * into v_row;
  return v_row;
end; $$;
revoke all on function public.start_buddy_session(text, text) from public, anon, authenticated;
grant execute on function public.start_buddy_session(text, text) to authenticated;

-- meter_game_ai_usage: debit personal coins (gross), split 25/75, record.
create or replace function public.meter_game_ai_usage(
  p_game text,
  p_kind text,
  p_qty numeric,
  p_session uuid default null,
  p_source text default 'meter'
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_game text; v_mode text := 'optional'; v_gross integer; v_cut integer;
  v_provider integer; v_bal integer; v_fee record;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  v_game := lower(trim(coalesce(p_game, '')));
  if v_game !~ '^[a-z0-9-]{1,64}$' then raise exception 'invalid game'; end if;
  if p_kind not in ('dialogue','director','tts','runpod-gpu','inference','buddy-chat','buddy-tts') then
    raise exception 'invalid kind';
  end if;
  if p_qty is null or p_qty <= 0 or p_qty > 100000000 then raise exception 'invalid qty'; end if;
  if p_source not in ('meter','chat','tts','heartbeat','manual') then raise exception 'invalid source'; end if;
  if p_session is not null and not exists (
    select 1 from public.buddy_sessions s
    where s.id = p_session and s.user_id = auth.uid() and s.status = 'open'
  ) then raise exception 'session not found'; end if;

  -- Mode comes from the operator catalog when present (required games stay
  -- required); otherwise the static registry default of optional.
  select f.mode into v_mode from public.game_ai_features f
  where f.game_slug = v_game and f.kind = p_kind and f.enabled = true;
  if not found then v_mode := 'optional'; end if;

  -- Gross price by kind (coins, cut INCLUDED): dialogue/buddy-chat 3 per
  -- 1k tokens, tts/buddy-tts 2 per 1k chars, director 2 per decision,
  -- runpod-gpu 12 per gpu-min, inference 6 per worker-min.
  v_gross := case p_kind
    when 'dialogue' then greatest(1, ceil(3 * p_qty)::integer)
    when 'buddy-chat' then greatest(1, ceil(3 * p_qty)::integer)
    when 'tts' then greatest(1, ceil(2 * p_qty)::integer)
    when 'buddy-tts' then greatest(1, ceil(2 * p_qty)::integer)
    when 'director' then greatest(1, ceil(2 * p_qty)::integer)
    when 'runpod-gpu' then greatest(1, ceil(12 * p_qty)::integer)
    when 'inference' then greatest(1, ceil(6 * p_qty)::integer)
    else 1 end;
  -- GAME_AI_COMPUTE_CUT_PCT = 25 (lib/economy.ts + lib/game-ai.ts).
  v_cut := round(v_gross * 25 / 100.0)::integer;
  v_provider := v_gross - v_cut;

  select coalesce(sum(delta), 0)::integer into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_gross then
    raise exception 'insufficient balance: need % coins, have %', v_gross, v_bal;
  end if;

  select * into v_fee from public.game_ai_compute_split(v_gross);
  v_cut := v_fee.cut; v_provider := v_fee.provider;

  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_gross, substr('Game AI (' || v_game || '/' || p_kind || ')', 1, 120));
  insert into public.game_ai_usage
    (user_id, game_slug, kind, mode, session_id, qty, gross_coins, cut_coins, provider_coins, source)
  values
    (auth.uid(), v_game, p_kind, v_mode, p_session, p_qty, v_gross, v_cut, v_provider, p_source);
  if p_session is not null then
    update public.buddy_sessions
    set gross_coins = gross_coins + v_gross,
        cut_coins = cut_coins + v_cut,
        turns = turns + 1
    where id = p_session;
  end if;
  return jsonb_build_object(
    'gross_coins', v_gross, 'cut_coins', v_cut, 'provider_coins', v_provider, 'mode', v_mode
  );
end; $$;
revoke all on function public.meter_game_ai_usage(text, text, numeric, uuid, text) from public, anon, authenticated;
grant execute on function public.meter_game_ai_usage(text, text, numeric, uuid, text) to authenticated;

-- end_buddy_session: close your own open session, return its totals.
create or replace function public.end_buddy_session(p_session uuid)
returns public.buddy_sessions
language plpgsql security definer set search_path = public as $$
declare v_row public.buddy_sessions;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select * into v_row from public.buddy_sessions where id = p_session and user_id = auth.uid();
  if not found then raise exception 'session not found'; end if;
  if v_row.status <> 'open' then raise exception 'session is not open'; end if;
  update public.buddy_sessions
  set status = 'ended', ended_at = now()
  where id = p_session
  returning * into v_row;
  return v_row;
end; $$;
revoke all on function public.end_buddy_session(uuid) from public, anon, authenticated;
grant execute on function public.end_buddy_session(uuid) to authenticated;

-- my_compute_usage: one rollup for /my/usage — session + total + last hour
-- + last 24h over game_ai_usage (+ buddy), personal coin spend, agent rental
-- compute_usage, and workspace cloud_usage visibility is org-scoped so this
-- returns only what the caller may see (personal surfaces; org spend stays
-- in the teams UI via platform_compute_cuts).
create or replace function public.my_compute_usage(p_session uuid default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_total jsonb; v_hour jsonb; v_day jsonb; v_sess jsonb; v_bykind jsonb; v_bygame jsonb;
begin
  if auth.uid() is null then raise exception 'login required'; end if;

  select jsonb_build_object(
    'gross', coalesce(sum(gross_coins), 0)::integer,
    'cut', coalesce(sum(cut_coins), 0)::integer,
    'provider', coalesce(sum(provider_coins), 0)::integer,
    'turns', count(*)::integer
  ) into v_total from public.game_ai_usage where user_id = auth.uid();

  select jsonb_build_object(
    'gross', coalesce(sum(gross_coins), 0)::integer,
    'cut', coalesce(sum(cut_coins), 0)::integer,
    'provider', coalesce(sum(provider_coins), 0)::integer,
    'turns', count(*)::integer
  ) into v_hour from public.game_ai_usage
  where user_id = auth.uid() and created_at > now() - interval '1 hour';

  select jsonb_build_object(
    'gross', coalesce(sum(gross_coins), 0)::integer,
    'cut', coalesce(sum(cut_coins), 0)::integer,
    'provider', coalesce(sum(provider_coins), 0)::integer,
    'turns', count(*)::integer
  ) into v_day from public.game_ai_usage
  where user_id = auth.uid() and created_at > now() - interval '24 hours';

  if p_session is null then
    v_sess := jsonb_build_object('gross', 0, 'cut', 0, 'provider', 0, 'turns', 0);
  else
    select jsonb_build_object(
      'gross', coalesce(sum(gross_coins), 0)::integer,
      'cut', coalesce(sum(cut_coins), 0)::integer,
      'provider', coalesce(sum(provider_coins), 0)::integer,
      'turns', count(*)::integer
    ) into v_sess from public.game_ai_usage
    where user_id = auth.uid() and session_id = p_session;
  end if;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_bykind from (
    select kind, count(*)::integer as turns,
      coalesce(sum(gross_coins), 0)::integer as gross,
      coalesce(sum(cut_coins), 0)::integer as cut,
      coalesce(sum(provider_coins), 0)::integer as provider
    from public.game_ai_usage where user_id = auth.uid()
    group by kind order by gross desc
  ) t;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_bygame from (
    select game_slug, count(*)::integer as turns,
      coalesce(sum(gross_coins), 0)::integer as gross,
      coalesce(sum(cut_coins), 0)::integer as cut,
      coalesce(sum(provider_coins), 0)::integer as provider
    from public.game_ai_usage where user_id = auth.uid()
    group by game_slug order by gross desc limit 50
  ) t;

  return jsonb_build_object(
    'session', v_sess, 'total', v_total, 'lastHour', v_hour, 'last24h', v_day,
    'byKind', v_bykind, 'byGame', v_bygame
  );
end; $$;
revoke all on function public.my_compute_usage(uuid) from public, anon, authenticated;
grant execute on function public.my_compute_usage(uuid) to authenticated;

-- --------------------------------------------------------------------------
-- 7. Spend view (per user + game + kind; RLS still applies via base table).
-- --------------------------------------------------------------------------
create or replace view public.v_game_ai_spend as
select
  user_id,
  game_slug,
  kind,
  count(*)::integer as turns,
  coalesce(sum(gross_coins), 0)::integer as gross_coins,
  coalesce(sum(cut_coins), 0)::integer as cut_coins,
  coalesce(sum(provider_coins), 0)::integer as provider_coins
from public.game_ai_usage
group by user_id, game_slug, kind;
