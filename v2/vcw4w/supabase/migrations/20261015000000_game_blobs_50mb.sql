-- ============================================================================
-- Game blobs 50 MB cap: every game in the `game-blobs` bucket loads fast.
-- Fully rerunnable: named CHECK constraints added only when missing.
--
-- App code enforces ZIP_MAX_BYTES / VAULT_MAX_BLOB_BYTES = 50 MiB first;
-- these DB guards are the backstop so oversized rows can never land via
-- any path (zip submissions, vault blobs/files, AI artifacts).
-- 50 MiB = 52428800 bytes.
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'code_submissions_zip_bytes_50mb'
  ) then
    alter table public.code_submissions
      add constraint code_submissions_zip_bytes_50mb
      check (zip_bytes >= 0 and zip_bytes <= 52428800);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vault_blobs_bytes_50mb'
  ) then
    alter table public.vault_blobs
      add constraint vault_blobs_bytes_50mb
      check (bytes > 0 and bytes <= 52428800);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vault_files_bytes_50mb'
  ) then
    alter table public.vault_files
      add constraint vault_files_bytes_50mb
      check (bytes >= 0 and bytes <= 52428800);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ai_artifacts_bytes_50mb'
  ) then
    alter table public.ai_artifacts
      add constraint ai_artifacts_bytes_50mb
      check (bytes >= 0 and bytes <= 52428800);
  end if;
end $$;
