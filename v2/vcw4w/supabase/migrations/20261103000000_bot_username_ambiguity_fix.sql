-- ============================================================================
-- Bot username 42702 fix.
--
-- set_bot_username() declares RETURNS TABLE(username, human_id), so the
-- OUT params sit in scope as PL/pgSQL variables. Its UPDATE referenced the
-- bare column `username` in the WHERE clause, which Postgres rejects as
-- ambiguous (SQLSTATE 42702: "column reference username is ambiguous") on
-- EVERY call -- Claim could never succeed on any database. PostgREST maps
-- the raise to HTTP 400; the route surfaces HTTP 500 "Unable to set
-- username."
--
-- Fix: alias-qualify the column references. Same signature and return type,
-- so CREATE OR REPLACE is safe. The three historical definitions
-- (bot_platform, reconcile_clans_bots, profile_provisioning) carry the same
-- one-spot fix for consistency; this re-issue is what live databases apply.
-- Fully rerunnable.
-- ============================================================================

create or replace function public.set_bot_username(p_username text)
returns table(username text, human_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  clean text := lower(trim(coalesce(p_username, '')));
  attempt integer := 0;
  caller_email text;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if clean !~ '^[a-z0-9_]{3,24}$' then raise exception 'invalid username'; end if;

  -- Ensure parent profile exists
  if not exists (select 1 from public.profiles where id = auth.uid()) then
    caller_email := auth.jwt() ->> 'email';
    insert into public.profiles (id, email, display_name)
    values (
      auth.uid(),
      caller_email,
      coalesce(nullif(split_part(caller_email, '@', 1), ''), 'player')
    )
    on conflict (id) do nothing;
  end if;

  loop
    begin
      insert into public.bot_identities (user_id, human_id)
      values (auth.uid(), 'h_' || substr(encode(gen_random_bytes(6), 'hex'), 1, 12))
      on conflict (user_id) do nothing;
      exit;
    exception when unique_violation then
      attempt := attempt + 1;
      if attempt >= 5 then raise; end if;
    end;
  end loop;

  update public.bot_identities as b
    set username = clean
    where b.user_id = auth.uid() and b.username is null;
  if not found then raise exception 'username already set'; end if;

  return query select b.username, b.human_id
    from public.bot_identities b where b.user_id = auth.uid();
exception when unique_violation then
  raise exception 'username taken';
end;
$$;
revoke all on function public.set_bot_username(text) from public, anon, authenticated;
grant execute on function public.set_bot_username(text) to authenticated;
