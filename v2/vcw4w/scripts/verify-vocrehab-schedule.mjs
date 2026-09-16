/**
 * verify-vocrehab-schedule.mjs — schedule-juggle (DS-SJ) integrity verifier.
 *
 * Three gates, no retries, no dependencies (node builtins only):
 *  1-presence, every one of the 14 SJ content files owned by envelopes
 *   DS-SJ-01..DS-SJ-14 exists on disk (lib engines, travel API route,
 *   vocrehab-schedule components);
 *  2-envelopes, every TASKS/DS-SJ-*.json parses as JSON;
 *  3-no-secrets, no `GOOGLE_MAPS_API_KEY=<real-value>` under public/swarm —
 *   only the `<placeholder>` form (`GOOGLE_MAPS_API_KEY=<...>`) is allowed
 *   there; the server-only key lives in app/api (DS-SJ-06), never in public/.
 * Prints PASS/FAIL counts; exit 0 only when all three gates hold, else
 * exit 1 with FAIL lines naming the file (file:line for secret hits).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, ".."); // v2/vcw4w

let passCount = 0;
let failCount = 0;
function ok(msg) {
  passCount++;
  console.log(`[vocrehab-schedule] PASS: ${msg}`);
}
function fail(msg) {
  failCount++;
  console.log(`[vocrehab-schedule] FAIL: ${msg}`);
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next" || e.name === ".git") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const rel = (p) => path.relative(root, p).replace(/\\/g, "/");

// ---------- Gate 1: all 14 SJ files exist (DS-SJ-01..DS-SJ-14 scopes) ----------
const SJ_FILES = [
  "lib/vocrehab-schedule-calendar.ts", // DS-SJ-01 calendar engine
  "lib/vocrehab-schedule-activities.ts", // DS-SJ-02 activities lib
  "lib/vocrehab-schedule-burdens.ts", // DS-SJ-03 burdens engine
  "lib/vocrehab-schedule-presets.ts", // DS-SJ-04 geo presets
  "lib/vocrehab-travel-estimate.ts", // DS-SJ-05 travel fallback
  "app/api/vocrehab/travel/route.ts", // DS-SJ-06 travel API route
  "components/vocrehab/vocrehab-schedule-month.tsx", // DS-SJ-07 month grid UI
  "components/vocrehab/vocrehab-schedule-day.tsx", // DS-SJ-08 24h day UI
  "components/vocrehab/vocrehab-schedule-addresses.tsx", // DS-SJ-09 address book UI
  "components/vocrehab/vocrehab-schedule-store.ts", // DS-SJ-10 store hook
  "components/vocrehab/vocrehab-schedule-palette.tsx", // DS-SJ-11 palette + burdens UI
  "components/vocrehab/vocrehab-schedule-travel.tsx", // DS-SJ-12 travel panel UI
  "components/vocrehab/vocrehab-schedule-controls.tsx", // DS-SJ-13 controls UI
  "components/vocrehab/vocrehab-schedule-persist.tsx", // DS-SJ-14 save/load UI
];

{
  const missing = SJ_FILES.filter((f) => !fs.existsSync(path.join(root, f)));
  for (const f of missing) fail(`missing SJ file: ${f}`);
  if (!missing.length) ok(`all ${SJ_FILES.length} SJ files exist (DS-SJ-01..14 scopes)`);
}

// ---------- Gate 2: all TASKS/DS-SJ-*.json parse ----------
{
  const dir = path.join(root, "public", "swarm", "TASKS");
  let names = [];
  try {
    names = fs
      .readdirSync(dir)
      .filter((n) => /^DS-SJ-.*\.json$/.test(n))
      .sort();
  } catch (e) {
    fail(`cannot list TASKS dir: ${e.message}`);
  }
  if (!names.length) {
    fail("no TASKS/DS-SJ-*.json envelopes found");
  } else {
    let parsed = 0;
    for (const n of names) {
      try {
        JSON.parse(fs.readFileSync(path.join(dir, n), "utf8"));
        parsed++;
      } catch (e) {
        fail(`envelope ${n} does not parse: ${e.message}`);
      }
    }
    if (parsed === names.length) ok(`all ${names.length} DS-SJ envelopes parse`);
  }
}

// ---------- Gate 3: no real GOOGLE_MAPS_API_KEY values under public/swarm ----------
{
  const swarmDir = path.join(root, "public", "swarm");
  // Placeholder form GOOGLE_MAPS_API_KEY=<...> is allowed; anything else
  // after the `=` (a real key pasted into world-readable files) fails.
  const secretRe = /GOOGLE_MAPS_API_KEY=([^<])/g;
  const hits = [];
  if (!fs.existsSync(swarmDir)) {
    fail("public/swarm dir MISSING — cannot run secret scan");
  } else {
    for (const p of walk(swarmDir)) {
      let src;
      try {
        src = fs.readFileSync(p, "utf8");
      } catch {
        continue; // unreadable (binary/locked) — skip, never fail the gate
      }
      const lines = src.split("\n");
      const starts = [];
      let acc = 0;
      for (const l of lines) {
        starts.push(acc);
        acc += l.length + 1;
      }
      const lineOf = (idx) => {
        let lo = 0;
        let hi = starts.length - 1;
        while (lo < hi) {
          const mid = (lo + hi + 1) >> 1;
          if (starts[mid] <= idx) lo = mid;
          else hi = mid - 1;
        }
        return lo + 1;
      };
      for (const m of src.matchAll(secretRe)) {
        hits.push(`${rel(p)}:${lineOf(m.index)} real GOOGLE_MAPS_API_KEY value`);
      }
    }
    for (const h of hits) fail(h);
    if (!hits.length) ok("no real GOOGLE_MAPS_API_KEY values under public/swarm");
  }
}

console.log(`[vocrehab-schedule] summary: ${passCount} PASS, ${failCount} FAIL`);
if (failCount) {
  console.error(`[vocrehab-schedule] FAILED (${failCount} failure(s))`);
  process.exitCode = 1;
} else {
  console.log("[vocrehab-schedule] OK: schedule-juggle files, envelopes, and secret scan all green");
}
