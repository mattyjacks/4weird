-- Launch-only Alpha Tester bonus and race-safe daily claims.
-- Both rewards are owned by SECURITY DEFINER RPCs; browsers never write ledger rows.

create table if not exists public.alpha_tester_claims (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  claimed_at timestamptz not null default now()
);
alter table public.alpha_tester_claims enable row level security;
drop policy if exists alpha_tester_claims_own on public.alpha_tester_claims;
create policy alpha_tester_claims_own on public.alpha_tester_claims for select to authenticated using (user_id = auth.uid());

create or replace function public.claim_alpha_tester_bonus()
returns table(coins integer, claimed boolean) language plpgsql security definer set search_path=public as $$
declare claimed_user uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  insert into public.alpha_tester_claims(user_id) values (auth.uid())
    on conflict (user_id) do nothing returning user_id into claimed_user;
  if claimed_user is null then return query select 0, false; return; end if;
  insert into public.coin_ledger(user_id, delta, reason)
    values (auth.uid(), 500, 'Alpha Tester launch bonus');
  return query select 500, true;
end; $$;
revoke all on function public.claim_alpha_tester_bonus() from public, anon, authenticated;
grant execute on function public.claim_alpha_tester_bonus() to authenticated;

create or replace function public.claim_daily_bonus()
returns table(coins integer, streak integer) language plpgsql security definer set search_path=public as $$
declare yesterday date := (now() at time zone 'utc' - interval '1 day')::date;
declare today date := (now() at time zone 'utc')::date;
declare prior_date date;
declare prior_streak smallint;
declare next_streak smallint;
declare award integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  -- Serializes first-ever and repeated claims for this account, preventing duplicate awards.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  select last_claim_date, streak into prior_date, prior_streak
    from public.daily_claims where user_id = auth.uid();
  if found and prior_date = today then return query select 0, prior_streak::integer; return; end if;
  next_streak := case when found and prior_date = yesterday then least(prior_streak + 1, 3650) else 1 end;
  award := least(5 + (next_streak - 1), 12);
  insert into public.daily_claims(user_id, last_claim_date, streak, updated_at)
    values (auth.uid(), today, next_streak, now())
    on conflict (user_id) do update set last_claim_date = excluded.last_claim_date, streak = excluded.streak, updated_at = excluded.updated_at;
  insert into public.coin_ledger(user_id, delta, reason)
    values (auth.uid(), award, 'Daily login bonus (day ' || next_streak || ')');
  return query select award, next_streak::integer;
end; $$;
