-- VocRehab Wave 2: live interview sim (job-interview scenario + voice-rehearsal-save).
-- Fully rerunnable. ONE migration: widen scenario CHECK, add metadata jsonb,
-- widen consents purpose CHECK. No new table. No audio stored anywhere, ever.

-- 1. roleplay_sessions.scenario: ('prep','pivot','disclosure') -> + 'job-interview'
do $$
declare cname text;
begin
  select conname into cname from pg_constraint
  where conrelid = 'public.vocrehab_roleplay_sessions'::regclass
    and contype = 'c' and pg_get_constraintdef(oid) like '%prep%pivot%disclosure%';
  if cname is not null then
    execute format('alter table public.vocrehab_roleplay_sessions drop constraint %I', cname);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.vocrehab_roleplay_sessions'::regclass and conname = 'vocrehab_roleplay_sessions_scenario_chk') then
    alter table public.vocrehab_roleplay_sessions
      add constraint vocrehab_roleplay_sessions_scenario_chk
      check (scenario in ('prep','pivot','disclosure','job-interview'));
  end if;
end $$;

-- 2. roleplay_sessions.metadata jsonb for {jobId, difficulty, mode, scores, reportCard}
alter table public.vocrehab_roleplay_sessions
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- 3. consents.purpose: + 'voice-rehearsal-save'
do $$
declare cname text;
begin
  select conname into cname from pg_constraint
  where conrelid = 'public.vocrehab_consents'::regclass
    and contype = 'c' and pg_get_constraintdef(oid) like '%session-assist%';
  if cname is not null and cname <> 'vocrehab_consents_purpose_chk' then
    execute format('alter table public.vocrehab_consents drop constraint %I', cname);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.vocrehab_consents'::regclass and conname = 'vocrehab_consents_purpose_chk') then
    alter table public.vocrehab_consents
      add constraint vocrehab_consents_purpose_chk
      check (purpose in ('session-assist','roleplay-save','voice-rehearsal-save','data-export','course-sync'));
  end if;
end $$;
