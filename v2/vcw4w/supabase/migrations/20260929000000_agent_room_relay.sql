-- ============================================================================
-- Agent-commanded humans in UnitUnite rooms (antisocial-user relay).
-- Fully rerunnable: ADD COLUMN IF NOT EXISTS / OR REPLACE / DROP IF EXISTS.
--
-- Model: a user commands their agent (in-app "send as agent" toggle, or
-- their own external agent over a `bot4weird_` key with the new
-- `unitunite:read` / `unitunite:send` scopes). The agent's words land in
-- team rooms as messages with is_bot = true, rendered EVERYWHERE with a
-- clear [BOT] label. The user keeps full read access to the chats.
--
-- Honesty notes (E2EE stays intact for humans):
-- * Human sends are unchanged: clients encrypt, server stores ciphertext.
-- * Agent relays hold no megolm session in v1, so relayed bodies are stored
--   server-side plaintext (encoding = 'plain') and marked is_bot. Readers
--   must render [BOT] + body WITHOUT attempting decrypt on plain rows.
-- * Relay moves 0 coins: nothing here touches coin_ledger / wallets.
-- * Security fix included: send_room_packet() now ALWAYS requires
--   rooms.send; previously a room member without the key (e.g. an
--   auto-joined watcher) could post through the member path unchecked.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Bot-label columns on room_messages.
-- --------------------------------------------------------------------------
alter table public.room_messages
  add column if not exists is_bot boolean not null default false;
alter table public.room_messages
  add column if not exists encoding text not null default 'cipher'
    check (encoding in ('cipher', 'plain'));
create index if not exists idx_room_messages_bot on public.room_messages (room_id, created_at desc)
  where is_bot = true;

-- --------------------------------------------------------------------------
-- 2. Harden send_room_packet: rooms.send required on EVERY path (owners
-- pass via the org-teams.delete inheritance inside has_team_perm).
-- --------------------------------------------------------------------------
create or replace function public.send_room_packet(p_room uuid, p_cipher text, p_session text, p_device text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_team uuid; v_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select team_id into v_team from public.team_rooms where id = p_room;
  if v_team is null then raise exception 'room not found'; end if;
  if not public.has_team_perm(v_team, 'rooms.send') then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.room_members where room_id = p_room and user_id = auth.uid()) then
    insert into public.room_members (room_id, user_id) values (p_room, auth.uid())
    on conflict do nothing;
  end if;
  if char_length(coalesce(p_cipher,'')) < 1 or char_length(p_cipher) > 16000 then raise exception 'invalid packet'; end if;
  insert into public.room_messages (room_id, sender_id, device_id, ciphertext, session_key_id, is_bot, encoding)
  values (p_room, auth.uid(), substr(coalesce(p_device,'unknown'),1,64), p_cipher, substr(coalesce(p_session,''),1,64), false, 'cipher')
  returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.send_room_packet(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.send_room_packet(uuid, text, text, text) to authenticated;

-- --------------------------------------------------------------------------
-- 3. Relayed agent send (session user commanding their agent).
-- --------------------------------------------------------------------------
create or replace function public.send_room_packet_as_bot(p_room uuid, p_text text, p_bot_name text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_team uuid; v_org uuid; v_id uuid;
  v_name text := substr(trim(coalesce(p_bot_name, '')), 1, 40);
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select team_id into v_team from public.team_rooms where id = p_room;
  if v_team is null then raise exception 'room not found'; end if;
  if not public.has_team_perm(v_team, 'rooms.send') then raise exception 'forbidden'; end if;
  if char_length(trim(coalesce(p_text, ''))) < 1 then raise exception 'message is empty'; end if;
  if char_length(p_text) > 4000 then raise exception 'message too long (max 4000)'; end if;
  select org_id into v_org from public.teams where id = v_team;
  if v_org is not null then perform public.ensure_org_initialized(v_org); end if;
  if not exists (select 1 from public.room_members where room_id = p_room and user_id = auth.uid()) then
    insert into public.room_members (room_id, user_id) values (p_room, auth.uid())
    on conflict do nothing;
  end if;
  insert into public.room_messages (room_id, sender_id, device_id, ciphertext, session_key_id, is_bot, encoding)
  values (p_room, auth.uid(), 'agent-relay', p_text, '', true, 'plain')
  returning id into v_id;
  perform public._audit(v_org, v_team, 'room.send.bot',
    substr('[BOT] ' || nullif(v_name, '') || ': ' || trim(p_text), 1, 200));
  return v_id;
end; $$;
revoke all on function public.send_room_packet_as_bot(uuid, text, text) from public, anon, authenticated;
grant execute on function public.send_room_packet_as_bot(uuid, text, text) to authenticated;

-- --------------------------------------------------------------------------
-- 4. Read path: rooms.view-gated, auto-joins members/owners (never random
-- public lurkers), returns sender display + [BOT] flags. Redacted bodies
-- stay '[redacted]' for everyone.
-- --------------------------------------------------------------------------
create or replace function public.read_room_messages(p_room uuid, p_limit integer default 50, p_before timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_team uuid; v_org uuid; v_lim integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select team_id into v_team from public.team_rooms where id = p_room;
  if v_team is null then raise exception 'room not found'; end if;
  if not public.has_team_perm(v_team, 'rooms.view') then raise exception 'forbidden'; end if;
  select org_id into v_org from public.teams where id = v_team;
  -- Members/owners join so the roster + future reads stay consistent.
  -- Public-team lurkers read without joining (no roster pollution).
  if exists (select 1 from public.orgs o where o.id = v_org and o.owner_id = auth.uid())
     or exists (select 1 from public.org_members m where m.org_id = v_org and m.user_id = auth.uid())
     or exists (select 1 from public.team_members m where m.team_id = v_team and m.user_id = auth.uid()) then
    insert into public.room_members (room_id, user_id) values (p_room, auth.uid())
    on conflict do nothing;
  end if;
  return jsonb_build_object(
    'room', (select jsonb_build_object('id', r.id, 'team_id', r.team_id, 'slug', r.slug,
        'name', r.name, 'topic', r.topic, 'encrypted', r.encrypted, 'created_at', r.created_at)
      from public.team_rooms r where r.id = p_room),
    'messages', coalesce((select jsonb_agg(t order by t.created_at asc) from (
        select m.id, m.sender_id,
          coalesce(p.display_name, p.public_handle, 'member') as sender,
          m.is_bot, m.encoding,
          case when m.redacted then '[redacted]' else m.ciphertext end as body,
          m.redacted, m.created_at
        from public.room_messages m
        left join public.profiles p on p.id = m.sender_id
        where m.room_id = p_room
          and (p_before is null or m.created_at < p_before)
        order by m.created_at desc limit v_lim
      ) t), '[]'::jsonb)
  );
end; $$;
revoke all on function public.read_room_messages(uuid, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.read_room_messages(uuid, integer, timestamptz) to authenticated;

-- --------------------------------------------------------------------------
-- 5. Room list for a team (rooms.view-gated) with message + [BOT] counts.
-- --------------------------------------------------------------------------
create or replace function public.list_unitunite_rooms(p_team uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.has_team_perm(p_team, 'rooms.view') then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_agg(t order by t.created_at desc) from (
    select r.id, r.team_id, r.slug, r.name, r.topic, r.encrypted, r.created_at,
      (select count(*)::integer from public.room_messages m where m.room_id = r.id) as message_count,
      (select count(*)::integer from public.room_messages m where m.room_id = r.id and m.is_bot) as bot_sends
    from public.team_rooms r where r.team_id = p_team limit 200
  ) t), '[]'::jsonb);
end; $$;
revoke all on function public.list_unitunite_rooms(uuid) from public, anon, authenticated;
grant execute on function public.list_unitunite_rooms(uuid) to authenticated;

-- --------------------------------------------------------------------------
-- 6. Bot-key (no-JWT) variants: the linked human acts through their agent.
-- Perms resolve WITHOUT auth.uid(): owner > team role > org role (+org
-- junction presets) > public/internal view fallback. Every send is
-- is_bot = true, audited with a [BOT] prefix, and moves 0 coins.
-- --------------------------------------------------------------------------
create or replace function public._agent_perms_for(p_team uuid, p_user uuid)
returns text[] language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_perms text[] := '{}'; m record; k text;
begin
  select t.org_id into v_org from public.teams t where t.id = p_team;
  if v_org is null then return '{}'; end if;
  if exists (select 1 from public.orgs o where o.id = v_org and o.owner_id = p_user) then
    return array(select key from public.permission_catalog);
  end if;
  select m.role_key, m.custom_role_id into m from public.team_members m
  where m.team_id = p_team and m.user_id = p_user;
  if found then v_perms := public.effective_perms(m.role_key, m.custom_role_id); end if;
  select m.role_key, m.custom_role_id into m from public.org_members m
  where m.org_id = v_org and m.user_id = p_user;
  if found then v_perms := array(select distinct unnest(v_perms || public.effective_perms(m.role_key, m.custom_role_id))); end if;
  for k in select r.role_key from public.org_member_roles r
    where r.org_id = v_org and r.user_id = p_user
  loop
    v_perms := array(select distinct unnest(v_perms || public.effective_perms(k, null)));
  end loop;
  return v_perms;
end; $$;
revoke all on function public._agent_perms_for(uuid, uuid) from public, anon, authenticated;

create or replace function public.agent_room_send(p_user uuid, p_room uuid, p_text text, p_bot_name text default '', p_encoding text default 'plain', p_session text default '', p_device text default 'agent-relay')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_team uuid; v_org uuid; v_id uuid; v_perms text[];
  v_name text := substr(trim(coalesce(p_bot_name, '')), 1, 40);
  v_enc text := lower(trim(coalesce(p_encoding, 'plain')));
begin
  if p_user is null then raise exception 'login required'; end if;
  select team_id into v_team from public.team_rooms where id = p_room;
  if v_team is null then raise exception 'room not found'; end if;
  v_perms := public._agent_perms_for(v_team, p_user);
  if not ('rooms.send' = any (v_perms)) then raise exception 'forbidden'; end if;
  if char_length(trim(coalesce(p_text, ''))) < 1 then raise exception 'message is empty'; end if;
  if v_enc not in ('plain', 'cipher') then raise exception 'invalid encoding'; end if;
  if v_enc = 'plain' and char_length(p_text) > 4000 then raise exception 'message too long (max 4000)'; end if;
  if v_enc = 'cipher' and (char_length(p_text) < 1 or char_length(p_text) > 16000) then raise exception 'invalid packet'; end if;
  select org_id into v_org from public.teams where id = v_team;
  if v_org is not null then perform public.ensure_org_initialized(v_org); end if;
  insert into public.room_members (room_id, user_id) values (p_room, p_user)
  on conflict do nothing;
  insert into public.room_messages (room_id, sender_id, device_id, ciphertext, session_key_id, is_bot, encoding)
  values (p_room, p_user, substr(coalesce(p_device, 'agent-relay'), 1, 64), p_text,
    substr(coalesce(p_session, ''), 1, 64), true, v_enc)
  returning id into v_id;
  perform public._audit(v_org, v_team, 'room.send.bot',
    substr('[BOT] ' || nullif(v_name, '') || ': ' || trim(p_text), 1, 200));
  return v_id;
end; $$;
revoke all on function public.agent_room_send(uuid, uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.agent_room_send(uuid, uuid, text, text, text, text, text) to service_role;

create or replace function public.agent_room_read(p_user uuid, p_room uuid, p_limit integer default 50, p_before timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_team uuid; v_org uuid; v_perms text[];
  v_lim integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if p_user is null then raise exception 'login required'; end if;
  select team_id into v_team from public.team_rooms where id = p_room;
  if v_team is null then raise exception 'room not found'; end if;
  v_perms := public._agent_perms_for(v_team, p_user);
  if not ('rooms.view' = any (v_perms)) then
    if not exists (select 1 from public.team_rooms r join public.teams t on t.id = r.team_id
                   where r.id = p_room and t.visibility in ('internal', 'public')) then
      raise exception 'forbidden';
    end if;
  end if;
  select org_id into v_org from public.teams where id = v_team;
  if exists (select 1 from public.orgs o where o.id = v_org and o.owner_id = p_user)
     or exists (select 1 from public.org_members m where m.org_id = v_org and m.user_id = p_user)
     or exists (select 1 from public.team_members m where m.team_id = v_team and m.user_id = p_user) then
    insert into public.room_members (room_id, user_id) values (p_room, p_user)
    on conflict do nothing;
  end if;
  return jsonb_build_object(
    'room', (select jsonb_build_object('id', r.id, 'team_id', r.team_id, 'slug', r.slug,
        'name', r.name, 'topic', r.topic, 'encrypted', r.encrypted, 'created_at', r.created_at)
      from public.team_rooms r where r.id = p_room),
    'messages', coalesce((select jsonb_agg(t order by t.created_at asc) from (
        select m.id, m.sender_id,
          coalesce(p.display_name, p.public_handle, 'member') as sender,
          m.is_bot, m.encoding,
          case when m.redacted then '[redacted]' else m.ciphertext end as body,
          m.redacted, m.created_at
        from public.room_messages m
        left join public.profiles p on p.id = m.sender_id
        where m.room_id = p_room
          and (p_before is null or m.created_at < p_before)
        order by m.created_at desc limit v_lim
      ) t), '[]'::jsonb)
  );
end; $$;
revoke all on function public.agent_room_read(uuid, uuid, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.agent_room_read(uuid, uuid, integer, timestamptz) to service_role;

create or replace function public.agent_list_rooms(p_user uuid, p_team uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_perms text[];
begin
  if p_user is null then raise exception 'login required'; end if;
  v_perms := public._agent_perms_for(p_team, p_user);
  if not ('rooms.view' = any (v_perms)) then
    if not exists (select 1 from public.teams t
                   where t.id = p_team and t.visibility in ('internal', 'public')) then
      raise exception 'forbidden';
    end if;
  end if;
  return coalesce((select jsonb_agg(t order by t.created_at desc) from (
    select r.id, r.team_id, r.slug, r.name, r.topic, r.encrypted, r.created_at,
      (select count(*)::integer from public.room_messages m where m.room_id = r.id) as message_count,
      (select count(*)::integer from public.room_messages m where m.room_id = r.id and m.is_bot) as bot_sends
    from public.team_rooms r where r.team_id = p_team limit 200
  ) t), '[]'::jsonb);
end; $$;
revoke all on function public.agent_list_rooms(uuid, uuid) from public, anon, authenticated;
grant execute on function public.agent_list_rooms(uuid, uuid) to service_role;

-- Agents may open rooms too (same team.rooms.create gate, resolved for the
-- linked human). The opener joins with full power, like create_room.
create or replace function public.agent_room_create(p_user uuid, p_team uuid, p_slug text, p_name text)
returns public.team_rooms language plpgsql security definer set search_path = public as $$
declare v_perms text[]; v_org uuid; v_row public.team_rooms%rowtype;
begin
  if p_user is null then raise exception 'login required'; end if;
  v_perms := public._agent_perms_for(p_team, p_user);
  if not ('team.rooms.create' = any (v_perms)) then raise exception 'forbidden'; end if;
  if lower(trim(coalesce(p_slug, ''))) !~ '^[a-z0-9-]{2,60}$' then raise exception 'invalid slug'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 or char_length(p_name) > 80 then raise exception 'invalid name'; end if;
  select org_id into v_org from public.teams where id = p_team;
  if v_org is null then raise exception 'team not found'; end if;
  perform public.ensure_org_initialized(v_org);
  insert into public.team_rooms (team_id, slug, name, created_by)
  values (p_team, lower(trim(p_slug)), trim(p_name), p_user)
  returning * into v_row;
  insert into public.room_members (room_id, user_id, power)
  values (v_row.id, p_user, 100) on conflict do nothing;
  perform public._audit(v_org, p_team, 'room.create', p_slug);
  return v_row;
exception when unique_violation then raise exception 'slug taken';
end; $$;
revoke all on function public.agent_room_create(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.agent_room_create(uuid, uuid, text, text) to service_role;

-- --------------------------------------------------------------------------
-- 7. First-use init also fires when the first ROOM or room message lands.
-- --------------------------------------------------------------------------
create or replace function public.trg_init_team_org_on_use()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_team uuid;
begin
  if TG_TABLE_NAME = 'team_rooms' then
    v_team := new.team_id;
  elsif TG_TABLE_NAME = 'room_messages' then
    select team_id into v_team from public.team_rooms where id = new.room_id;
  end if;
  if v_team is not null then
    select org_id into v_org from public.teams where id = v_team;
    if v_org is not null then perform public.ensure_org_initialized(v_org); end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_team_rooms_init_org on public.team_rooms;
create trigger trg_team_rooms_init_org before insert on public.team_rooms
  for each row execute function public.trg_init_team_org_on_use();
drop trigger if exists trg_room_messages_init_org on public.room_messages;
create trigger trg_room_messages_init_org before insert on public.room_messages
  for each row execute function public.trg_init_team_org_on_use();
