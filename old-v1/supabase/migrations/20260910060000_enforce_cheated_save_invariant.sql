-- Cheat Mode is a database invariant, not merely an API convention.
create or replace function public.enforce_cheat_save_marker()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if coalesce((old.data->>'cheat_mode')::boolean,false) then
   new.data := new.data || jsonb_build_object('cheat_mode',true);
 end if;
 return new;
end; $$;
drop trigger if exists trg_enforce_cheat_save_marker on public.game_saves;
create trigger trg_enforce_cheat_save_marker before update on public.game_saves for each row execute function public.enforce_cheat_save_marker();
-- A save is intentionally not deletable from the client: delete/recreate
-- must never be usable as a way to launder a cheated progression file.
drop policy if exists game_saves_own on public.game_saves;
create policy game_saves_read_own on public.game_saves for select to authenticated using(user_id=auth.uid());
create policy game_saves_insert_own on public.game_saves for insert to authenticated with check(user_id=auth.uid());
create policy game_saves_update_own on public.game_saves for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke delete on public.game_saves from authenticated;
grant select,insert,update on public.game_saves to authenticated;
