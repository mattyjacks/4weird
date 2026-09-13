import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// verify-remastery-wave23: proves the UNION of Wave-1 + Wave-2+3 remastery
// migrations is coherent (DS-REMASTER-W23-INFRA, R14).
// Wave-1 union: *_remastery_wave1.sql (15 tables across the squad/kanban/
// time/invoice + comms slices). Wave-2+3: *_remastery_wave23.sql (dps_nodes,
// dps_tasks, community_mods, community_themes). Reads R7's
// verify-remastery-wave1.mjs files but never edits them.

const fail = (msg) => {
  throw new Error(`verify-remastery-wave23: ${msg}`);
};
const must = (cond, msg) => {
  if (!cond) fail(msg);
};

const dir = path.dirname(fileURLToPath(import.meta.url));
const migDir = path.join(dir, "..", "supabase", "migrations");
const wave1Files = fs
  .readdirSync(migDir)
  .filter((f) => f.endsWith("_remastery_wave1.sql"))
  .sort();
const wave23Files = fs
  .readdirSync(migDir)
  .filter((f) => f.endsWith("_remastery_wave23.sql"))
  .sort();
must(wave1Files.length >= 1, "no *_remastery_wave1.sql migration found under supabase/migrations.");
must(wave23Files.length >= 1, "no *_remastery_wave23.sql migration found under supabase/migrations.");

const readAll = (files) =>
  files.map((f) => [f, fs.readFileSync(path.join(migDir, f), "utf8")]);
const wave1 = readAll(wave1Files);
const wave23 = readAll(wave23Files);
const wave1Combined = wave1.map(([, src]) => src).join("\n");
const wave23Combined = wave23.map(([, src]) => src).join("\n");
const union = `${wave1Combined}\n${wave23Combined}`;

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
const WAVE23_TABLES = [
  "dps_nodes",
  "dps_tasks",
  "community_mods",
  "community_themes",
];
const tableRe = (t) =>
  new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${t}\\b`, "i");

// 1. Union covers all 19 remastery tables with rerunnable guards.
for (const t of [...WAVE1_TABLES, ...WAVE23_TABLES]) {
  must(tableRe(t).test(union), `union table public.${t} missing (CREATE TABLE IF NOT EXISTS).`);
}

// 2. No cross-wave dupes: Wave-1 tables must NOT ship in Wave-2+3 files and
// vice versa (one owner per table, append-only discipline).
for (const t of WAVE1_TABLES) {
  must(!tableRe(t).test(wave23Combined), `Wave-1 table public.${t} must not ship in ${wave23Files.join(", ")}.`);
}
for (const t of WAVE23_TABLES) {
  must(!tableRe(t).test(wave1Combined), `Wave-2+3 table public.${t} must not ship in ${wave1Files.join(", ")}.`);
}

// 3. Wave-2+3 files contain ONLY the four Wave-2+3 tables (no scope creep).
const createdTables = [...wave23Combined.matchAll(/create\s+table\s+if\s+not\s+exists\s+public\.(\w+)/gi)].map(
  (m) => m[1].toLowerCase(),
);
must(createdTables.length === WAVE23_TABLES.length, `Wave-2+3 files must create exactly the 4 Wave-2+3 tables, found: ${createdTables.join(", ")}.`);
for (const t of createdTables) {
  must(WAVE23_TABLES.includes(t), `out-of-scope table public.${t} in ${wave23Files.join(", ")}.`);
}

// 4. RLS enabled on every union table.
for (const t of [...WAVE1_TABLES, ...WAVE23_TABLES]) {
  const re = new RegExp(`alter\\s+table\\s+public\\.${t}\\s+enable\\s+row\\s+level\\s+security`, "i");
  must(re.test(union), `ROW LEVEL SECURITY not enabled on public.${t}.`);
}

// 5. README section 2 Wave-1 policies still present in the union, each with
// its DROP POLICY IF EXISTS guard in the same file (rerunnable pushes).
const POLICIES = [
  ["squad_projects", "squad_projects_read"],
  ["kanban_boards", "kanban_boards_access"],
  ["kanban_cards", "kanban_cards_access"],
  ["time_projects", "time_projects_own"],
  ["time_entries", "time_entries_own"],
  ["invoices", "invoices_own"],
  ["invoice_clients", "invoice_clients_own"],
  ["invoice_line_items", "invoice_items_own"],
  ["notifications", "notifications_read_own"],
  ["notifications", "notifications_update_own"],
  ["chat_threads", "chat_threads_read"],
  ["chat_messages", "chat_messages_read"],
  ["chat_messages", "chat_messages_insert"],
];
const allFiles = new Map([...wave1, ...wave23]);
for (const [table, policy] of POLICIES) {
  const ownerEntry = [...allFiles.entries()].find(([, src]) =>
    new RegExp(`create\\s+policy\\s+${policy}\\b`, "i").test(src),
  );
  must(ownerEntry, `policy ${policy} on public.${table} missing from the remastery union.`);
  const [, src] = ownerEntry;
  must(
    new RegExp(`drop\\s+policy\\s+if\\s+exists\\s+${policy}\\b`, "i").test(src),
    `policy ${policy} lacks its DROP POLICY IF EXISTS guard in ${ownerEntry[0]}.`,
  );
}

// 6. README section 2 performance indexes across the union (5 Wave-1 + 1
// Wave-2+3).
for (const idx of [
  "idx_invoices_user_deleted",
  "idx_time_entries_user_proj",
  "idx_kanban_cards_pos",
  "idx_notifications_unread",
  "idx_chat_messages_time",
  "idx_dps_nodes_active",
]) {
  const re = new RegExp(`create\\s+index\\s+if\\s+not\\s+exists\\s+${idx}\\b`, "i");
  must(re.test(union), `performance index ${idx} missing (CREATE INDEX IF NOT EXISTS).`);
}
must(
  /create\s+index\s+if\s+not\s+exists\s+idx_dps_nodes_active\b/i.test(wave23Combined),
  "idx_dps_nodes_active must ship in the Wave-2+3 file (it indexes dps_nodes).",
);

// 7. Referential integrity: public.squads / public.squad_members do not
// exist in this repo (squads ARE public.teams; membership is
// public.team_members on team_id). Any remastery reference to them fails
// `supabase db push`, so it blocks the foundation.
for (const ghost of ["public.squads", "public.squad_members"]) {
  const hit = [...allFiles.entries()].find(([, src]) => src.toLowerCase().includes(ghost));
  must(!hit, `dangling reference to ${ghost} in ${hit && hit[0]} — that table does not exist (squads ARE public.teams); supabase db push would fail.`);
}

// 8. Coin/ledger boundary (economy-lane owned per QUEUE.md): no earned-coin
// columns or ledger hooks in remastery files; the inert per-task quoted
// cost ships verbatim on dps_tasks.
const unionCode = union
  .split("\n")
  .map((line) => {
    const cut = line.indexOf("--");
    return cut === -1 ? line : line.slice(0, cut);
  })
  .join("\n");
must(!unionCode.toLowerCase().includes("vibe_coins_earned"), "vibe_coins_earned must not ship in remastery files (economy-lane owned, QUEUE.md).");
must(/vibe_coins_cost\s+integer\s+not\s+null\s+default\s+50/i.test(wave23Combined), "dps_tasks.vibe_coins_cost INTEGER NOT NULL DEFAULT 50 missing (README section 2 verbatim).");
must(
  /assigned_node_id\s+uuid\s+references\s+public\.dps_nodes\(id\)\s+on\s+delete\s+set\s+null/i.test(wave23Combined),
  "dps_tasks.assigned_node_id FK to public.dps_nodes missing (union must be self-contained).",
);

console.log(
  `remastery-wave23 OK: union of ${wave1Files.join(", ")} + ${wave23Files.join(", ")} covers ${WAVE1_TABLES.length + WAVE23_TABLES.length} tables + RLS + ${POLICIES.length} policies + 6 indexes; no cross-wave dupes; no dangling squad refs; coin boundary intact.`,
);