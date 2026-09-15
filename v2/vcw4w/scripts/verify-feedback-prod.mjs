import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// verify-feedback-prod.mjs — DS-FIXFB-03 prod preflight for the feedback store.
//
// Prod drifted silently: nothing statically checked that the feedback store
// is complete before deploy, so a missing column / id shape / check value /
// bucket surfaced as a 503 at runtime instead of a red gate. This script is
// the static preflight: it reads app/api/feedback/route.ts for the insert
// column list and supabase/migrations/*feedback*.sql as the column authority
// and asserts, with named failures and a non-zero exit:
//
//   FAIL[insert-columns] — every column the route inserts into
//     feedback_reports exists in SOME feedback migration (base CREATE TABLE
//     or ADD COLUMN IF NOT EXISTS).
//   FAIL[ai-logs-columns] — every column the route inserts into
//     feedback_ai_logs exists in SOME feedback migration.
//   FAIL[ai-update-columns] — every AI-enrichment column the route updates
//     (stubEnrichFeedback keys + ai_processed_at) exists in SOME migration.
//   FAIL[events-ids] — feedback_events carries BOTH id shapes (feedback_id
//     for the admin slice, report_id for the AI slice) in SOME migration.
//   FAIL[ailogs-ids] — feedback_ai_logs carries BOTH id shapes.
//   FAIL[critique-neutral] — SOME migration widens the critique check to
//     include 'neutral' (base ships positive|negative only).
//   FAIL[bucket] — SOME feedback migration creates the feedback-screenshots
//     storage bucket (insert into storage.buckets).
//   FAIL[feedback-versions] — no duplicate version prefix across the
//     feedback migrations (supabase CLI records applied migrations by
//     version; a duplicate dies on the second apply).
//
// Convention (matches verify-feedback.mjs / verify-migration-versions.mjs):
// fail() throws a named error (non-zero exit), pass lines log green.

const dir = path.dirname(fileURLToPath(import.meta.url));
const routeFile = path.join(dir, "..", "app", "api", "feedback", "route.ts");
const migDir = path.join(dir, "..", "supabase", "migrations");

const read = (file) => fs.readFileSync(file, "utf8");

const fail = (code, msg) => {
  throw new Error(`verify-feedback-prod: FAIL[${code}]: ${msg}`);
};

const pass = (msg) => {
  console.log(`verify-feedback-prod: ${msg}`);
};

const route = read(routeFile);
const enrich = read(path.join(dir, "..", "lib", "feedback", "enrich.ts"));
const feedbackMigs = fs
  .readdirSync(migDir)
  .filter((f) => f.endsWith(".sql") && f.includes("feedback"))
  .sort();
if (feedbackMigs.length === 0) fail("insert-columns", "no *feedback*.sql migrations found.");
const migSrc = new Map(feedbackMigs.map((f) => [f, read(path.join(migDir, f))]));

// Strip -- comments so authority matches only real DDL, not prose.
const codeOf = (src) =>
  src
    .split("\n")
    .map((line) => {
      const cut = line.indexOf("--");
      return cut === -1 ? line : line.slice(0, cut);
    })
    .join("\n");

// Column authority per table: base CREATE TABLE columns + every
// ADD COLUMN target, collected per statement so feedback_events /
// feedback_ai_logs shapes stay scoped to their own table.
const tableColumns = new Map(); // table -> Set(column)
const ensureTable = (t) => {
  if (!tableColumns.has(t)) tableColumns.set(t, new Set());
  return tableColumns.get(t);
};
for (const src of migSrc.values()) {
  const code = codeOf(src);
  // CREATE TABLE [IF NOT EXISTS] [public.]<table> ( ... );
  for (const m of code.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)\s*\(([\s\S]*?)\)\s*;/gi)) {
    const cols = ensureTable(m[1].toLowerCase());
    for (const col of m[2].matchAll(/^\s*(\w+)\s+(?:uuid|text|jsonb|timestamptz|numeric|integer|bigint|boolean)\b/gim)) {
      cols.add(col[1].toLowerCase());
    }
  }
  // ALTER TABLE [public.]<table> ADD COLUMN [IF NOT EXISTS] <col>
  for (const m of code.matchAll(
    /alter\s+table\s+(?:public\.)?(\w+)\s+add\s+column\s+(?:if\s+not\s+exists\s+)?(\w+)/gi,
  )) {
    ensureTable(m[1].toLowerCase()).add(m[2].toLowerCase());
  }
}
const hasColumn = (table, col) => tableColumns.get(table.toLowerCase())?.has(col.toLowerCase()) ?? false;

// -- Expected write sets (authority: route.ts insert/update blocks) ---------
// feedback_reports insert block: reporter_type, rating, critique, text_body,
// labels, bot_extras, annotations, page_url, user_agent, screenshot_path,
// screenshot_mime, screenshot_width, screenshot_height, user_id, visibility,
// contact_name, contact_email, source (route header documents text_body over
// text and [] / {} jsonb defaults; no screenshot_bytes/sha256 columns exist).
const EXPECT_REPORTS_INSERT = [
  "reporter_type",
  "rating",
  "critique",
  "text_body",
  "labels",
  "bot_extras",
  "annotations",
  "page_url",
  "user_agent",
  "screenshot_path",
  "screenshot_mime",
  "screenshot_width",
  "screenshot_height",
  "user_id",
  "visibility",
  "contact_name",
  "contact_email",
  "source",
];
// feedback_ai_logs insert block: report_id + feedback_id dual key, model,
// prompt_version, raw + output dual payload, cost.
const EXPECT_AI_LOGS_INSERT = [
  "report_id",
  "feedback_id",
  "model",
  "prompt_version",
  "raw",
  "output",
  "cost",
];
// AI enrichment update: stubEnrichFeedback keys (lib/feedback/enrich.ts) +
// the processed stamp the route sets alongside the spread.
const EXPECT_AI_UPDATE = ["ai_summary", "ai_category", "ai_severity", "ai_cluster", "ai_processed_at"];

// Guard the script against route drift: every expected key must still appear
// in its source — report/ai_logs keys in route.ts, AI keys in
// lib/feedback/enrich.ts (the route spreads `...ai`, so the literals live
// there) plus the ai_processed_at stamp the route sets alongside the spread.
for (const col of [...EXPECT_REPORTS_INSERT, ...EXPECT_AI_LOGS_INSERT]) {
  if (!route.includes(col)) {
    fail("insert-columns", `route.ts no longer mentions '${col}' — verifier write-set is stale, update EXPECT_* lists.`);
  }
}
for (const col of EXPECT_AI_UPDATE) {
  const src = col === "ai_processed_at" ? route : enrich;
  if (!src.includes(col)) {
    fail("ai-update-columns", `'${col}' vanished from ${col === "ai_processed_at" ? "route.ts" : "lib/feedback/enrich.ts"} — verifier write-set is stale.`);
  }
}
if (!route.includes('from("feedback_ai_logs")')) {
  fail("ailogs-ids", 'route.ts no longer writes feedback_ai_logs — verifier scope is stale.');
}

// -- FAIL[insert-columns]: reports insert coverage ---------------------------
{
  const missing = EXPECT_REPORTS_INSERT.filter((c) => !hasColumn("feedback_reports", c));
  if (missing.length > 0) {
    fail("insert-columns", `route inserts columns missing from feedback migrations: ${missing.join(", ")}.`);
  }
  pass(`check insert-columns green (${EXPECT_REPORTS_INSERT.length} route insert columns all defined in feedback migrations).`);
}

// -- FAIL[ai-logs-columns]: ai_logs insert coverage ---------------------------
{
  const missing = EXPECT_AI_LOGS_INSERT.filter((c) => !hasColumn("feedback_ai_logs", c));
  if (missing.length > 0) {
    fail("ai-logs-columns", `route inserts ai_logs columns missing from feedback migrations: ${missing.join(", ")}.`);
  }
  pass(`check ai-logs-columns green (${EXPECT_AI_LOGS_INSERT.length} ai_logs insert columns all defined).`);
}

// -- FAIL[ai-update-columns]: enrichment update coverage ----------------------
{
  const missing = EXPECT_AI_UPDATE.filter((c) => !hasColumn("feedback_reports", c));
  if (missing.length > 0) {
    fail("ai-update-columns", `route updates AI columns missing from feedback migrations: ${missing.join(", ")}.`);
  }
  pass(`check ai-update-columns green (${EXPECT_AI_UPDATE.length} AI update columns all defined).`);
}

// -- FAIL[events-ids] + FAIL[ailogs-ids]: both id shapes ----------------------
for (const [code, table] of [["events-ids", "feedback_events"], ["ailogs-ids", "feedback_ai_logs"]]) {
  const missing = ["feedback_id", "report_id"].filter((c) => !hasColumn(table, c));
  if (missing.length > 0) {
    fail(code, `${table} is missing id shape column(s): ${missing.join(", ")} (need BOTH feedback_id + report_id).`);
  }
  pass(`check ${code} green (${table} carries both feedback_id + report_id).`);
}

// -- FAIL[critique-neutral]: neutral in SOME migration check ------------------
{
  const neutralOk = [...migSrc.values()].some((src) =>
    /check\s*\(\s*critique\s+in\s*\([^)]*'neutral'[^)]*\)/i.test(codeOf(src)),
  );
  if (!neutralOk) {
    fail("critique-neutral", "no feedback migration widens the critique check to include 'neutral' (route accepts positive|neutral|negative).");
  }
  pass("check critique-neutral green (some migration checks critique in (..., 'neutral', ...)).");
}

// -- FAIL[bucket]: feedback-screenshots bucket creation -----------------------
{
  const bucketOk = [...migSrc.values()].some((src) =>
    /insert\s+into\s+storage\.buckets[\s\S]{0,400}?feedback-screenshots/i.test(codeOf(src)),
  );
  if (!bucketOk) {
    fail("bucket", "no feedback migration creates the 'feedback-screenshots' storage bucket (insert into storage.buckets).");
  }
  pass("check bucket green (some feedback migration creates the feedback-screenshots bucket).");
}

// -- FAIL[feedback-versions]: unique version prefixes -------------------------
{
  const seen = new Map();
  for (const f of feedbackMigs) {
    const m = /^(\d{12,14})_(.+)\.sql$/.exec(f);
    if (!m) fail("feedback-versions", `filename breaks convention (<timestamp>_name.sql): ${f}.`);
    const version = m[1];
    if (seen.has(version)) {
      fail("feedback-versions", `duplicate migration version ${version}: ${seen.get(version)} vs ${f} (rename the later file).`);
    }
    seen.set(version, f);
  }
  pass(`check feedback-versions green (${feedbackMigs.length} feedback migrations, unique versions).`);
}

console.log("verify-feedback-prod: PASS — feedback store preflight complete (insert/ai/events/neutral/bucket/versions).");
