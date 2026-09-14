-- 20261208000000_vocrehab_module_v1.sql — VocRehab course + minigames module v1 data surface.
-- PURPOSE: backs 4weird.com/vocrehab/ — course progress, game telemetry, assessments,
--   documents, AI roleplay rehearsal, SSI calculator runs, disclosure adventure state,
--   consent-gated counselor ambient-assist drafts, and the own-data export audit log.
-- USAGE: infra lane (DS-VOCREHAB-C1) owns this file; web/games/vcw lanes consume these
--   tables via the Supabase server helpers and /api/vocrehab/* routes only. Tables serve
--   envelopes DS-VOCREHAB-02..07 (16 tables: consents, module_progress, game_sessions,
--   game_events, assessments, documents, roleplay_sessions, roleplay_turns,
--   calculator_runs, disclosure_states, coaching_sessions, case_notes,
--   progress_measures, rationalizations, outreach_drafts, export_log).
-- RIP-OUT: dropping these tables plus the app/vocrehab/** tree plus lib/vocrehab-*
--   returns 4weird to pre-VocRehab behavior; see vocrehab-IMPLEMENTATION-PLAN.md S1.3.
-- NON-TOUCH: this migration never alters coin_ledger, coin_lots, or profiles; the economy surface is read by RPC only, never written here.
-- Rerunnable: IF NOT EXISTS on tables/indexes, DROP IF EXISTS on policies,
-- OR REPLACE on functions. RLS on every table, default-deny.

-- ---------------------------------------------------------------------------
-- Tables (16, all vocrehab_* prefixed)
-- ---------------------------------------------------------------------------

create table if not exists public.vocrehab_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_ref text not null default 'self',
  purpose text not null check (purpose in ('session-assist','roleplay-save','data-export','course-sync')),
  consented_at timestamptz not null default now(),
  revoked_at timestamptz,
  note text
);

create table if not exists public.vocrehab_module_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  module_slug text not null check (module_slug ~ '^[a-z0-9-]{1,64}$'),
  status text not null default 'started' check (status in ('started','done')),
  xp integer not null default 0 check (xp >= 0 and xp <= 1000),
  updated_at timestamptz not null default now(),
  primary key (user_id, module_slug)
);

create table if not exists public.vocrehab_game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null check (game_id in ('file-sort','inbox-sprint','focus-shift','barrier-run','schedule-juggle')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  summary jsonb not null default '{}'::jsonb,
  profile_sent boolean not null default false
);

create table if not exists public.vocrehab_game_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.vocrehab_game_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  t_ms integer not null check (t_ms >= 0 and t_ms <= 600000),
  kind text not null check (kind in ('start','action','error','help','pause','resume','interrupt','complete')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.vocrehab_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('ipe','barrier','readiness','goals','remote')),
  payload jsonb not null default '{}'::jsonb,
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.vocrehab_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('prep','pivot','script','resume','decision-onepager')),
  title text not null default '',
  body jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vocrehab_roleplay_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario text not null check (scenario in ('prep','pivot','disclosure')),
  turns integer not null default 0,
  saved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.vocrehab_roleplay_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.vocrehab_roleplay_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','manager','feedback')),
  text text not null check (char_length(text) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.vocrehab_calculator_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hourly_wage numeric(6,2) not null check (hourly_wage >= 0 and hourly_wage <= 200),
  hours_per_week numeric(5,2) not null check (hours_per_week >= 0 and hours_per_week <= 80),
  estimate jsonb not null default '{}'::jsonb,
  params_version text not null default '2026-v1',
  created_at timestamptz not null default now()
);

create table if not exists public.vocrehab_disclosure_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  node_id text not null default 'start',
  path jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.vocrehab_coaching_sessions (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references auth.users(id) on delete cascade,
  client_ref text not null default 'self',
  consent_id uuid references public.vocrehab_consents(id) on delete set null,
  source text not null default 'pasted' check (source in ('pasted','dictated')),
  created_at timestamptz not null default now()
);

create table if not exists public.vocrehab_case_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.vocrehab_coaching_sessions(id) on delete cascade,
  counselor_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '',
  status text not null default 'draft' check (status in ('draft','approved','discarded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vocrehab_progress_measures (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.vocrehab_coaching_sessions(id) on delete set null,
  counselor_id uuid not null references auth.users(id) on delete cascade,
  client_ref text not null default 'self',
  body text not null default '',
  status text not null default 'draft' check (status in ('draft','approved','discarded')),
  created_at timestamptz not null default now()
);

create table if not exists public.vocrehab_rationalizations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.vocrehab_coaching_sessions(id) on delete set null,
  counselor_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'SE' check (kind in ('JCTS','SE','CE')),
  body text not null default '',
  status text not null default 'draft' check (status in ('draft','approved','discarded')),
  created_at timestamptz not null default now()
);

create table if not exists public.vocrehab_outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references auth.users(id) on delete cascade,
  employer text not null default '',
  body text not null default '',
  status text not null default 'draft' check (status in ('draft','copied','discarded')),
  created_at timestamptz not null default now()
);

create table if not exists public.vocrehab_export_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  format text not null check (format in ('json','csv')),
  bytes integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security: enabled on every table (own rows only, default-deny)
-- ---------------------------------------------------------------------------

alter table public.vocrehab_consents enable row level security;
alter table public.vocrehab_module_progress enable row level security;
alter table public.vocrehab_game_sessions enable row level security;
alter table public.vocrehab_game_events enable row level security;
alter table public.vocrehab_assessments enable row level security;
alter table public.vocrehab_documents enable row level security;
alter table public.vocrehab_roleplay_sessions enable row level security;
alter table public.vocrehab_roleplay_turns enable row level security;
alter table public.vocrehab_calculator_runs enable row level security;
alter table public.vocrehab_disclosure_states enable row level security;
alter table public.vocrehab_coaching_sessions enable row level security;
alter table public.vocrehab_case_notes enable row level security;
alter table public.vocrehab_progress_measures enable row level security;
alter table public.vocrehab_rationalizations enable row level security;
alter table public.vocrehab_outreach_drafts enable row level security;
alter table public.vocrehab_export_log enable row level security;

-- ---------------------------------------------------------------------------
-- Policies: own-rows-only via auth.uid(); child rows add parent ownership
-- ---------------------------------------------------------------------------

drop policy if exists vocrehab_consents_own on public.vocrehab_consents;
create policy vocrehab_consents_own on public.vocrehab_consents
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists vocrehab_module_progress_own on public.vocrehab_module_progress;
create policy vocrehab_module_progress_own on public.vocrehab_module_progress
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists vocrehab_game_sessions_own on public.vocrehab_game_sessions;
create policy vocrehab_game_sessions_own on public.vocrehab_game_sessions
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists vocrehab_game_events_own on public.vocrehab_game_events;
create policy vocrehab_game_events_own on public.vocrehab_game_events
  for all using (
    auth.uid() = user_id
    and exists (
      select 1 from public.vocrehab_game_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.vocrehab_game_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

drop policy if exists vocrehab_assessments_own on public.vocrehab_assessments;
create policy vocrehab_assessments_own on public.vocrehab_assessments
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists vocrehab_documents_own on public.vocrehab_documents;
create policy vocrehab_documents_own on public.vocrehab_documents
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists vocrehab_roleplay_sessions_own on public.vocrehab_roleplay_sessions;
create policy vocrehab_roleplay_sessions_own on public.vocrehab_roleplay_sessions
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists vocrehab_roleplay_turns_own on public.vocrehab_roleplay_turns;
create policy vocrehab_roleplay_turns_own on public.vocrehab_roleplay_turns
  for all using (
    auth.uid() = user_id
    and exists (
      select 1 from public.vocrehab_roleplay_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.vocrehab_roleplay_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

drop policy if exists vocrehab_calculator_runs_own on public.vocrehab_calculator_runs;
create policy vocrehab_calculator_runs_own on public.vocrehab_calculator_runs
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists vocrehab_disclosure_states_own on public.vocrehab_disclosure_states;
create policy vocrehab_disclosure_states_own on public.vocrehab_disclosure_states
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists vocrehab_coaching_sessions_own on public.vocrehab_coaching_sessions;
create policy vocrehab_coaching_sessions_own on public.vocrehab_coaching_sessions
  for all using (auth.uid() = counselor_id)
  with check (auth.uid() = counselor_id);

drop policy if exists vocrehab_case_notes_own on public.vocrehab_case_notes;
create policy vocrehab_case_notes_own on public.vocrehab_case_notes
  for all using (
    auth.uid() = counselor_id
    and exists (
      select 1 from public.vocrehab_coaching_sessions c
      where c.id = session_id and c.counselor_id = auth.uid()
    )
  )
  with check (
    auth.uid() = counselor_id
    and exists (
      select 1 from public.vocrehab_coaching_sessions c
      where c.id = session_id and c.counselor_id = auth.uid()
    )
  );

drop policy if exists vocrehab_progress_measures_own on public.vocrehab_progress_measures;
create policy vocrehab_progress_measures_own on public.vocrehab_progress_measures
  for all using (
    auth.uid() = counselor_id
    and (session_id is null or exists (
      select 1 from public.vocrehab_coaching_sessions c
      where c.id = session_id and c.counselor_id = auth.uid()
    ))
  )
  with check (
    auth.uid() = counselor_id
    and (session_id is null or exists (
      select 1 from public.vocrehab_coaching_sessions c
      where c.id = session_id and c.counselor_id = auth.uid()
    ))
  );

drop policy if exists vocrehab_rationalizations_own on public.vocrehab_rationalizations;
create policy vocrehab_rationalizations_own on public.vocrehab_rationalizations
  for all using (
    auth.uid() = counselor_id
    and (session_id is null or exists (
      select 1 from public.vocrehab_coaching_sessions c
      where c.id = session_id and c.counselor_id = auth.uid()
    ))
  )
  with check (
    auth.uid() = counselor_id
    and (session_id is null or exists (
      select 1 from public.vocrehab_coaching_sessions c
      where c.id = session_id and c.counselor_id = auth.uid()
    ))
  );

drop policy if exists vocrehab_outreach_drafts_own on public.vocrehab_outreach_drafts;
create policy vocrehab_outreach_drafts_own on public.vocrehab_outreach_drafts
  for all using (auth.uid() = counselor_id)
  with check (auth.uid() = counselor_id);

-- Export log is append-only: insert + select-own only (no update, no delete).
drop policy if exists vocrehab_export_log_select_own on public.vocrehab_export_log;
create policy vocrehab_export_log_select_own on public.vocrehab_export_log
  for select using (auth.uid() = user_id);

drop policy if exists vocrehab_export_log_insert_own on public.vocrehab_export_log;
create policy vocrehab_export_log_insert_own on public.vocrehab_export_log
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Indexes (query paths only)
-- ---------------------------------------------------------------------------

create index if not exists vocrehab_game_sessions_user_started_idx
  on public.vocrehab_game_sessions (user_id, started_at desc);
create index if not exists vocrehab_game_events_session_created_idx
  on public.vocrehab_game_events (session_id, created_at);
create index if not exists vocrehab_assessments_user_kind_created_idx
  on public.vocrehab_assessments (user_id, kind, created_at desc);
create index if not exists vocrehab_documents_user_kind_updated_idx
  on public.vocrehab_documents (user_id, kind, updated_at desc);
create index if not exists vocrehab_roleplay_turns_session_created_idx
  on public.vocrehab_roleplay_turns (session_id, created_at);
create index if not exists vocrehab_case_notes_session_status_idx
  on public.vocrehab_case_notes (session_id, status);
create index if not exists vocrehab_export_log_user_created_idx
  on public.vocrehab_export_log (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Functions (SECURITY DEFINER, locked-down grants)
-- ---------------------------------------------------------------------------

-- Returns the caller's own allowlisted rows as one JSONB snapshot.
-- Static SQL only: the caller id comes from auth.uid(), never a parameter.
create or replace function public.vocrehab_export_snapshot()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'login required'; end if;
  return jsonb_build_object(
    'consents', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (select * from public.vocrehab_consents where user_id = v_uid order by consented_at desc limit 200) t),
    'module_progress', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (select * from public.vocrehab_module_progress where user_id = v_uid limit 100) t),
    'game_sessions', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (select * from public.vocrehab_game_sessions where user_id = v_uid order by started_at desc limit 200) t),
    'game_events', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (select e.* from public.vocrehab_game_events e join public.vocrehab_game_sessions s on s.id = e.session_id where e.user_id = v_uid and s.user_id = v_uid order by e.created_at desc limit 1000) t),
    'assessments', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (select * from public.vocrehab_assessments where user_id = v_uid order by created_at desc limit 200) t),
    'documents', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (select * from public.vocrehab_documents where user_id = v_uid order by updated_at desc limit 200) t),
    'roleplay_sessions', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (select * from public.vocrehab_roleplay_sessions where user_id = v_uid order by created_at desc limit 200) t),
    'roleplay_turns', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (select rt.* from public.vocrehab_roleplay_turns rt join public.vocrehab_roleplay_sessions rs on rs.id = rt.session_id where rt.user_id = v_uid and rs.user_id = v_uid order by rt.created_at desc limit 1000) t),
    'calculator_runs', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (select * from public.vocrehab_calculator_runs where user_id = v_uid order by created_at desc limit 200) t),
    'disclosure_states', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (select * from public.vocrehab_disclosure_states where user_id = v_uid order by updated_at desc limit 100) t),
    'coaching_sessions', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (select * from public.vocrehab_coaching_sessions where counselor_id = v_uid order by created_at desc limit 200) t),
    'case_notes', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (select * from public.vocrehab_case_notes where counselor_id = v_uid order by created_at desc limit 200) t),
    'progress_measures', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (select * from public.vocrehab_progress_measures where counselor_id = v_uid order by created_at desc limit 200) t),
    'rationalizations', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (select * from public.vocrehab_rationalizations where counselor_id = v_uid order by created_at desc limit 200) t),
    'outreach_drafts', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (select * from public.vocrehab_outreach_drafts where counselor_id = v_uid order by created_at desc limit 200) t),
    'export_log', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (select * from public.vocrehab_export_log where user_id = v_uid order by created_at desc limit 200) t)
  );
end;
$$;

-- Appends one audit row for the caller's own download.
create or replace function public.vocrehab_log_export(p_format text, p_bytes integer)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_format is null or p_format not in ('json', 'csv') then raise exception 'format must be json or csv'; end if;
  if p_bytes is null or p_bytes < 0 then raise exception 'bytes must be >= 0'; end if;
  insert into public.vocrehab_export_log (user_id, format, bytes)
  values (auth.uid(), p_format, p_bytes)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.vocrehab_export_snapshot() from public, anon;
revoke all on function public.vocrehab_log_export(text, integer) from public, anon;
grant execute on function public.vocrehab_export_snapshot() to authenticated;
grant execute on function public.vocrehab_log_export(text, integer) to authenticated;
