-- Dual-save: each game slot 0-3 holds TWO saves distinguished by kind
-- (`manual` default, `auto` load-only backup in UI; API still accepts PUT
-- for `auto` because the autosave timer writes it). Safe to re-run:
-- the column is added idempotently, constraints are dropped before
-- re-adding, and the slot-0 cheat-proof strip trigger applies to both
-- kinds (it keys on slot only, so no change needed there).

-- 1. kind column (omitted kind reads/writes as 'manual': backward compat).
alter table public.game_saves
  add column if not exists kind text not null default 'manual';

-- 2. kind allowlist.
alter table public.game_saves drop constraint if exists game_saves_kind_check;
alter table public.game_saves
  add constraint game_saves_kind_check check (kind in ('manual', 'auto'));

-- 3. One row per (user, game, slot, kind): drop the old 3-column unique,
-- then create the 4-column unique. The inline unique's auto-generated name
-- is game_saves_user_id_game_slug_slot_key.
alter table public.game_saves
  drop constraint if exists game_saves_user_id_game_slug_slot_key;
alter table public.game_saves
  drop constraint if exists game_saves_user_game_slot_kind_key;
alter table public.game_saves
  add constraint game_saves_user_game_slot_kind_key
  unique (user_id, game_slug, slot, kind);
