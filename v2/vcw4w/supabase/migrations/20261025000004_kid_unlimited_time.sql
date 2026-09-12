-- ============================================================================
-- Kid controls unlimited-time fix.
--
-- The API maps -1 to "unlimited" (NULL daily_minutes), and set_kid_controls
-- has a dedicated -1 -> NULL block, but the range guard rejects -1 first
-- ('daily minutes must be 0..1440'), so unlimited time always 400s. This
-- re-issues the function with the guard widened to -1..1440; the rest is
-- byte-identical to 20260924000002_family_accounts.sql. Fully rerunnable.
-- ============================================================================

create or replace function public.set_kid_controls(
  p_kid uuid, p_daily_minutes integer, p_start time, p_end time, p_tz text,
  p_cap numeric, p_hard_stop boolean, p_age_band text, p_status text)
returns public.kid_controls language plpgsql security definer set search_path = public as $$
declare v_row public.kid_controls;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not exists (select 1 from public.kid_accounts where id = p_kid and parent_id = auth.uid()) then
    raise exception 'not your child account';
  end if;
  if p_daily_minutes is not null and (p_daily_minutes < -1 or p_daily_minutes > 1440) then
    raise exception 'daily minutes must be -1..1440 (-1 = unlimited)';
  end if;
  if p_cap is not null and (p_cap < 0 or p_cap > 100000000) then raise exception 'invalid budget cap'; end if;
  if p_tz is not null and not exists (select 1 from pg_timezone_names where name = p_tz) then
    raise exception 'unknown timezone';
  end if;
  if p_age_band is not null and p_age_band not in ('kid', 'teen', 'adult') then
    raise exception 'invalid age band';
  end if;
  if p_status is not null and p_status not in ('active', 'suspended') then
    raise exception 'invalid status';
  end if;
  insert into public.kid_controls (kid_id, daily_minutes, allowed_start, allowed_end, timezone, monthly_cap_coins, hard_stop, updated_at)
  values (p_kid,
    p_daily_minutes,
    coalesce(p_start, time '06:00'), coalesce(p_end, time '22:00'), coalesce(p_tz, 'UTC'),
    coalesce(p_cap, 0), coalesce(p_hard_stop, false), now())
  on conflict (kid_id) do update set
    daily_minutes = case when p_daily_minutes is null and excluded.daily_minutes is null then public.kid_controls.daily_minutes else excluded.daily_minutes end,
    allowed_start = excluded.allowed_start, allowed_end = excluded.allowed_end,
    timezone = excluded.timezone, monthly_cap_coins = excluded.monthly_cap_coins,
    hard_stop = excluded.hard_stop, updated_at = now()
  returning * into v_row;
  -- NOTE: NULL daily_minutes means "leave unchanged" here; the API sends the
  -- full control set, and a dedicated clear uses -1 (mapped below).
  if p_daily_minutes = -1 then
    update public.kid_controls set daily_minutes = null, updated_at = now() where kid_id = p_kid returning * into v_row;
  end if;
  if p_age_band is not null then
    update public.kid_accounts set age_band = p_age_band where id = p_kid;
  end if;
  if p_status is not null then
    update public.kid_accounts set status = p_status where id = p_kid;
  end if;
  return v_row;
end; $$;
revoke all on function public.set_kid_controls(uuid, integer, time, time, text, numeric, boolean, text, text) from public, anon;
grant execute on function public.set_kid_controls(uuid, integer, time, time, text, numeric, boolean, text, text) to authenticated;
