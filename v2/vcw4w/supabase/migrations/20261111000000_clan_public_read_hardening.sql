-- ============================================================================
-- Clan public-read hardening: kill anonymous enumeration, keep display.
--
-- Record: clan content is PUBLIC BY DESIGN (clans/posts/comments all carry
-- anon-readable policies; clan posts render inline <img> tags). The
-- `clan-images` bucket flag `public = true` is therefore intentional — the
-- object bytes must stay world-readable for display. (This corrects the
-- aside in 20261025000006_ghost_proofs_private.sql, which listed clan-images
-- among the private buckets; it is public like the posts it illustrates.
-- Uploads stay safe via magic-byte + polyglot + contentType checks in
-- POST /api/clans/upload, which are unchanged.)
--
-- What this migration DOES change (metadata layer only, display untouched):
--  1. public.clan_images metadata: anon can no longer enumerate every
--     image row (storage_path/sha256/uploader). Authenticated callers see
--     their own rows plus images attached to visible posts. Object bytes
--     remain publicly readable for <img> display.
--  2. public.clan_members roster: anon can no longer scrape full rosters.
--     Any logged-in user keeps the member sidebar; logged-out visitors keep
--     posts/comments but not the roster.
--
-- Rerunnable: DROP POLICY IF EXISTS + CREATE POLICY. Display paths use the
-- object bucket (unaffected) and service-role admin reads (bypass RLS).
-- ============================================================================

drop policy if exists clan_images_public_read on public.clan_images;
drop policy if exists clan_images_scoped_read on public.clan_images;
create policy clan_images_scoped_read on public.clan_images
  for select to authenticated using (
    uploader_id = auth.uid() or
    exists (
      select 1 from public.clan_posts p
      where p.id = clan_images.post_id and p.status = 'visible'
    )
  );

drop policy if exists clan_members_read on public.clan_members;
drop policy if exists clan_members_authenticated_read on public.clan_members;
create policy clan_members_authenticated_read on public.clan_members
  for select to authenticated using (true);
