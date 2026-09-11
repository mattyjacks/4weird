-- ============================================================================
-- Buddy presence kinds regression fix.
--
-- 20260918010000 added buddy-avatar (0.08/min) + buddy-camera (0.03/frame)
-- kinds to meter_game_ai_usage, but 20261018000000 (ledger pairing
-- hardening) re-created the function with the older 7-kind allowlist, so
-- every POST /api/buddy/presence hits 'invalid kind' and returns
-- pendingMigration:true - avatar presence is silently free forever.
-- This restores the two kinds + their rate arms. Fully rerunnable.
-- ============================================================================

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
  v_game text; v_mode text := 'optional'; v_gross numeric(12, 2); v_cut numeric(12, 2);
  v_provider numeric(12, 2); v_bal numeric(12, 2); v_fee record;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  perform public.coin_spend_lock(auth.uid());
  v_game := lower(trim(coalesce(p_game, '')));
  if v_game !~ '^[a-z0-9-]{1,64}$' then raise exception 'invalid game'; end if;
  if p_kind not in ('dialogue','director','tts','runpod-gpu','inference','buddy-chat','buddy-tts','buddy-avatar','buddy-camera') then
    raise exception 'invalid kind';
  end if;
  if p_qty is null or p_qty <= 0 or p_qty > 100000000 then raise exception 'invalid qty'; end if;
  if p_source not in ('meter','chat','tts','heartbeat','manual') then raise exception 'invalid source'; end if;
  if p_session is not null and not exists (
    select 1 from public.buddy_sessions s
    where s.id = p_session and s.user_id = auth.uid() and s.status = 'open'
  ) then raise exception 'session not found'; end if;
  select f.mode into v_mode from public.game_ai_features f
  where f.game_slug = v_game and f.kind = p_kind and f.enabled = true;
  if not found then v_mode := 'optional'; end if;
  v_gross := case p_kind
    when 'dialogue' then greatest(0.01, round(3.0 * p_qty, 2))
    when 'buddy-chat' then greatest(0.01, round(3.0 * p_qty, 2))
    when 'tts' then greatest(0.01, round(2.0 * p_qty, 2))
    when 'buddy-tts' then greatest(0.01, round(2.0 * p_qty, 2))
    when 'director' then greatest(0.01, round(2.0 * p_qty, 2))
    when 'runpod-gpu' then greatest(0.01, round(12.0 * p_qty, 2))
    when 'inference' then greatest(0.01, round(6.0 * p_qty, 2))
    when 'buddy-avatar' then greatest(0.01, round(0.08 * p_qty, 2))
    when 'buddy-camera' then greatest(0.01, round(0.03 * p_qty, 2))
    else 0.01 end;
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_gross then
    raise exception 'insufficient balance: need % coins, have %', v_gross, v_bal;
  end if;
  select * into v_fee from public.game_ai_compute_split_numeric(v_gross);
  v_cut := v_fee.cut; v_provider := v_fee.provider;
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_gross, substr('Game AI (' || v_game || '/' || p_kind || ')', 1, 120));
  insert into public.game_ai_usage
    (user_id, game_slug, kind, mode, session_id, qty, gross_coins, cut_coins, provider_coins, source)
  values
    (auth.uid(), v_game, p_kind, v_mode, p_session, p_qty, v_gross, v_cut, v_provider, p_source);
  perform public.record_platform_cut('game-ai-cut', v_gross, v_cut, 'game_ai_usage', null);
  if p_session is not null then
    update public.buddy_sessions
    set gross_coins = gross_coins + v_gross,
        cut_coins = cut_coins + v_cut,
        turns = turns + 1
    where id = p_session;
  end if;
  return jsonb_build_object(
    'gross_coins', v_gross,
    'cut_coins', v_cut,
    'provider_coins', v_provider,
    'mode', v_mode,
    'gross_centicentcoins', round(v_gross * 100)::integer
  );
end; $$;
revoke all on function public.meter_game_ai_usage(text, text, numeric, uuid, text) from public, anon, authenticated;
grant execute on function public.meter_game_ai_usage(text, text, numeric, uuid, text) to authenticated;
