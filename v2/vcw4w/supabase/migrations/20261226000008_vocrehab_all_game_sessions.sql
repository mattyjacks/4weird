-- Allow every shipped VocRehab arcade game to persist a session.
alter table if exists public.vocrehab_game_sessions
  drop constraint if exists vocrehab_game_sessions_game_id_check;

do $$
begin
  if to_regclass('public.vocrehab_game_sessions') is not null and not exists (
    select 1 from pg_constraint
    where conname = 'vocrehab_game_sessions_game_id_check'
      and conrelid = 'public.vocrehab_game_sessions'::regclass
  ) then
    alter table public.vocrehab_game_sessions
      add constraint vocrehab_game_sessions_game_id_check
      check (game_id in (
        'file-sort','inbox-sprint','focus-shift','barrier-run','schedule-juggle',
        'phone-greeting','time-punch','tool-match','paycheck-plan','energy-budget','resume-rescue'
      ));
  end if;
end $$;
