-- ============================================================================
-- Usage ledger hardening: numeric rollups (centicentcoin-accurate) + clan
-- personal-spend helper.
-- Re-runnable: OR REPLACE / IF NOT EXISTS only.
--
-- Why:
--   * my_compute_usage() cast sums to ::integer, rounding away fractional
--     Vibe Coins (0.41 + 0.41 = 0.82 showed as gross 1). /my/usage must show
--     every centicentcoin, so this replaces the integer casts with
--     numeric(12, 2).
--   * Clan server-cost fees (post/comment/message), owner funding, and member
--     donations debit coin_ledger with reasons starting 'Clan '. my_clan_usage()
--     aggregates the caller's personal clan spend so /api/my/usage can break
--     it out instead of hiding it inside generic coin movements.
-- ============================================================================

create or replace function public.my_compute_usage(p_session uuid default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_total jsonb; v_hour jsonb; v_day jsonb; v_sess jsonb; v_bykind jsonb; v_bygame jsonb;
begin
  if auth.uid() is null then raise exception 'login required'; end if;

  select jsonb_build_object(
    'gross', coalesce(sum(gross_coins), 0)::numeric(12, 2),
    'cut', coalesce(sum(cut_coins), 0)::numeric(12, 2),
    'provider', coalesce(sum(provider_coins), 0)::numeric(12, 2),
    'turns', count(*)::integer
  ) into v_total from public.game_ai_usage where user_id = auth.uid();

  select jsonb_build_object(
    'gross', coalesce(sum(gross_coins), 0)::numeric(12, 2),
    'cut', coalesce(sum(cut_coins), 0)::numeric(12, 2),
    'provider', coalesce(sum(provider_coins), 0)::numeric(12, 2),
    'turns', count(*)::integer
  ) into v_hour from public.game_ai_usage
  where user_id = auth.uid() and created_at > now() - interval '1 hour';

  select jsonb_build_object(
    'gross', coalesce(sum(gross_coins), 0)::numeric(12, 2),
    'cut', coalesce(sum(cut_coins), 0)::numeric(12, 2),
    'provider', coalesce(sum(provider_coins), 0)::numeric(12, 2),
    'turns', count(*)::integer
  ) into v_day from public.game_ai_usage
  where user_id = auth.uid() and created_at > now() - interval '24 hours';

  if p_session is null then
    v_sess := jsonb_build_object('gross', 0, 'cut', 0, 'provider', 0, 'turns', 0);
  else
    select jsonb_build_object(
      'gross', coalesce(sum(gross_coins), 0)::numeric(12, 2),
      'cut', coalesce(sum(cut_coins), 0)::numeric(12, 2),
      'provider', coalesce(sum(provider_coins), 0)::numeric(12, 2),
      'turns', count(*)::integer
    ) into v_sess from public.game_ai_usage
    where user_id = auth.uid() and session_id = p_session;
  end if;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_bykind from (
    select kind, count(*)::integer as turns,
      coalesce(sum(gross_coins), 0)::numeric(12, 2) as gross,
      coalesce(sum(cut_coins), 0)::numeric(12, 2) as cut,
      coalesce(sum(provider_coins), 0)::numeric(12, 2) as provider
    from public.game_ai_usage where user_id = auth.uid()
    group by kind order by gross desc
  ) t;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_bygame from (
    select game_slug, count(*)::integer as turns,
      coalesce(sum(gross_coins), 0)::numeric(12, 2) as gross,
      coalesce(sum(cut_coins), 0)::numeric(12, 2) as cut,
      coalesce(sum(provider_coins), 0)::numeric(12, 2) as provider
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

-- Personal clan spend: every coin_ledger debit whose reason starts 'Clan '
-- (post/comment/message fees, owner funding, member donations). Fees split
-- 25% platform / 75% clan wallet; funding/donations are 1:1 transfers.
create or replace function public.my_clan_usage()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_total jsonb; v_hour jsonb; v_day jsonb; v_byreason jsonb; v_recent jsonb;
begin
  if auth.uid() is null then raise exception 'login required'; end if;

  select jsonb_build_object(
    'gross', coalesce(sum(-delta), 0)::numeric(12, 2),
    'cut', coalesce(sum(round((-delta) * 25 / 100.0, 2)), 0)::numeric(12, 2),
    'charges', count(*)::integer
  ) into v_total from public.coin_ledger
  where user_id = auth.uid() and delta < 0 and reason ilike 'Clan %';

  select jsonb_build_object(
    'gross', coalesce(sum(-delta), 0)::numeric(12, 2),
    'cut', coalesce(sum(round((-delta) * 25 / 100.0, 2)), 0)::numeric(12, 2),
    'charges', count(*)::integer
  ) into v_hour from public.coin_ledger
  where user_id = auth.uid() and delta < 0 and reason ilike 'Clan %'
    and created_at > now() - interval '1 hour';

  select jsonb_build_object(
    'gross', coalesce(sum(-delta), 0)::numeric(12, 2),
    'cut', coalesce(sum(round((-delta) * 25 / 100.0, 2)), 0)::numeric(12, 2),
    'charges', count(*)::integer
  ) into v_day from public.coin_ledger
  where user_id = auth.uid() and delta < 0 and reason ilike 'Clan %'
    and created_at > now() - interval '24 hours';

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_byreason from (
    select reason as label, count(*)::integer as charges,
      coalesce(sum(-delta), 0)::numeric(12, 2) as gross
    from public.coin_ledger
    where user_id = auth.uid() and delta < 0 and reason ilike 'Clan %'
    group by reason order by gross desc limit 50
  ) t;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_recent from (
    select delta, reason, created_at from public.coin_ledger
    where user_id = auth.uid() and delta < 0 and reason ilike 'Clan %'
    order by created_at desc limit 25
  ) t;

  return jsonb_build_object(
    'total', v_total, 'lastHour', v_hour, 'last24h', v_day,
    'byReason', v_byreason, 'recent', v_recent
  );
end; $$;
revoke all on function public.my_clan_usage() from public, anon, authenticated;
grant execute on function public.my_clan_usage() to authenticated;
