-- ============================================================================
-- Lazy default org + org invite links with limits/expiry.
-- Fully rerunnable: ADD COLUMN IF NOT EXISTS / OR REPLACE / DROP IF EXISTS.
--
-- 1. LAZY DEFAULT ORG — every new user starts with one uninitialized org:
--      name "Default Org by <username>", is_initialized = false.
--    Uninitialized = exactly ONE row in public.orgs and nothing else: no
--    org_members row, no org_wallets row, no ledger entries, no teams, no
--    provisions — so players who never touch the org model pay 0 coins.
--    The FIRST write sent to the org (team, wallet fund, provision, ghost
--    contract/debt, custom role, member-role change, watch scope, invite
--    link) auto-initializes it via ensure_org_initialized(): owner member
--    row + wallet row + org.init audit, still 0 coins moved.
-- 2. ORG INVITE LINKS — shareable tokens (no email required) with
--    customized max_uses (NULL = unlimited) and expires_at (NULL = never).
--    create_org_invite_link / redeem_org_invite / revoke_org_invite /
--    list_org_invites RPCs. Redeeming initializes nothing extra — the org
--    was already initialized when the link was created.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1a. orgs init flag.
-- --------------------------------------------------------------------------
alter table public.orgs
  add column if not exists is_initialized boolean not null default false;
alter table public.orgs
  add column if not exists initialized_at timestamptz null;

-- Existing orgs already own wallets/members: they are initialized.
update public.orgs
set is_initialized = true, initialized_at = coalesce(initialized_at, created_at)
where is_initialized = false
  and exists (select 1 from public.org_wallets w where w.org_id = public.orgs.id);

-- Explicitly created orgs were fully provisioned by create_org: mark any
-- stragglers (wallet row present) initialized as well.
update public.orgs
set is_initialized = true, initialized_at = coalesce(initialized_at, created_at)
where is_initialized = false
  and exists (select 1 from public.org_members m where m.org_id = public.orgs.id);

-- --------------------------------------------------------------------------
-- 1b. Initializer — idempotent, moves 0 coins. Uses the org OWNER (not the
-- caller) so DB triggers on first-use tables can call it safely.
-- --------------------------------------------------------------------------
create or replace function public.ensure_org_initialized(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if p_org is null then return; end if;
  select owner_id into v_owner from public.orgs where id = p_org;
  if not found then raise exception 'org not found'; end if;
  if exists (select 1 from public.orgs where id = p_org and is_initialized) then return; end if;
  -- Caller must belong (or own) — invites redeem through their own RPC.
  if auth.uid() is not null
     and auth.uid() <> v_owner
     and not exists (select 1 from public.org_members m
                     where m.org_id = p_org and m.user_id = auth.uid()) then
    raise exception 'forbidden';
  end if;
  insert into public.org_members (org_id, user_id, role_key)
  values (p_org, v_owner, 'owner') on conflict do nothing;
  insert into public.org_wallets (org_id) values (p_org) on conflict do nothing;
  update public.orgs set is_initialized = true, initialized_at = now()
  where id = p_org and not is_initialized;
  perform public._audit(p_org, null, 'org.init', 'lazy init');
exception when undefined_function then
  -- _audit lives in the teams bundle; orgs must init even if it is missing.
  insert into public.org_members (org_id, user_id, role_key)
  values (p_org, v_owner, 'owner') on conflict do nothing;
  insert into public.org_wallets (org_id) values (p_org) on conflict do nothing;
  update public.orgs set is_initialized = true, initialized_at = now()
  where id = p_org and not is_initialized;
end; $$;
revoke all on function public.ensure_org_initialized(uuid) from public, anon;
grant execute on function public.ensure_org_initialized(uuid) to authenticated;

-- --------------------------------------------------------------------------
-- 1c. Default org for the caller — at most one row, zero side effects.
-- --------------------------------------------------------------------------
create or replace function public.ensure_default_org()
returns public.orgs language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
  v_name text; v_base text; v_slug text; v_row public.orgs%rowtype; attempt integer;
begin
  if v_user is null then raise exception 'login required'; end if;
  select * into v_row from public.orgs where owner_id = v_user order by created_at asc limit 1;
  if found then return v_row; end if;
  select coalesce(nullif(trim(p.public_handle), ''), nullif(trim(p.display_name), ''),
           nullif(split_part(p.email, '@', 1), ''), 'player')
    into v_name from public.profiles p where p.id = v_user;
  v_name := substring(coalesce(v_name, 'player') from 1 for 40);
  v_base := lower(regexp_replace(v_name, '[^a-z0-9]+', '-', 'g'));
  v_base := regexp_replace(v_base, '(^-+|-+$)', '', 'g');
  v_base := substring(nullif(v_base, '') || 'player', 1, 20);
  for attempt in 0..200 loop
    v_slug := case when attempt = 0 then v_base
                   else substring(v_base, 1, 37) || '-' || attempt::text end;
    begin
      insert into public.orgs (slug, name, owner_id, is_initialized)
      values (v_slug, substring('Default Org by ' || v_name from 1 for 80), v_user, false)
      returning * into v_row;
      return v_row;
    exception when unique_violation then
      -- slug taken (or ultra-rare id collision): try the next suffix.
      select * into v_row from public.orgs where owner_id = v_user order by created_at asc limit 1;
      if found then return v_row; end if;
    end;
  end loop;
  raise exception 'unable to provision default org';
end; $$;
revoke all on function public.ensure_default_org() from public, anon;
grant execute on function public.ensure_default_org() to authenticated;

-- --------------------------------------------------------------------------
-- 1d. handle_new_user also seeds the default org (zero resources: orgs row
-- only). Signup must never fail because of it — swallow all errors.
-- Trigger context has no JWT, so owner = new.id (never auth.uid()).
-- --------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wanted text;
  v_base text;
  v_slug text;
  attempt integer;
begin
  wanted := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'player'
  );
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, substring(wanted from 1 for 40))
  on conflict (id) do update
    set email = excluded.email,
        display_name = case
          when public.profiles.display_name is null or public.profiles.display_name = ''
          then excluded.display_name
          else public.profiles.display_name
        end;
  begin
    if not exists (select 1 from public.orgs where owner_id = new.id) then
      v_base := lower(regexp_replace(substring(wanted from 1 for 40), '[^a-z0-9]+', '-', 'g'));
      v_base := regexp_replace(v_base, '(^-+|-+$)', '', 'g');
      v_base := substring(nullif(v_base, '') || 'player', 1, 20);
      for attempt in 0..50 loop
        v_slug := case when attempt = 0 then v_base
                       else substring(v_base, 1, 37) || '-' || attempt::text end;
        begin
          insert into public.orgs (slug, name, owner_id, is_initialized)
          values (v_slug, substring('Default Org by ' || wanted from 1 for 80), new.id, false);
          exit;
        exception when unique_violation then
          if exists (select 1 from public.orgs where owner_id = new.id) then exit; end if;
        end;
      end loop;
    end;
  exception when others then
    -- Default-org seeding is best-effort: GET /api/orgs backfills via
    -- ensure_default_org() for any user missed here.
    null;
  end;
  return new;
end;
$$;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: owners with no org get an uninitialized default (orgs row only).
do $$ declare r record; begin
  for r in select p.id, coalesce(nullif(trim(p.display_name), ''),
             nullif(split_part(p.email, '@', 1), ''), 'player') as wanted
           from public.profiles p
           where not exists (select 1 from public.orgs o where o.owner_id = p.id)
           limit 5000
  loop
    begin
      insert into public.orgs (slug, name, owner_id, is_initialized)
      values (
        substring('player-' || replace(r.id::text, '-', ''), 1, 30),
        substring('Default Org by ' || r.wanted from 1 for 80),
        r.id, false);
    exception when others then null; end;
  end loop;
end $$;

-- --------------------------------------------------------------------------
-- 1e. First-use triggers: any first thing sent to the org initializes it.
-- BEFORE INSERT so the parent wallet/member rows exist ahead of the child.
-- --------------------------------------------------------------------------
create or replace function public.trg_init_org_on_use()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  v_org := case TG_TABLE_NAME
    when 'teams' then new.org_id
    when 'org_wallet_ledger' then new.org_id
    when 'cloud_provisions' then new.org_id
    when 'ghost_contracts' then new.org_id
    when 'ghost_debts' then new.org_id
    when 'org_invites' then new.org_id
    else null end;
  if v_org is not null then
    perform public.ensure_org_initialized(v_org);
  end if;
  return new;
exception when others then
  -- init failure must surface as the caller's error, not a silent pass.
  raise;
end; $$;

drop trigger if exists trg_teams_init_org on public.teams;
create trigger trg_teams_init_org before insert on public.teams
  for each row execute function public.trg_init_org_on_use();
drop trigger if exists trg_wallet_ledger_init_org on public.org_wallet_ledger;
create trigger trg_wallet_ledger_init_org before insert on public.org_wallet_ledger
  for each row execute function public.trg_init_org_on_use();
drop trigger if exists trg_provisions_init_org on public.cloud_provisions;
create trigger trg_provisions_init_org before insert on public.cloud_provisions
  for each row execute function public.trg_init_org_on_use();
drop trigger if exists trg_ghost_contracts_init_org on public.ghost_contracts;
create trigger trg_ghost_contracts_init_org before insert on public.ghost_contracts
  for each row execute function public.trg_init_org_on_use();
drop trigger if exists trg_ghost_debts_init_org on public.ghost_debts;
create trigger trg_ghost_debts_init_org before insert on public.ghost_debts
  for each row execute function public.trg_init_org_on_use();
drop trigger if exists trg_org_invites_init_org on public.org_invites;
create trigger trg_org_invites_init_org before insert on public.org_invites
  for each row execute function public.trg_init_org_on_use();

-- Explicitly created orgs start initialized (create_org provisions members
-- + wallet itself); keep the flag honest for new rows.
create or replace function public.create_org(p_slug text, p_name text)
returns public.orgs language plpgsql security definer set search_path = public as $$
declare v_slug text := lower(trim(coalesce(p_slug,''))); v_row public.orgs%rowtype;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_slug !~ '^[a-z0-9-]{2,40}$' then raise exception 'invalid slug'; end if;
  if char_length(trim(coalesce(p_name,''))) < 2 then raise exception 'invalid name'; end if;
  insert into public.orgs (slug, name, owner_id, is_initialized, initialized_at)
  values (v_slug, trim(p_name), auth.uid(), true, now()) returning * into v_row;
  insert into public.org_members (org_id, user_id, role_key)
  values (v_row.id, auth.uid(), 'owner') on conflict do nothing;
  insert into public.org_wallets (org_id) values (v_row.id) on conflict do nothing;
  perform public._audit(v_row.id, null, 'org.create', v_slug);
  return v_row;
exception when unique_violation then raise exception 'slug taken';
end; $$;
revoke all on function public.create_org(text, text) from public, anon, authenticated;
grant execute on function public.create_org(text, text) to authenticated;

-- --------------------------------------------------------------------------
-- 2a. Invite links: email-optional, usage-capped, expirable, revocable.
-- --------------------------------------------------------------------------
alter table public.org_invites alter column email drop not null;
alter table public.org_invites
  add column if not exists max_uses integer null check (max_uses is null or (max_uses between 1 and 10000));
alter table public.org_invites
  add column if not exists uses integer not null default 0 check (uses >= 0);
alter table public.org_invites
  add column if not exists expires_at timestamptz null;
alter table public.org_invites
  add column if not exists revoked boolean not null default false;
alter table public.org_invites
  add column if not exists label varchar(60) not null default '' check (char_length(label) <= 60);
create index if not exists idx_org_invites_org on public.org_invites (org_id, created_at desc);
create index if not exists idx_org_invites_token on public.org_invites (token) where revoked = false;

-- Create a shareable link. Counts as first use: initializes the org.
create or replace function public.create_org_invite_link(
  p_org uuid, p_role text default 'viewer',
  p_max_uses integer default null, p_expires_at timestamptz default null,
  p_label text default '', p_custom uuid default null)
returns public.org_invites language plpgsql security definer set search_path = public as $$
declare v_role text := lower(trim(coalesce(p_role, 'viewer'))); v_row public.org_invites;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.has_org_perm(p_org, 'org.members.invite') then raise exception 'forbidden'; end if;
  if v_role = 'owner' then raise exception 'owner cannot be granted by link'; end if;
  if v_role = 'custom' then
    if p_custom is null or not exists
      (select 1 from public.custom_roles r where r.id = p_custom and r.org_id = p_org) then
      raise exception 'unknown custom role'; end if;
  elsif not exists (select 1 from public.role_templates t where t.key = v_role) then
    raise exception 'unknown role';
  end if;
  if p_max_uses is not null and (p_max_uses < 1 or p_max_uses > 10000) then
    raise exception 'max_uses must be 1..10000'; end if;
  if p_expires_at is not null then
    if p_expires_at <= now() then raise exception 'expiry must be in the future'; end if;
    if p_expires_at > now() + interval '2 years' then raise exception 'expiry too far (max 2 years)'; end if;
  end if;
  perform public.ensure_org_initialized(p_org);
  insert into public.org_invites (org_id, email, role_key, custom_role_id, max_uses, expires_at, label, created_by)
  values (p_org, null, v_role, case when v_role = 'custom' then p_custom else null end,
    p_max_uses, p_expires_at, substr(trim(coalesce(p_label, '')), 1, 60), auth.uid())
  returning * into v_row;
  perform public._audit(p_org, null, 'invite.create', v_role);
  return v_row;
end; $$;
revoke all on function public.create_org_invite_link(uuid, text, integer, timestamptz, text, uuid) from public, anon;
grant execute on function public.create_org_invite_link(uuid, text, integer, timestamptz, text, uuid) to authenticated;

-- Redeem a link: join the org with the link's role. No coins move.
create or replace function public.redeem_org_invite(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_inv public.org_invites;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if char_length(trim(coalesce(p_token, ''))) <> 32 then raise exception 'unknown invite'; end if;
  select * into v_inv from public.org_invites where token = trim(p_token);
  if not found then raise exception 'unknown invite'; end if;
  if v_inv.revoked then raise exception 'invite revoked'; end if;
  if v_inv.accepted then raise exception 'invite already used'; end if;
  if v_inv.expires_at is not null and v_inv.expires_at <= now() then raise exception 'invite expired'; end if;
  if v_inv.max_uses is not null and v_inv.uses >= v_inv.max_uses then raise exception 'invite fully used'; end if;
  if exists (select 1 from public.org_members m
             where m.org_id = v_inv.org_id and m.user_id = auth.uid()) then
    raise exception 'already a member'; end if;
  if (select count(*) from public.org_members where user_id = auth.uid()) >= 100 then
    raise exception 'organization limit reached (100 per user)'; end if;
  perform public.ensure_org_initialized(v_inv.org_id);
  begin
    insert into public.org_members (org_id, user_id, role_key, custom_role_id)
    values (v_inv.org_id, auth.uid(), v_inv.role_key, v_inv.custom_role_id);
  exception when unique_violation then raise exception 'already a member'; end;
  update public.org_invites set uses = uses + 1 where id = v_inv.id;
  perform public._audit(v_inv.org_id, null, 'invite.redeem', v_inv.role_key);
  return v_inv.org_id;
end; $$;
revoke all on function public.redeem_org_invite(text) from public, anon;
grant execute on function public.redeem_org_invite(text) to authenticated;

-- Revoke a link (uses are kept for audit; the token stops working).
create or replace function public.revoke_org_invite(p_invite uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select org_id into v_org from public.org_invites where id = p_invite;
  if v_org is null then raise exception 'unknown invite'; end if;
  if not public.has_org_perm(v_org, 'org.members.invite') then raise exception 'forbidden'; end if;
  update public.org_invites set revoked = true where id = p_invite;
  perform public._audit(v_org, null, 'invite.revoke', p_invite::text);
end; $$;
revoke all on function public.revoke_org_invite(uuid) from public, anon;
grant execute on function public.revoke_org_invite(uuid) to authenticated;

-- List links for management UIs (inviters only; tokens included).
create or replace function public.list_org_invites(p_org uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.has_org_perm(p_org, 'org.members.invite') then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_agg(t order by t.created_at desc) from (
    select id, role_key, max_uses, uses, expires_at, revoked, accepted, label,
      token, created_at,
      case when revoked then 'revoked'
           when expires_at is not null and expires_at <= now() then 'expired'
           when max_uses is not null and uses >= max_uses then 'used_up'
           when accepted then 'used'
           else 'active' end as status
    from public.org_invites where org_id = p_org limit 200
  ) t), '[]'::jsonb);
end; $$;
revoke all on function public.list_org_invites(uuid) from public, anon;
grant execute on function public.list_org_invites(uuid) to authenticated;
