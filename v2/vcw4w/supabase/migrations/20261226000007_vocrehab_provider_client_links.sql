-- VocRehab provider/client extension over the canonical parent-child accounts.
-- A provider is the adult parent account; a client is that parent's kid_account.
create table if not exists public.vocrehab_provider_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider_label text not null default '' check (char_length(provider_label) <= 100),
  organization_label text not null default '' check (char_length(organization_label) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.vocrehab_provider_profiles enable row level security;
drop policy if exists vocrehab_provider_profile_owner on public.vocrehab_provider_profiles;
create policy vocrehab_provider_profile_owner on public.vocrehab_provider_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.vocrehab_provider_profiles to authenticated;

create table if not exists public.vocrehab_provider_clients (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid not null references auth.users(id) on delete cascade,
  kid_id uuid not null references public.kid_accounts(id) on delete cascade,
  client_label text not null default '' check (char_length(client_label) <= 64),
  -- Never infer consent from a parent/provider linking the workspace. This
  -- stays null until an explicit guardian/client consent flow records it.
  consented_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (counselor_id, kid_id),
  check (counselor_id = parent_id)
);
alter table public.vocrehab_provider_clients alter column consented_at drop default;
create index if not exists vocrehab_provider_clients_parent_idx on public.vocrehab_provider_clients(parent_id, created_at desc);
create index if not exists vocrehab_provider_clients_kid_idx on public.vocrehab_provider_clients(kid_id, created_at desc);
alter table public.vocrehab_provider_clients enable row level security;
drop policy if exists vocrehab_provider_clients_parent_manage on public.vocrehab_provider_clients;
create policy vocrehab_provider_clients_parent_manage on public.vocrehab_provider_clients
  for all using (parent_id = auth.uid() and exists (
    select 1 from public.kid_accounts k where k.id = kid_id and k.parent_id = auth.uid()
  )) with check (parent_id = auth.uid() and counselor_id = auth.uid() and exists (
    select 1 from public.kid_accounts k where k.id = kid_id and k.parent_id = auth.uid()
  ));
grant select, insert, update, delete on public.vocrehab_provider_clients to authenticated;

alter table public.vocrehab_game_templates
  add column if not exists enrollment_id uuid references public.vocrehab_provider_clients(id) on delete set null;
alter table public.vocrehab_game_templates
  add column if not exists created_by_kid_id uuid references public.kid_accounts(id) on delete cascade;
-- Account-wide share codes are superseded by a parent-selected child recipient.
drop policy if exists vocrehab_templates_shared_read on public.vocrehab_game_templates;
drop policy if exists vocrehab_templates_owner_all on public.vocrehab_game_templates;
drop policy if exists vocrehab_templates_owner_manage on public.vocrehab_game_templates;
create policy vocrehab_templates_owner_manage on public.vocrehab_game_templates
  for all using (owner_id = auth.uid()) with check (
    owner_id = auth.uid() and (enrollment_id is null or exists (
      select 1 from public.vocrehab_provider_clients pc
      where pc.id = enrollment_id and pc.parent_id = auth.uid() and pc.revoked_at is null
    ))
  );
-- Kid-cookie access goes through service-role routes only after getKidSession()
-- resolves the existing parent-owned kid_accounts row; kid cookies aren't JWTs.

alter table public.vocrehab_saved_game_states
  add column if not exists kid_id uuid references public.kid_accounts(id) on delete cascade;
alter table public.vocrehab_saved_game_states
  add column if not exists enrollment_id uuid references public.vocrehab_provider_clients(id) on delete set null;
alter table public.vocrehab_game_sessions
  add column if not exists kid_id uuid references public.kid_accounts(id) on delete set null;
create index if not exists vocrehab_game_sessions_kid_idx on public.vocrehab_game_sessions(kid_id, started_at desc);
-- Parent account remains the canonical principal; kid_id only attributes this
-- module row to a child identity owned by that parent.
drop policy if exists vocrehab_saved_states_own on public.vocrehab_saved_game_states;
drop policy if exists vocrehab_saved_states_parent_or_kid on public.vocrehab_saved_game_states;
create policy vocrehab_saved_states_parent_or_kid on public.vocrehab_saved_game_states
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
