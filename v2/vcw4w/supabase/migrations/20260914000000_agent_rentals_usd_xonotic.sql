-- ============================================================================
-- Agent rentals: USD/hr max quotes, new runtimes (vibecodeworker + xonotic),
-- RunPod default endpoint (no user https needed), per-second billing notes.
-- Re-runnable: every statement is guarded (DO blocks / IF NOT EXISTS).
--
-- Money model (unchanged): listing price is GROSS cents/hour, INCLUDES the
-- 25% platform cut. Quotes are per hour (a MAXIMUM: "up to $X/hr"); metering
-- settles per second from the first second:
--   gross_cents = round(price_cents_per_hour * seconds / 3600).
-- ============================================================================

-- 1. agent_listings: widen runtime + allow the `runpod:auto` sentinel.
do $$
begin
  -- Drop the old runtime check if present, then add the widened one.
  if exists (
    select 1 from pg_constraint where conname = 'agent_listings_runtime_check'
  ) then
    alter table public.agent_listings drop constraint agent_listings_runtime_check;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'agent_listings_runtime_check'
  ) then
    alter table public.agent_listings add constraint agent_listings_runtime_check
      check (runtime in ('openclaw', 'nanoclaw', 'vibecodeworker', 'xonotic-vcw', 'xonotic-self', 'custom'));
  end if;

  -- Endpoint: real https URL or the auto-provision sentinel.
  if exists (
    select 1 from pg_constraint where conname = 'agent_listings_endpoint_url_check'
  ) then
    alter table public.agent_listings drop constraint agent_listings_endpoint_url_check;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'agent_listings_endpoint_url_check'
  ) then
    alter table public.agent_listings add constraint agent_listings_endpoint_url_check
      check (
        (endpoint_url = 'runpod:auto')
        or (endpoint_url ~ '^https://' and char_length(endpoint_url) <= 2048)
      );
  end if;
end $$;

-- 2. rental_bookings: where the provisioned RunPod connection lives.
alter table public.rental_bookings add column if not exists pod_id text not null default '';
alter table public.rental_bookings add column if not exists endpoint_url text not null default '';
alter table public.rental_bookings add column if not exists gpu_type text not null default '';
create index if not exists idx_rental_bookings_pod on public.rental_bookings (pod_id);

-- 3. create_listing: accept the new runtimes + auto endpoint.
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
  if coalesce(p_runtime, '') not in ('openclaw', 'nanoclaw', 'vibecodeworker', 'xonotic-vcw', 'xonotic-self', 'custom') then
    raise exception 'runtime must be openclaw, nanoclaw, vibecodeworker, xonotic-vcw, xonotic-self, or custom';
  end if;
  if not exists (select 1 from public.compute_providers where code = p_provider) then
    raise exception 'unknown compute provider';
  end if;
  if coalesce(p_endpoint, '') <> 'runpod:auto'
     and (coalesce(p_endpoint, '') !~ '^https://' or char_length(p_endpoint) > 2048) then
    raise exception 'endpoint must be an https URL (RunPod and DigitalOcean may use runpod:auto)';
  end if;
  if p_provider = 'custom' and coalesce(p_endpoint, '') = 'runpod:auto' then
    raise exception 'custom endpoints need an https URL';
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
