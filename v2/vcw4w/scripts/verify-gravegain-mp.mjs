// Verifies the GraveGain multiplayer migration (gravegain1d/2d/3d).
//
// Asserts:
//   1. Migration file supabase/migrations/*_gravegain_multiplayer.sql exists.
//   2. It defines the contract objects: gravegain_quick_match, game_mp_events,
//      post_mp_event, read_mp_events.
//   3. It is re-runnable (IF NOT EXISTS / OR REPLACE guards present).
//   4. package.json wires verify:gravegain-mp and the test chain includes it.
//
// Static text asserts (no DB needed).
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
let failures = 0;

function check(label, cond, hint = "") {
  if (cond) {
    console.log(`  ok: ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL: ${label}${hint ? ` - ${hint}` : ""}`);
  }
}

function read(rel) {
  return readFileSync(join(root, ...rel.split("/")), "utf8");
}

// ---- 1. migration file exists ----
const migDir = join(root, "supabase", "migrations");
const migFiles = existsSync(migDir)
  ? readdirSync(migDir).filter((f) => f.endsWith("_gravegain_multiplayer.sql"))
  : [];
check("migration *gravegain_multiplayer.sql exists", migFiles.length === 1, `found ${migFiles.length}`);
const mig = migFiles.length === 1 ? read(`supabase/migrations/${migFiles[0]}`) : "";

// ---- 2. contract object names ----
for (const name of ["gravegain_quick_match", "game_mp_events", "post_mp_event", "read_mp_events"]) {
  check(`migration defines ${name}`, mig.includes(name));
}

// ---- 3. re-runnable guards ----
check("migration uses IF NOT EXISTS", /if\s+not\s+exists/i.test(mig));
check("migration uses OR REPLACE", /or\s+replace/i.test(mig));

// ---- 4. package.json wiring ----
const pkg = JSON.parse(read("package.json"));
check(
  "package.json wires verify:gravegain-mp",
  pkg.scripts && pkg.scripts["verify:gravegain-mp"] === "node scripts/verify-gravegain-mp.mjs"
);
check(
  "npm test runs verify:gravegain-mp",
  typeof pkg.scripts.test === "string" && pkg.scripts.test.includes("verify:gravegain-mp")
);

if (failures) {
  console.error(`verify-gravegain-mp FAILED: ${failures} check(s).`);
  process.exit(1);
}
console.log("verify-gravegain-mp OK: gravegain multiplayer match + events wired.");
