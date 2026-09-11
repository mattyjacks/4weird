-- Quantum hardening (rerunnable): shorter HNDL windows + no self-mint.
-- Safe to re-run: ALTER ... IF EXISTS, OR REPLACE, DROP ... IF EXISTS only.

-- 1. Child sessions default to 7 days (was 30). App inserts explicitly with
--    KID_SESSION_DAYS=7 + sliding refresh; this covers direct SQL inserts.
alter table if exists public.kid_sessions
  alter column expires_at set default now() + interval '7 days';

-- 2. Quest self-mint guard: owners/mods complete quests for OTHER members
--    only (kills the unbounded single-account infinite-mint loop). API also
--    rejects self-completion; this is the server-authoritative backstop.
create or replace function public.complete_clan_quest(p_quest_id uuid, p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_quest record;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_user_id = auth.uid() then raise exception 'quests reward other members'; end if;
  select q.* into v_quest from public.clan_quests q where q.id = p_quest_id;
  if not found then raise exception 'quest not found'; end if;
  if not v_quest.active then raise exception 'quest is closed'; end if;
  if not exists (select 1 from public.clan_members m where m.clan_id = v_quest.clan_id and m.user_id = auth.uid() and m.role in ('owner','mod')) then
    raise exception 'not a moderator'; end if;
  if not exists (select 1 from public.clan_members m where m.clan_id = v_quest.clan_id and m.user_id = p_user_id) then
    raise exception 'member not found'; end if;
  insert into public.clan_quest_completions (quest_id, user_id) values (p_quest_id, p_user_id);
  update public.profiles set ll_balance = ll_balance + v_quest.reward_ll, ll_earned = ll_earned + v_quest.reward_ll
   where id = p_user_id;
  insert into public.love_gifts (giver_id, receiver_id, clan_id, kind, cost)
  values (auth.uid(), p_user_id, v_quest.clan_id, 'quest', v_quest.reward_ll);
  return jsonb_build_object('quest_id', p_quest_id, 'user_id', p_user_id);
exception when unique_violation then
  raise exception 'already completed';
end; $$;
revoke all on function public.complete_clan_quest(uuid, uuid) from public, anon, authenticated;
grant execute on function public.complete_clan_quest(uuid, uuid) to authenticated;
