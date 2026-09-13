-- ============================================================================
-- Security lockdown: close direct mint paths + deny-by-default RLS.
--
-- 1. mint_crown / support_credit become service_role-only. Every legitimate
--    caller is a SECURITY DEFINER wrapper that debits first (tip_creator,
--    subscribe_to_tier, contribute_launch_campaign, renew_support_subscriptions,
--    settle_booking_escrow), and definer-to-definer calls keep working after
--    the authenticated grant is gone. No app/TS caller references either
--    function directly.
-- 2. coin_lots / coin_lot_spends / org_scale_settings / clan_scale_settings
--    get RLS enabled with NO policies (deny by default) + explicit revokes.
--    All legitimate access is via SECURITY DEFINER RPCs/triggers (owner
--    bypasses RLS); no app/TS code reads these tables with a user JWT.
-- 3. log_clan_transfer loses its anon grant (log spam / table bloat by
--    anyone); log_clan_ai_usage requires login. Neither has any caller in
--    app/lib today, so nothing legitimate breaks.
--
-- Rerunnable: REVOKE / GRANT / ALTER ... ENABLE ROW LEVEL SECURITY are all
-- idempotent; the patched logger uses CREATE OR REPLACE. No tables,
-- policies, triggers, or indexes are created here. No coin-table columns
-- are altered (RLS enable + revoke only).
-- ============================================================================

-- 1. Direct mint paths: service_role only ------------------------------------
revoke all on function public.mint_crown(uuid, numeric, text, text, uuid) from authenticated;
grant execute on function public.mint_crown(uuid, numeric, text, text, uuid) to service_role;

revoke all on function public.support_credit(uuid, uuid, uuid, numeric, text, text) from authenticated;
grant execute on function public.support_credit(uuid, uuid, uuid, numeric, text, text) to service_role;

-- 2. Deny-by-default RLS on RPC-only tables -----------------------------------
alter table public.coin_lots enable row level security;
revoke all on public.coin_lots from anon, authenticated;

alter table public.coin_lot_spends enable row level security;
revoke all on public.coin_lot_spends from anon, authenticated;

alter table public.org_scale_settings enable row level security;
revoke all on public.org_scale_settings from anon, authenticated;

alter table public.clan_scale_settings enable row level security;
revoke all on public.clan_scale_settings from anon, authenticated;

-- 3. Metering loggers: no anon writes, login required -------------------------
create or replace function public.log_clan_ai_usage(
  p_clan_id uuid, p_kind text default 'luna-check', p_qty numeric default 1
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_kind text := lower(trim(coalesce(p_kind, 'luna-check')));
  v_qty numeric(12, 2) := greatest(0, least(100000, coalesce(p_qty, 1)));
  v_coins numeric(12, 4);
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_kind not in ('luna-check', 'luna-image') then raise exception 'invalid kind'; end if;
  if not exists (select 1 from public.clans where id = p_clan_id) then
    raise exception 'clan not found';
  end if;
  v_coins := round(v_qty * 0.015, 4);
  insert into public.clan_ai_usage (clan_id, kind, qty, coins)
  values (p_clan_id, v_kind, v_qty, v_coins);
  return jsonb_build_object('coins', v_coins, 'qty', v_qty);
end; $$;
revoke all on function public.log_clan_ai_usage(uuid, text, numeric) from public, anon, authenticated;
grant execute on function public.log_clan_ai_usage(uuid, text, numeric) to authenticated, service_role;

revoke all on function public.log_clan_transfer(uuid, integer, text) from anon;
grant execute on function public.log_clan_transfer(uuid, integer, text) to authenticated, service_role;
