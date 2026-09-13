-- Repair: game_saves.schema_version missing on schema.sql-bootstrapped DBs.
-- The API selects/upserts schema_version, so its absence 500s every GET/PUT
-- (client sees "Backend temporarily unavailable"). Idempotent backfill.
alter table public.game_saves
  add column if not exists schema_version integer not null default 1 check (schema_version > 0);
