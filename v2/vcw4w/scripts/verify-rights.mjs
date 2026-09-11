import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const route = read("../app/api/my/rights/route.ts");
// Source of truth is the live migration, not a paste-and-run bundle copy.
const privacyMig = read("../supabase/migrations/20260910150000_privacy_rights.sql");

// clans.owner_id is the single ownership column (080000 wins). Any query
// against clans.created_by 42703s on real databases (only the 090000
// no-op CREATE TABLE mentions it).
for (const bad of ['eq("created_by"', "eq('created_by'", 'from("clans").select("id").eq("created_by"']) {
  if (route.includes(bad)) throw new Error(`rights route references clans.created_by: ${bad}`);
}
if (/from\("clans"\)[^;]*created_by/s.test(route)) throw new Error("rights route references clans.created_by.");

// bot_api_keys is keyed directly by user_id: there is no identity_id column,
// the prefix column is `prefix` (not key_prefix), revocation is `revoked`.
for (const bad of ["identity_id", "key_prefix", "revoked_at"]) {
  if (route.includes(bad)) throw new Error(`rights route references nonexistent bot column: ${bad}`);
}
if (!route.includes('wipe("bot_api_keys", "user_id")')) throw new Error("rights route must erase bot_api_keys by user_id.");

// bot_identities is keyed by user_id (PK): it has no `id` column to select.
if (/from\("bot_identities"\)\s*\.\s*select\("id,/.test(route)) throw new Error("rights route selects nonexistent bot_identities.id.");

// clan_comments has post_id but no clan_id column.
if (route.includes('"id,clan_id,post_id')) throw new Error("rights route selects nonexistent clan_comments.clan_id.");

// clan_images uploader column is uploader_id (not author_id).
if (route.includes('wipe("clan_images", "author_id")')) throw new Error("rights route wipes nonexistent clan_images.author_id.");

// compute_usage is keyed by booking_id (cascade); it has no user_id column.
if (route.includes('wipe("compute_usage", "user_id")')) throw new Error("rights route wipes nonexistent compute_usage.user_id.");

// room_messages sender column is sender_id (not author_id).
if (route.includes('"room_messages", "author_id"')) throw new Error("rights route references nonexistent room_messages.author_id.");

// The audit table backing /my/rights must ship in the live migration.
if (!privacyMig.includes("create table if not exists public.privacy_requests")) {
  throw new Error("Migration is missing the 20260910150000_privacy_rights migration.");
}

console.log("Rights privacy checks OK.");
