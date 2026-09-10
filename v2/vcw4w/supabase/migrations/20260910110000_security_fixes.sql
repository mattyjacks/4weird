-- ============================================================================
-- Security fixes: close privilege-escalation and farming holes.
-- Fully rerunnable: OR REPLACE / IF NOT EXISTS / DROP ... IF EXISTS guards.
-- ============================================================================

-- 1. friendships: client INSERTs must stay 'pending'. The previous
--    friendships_insert_requester policy only checked requester_id, so any
--    user could INSERT status='accepted' and instantly "friend" anyone,
--    unlocking DMs (messages_send_to_friend) without consent.
drop policy if exists friendships_insert_requester on public.friendships;
create policy friendships_insert_requester on public.friendships
  for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending');

-- 2. friendships: parties are immutable once created. The recipient UPDATE
--    policy did not pin requester_id/addressee_id, so an update could
--    rewrite who requested whom.
create or replace function public.immutable_friendship_parties()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.requester_id is distinct from old.requester_id
     or new.addressee_id is distinct from old.addressee_id then
    raise exception 'friendship parties are immutable';
  end if;
  return new;
end; $$;
drop trigger if exists trg_friendship_parties on public.friendships;
create trigger trg_friendship_parties
  before update on public.friendships
  for each row execute function public.immutable_friendship_parties();

-- 3. direct_messages: read receipts were unwritable (no UPDATE policy, so
--    read_at was dead). Allow recipients to mark read, and only that: a
--    trigger rejects any change to sender/recipient/body/timestamps.
create or replace function public.only_read_receipt_changes()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.sender_id is distinct from old.sender_id
     or new.recipient_id is distinct from old.recipient_id
     or new.body is distinct from old.body
     or new.created_at is distinct from old.created_at then
    raise exception 'only read receipts may be updated';
  end if;
  return new;
end; $$;
drop trigger if exists trg_dm_read_receipt on public.direct_messages;
create trigger trg_dm_read_receipt
  before update on public.direct_messages
  for each row execute function public.only_read_receipt_changes();
drop policy if exists messages_mark_read on public.direct_messages;
create policy messages_mark_read on public.direct_messages
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());
grant update on public.direct_messages to authenticated;

-- 4. game_stat_events: leaderboard_top() sums all-time totals, so unbounded
--    client inserts (within the 0..100000 per-row CHECK) could farm #1.
--    Cap volume at 500 events per user per rolling day; legit play (one row
--    per session chunk, active_seconds <= 3600) never approaches this.
create or replace function public.cap_stat_events()
returns trigger language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.game_stat_events
      where user_id = new.user_id and created_at > now() - interval '1 day') >= 500 then
    raise exception 'telemetry quota exceeded';
  end if;
  return new;
end; $$;
drop trigger if exists trg_cap_stat_events on public.game_stat_events;
create trigger trg_cap_stat_events
  before insert on public.game_stat_events
  for each row execute function public.cap_stat_events();
