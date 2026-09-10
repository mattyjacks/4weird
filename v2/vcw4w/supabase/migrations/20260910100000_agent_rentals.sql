-- ============================================================================
-- Agent-rental marketplace: compute providers, agent listings, rental
-- bookings, metered compute usage + RPCs.
-- Re-runnable: every statement is IF NOT EXISTS / OR REPLACE / guarded by a
-- preceding DROP ... IF EXISTS.
--
-- Money model (mirrors lib/economy.ts: SERVICE_CUT_PCT = 25,
-- COIN_PRICE_CENTS_EACH = 1, i.e. 1 coin = 1 cent):
--   - Listing prices are GROSS cents/hour and already INCLUDE the 25%
--     platform cut; the cut is never added on top.
--   - book_listing escrows the full gross (price * hours) as a NEGATIVE
--     coin_ledger delta ('Compute escrow: <name>').
--   - heartbeat_usage splits metered gross into cut = round(gross*25/100)
--     and provider = gross - cut, stored per compute_usage row.
--
-- OUT OF SCOPE (explicit): escrow release / refund accounting. Ending a
-- booking (end_booking) only flips status to 'ended' + stamps ended_at.
-- Unused escrow is NOT refunded and provider payouts are NOT settled here;
-- a future migration must add release/refund RPCs before real money flows.
-- ============================================================================

-- --------------------------------------------------------------------------
-- compute_providers: catalog of where agent VMs run.
-- --------------------------------------------------------------------------
create table if not exists public.compute_providers (
  code text primary key check (code in ('runpod', 'digitalocean', 'custom')),
  name text not null,
  supports_metering boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.compute_providers (code, name, supports_metering)
values
  ('runpod', 'RunPod', true),
  ('digitalocean', 'DigitalOcean', false),
  ('custom', 'Custom endpoint', false)
on conflict (code) do nothing;

-- --------------------------------------------------------------------------
-- agent_listings: rentable openclaw / nanoclaw / custom agents.
-- --------------------------------------------------------------------------
create table if not exists public.agent_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name varchar(80) not null check (char_length(name) between 1 and 80),
  runtime text not null check (runtime in ('openclaw', 'nanoclaw', 'custom')),
  provider_code text not null references public.compute_providers (code),
  endpoint_url text not null check (
    endpoint_url ~ '^https://' and char_length(endpoint_url) <= 2048
  ),
  price_cents_per_hour integer not null check (
    price_cents_per_hour between 1 and 100000
  ),
  status text not null default 'available' check (status in ('available', 'paused')),
  created_at timestamptz not null default now()
);
create index if not exists idx_agent_listings_owner on public.agent_listings (owner_id);
create index if not exists idx_agent_listings_status on public.agent_listings (status, created_at desc);

-- --------------------------------------------------------------------------
-- rental_bookings: one paid rental of a listing by a renter.
-- --------------------------------------------------------------------------
create table if not exists public.rental_bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.agent_listings (id) on delete cascade,
  renter_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'ended', 'cancelled')),
  escrow_coins integer not null check (escrow_coins > 0),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists idx_rental_bookings_listing on public.rental_bookings (listing_id);
create index if not exists idx_rental_bookings_renter on public.rental_bookings (renter_id, started_at desc);

-- --------------------------------------------------------------------------
-- compute_usage: metered slices of a booking (gross already includes the
-- 25% platform cut; cut_cents + provider_cents = gross_cents).
-- --------------------------------------------------------------------------
create table if not exists public.compute_usage (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.rental_bookings (id) on delete cascade,
  seconds integer not null check (seconds > 0 and seconds <= 86400),
  gross_cents integer not null check (gross_cents >= 0),
  cut_cents integer not null check (cut_cents >= 0),
  provider_cents integer not null check (provider_cents >= 0),
  source text not null check (source in ('heartbeat', 'webhook', 'manual')),
  reported_at timestamptz not null default now()
);
create index if not exists idx_compute_usage_booking on public.compute_usage (booking_id, reported_at desc);

-- ============================================================================
-- Row Level Security: reads only; every write goes through the RPCs below.
-- ============================================================================
alter table public.compute_providers enable row level security;
alter table public.agent_listings enable row level security;
alter table public.rental_bookings enable row level security;
alter table public.compute_usage enable row level security;

-- compute_providers: public catalog (browsers use the anon key).
drop policy if exists compute_providers_select_all on public.compute_providers;
create policy compute_providers_select_all on public.compute_providers
  for select to anon, authenticated using (true);

-- agent_listings: anyone sees available listings; owners see their own rows.
drop policy if exists agent_listings_select_available on public.agent_listings;
create policy agent_listings_select_available on public.agent_listings
  for select to anon, authenticated using (status = 'available');
drop policy if exists agent_listings_select_own on public.agent_listings;
create policy agent_listings_select_own on public.agent_listings
  for select to authenticated using (owner_id = auth.uid());

-- rental_bookings: the renter plus the listing owner.
drop policy if exists rental_bookings_select_mine on public.rental_bookings;
create policy rental_bookings_select_mine on public.rental_bookings
  for select to authenticated using (
    renter_id = auth.uid()
    or exists (
      select 1 from public.agent_listings l
      where l.id = rental_bookings.listing_id and l.owner_id = auth.uid()
    )
  );

-- compute_usage: visible to the booking's renter and the listing owner.
drop policy if exists compute_usage_select_mine on public.compute_usage;
create policy compute_usage_select_mine on public.compute_usage
  for select to authenticated using (
    exists (
      select 1 from public.rental_bookings b
      join public.agent_listings l on l.id = b.listing_id
      where b.id = compute_usage.booking_id
        and (b.renter_id = auth.uid() or l.owner_id = auth.uid())
    )
  );

-- Explicit table grants (belt + suspenders over RLS deny-by-default).
-- No INSERT / UPDATE / DELETE grants: client writes are denied, RPCs only.
revoke all on public.compute_providers from anon, authenticated;
revoke all on public.agent_listings from anon, authenticated;
revoke all on public.rental_bookings from anon, authenticated;
revoke all on public.compute_usage from anon, authenticated;
grant select on public.compute_providers to anon, authenticated;
grant select on public.agent_listings to anon, authenticated;
grant select on public.rental_bookings to authenticated;
grant select on public.compute_usage to authenticated;

-- ============================================================================
-- RPCs (SECURITY DEFINER): the only writers. All money movement happens here.
-- ============================================================================

-- create_listing: publish a rentable agent.
create or replace function public.create_listing(
  p_name text,
  p_runtime text,
  p_provider text,
  p_endpoint text,
  p_price integer
)
returns public.agent_listings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.agent_listings;
  v_name text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  v_name := trim(coalesce(p_name, ''));
  if char_length(v_name) < 1 or char_length(v_name) > 80 then
    raise exception 'name must be 1..80 characters';
  end if;
  if coalesce(p_runtime, '') not in ('openclaw', 'nanoclaw', 'custom') then
    raise exception 'runtime must be openclaw, nanoclaw, or custom';
  end if;
  if not exists (select 1 from public.compute_providers where code = p_provider) then
    raise exception 'unknown compute provider';
  end if;
  if coalesce(p_endpoint, '') !~ '^https://' or char_length(p_endpoint) > 2048 then
    raise exception 'endpoint must be an https URL';
  end if;
  if p_price is null or p_price < 1 or p_price > 100000 then
    raise exception 'price must be 1..100000 cents/hour (gross, includes 25%% platform cut)';
  end if;
  insert into public.agent_listings (owner_id, name, runtime, provider_code, endpoint_url, price_cents_per_hour)
  values (auth.uid(), v_name, p_runtime, p_provider, p_endpoint, p_price)
  returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.create_listing(text, text, text, text, integer) from anon, authenticated;
grant execute on function public.create_listing(text, text, text, text, integer) to authenticated;

-- book_listing: escrow gross coins (price * hours at 1 coin = 1 cent) + open a booking.
create or replace function public.book_listing(
  p_listing uuid,
  p_hours integer
)
returns public.rental_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.agent_listings;
  v_gross integer;
  v_balance integer;
  v_booking public.rental_bookings;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_hours is null or p_hours < 1 or p_hours > 720 then
    raise exception 'hours must be 1..720';
  end if;
  select * into v_listing from public.agent_listings where id = p_listing;
  if not found then raise exception 'listing not found'; end if;
  if v_listing.status <> 'available' then raise exception 'listing is not available'; end if;
  if v_listing.owner_id = auth.uid() then raise exception 'cannot book your own listing'; end if;
  -- Gross price already includes the 25% platform cut (see lib/economy.ts).
  v_gross := v_listing.price_cents_per_hour * p_hours;
  select coalesce(sum(delta), 0)::integer into v_balance
  from public.coin_ledger where user_id = auth.uid();
  if v_balance < v_gross then
    raise exception 'insufficient balance: need % coins, have %', v_gross, v_balance;
  end if;
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_gross, substring('Compute escrow: ' || v_listing.name from 1 for 120));
  insert into public.rental_bookings (listing_id, renter_id, escrow_coins)
  values (p_listing, auth.uid(), v_gross)
  returning * into v_booking;
  return v_booking;
end;
$$;
revoke all on function public.book_listing(uuid, integer) from anon, authenticated;
grant execute on function public.book_listing(uuid, integer) to authenticated;

-- heartbeat_usage: meter seconds on an active booking; splits gross into
-- 25% platform cut + provider share. Callable by renter or listing owner.
create or replace function public.heartbeat_usage(
  p_booking uuid,
  p_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.rental_bookings;
  v_owner uuid;
  v_price integer;
  v_gross integer;
  v_cut integer;
  v_provider integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_seconds is null or p_seconds < 1 or p_seconds > 86400 then
    raise exception 'seconds must be 1..86400';
  end if;
  select b.* into v_booking from public.rental_bookings b where b.id = p_booking;
  if not found then raise exception 'booking not found'; end if;
  select l.owner_id, l.price_cents_per_hour into v_owner, v_price
  from public.agent_listings l where l.id = v_booking.listing_id;
  if v_booking.renter_id <> auth.uid() and coalesce(v_owner, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid() then
    raise exception 'not authorized';
  end if;
  if v_booking.status <> 'active' then raise exception 'booking is not active'; end if;
  v_gross := round(v_price * p_seconds / 3600.0)::integer;
  -- SERVICE_CUT_PCT = 25 (lib/economy.ts); cut is included in the gross.
  v_cut := round(v_gross * 25 / 100.0)::integer;
  v_provider := v_gross - v_cut;
  insert into public.compute_usage (booking_id, seconds, gross_cents, cut_cents, provider_cents, source)
  values (p_booking, p_seconds, v_gross, v_cut, v_provider, 'heartbeat');
  return jsonb_build_object(
    'gross_cents', v_gross,
    'cut_cents', v_cut,
    'provider_cents', v_provider
  );
end;
$$;
revoke all on function public.heartbeat_usage(uuid, integer) from anon, authenticated;
grant execute on function public.heartbeat_usage(uuid, integer) to authenticated;

-- end_booking: close an active booking (renter or listing owner).
-- NOTE: escrow release/refund is out of scope (see header); this only ends it.
create or replace function public.end_booking(
  p_booking uuid
)
returns public.rental_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.rental_bookings;
  v_owner uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select b.* into v_booking from public.rental_bookings b where b.id = p_booking;
  if not found then raise exception 'booking not found'; end if;
  select l.owner_id into v_owner from public.agent_listings l where l.id = v_booking.listing_id;
  if v_booking.renter_id <> auth.uid() and coalesce(v_owner, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid() then
    raise exception 'not authorized';
  end if;
  if v_booking.status <> 'active' then raise exception 'booking is not active'; end if;
  update public.rental_bookings
  set status = 'ended', ended_at = now()
  where id = p_booking
  returning * into v_booking;
  return v_booking;
end;
$$;
revoke all on function public.end_booking(uuid) from anon, authenticated;
grant execute on function public.end_booking(uuid) to authenticated;
