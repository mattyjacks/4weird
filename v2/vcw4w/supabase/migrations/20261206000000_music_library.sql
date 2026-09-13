-- ============================================================================
-- MUSIC LIBRARY (infra lane, append-only) — DS-MUSIC-10
-- File: supabase/migrations/20261206000000_music_library.sql
--
-- Table: public.music_songs — community song/sfx registry backing /music
-- and /music/all (seed JSON from public/music/seeds/ mirrored here for
-- query + ownership). Columns: id/title/kind/format_json/bytes/owner
-- plus created_at. kind is song|sfx only. Music metadata only — no
-- currency, ledger, payout, or settlement columns of any kind.
--
-- Access: SELECT is public (library is world-readable); INSERT is
-- own-rows-only (owner must equal auth.uid()); UPDATE/DELETE have no
-- policy and stay deny-by-default.
--
-- Rerunnable: IF NOT EXISTS / DROP ... IF EXISTS guards (repo rule).
-- Version 20261206000000 is the next-free slot after
-- 20261205000000_vault_meter_cents.sql (verified before landing).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.music_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('song', 'sfx')),
  format_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  bytes INTEGER NOT NULL DEFAULT 0 CHECK (bytes >= 0),
  owner UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_music_songs_owner ON public.music_songs (owner, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_music_songs_kind ON public.music_songs (kind, created_at DESC);

ALTER TABLE public.music_songs ENABLE ROW LEVEL SECURITY;

-- World-readable library: anyone (anon + authenticated) can SELECT.
DROP POLICY IF EXISTS music_songs_select_public ON public.music_songs;
CREATE POLICY music_songs_select_public ON public.music_songs
  FOR SELECT USING (true);

-- Own-rows-only insert: the row owner must be the calling user.
DROP POLICY IF EXISTS music_songs_insert_own ON public.music_songs;
CREATE POLICY music_songs_insert_own ON public.music_songs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND owner = auth.uid());
