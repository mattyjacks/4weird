import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// verify-remastery-wave3: proves the Wave-3 community mods/themes slice of the
// remastery migrations is correct wherever it ships (DS-REMASTER-W3-INFRA).
// README source: v2/vcw4w/public/swarm/remastery/README.md section 2, slice 6
// (COMMUNITY MODS & THEMES) + slice 7 (RLS enables for both tables). Slice 6
// carries no README indexes and no coin columns, so this verifier asserts
// enables + shapes + boundaries instead. This is the union the Wave-1
// verifier misses: the W1 verifier asserts community_* tables are ABSENT from
// Wave-1 files; this verifier asserts they are PRESENT and correct in their
// mods home.
//
// Placement note (2026-09-14): the mods/themes tables currently ship inside
// 20261116000002_remastery_wave23.sql (R14, DS-REMASTER-W23-INFRA, done) rather
// than a standalone *_remastery_wave3.sql file, so this verifier accepts the
// mods home as the union of *_remastery_wave3.sql + *_remastery_wave23.sql
// files and asserts slice correctness there. It deliberately does NOT assert
// the wave2-vs-wave3 file split (that half of W3-INFRA is superseded — see
// QUEUE; sibling verifier scripts/verify-remastery-wave2.mjs owns the DPS
// slice of the same home).

const fail = (msg) => {
  throw new Error(`verify-remastery-wave3: ${msg}`);
};
const must = (cond, msg) => {
  if (!cond) fail(msg);
};

const dir = path.dirname(fileURLToPath(import.meta.url));
const migDir = path.join(dir, "..", "supabase", "migrations");
const modsFiles = fs
  .readdirSync(migDir)
  .filter((f) => f.endsWith("_remastery_wave3.sql") || f.endsWith("_remastery_wave23.sql"))
  .sort();
must(modsFiles.length >= 1, "no mods-home migration found (expected *_remastery_wave3.sql or *_remastery_wave23.sql) under supabase/migrations.");
const wave1Files = fs
  .readdirSync(migDir)
  .filter((f) => f.endsWith("_remastery_wave1.sql"))
  .sort();

const readAll = (files) =>
  files.map((f) => [f, fs.readFileSync(path.join(migDir, f), "utf8")]);
const mods = readAll(modsFiles);
const modsCombined = mods.map(([, src]) => src).join("\n");
const wave1Combined = readAll(wave1Files).map(([, src]) => src).join("\n");

const tableRe = (t) =>
  new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${t}\\b`, "i");

// Extract one CREATE TABLE block (header through the closing ");") so slice
// assertions stay scoped to the table under test even when the home file also
// carries other slices (e.g. R14's DPS + mods union file).
const tableBlock = (src, t) => {
  const m = src.match(
    new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${t}\\s*\\(([\\s\\S]*?)\\);`, "i"),
  );
  must(m, `could not extract CREATE TABLE block for public.${t}.`);
  return m[1];
};

// 1. Mods/themes tables ship with rerunnable guards in the mods home.
for (const t of ["community_mods", "community_themes"]) {
  must(tableRe(t).test(modsCombined), `mods table public.${t} missing (CREATE TABLE IF NOT EXISTS) in ${modsFiles.join(", ")}.`);
}

// 2. README section 2 slice-6 shapes (verbatim DDL).
const modsBlock = tableBlock(modsCombined, "community_mods");
must(/creator_user_id\s+uuid\s+references\s+auth\.users\(id\)\s+on\s+delete\s+cascade/i.test(modsBlock), "community_mods.creator_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE missing.");
must(/slug\s+text\s+unique\s+not\s+null/i.test(modsBlock), "community_mods.slug TEXT UNIQUE NOT NULL missing.");
must(/target_game\s+text\s+not\s+null/i.test(modsBlock), "community_mods.target_game TEXT NOT NULL missing.");
must(/manifest_json\s+jsonb\s+not\s+null/i.test(modsBlock), "community_mods.manifest_json JSONB NOT NULL missing.");
must(/script_url\s+text\s+not\s+null/i.test(modsBlock), "community_mods.script_url TEXT NOT NULL missing.");
must(/is_verified\s+boolean\s+default\s+false/i.test(modsBlock), "community_mods.is_verified BOOLEAN DEFAULT FALSE missing.");
must(/downloads_count\s+integer\s+default\s+0/i.test(modsBlock), "community_mods.downloads_count INTEGER DEFAULT 0 missing.");
const themesBlock = tableBlock(modsCombined, "community_themes");
must(/creator_user_id\s+uuid\s+references\s+auth\.users\(id\)\s+on\s+delete\s+cascade/i.test(themesBlock), "community_themes.creator_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE missing.");
must(/slug\s+text\s+unique\s+not\s+null/i.test(themesBlock), "community_themes.slug TEXT UNIQUE NOT NULL missing.");
must(/css_tokens\s+jsonb\s+not\s+null/i.test(themesBlock), "community_themes.css_tokens JSONB NOT NULL missing.");
must(/is_public\s+boolean\s+default\s+true/i.test(themesBlock), "community_themes.is_public BOOLEAN DEFAULT TRUE missing.");
must(/likes_count\s+integer\s+default\s+0/i.test(themesBlock), "community_themes.likes_count INTEGER DEFAULT 0 missing.");

// 3. RLS enabled on both mods tables (README section 2 slice 7 lists enables
// only for these tables — no policies ship for them there).
for (const t of ["community_mods", "community_themes"]) {
  const re = new RegExp(`alter\\s+table\\s+public\\.${t}\\s+enable\\s+row\\s+level\\s+security`, "i");
  must(re.test(modsCombined), `ROW LEVEL SECURITY not enabled on public.${t}.`);
}

// 4. Coin/ledger boundary (economy-lane owned per QUEUE.md): README slice 6
// carries no coin columns, so none may appear inside the two table blocks.
for (const [t, block] of [["community_mods", modsBlock], ["community_themes", themesBlock]]) {
  must(!block.toLowerCase().includes("vibe_coins"), `coin column inside public.${t} block (economy-lane owned, QUEUE.md).`);
}

// 5. Referential integrity: public.squads / public.squad_members exist nowhere
// in this repo (squads ARE public.teams; membership is public.team_members on
// team_id). Any mods-home reference to them fails `supabase db push`.
for (const ghost of ["public.squads", "public.squad_members"]) {
  const hit = mods.find(([, src]) => src.toLowerCase().includes(ghost));
  must(!hit, `dangling reference to ${ghost} in ${hit && hit[0]} — that table does not exist (squads ARE public.teams); supabase db push would fail.`);
}

// 6. No cross-wave dupes: Wave-1 tables must NOT ship in mods-home files, and
// mods/themes tables must NOT ship in Wave-1 files (one owner per table,
// append-only).
const WAVE1_TABLES = [
  "squad_projects",
  "squad_project_members",
  "kanban_boards",
  "kanban_cycles",
  "kanban_columns",
  "kanban_cards",
  "time_projects",
  "time_entries",
  "invoice_clients",
  "invoices",
  "invoice_line_items",
  "notifications",
  "chat_threads",
  "chat_participants",
  "chat_messages",
];
for (const t of WAVE1_TABLES) {
  must(!tableRe(t).test(modsCombined), `Wave-1 table public.${t} must not ship in ${modsFiles.join(", ")}.`);
}
for (const t of ["community_mods", "community_themes"]) {
  const re = new RegExp(`create\\s+table\\s+(if\\s+not\\s+exists\\s+)?public\\.${t}\\b`, "i");
  must(!re.test(wave1Combined), `mods table public.${t} must not ship in a Wave-1 migration (mods home owns it).`);
}

// 7. Rerunnable guards on the two mods tables (safe to re-push against
// dashboard-built databases).
for (const t of ["community_mods", "community_themes"]) {
  const bare = new RegExp(`create\\s+table\\s+(?!if\\s+not\\s+exists\\s+)public\\.${t}\\b`, "i");
  must(!bare.test(modsCombined), `unguarded CREATE TABLE public.${t} in mods home (add IF NOT EXISTS).`);
}

console.log(
  `remastery-wave3 OK: community_mods + community_themes + RLS + coin boundary in ${modsFiles.join(", ")}; no cross-wave dupes; no dangling squad refs.`,
);
