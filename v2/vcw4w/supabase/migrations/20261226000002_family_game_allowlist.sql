-- Parent-managed game access. An empty allowlist preserves the existing
-- behavior (all catalog games remain available subject to age and budget).
alter table public.kid_controls
  add column if not exists allowed_games text[] not null default '{}';
alter table public.kid_controls
  add column if not exists hourly_cap_coins numeric(12, 2) not null default 0 check (hourly_cap_coins >= 0 and hourly_cap_coins <= 100000000),
  add column if not exists allowed_features text[] not null default '{}';

create or replace function public.set_kid_controls(
  p_kid uuid, p_daily_minutes integer, p_start time, p_end time, p_tz text,
  p_cap numeric, p_hard_stop boolean, p_age_band text, p_status text,
  p_allowed_games text[] default '{}', p_allowed_features text[] default '{}', p_hourly_cap numeric default 0)
returns public.kid_controls language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.kid_controls;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not exists (select 1 from public.kid_accounts where id = p_kid and parent_id = auth.uid()) then
    raise exception 'not your child account';
  end if;
  if p_daily_minutes is not null and (p_daily_minutes < -1 or p_daily_minutes > 1440) then raise exception 'daily minutes must be -1..1440 (-1 = unlimited)'; end if;
  if p_cap is not null and (p_cap < 0 or p_cap > 100000000) then raise exception 'invalid budget cap'; end if;
  if p_tz is not null and not exists (select 1 from pg_timezone_names where name = p_tz) then raise exception 'unknown timezone'; end if;
  if p_age_band is not null and p_age_band not in ('kid', 'teen', 'adult') then raise exception 'invalid age band'; end if;
  if p_status is not null and p_status not in ('active', 'suspended') then raise exception 'invalid status'; end if;
  if p_hourly_cap is not null and (p_hourly_cap < 0 or p_hourly_cap > 100000000) then raise exception 'invalid hourly cap'; end if;
  if coalesce(cardinality(p_allowed_games), 0) > 500 or exists (
    select 1 from unnest(coalesce(p_allowed_games, '{}')) as item(slug)
    where item.slug !~ '^[a-z0-9][a-z0-9_-]{0,63}$'
  ) then raise exception 'invalid game allowlist'; end if;
  if coalesce(cardinality(p_allowed_features), 0) > 500 or exists (
    select 1 from unnest(coalesce(p_allowed_features, '{}')) as item(feature)
    where item.feature !~ '^(game|app|ai|service):[a-z0-9][a-z0-9_-]{0,63}$'
  ) then raise exception 'invalid feature allowlist'; end if;
  insert into public.kid_controls (kid_id, daily_minutes, allowed_start, allowed_end, timezone, monthly_cap_coins, hourly_cap_coins, hard_stop, allowed_games, allowed_features, updated_at)
  values (p_kid, p_daily_minutes, coalesce(p_start, time '06:00'), coalesce(p_end, time '22:00'), coalesce(p_tz, 'UTC'), coalesce(p_cap, 0), coalesce(p_hourly_cap, 0), coalesce(p_hard_stop, false), coalesce(p_allowed_games, '{}'), coalesce(p_allowed_features, '{}'), now())
  on conflict (kid_id) do update set
    daily_minutes = case when p_daily_minutes is null and excluded.daily_minutes is null then public.kid_controls.daily_minutes else excluded.daily_minutes end,
    allowed_start = excluded.allowed_start, allowed_end = excluded.allowed_end,
    timezone = excluded.timezone, monthly_cap_coins = excluded.monthly_cap_coins,
    hard_stop = excluded.hard_stop, allowed_games = excluded.allowed_games,
    allowed_features = excluded.allowed_features, hourly_cap_coins = excluded.hourly_cap_coins, updated_at = now()
  returning * into v_row;
  if p_daily_minutes = -1 then update public.kid_controls set daily_minutes = null, updated_at = now() where kid_id = p_kid returning * into v_row; end if;
  if p_age_band is not null then update public.kid_accounts set age_band = p_age_band where id = p_kid; end if;
  if p_status is not null then update public.kid_accounts set status = p_status where id = p_kid; end if;
  return v_row;
end; $$;
revoke all on function public.set_kid_controls(uuid, integer, time, time, text, numeric, boolean, text, text, text[], text[], numeric) from public, anon;
grant execute on function public.set_kid_controls(uuid, integer, time, time, text, numeric, boolean, text, text, text[], text[], numeric) to authenticated;
