-- ============================================================================
-- Ghost proofs bucket goes private.
--
-- ghost-proofs was seeded public, so worker-attached proof screenshots are
-- permanently world-readable to anyone with the URL. Every other sensitive
-- bucket (vault, blender-scenes, clan-images, game-blobs) is private with
-- server-minted signed URLs; proofs join them. The upload route now mints a
-- 1-hour signed URL instead of a public one, and there is no other reader
-- (the widget only shows "Proof attached."). Fully rerunnable: the seed
-- upsert converges public to false (repo rule).
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('ghost-proofs', 'ghost-proofs', false)
on conflict (id) do update set public = excluded.public;
