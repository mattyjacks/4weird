-- ============================================================================
-- Warlord roles: Lord / Captain / Infantry / Banker (+ read-only Banker).
-- Fully rerunnable: DROP ... IF EXISTS / OR REPLACE / upsert seeds.
--
-- These are FIRST-CLASS role_templates on the existing Teams RBAC; no
-- parallel system. effective_perms()/has_org_perm()/has_team_perm() resolve
-- templates by key, so the new keys work everywhere (RLS, RPCs, audit)
-- with zero function changes. Only the CHECK whitelists grow:
--   * Lord   ; leader of an org. Everything an Owner has except destroying
--     the org (org.delete) and SSO control. The org creator (owner_id)
--     always outranks Lords and keeps ultimate power via has_*_perm().
--   * Captain; team member with leadership: member management, room
--     moderation, GPU provisioning for the squad. Team scope.
--   * Infantry; normal team player: play, chat, file issues, run actions.
--     Team scope.
--   * Banker ; controls the finances: budgets, funding, spending, approvals.
--     Write operations included. Org scope.
--   * Banker (read-only); key 'banker_readonly': sees billing, audit, and
--     usage but cannot move a single centicentcoin. Org scope.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Widen the role_key whitelists (default PG constraint names).
-- --------------------------------------------------------------------------
alter table public.role_templates drop constraint if exists role_templates_key_check;
alter table public.role_templates
  add constraint role_templates_key_check check (key in (
    'owner', 'admin', 'maintainer', 'developer', 'viewer', 'billing', 'security',
    'lord', 'captain', 'infantry', 'banker', 'banker_readonly'
  ));

alter table public.org_members drop constraint if exists org_members_role_key_check;
alter table public.org_members
  add constraint org_members_role_key_check check (
    role_key in ('owner', 'admin', 'billing', 'security', 'viewer', 'lord', 'banker', 'banker_readonly')
    or role_key = 'custom'
  );

alter table public.team_members drop constraint if exists team_members_role_key_check;
alter table public.team_members
  add constraint team_members_role_key_check check (
    role_key in ('owner', 'admin', 'maintainer', 'developer', 'viewer', 'billing', 'captain', 'infantry')
    or role_key = 'custom'
  );

-- --------------------------------------------------------------------------
-- 2. Seed the warlord templates (idempotent upserts; permissions reference
--    ONLY keys already in permission_catalog).
-- --------------------------------------------------------------------------
insert into public.role_templates (key, scope, label, permissions) values
  ('lord','org','Lord', array[
    'org.view','org.edit','org.members.view','org.members.invite','org.members.remove','org.members.change_role',
    'org.roles.view','org.roles.manage','org.billing.view','org.billing.manage','org.wallet.fund','org.wallet.spend',
    'org.audit.view','org.teams.create','org.teams.delete','org.api_keys.manage',
    'team.view','team.edit','team.delete','team.members.view','team.members.invite','team.members.remove','team.members.change_role',
    'team.roles.view','team.roles.manage','team.projects.create','team.projects.delete','team.rooms.create','team.api_keys.manage','team.budget.manage',
    'project.view','project.edit','project.delete','project.visibility.manage','project.code.view','project.code.push','project.code.review',
    'project.branches.manage','project.releases.manage','project.issues.view','project.issues.create','project.issues.comment','project.issues.triage',
    'project.issues.close','project.labels.manage','project.milestones.manage','project.pr.merge','project.wiki.edit','project.actions.run',
    'cloud.catalog.view','cloud.provision','cloud.provision.gpu','cloud.provision.serverless','cloud.storage.manage','cloud.database.manage',
    'cloud.kv.manage','cloud.queue.manage','cloud.cdn.manage','cloud.builds.run','cloud.usage.view','cloud.provision.destroy','cloud.spend.approve',
    'rooms.view','rooms.send','rooms.react','rooms.invite','rooms.kick','rooms.e2ee.reset','rooms.federate','rooms.moderate',
    'security.devices.view','security.devices.revoke','security.audit.view','security.reports.view','security.quarantine']),
  ('captain','team','Captain', array[
    'team.view','team.edit','team.members.view','team.members.invite','team.members.remove','team.members.change_role',
    'team.roles.view','team.projects.create','team.rooms.create','team.api_keys.manage',
    'project.view','project.edit','project.code.view','project.code.push','project.code.review',
    'project.branches.manage','project.releases.manage','project.issues.view','project.issues.create','project.issues.comment',
    'project.issues.triage','project.issues.close','project.labels.manage','project.milestones.manage',
    'project.pr.merge','project.wiki.edit','project.actions.run',
    'cloud.catalog.view','cloud.provision','cloud.provision.gpu','cloud.provision.serverless','cloud.usage.view',
    'rooms.view','rooms.send','rooms.react','rooms.invite','rooms.kick','rooms.moderate',
    'security.reports.view']),
  ('infantry','team','Infantry', array[
    'team.view','project.view','project.code.view',
    'project.issues.view','project.issues.create','project.issues.comment',
    'project.wiki.edit','project.actions.run',
    'cloud.catalog.view','cloud.usage.view',
    'rooms.view','rooms.send','rooms.react']),
  ('banker','org','Banker', array[
    'org.view','org.members.view','org.roles.view',
    'org.billing.view','org.billing.manage','org.wallet.fund','org.wallet.spend',
    'org.audit.view','team.budget.manage',
    'cloud.catalog.view','cloud.usage.view','cloud.spend.approve']),
  ('banker_readonly','org','Banker (read-only)', array[
    'org.view','org.roles.view',
    'org.billing.view','org.audit.view',
    'cloud.catalog.view','cloud.usage.view'])
on conflict (key) do update set scope = excluded.scope, label = excluded.label, permissions = excluded.permissions, is_default = true;
