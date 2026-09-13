-- ============================================================================
-- SEC economy hardening (DS-SEC-ECON-01, sec-econ).
--
-- Append-only: this file only CREATE OR REPLACE's existing functions. It
-- never edits shipped migrations and never touches coin tables directly
-- (all writes stay inside the existing SECURITY DEFINER RPCs).
--
-- WHAT THIS FILE FIXES (7-lane security audit, economy HIGHs):
--   1. DEV daily-cap bypass (TOCTOU): charge_dev_action() checked balance
--      but never the per-game per-day cap (DEV_GAME_DAILY_CAP_COINS = 1000
--      in lib/economy.ts; the /api/dev-charges route checks it pre-RPC in
--      a SELECT-then-call window). Two parallel calls both passed and both
--      charged. Now: the RPC takes public.coin_spend_lock(auth.uid()) FIRST
--      (serializes concurrent charges for the spender, same namespace as
--      the 20261018 ledger-pairing hardening), then enforces
--      SUM(today) + v_amount <= 1000 inside the lock. The second of two
--      parallel charges at the cap fails closed with 'daily cap exceeded'.
--      Idempotent retries still return the original receipt (cap checked
--      only for NEW charges; the duplicate row already counts in SUM).
--   2. Cosmetic race: purchase_cosmetic_item() had no spend lock, so two
--      parallel buys could both pass the balance check and overdraw.
--      Now takes coin_spend_lock(auth.uid()) before the balance read.
--   3. Reaction injection: toggle_clan_reaction() accepted any <=32-char
--      string as "emoji" (stored + rendered). Now allowlisted to 16 known
--      emoji; anything else raises 'invalid emoji' (same error string, so
--      the route mapping is unchanged). Mirrored client-side in
--      app/api/clans/[slug]/messages/[id]/route.ts.
--   4. Ghost zero-rate contracts: ghost_create_contract() accepted
--      rate = 0 (free-work lock-in rows + divide-by-zero-adjacent invoice
--      math). Now requires rate > 0 ('invalid rate' string unchanged).
--      Mirrored client-side in app/api/ghost/contracts/route.ts.
--
-- Signatures, grants, and error strings are unchanged everywhere except
-- the two tightened guards ('daily cap exceeded' is new; 'invalid emoji'
-- and 'invalid rate' already existed), so existing verify-*.mjs gates keep
-- passing. Fully rerunnable (OR REPLACE / DROP-free function patches).
-- ============================================================================

-- 1. Own-once cosmetic purchase + spend lock ---------------------------------
-- Identical to 20260921000000_shop_cosmetics_dev_charges.sql except the
-- added perform public.coin_spend_lock(auth.uid()) line.
create or replace function public.purchase_cosmetic_item(
  p_game text,
  p_item text,
  p_price numeric
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_game text; v_item text; v_price numeric(12, 2); v_bal numeric(12, 2); v_fee record;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  perform public.coin_spend_lock(auth.uid());
  v_game := lower(trim(coalesce(p_game, '')));
  if v_game !~ '^[a-z0-9-]{1,64}$' then raise exception 'invalid game'; end if;
  v_item := lower(trim(coalesce(p_item, '')));
  if v_item !~ '^[a-z0-9-]{1,64}$' then raise exception 'invalid item'; end if;
  if p_price is null or p_price <= 0 or p_price > 10000 then raise exception 'invalid price'; end if;
  v_price := round(p_price, 2);
  if exists (select 1 from public.user_cosmetics where user_id = auth.uid() and item_id = v_item) then
    raise exception 'already owned';
  end if;
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_price then
    raise exception 'insufficient balance: need % coins, have %', v_price, v_bal;
  end if;
  select * into v_fee from public.game_ai_compute_split_numeric(v_price);
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_price, substr('Cosmetic (' || v_game || '/' || v_item || ')', 1, 120));
  insert into public.user_cosmetics (user_id, item_id, game_slug, price_coins)
  values (auth.uid(), v_item, v_game, v_price);
  return jsonb_build_object(
    'item', v_item, 'gross_coins', v_price,
    'cut_coins', v_fee.cut, 'provider_coins', v_fee.provider,
    'gross_centicentcoins', round(v_price * 100)::integer
  );
end; $$;
revoke all on function public.purchase_cosmetic_item(text, text, numeric) from public, anon, authenticated;
grant execute on function public.purchase_cosmetic_item(text, text, numeric) to authenticated;

-- 2. Guarded dev charge + spend lock + server-side daily cap ------------------
-- Identical to 20260921000000 except the lock line and the daily-cap block.
-- Cap mirrors DEV_GAME_DAILY_CAP_COINS (1000) in lib/economy.ts; the route
-- pre-check stays as UX, this is the authoritative enforcement.
create or replace function public.charge_dev_action(
  p_game text,
  p_category text,
  p_amount numeric,
  p_label text,
  p_idem text,
  p_region text default 'XX',
  p_profile text default 'cosmetics-only'
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_game text; v_amount numeric(12, 2); v_bal numeric(12, 2); v_fee record; v_row record;
  v_today numeric(12, 2);
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  perform public.coin_spend_lock(auth.uid());
  v_game := lower(trim(coalesce(p_game, '')));
  if v_game !~ '^[a-z0-9-]{1,64}$' then raise exception 'invalid game'; end if;
  if p_category not in ('cosmetic','singleplayer-boost') then
    raise exception 'invalid category';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 10000 then raise exception 'invalid amount'; end if;
  v_amount := round(p_amount, 2);
  if coalesce(char_length(trim(coalesce(p_label, ''))), 0) = 0
    or char_length(p_label) > 80 then raise exception 'invalid label'; end if;
  if coalesce(char_length(p_idem), 0) not between 8 and 64 then raise exception 'invalid idem'; end if;
  if exists (select 1 from public.dev_charges where user_id = auth.uid() and idem = p_idem) then
    select * into v_row from public.dev_charges where user_id = auth.uid() and idem = p_idem;
    return jsonb_build_object(
      'id', v_row.id, 'duplicate', true, 'gross_coins', v_row.amount,
      'gross_centicentcoins', round(v_row.amount * 100)::integer
    );
  end if;
  -- Server-side per-game daily cap, enforced UNDER the spend lock so
  -- parallel charges serialize: the second one sees the first one's row.
  select coalesce(sum(amount), 0)::numeric(12, 2) into v_today
  from public.dev_charges
  where user_id = auth.uid()
    and game_slug = v_game
    and created_at >= date_trunc('day', now());
  if v_today + v_amount > 1000 then
    raise exception 'daily cap exceeded: % of 1000 coins already charged today for this game', v_today;
  end if;
  select coalesce(sum(delta), 0)::numeric(12, 2) into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_amount then
    raise exception 'insufficient balance: need % coins, have %', v_amount, v_bal;
  end if;
  select * into v_fee from public.game_ai_compute_split_numeric(v_amount);
  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_amount, substr('Game (' || v_game || '/' || p_category || ') ' || trim(p_label), 1, 120));
  insert into public.dev_charges (user_id, game_slug, category, amount, label, idem, region, profile)
  values (auth.uid(), v_game, p_category, v_amount, trim(p_label), p_idem,
    substr(coalesce(p_region, 'XX'), 1, 8), substr(coalesce(p_profile, 'cosmetics-only'), 1, 32))
  returning * into v_row;
  return jsonb_build_object(
    'id', v_row.id, 'duplicate', false, 'gross_coins', v_amount,
    'cut_coins', v_fee.cut, 'provider_coins', v_fee.provider,
    'gross_centicentcoins', round(v_amount * 100)::integer
  );
end; $$;
revoke all on function public.charge_dev_action(text, text, numeric, text, text, text, text) from public, anon, authenticated;
grant execute on function public.charge_dev_action(text, text, numeric, text, text, text, text) to authenticated;

-- 3. Reaction emoji allowlist --------------------------------------------------
-- Identical to 20260916000000_clan_social_perminute.sql except the allowlist
-- check. 'invalid emoji' string kept so the route mapping is unchanged.
create or replace function public.toggle_clan_reaction(p_message_id uuid, p_emoji text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_emoji text := trim(coalesce(p_emoji, ''));
  v_clan uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if char_length(v_emoji) < 1 or char_length(v_emoji) > 32 then raise exception 'invalid emoji'; end if;
  if v_emoji not in (
    '❤️', '💌', '👍', '👏', '🔥', '🎉', '😂', '😮',
    '😢', '😡', '🙏', '👀', '💯', '🚀', '⭐', '🎮'
  ) then raise exception 'invalid emoji'; end if;
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

-- 4. Ghost contracts: rate must be positive ------------------------------------
-- Identical to 20260925000100_watcher_multirole_ghost.sql except
-- p_rate < 0 becomes p_rate <= 0 ('invalid rate' string kept).
create or replace function public.ghost_create_contract(p_org uuid, p_title text, p_worker uuid, p_payer uuid, p_rate numeric)
returns public.ghost_contracts language plpgsql security definer set search_path = public as $$
declare v_row public.ghost_contracts;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if not public.has_org_perm(p_org, 'org.members.invite') then raise exception 'forbidden'; end if;
  if char_length(trim(coalesce(p_title, ''))) < 2 then raise exception 'title too short'; end if;
  if p_rate is null or p_rate <= 0 or p_rate > 100000000 then raise exception 'invalid rate'; end if;
  if p_worker = p_payer then raise exception 'worker and payer differ'; end if;
  if not exists (select 1 from public.org_members where org_id = p_org and user_id = p_worker) then
    raise exception 'worker is not a member';
  end if;
  if not exists (select 1 from public.org_members where org_id = p_org and user_id = p_payer) then
    raise exception 'payer is not a member';
  end if;
  insert into public.ghost_contracts (org_id, title, worker_id, payer_id, rate_ghost, created_by)
  values (p_org, trim(p_title), p_worker, p_payer, p_rate, auth.uid())
  returning * into v_row;
  return v_row;
end; $$;
revoke all on function public.ghost_create_contract(uuid, text, uuid, uuid, numeric) from public, anon;
grant execute on function public.ghost_create_contract(uuid, text, uuid, uuid, numeric) to authenticated;
