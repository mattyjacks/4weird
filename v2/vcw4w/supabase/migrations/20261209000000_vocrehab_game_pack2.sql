-- 20261209000000_vocrehab_game_pack2.sql
-- VocRehab pack-2: widen the game_id check on public.vocrehab_game_sessions
-- to admit three new arcade games (phone-greeting, time-punch, tool-match).
--
-- NEW FILE under the append-only discipline: this file never edits
-- 20261208000000_vocrehab_module_v1.sql. Later packs add further
-- *_vocrehab_*.sql files the same way.
--
-- NON-TOUCH: alters ONLY public.vocrehab_game_sessions (a vocrehab_* table).
-- No coin tables, no profiles, no other tables. The v1 RLS policies,
-- indexes, and functions are unchanged by this file.
--
-- Assumption: v1 declared the check inline, so Postgres auto-named it
-- vocrehab_game_sessions_game_id_check. The DROP is IF EXISTS and the ADD
-- is guarded by a pg_constraint probe, so this file is rerunnable and
-- safe to apply zero or more times.

ALTER TABLE IF EXISTS public.vocrehab_game_sessions
  DROP CONSTRAINT IF EXISTS vocrehab_game_sessions_game_id_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vocrehab_game_sessions_game_id_check'
  ) THEN
    ALTER TABLE public.vocrehab_game_sessions
      ADD CONSTRAINT vocrehab_game_sessions_game_id_check
      CHECK (game_id IN (
        'file-sort', 'inbox-sprint', 'focus-shift', 'barrier-run',
        'schedule-juggle', 'phone-greeting', 'time-punch', 'tool-match'
      ));
  END IF;
END
$$;
