-- ============================================================================
-- Weird Vault: upserts that actually upsert + soft-delete trash.
--
-- 1. Same-scope path duplicates: the original
--    UNIQUE(scope, owner_id, team_id, org_id, path) never matches rows with
--    NULLs (personal rows always carry NULL team_id/org_id, team/org rows
--    carry two NULLs each), so the register upsert's ON CONFLICT silently
--    inserted duplicate rows instead of replacing. Dedupe first (keep
--    newest; GROUP BY treats NULLs as equal, exactly the semantics enforced
--    next), then replace with UNIQUE NULLS NOT DISTINCT (Postgres 15+).
-- 2. Soft-delete: deleted_at + partial index. Trashed rows hide from lists
--    (RLS below) and from single reads; quota counts them until purge.
--    Blob/storage GC stays refcount-gated in the purge route, never here.
-- 3. Touch trigger: re-uploads/renames bump updated_at so ordering stays fresh.
-- Fully rerunnable (repo rule): idempotent dedupe, conname guards, IF NOT
-- EXISTS / DROP ... IF EXISTS throughout. Coin tables untouched
-- (inserts/selects only - and none here at all).
-- ============================================================================

-- 0. Dedupe: keep the newest row per scope-tuple + path.
delete from public.vault_files
where id in (
  select id from (
    select id, row_number() over (
      partition by scope, owner_id, team_id, org_id, path
      order by updated_at desc, id desc
    ) as rn
    from public.vault_files
  ) s where rn > 1
);

-- 1. Replace the legacy nullable-unique with NULLS NOT DISTINCT.
do $$
declare r record;
begin
  if exists (select 1 from pg_constraint where conname = 'vault_files_scope_path_uniq') then
    return;
  end if;
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'vault_files'
      and c.contype = 'u'
  loop
    execute format('alter table public.vault_files drop constraint %I', r.conname);
  end loop;
  alter table public.vault_files
    add constraint vault_files_scope_path_uniq
    unique nulls not distinct (scope, owner_id, team_id, org_id, path);
end $$;

-- 2. Soft-delete column + partial trash index.
alter table public.vault_files
  add column if not exists deleted_at timestamptz null;
create index if not exists idx_vault_files_trash
  on public.vault_files (owner_id, team_id, org_id, deleted_at)
  where deleted_at is not null;

-- 3. Touch trigger: any UPDATE bumps updated_at.
create or replace function public.touch_vault_files_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end; $$;
drop trigger if exists trg_vault_files_touch on public.vault_files;
create trigger trg_vault_files_touch
  before update on public.vault_files
  for each row execute function public.touch_vault_files_updated_at();

-- 4. RLS: live policies hide trashed rows; trash policies expose them to
-- scope members only (service_role bypasses RLS; routes add explicit
-- membership gates on top for both paths).
drop policy if exists vault_files_personal on public.vault_files;
create policy vault_files_personal on public.vault_files for select to authenticated using (
  scope = 'personal' and owner_id = auth.uid() and deleted_at is null
);
drop policy if exists vault_files_team on public.vault_files;
create policy vault_files_team on public.vault_files for select to authenticated using (
  scope = 'team' and public.has_team_perm(team_id, 'team.view') and deleted_at is null
);
drop policy if exists vault_files_org on public.vault_files;
create policy vault_files_org on public.vault_files for select to authenticated using (
  scope = 'org' and public.is_org_member(org_id) and deleted_at is null
);
drop policy if exists vault_files_trash_personal on public.vault_files;
create policy vault_files_trash_personal on public.vault_files for select to authenticated using (
  scope = 'personal' and owner_id = auth.uid() and deleted_at is not null
);
drop policy if exists vault_files_trash_team on public.vault_files;
create policy vault_files_trash_team on public.vault_files for select to authenticated using (
  scope = 'team' and public.has_team_perm(team_id, 'team.view') and deleted_at is not null
);
drop policy if exists vault_files_trash_org on public.vault_files;
create policy vault_files_trash_org on public.vault_files for select to authenticated using (
  scope = 'org' and public.is_org_member(org_id) and deleted_at is not null
);
