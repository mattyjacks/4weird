-- Alpha Tester gift: 300 coins ($3.00), capped at 10,000 coins total given away.
-- Replaces the 500-coin uncapped award. Ledger-sum cap keeps pre-change awards
-- counted, and the advisory lock keeps concurrent claims from overshooting.

create or replace function public.claim_alpha_tester_bonus()
returns table(coins integer, claimed boolean) language plpgsql security definer set search_path=public as $$
declare
  claimed_user uuid;
  v_award integer := 300;
  v_cap integer := 10000;
  v_given integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  -- Serialize pool claims so concurrent first-claims cannot overshoot the 10,000-coin cap.
  perform pg_advisory_xact_lock(hashtextextended('alpha-tester-pool', 0));
  insert into public.alpha_tester_claims(user_id) values (auth.uid())
    on conflict (user_id) do nothing returning user_id into claimed_user;
  if claimed_user is null then return query select 0, false; return; end if;
  -- Total already given (ledger sum, so pre-change 500-coin awards still count).
  select coalesce(sum(delta), 0)::integer into v_given
    from public.coin_ledger where reason = 'Alpha Tester launch bonus';
  if v_given + v_award > v_cap then raise exception 'alpha pool exhausted'; end if;
  insert into public.coin_ledger(user_id, delta, reason)
    values (auth.uid(), v_award, 'Alpha Tester launch bonus');
  return query select v_award, true;
end; $$;
revoke all on function public.claim_alpha_tester_bonus() from public, anon, authenticated;
grant execute on function public.claim_alpha_tester_bonus() to authenticated;
