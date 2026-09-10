-- Daily login bonus, referral codes, and referral rewards.
-- Daily: 5 coins + 1 per consecutive day, capped at 12. One claim per UTC day.
-- Referral: invitee enters a code once (25 coins each side), invitee unique.
create table if not exists public.daily_claims (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 last_claim_date date not null, streak smallint not null default 1 check(streak between 1 and 3650),
 updated_at timestamptz not null default now()
);
create table if not exists public.referral_codes (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 code varchar(8) not null unique check(code ~ '^[A-Z0-9]{8}$'),
 created_at timestamptz not null default now()
);
create table if not exists public.referrals (
 id uuid primary key default gen_random_uuid(),
 inviter_id uuid not null references public.profiles(id) on delete cascade,
 invitee_id uuid not null unique references public.profiles(id) on delete cascade,
 inviter_coins integer not null default 25 check(inviter_coins between 0 and 1000),
 invitee_coins integer not null default 25 check(invitee_coins between 0 and 1000),
 created_at timestamptz not null default now(), check(inviter_id <> invitee_id)
);
alter table public.daily_claims enable row level security;
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
drop policy if exists daily_own on public.daily_claims;
create policy daily_own on public.daily_claims for select to authenticated using(user_id=auth.uid());
drop policy if exists referral_code_own on public.referral_codes;
create policy referral_code_own on public.referral_codes for select to authenticated using(user_id=auth.uid());
drop policy if exists referrals_involved on public.referrals;
create policy referrals_involved on public.referrals for select to authenticated using(inviter_id=auth.uid() or invitee_id=auth.uid());
-- Writes go through SECURITY DEFINER RPCs below; no client write policies.

create or replace function public.claim_daily_bonus()
returns table(coins integer, streak integer) language plpgsql security definer set search_path=public as $$
declare yester date := (now() at time zone 'utc' - interval '1 day')::date;
declare today date := (now() at time zone 'utc')::date;
declare row public.daily_claims%rowtype; declare award integer;
begin
 if auth.uid() is null then raise exception 'login required'; end if;
 select * into row from public.daily_claims where user_id=auth.uid() for update;
 if found and row.last_claim_date=today then return query select 0, row.streak::integer; end if;
 if found and row.last_claim_date=yester then row.streak := least(row.streak+1, 3650);
 else row.streak := 1; end if;
 award := least(5 + (row.streak-1), 12);
 insert into public.daily_claims(user_id,last_claim_date,streak,updated_at) values(auth.uid(),today,row.streak,now())
  on conflict(user_id) do update set last_claim_date=today,streak=row.streak,updated_at=now();
 insert into public.coin_ledger(user_id,delta,reason) values(auth.uid(),award,'Daily login bonus (day '||row.streak||')');
 return query select award, row.streak::integer;
end; $$;
revoke all on function public.claim_daily_bonus() from public,anon,authenticated;
grant execute on function public.claim_daily_bonus() to authenticated;

create or replace function public.get_or_create_referral_code()
returns text language plpgsql security definer set search_path=public as $$
declare mine text; code text;
begin
 if auth.uid() is null then raise exception 'login required'; end if;
 select referral_codes.code into mine from public.referral_codes where user_id=auth.uid();
 if mine is not null then return mine; end if;
 loop code := upper(substr(encode(gen_random_bytes(6),'hex'),1,8));
  begin insert into public.referral_codes(user_id,code) values(auth.uid(),code); return code;
  exception when unique_violation then
   select referral_codes.code into mine from public.referral_codes where user_id=auth.uid();
   if mine is not null then return mine; end if;
  end;
 end loop;
end; $$;
revoke all on function public.get_or_create_referral_code() from public,anon,authenticated;
grant execute on function public.get_or_create_referral_code() to authenticated;

create or replace function public.apply_referral(p_code text)
returns table(inviter_coins integer, invitee_coins integer) language plpgsql security definer set search_path=public as $$
declare inviter uuid; code8 text := upper(trim(coalesce(p_code,'')));
begin
 if auth.uid() is null then raise exception 'login required'; end if;
 if code8 !~ '^[A-Z0-9]{8}$' then raise exception 'invalid code'; end if;
 select referral_codes.user_id into inviter from public.referral_codes where code=code8;
 if inviter is null then raise exception 'unknown code'; end if;
 if inviter=auth.uid() then raise exception 'cannot refer yourself'; end if;
 insert into public.referrals(inviter_id,invitee_id) values(inviter,auth.uid());
 insert into public.coin_ledger(user_id,delta,reason) values(inviter,25,'Referral reward (invited a player)');
 insert into public.coin_ledger(user_id,delta,reason) values(auth.uid(),25,'Referral welcome bonus');
 return query select 25,25;
 exception when unique_violation then raise exception 'referral already used';
end; $$;
revoke all on function public.apply_referral(text) from public,anon,authenticated;
grant execute on function public.apply_referral(text) to authenticated;

-- Public leaderboard: top 100 summed totals per game with handles only.
-- Privacy boundary lives here: no user IDs, emails, or session rows escape.
create or replace function public.leaderboard_top(p_game text, p_metric text)
returns table(player text, value bigint) language plpgsql security definer set search_path=public as $$
begin
 if p_game !~ '^[a-z0-9-]{1,64}$' or p_metric not in ('kills','actions','active_seconds') then raise exception 'invalid leaderboard'; end if;
 return query execute format(
  'select coalesce(nullif(p.public_handle,''''), nullif(p.display_name,''''), ''Player''), sum(e.%I)::bigint from public.game_stat_events e join public.profiles p on p.id=e.user_id where e.game_slug=$1 group by p.public_handle, p.display_name having sum(e.%I) > 0 order by sum(e.%I) desc limit 100',
  p_metric, p_metric, p_metric) using p_game;
end; $$;
revoke all on function public.leaderboard_top(text,text) from public,anon,authenticated;
grant execute on function public.leaderboard_top(text,text) to anon,authenticated;
