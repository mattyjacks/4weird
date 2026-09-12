-- ============================================================================
-- Bot runtime repairs (live 500s on /api/bot/identity + /api/bot/keys).
--
-- Two independent causes, both invisible to `db push` dry runs:
--
-- 1. 42501 "permission denied for table bot_api_keys": the bot tables were
--    created with `revoke all ... from anon, authenticated` and never granted
--    to service_role, so every serviceClient() read/write on them fails.
--    (Coin/clan tables never hit this because their cron/RPC paths carry
--    explicit grants.) Fix: explicit grants below. RLS posture is untouched:
--    anon/authenticated stay revoked; only the server key gains access.
--
-- 2. 42883 "function gen_random_bytes(integer) does not exist": newer
--    Supabase projects install extensions into the `extensions` schema, which
--    is invisible to functions pinned to `set search_path = public`
--    (ensure_bot_identity, issue flows, trial/lobby helpers). Fix: relocate
--    pgcrypto into public when it lives elsewhere (no-op when already there;
--    created when missing entirely). Nothing in this repo references
--    `extensions.gen_random_*` qualified, so the move is safe here.
--
-- Fully rerunnable: GRANTs are idempotent; the extension move is conditional.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. service_role access on the bot tables (server key only).
-- --------------------------------------------------------------------------
grant all on public.bot_api_keys to service_role;
grant all on public.bot_identities to service_role;
grant all on public.bot_key_request_logs to service_role;

-- --------------------------------------------------------------------------
-- 2. pgcrypto must resolve under search_path = public.
-- --------------------------------------------------------------------------
do $$ declare ext_schema text;
begin
  select n.nspname into ext_schema
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
   where e.extname = 'pgcrypto';
  if ext_schema is null then
    create extension pgcrypto with schema public;
  elsif ext_schema <> 'public' then
    alter extension pgcrypto set schema public;
  end if;
end $$;
