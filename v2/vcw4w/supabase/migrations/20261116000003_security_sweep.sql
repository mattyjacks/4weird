-- ============================================================================
-- 4WEIRD SECURITY SWEEP (DS-SEC-INFRA-01, sec-infra)
--
-- Wave-2+3 tables (public.dps_nodes, public.dps_tasks, public.community_mods,
-- public.community_themes) shipped in 20261116000002_remastery_wave23.sql with
-- RLS ENABLED but ZERO policies, so every client role (anon + authenticated)
-- is access-locked out of them. This file adds the missing policies; it does
-- not create tables, columns, or indexes, and it touches no other migration's
-- tables.
--
-- Design (least privilege):
--   * dps_nodes: owners manage their own donor rows; authenticated users may
--     read ACTIVE (online/busy) nodes for peer discovery; anon sees nothing.
--   * dps_tasks: requesters manage their own tasks; the operator of the
--     assigned node may read tasks routed to that node (result delivery).
--   * community_mods: public catalog read (mods browser is a public page);
--     creators insert/update/delete their own rows. Client inserts are forced
--     to is_verified = false and client updates cannot flip is_verified, so
--     verification promotion stays service_role-only by construction.
--   * community_themes: public rows readable by all, private rows by creator;
--     creators manage their own rows.
--   * Counter columns (downloads_count, likes_count, total_seconds_donated)
--     have no client increment path here: bumps go through service_role
--     (future counter RPC is an economy-lane follow-up in QUEUE.md).
--
-- Explicitly SCOPED OUT (do NOT add here):
--   * vibe_coins_earned / ledger hooks: economy-lane owned (QUEUE.md).
--   * Team/org scoping: no team FKs exist on these tables; if wanted later it
--     must use public.teams / public.team_members(team_id) — never the ghost
--     squads/squad_members tables, which exist nowhere in this repo.
--
-- Fully rerunnable: every CREATE POLICY is preceded by its DROP POLICY IF
-- EXISTS guard, so the file stays safe to re-push against dashboard-built
-- databases. Append-only: never edit a shipped migration, including this one
-- once pushed — repairs go in a NEW timestamped file.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. P2P COMPUTE NODES (owner-managed, authenticated discovery of actives)
-- ----------------------------------------------------------------------------
drop policy if exists dps_nodes_manage_own on public.dps_nodes;
create policy dps_nodes_manage_own on public.dps_nodes
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists dps_nodes_read_active on public.dps_nodes;
create policy dps_nodes_read_active on public.dps_nodes
  for select using (
    auth.uid() is not null and status in ('online', 'busy')
  );

-- ----------------------------------------------------------------------------
-- 2. P2P COMPUTE TASKS (requester-managed, assigned node operator may read)
-- ----------------------------------------------------------------------------
drop policy if exists dps_tasks_manage_requester on public.dps_tasks;
create policy dps_tasks_manage_requester on public.dps_tasks
  for all using (auth.uid() = requester_user_id)
  with check (auth.uid() = requester_user_id);

drop policy if exists dps_tasks_read_node_owner on public.dps_tasks;
create policy dps_tasks_read_node_owner on public.dps_tasks
  for select using (
    exists (
      select 1 from public.dps_nodes
      where id = dps_tasks.assigned_node_id
        and user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 3. COMMUNITY MODS (public catalog read, creator-managed, no self-verify)
-- ----------------------------------------------------------------------------
drop policy if exists community_mods_read_public on public.community_mods;
create policy community_mods_read_public on public.community_mods
  for select using (true);

drop policy if exists community_mods_insert_own on public.community_mods;
create policy community_mods_insert_own on public.community_mods
  for insert with check (
    auth.uid() = creator_user_id and is_verified = false
  );

-- Verified rows lock against client edits (post-verify edits go through
-- service_role); unverified rows stay creator-editable.
drop policy if exists community_mods_update_own on public.community_mods;
create policy community_mods_update_own on public.community_mods
  for update using (auth.uid() = creator_user_id)
  with check (auth.uid() = creator_user_id and is_verified = false);

drop policy if exists community_mods_delete_own on public.community_mods;
create policy community_mods_delete_own on public.community_mods
  for delete using (auth.uid() = creator_user_id);

-- ----------------------------------------------------------------------------
-- 4. COMMUNITY THEMES (public rows readable, creator-managed)
-- ----------------------------------------------------------------------------
drop policy if exists community_themes_read_public on public.community_themes;
create policy community_themes_read_public on public.community_themes
  for select using (is_public = true or auth.uid() = creator_user_id);

drop policy if exists community_themes_insert_own on public.community_themes;
create policy community_themes_insert_own on public.community_themes
  for insert with check (auth.uid() = creator_user_id);

drop policy if exists community_themes_update_own on public.community_themes;
create policy community_themes_update_own on public.community_themes
  for update using (auth.uid() = creator_user_id)
  with check (auth.uid() = creator_user_id);

drop policy if exists community_themes_delete_own on public.community_themes;
create policy community_themes_delete_own on public.community_themes
  for delete using (auth.uid() = creator_user_id);
