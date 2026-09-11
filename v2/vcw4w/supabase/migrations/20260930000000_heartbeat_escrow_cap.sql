-- ============================================================================
-- Heartbeat cap fix ("heartbleed" pattern): heartbeat_usage() accepted up to
-- 86400 seconds (24h) in a single beat while the API layer
-- (app/api/agents/bookings/[id]/heartbeat/route.ts + isHeartbeatSeconds in
-- lib/agent-market.ts) caps single beats to 1..3600 (1h). The RPC is granted
-- to `authenticated`, so any signed-in caller could bypass the API and meter
-- up to 24h in ONE rpc call, draining the booking escrow at once (the escrow
-- guard only stops *exceeding* escrow, not draining it in one beat).
--
-- This is the Heartbleed shape: a client-supplied length (p_seconds) the
-- server trusted beyond the actual beat size. Fix: enforce 1..3600 in the
-- database too, so API and RPC agree even on direct rpc calls.
--
-- Fully rerunnable: CREATE OR REPLACE + REVOKE/GRANT guards. Keeps the
-- escrow cap from 20260910120000_reconcile_clans_bots.sql and the 25% cut
-- split (cut = round(gross*25/100), provider = gross - cut).
-- ============================================================================

create or replace function public.heartbeat_usage(p_booking uuid, p_seconds integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_booking public.rental_bookings; v_owner uuid; v_price integer;
        v_gross integer; v_cut integer; v_provider integer; v_metered integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  -- Single-beat cap: 1h max. Matches isHeartbeatSeconds() (lib/agent-market.ts)
  -- and the heartbeat API route. Previously 1..86400 let one call drain escrow.
  if p_seconds is null or p_seconds < 1 or p_seconds > 3600 then raise exception 'seconds must be 1..3600'; end if;
  select b.* into v_booking from public.rental_bookings b where b.id = p_booking;
  if not found then raise exception 'booking not found'; end if;
  select l.owner_id, l.price_cents_per_hour into v_owner, v_price
  from public.agent_listings l where l.id = v_booking.listing_id;
  if v_booking.renter_id <> auth.uid() and coalesce(v_owner, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid() then
    raise exception 'not authorized'; end if;
  if v_booking.status <> 'active' then raise exception 'booking is not active'; end if;
  v_gross := round(v_price * p_seconds / 3600.0)::integer;
  select coalesce(sum(gross_cents), 0)::integer into v_metered
  from public.compute_usage where booking_id = p_booking;
  if v_metered + v_gross > v_booking.escrow_coins then raise exception 'usage exceeds escrow'; end if;
  v_cut := round(v_gross * 25 / 100.0)::integer;
  v_provider := v_gross - v_cut;
  insert into public.compute_usage (booking_id, seconds, gross_cents, cut_cents, provider_cents, source)
  values (p_booking, p_seconds, v_gross, v_cut, v_provider, 'heartbeat');
  return jsonb_build_object('gross_cents', v_gross, 'cut_cents', v_cut, 'provider_cents', v_provider);
end; $$;
revoke all on function public.heartbeat_usage(uuid, integer) from anon, authenticated;
grant execute on function public.heartbeat_usage(uuid, integer) to authenticated;
