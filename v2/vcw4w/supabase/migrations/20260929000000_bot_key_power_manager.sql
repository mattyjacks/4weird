-- ============================================================================
-- Bot API key power manager: lifetime/daily budgets, expiry, max uses,
-- IP allow/block lists, scope subsets, low-balance hard stop, request logs.
-- Re-runnable: every statement is IF NOT EXISTS / guarded.
--
-- Money rule: log-file storage bills in Vibe Coins with the 25% platform
-- cut INCLUDED (same as everything else). Per-request log cost is computed
-- app-side (see lib/bot-key-policy.ts logStorageSplit) and stored on each
-- log row as coins_spent + log_cut_coins.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. New policy columns on bot_api_keys (all nullable-with-default so old
--    rows behave as "unlimited / disabled / half logging").
-- --------------------------------------------------------------------------
alter table public.bot_api_keys
  add column if not exists expires_at timestamptz,
  add column if not exists max_uses integer not null default 0,
  add column if not exists use_count integer not null default 0,
  add column if not exists lifetime_budget numeric(12, 2) not null default 0,
  add column if not exists lifetime_spent numeric(12, 2) not null default 0,
  add column if not exists daily_budget numeric(12, 2) not null default 0,
  add column if not exists daily_spent numeric(12, 2) not null default 0,
  add column if not exists daily_day date,
  add column if not exists spend_warn_at_pct integer not null default 80,
  add column if not exists warn_sent boolean not null default false,
  add column if not exists hard_stop_enabled boolean not null default false,
  add column if not exists low_balance_floor numeric(12, 2) not null default 0,
  add column if not exists low_balance_pct numeric(6, 2) not null default 10,
  add column if not exists ip_mode text not null default 'disabled',
  add column if not exists ip_allowlist text[] not null default '{}',
  add column if not exists ip_blocklist text[] not null default '{}',
  add column if not exists scopes text[] not null default
    array['clans:read', 'clans:join', 'clans:post', 'clans:comment', 'clans:report', 'identity:read'],
  add column if not exists logging_mode text not null default 'half',
  add column if not exists log_retention_days integer not null default 90,
  add column if not exists note varchar(280) not null default '';

-- Backfill guard: keep numeric columns sane on old rows.
update public.bot_api_keys set max_uses = 0 where max_uses < 0;
update public.bot_api_keys set use_count = 0 where use_count < 0;
update public.bot_api_keys set lifetime_budget = 0 where lifetime_budget < 0;
update public.bot_api_keys set daily_budget = 0 where daily_budget < 0;
update public.bot_api_keys set spend_warn_at_pct = 80
  where spend_warn_at_pct < 1 or spend_warn_at_pct > 100;
update public.bot_api_keys set low_balance_pct = 10
  where low_balance_pct < 0 or low_balance_pct > 100;
update public.bot_api_keys set ip_mode = 'disabled'
  where ip_mode not in ('disabled', 'allowlist', 'blocklist');
update public.bot_api_keys set logging_mode = 'half'
  where logging_mode not in ('full', 'half', 'none');
update public.bot_api_keys set log_retention_days = 90
  where log_retention_days < 1 or log_retention_days > 1825;

create index if not exists idx_bot_api_keys_expires on public.bot_api_keys (expires_at);
create index if not exists idx_bot_api_keys_owner on public.bot_api_keys (user_id, revoked);

-- --------------------------------------------------------------------------
-- 2. Per-request activity log. One row per bot-key call.
--    logging_mode controls what is STORED, not just what is shown:
--      full: prompt/output/context + bodies stored (truncated server-side).
--      half: metadata + short preview only.
--      none: compliance minimum only (no bodies, no prompt/output/context).
--    Safety/compliance fields (time, key, route, status, ip, coins, bytes)
--    are always stored regardless of mode.
-- --------------------------------------------------------------------------
create table if not exists public.bot_key_request_logs (
  id uuid primary key default gen_random_uuid(),
  key_id uuid not null references public.bot_api_keys (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  method varchar(10) not null default 'GET',
  path text not null default '',
  status integer not null default 200,
  ip text not null default '',
  coins_spent numeric(12, 2) not null default 0,
  log_cut_coins numeric(12, 2) not null default 0,
  bytes integer not null default 0,
  prompt_text text,
  output_text text,
  context jsonb,
  request_preview text,
  response_preview text,
  created_at timestamptz not null default now()
);
create index if not exists idx_bot_key_logs_key_time
  on public.bot_key_request_logs (key_id, created_at desc);
create index if not exists idx_bot_key_logs_user_time
  on public.bot_key_request_logs (user_id, created_at desc);

alter table public.bot_key_request_logs enable row level security;
-- Intentionally NO client policies: the app reads via service-role routes,
-- which enforce owner-only access. Deny-by-default for anon/authenticated.
revoke all on public.bot_key_request_logs from anon, authenticated;

-- --------------------------------------------------------------------------
-- 3. Owner self-service policy update (Supabase-login auth, own keys only).
--    Budgets can only stay the same or tighten once spend exists: raising a
--    budget above lifetime_spent is allowed, lowering below spent freezes the
--    key (enforced app-side as "over budget"); never rewrites history.
-- --------------------------------------------------------------------------
create or replace function public.update_bot_key_policy(
  p_key_id uuid,
  p_label text default null,
  p_expires_at timestamptz default null,
  p_clear_expiry boolean default false,
  p_max_uses integer default null,
  p_lifetime_budget numeric default null,
  p_daily_budget numeric default null,
  p_spend_warn_at_pct integer default null,
  p_hard_stop_enabled boolean default null,
  p_low_balance_floor numeric default null,
  p_low_balance_pct numeric default null,
  p_ip_mode text default null,
  p_ip_allowlist text[] default null,
  p_ip_blocklist text[] default null,
  p_scopes text[] default null,
  p_logging_mode text default null,
  p_log_retention_days integer default null,
  p_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed_scopes text[] := array['clans:read', 'clans:join', 'clans:post', 'clans:comment', 'clans:report', 'identity:read'];
  s text;
begin
  if auth.uid() is null then raise exception 'login required'; end if;

  if p_label is not null then
    if char_length(trim(p_label)) < 1 or char_length(trim(p_label)) > 40 then
      raise exception 'invalid label';
    end if;
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'expiry must be in the future';
  end if;
  if p_max_uses is not null and (p_max_uses < 0 or p_max_uses > 10000000) then
    raise exception 'invalid max uses';
  end if;
  if p_lifetime_budget is not null and (p_lifetime_budget < 0 or p_lifetime_budget > 1000000) then
    raise exception 'invalid lifetime budget';
  end if;
  if p_daily_budget is not null and (p_daily_budget < 0 or p_daily_budget > 1000000) then
    raise exception 'invalid daily budget';
  end if;
  if p_spend_warn_at_pct is not null and (p_spend_warn_at_pct < 1 or p_spend_warn_at_pct > 100) then
    raise exception 'invalid warn percent';
  end if;
  if p_low_balance_floor is not null and (p_low_balance_floor < 0 or p_low_balance_floor > 1000000) then
    raise exception 'invalid low balance floor';
  end if;
  if p_low_balance_pct is not null and (p_low_balance_pct < 0 or p_low_balance_pct > 100) then
    raise exception 'invalid low balance percent';
  end if;
  if p_ip_mode is not null and p_ip_mode not in ('disabled', 'allowlist', 'blocklist') then
    raise exception 'invalid ip mode';
  end if;
  if p_ip_allowlist is not null and array_length(p_ip_allowlist, 1) > 50 then
    raise exception 'too many allowlist entries';
  end if;
  if p_ip_blocklist is not null and array_length(p_ip_blocklist, 1) > 50 then
    raise exception 'too many blocklist entries';
  end if;
  if p_scopes is not null then
    foreach s in array p_scopes loop
      if not (s = any (allowed_scopes)) then raise exception 'invalid scope'; end if;
    end loop;
  end if;
  if p_logging_mode is not null and p_logging_mode not in ('full', 'half', 'none') then
    raise exception 'invalid logging mode';
  end if;
  if p_log_retention_days is not null and (p_log_retention_days < 1 or p_log_retention_days > 1825) then
    raise exception 'invalid retention';
  end if;
  if p_note is not null and char_length(p_note) > 280 then
    raise exception 'note too long';
  end if;

  update public.bot_api_keys set
    label = coalesce(trim(p_label), label),
    expires_at = case when p_clear_expiry then null
                      when p_expires_at is not null then p_expires_at
                      else expires_at end,
    max_uses = coalesce(p_max_uses, max_uses),
    lifetime_budget = coalesce(p_lifetime_budget, lifetime_budget),
    daily_budget = coalesce(p_daily_budget, daily_budget),
    spend_warn_at_pct = coalesce(p_spend_warn_at_pct, spend_warn_at_pct),
    hard_stop_enabled = coalesce(p_hard_stop_enabled, hard_stop_enabled),
    low_balance_floor = coalesce(p_low_balance_floor, low_balance_floor),
    low_balance_pct = coalesce(p_low_balance_pct, low_balance_pct),
    ip_mode = coalesce(p_ip_mode, ip_mode),
    ip_allowlist = coalesce(p_ip_allowlist, ip_allowlist),
    ip_blocklist = coalesce(p_ip_blocklist, ip_blocklist),
    scopes = coalesce(p_scopes, scopes),
    logging_mode = coalesce(p_logging_mode, logging_mode),
    log_retention_days = coalesce(p_log_retention_days, log_retention_days),
    note = coalesce(p_note, note),
    -- Changing any money/IP/expiry control resets the one-shot warning so
    -- the owner gets a fresh heads-up at the new threshold.
    warn_sent = case when p_lifetime_budget is not null
                      or p_daily_budget is not null
                      or p_spend_warn_at_pct is not null
                      then false else warn_sent end
  where id = p_key_id and user_id = auth.uid();

  return found;
end;
$$;
revoke all on function public.update_bot_key_policy(uuid, text, timestamptz, boolean, integer, numeric, numeric, integer, boolean, numeric, numeric, text, text[], text[], text[], text, integer, text)
  from public, anon, authenticated;
grant execute on function public.update_bot_key_policy(uuid, text, timestamptz, boolean, integer, numeric, numeric, integer, boolean, numeric, numeric, text, text[], text[], text[], text, integer, text)
  to authenticated;

-- --------------------------------------------------------------------------
-- 4. Retention sweep helper: deletes log rows older than each key's own
--    retention window. Run on a schedule (cron) or on read.
-- --------------------------------------------------------------------------
create or replace function public.purge_expired_bot_key_logs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer := 0;
begin
  with gone as (
    delete from public.bot_key_request_logs l
    using public.bot_api_keys k
    where l.key_id = k.id
      and l.created_at < now() - (k.log_retention_days || ' days')::interval
    returning l.id
  )
  select count(*)::integer into removed from gone;
  return removed;
end;
$$;
revoke all on function public.purge_expired_bot_key_logs() from public, anon, authenticated;
grant execute on function public.purge_expired_bot_key_logs() to service_role;
