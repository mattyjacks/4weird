import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fail = (msg) => {
  throw new Error(`verify-remastery-wave1: ${msg}`);
};
const must = (cond, msg) => {
  if (!cond) fail(msg);
};

const dir = path.dirname(fileURLToPath(import.meta.url));
const migDir = path.join(dir, "..", "supabase", "migrations");
const files = fs
  .readdirSync(migDir)
  .filter((f) => f.endsWith("_remastery_wave1.sql"))
  .sort();
must(files.length >= 1, "no *_remastery_wave1.sql migration found under supabase/migrations.");

const combined = files
  .map((f) => fs.readFileSync(path.join(migDir, f), "utf8"))
  .join("\n");
const perFile = new Map(
  files.map((f) => [f, fs.readFileSync(path.join(migDir, f), "utf8")]),
);
const lower = combined.toLowerCase();

// 1. Wave-1 table set (README section 2, Wave-1 slice): all 15 must be
// created with rerunnable guards, across the union of wave1 files.
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
  const re = new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${t}\\b`, "i");
  must(re.test(combined), `Wave-1 table public.${t} missing (CREATE TABLE IF NOT EXISTS) in ${files.join(", ")}.`);
}

// 2. Wave-2/3 tables must NOT ship in Wave-1 files (later waves own them).
const OUT_OF_SCOPE = ["dps_nodes", "dps_tasks", "community_mods", "community_themes"];
for (const t of OUT_OF_SCOPE) {
  const re = new RegExp(`create\\s+table\\s+(if\\s+not\\s+exists\\s+)?public\\.${t}\\b`, "i");
  must(!re.test(combined), `out-of-scope table public.${t} must not ship in a Wave-1 migration (later wave owns it).`);
}

// 3. RLS must be enabled on every Wave-1 table.
for (const t of WAVE1_TABLES) {
  const re = new RegExp(`alter\\s+table\\s+public\\.${t}\\s+enable\\s+row\\s+level\\s+security`, "i");
  must(re.test(combined), `ROW LEVEL SECURITY not enabled on public.${t}.`);
}

// 4. README section 2 policies for the Wave-1 tables must exist, each with
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
for (const [table, policy] of POLICIES) {
  const ownerEntry = [...perFile.entries()].find(([, src]) =>
    new RegExp(`create\\s+policy\\s+${policy}\\b`, "i").test(src),
  );
  must(ownerEntry, `policy ${policy} on public.${table} missing from Wave-1 migrations.`);
  const [, src] = ownerEntry;
  must(
    new RegExp(`drop\\s+policy\\s+if\\s+exists\\s+${policy}\\b`, "i").test(src),
    `policy ${policy} lacks its DROP POLICY IF EXISTS guard in ${ownerEntry[0]}.`,
  );
}

// 5. README section 2 performance indexes for the Wave-1 tables.
const INDEXES = [
  "idx_invoices_user_deleted",
  "idx_time_entries_user_proj",
  "idx_kanban_cards_pos",
  "idx_notifications_unread",
  "idx_chat_messages_time",
];
for (const idx of INDEXES) {
  const re = new RegExp(`create\\s+index\\s+if\\s+not\\s+exists\\s+${idx}\\b`, "i");
  must(re.test(combined), `performance index ${idx} missing (CREATE INDEX IF NOT EXISTS).`);
}

// 6. Referential integrity: public.squads / public.squad_members do not
// exist in this repo (squads ARE public.teams per the party_interop
// migration; membership is public.team_members on team_id). Any Wave-1
// reference to them fails `supabase db push`, so it blocks the foundation.
for (const ghost of ["public.squads", "public.squad_members"]) {
  const hit = files.find((f) => perFile.get(f).toLowerCase().includes(ghost));
  must(!hit, `dangling reference to ${ghost} in ${hit} — that table does not exist (squads ARE public.teams); supabase db push would fail.`);
}
must(!lower.includes("public.squads"), "dangling public.squads reference (see above).");

console.log(
  `remastery-wave1 OK: ${WAVE1_TABLES.length} Wave-1 tables + RLS + ${POLICIES.length} policies + ${INDEXES.length} indexes across ${files.join(", ")}; no Wave-2/3 tables; no dangling squad references.`,
);
