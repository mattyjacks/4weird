-- ============================================================================
-- Daily bonus double-award race fix.
--
-- 20260910200000 hardened claim_daily_bonus() with pg_advisory_xact_lock, but
-- 20261001000000 (love_letters) re-created the function with a wider return
-- type and dropped the lock. First-ever claims have no daily_claims row for
-- SELECT ... FOR UPDATE to lock, so two concurrent first claims both mint
-- coins + love letters. This re-adds the advisory lock (same key scheme).
-- Fully rerunnable: CREATE OR REPLACE (repo rule).
-- ============================================================================

create or replace function public.claim_daily_bonus()
returns table(coins integer, streak integer, love_letters integer) language plpgsql security definer set search_path=public as $$
declare yester date := (now() at time zone 'utc' - interval '1 day')::date;
declare today date := (now() at time zone 'utc')::date;
declare row public.daily_claims%rowtype; declare award integer;
begin
 if auth.uid() is null then raise exception 'login required'; end if;
 -- Serializes first-ever and repeated claims for this account. SELECT ...
 -- FOR UPDATE alone cannot lock a row that does not exist yet, so without
 -- this two concurrent first claims both mint coins + love letters.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
 select * into row from public.daily_claims where user_id=auth.uid() for update;
 if found and row.last_claim_date=today then return query select 0, row.streak::integer, 0; end if;
 if found and row.last_claim_date=yester then row.streak := least(row.streak+1, 3650);
 else row.streak := 1; end if;
 award := least(5 + (row.streak-1), 12);
 insert into public.daily_claims(user_id,last_claim_date,streak,updated_at) values(auth.uid(),today,row.streak,now())
  on conflict(user_id) do update set last_claim_date=today,streak=row.streak,updated_at=now();
 insert into public.coin_ledger(user_id,delta,reason) values(auth.uid(),award,'Daily login bonus (day '||row.streak||')');
 -- love-letter mint: +1 earned, +1 spendable. Never touches coins; a second claim pays 0.
 update public.profiles set ll_balance = coalesce(ll_balance, 0) + 1, ll_earned = coalesce(ll_earned, 0) + 1
  where id = auth.uid();
 insert into public.love_gifts (giver_id, receiver_id, kind, cost)
  values (auth.uid(), auth.uid(), 'daily', 1);
 return query select award, row.streak::integer, 1;
end; $$;
revoke all on function public.claim_daily_bonus() from public,anon,authenticated;
grant execute on function public.claim_daily_bonus() to authenticated;
