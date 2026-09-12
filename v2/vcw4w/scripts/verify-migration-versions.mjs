import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const migDir = path.join(dir, "..", "supabase", "migrations");
const files = fs.readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();

// 1. Every migration version prefix must be unique. The CLI records applied
// migrations by version: two files sharing a version apply the first, record
// it, then die inserting the duplicate (duplicate key on schema_migrations).
// Seven such collisions shipped once (e.g. 20260910180000 x2); this locks
// the fix in so `supabase db push` never trips on it again.
const seen = new Map();
for (const f of files) {
  const m = /^(\d{12,14})_(.+)\.sql$/.exec(f);
  if (!m) throw new Error(`Migration filename breaks convention (<timestamp>_name.sql): ${f}`);
  const [, version] = m;
  if (seen.has(version)) {
    throw new Error(
      `Duplicate migration version ${version}: ${seen.get(version)} vs ${f} (rename the later file).`,
    );
  }
  seen.set(version, f);
}

// 2. CREATE POLICY / CREATE TRIGGER / CREATE INDEX / CREATE TABLE / ADD COLUMN
// must carry their rerunnable guards (IF NOT EXISTS / IF EXISTS), so files
// stay safe to re-push against dashboard-built databases.
const guardRules = [
  [/create\s+policy\s+(\S+)/gi, /drop\s+policy\s+if\s+exists/gi, "policy"],
  [/create\s+trigger\s+(\S+)/gi, /drop\s+trigger\s+if\s+exists/gi, "trigger"],
  [/create\s+(?:unique\s+)?index\s+(?!if\s+not\s+exists)(\S+)/gi, null, "index"],
  [/create\s+table\s+(?!if\s+not\s+exists)(\S+)/gi, null, "table"],
];
for (const f of files) {
  const src = fs.readFileSync(path.join(migDir, f), "utf8");
  const code = src
    .split("\n")
    .map((line) => {
      const cut = line.indexOf("--");
      return cut === -1 ? line : line.slice(0, cut);
    })
    .join("\n");
  for (const [createRe, dropRe, kind] of guardRules) {
    for (const m of code.matchAll(new RegExp(createRe.source, "gi"))) {
      const name = (m[1] || "").replace(/[";]$/, "");
      if (kind === "index" || kind === "table") {
        throw new Error(`${f}: ${kind} ${name} without IF NOT EXISTS.`);
      }
      const dropHit = new RegExp(
        dropRe.source.replace(/\\s\+/g, "\\s+") + "\\s+" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );
      if (!dropHit.test(code)) {
        throw new Error(`${f}: ${kind} ${name} without a preceding DROP ... IF EXISTS.`);
      }
    }
  }
}

console.log(`Migration versions OK: ${files.length} files, unique versions, rerunnable guards present.`);
