-- VocRehab-only templates and saved game states. Parent-child account identity
-- remains in the core account system; these rows are an optional module layer.
create table if not exists public.vocrehab_game_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null check (game_id in ('file-sort','inbox-sprint','focus-shift','barrier-run','schedule-juggle','time-punch','tool-match','resume-rescue','phone-greeting','paycheck-plan','energy-budget')),
  title text not null check (char_length(title) between 1 and 100),
  description text not null default '' check (char_length(description) <= 500),
  state jsonb not null default '{}'::jsonb check (pg_column_size(state) <= 65536),
  share_code text not null unique default encode(gen_random_bytes(12), 'hex'),
  is_shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vocrehab_game_templates_owner_idx on public.vocrehab_game_templates(owner_id, updated_at desc);
alter table public.vocrehab_game_templates enable row level security;
drop policy if exists vocrehab_templates_owner_all on public.vocrehab_game_templates;
create policy vocrehab_templates_owner_all on public.vocrehab_game_templates
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists vocrehab_templates_shared_read on public.vocrehab_game_templates;
create policy vocrehab_templates_shared_read on public.vocrehab_game_templates
  for select using (is_shared = true);

create table if not exists public.vocrehab_saved_game_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null check (game_id in ('file-sort','inbox-sprint','focus-shift','barrier-run','schedule-juggle','time-punch','tool-match','resume-rescue','phone-greeting','paycheck-plan','energy-budget')),
  template_id uuid references public.vocrehab_game_templates(id) on delete set null,
  title text not null default 'My saved game' check (char_length(title) between 1 and 100),
  state jsonb not null default '{}'::jsonb check (pg_column_size(state) <= 65536),
  updated_at timestamptz not null default now()
);
create index if not exists vocrehab_saved_states_user_idx on public.vocrehab_saved_game_states(user_id, updated_at desc);
alter table public.vocrehab_saved_game_states enable row level security;
drop policy if exists vocrehab_saved_states_own on public.vocrehab_saved_game_states;
create policy vocrehab_saved_states_own on public.vocrehab_saved_game_states
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.vocrehab_game_templates, public.vocrehab_saved_game_states to authenticated;
