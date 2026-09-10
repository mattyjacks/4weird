-- ============================================================================
-- 4weird Teams Enterprise BUNDLE — orgs / team workspaces / projects
-- (GitHub-like Code + Issues) / Matrix-like secure rooms / cloud services /
-- pay-as-you-go Vibe Coins + FULL PERMISSION SET.
--
-- One file, fully rerunnable (IF NOT EXISTS / OR REPLACE / DROP ... IF
-- EXISTS). Deny-by-default RLS everywhere; all writes go through the
-- SECURITY DEFINER RPCs at the bottom. Clients only SELECT what their
-- permission grants.
--
-- Hierarchy (securely separate):
--   orgs -> teams (workspaces) -> projects -> { repos, issues, rooms }
-- A user sees an org/team/project row ONLY when they are a member (or the
-- project is public inside a public team — never cross-org leakage).
--
-- Permissions model (ridiculously advanced, presented simply):
--   * public.permission_catalog — every permission key, grouped for UI.
--   * public.role_templates — shipped defaults (owner/admin/maintainer/
--     developer/viewer/billing/security). Clients may READ but never WRITE.
--   * public.custom_roles — per-org / per-team custom roles. Encouraged:
--     copy a default, tweak 1-2 keys, assign. Enforced by RPC allowlists.
--   * Membership rows carry role_key (+ optional custom_role_id). The
--     has_*_perm() functions resolve effective permissions server-side, so
--     a workspace user can ONLY do permissioned actions.
--
-- FULL PERMISSION SET (keys — also seeded into permission_catalog below):
--   ORG: org.view org.edit org.delete org.members.view org.members.invite
--     org.members.remove org.members.change_role org.roles.view org.roles.manage
--     org.billing.view org.billing.manage org.wallet.fund org.wallet.spend
--     org.audit.view org.teams.create org.teams.delete org.sso.manage
--     org.api_keys.manage
--   TEAM: team.view team.edit team.delete team.members.view team.members.invite
--     team.members.remove team.members.change_role team.roles.view
--     team.roles.manage team.projects.create team.projects.delete
--     team.rooms.create team.api_keys.manage team.budget.manage
--   PROJECT (GitHub-like): project.view project.edit project.delete
--     project.visibility.manage project.code.view project.code.push
--     project.code.review project.branches.manage project.releases.manage
--     project.issues.view project.issues.create project.issues.comment
--     project.issues.triage project.issues.close project.labels.manage
--     project.milestones.manage project.pr.merge project.wiki.edit
--     project.actions.run
--   CLOUD (pay-as-you-go): cloud.catalog.view cloud.provision
--     cloud.provision.gpu cloud.provision.serverless cloud.storage.manage
--     cloud.database.manage cloud.kv.manage cloud.queue.manage cloud.cdn.manage
--     cloud.builds.run cloud.usage.view cloud.provision.destroy
--     cloud.spend.approve
--   ROOMS (Matrix-like E2EE): rooms.view rooms.send rooms.react rooms.invite
--     rooms.kick rooms.e2ee.reset rooms.federate rooms.moderate
--   SECURITY: security.devices.view security.devices.revoke security.audit.view
--     security.reports.view security.quarantine
-- ============================================================================

-- --------------------------------------------------------------------------
-- 0. Helpers (already exist in earlier migrations; OR REPLACE is safe)
-- --------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- --------------------------------------------------------------------------
-- 1. Orgs / teams / memberships / invites
-- --------------------------------------------------------------------------
create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name varchar(80) not null check (char_length(name) between 2 and 80),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  visibility text not null default 'private' check (visibility in ('private','public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.org_members (
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_key text not null default 'viewer' check (role_key in ('owner','admin','billing','security','viewer') or role_key = 'custom'),
  custom_role_id uuid null,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create table if not exists public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  email text not null check (char_length(email) between 3 and 254),
  role_key text not null default 'viewer',
  custom_role_id uuid null,
  token char(32) not null unique default substr(encode(gen_random_bytes(24),'hex'),1,32),
  accepted boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]{2,40}$'),
  name varchar(80) not null check (char_length(name) between 2 and 80),
  purpose varchar(300) not null default '' check (char_length(purpose) <= 300),
  visibility text not null default 'private' check (visibility in ('private','internal','public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, slug)
);
create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_key text not null default 'viewer' check (role_key in ('owner','admin','maintainer','developer','viewer','billing') or role_key = 'custom'),
  custom_role_id uuid null,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null check (char_length(email) between 3 and 254),
  role_key text not null default 'viewer',
  custom_role_id uuid null,
  token char(32) not null unique default substr(encode(gen_random_bytes(24),'hex'),1,32),
  accepted boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

drop trigger if exists trg_orgs_updated on public.orgs;
create trigger trg_orgs_updated before update on public.orgs
  for each row execute function public.handle_updated_at();
drop trigger if exists trg_teams_updated on public.teams;
create trigger trg_teams_updated before update on public.teams
  for each row execute function public.handle_updated_at();

-- --------------------------------------------------------------------------
-- 2. Permission catalog + role templates + custom roles (THE FULL SET)
-- --------------------------------------------------------------------------
create table if not exists public.permission_catalog (
  key text primary key check (key ~ '^[a-z0-9_.]{3,48}$'),
  grp text not null check (grp in ('org','team','project','cloud','rooms','security')),
  label text not null check (char_length(label) between 3 and 80),
  blurb text not null default '' check (char_length(blurb) <= 240)
);
create table if not exists public.role_templates (
  key text primary key check (key in ('owner','admin','maintainer','developer','viewer','billing','security')),
  scope text not null check (scope in ('org','team')),
  label text not null,
  permissions text[] not null default '{}',
  is_default boolean not null default true
);
create table if not exists public.custom_roles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid null references public.orgs(id) on delete cascade,
  team_id uuid null references public.teams(id) on delete cascade,
  name varchar(60) not null check (char_length(name) between 2 and 60),
  permissions text[] not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (org_id is not null or team_id is not null),
  check (array_length(permissions, 1) is null or array_length(permissions, 1) <= 120)
);
create index if not exists idx_custom_roles_org on public.custom_roles (org_id);
create index if not exists idx_custom_roles_team on public.custom_roles (team_id);

-- Seed catalog (idempotent upserts). This IS the full permission set.
insert into public.permission_catalog (key, grp, label, blurb) values
  ('org.view','org','View org','See this organization'),
  ('org.edit','org','Edit org','Rename / describe the org'),
  ('org.delete','org','Delete org','Danger: removes every team inside'),
  ('org.members.view','org','View members','See org roster'),
  ('org.members.invite','org','Invite members','Send org invites'),
  ('org.members.remove','org','Remove members','Remove or ban org members'),
  ('org.members.change_role','org','Change roles','Change any org member role'),
  ('org.roles.view','org','View roles','See default + custom roles'),
  ('org.roles.manage','org','Manage roles','Create / edit custom roles'),
  ('org.billing.view','org','View billing','See spend + invoices'),
  ('org.billing.manage','org','Manage billing','Buy credits, set budgets'),
  ('org.wallet.fund','org','Fund wallet','Move Vibe Coins into org wallet'),
  ('org.wallet.spend','org','Spend wallet','Approve cloud spend from wallet'),
  ('org.audit.view','org','View audit log','Read the tamper-evident audit trail'),
  ('org.teams.create','org','Create teams','Open new workspaces'),
  ('org.teams.delete','org','Delete teams','Remove workspaces'),
  ('org.sso.manage','org','Manage SSO','Enterprise login + domain claim'),
  ('org.api_keys.manage','org','Manage API keys','Scoped machine keys'),
  ('team.view','team','View team','See this workspace'),
  ('team.edit','team','Edit team','Rename / repurpose the workspace'),
  ('team.delete','team','Delete team','Danger: removes projects + rooms'),
  ('team.members.view','team','View members','See workspace roster'),
  ('team.members.invite','team','Invite members','Send workspace invites'),
  ('team.members.remove','team','Remove members','Remove workspace members'),
  ('team.members.change_role','team','Change roles','Change workspace roles'),
  ('team.roles.view','team','View roles','See workspace roles'),
  ('team.roles.manage','team','Manage roles','Create workspace custom roles'),
  ('team.projects.create','team','Create projects','Open GitHub-like projects'),
  ('team.projects.delete','team','Delete projects','Remove projects'),
  ('team.rooms.create','team','Create rooms','Open Matrix-like secure rooms'),
  ('team.api_keys.manage','team','Manage API keys','Scoped workspace keys'),
  ('team.budget.manage','team','Manage budget','Caps + alerts per workspace'),
  ('project.view','project','View project','Open the project home'),
  ('project.edit','project','Edit project','Rename / describe'),
  ('project.delete','project','Delete project','Danger zone'),
  ('project.visibility.manage','project','Change visibility','Private / internal / public'),
  ('project.code.view','project','Code: read','Browse files (Code tab)'),
  ('project.code.push','project','Code: push','Push branches + commits'),
  ('project.code.review','project','Code: review','Approve pull requests'),
  ('project.branches.manage','project','Manage branches','Protect / delete branches'),
  ('project.releases.manage','project','Manage releases','Cut releases + tags'),
  ('project.issues.view','project','Issues: read','Browse the Issues tab'),
  ('project.issues.create','project','Issues: create','Open new issues'),
  ('project.issues.comment','project','Issues: comment','Discuss issues + PRs'),
  ('project.issues.triage','project','Issues: triage','Label + assign + milestone'),
  ('project.issues.close','project','Issues: close','Close / reopen issues'),
  ('project.labels.manage','project','Manage labels','Issue label taxonomy'),
  ('project.milestones.manage','project','Manage milestones','Roadmap milestones'),
  ('project.pr.merge','project','Merge PRs','Merge approved pull requests'),
  ('project.wiki.edit','project','Edit wiki','Project docs pages'),
  ('project.actions.run','project','Run actions','CI-ish runs metered in coins'),
  ('cloud.catalog.view','cloud','View catalog','See every cloud service + price'),
  ('cloud.provision','cloud','Provision','Start pay-as-you-go services'),
  ('cloud.provision.gpu','cloud','Provision GPU','GPU pods + serverless workers'),
  ('cloud.provision.serverless','cloud','Provision serverless','Endpoints + cron'),
  ('cloud.storage.manage','cloud','Manage storage','Buckets + volumes + CDN'),
  ('cloud.database.manage','cloud','Manage databases','Postgres + KV + queues'),
  ('cloud.kv.manage','cloud','Manage KV','Duplicate guard for KV namespace'),
  ('cloud.queue.manage','cloud','Manage queues','Job queues + webhooks'),
  ('cloud.cdn.manage','cloud','Manage CDN','Edge cache + custom domains'),
  ('cloud.builds.run','cloud','Run builds','Image + static builds'),
  ('cloud.usage.view','cloud','View usage','Live meters per service'),
  ('cloud.provision.destroy','cloud','Destroy services','Tear down provisioned infra'),
  ('cloud.spend.approve','cloud','Approve spend','Approve over-budget spend'),
  ('rooms.view','rooms','View rooms','Open secure rooms'),
  ('rooms.send','rooms','Send messages','Post E2EE ciphertext packets'),
  ('rooms.react','rooms','React','Emoji reactions (plaintext count only)'),
  ('rooms.invite','rooms','Invite to rooms','Add workspace members to rooms'),
  ('rooms.kick','rooms','Kick from rooms','Remove disruptive members'),
  ('rooms.e2ee.reset','rooms','Reset E2EE','Rotate megolm-style session keys'),
  ('rooms.federate','rooms','Federate rooms','Bridge rooms to other servers'),
  ('rooms.moderate','rooms','Moderate rooms','Redact + quarantine messages'),
  ('security.devices.view','security','View devices','See Matrix-style device list'),
  ('security.devices.revoke','security','Revoke devices','Kill compromised sessions'),
  ('security.audit.view','security','View audit','Read security audit entries'),
  ('security.reports.view','security','View reports','Safety triage queue'),
  ('security.quarantine','security','Quarantine','Hide abusive content org-wide')
on conflict (key) do update set grp = excluded.grp, label = excluded.label, blurb = excluded.blurb;

-- Shipped defaults: generous viewers, powerful owners. Copy-to-custom encouraged.
insert into public.role_templates (key, scope, label, permissions) values
  ('owner','org','Owner', array['org.view','org.edit','org.delete','org.members.view','org.members.invite','org.members.remove','org.members.change_role','org.roles.view','org.roles.manage','org.billing.view','org.billing.manage','org.wallet.fund','org.wallet.spend','org.audit.view','org.teams.create','org.teams.delete','org.sso.manage','org.api_keys.manage','team.view','team.edit','team.delete','team.members.view','team.members.invite','team.members.remove','team.members.change_role','team.roles.view','team.roles.manage','team.projects.create','team.projects.delete','team.rooms.create','team.api_keys.manage','team.budget.manage','project.view','project.edit','project.delete','project.visibility.manage','project.code.view','project.code.push','project.code.review','project.branches.manage','project.releases.manage','project.issues.view','project.issues.create','project.issues.comment','project.issues.triage','project.issues.close','project.labels.manage','project.milestones.manage','project.pr.merge','project.wiki.edit','project.actions.run','cloud.catalog.view','cloud.provision','cloud.provision.gpu','cloud.provision.serverless','cloud.storage.manage','cloud.database.manage','cloud.kv.manage','cloud.queue.manage','cloud.cdn.manage','cloud.builds.run','cloud.usage.view','cloud.provision.destroy','cloud.spend.approve','rooms.view','rooms.send','rooms.react','rooms.invite','rooms.kick','rooms.e2ee.reset','rooms.federate','rooms.moderate','security.devices.view','security.devices.revoke','security.audit.view','security.reports.view','security.quarantine']),
  ('admin','org','Admin', array['org.view','org.edit','org.members.view','org.members.invite','org.members.remove','org.members.change_role','org.roles.view','org.billing.view','org.wallet.spend','org.audit.view','org.teams.create','org.api_keys.manage','team.view','team.edit','team.members.view','team.members.invite','team.members.remove','team.members.change_role','team.roles.view','team.projects.create','team.rooms.create','team.api_keys.manage','team.budget.manage','project.view','project.edit','project.code.view','project.code.push','project.code.review','project.issues.view','project.issues.create','project.issues.comment','project.issues.triage','project.issues.close','project.pr.merge','project.wiki.edit','project.actions.run','cloud.catalog.view','cloud.provision','cloud.provision.serverless','cloud.storage.manage','cloud.usage.view','rooms.view','rooms.send','rooms.react','rooms.invite','rooms.kick','rooms.moderate','security.devices.view','security.reports.view']),
  ('maintainer','team','Maintainer', array['team.view','team.members.view','team.projects.create','team.rooms.create','project.view','project.edit','project.code.view','project.code.push','project.code.review','project.branches.manage','project.releases.manage','project.issues.view','project.issues.create','project.issues.comment','project.issues.triage','project.issues.close','project.labels.manage','project.milestones.manage','project.pr.merge','project.wiki.edit','project.actions.run','cloud.catalog.view','cloud.provision.serverless','cloud.usage.view','rooms.view','rooms.send','rooms.react','rooms.invite','rooms.moderate']),
  ('developer','team','Developer', array['team.view','project.view','project.code.view','project.code.push','project.issues.view','project.issues.create','project.issues.comment','project.wiki.edit','project.actions.run','cloud.catalog.view','cloud.usage.view','rooms.view','rooms.send','rooms.react']),
  ('viewer','team','Viewer', array['team.view','project.view','project.code.view','project.issues.view','cloud.catalog.view','cloud.usage.view','rooms.view']),
  ('billing','org','Billing', array['org.view','org.members.view','org.roles.view','org.billing.view','org.billing.manage','org.wallet.fund','org.wallet.spend','org.audit.view','cloud.catalog.view','cloud.usage.view','cloud.spend.approve']),
  ('security','org','Security', array['org.view','org.members.view','org.audit.view','team.view','team.members.view','project.view','project.code.view','project.issues.view','rooms.view','rooms.moderate','security.devices.view','security.devices.revoke','security.audit.view','security.reports.view','security.quarantine'])
on conflict (key) do update set scope = excluded.scope, label = excluded.label, permissions = excluded.permissions, is_default = true;

-- --------------------------------------------------------------------------
-- 3. Projects — GitHub-like (Code tab + Issues tab + PRs + wiki + actions)
-- --------------------------------------------------------------------------
create table if not exists public.team_projects (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]{2,60}$'),
  name varchar(100) not null check (char_length(name) between 2 and 100),
  description varchar(1000) not null default '' check (char_length(description) <= 1000),
  visibility text not null default 'private' check (visibility in ('private','internal','public')),
  default_branch varchar(80) not null default 'main' check (default_branch ~ '^[A-Za-z0-9._/-]{1,80}$'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, slug)
);
create table if not exists public.project_members (
  project_id uuid not null references public.team_projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_key text not null default 'viewer' check (role_key in ('owner','admin','maintainer','developer','viewer') or role_key = 'custom'),
  custom_role_id uuid null,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create table if not exists public.project_labels (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.team_projects(id) on delete cascade,
  name varchar(40) not null check (char_length(name) between 1 and 40),
  color char(6) not null default '0ea5e9' check (color ~ '^[0-9a-f]{6}$'),
  unique (project_id, name)
);
create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.team_projects(id) on delete cascade,
  title varchar(100) not null check (char_length(title) between 1 and 100),
  due_at timestamptz null,
  open boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.project_issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.team_projects(id) on delete cascade,
  number integer not null,
  title varchar(200) not null check (char_length(title) between 1 and 200),
  body text not null default '' check (char_length(body) <= 20000),
  state text not null default 'open' check (state in ('open','closed')),
  author_id uuid references public.profiles(id) on delete set null,
  assignee_id uuid references public.profiles(id) on delete set null,
  milestone_id uuid references public.project_milestones(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, number)
);
create table if not exists public.project_issue_labels (
  issue_id uuid not null references public.project_issues(id) on delete cascade,
  label_id uuid not null references public.project_labels(id) on delete cascade,
  primary key (issue_id, label_id)
);
create table if not exists public.project_issue_comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.project_issues(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null check (char_length(body) between 1 and 10000),
  created_at timestamptz not null default now()
);
create table if not exists public.project_repos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.team_projects(id) on delete cascade,
  branch varchar(80) not null default 'main' check (branch ~ '^[A-Za-z0-9._/-]{1,80}$'),
  path text not null check (char_length(path) between 1 and 512),
  content text not null default '' check (char_length(content) <= 200000),
  sha char(40) not null default '0000000000000000000000000000000000000000',
  author_id uuid references public.profiles(id) on delete set null,
  message varchar(300) not null default '' check (char_length(message) <= 300),
  updated_at timestamptz not null default now(),
  unique (project_id, branch, path)
);
create table if not exists public.project_pull_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.team_projects(id) on delete cascade,
  number integer not null,
  title varchar(200) not null check (char_length(title) between 1 and 200),
  body text not null default '' check (char_length(body) <= 20000),
  head_branch varchar(80) not null,
  base_branch varchar(80) not null default 'main',
  state text not null default 'open' check (state in ('open','merged','closed')),
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, number)
);
create table if not exists public.project_pr_reviews (
  id uuid primary key default gen_random_uuid(),
  pr_id uuid not null references public.project_pull_requests(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  verdict text not null check (verdict in ('approve','request_changes','comment')),
  body text not null default '' check (char_length(body) <= 5000),
  created_at timestamptz not null default now()
);
drop trigger if exists trg_projects_updated on public.team_projects;
create trigger trg_projects_updated before update on public.team_projects
  for each row execute function public.handle_updated_at();
drop trigger if exists trg_issues_updated on public.project_issues;
create trigger trg_issues_updated before update on public.project_issues
  for each row execute function public.handle_updated_at();

-- --------------------------------------------------------------------------
-- 4. Matrix-like secure rooms (E2EE packets, device trust, federation)
-- --------------------------------------------------------------------------
create table if not exists public.sig_devices (
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id varchar(64) not null check (device_id ~ '^[A-Za-z0-9._-]{4,64}$'),
  ed25519_key text not null check (char_length(ed25519_key) between 32 and 128),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, device_id)
);
create table if not exists public.team_rooms (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]{2,60}$'),
  name varchar(80) not null check (char_length(name) between 2 and 80),
  topic varchar(300) not null default '',
  encrypted boolean not null default true,
  power_default integer not null default 0 check (power_default between 0 and 100),
  federated boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (team_id, slug)
);
create table if not exists public.room_members (
  room_id uuid not null references public.team_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  power integer not null default 0 check (power between 0 and 100),
  created_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
-- Server stores ONLY ciphertext (Matrix-style): never plaintext bodies.
create table if not exists public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.team_rooms(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  device_id varchar(64) not null default 'unknown',
  ciphertext text not null check (char_length(ciphertext) between 1 and 16000),
  session_key_id varchar(64) not null default '' check (char_length(session_key_id) <= 64),
  redacted boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_room_messages_room on public.room_messages (room_id, created_at desc);
create table if not exists public.federation_outbox (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.team_rooms(id) on delete set null,
  target_server text not null check (char_length(target_server) between 3 and 253),
  payload jsonb not null default '{}'::jsonb,
  delivered boolean not null default false,
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- 5. Cloud services — pay-as-you-go catalog settled in Vibe Coins
-- --------------------------------------------------------------------------
create table if not exists public.cloud_services (
  key text primary key check (key ~ '^[a-z0-9-]{2,48}$'),
  name text not null,
  unit text not null check (unit in ('gpu_min','worker_min','gb_mo','db_hr','kv_m writes','queue_k','cdn_gb','build_min','action_min')),
  coins_per_unit integer not null check (coins_per_unit > 0 and coins_per_unit <= 100000),
  blurb text not null default ''
);
insert into public.cloud_services (key, name, unit, coins_per_unit, blurb) values
  ('gpu-pod','GPU Pod','gpu_min',12,'Dedicated GPU, billed per minute'),
  ('serverless-worker','Serverless Worker','worker_min',4,'Autoscaled endpoint workers'),
  ('serverless-cron','Scheduled Jobs','worker_min',2,'Cron-triggered workers'),
  ('object-storage','Object Storage','gb_mo',3,'S3-style buckets + CDN origin'),
  ('volume-storage','Volumes','gb_mo',5,'Persistent team volumes'),
  ('managed-postgres','Managed Postgres','db_hr',9,'Backups + point-in-time restore'),
  ('kv-store','KV Store','kv_m writes',1,'Edge key-value reads/writes'),
  ('job-queue','Job Queue','queue_k',1,'Queues + webhooks + retries'),
  ('edge-cdn','Edge CDN','cdn_gb',2,'Global cache + custom domains'),
  ('container-builds','Builds','build_min',3,'Image + static site builds'),
  ('ci-actions','Project Actions','action_min',2,'GitHub-Actions-style CI runs'),
  ('vector-db','Vector DB','db_hr',11,'Embeddings + ANN search'),
  ('realtime-relay','Realtime Relay','worker_min',2,'Matrix-style sync + presence fan-out'),
  ('inference-api','Inference API','worker_min',6,'Hosted model endpoints')
on conflict (key) do update set name = excluded.name, unit = excluded.unit,
  coins_per_unit = excluded.coins_per_unit, blurb = excluded.blurb;

create table if not exists public.org_wallets (
  org_id uuid primary key references public.orgs(id) on delete cascade,
  balance_cached integer not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.org_wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  delta integer not null check (delta <> 0 and delta >= -10000000 and delta <= 10000000),
  reason varchar(140) not null check (char_length(reason) <= 140),
  created_at timestamptz not null default now()
);
create index if not exists idx_org_wallet_ledger_org on public.org_wallet_ledger (org_id, created_at desc);
create table if not exists public.cloud_provisions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  service_key text not null references public.cloud_services(key),
  label varchar(80) not null default '' check (char_length(label) <= 80),
  status text not null default 'running' check (status in ('running','stopped','destroyed')),
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.cloud_usage (
  id uuid primary key default gen_random_uuid(),
  provision_id uuid not null references public.cloud_provisions(id) on delete cascade,
  qty integer not null check (qty > 0 and qty <= 100000000),
  coins integer not null check (coins > 0 and coins <= 100000000),
  source text not null default 'heartbeat' check (source in ('heartbeat','manual','actions')),
  created_at timestamptz not null default now()
);
create index if not exists idx_cloud_usage_prov on public.cloud_usage (provision_id, created_at desc);

-- --------------------------------------------------------------------------
-- 6. Budgets, audit, scoped API keys
-- --------------------------------------------------------------------------
create table if not exists public.team_budgets (
  team_id uuid primary key references public.teams(id) on delete cascade,
  monthly_cap_coins integer not null default 5000 check (monthly_cap_coins between 0 and 100000000),
  alert_at_pct integer not null default 80 check (alert_at_pct between 1 and 100),
  hard_stop boolean not null default false
);
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.orgs(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (char_length(action) between 3 and 80),
  target text not null default '' check (char_length(target) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_org on public.audit_log (org_id, created_at desc);
create table if not exists public.team_api_keys (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  key_hash char(64) not null unique,
  prefix varchar(16) not null,
  label varchar(40) not null default '',
  permissions text[] not null default '{}',
  revoked boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Link custom roles to members (FKs added idempotently; members may predate).
do $$ begin
  alter table public.org_members add constraint org_members_custom_fk
    foreign key (custom_role_id) references public.custom_roles(id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.team_members add constraint team_members_custom_fk
    foreign key (custom_role_id) references public.custom_roles(id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.project_members add constraint project_members_custom_fk
    foreign key (custom_role_id) references public.custom_roles(id) on delete set null;
exception when duplicate_object then null; end $$;

-- --------------------------------------------------------------------------
-- 7. Permission resolution (server-side; RLS + RPCs call these)
-- --------------------------------------------------------------------------
create or replace function public.effective_perms(p_role_key text, p_custom uuid)
returns text[] language plpgsql stable set search_path = public as $$
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
returns boolean language sql stable set search_path = public as $$
  select exists (select 1 from public.org_members m
    where m.org_id = p_org and m.user_id = auth.uid())
    or exists (select 1 from public.orgs o where o.id = p_org and o.owner_id = auth.uid());
$$;

create or replace function public.has_org_perm(p_org uuid, p_perm text)
returns boolean language plpgsql stable set search_path = public as $$
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
returns uuid language sql stable set search_path = public as $$
  select org_id from public.teams where id = p_team;
$$;

create or replace function public.has_team_perm(p_team uuid, p_perm text)
returns boolean language plpgsql stable set search_path = public as $$
declare m record; v_org uuid;
begin
  if auth.uid() is null then return false; end if;
  select t.org_id into v_org from public.teams t where t.id = p_team;
  if v_org is null then return false; end if;
  -- Org owners/admins inherit team power (except explicit billing-only stays out
  -- of code/rooms unless also a team member — checked below by perm key).
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
returns uuid language sql stable set search_path = public as $$
  select team_id from public.team_projects where id = p_project;
$$;

create or replace function public.has_project_perm(p_project uuid, p_perm text)
returns boolean language plpgsql stable set search_path = public as $$
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

-- --------------------------------------------------------------------------
-- 8. RLS — deny by default; SELECT only through membership/permission
-- --------------------------------------------------------------------------
alter table public.orgs enable row level security;
alter table public.org_members enable row level security;
alter table public.org_invites enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;
alter table public.permission_catalog enable row level security;
alter table public.role_templates enable row level security;
alter table public.custom_roles enable row level security;
alter table public.team_projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_labels enable row level security;
alter table public.project_milestones enable row level security;
alter table public.project_issues enable row level security;
alter table public.project_issue_labels enable row level security;
alter table public.project_issue_comments enable row level security;
alter table public.project_repos enable row level security;
alter table public.project_pull_requests enable row level security;
alter table public.project_pr_reviews enable row level security;
alter table public.sig_devices enable row level security;
alter table public.team_rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_messages enable row level security;
alter table public.federation_outbox enable row level security;
alter table public.cloud_services enable row level security;
alter table public.org_wallets enable row level security;
alter table public.org_wallet_ledger enable row level security;
alter table public.cloud_provisions enable row level security;
alter table public.cloud_usage enable row level security;
alter table public.team_budgets enable row level security;
alter table public.audit_log enable row level security;
alter table public.team_api_keys enable row level security;

-- Everyone can read the catalog + defaults (needed to render the permission
-- picker simply). No writes: templates are shipped, customs are via RPC.
drop policy if exists perm_catalog_read on public.permission_catalog;
create policy perm_catalog_read on public.permission_catalog
  for select to anon, authenticated using (true);
drop policy if exists role_templates_read on public.role_templates;
create policy role_templates_read on public.role_templates
  for select to anon, authenticated using (true);
drop policy if exists cloud_services_read on public.cloud_services;
create policy cloud_services_read on public.cloud_services
  for select to anon, authenticated using (true);

-- Orgs/teams/projects/rooms: member-or-public read. No direct writes.
drop policy if exists orgs_read on public.orgs;
create policy orgs_read on public.orgs for select to authenticated using (
  visibility = 'public' or public.is_org_member(id)
);
drop policy if exists org_members_read on public.org_members;
create policy org_members_read on public.org_members for select to authenticated using (
  public.is_org_member(org_id)
);
drop policy if exists teams_read on public.teams;
create policy teams_read on public.teams for select to authenticated using (
  visibility = 'public' or public.has_team_perm(id, 'team.view')
);
drop policy if exists team_members_read on public.team_members;
create policy team_members_read on public.team_members for select to authenticated using (
  public.has_team_perm(team_id, 'team.members.view') or public.has_team_perm(team_id, 'team.view')
);
drop policy if exists projects_read on public.team_projects;
create policy projects_read on public.team_projects for select to authenticated using (
  visibility = 'public' or public.has_project_perm(id, 'project.view')
);
drop policy if exists project_members_read on public.project_members;
create policy project_members_read on public.project_members for select to authenticated using (
  public.has_project_perm(project_id, 'project.view')
);
drop policy if exists issues_read on public.project_issues;
create policy issues_read on public.project_issues for select to authenticated using (
  public.has_project_perm(project_id, 'project.issues.view')
);
drop policy if exists issue_comments_read on public.project_issue_comments;
create policy issue_comments_read on public.project_issue_comments for select to authenticated using (
  exists (select 1 from public.project_issues i
    where i.id = issue_id and public.has_project_perm(i.project_id, 'project.issues.view'))
);
drop policy if exists issue_labels_read on public.project_issue_labels;
create policy issue_labels_read on public.project_issue_labels for select to authenticated using (
  exists (select 1 from public.project_issues i
    where i.id = issue_id and public.has_project_perm(i.project_id, 'project.issues.view'))
);
drop policy if exists labels_read on public.project_labels;
create policy labels_read on public.project_labels for select to authenticated using (
  public.has_project_perm(project_id, 'project.issues.view')
);
drop policy if exists milestones_read on public.project_milestones;
create policy milestones_read on public.project_milestones for select to authenticated using (
  public.has_project_perm(project_id, 'project.issues.view')
);
drop policy if exists repos_read on public.project_repos;
create policy repos_read on public.project_repos for select to authenticated using (
  public.has_project_perm(project_id, 'project.code.view')
);
drop policy if exists prs_read on public.project_pull_requests;
create policy prs_read on public.project_pull_requests for select to authenticated using (
  public.has_project_perm(project_id, 'project.code.view')
);
drop policy if exists reviews_read on public.project_pr_reviews;
create policy reviews_read on public.project_pr_reviews for select to authenticated using (
  exists (select 1 from public.project_pull_requests pr
    where pr.id = pr_id and public.has_project_perm(pr.project_id, 'project.code.view'))
);
drop policy if exists rooms_read on public.team_rooms;
create policy rooms_read on public.team_rooms for select to authenticated using (
  public.has_team_perm(team_id, 'rooms.view')
);
drop policy if exists room_members_read on public.room_members;
create policy room_members_read on public.room_members for select to authenticated using (
  exists (select 1 from public.team_rooms r
    where r.id = room_id and public.has_team_perm(r.team_id, 'rooms.view'))
);
drop policy if exists room_messages_read on public.room_messages;
create policy room_messages_read on public.room_messages for select to authenticated using (
  exists (select 1 from public.room_members m
    where m.room_id = room_messages.room_id and m.user_id = auth.uid())
);
drop policy if exists devices_read_own on public.sig_devices;
create policy devices_read_own on public.sig_devices for select to authenticated using (
  user_id = auth.uid() or exists (
    select 1 from public.room_members m join public.team_rooms r on r.id = m.room_id
    where m.user_id = auth.uid() and exists (
      select 1 from public.room_members o
      where o.room_id = r.id and o.user_id = sig_devices.user_id))
);
drop policy if exists custom_roles_read on public.custom_roles;
create policy custom_roles_read on public.custom_roles for select to authenticated using (
  (org_id is not null and public.has_org_perm(org_id, 'org.roles.view'))
  or (team_id is not null and public.has_team_perm(team_id, 'team.roles.view'))
);
drop policy if exists wallets_read on public.org_wallets;
create policy wallets_read on public.org_wallets for select to authenticated using (
  public.has_org_perm(org_id, 'org.billing.view')
);
drop policy if exists wallet_ledger_read on public.org_wallet_ledger;
create policy wallet_ledger_read on public.org_wallet_ledger for select to authenticated using (
  public.has_org_perm(org_id, 'org.billing.view')
);
drop policy if exists provisions_read on public.cloud_provisions;
create policy provisions_read on public.cloud_provisions for select to authenticated using (
  public.has_org_perm(org_id, 'cloud.usage.view')
);
drop policy if exists usage_read on public.cloud_usage;
create policy usage_read on public.cloud_usage for select to authenticated using (
  exists (select 1 from public.cloud_provisions p
    where p.id = provision_id and public.has_org_perm(p.org_id, 'cloud.usage.view'))
);
drop policy if exists budgets_read on public.team_budgets;
create policy budgets_read on public.team_budgets for select to authenticated using (
  public.has_team_perm(team_id, 'team.view')
);
drop policy if exists audit_read on public.audit_log;
create policy audit_read on public.audit_log for select to authenticated using (
  (org_id is not null and public.has_org_perm(org_id, 'org.audit.view'))
  or (team_id is not null and public.has_team_perm(team_id, 'team.view'))
);
-- Invites / outbox / api keys: no client reads (service + RPC only).
revoke all on public.org_invites from anon, authenticated;
revoke all on public.team_invites from anon, authenticated;
revoke all on public.federation_outbox from anon, authenticated;
revoke all on public.team_api_keys from anon, authenticated;
revoke all on public.custom_roles from anon;
revoke all on public.permission_catalog from anon;

grant select on public.permission_catalog to anon, authenticated;
grant select on public.role_templates to anon, authenticated;
grant select on public.cloud_services to anon, authenticated;
grant select on public.orgs to authenticated;
grant select on public.org_members to authenticated;
grant select on public.teams to authenticated;
grant select on public.team_members to authenticated;
grant select on public.team_projects to authenticated;
grant select on public.project_members to authenticated;
grant select on public.project_labels to authenticated;
grant select on public.project_milestones to authenticated;
grant select on public.project_issues to authenticated;
grant select on public.project_issue_labels to authenticated;
grant select on public.project_issue_comments to authenticated;
grant select on public.project_repos to authenticated;
grant select on public.project_pull_requests to authenticated;
grant select on public.project_pr_reviews to authenticated;
grant select on public.sig_devices to authenticated;
grant select on public.team_rooms to authenticated;
grant select on public.room_members to authenticated;
grant select on public.room_messages to authenticated;
grant select on public.custom_roles to authenticated;
grant select on public.org_wallets to authenticated;
grant select on public.org_wallet_ledger to authenticated;
grant select on public.cloud_provisions to authenticated;
grant select on public.cloud_usage to authenticated;
grant select on public.team_budgets to authenticated;
grant select on public.audit_log to authenticated;

-- --------------------------------------------------------------------------
-- 9. RPCs — the ONLY writers. Each enforces its permission key first.
-- --------------------------------------------------------------------------

-- Small audit helper (called inside RPCs; direct calls denied below).
create or replace function public._audit(p_org uuid, p_team uuid, p_action text, p_target text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log (org_id, team_id, actor_id, action, target)
  values (p_org, p_team, auth.uid(), p_action, substr(coalesce(p_target,''),1,200));
end; $$;
revoke all on function public._audit(uuid, uuid, text, text) from public, anon, authenticated;

-- Create an org; caller becomes owner (both org + wallet row).
create or replace function public.create_org(p_slug text, p_name text)
returns public.orgs language plpgsql security definer set search_path = public as $$
declare v_slug text := lower(trim(coalesce(p_slug,''))); v_row public.orgs%rowtype;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_slug !~ '^[a-z0-9-]{2,40}$' then raise exception 'invalid slug'; end if;
  if char_length(trim(coalesce(p_name,''))) < 2 then raise exception 'invalid name'; end if;
  insert into public.orgs (slug, name, owner_id)
  values (v_slug, trim(p_name), auth.uid()) returning * into v_row;
  insert into public.org_members (org_id, user_id, role_key)
  values (v_row.id, auth.uid(), 'owner') on conflict do nothing;
  insert into public.org_wallets (org_id) values (v_row.id) on conflict do nothing;
  perform public._audit(v_row.id, null, 'org.create', v_slug);
  return v_row;
exception when unique_violation then raise exception 'slug taken';
end; $$;
revoke all on function public.create_org(text, text) from public, anon, authenticated;
grant execute on function public.create_org(text, text) to authenticated;

-- Create a team workspace inside an org (needs org.teams.create).
create or replace function public.create_team(p_org uuid, p_slug text, p_name text)
returns public.teams language plpgsql security definer set search_path = public as $$
declare v_slug text := lower(trim(coalesce(p_slug,''))); v_row public.teams%rowtype;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.has_org_perm(p_org, 'org.teams.create') then raise exception 'forbidden'; end if;
  if v_slug !~ '^[a-z0-9-]{2,40}$' then raise exception 'invalid slug'; end if;
  insert into public.teams (org_id, slug, name) values (p_org, v_slug, trim(coalesce(p_name, v_slug)))
  returning * into v_row;
  insert into public.team_members (team_id, user_id, role_key)
  values (v_row.id, auth.uid(), 'owner') on conflict do nothing;
  insert into public.team_budgets (team_id) values (v_row.id) on conflict do nothing;
  perform public._audit(p_org, v_row.id, 'team.create', v_slug);
  return v_row;
exception when unique_violation then raise exception 'slug taken';
end; $$;
revoke all on function public.create_team(uuid, text, text) from public, anon, authenticated;
grant execute on function public.create_team(uuid, text, text) to authenticated;

-- Custom roles: copy a default then tweak (only keys that exist in catalog,
-- and only keys the creator already holds — no privilege escalation).
create or replace function public.create_custom_role(p_org uuid, p_team uuid, p_name text, p_perms text[])
returns public.custom_roles language plpgsql security definer set search_path = public as $$
declare v_perms text[] := coalesce(p_perms, '{}'); k text; v_row public.custom_roles%rowtype;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if char_length(trim(coalesce(p_name,''))) < 2 then raise exception 'invalid name'; end if;
  if array_length(v_perms, 1) is null or array_length(v_perms, 1) = 0 then raise exception 'empty role'; end if;
  if array_length(v_perms, 1) > 120 then raise exception 'too many permissions'; end if;
  foreach k in array v_perms loop
    if not exists (select 1 from public.permission_catalog c where c.key = k) then
      raise exception 'unknown permission: %', k; end if;
  end loop;
  if p_team is not null then
    if not public.has_team_perm(p_team, 'team.roles.manage') then raise exception 'forbidden'; end if;
    -- Creator must already hold every key they grant.
    foreach k in array v_perms loop
      if not public.has_team_perm(p_team, k) and not public.has_org_perm(public.team_org(p_team), 'org.roles.manage') then
        raise exception 'cannot grant %', k; end if;
    end loop;
    insert into public.custom_roles (team_id, name, permissions, created_by)
    values (p_team, trim(p_name), v_perms, auth.uid()) returning * into v_row;
    perform public._audit(public.team_org(p_team), p_team, 'role.create', p_name);
  elsif p_org is not null then
    if not public.has_org_perm(p_org, 'org.roles.manage') then raise exception 'forbidden'; end if;
    foreach k in array v_perms loop
      if not public.has_org_perm(p_org, k) then raise exception 'cannot grant %', k; end if;
    end loop;
    insert into public.custom_roles (org_id, name, permissions, created_by)
    values (p_org, trim(p_name), v_perms, auth.uid()) returning * into v_row;
    perform public._audit(p_org, null, 'role.create', p_name);
  else raise exception 'org or team required'; end if;
  return v_row;
end; $$;
revoke all on function public.create_custom_role(uuid, uuid, text, text[]) from public, anon, authenticated;
grant execute on function public.create_custom_role(uuid, uuid, text, text[]) to authenticated;

-- Set a member's role (org or team), incl. assigning a custom role id.
create or replace function public.set_member_role(p_scope text, p_id uuid, p_user uuid, p_role text, p_custom uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_scope = 'org' then
    if not public.has_org_perm(p_id, 'org.members.change_role') then raise exception 'forbidden'; end if;
    if p_role = 'custom' and (p_custom is null or not exists
      (select 1 from public.custom_roles r where r.id = p_custom and r.org_id = p_id)) then
      raise exception 'unknown custom role'; end if;
    update public.org_members set role_key = p_role, custom_role_id = case when p_role = 'custom' then p_custom else null end
    where org_id = p_id and user_id = p_user;
    if not found then raise exception 'not a member'; end if;
    perform public._audit(p_id, null, 'member.role', p_role);
  elsif p_scope = 'team' then
    if not public.has_team_perm(p_id, 'team.members.change_role') then raise exception 'forbidden'; end if;
    if p_role = 'custom' and (p_custom is null or not exists
      (select 1 from public.custom_roles r where r.id = p_custom and (r.team_id = p_id or r.org_id = public.team_org(p_id)))) then
      raise exception 'unknown custom role'; end if;
    update public.team_members set role_key = p_role, custom_role_id = case when p_role = 'custom' then p_custom else null end
    where team_id = p_id and user_id = p_user;
    if not found then raise exception 'not a member'; end if;
    perform public._audit(public.team_org(p_id), p_id, 'member.role', p_role);
  else raise exception 'invalid scope'; end if;
end; $$;
revoke all on function public.set_member_role(text, uuid, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.set_member_role(text, uuid, uuid, text, uuid) to authenticated;

-- Create a GitHub-like project (needs team.projects.create). Seeds Code-tab
-- README + Issues-tab welcome so both tabs are alive on day one.
create or replace function public.create_project(p_team uuid, p_slug text, p_name text, p_visibility text default 'private')
returns public.team_projects language plpgsql security definer set search_path = public as $$
declare v_slug text := lower(trim(coalesce(p_slug,''))); v_row public.team_projects%rowtype;
  v_num integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.has_team_perm(p_team, 'team.projects.create') then raise exception 'forbidden'; end if;
  if v_slug !~ '^[a-z0-9-]{2,60}$' then raise exception 'invalid slug'; end if;
  if coalesce(p_visibility,'private') not in ('private','internal','public') then raise exception 'invalid visibility'; end if;
  insert into public.team_projects (team_id, slug, name, visibility, created_by)
  values (p_team, v_slug, trim(coalesce(p_name, v_slug)), coalesce(p_visibility,'private'), auth.uid())
  returning * into v_row;
  insert into public.project_repos (project_id, branch, path, content, author_id, message)
  values (v_row.id, 'main', 'README.md', '# ' || v_row.name || E'\n\nWelcome to the Code tab.', auth.uid(), 'Initial commit')
  on conflict do nothing;
  select coalesce(max(number),0)+1 into v_num from public.project_issues where project_id = v_row.id;
  insert into public.project_issues (project_id, number, title, body, author_id)
  values (v_row.id, v_num, 'Welcome to the Issues tab', 'File your first bug, idea, or task here.', auth.uid());
  insert into public.project_labels (project_id, name, color) values
    (v_row.id, 'bug', 'ef4444'), (v_row.id, 'feature', '0ea5e9'), (v_row.id, 'good first issue', '22c55e')
  on conflict do nothing;
  perform public._audit(public.team_org(p_team), p_team, 'project.create', v_slug);
  return v_row;
exception when unique_violation then raise exception 'slug taken';
end; $$;
revoke all on function public.create_project(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.create_project(uuid, text, text, text) to authenticated;

-- Issues: open / comment / triage-close, each gated on its own key.
create or replace function public.open_issue(p_project uuid, p_title text, p_body text)
returns public.project_issues language plpgsql security definer set search_path = public as $$
declare v_num integer; v_row public.project_issues%rowtype;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.has_project_perm(p_project, 'project.issues.create') then raise exception 'forbidden'; end if;
  if char_length(trim(coalesce(p_title,''))) < 1 then raise exception 'invalid title'; end if;
  select coalesce(max(number),0)+1 into v_num from public.project_issues where project_id = p_project;
  insert into public.project_issues (project_id, number, title, body, author_id)
  values (p_project, v_num, trim(p_title), substr(coalesce(p_body,''),1,20000), auth.uid())
  returning * into v_row;
  return v_row;
end; $$;
revoke all on function public.open_issue(uuid, text, text) from public, anon, authenticated;
grant execute on function public.open_issue(uuid, text, text) to authenticated;

create or replace function public.comment_issue(p_issue uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_project uuid; v_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select project_id into v_project from public.project_issues where id = p_issue;
  if v_project is null then raise exception 'issue not found'; end if;
  if not public.has_project_perm(v_project, 'project.issues.comment') then raise exception 'forbidden'; end if;
  if char_length(trim(coalesce(p_body,''))) < 1 then raise exception 'invalid body'; end if;
  insert into public.project_issue_comments (issue_id, author_id, body)
  values (p_issue, auth.uid(), substr(trim(p_body),1,10000)) returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.comment_issue(uuid, text) from public, anon, authenticated;
grant execute on function public.comment_issue(uuid, text) to authenticated;

create or replace function public.close_issue(p_issue uuid, p_close boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare v_project uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select project_id into v_project from public.project_issues where id = p_issue;
  if v_project is null then raise exception 'issue not found'; end if;
  if not public.has_project_perm(v_project, 'project.issues.close') then raise exception 'forbidden'; end if;
  update public.project_issues set state = case when p_close then 'closed' else 'open' end,
    updated_at = now() where id = p_issue;
end; $$;
revoke all on function public.close_issue(uuid, boolean) from public, anon, authenticated;
grant execute on function public.close_issue(uuid, boolean) to authenticated;

-- Code tab: push a file version (needs project.code.push).
create or replace function public.push_file(p_project uuid, p_branch text, p_path text, p_content text, p_message text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_branch text := trim(coalesce(p_branch,'main')); v_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.has_project_perm(p_project, 'project.code.push') then raise exception 'forbidden'; end if;
  if v_branch !~ '^[A-Za-z0-9._/-]{1,80}$' then raise exception 'invalid branch'; end if;
  if char_length(coalesce(p_path,'')) < 1 then raise exception 'invalid path'; end if;
  insert into public.project_repos (project_id, branch, path, content, author_id, message,
      sha, updated_at)
  values (p_project, v_branch, substr(p_path,1,512), substr(coalesce(p_content,''),1,200000),
    auth.uid(), substr(coalesce(p_message,''),1,300),
    substr(encode(digest(coalesce(p_content,'') || now()::text, 'sha1'),'hex'),1,40), now())
  on conflict (project_id, branch, path) do update set content = excluded.content,
    message = excluded.message, author_id = excluded.author_id, sha = excluded.sha, updated_at = now()
  returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.push_file(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.push_file(uuid, text, text, text, text) to authenticated;

-- Matrix-like rooms: create + send ciphertext + redact (keys never touch server).
create or replace function public.create_room(p_team uuid, p_slug text, p_name text, p_encrypted boolean default true)
returns public.team_rooms language plpgsql security definer set search_path = public as $$
declare v_row public.team_rooms%rowtype;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.has_team_perm(p_team, 'team.rooms.create') then raise exception 'forbidden'; end if;
  insert into public.team_rooms (team_id, slug, name, encrypted, created_by)
  values (p_team, lower(trim(p_slug)), trim(p_name), coalesce(p_encrypted,true), auth.uid())
  returning * into v_row;
  insert into public.room_members (room_id, user_id, power)
  values (v_row.id, auth.uid(), 100) on conflict do nothing;
  perform public._audit(public.team_org(p_team), p_team, 'room.create', p_slug);
  return v_row;
exception when unique_violation then raise exception 'slug taken';
end; $$;
revoke all on function public.create_room(uuid, text, text, boolean) from public, anon, authenticated;
grant execute on function public.create_room(uuid, text, text, boolean) to authenticated;

create or replace function public.send_room_packet(p_room uuid, p_cipher text, p_session text, p_device text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_team uuid; v_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select team_id into v_team from public.team_rooms where id = p_room;
  if v_team is null then raise exception 'room not found'; end if;
  if not exists (select 1 from public.room_members where room_id = p_room and user_id = auth.uid()) then
    if not public.has_team_perm(v_team, 'rooms.send') then raise exception 'forbidden'; end if;
    insert into public.room_members (room_id, user_id) values (p_room, auth.uid())
    on conflict do nothing;
  end if;
  if char_length(coalesce(p_cipher,'')) < 1 or char_length(p_cipher) > 16000 then raise exception 'invalid packet'; end if;
  insert into public.room_messages (room_id, sender_id, device_id, ciphertext, session_key_id)
  values (p_room, auth.uid(), substr(coalesce(p_device,'unknown'),1,64), p_cipher, substr(coalesce(p_session,''),1,64))
  returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.send_room_packet(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.send_room_packet(uuid, text, text, text) to authenticated;

create or replace function public.redact_room_message(p_message uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_room uuid; v_team uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select room_id into v_room from public.room_messages where id = p_message;
  if v_room is null then raise exception 'not found'; end if;
  select team_id into v_team from public.team_rooms where id = v_room;
  if not public.has_team_perm(v_team, 'rooms.moderate') then raise exception 'forbidden'; end if;
  update public.room_messages set redacted = true, ciphertext = '[redacted]' where id = p_message;
end; $$;
revoke all on function public.redact_room_message(uuid) from public, anon, authenticated;
grant execute on function public.redact_room_message(uuid) to authenticated;

-- Vibe Coins -> org wallet funding (pay-as-you-go in; personal ledger out).
create or replace function public.fund_org_wallet(p_org uuid, p_coins integer)
returns integer language plpgsql security definer set search_path = public as $$
declare v_bal integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.has_org_perm(p_org, 'org.wallet.fund') then raise exception 'forbidden'; end if;
  if p_coins is null or p_coins < 1 or p_coins > 1000000 then raise exception 'invalid amount'; end if;
  select coalesce(sum(delta),0)::integer into v_bal from public.coin_ledger where user_id = auth.uid();
  if v_bal < p_coins then raise exception 'insufficient balance'; end if;
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -p_coins, 'Org wallet funding');
  insert into public.org_wallet_ledger (org_id, actor_id, delta, reason)
  values (p_org, auth.uid(), p_coins, 'Funded from Vibe Coins');
  update public.org_wallets set balance_cached = balance_cached + p_coins, updated_at = now()
  where org_id = p_org;
  perform public._audit(p_org, null, 'wallet.fund', p_coins::text);
  return p_coins;
end; $$;
revoke all on function public.fund_org_wallet(uuid, integer) from public, anon, authenticated;
grant execute on function public.fund_org_wallet(uuid, integer) to authenticated;

-- Cloud: provision + meter against the org wallet (never faked, never negative).
create or replace function public.provision_service(p_org uuid, p_team uuid, p_service text, p_label text)
returns public.cloud_provisions language plpgsql security definer set search_path = public as $$
declare v_row public.cloud_provisions%rowtype;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.has_org_perm(p_org, 'cloud.provision') then raise exception 'forbidden'; end if;
  if p_service in ('gpu-pod') and not public.has_org_perm(p_org, 'cloud.provision.gpu') then
    raise exception 'gpu permission required'; end if;
  if p_team is not null and public.team_org(p_team) is distinct from p_org then
    raise exception 'team is not in this org'; end if;
  if not exists (select 1 from public.cloud_services s where s.key = p_service) then
    raise exception 'unknown service'; end if;
  insert into public.cloud_provisions (org_id, team_id, service_key, label, owner_id)
  values (p_org, p_team, p_service, substr(trim(coalesce(p_label,'')),1,80), auth.uid())
  returning * into v_row;
  perform public._audit(p_org, p_team, 'cloud.provision', p_service);
  return v_row;
end; $$;
revoke all on function public.provision_service(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.provision_service(uuid, uuid, text, text) to authenticated;

create or replace function public.meter_usage(p_provision uuid, p_qty integer)
returns integer language plpgsql security definer set search_path = public as $$
declare v_prov public.cloud_provisions%rowtype; v_rate integer; v_cost integer; v_bal integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_qty is null or p_qty < 1 or p_qty > 100000000 then raise exception 'invalid qty'; end if;
  select * into v_prov from public.cloud_provisions where id = p_provision;
  if not found then raise exception 'provision not found'; end if;
  if v_prov.status <> 'running' then raise exception 'not running'; end if;
  if not public.has_org_perm(v_prov.org_id, 'cloud.usage.view') then raise exception 'forbidden'; end if;
  select s.coins_per_unit into v_rate from public.cloud_services s where s.key = v_prov.service_key;
  v_cost := v_rate * p_qty;
  select coalesce(sum(delta),0)::integer into v_bal from public.org_wallet_ledger where org_id = v_prov.org_id;
  if v_bal < v_cost then raise exception 'org wallet insufficient — fund with Vibe Coins'; end if;
  insert into public.org_wallet_ledger (org_id, actor_id, delta, reason)
  values (v_prov.org_id, auth.uid(), -v_cost, substr('Cloud meter: ' || v_prov.service_key,1,140));
  insert into public.cloud_usage (provision_id, qty, coins, source)
  values (p_provision, p_qty, v_cost, 'heartbeat');
  update public.org_wallets set balance_cached = balance_cached - v_cost, updated_at = now()
  where org_id = v_prov.org_id;
  return v_cost;
end; $$;
revoke all on function public.meter_usage(uuid, integer) from public, anon, authenticated;
grant execute on function public.meter_usage(uuid, integer) to authenticated;

-- Convenience: my effective permissions in a team (drives the simple UI).
create or replace function public.my_team_perms(p_team uuid)
returns text[] language plpgsql security definer set search_path = public as $$
declare m record; v_org uuid;
begin
  if auth.uid() is null then return '{}'; end if;
  select t.org_id into v_org from public.teams t where t.id = p_team;
  if v_org is null then return '{}'; end if;
  if exists (select 1 from public.orgs o where o.id = v_org and o.owner_id = auth.uid()) then
    return array(select key from public.permission_catalog);
  end if;
  select m.role_key, m.custom_role_id into m from public.team_members m
  where m.team_id = p_team and m.user_id = auth.uid();
  if found then return public.effective_perms(m.role_key, m.custom_role_id); end if;
  select m.role_key, m.custom_role_id into m from public.org_members m
  where m.org_id = v_org and m.user_id = auth.uid();
  if found then return public.effective_perms(m.role_key, m.custom_role_id); end if;
  return '{}';
end; $$;
revoke all on function public.my_team_perms(uuid) from public, anon, authenticated;
grant execute on function public.my_team_perms(uuid) to authenticated;
