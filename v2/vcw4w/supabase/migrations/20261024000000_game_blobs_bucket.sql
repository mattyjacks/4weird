-- ============================================================================
-- Weird Vault + game .zip submissions: private `game-blobs` bucket.
--
-- Vault, zip-submit, code-preview, and meshy-autosave routes all address
-- storage bucket `game-blobs` (see VAULT_BUCKET in lib/blob-vault.ts), but no
-- earlier migration ever created it, so uploads 503 with "Storage bucket
-- 'game-blobs' is not provisioned yet" on a fresh database. Fully rerunnable:
-- ON CONFLICT guard (repo rule).
--
-- Private bucket, no public policies; every access is via server-minted
-- signed URLs issued only for clean, unquarantined rows. RLS pattern matches
-- blender-scenes (service_role only, no client policies).
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('game-blobs', 'game-blobs', false)
on conflict (id) do update set public = excluded.public;
