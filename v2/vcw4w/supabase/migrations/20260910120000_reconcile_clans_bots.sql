-- ============================================================================
-- Reconcile clans (080000) vs bot-platform (090000) + marketplace hardening.
-- Fully rerunnable: IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS guards.
--
-- Background: 080000 creates the clan tables first (owner_id, status
-- visible/pending/hidden, reports with uuid target + csam/other). 090000 then
-- contradicts it (created_by policies that cannot apply, status
-- 'published', text report targets). This migration is the tiebreaker:
--   - 080000 vocabulary wins for posts (visible/pending/hidden); legacy
--     'published' rows map to 'visible'. Bot routes were updated to match.
--   - clan_reports additionally accepts bot vocabulary (target 'clan' and
--     triage categories). The CSAM auto-quarantine in file_report() is
--     untouched: only category='csam' hides, content is still preserved.
--   - Bot identity/key tables + RPCs are (re)created idempotently, since
--     090000 cannot have applied cleanly on top of 080000.
--   - 090000's permissive direct-write client policies are dropped (they
--     allowed authors to rewrite moderation status and bypass membership);
--     all human writes stay on the 080000 SECURITY DEFINER RPCs.
--   - book_listing takes a per-renter advisory lock (double-book race) and
--     heartbeat_usage can never meter more gross than the booking escrow.
-- ============================================================================

-- 1. Drop 090000's permissive direct-write policies (no-ops if never applied).
drop policy if exists clans_insert_own on public.clans;
drop policy if exists clans_update_own on public.clans;
drop policy if exists clan_members_self_join on public.clan_members;
drop policy if exists clan_members_self_leave on public.clan_members;
drop policy if exists clan_posts_insert_own on public.clan_posts;
drop policy if exists clan_posts_update_own on public.clan_posts;
drop policy if exists clan_comments_insert_own on public.clan_comments;
drop policy if exists clan_reports_insert_own on public.clan_reports;
drop policy if exists clan_reports_select_own on public.clan_reports;

-- 2. Unify post status on the 080000 vocabulary.
update public.clan_posts set status = 'visible' where status = 'published';
alter table public.clan_posts drop constraint if exists clan_posts_status_check;
alter table public.clan_posts
  add constraint clan_posts_status_check check (status in ('visible', 'pending', 'hidden'));
alter table public.clan_comments drop constraint if exists clan_comments_status_check;
alter table public.clan_comments
  add constraint clan_comments_status_check check (status in ('visible', 'pending', 'hidden'));

-- 3. clan_reports: accept bot triage vocabulary alongside the 080000 set.
--    reporter stays nullable (anonymous reports allowed, as in file_report).
alter table public.clan_reports alter column reporter_id drop not null;
alter table public.clan_reports drop constraint if exists clan_reports_target_type_check;
alter table public.clan_reports
  add constraint clan_reports_target_type_check
  check (target_type in ('post', 'comment', 'image', 'clan'));
alter table public.clan_reports drop constraint if exists clan_reports_category_check;
alter table public.clan_reports
  add constraint clan_reports_category_check
  check (category in ('csam', 'other', 'spam', 'harassment', 'nsfw', 'cheating', 'copyright'));

-- 4. Bot identity + API keys (idempotent recreate; 090000 could not apply
--    these on top of 080000). RLS enabled, NO client policies: service_role
--    server routes + the RPCs below are the only writers/readers.
create table if not exists public.bot_identities (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,24}$'),
  human_id text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists public.bot_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  key_hash char(64) not null unique,
  prefix varchar(16) not null,
  label varchar(40) not null default '',
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked boolean not null default false
);
create index if not exists idx_bot_api_keys_prefix on public.bot_api_keys (prefix);
create index if not exists idx_bot_api_keys_user on public.bot_api_keys (user_id);
alter table public.bot_identities enable row level security;
alter table public.bot_api_keys enable row level security;
revoke all on public.bot_identities from anon, authenticated;
revoke all on public.bot_api_keys from anon, authenticated;

create or replace function public.ensure_bot_identity()
returns table(username text, human_id text)
language plpgsql security definer set search_path = public as $$
declare existing record; hid text;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select b.username, b.human_id into existing
    from public.bot_identities b where b.user_id = auth.uid();
  if found then username := existing.username; human_id := existing.human_id; return next; return; end if;
  loop hid := 'h_' || substr(encode(gen_random_bytes(6), 'hex'), 1, 12);
    begin insert into public.bot_identities (user_id, human_id) values (auth.uid(), hid); exit;
    exception when unique_violation then
      select b.username, b.human_id into existing
        from public.bot_identities b where b.user_id = auth.uid();
      if found then username := existing.username; human_id := existing.human_id; return next; return; end if;
    end;
  end loop;
  username := null; human_id := hid; return next;
end; $$;
revoke all on function public.ensure_bot_identity() from public, anon, authenticated;
grant execute on function public.ensure_bot_identity() to authenticated;

create or replace function public.set_bot_username(p_username text)
returns table(username text, human_id text)
language plpgsql security definer set search_path = public as $$
declare hid text; attempt integer := 0;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if coalesce(p_username, '') !~ '^[a-z0-9_]{3,24}$' then raise exception 'invalid username'; end if;
  loop begin
      insert into public.bot_identities (user_id, human_id)
      values (auth.uid(), 'h_' || substr(encode(gen_random_bytes(6), 'hex'), 1, 12))
      on conflict (user_id) do nothing; exit;
    exception when unique_violation then attempt := attempt + 1;
      if attempt >= 5 then raise; end if;
    end;
  end loop;
  update public.bot_identities set username = p_username
    where user_id = auth.uid() and username is null;
  if not found then raise exception 'username already set'; end if;
  return query select b.username, b.human_id
    from public.bot_identities b where b.user_id = auth.uid();
exception when unique_violation then raise exception 'username taken';
end; $$;
revoke all on function public.set_bot_username(text) from public, anon, authenticated;
grant execute on function public.set_bot_username(text) to authenticated;

create or replace function public.issue_bot_key(p_label text, p_key_hash text, p_prefix text)
returns table(key_id uuid, prefix text, label text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare clean_label text := trim(coalesce(p_label, ''));
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if char_length(clean_label) < 1 or char_length(clean_label) > 40 then raise exception 'invalid label'; end if;
  if coalesce(p_key_hash, '') !~ '^[0-9a-f]{64}$' then raise exception 'invalid key hash'; end if;
  if p_prefix is null or char_length(p_prefix) > 16 then raise exception 'invalid prefix'; end if;
  insert into public.bot_identities (user_id, human_id)
  values (auth.uid(), 'h_' || substr(encode(gen_random_bytes(6), 'hex'), 1, 12))
  on conflict (user_id) do nothing;
  return query insert into public.bot_api_keys (user_id, key_hash, prefix, label)
    values (auth.uid(), p_key_hash, p_prefix, clean_label)
    returning public.bot_api_keys.id,
              public.bot_api_keys.prefix::text,
              public.bot_api_keys.label::text,
              public.bot_api_keys.created_at;
end; $$;
revoke all on function public.issue_bot_key(text, text, text) from public, anon, authenticated;
grant execute on function public.issue_bot_key(text, text, text) to authenticated;

create or replace function public.revoke_bot_key(p_key_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  update public.bot_api_keys set revoked = true
    where id = p_key_id and user_id = auth.uid() and revoked = false;
  return found;
end; $$;
revoke all on function public.revoke_bot_key(uuid) from public, anon, authenticated;
grant execute on function public.revoke_bot_key(uuid) to authenticated;

create or replace function public.touch_bot_key(p_hash text)
returns void language plpgsql security definer set search_path = public as $$
begin update public.bot_api_keys set last_used_at = now() where key_hash = p_hash; end; $$;
revoke all on function public.touch_bot_key(text) from public, anon, authenticated;
grant execute on function public.touch_bot_key(text) to service_role;

-- 5. book_listing: per-renter advisory lock closes the concurrent double-
--    escrow race (two bookings passing the balance check simultaneously).
create or replace function public.book_listing(p_listing uuid, p_hours integer)
returns public.rental_bookings language plpgsql security definer set search_path = public as $$
declare v_listing public.agent_listings; v_gross integer; v_balance integer; v_booking public.rental_bookings;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  perform pg_advisory_xact_lock(hashtext('book:' || auth.uid()::text));
  if p_hours is null or p_hours < 1 or p_hours > 720 then raise exception 'hours must be 1..720'; end if;
  select * into v_listing from public.agent_listings where id = p_listing;
  if not found then raise exception 'listing not found'; end if;
  if v_listing.status <> 'available' then raise exception 'listing is not available'; end if;
  if v_listing.owner_id = auth.uid() then raise exception 'cannot book your own listing'; end if;
  v_gross := v_listing.price_cents_per_hour * p_hours;
  select coalesce(sum(delta), 0)::integer into v_balance
  from public.coin_ledger where user_id = auth.uid();
  if v_balance < v_gross then raise exception 'insufficient balance'; end if;
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_gross, substring('Compute escrow: ' || v_listing.name from 1 for 120));
  insert into public.rental_bookings (listing_id, renter_id, escrow_coins)
  values (p_listing, auth.uid(), v_gross)
  returning * into v_booking;
  return v_booking;
end; $$;
revoke all on function public.book_listing(uuid, integer) from anon, authenticated;
grant execute on function public.book_listing(uuid, integer) to authenticated;

-- 6. heartbeat_usage: metered gross can never exceed the booking escrow, so
--    neither side can inflate provider payouts past what the renter funded.
create or replace function public.heartbeat_usage(p_booking uuid, p_seconds integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_booking public.rental_bookings; v_owner uuid; v_price integer;
        v_gross integer; v_cut integer; v_provider integer; v_metered integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_seconds is null or p_seconds < 1 or p_seconds > 86400 then raise exception 'seconds must be 1..86400'; end if;
  select b.* into v_booking from public.rental_bookings b where b.id = p_booking;
  if not found then raise exception 'booking not found'; end if;
  select l.owner_id, l.price_cents_per_hour into v_owner, v_price
  from public.agent_listings l where l.id = v_booking.listing_id;
  if v_booking.renter_id <> auth.uid() and coalesce(v_owner, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid() then
    raise exception 'not authorized'; end if;
  if v_booking.status <> 'active' then raise exception 'booking is not active'; end if;
  v_gross := round(v_price * p_seconds / 3600.0)::integer;
  select coalesce(sum(gross_cents), 0)::integer into v_metered
  from public.compute_usage where booking_id = p_booking;
  if v_metered + v_gross > v_booking.escrow_coins then raise exception 'usage exceeds escrow'; end if;
  v_cut := round(v_gross * 25 / 100.0)::integer;
  v_provider := v_gross - v_cut;
  insert into public.compute_usage (booking_id, seconds, gross_cents, cut_cents, provider_cents, source)
  values (p_booking, p_seconds, v_gross, v_cut, v_provider, 'heartbeat');
  return jsonb_build_object('gross_cents', v_gross, 'cut_cents', v_cut, 'provider_cents', v_provider);
end; $$;
revoke all on function public.heartbeat_usage(uuid, integer) from anon, authenticated;
grant execute on function public.heartbeat_usage(uuid, integer) to authenticated;
