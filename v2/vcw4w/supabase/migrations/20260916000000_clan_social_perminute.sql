-- ============================================================================
-- 4weird Clans v3 — Discord-style social (channels/messages/reactions/roles/
-- events/reads) + per-minute server-cost billing + member donations.
-- Fully rerunnable: IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS throughout.
-- ============================================================================
-- SOCIAL (discord-like, per clan):
--   clan_channels        text channels (#general, #announcements, #media ...)
--   clan_messages        chat messages (threads via reply_to, pins, edit)
--   clan_message_reactions  emoji reactions (toggle)
--   clan_roles + clan_member_roles  named roles (Owner/Admin/Mod/Member + custom)
--   clan_events          scheduled events
--   clan_channel_reads   read receipts for unread badges
-- Forum posts/comments (clan_posts/clan_comments) stay as the long-form board.
--
-- PER-MINUTE UPKEEP (billed every minute at :00 by /api/cron/clan-upkeep):
--   Cost card (lib/clan-costs.ts mirrors these rates):
--     base server / postulant ......... 0.000030 coins/min
--     per member ...................... 0.000004 coins/min each
--     stored images ................... 0.000008 coins/MB/min
--     database bytes (posts+comments+
--       messages text) ................ 0.0000008 coins/KB/min
--     bandwidth (measured transfer log) 0.000002 coins/KB
--     Luna AI moderation (GPT 5.6 Luna) 0.015 coins per check
--   A 5-member clan with 2 MB images + 200 KB of text costs ~0.0002 coins/min
--   (~0.26 coins/day) — extremely minimal for small clans; big active clans
--   pay linearly for what they actually store, transfer, and moderate.
--   Wallets keep 2-decimal balances; sub-cent fractions accumulate in
--   clan_upkeep_state.pending_micro until they reach a whole centicentcoin.
--   upkeep_last_accrued advances in whole-minute steps anchored to :00, so
--   every clan is billed on the minute, 0 seconds into the minute.
--
-- DONATIONS: donate_clan_upkeep() lets ANY member fund the wallet 1:1
-- (no cut). fund_clan_wallet() stays owner-only for backwards compat.
-- The creator pays by funding the wallet; members chip in via donations.
-- ============================================================================

-- 1. Ledger kinds: widen for message fees, donations, metered costs ---------
alter table public.clan_cost_ledger drop constraint if exists clan_cost_ledger_kind_check;
alter table public.clan_cost_ledger add constraint clan_cost_ledger_kind_check
  check (kind in (
    'post-fee', 'comment-fee', 'message-fee', 'upkeep', 'ad-revenue',
    'affiliate-revenue', 'owner-funding', 'donation', 'storage', 'database',
    'bandwidth', 'ai-moderation', 'server'
  ));

-- 2. Social tables ------------------------------------------------------------
create table if not exists public.clan_channels (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]{1,30}$'),
  name varchar(40) not null check (char_length(name) between 1 and 40),
  topic varchar(200) not null default '' check (char_length(topic) <= 200),
  kind text not null default 'chat' check (kind in ('chat', 'forum', 'announce', 'events', 'media')),
  position integer not null default 0,
  readonly boolean not null default false,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (clan_id, slug)
);
create index if not exists clan_channels_clan_idx on public.clan_channels (clan_id, position);

create table if not exists public.clan_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.clan_channels(id) on delete cascade,
  clan_id uuid not null references public.clans(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body varchar(2000) not null check (char_length(body) between 1 and 2000),
  image_url text null,
  reply_to uuid null references public.clan_messages(id) on delete set null,
  status text not null default 'visible' check (status in ('visible', 'pending', 'hidden')),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  edited_at timestamptz null
);
create index if not exists clan_messages_channel_idx on public.clan_messages (channel_id, created_at desc);
create index if not exists clan_messages_clan_idx on public.clan_messages (clan_id, created_at desc);

create table if not exists public.clan_message_reactions (
  message_id uuid not null references public.clan_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji varchar(32) not null check (char_length(emoji) between 1 and 32),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);
create index if not exists clan_reactions_msg_idx on public.clan_message_reactions (message_id);

create table if not exists public.clan_roles (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  name varchar(24) not null check (char_length(name) between 1 and 24),
  color varchar(7) not null default '#22d3ee' check (color ~ '^#[0-9a-fA-F]{6}$'),
  position integer not null default 0,
  perms jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (clan_id, name)
);

create table if not exists public.clan_member_roles (
  clan_id uuid not null references public.clans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.clan_roles(id) on delete cascade,
  granted_by uuid null references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (clan_id, user_id, role_id)
);

create table if not exists public.clan_events (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  channel_id uuid null references public.clan_channels(id) on delete set null,
  title varchar(120) not null check (char_length(title) between 1 and 120),
  description varchar(1000) not null default '' check (char_length(description) <= 1000),
  starts_at timestamptz not null,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists clan_events_clan_idx on public.clan_events (clan_id, starts_at);

create table if not exists public.clan_channel_reads (
  channel_id uuid not null references public.clan_channels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

-- 3. Metering tables ----------------------------------------------------------
create table if not exists public.clan_ai_usage (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  kind text not null default 'luna-check' check (kind in ('luna-check', 'luna-image')),
  qty numeric(12, 2) not null default 1 check (qty >= 0 and qty <= 100000),
  coins numeric(12, 4) not null default 0 check (coins >= 0 and coins <= 100000),
  billed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists clan_ai_usage_clan_idx on public.clan_ai_usage (clan_id, billed, created_at);

create table if not exists public.clan_transfer_log (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  kind text not null default 'page-view' check (kind in ('page-view', 'image', 'api')),
  bytes_out integer not null check (bytes_out >= 0 and bytes_out <= 104857600),
  created_at timestamptz not null default now()
);
create index if not exists clan_transfer_clan_idx on public.clan_transfer_log (clan_id, created_at desc);

-- Sub-cent fractions accumulate here until they reach a whole centicentcoin.
create table if not exists public.clan_upkeep_state (
  clan_id uuid primary key references public.clans(id) on delete cascade,
  pending_micro numeric(12, 6) not null default 0 check (pending_micro >= 0 and pending_micro <= 100000),
  updated_at timestamptz not null default now()
);

-- 4. RLS ----------------------------------------------------------------------
alter table public.clan_channels enable row level security;
alter table public.clan_messages enable row level security;
alter table public.clan_message_reactions enable row level security;
alter table public.clan_roles enable row level security;
alter table public.clan_member_roles enable row level security;
alter table public.clan_events enable row level security;
alter table public.clan_channel_reads enable row level security;
alter table public.clan_ai_usage enable row level security;
alter table public.clan_transfer_log enable row level security;
alter table public.clan_upkeep_state enable row level security;

-- Public reads (transparency). Writes go through SECURITY DEFINER RPCs only.
drop policy if exists clan_channels_public_read on public.clan_channels;
create policy clan_channels_public_read on public.clan_channels
  for select to anon, authenticated using (true);

drop policy if exists clan_messages_visible_read on public.clan_messages;
create policy clan_messages_visible_read on public.clan_messages
  for select to anon, authenticated using (status = 'visible');

drop policy if exists clan_reactions_public_read on public.clan_message_reactions;
create policy clan_reactions_public_read on public.clan_message_reactions
  for select to anon, authenticated using (true);

drop policy if exists clan_roles_public_read on public.clan_roles;
create policy clan_roles_public_read on public.clan_roles
  for select to anon, authenticated using (true);

drop policy if exists clan_member_roles_public_read on public.clan_member_roles;
create policy clan_member_roles_public_read on public.clan_member_roles
  for select to anon, authenticated using (true);

drop policy if exists clan_events_public_read on public.clan_events;
create policy clan_events_public_read on public.clan_events
  for select to anon, authenticated using (true);

drop policy if exists clan_reads_owner_read on public.clan_channel_reads;
create policy clan_reads_owner_read on public.clan_channel_reads
  for select to authenticated using (user_id = auth.uid());

drop policy if exists clan_ai_usage_public_read on public.clan_ai_usage;
create policy clan_ai_usage_public_read on public.clan_ai_usage
  for select to anon, authenticated using (true);

drop policy if exists clan_transfer_public_read on public.clan_transfer_log;
create policy clan_transfer_public_read on public.clan_transfer_log
  for select to anon, authenticated using (true);

drop policy if exists clan_upkeep_state_public_read on public.clan_upkeep_state;
create policy clan_upkeep_state_public_read on public.clan_upkeep_state
  for select to anon, authenticated using (true);

-- 5. Seed default channels for new clans ---------------------------------------
-- Replaces the 4-arg create_clan so every new clan opens as a mini discord:
-- #general (chat) + #announcements (readonly) + #media (images).
create or replace function public.create_clan(
  p_slug text, p_name text, p_description text, p_clan_type text default 'sclan'
)
returns public.clans language plpgsql security definer set search_path = public as $$
declare
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_name text := trim(coalesce(p_name, ''));
  v_desc text := substr(trim(coalesce(p_description, '')), 1, 500);
  v_type text := lower(trim(coalesce(p_clan_type, 'sclan')));
  v_row public.clans%rowtype;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_slug !~ '^[a-z0-9-]{1,40}$' then raise exception 'invalid slug'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 60 then raise exception 'invalid name'; end if;
  if v_type not in ('hclan', 'sclan', 'bclan') then raise exception 'invalid clan type'; end if;
  insert into public.clans (slug, name, description, owner_id, clan_type, upkeep_grace_until, upkeep_last_accrued)
  values (v_slug, v_name, v_desc, auth.uid(), v_type, now() + interval '14 days', date_trunc('minute', now()))
  returning * into v_row;
  insert into public.clan_members (clan_id, user_id, role)
  values (v_row.id, auth.uid(), 'owner')
  on conflict (clan_id, user_id) do update set role = 'owner';
  insert into public.clan_wallets (clan_id, balance)
  values (v_row.id, 0)
  on conflict (clan_id) do nothing;
  insert into public.clan_badges (user_id, clan_id, badge)
  values (auth.uid(), v_row.id, 'founder')
  on conflict do nothing;
  -- Discord-style starter channels.
  insert into public.clan_channels (clan_id, slug, name, topic, kind, position, readonly, created_by)
  values
    (v_row.id, 'general', '#general', 'Hang out and talk.', 'chat', 0, false, auth.uid()),
    (v_row.id, 'announcements', '#announcements', 'Owner + mod announcements.', 'announce', 1, true, auth.uid()),
    (v_row.id, 'media', '#media', 'Images and clips.', 'media', 2, false, auth.uid())
  on conflict (clan_id, slug) do nothing;
  insert into public.clan_roles (clan_id, name, color, position)
  values
    (v_row.id, 'Owner', '#fbbf24', 100),
    (v_row.id, 'Mod', '#22d3ee', 50),
    (v_row.id, 'Member', '#94a3b8', 10)
  on conflict (clan_id, name) do nothing;
  insert into public.clan_upkeep_state (clan_id, pending_micro)
  values (v_row.id, 0)
  on conflict (clan_id) do nothing;
  return v_row;
exception when unique_violation then
  raise exception 'slug taken';
end; $$;
revoke all on function public.create_clan(text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_clan(text, text, text, text) to authenticated;

-- 6. Per-minute rate calculator (read-only) ------------------------------------
-- Mirrors lib/clan-costs.ts clanMinuteRate(). Granted widely: the cost card
-- is public transparency, not a secret.
create or replace function public.clan_minute_rate(p_clan_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_members integer;
  v_img_mb numeric(12, 4);
  v_db_kb numeric(12, 4);
  v_base numeric(12, 6) := 0.000030;
  v_per_member numeric(12, 6) := 0.000004;
  v_per_img_mb numeric(12, 6) := 0.000008;
  v_per_db_kb numeric(12, 6) := 0.0000008;
  v_server numeric(12, 6);
  v_members_c numeric(12, 6);
  v_img_c numeric(12, 6);
  v_db_c numeric(12, 6);
  v_total numeric(12, 6);
begin
  if not exists (select 1 from public.clans where id = p_clan_id) then
    raise exception 'clan not found';
  end if;
  select count(*)::integer into v_members from public.clan_members where clan_id = p_clan_id;
  select round(coalesce(sum(i.bytes), 0) / 1048576.0, 4) into v_img_mb
  from public.clan_images i
  where exists (
    select 1 from public.clan_posts p
    where p.clan_id = p_clan_id
      and p.image_url is not null
      and p.image_url like '%' || i.storage_path
  );
  -- Database bytes: live text stored for this clan (posts + comments + messages).
  select round((
    coalesce((select sum(octet_length(coalesce(p.title, '') || coalesce(p.body, ''))) from public.clan_posts p where p.clan_id = p_clan_id), 0) +
    coalesce((select sum(octet_length(coalesce(c.body, ''))) from public.clan_comments c
      join public.clan_posts p on p.id = c.post_id where p.clan_id = p_clan_id), 0) +
    coalesce((select sum(octet_length(coalesce(m.body, ''))) from public.clan_messages m where m.clan_id = p_clan_id), 0)
  ) / 1024.0, 4) into v_db_kb;
  v_server := v_base;
  v_members_c := coalesce(v_members, 0) * v_per_member;
  v_img_c := coalesce(v_img_mb, 0) * v_per_img_mb;
  v_db_c := coalesce(v_db_kb, 0) * v_per_db_kb;
  v_total := v_server + v_members_c + v_img_c + v_db_c;
  return jsonb_build_object(
    'per_minute_coins', v_total,
    'per_day_coins', round(v_total * 1440, 4),
    'members', coalesce(v_members, 0),
    'image_mb', coalesce(v_img_mb, 0),
    'db_kb', coalesce(v_db_kb, 0),
    'breakdown', jsonb_build_object(
      'server', v_server, 'members', v_members_c,
      'images', v_img_c, 'database', v_db_c
    )
  );
end; $$;
revoke all on function public.clan_minute_rate(uuid) from public, anon, authenticated;
grant execute on function public.clan_minute_rate(uuid) to anon, authenticated, service_role;

-- 7. Per-minute upkeep accrual (single clan) ------------------------------------
-- Bills whole elapsed minutes since upkeep_last_accrued (anchored to :00),
-- plus measured bandwidth + unbilled Luna usage. Sub-cent fractions park in
-- clan_upkeep_state.pending_micro. Grace-period clans accrue nothing but
-- advance their clock so no 14-day catch-up bill lands later.
create or replace function public.accrue_clan_minute_upkeep(p_clan_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_clan public.clans%rowtype;
  v_rate jsonb;
  v_per_min numeric(12, 6);
  v_minutes integer;
  v_server_part numeric(12, 6);
  v_bw_kb numeric(12, 4);
  v_bw_coins numeric(12, 6);
  v_ai_coins numeric(12, 6);
  v_pending numeric(12, 6);
  v_total numeric(12, 6);
  v_debit numeric(12, 2);
  v_wallet numeric(12, 2);
  v_status text;
  v_new_cursor timestamptz;
begin
  select * into v_clan from public.clans where id = p_clan_id;
  if not found then raise exception 'clan not found'; end if;
  if now() < v_clan.upkeep_grace_until then
    update public.clans set upkeep_last_accrued = date_trunc('minute', now())
    where id = p_clan_id;
    return jsonb_build_object('billed_minutes', 0, 'debit_coins', 0, 'status', v_clan.upkeep_status, 'grace', true);
  end if;
  v_minutes := floor(extract(epoch from (now() - v_clan.upkeep_last_accrued)) / 60.0)::integer;
  if v_minutes < 1 then
    return jsonb_build_object('billed_minutes', 0, 'debit_coins', 0, 'status', v_clan.upkeep_status, 'grace', false);
  end if;
  -- Cap catch-up billing at 7 days (downtime safety); the cursor still jumps
  -- to the current minute so a stale clock cannot bill twice.
  if v_minutes > 10080 then v_minutes := 10080; end if;
  v_rate := public.clan_minute_rate(p_clan_id);
  v_per_min := coalesce((v_rate ->> 'per_minute_coins')::numeric, 0);
  v_server_part := v_per_min * v_minutes;
  -- Measured bandwidth since the last cursor.
  select round(coalesce(sum(bytes_out), 0) / 1024.0, 4) into v_bw_kb
  from public.clan_transfer_log
  where clan_id = p_clan_id and created_at >= v_clan.upkeep_last_accrued;
  v_bw_coins := coalesce(v_bw_kb, 0) * 0.000002;
  -- Unbilled Luna checks (each logged at 0.015 coins).
  select round(coalesce(sum(coins), 0), 4) into v_ai_coins
  from public.clan_ai_usage
  where clan_id = p_clan_id and billed = false;
  insert into public.clan_upkeep_state (clan_id, pending_micro)
  values (p_clan_id, 0)
  on conflict (clan_id) do nothing;
  select pending_micro into v_pending from public.clan_upkeep_state where clan_id = p_clan_id;
  v_total := coalesce(v_server_part, 0) + coalesce(v_bw_coins, 0) + coalesce(v_ai_coins, 0) + coalesce(v_pending, 0);
  -- Debit whole centicentcoins only; keep the dust parked.
  v_debit := floor(v_total * 100) / 100.0;
  insert into public.clan_wallets (clan_id, balance)
  values (p_clan_id, 0)
  on conflict (clan_id) do nothing;
  select balance into v_wallet from public.clan_wallets where clan_id = p_clan_id;
  if v_debit > 0 then
    if v_wallet >= v_debit then
      update public.clan_wallets set balance = balance - v_debit, updated_at = now()
      where clan_id = p_clan_id;
      v_wallet := v_wallet - v_debit;
    else
      v_debit := v_wallet;
      update public.clan_wallets set balance = 0, updated_at = now()
      where clan_id = p_clan_id;
      v_wallet := 0;
    end if;
    insert into public.clan_cost_ledger (clan_id, kind, qty, gross, cut, provider, note)
    values (p_clan_id, 'upkeep', v_minutes, v_debit, 0, 0,
      substr('per-minute server upkeep ' || v_minutes::text || ' min (bw ' ||
        coalesce(v_bw_kb, 0)::text || 'KB, ai ' || coalesce(v_ai_coins, 0)::text || ' coins)', 1, 200));
  end if;
  update public.clan_ai_usage set billed = true
  where clan_id = p_clan_id and billed = false;
  update public.clan_upkeep_state
  set pending_micro = round(v_total - v_debit, 6), updated_at = now()
  where clan_id = p_clan_id;
  -- Runway status from the per-minute rate (healthy > 7d, low 1-7d, else delinquent).
  if v_wallet <= 0 then v_status := 'delinquent';
  elsif v_wallet < v_per_min * 1440 * 7 then v_status := 'low';
  else v_status := 'healthy'; end if;
  v_new_cursor := date_trunc('minute', v_clan.upkeep_last_accrued + (v_minutes || ' minutes')::interval);
  update public.clans
  set upkeep_status = v_status, upkeep_last_accrued = v_new_cursor
  where id = p_clan_id;
  return jsonb_build_object('billed_minutes', v_minutes, 'debit_coins', v_debit,
    'per_minute_coins', v_per_min, 'status', v_status, 'grace', false);
end; $$;
revoke all on function public.accrue_clan_minute_upkeep(uuid) from public, anon, authenticated;
grant execute on function public.accrue_clan_minute_upkeep(uuid) to authenticated, service_role;

-- 8. Cron fan-out: bill every clan due (service_role only) ----------------------
create or replace function public.accrue_all_clan_minute_upkeep()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_res jsonb;
  v_clans integer := 0;
  v_minutes integer := 0;
  v_coins numeric(12, 2) := 0;
begin
  for r in select id from public.clans loop
    begin
      v_res := public.accrue_clan_minute_upkeep(r.id);
      v_clans := v_clans + 1;
      v_minutes := v_minutes + coalesce((v_res ->> 'billed_minutes')::integer, 0);
      v_coins := v_coins + coalesce((v_res ->> 'debit_coins')::numeric, 0);
    exception when others then
      -- One sick clan never blocks the minute tick for everyone else.
      continue;
    end;
  end loop;
  return jsonb_build_object('clans', v_clans, 'minutes', v_minutes, 'debit_coins', round(v_coins, 2));
end; $$;
revoke all on function public.accrue_all_clan_minute_upkeep() from public, anon, authenticated;
grant execute on function public.accrue_all_clan_minute_upkeep() to service_role;

-- 9. Member donations (any member, 1:1, no cut) ---------------------------------
-- The creator pays by funding the wallet; members chip in with donations.
create or replace function public.donate_clan_upkeep(p_clan_id uuid, p_coins numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_amount numeric(12, 2) := round(coalesce(p_coins, 0), 2);
  v_bal numeric(12, 2);
  v_total numeric(12, 2);
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_amount < 0.01 or v_amount > 100000 then raise exception 'amount must be 0.01..100000'; end if;
  if not exists (select 1 from public.clans where id = p_clan_id) then
    raise exception 'clan not found';
  end if;
  if not exists (
    select 1 from public.clan_members where clan_id = p_clan_id and user_id = auth.uid()
  ) then
    raise exception 'join the clan first';
  end if;
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_amount then
    raise exception 'insufficient balance: need % coins, have %', v_amount, v_bal;
  end if;
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_amount, substr('Clan donation', 1, 120));
  insert into public.clan_wallets (clan_id, balance)
  values (p_clan_id, v_amount)
  on conflict (clan_id) do update set
    balance = public.clan_wallets.balance + excluded.balance,
    updated_at = now();
  insert into public.clan_cost_ledger (clan_id, kind, qty, gross, cut, provider, note)
  values (p_clan_id, 'donation', 1, v_amount, 0, v_amount, substr('member donation', 1, 200));
  insert into public.clan_xp_ledger (user_id, clan_id, xp, reason)
  values (auth.uid(), p_clan_id, 20, 'upkeep-funded');
  select coalesce(sum(gross), 0)::numeric(12, 2) into v_total
  from public.clan_cost_ledger where clan_id = p_clan_id and kind = 'donation';
  if v_total >= 100 then
    insert into public.clan_badges (user_id, clan_id, badge)
    values (auth.uid(), p_clan_id, 'patron')
    on conflict do nothing;
  end if;
  return jsonb_build_object('donated_coins', v_amount);
end; $$;
revoke all on function public.donate_clan_upkeep(uuid, numeric) from public, anon, authenticated;
grant execute on function public.donate_clan_upkeep(uuid, numeric) to authenticated;

-- 10. Metering loggers ------------------------------------------------------------
-- Luna AI usage: 0.015 coins per moderation check (GPT 5.6 Luna proxy cost).
create or replace function public.log_clan_ai_usage(
  p_clan_id uuid, p_kind text default 'luna-check', p_qty numeric default 1
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_kind text := lower(trim(coalesce(p_kind, 'luna-check')));
  v_qty numeric(12, 2) := greatest(0, least(100000, coalesce(p_qty, 1)));
  v_coins numeric(12, 4);
begin
  if v_kind not in ('luna-check', 'luna-image') then raise exception 'invalid kind'; end if;
  if not exists (select 1 from public.clans where id = p_clan_id) then
    raise exception 'clan not found';
  end if;
  v_coins := round(v_qty * 0.015, 4);
  insert into public.clan_ai_usage (clan_id, kind, qty, coins)
  values (p_clan_id, v_kind, v_qty, v_coins);
  return jsonb_build_object('coins', v_coins, 'qty', v_qty);
end; $$;
revoke all on function public.log_clan_ai_usage(uuid, text, numeric) from public, anon, authenticated;
grant execute on function public.log_clan_ai_usage(uuid, text, numeric) to authenticated, service_role;

-- Bandwidth: measured bytes served per clan (page views, images, api).
create or replace function public.log_clan_transfer(
  p_clan_id uuid, p_bytes integer, p_kind text default 'page-view'
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_kind text := lower(trim(coalesce(p_kind, 'page-view')));
begin
  if v_kind not in ('page-view', 'image', 'api') then raise exception 'invalid kind'; end if;
  if not exists (select 1 from public.clans where id = p_clan_id) then
    raise exception 'clan not found';
  end if;
  insert into public.clan_transfer_log (clan_id, kind, bytes_out)
  values (p_clan_id, v_kind, greatest(0, least(104857600, coalesce(p_bytes, 0))));
end; $$;
revoke all on function public.log_clan_transfer(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.log_clan_transfer(uuid, integer, text) to anon, authenticated, service_role;

-- 11. Message posting fee twin (messages join posts/comments) ----------------------
-- Fee = max(0.01, per-KB + image surcharge), split 25% platform / 75% wallet.
create or replace function public.meter_clan_posting_fee(
  p_clan_id uuid, p_kind text, p_bytes integer, p_has_image boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_kind text := lower(trim(coalesce(p_kind, '')));
  v_bytes integer := greatest(0, coalesce(p_bytes, 0));
  v_fee numeric(12, 2);
  v_cut numeric(12, 2);
  v_provider numeric(12, 2);
  v_bal numeric(12, 2);
  v_slug text;
  v_status text;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_kind not in ('post', 'comment', 'message') then raise exception 'invalid kind'; end if;
  select slug, upkeep_status into v_slug, v_status
    from public.clans where id = p_clan_id;
  if v_slug is null then raise exception 'clan not found'; end if;
  if v_status = 'delinquent' then raise exception 'clan upkeep delinquent'; end if;
  if not exists (
    select 1 from public.clan_members where clan_id = p_clan_id and user_id = auth.uid()
  ) then
    raise exception 'join the clan first';
  end if;
  v_fee := greatest(0.01, round((ceil(v_bytes / 1024.0) * 0.01)::numeric, 2)
    + case when coalesce(p_has_image, false) then 0.05 else 0 end);
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_fee then
    raise exception 'insufficient balance: need % coins, have %', v_fee, v_bal;
  end if;
  v_cut := round(v_fee * 25 / 100.0, 2);
  v_provider := v_fee - v_cut;
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_fee, substr('Clan ' || v_kind || ' fee: ' || v_slug from 1 for 120));
  insert into public.clan_wallets (clan_id, balance)
  values (p_clan_id, v_provider)
  on conflict (clan_id) do update set
    balance = public.clan_wallets.balance + excluded.balance,
    updated_at = now();
  insert into public.clan_cost_ledger (clan_id, kind, qty, gross, cut, provider, note)
  values (p_clan_id, v_kind || '-fee', 1, v_fee, v_cut, v_provider, substr('server cost fee', 1, 200));
  return jsonb_build_object('fee_coins', v_fee, 'cut_coins', v_cut, 'wallet_coins', v_provider);
end; $$;
revoke all on function public.meter_clan_posting_fee(uuid, text, integer, boolean) from public, anon, authenticated;
grant execute on function public.meter_clan_posting_fee(uuid, text, integer, boolean) to authenticated;

create or replace function public.meter_clan_posting_fee_for(
  p_user_id uuid, p_clan_id uuid, p_kind text, p_bytes integer, p_has_image boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_kind text := lower(trim(coalesce(p_kind, '')));
  v_bytes integer := greatest(0, coalesce(p_bytes, 0));
  v_fee numeric(12, 2);
  v_cut numeric(12, 2);
  v_provider numeric(12, 2);
  v_bal numeric(12, 2);
  v_slug text;
  v_status text;
begin
  if p_user_id is null then raise exception 'login required'; end if;
  if v_kind not in ('post', 'comment', 'message') then raise exception 'invalid kind'; end if;
  select slug, upkeep_status into v_slug, v_status
    from public.clans where id = p_clan_id;
  if v_slug is null then raise exception 'clan not found'; end if;
  if v_status = 'delinquent' then raise exception 'clan upkeep delinquent'; end if;
  if not exists (
    select 1 from public.clan_members where clan_id = p_clan_id and user_id = p_user_id
  ) then
    raise exception 'join the clan first';
  end if;
  v_fee := greatest(0.01, round((ceil(v_bytes / 1024.0) * 0.01)::numeric, 2)
    + case when coalesce(p_has_image, false) then 0.05 else 0 end);
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
  from public.coin_ledger where user_id = p_user_id;
  if v_bal < v_fee then
    raise exception 'insufficient balance: need % coins, have %', v_fee, v_bal;
  end if;
  v_cut := round(v_fee * 25 / 100.0, 2);
  v_provider := v_fee - v_cut;
  insert into public.coin_ledger (user_id, delta, reason)
  values (p_user_id, -v_fee, substr('Clan ' || v_kind || ' fee: ' || v_slug from 1 for 120));
  insert into public.clan_wallets (clan_id, balance)
  values (p_clan_id, v_provider)
  on conflict (clan_id) do update set
    balance = public.clan_wallets.balance + excluded.balance,
    updated_at = now();
  insert into public.clan_cost_ledger (clan_id, kind, qty, gross, cut, provider, note)
  values (p_clan_id, v_kind || '-fee', 1, v_fee, v_cut, v_provider, substr('server cost fee', 1, 200));
  return jsonb_build_object('fee_coins', v_fee, 'cut_coins', v_cut, 'wallet_coins', v_provider);
end; $$;
revoke all on function public.meter_clan_posting_fee_for(uuid, uuid, text, integer, boolean) from public, anon, authenticated;
grant execute on function public.meter_clan_posting_fee_for(uuid, uuid, text, integer, boolean) to service_role;

-- 12. Social RPCs -------------------------------------------------------------------

-- Moderator check shared by social RPCs (owner/mod member role, or a named
-- Admin/Mod custom role).
create or replace function public.clan_is_moderator(p_clan_id uuid, p_user_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.clans where id = p_clan_id and owner_id = p_user_id
  ) then return true; end if;
  if exists (
    select 1 from public.clan_members
    where clan_id = p_clan_id and user_id = p_user_id and role in ('owner', 'mod')
  ) then return true; end if;
  if exists (
    select 1 from public.clan_member_roles mr
    join public.clan_roles r on r.id = mr.role_id
    where mr.clan_id = p_clan_id and mr.user_id = p_user_id
      and lower(r.name) in ('owner', 'admin', 'mod', 'moderator')
  ) then return true; end if;
  return false;
end; $$;
revoke all on function public.clan_is_moderator(uuid, uuid) from public, anon, authenticated;
grant execute on function public.clan_is_moderator(uuid, uuid) to authenticated, service_role;

-- Create a text channel (owner/mod only).
create or replace function public.create_clan_channel(
  p_clan_id uuid, p_slug text, p_name text, p_topic text default '', p_kind text default 'chat'
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_name text := substr(trim(coalesce(p_name, '')), 1, 40);
  v_topic text := substr(trim(coalesce(p_topic, '')), 1, 200);
  v_kind text := lower(trim(coalesce(p_kind, 'chat')));
  v_pos integer;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_slug !~ '^[a-z0-9-]{1,30}$' then raise exception 'invalid slug'; end if;
  if char_length(v_name) < 1 then raise exception 'name required'; end if;
  if v_kind not in ('chat', 'forum', 'announce', 'events', 'media') then raise exception 'invalid kind'; end if;
  if not exists (select 1 from public.clans where id = p_clan_id) then raise exception 'clan not found'; end if;
  if not public.clan_is_moderator(p_clan_id, auth.uid()) then raise exception 'not a moderator'; end if;
  select coalesce(max(position), -1) + 1 into v_pos from public.clan_channels where clan_id = p_clan_id;
  insert into public.clan_channels (clan_id, slug, name, topic, kind, position, created_by)
  values (p_clan_id, v_slug, v_name, v_topic, v_kind, v_pos, auth.uid())
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'slug', v_slug);
exception when unique_violation then
  raise exception 'channel slug taken';
end; $$;
revoke all on function public.create_clan_channel(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_clan_channel(uuid, text, text, text, text) to authenticated;

-- Post a chat message (members; readonly channels are mod-only).
create or replace function public.post_clan_message(
  p_channel_id uuid, p_body text, p_image_url text default null,
  p_reply_to uuid default null, p_status text default 'visible'
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_body text := trim(coalesce(p_body, ''));
  v_img text := nullif(trim(coalesce(p_image_url, '')), '');
  v_status text := coalesce(nullif(trim(coalesce(p_status, '')), ''), 'visible');
  v_chan public.clan_channels%rowtype;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select * into v_chan from public.clan_channels where id = p_channel_id;
  if not found then raise exception 'channel not found'; end if;
  if not exists (
    select 1 from public.clan_members where clan_id = v_chan.clan_id and user_id = auth.uid()
  ) then
    raise exception 'join the clan first';
  end if;
  if v_chan.readonly and not public.clan_is_moderator(v_chan.clan_id, auth.uid()) then
    raise exception 'read-only channel';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then raise exception 'invalid body'; end if;
  if v_status not in ('visible', 'pending') then v_status := 'visible'; end if;
  if p_reply_to is not null and not exists (
    select 1 from public.clan_messages where id = p_reply_to and channel_id = p_channel_id
  ) then
    raise exception 'reply target not found';
  end if;
  insert into public.clan_messages (channel_id, clan_id, author_id, body, image_url, reply_to, status)
  values (p_channel_id, v_chan.clan_id, auth.uid(), v_body, v_img, p_reply_to, v_status)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'status', v_status);
end; $$;
revoke all on function public.post_clan_message(uuid, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.post_clan_message(uuid, text, text, uuid, text) to authenticated;

-- Toggle an emoji reaction (members).
create or replace function public.toggle_clan_reaction(p_message_id uuid, p_emoji text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_emoji text := trim(coalesce(p_emoji, ''));
  v_clan uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if char_length(v_emoji) < 1 or char_length(v_emoji) > 32 then raise exception 'invalid emoji'; end if;
  select clan_id into v_clan from public.clan_messages where id = p_message_id;
  if v_clan is null then raise exception 'message not found'; end if;
  if not exists (
    select 1 from public.clan_members where clan_id = v_clan and user_id = auth.uid()
  ) then
    raise exception 'join the clan first';
  end if;
  if exists (
    select 1 from public.clan_message_reactions
    where message_id = p_message_id and user_id = auth.uid() and emoji = v_emoji
  ) then
    delete from public.clan_message_reactions
    where message_id = p_message_id and user_id = auth.uid() and emoji = v_emoji;
    return jsonb_build_object('added', false);
  end if;
  insert into public.clan_message_reactions (message_id, user_id, emoji)
  values (p_message_id, auth.uid(), v_emoji);
  return jsonb_build_object('added', true);
end; $$;
revoke all on function public.toggle_clan_reaction(uuid, text) from public, anon, authenticated;
grant execute on function public.toggle_clan_reaction(uuid, text) to authenticated;

-- Pin/unpin a message (owner/mod).
create or replace function public.set_clan_message_pin(p_message_id uuid, p_pinned boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_clan uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select clan_id into v_clan from public.clan_messages where id = p_message_id;
  if v_clan is null then raise exception 'message not found'; end if;
  if not public.clan_is_moderator(v_clan, auth.uid()) then raise exception 'not a moderator'; end if;
  update public.clan_messages set pinned = coalesce(p_pinned, false) where id = p_message_id;
end; $$;
revoke all on function public.set_clan_message_pin(uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_clan_message_pin(uuid, boolean) to authenticated;

-- Edit own message (author) or any (mod). Editing bumps edited_at.
create or replace function public.edit_clan_message(p_message_id uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_body text := trim(coalesce(p_body, ''));
  v_row public.clan_messages%rowtype;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select * into v_row from public.clan_messages where id = p_message_id;
  if not found then raise exception 'message not found'; end if;
  if v_row.author_id <> auth.uid() and not public.clan_is_moderator(v_row.clan_id, auth.uid()) then
    raise exception 'not the author';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then raise exception 'invalid body'; end if;
  update public.clan_messages set body = v_body, edited_at = now() where id = p_message_id;
end; $$;
revoke all on function public.edit_clan_message(uuid, text) from public, anon, authenticated;
grant execute on function public.edit_clan_message(uuid, text) to authenticated;

-- Delete (hide) a message: author hides own, mods hide any. Rows preserved.
create or replace function public.delete_clan_message(p_message_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_row public.clan_messages%rowtype;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select * into v_row from public.clan_messages where id = p_message_id;
  if not found then raise exception 'message not found'; end if;
  if v_row.author_id <> auth.uid() and not public.clan_is_moderator(v_row.clan_id, auth.uid()) then
    raise exception 'not the author';
  end if;
  update public.clan_messages set status = 'hidden' where id = p_message_id;
end; $$;
revoke all on function public.delete_clan_message(uuid) from public, anon, authenticated;
grant execute on function public.delete_clan_message(uuid) to authenticated;

-- Schedule an event (owner/mod).
create or replace function public.create_clan_event(
  p_clan_id uuid, p_title text, p_description text default '',
  p_starts_at timestamptz default null, p_channel_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_title text := substr(trim(coalesce(p_title, '')), 1, 120);
  v_desc text := substr(trim(coalesce(p_description, '')), 1, 1000);
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if char_length(v_title) < 1 then raise exception 'title required'; end if;
  if p_starts_at is null or p_starts_at <= now() then raise exception 'starts_at must be in the future'; end if;
  if not exists (select 1 from public.clans where id = p_clan_id) then raise exception 'clan not found'; end if;
  if not public.clan_is_moderator(p_clan_id, auth.uid()) then raise exception 'not a moderator'; end if;
  if p_channel_id is not null and not exists (
    select 1 from public.clan_channels where id = p_channel_id and clan_id = p_clan_id
  ) then
    raise exception 'channel not found';
  end if;
  insert into public.clan_events (clan_id, channel_id, title, description, starts_at, created_by)
  values (p_clan_id, p_channel_id, v_title, v_desc, p_starts_at, auth.uid())
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end; $$;
revoke all on function public.create_clan_event(uuid, text, text, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.create_clan_event(uuid, text, text, timestamptz, uuid) to authenticated;

-- Custom roles (owner/mod manage).
create or replace function public.create_clan_role(
  p_clan_id uuid, p_name text, p_color text default '#22d3ee'
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_name text := substr(trim(coalesce(p_name, '')), 1, 24);
  v_color text := trim(coalesce(p_color, '#22d3ee'));
  v_pos integer;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if char_length(v_name) < 1 then raise exception 'name required'; end if;
  if v_color !~ '^#[0-9a-fA-F]{6}$' then raise exception 'invalid color'; end if;
  if not exists (select 1 from public.clans where id = p_clan_id) then raise exception 'clan not found'; end if;
  if not public.clan_is_moderator(p_clan_id, auth.uid()) then raise exception 'not a moderator'; end if;
  select coalesce(max(position), 9) + 1 into v_pos from public.clan_roles where clan_id = p_clan_id;
  insert into public.clan_roles (clan_id, name, color, position)
  values (p_clan_id, v_name, v_color, v_pos)
  returning id into v_id;
  return jsonb_build_object('id', v_id);
exception when unique_violation then
  raise exception 'role exists';
end; $$;
revoke all on function public.create_clan_role(uuid, text, text) from public, anon, authenticated;
grant execute on function public.create_clan_role(uuid, text, text) to authenticated;

create or replace function public.assign_clan_role(p_clan_id uuid, p_user_id uuid, p_role_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not exists (select 1 from public.clans where id = p_clan_id) then raise exception 'clan not found'; end if;
  if not public.clan_is_moderator(p_clan_id, auth.uid()) then raise exception 'not a moderator'; end if;
  if not exists (
    select 1 from public.clan_members where clan_id = p_clan_id and user_id = p_user_id
  ) then
    raise exception 'not a member';
  end if;
  if not exists (
    select 1 from public.clan_roles where id = p_role_id and clan_id = p_clan_id
  ) then
    raise exception 'role not found';
  end if;
  insert into public.clan_member_roles (clan_id, user_id, role_id, granted_by)
  values (p_clan_id, p_user_id, p_role_id, auth.uid())
  on conflict (clan_id, user_id, role_id) do nothing;
end; $$;
revoke all on function public.assign_clan_role(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.assign_clan_role(uuid, uuid, uuid) to authenticated;

-- Promote/demote the built-in member role (owner only; ownership stays put).
create or replace function public.set_clan_member_role(p_clan_id uuid, p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_role text := lower(trim(coalesce(p_role, '')));
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if v_role not in ('mod', 'member') then raise exception 'role must be mod or member'; end if;
  if not exists (
    select 1 from public.clans where id = p_clan_id and owner_id = auth.uid()
  ) then
    raise exception 'not the owner';
  end if;
  if p_user_id = auth.uid() then raise exception 'ownership cannot be demoted'; end if;
  update public.clan_members set role = v_role
  where clan_id = p_clan_id and user_id = p_user_id;
  if not found then raise exception 'not a member'; end if;
end; $$;
revoke all on function public.set_clan_member_role(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.set_clan_member_role(uuid, uuid, text) to authenticated;

-- Read receipt (members).
create or replace function public.mark_channel_read(p_channel_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_clan uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select clan_id into v_clan from public.clan_channels where id = p_channel_id;
  if v_clan is null then raise exception 'channel not found'; end if;
  if not exists (
    select 1 from public.clan_members where clan_id = v_clan and user_id = auth.uid()
  ) then
    raise exception 'join the clan first';
  end if;
  insert into public.clan_channel_reads (channel_id, user_id, last_read_at)
  values (p_channel_id, auth.uid(), now())
  on conflict (channel_id, user_id) do update set last_read_at = now();
end; $$;
revoke all on function public.mark_channel_read(uuid) from public, anon, authenticated;
grant execute on function public.mark_channel_read(uuid) to authenticated;
