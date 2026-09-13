-- ============================================================================
-- Valley Net audit: allow target_type 'report'.
-- The bot report route logs hclan-refused blocks on the report path
-- (logValleynetAction targetType "report"); the original check constraint
-- only allowed post/comment/join/bot-deploy, so those inserts failed and
-- the route didn't typecheck. Fully rerunnable: drops any legacy
-- target_type check on valleynet_actions, then adds a named one with
-- 'report' included. Coin tables untouched.
-- ============================================================================

do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'valleynet_actions'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%target_type%in%'
  loop
    execute format('alter table public.valleynet_actions drop constraint %I', r.conname);
  end loop;
  if not exists (select 1 from pg_constraint where conname = 'valleynet_actions_target_type_check') then
    alter table public.valleynet_actions
      add constraint valleynet_actions_target_type_check
      check (target_type in ('post', 'comment', 'join', 'bot-deploy', 'report'));
  end if;
end $$;
