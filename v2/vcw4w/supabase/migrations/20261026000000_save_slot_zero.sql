-- Slot 0: cheat-proof safety save slot. Every game gets four save slots
-- (0, 1, 2, 3) with slot 0 listed first. Slot 0 can never be marked
-- cheat-moded and can never allow cheats, so a player always has one save
-- that cannot be permanently branded by an accidental cheat toggle.
-- Safe to re-run: constraints are dropped before re-adding, the function is
-- replaced, and the trigger is dropped before re-creating.

-- Widen the game_saves slot range from 1-3 to 0-3. Inline CHECKs take the
-- default name <table>_<column>_check, so drop-then-add converges no matter
-- which earlier migration created the table.
alter table public.game_saves drop constraint if exists game_saves_slot_check;
alter table public.game_saves
  add constraint game_saves_slot_check check (slot between 0 and 3);

-- cheat_settings stays 1-3: slot 0 must never have a cheat row. Re-assert in
-- case an earlier bundle created the table without the range check.
alter table public.cheat_settings drop constraint if exists cheat_settings_slot_check;
alter table public.cheat_settings
  add constraint cheat_settings_slot_check check (slot between 1 and 3);

-- set_cheat_setting keeps rejecting slot 0; the guard is now explicit so a
-- future range widening cannot silently open the safety slot.
create or replace function public.set_cheat_setting(p_game text,p_slot smallint,p_enabled boolean) returns boolean language plpgsql security definer set search_path=public as $$ begin
 if p_slot = 0 then raise exception 'slot 0 is cheat-proof and can never allow cheats'; end if;
 if p_game !~ '^[a-z0-9-]{1,64}$' or p_slot not between 1 and 3 then raise exception 'invalid cheat setting'; end if;
 insert into cheat_settings(user_id,game_slug,slot,enabled,cheated_at) values(auth.uid(),p_game,p_slot,p_enabled,case when p_enabled then now() end) on conflict(user_id,game_slug,slot) do update set enabled=excluded.enabled,cheated_at=coalesce(cheat_settings.cheated_at,excluded.cheated_at);
 if p_enabled then insert into game_saves(user_id,game_slug,slot,data) values(auth.uid(),p_game,p_slot,jsonb_build_object('cheat_mode',true)) on conflict(user_id,game_slug,slot) do update set data=game_saves.data || jsonb_build_object('cheat_mode',true); end if; return p_enabled; end; $$;
grant execute on function public.set_cheat_setting(text,smallint,boolean) to authenticated;

-- Database backstop for the API-level strip: no write path (API, console,
-- rpc) can leave cheat_mode on a slot-0 save.
create or replace function public.strip_slot_zero_cheat_marker()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.slot = 0 and coalesce((new.data->>'cheat_mode')::boolean,false) then
   new.data := new.data - 'cheat_mode';
 end if;
 return new;
end; $$;
drop trigger if exists trg_strip_slot_zero_cheat_marker on public.game_saves;
create trigger trg_strip_slot_zero_cheat_marker before insert or update on public.game_saves for each row execute function public.strip_slot_zero_cheat_marker();
