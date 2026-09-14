import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// verify-remastery-wave2: proves the Wave-2 DPS (DonatePersonalSeconds) slice
// of the remastery migrations is correct wherever it ships (DS-REMASTER-W2-INFRA).
// README source: v2/vcw4w/public/swarm/remastery/README.md section 2, slice 4
// (P2P COMPUTE NODES & DONATIONS) + slice 7 (RLS enables) + slice 8
// (idx_dps_nodes_active). This is the union the Wave-1 verifier misses: the
// W1 verifier asserts dps_* tables are ABSENT from Wave-1 files; this verifier
// asserts they are PRESENT and correct in their DPS home.
//
// Placement note (2026-09-14): the DPS tables currently ship inside
// 20261116000002_remastery_wave23.sql (R14, DS-REMASTER-W23-INFRA, done) rather
// than a standalone *_remastery_wave2.sql file, so this verifier accepts the
// DPS home as the union of *_remastery_wave2.sql + *_remastery_wave23.sql files
// and asserts slice correctness there. It deliberately does NOT assert the
// wave2-vs-wave3 file split (that half of W2-INFRA is superseded — see QUEUE).

const fail = (msg) => {
  throw new Error(`verify-remastery-wave2: ${msg}`);
};
const must = (cond, msg) => {
  if (!cond) fail(msg);
};

const dir = path.dirname(fileURLToPath(import.meta.url));
const migDir = path.join(dir, "..", "supabase", "migrations");
const dpsFiles = fs
  .readdirSync(migDir)
  .filter((f) => f.endsWith("_remastery_wave2.sql") || f.endsWith("_remastery_wave23.sql"))
  .sort();
must(dpsFiles.length >= 1, "no DPS-home migration found (expected *_remastery_wave2.sql or *_remastery_wave23.sql) under supabase/migrations.");
const wave1Files = fs
  .readdirSync(migDir)
  .filter((f) => f.endsWith("_remastery_wave1.sql"))
  .sort();

const readAll = (files) =>
  files.map((f) => [f, fs.readFileSync(path.join(migDir, f), "utf8")]);
const dps = readAll(dpsFiles);
const dpsCombined = dps.map(([, src]) => src).join("\n");
const wave1Combined = readAll(wave1Files).map(([, src]) => src).join("\n");

// Code without -- comments (so header/QUEUE notes about omitted columns do
// not false-positive the coin-boundary check).
const stripComments = (src) =>
  src
    .split("\n")
    .map((line) => {
      const cut = line.indexOf("--");
      return cut === -1 ? line : line.slice(0, cut);
    })
    .join("\n");
const dpsCode = stripComments(dpsCombined);

const tableRe = (t) =>
  new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${t}\\b`, "i");

// 1. DPS tables ship with rerunnable guards in the DPS home.
for (const t of ["dps_nodes", "dps_tasks"]) {
  must(tableRe(t).test(dpsCombined), `DPS table public.${t} missing (CREATE TABLE IF NOT EXISTS) in ${dpsFiles.join(", ")}.`);
}

// 2. README section 2 slice-4 shapes (verbatim DDL minus the economy-owned
// vibe_coins_earned column — see check 5).
must(/peer_id\s+text\s+unique\s+not\s+null/i.test(dpsCombined), "dps_nodes.peer_id TEXT UNIQUE NOT NULL missing.");
must(/status\s+varchar\(20\)\s+default\s+'offline'/i.test(dpsCombined), "dps_nodes.status VARCHAR(20) DEFAULT 'offline' missing.");
must(/total_seconds_donated\s+bigint\s+default\s+0/i.test(dpsCombined), "dps_nodes.total_seconds_donated BIGINT DEFAULT 0 missing.");
must(/last_heartbeat\s+timestamptz\s+default\s+now\(\)/i.test(dpsCombined), "dps_nodes.last_heartbeat TIMESTAMPTZ DEFAULT NOW() missing.");
must(/task_type\s+varchar\(50\)\s+not\s+null/i.test(dpsCombined), "dps_tasks.task_type VARCHAR(50) NOT NULL missing.");
must(/payload_json\s+jsonb\s+not\s+null/i.test(dpsCombined), "dps_tasks.payload_json JSONB NOT NULL missing.");
must(/status\s+varchar\(20\)\s+default\s+'pending'/i.test(dpsCombined), "dps_tasks.status VARCHAR(20) DEFAULT 'pending' missing.");
must(/vibe_coins_cost\s+integer\s+not\s+null\s+default\s+50/i.test(dpsCombined), "dps_tasks.vibe_coins_cost INTEGER NOT NULL DEFAULT 50 missing (README section 2 verbatim).");
must(
  /assigned_node_id\s+uuid\s+references\s+public\.dps_nodes\(id\)\s+on\s+delete\s+set\s+null/i.test(dpsCombined),
  "dps_tasks.assigned_node_id FK to public.dps_nodes(id) ON DELETE SET NULL missing (slice must be self-contained).",
);

// 3. RLS enabled on both DPS tables (README section 2 slice 7 lists enables
// only for these tables — no policies ship for them there).
for (const t of ["dps_nodes", "dps_tasks"]) {
  const re = new RegExp(`alter\\s+table\\s+public\\.${t}\\s+enable\\s+row\\s+level\\s+security`, "i");
  must(re.test(dpsCombined), `ROW LEVEL SECURITY not enabled on public.${t}.`);
}

// 4. README section 2 slice-8 DPS index ships in the DPS home.
must(
  /create\s+index\s+if\s+not\s+exists\s+idx_dps_nodes_active\b/i.test(dpsCombined),
  "performance index idx_dps_nodes_active missing (CREATE INDEX IF NOT EXISTS) in the DPS home.",
);

// 5. Coin/ledger boundary (economy-lane owned per QUEUE.md): no earned-coin
// columns or ledger hooks in remastery code; the inert per-task quoted cost
// (checked above) is the only coin column allowed.
must(!dpsCode.toLowerCase().includes("vibe_coins_earned"), "vibe_coins_earned must not ship in remastery files (economy-lane owned, QUEUE.md).");

// 6. Referential integrity: public.squads / public.squad_members exist nowhere
// in this repo (squads ARE public.teams; membership is public.team_members on
// team_id). Any DPS reference to them fails `supabase db push`.
for (const ghost of ["public.squads", "public.squad_members"]) {
  const hit = dps.find(([, src]) => src.toLowerCase().includes(ghost));
  must(!hit, `dangling reference to ${ghost} in ${hit && hit[0]} — that table does not exist (squads ARE public.teams); supabase db push would fail.`);
}

// 7. No cross-wave dupes: Wave-1 tables must NOT ship in DPS files, and DPS
// tables must NOT ship in Wave-1 files (one owner per table, append-only).
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
  must(!tableRe(t).test(dpsCombined), `Wave-1 table public.${t} must not ship in ${dpsFiles.join(", ")}.`);
}
for (const t of ["dps_nodes", "dps_tasks"]) {
  const re = new RegExp(`create\\s+table\\s+(if\\s+not\\s+exists\\s+)?public\\.${t}\\b`, "i");
  must(!re.test(wave1Combined), `DPS table public.${t} must not ship in a Wave-1 migration (DPS home owns it).`);
}

// 8. Rerunnable guards: every CREATE TABLE / CREATE INDEX in the DPS home
// carries IF NOT EXISTS (safe to re-push against dashboard-built databases).
const bareTables = [...dpsCode.matchAll(/create\s+table\s+(?!if\s+not\s+exists\s+)public\.(\w+)/gi)].map((m) => m[1]);
must(bareTables.length === 0, `unguarded CREATE TABLE in DPS home (add IF NOT EXISTS): ${bareTables.join(", ")}.`);
const bareIndexes = [...dpsCode.matchAll(/create\s+index\s+(?!if\s+not\s+exists\s+)(\w+)/gi)].map((m) => m[1]);
must(bareIndexes.length === 0, `unguarded CREATE INDEX in DPS home (add IF NOT EXISTS): ${bareIndexes.join(", ")}.`);

console.log(
  `remastery-wave2 OK: dps_nodes + dps_tasks + RLS + idx_dps_nodes_active + coin boundary in ${dpsFiles.join(", ")}; no cross-wave dupes; no dangling squad refs.`,
);
