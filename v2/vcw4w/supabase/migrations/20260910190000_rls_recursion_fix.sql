-- RLS infinite-recursion fix.
--
-- The org/team/project read policies call these helpers (e.g. orgs_read calls
-- is_org_member, which SELECTs org_members, whose own read policy calls
-- is_org_member again). Defined as plain STABLE functions they re-enter RLS on
-- every inner SELECT, so Postgres aborts with infinite-recursion and every
-- client read (GET /api/orgs, GET /api/teams, …) fails with 500.
--
-- Redefining them SECURITY DEFINER makes the inner SELECTs run as the function
-- owner (table owner bypasses RLS), breaking the cycle. Bodies are unchanged.
-- search_path is pinned to public so the definer context cannot be hijacked.
-- Rerunnable: plain CREATE OR REPLACE, no data movement.

create or replace function public.effective_perms(p_role_key text, p_custom uuid)
returns text[] language plpgsql stable security definer set search_path = public as $$
declare perms text[] := '{}';
begin
  if p_role_key = 'custom' then
    select coalesce(r.permissions, '{}') into perms from public.custom_roles r where r.id = p_custom;
    return coalesce(perms, '{}');
  end if;
  select coalesce(t.permissions, '{}') into perms from public.role_templates t where t.key = p_role_key;
  return coalesce(perms, '{}');
end; $$;

create or replace function public.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.org_members m
    where m.org_id = p_org and m.user_id = auth.uid())
    or exists (select 1 from public.orgs o where o.id = p_org and o.owner_id = auth.uid());
$$;

create or replace function public.has_org_perm(p_org uuid, p_perm text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare m record;
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.orgs o where o.id = p_org and o.owner_id = auth.uid()) then return true; end if;
  select m.role_key, m.custom_role_id into m from public.org_members m
    where m.org_id = p_org and m.user_id = auth.uid();
  if not found then return false; end if;
  return p_perm = any (public.effective_perms(m.role_key, m.custom_role_id));
end; $$;

create or replace function public.team_org(p_team uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select org_id from public.teams where id = p_team;
$$;

create or replace function public.has_team_perm(p_team uuid, p_perm text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare m record; v_org uuid;
begin
  if auth.uid() is null then return false; end if;
  select t.org_id into v_org from public.teams t where t.id = p_team;
  if v_org is null then return false; end if;
  -- Org owners/admins inherit team power (except explicit billing-only stays out
  -- of code/rooms unless also a team member; checked below by perm key).
  if public.has_org_perm(v_org, 'org.teams.delete') then return true; end if;
  select m.role_key, m.custom_role_id into m from public.team_members m
    where m.team_id = p_team and m.user_id = auth.uid();
  if not found then
    -- Public/internal team viewers get read-only project/room visibility.
    if p_perm in ('team.view','project.view','project.code.view','project.issues.view','rooms.view') then
      return exists (select 1 from public.teams t
        where t.id = p_team and t.visibility in ('internal','public'));
    end if;
    return false;
  end if;
  return p_perm = any (public.effective_perms(m.role_key, m.custom_role_id));
end; $$;

create or replace function public.project_team(p_project uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select team_id from public.team_projects where id = p_project;
$$;

create or replace function public.has_project_perm(p_project uuid, p_perm text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_team uuid; pm record;
begin
  if auth.uid() is null then return false; end if;
  select p.team_id into v_team from public.team_projects p where p.id = p_project;
  if v_team is null then return false; end if;
  select pm.role_key, pm.custom_role_id into pm from public.project_members pm
    where pm.project_id = p_project and pm.user_id = auth.uid();
  if found then
    if p_perm = any (public.effective_perms(pm.role_key, pm.custom_role_id)) then return true; end if;
  end if;
  -- Fall back to team-level permission of the same suffix (e.g. team member
  -- with project.code.push equivalent via maintainer template).
  return public.has_team_perm(v_team, p_perm);
end; $$;
