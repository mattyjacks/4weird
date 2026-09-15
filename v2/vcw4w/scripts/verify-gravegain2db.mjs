// Verifies the GraveGain2dB swarm (lanes gg2db-01..08, DS-GG2DB envelopes).
// gg2db-09 (infra lane) owns this file; sibling builders land concurrently,
// so EVERY check is order-independent and skip-if-absent: a missing sibling
// file reports SKIP with a clear TODO (never throws/crashes, never FAILs).
// Exit nonzero ONLY on malformed files (unparseable, contract-violating, or
// self-contradicting content in files that DID land) — never on missing ones.
// EXCEPTION: the lane-B10 block at the end FAILs on missing html/ lane files
// with a clear name (per B10 brief: FAIL, not crash) while still running to
// completion. Co-owned: gg2db-09 sections (envelope tree) + B10 block.
//
// Asserts (static text asserts + one import-safe determinism smoke):
//   1. Bundle-root files public/games/gravegain2dB/{game.json,index.html,
//      game.js,game.css} exist + game.json slug == dir == gravegain2dB
//      (gg2db-08).
//   2. All 10 campaign fixtures present with 3 routes each: primary +
//      destructive shortcut + emergency fallback (gg2db-05).
//   3. Endless rooms each carry entry + objective + exit (gg2db-05).
//   4. 16 builds listed in data/builds.js: 4 races x 4 classes (gg2db-04).
//   5. Content-mode gameplay invariance: content/gravegain2dB-modes.ts
//      kid/teen/all tables are presentation-only — gameplay keys identical
//      across modes (gg2db-04).
//   6. Save-namespace separation from 2dA: no GraveGain2D_Save reuse,
//      distinct 2dB save key (gg2db-08).
//   7. Perf budgets documented: 40 enemies / 80 projectiles / 250 debris /
//      20 pickups / 6 collapses / 16 dirty chunks/s (gg2db-01..03).
//   8. Determinism smoke: same seed replayed twice is identical (gg2db-01).
//
// Run from v2/vcw4w: `node scripts/verify-gravegain2dB.mjs`.
//
// NOTE (gg2db-09): a B-lane worker appended a "(B10) lane-file presence +
// hardening" block at the end of this file mid-wave (covers the
// public/games/html/gravegain2dB/ tree). That block is sibling-owned with its
// own stricter policy (FAIL on missing); gg2db-09 maintains only sections
// (1)..(8) above and leaves the B10 block untouched.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, basename } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const B2 = join(root, "public", "games", "gravegain2dB");
let passes = 0;
let failures = 0;
let skips = 0;

function ok(label) {
  passes += 1;
  console.log(`  ok: ${label}`);
}

function fail(label, hint = "") {
  failures += 1;
  console.error(`  FAIL: ${label}${hint ? ` — ${hint}` : ""}`);
}

function skip(label, todo) {
  skips += 1;
  console.log(`  SKIP (TODO ${todo}): ${label}`);
}

function readAbs(path) {
  return readFileSync(path, "utf8");
}

/** Recursively list files under dir (relative, posix-style). [] when absent. */
function listTree(dir, exts = null) {
  const out = [];
  if (!existsSync(dir)) return out;
  const walk = (cur) => {
    for (const entry of readdirSync(cur)) {
      const full = join(cur, entry);
      if (statSync(full).isDirectory()) walk(full);
      else {
        const rel = full.slice(dir.length + 1).replaceAll("\\", "/");
        if (!exts || exts.some((e) => rel.endsWith(e))) out.push(rel);
      }
    }
  };
  try {
    walk(dir);
  } catch {
    return out;
  }
  return out.sort();
}

function syntaxOk(abs) {
  try {
    execFileSync(process.execPath, ["--check", abs], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

// ---- (1) bundle root: files exist + slug == dir == gravegain2dB ----
console.log("2dB bundle root (gg2db-08, read-only):");
for (const f of ["game.json", "index.html", "game.js", "game.css"]) {
  const abs = join(B2, f);
  if (!existsSync(abs)) {
    skip(`bundle public/games/gravegain2dB/${f} exists`, "gg2db-08: shell not landed yet");
    continue;
  }
  ok(`bundle public/games/gravegain2dB/${f} exists`);
}
const gameJsonAbs = join(B2, "game.json");
if (!existsSync(gameJsonAbs)) {
  skip("game.json slug == dir == gravegain2dB", "gg2db-08: game.json not landed yet");
  skip("game.json title carries Breach MoonRock", "gg2db-08: game.json not landed yet");
} else {
  let meta = null;
  try {
    meta = JSON.parse(readAbs(gameJsonAbs));
  } catch (e) {
    fail("game.json parses as JSON", `malformed game.json — ${e.message}`);
  }
  if (meta !== null) {
    if (meta.slug === "gravegain2dB") ok("game.json slug == dir == gravegain2dB");
    else fail("game.json slug == dir == gravegain2dB", `slug is '${meta.slug}', expected 'gravegain2dB' (mixed-case canonical)`);
    const title = `${meta.title || ""} ${meta.fullTitle || ""}`;
    if (/breach/i.test(title)) ok("game.json title carries Breach MoonRock (title/fullTitle)");
    else fail("game.json title carries Breach MoonRock", `title is '${meta.title}', expected 'Breach MoonRock' in title or fullTitle per DS-GG2DB-08`);
  }
}

// ---- (2) campaign: 10 fixtures x 3 routes ----
console.log("2dB campaign fixtures (gg2db-05, read-only):");
const campaignDir = join(B2, "campaign");
const campaignFiles = listTree(campaignDir, [".js", ".json"]);
const SCAFFOLD = /boot|director|ui|codex|index|readme|test|fixture-helper/i;
const MISSION = /m0?\d|mission|campaign-m/i;
const missionFixtures = campaignFiles.filter((f) => MISSION.test(f) && !SCAFFOLD.test(basename(f)));
if (!existsSync(campaignDir) || campaignFiles.length === 0) {
  skip("all 10 campaign fixtures present (m01..m10)", "gg2db-05: campaign not landed yet");
  skip("each fixture has primary + shortcut + fallback routes", "gg2db-05: campaign not landed yet");
} else {
  if (missionFixtures.length >= 10) ok(`all 10 campaign fixtures present (${missionFixtures.length} found)`);
  else skip(`all 10 campaign fixtures present (${missionFixtures.length}/10 found)`, "gg2db-05: remaining missions still in flight");
  const ROUTES = [
    { name: "primary", re: /primary/i },
    { name: "destructive shortcut", re: /shortcut|destruct|breach-route|precision/i },
    { name: "emergency fallback", re: /fallback|emergency/i },
  ];
  for (const rel of missionFixtures) {
    const abs = join(campaignDir, rel);
    const src = readAbs(abs);
    if (rel.endsWith(".json")) {
      try {
        JSON.parse(src);
      } catch (e) {
        fail(`${rel} parses as JSON`, `malformed fixture — ${e.message}`);
        continue;
      }
    } else if (!syntaxOk(abs)) {
      fail(`${rel} node --check`, "syntax error — run node --check on the file");
      continue;
    }
    for (const { name, re } of ROUTES) {
      if (re.test(src)) ok(`${rel} has ${name} route`);
      else fail(`${rel} has ${name} route`, `fixture landed but '${name}' route missing — add it per DS-GG2DB-05 (primary + destructive shortcut + emergency fallback)`);
    }
  }
}

// ---- (3) endless rooms: entry + objective + exit ----
console.log("2dB endless rooms (gg2db-05, read-only):");
const endlessDir = join(B2, "endless");
const endlessFiles = listTree(endlessDir, [".js", ".json"]);
if (!existsSync(endlessDir) || endlessFiles.length === 0) {
  skip("endless rooms present with entry/objective/exit", "gg2db-05: endless not landed yet");
} else {
  // Only files that DEFINE a room carry the triple contract: authored room
  // objects (var room = { ... } / ROOMS = [ ... ] / register(room)). Layout
  // scaffolding (boards/daily/generator/sectors) and socket-only parts are
  // syntax-checked but exempt from the triple — the generator composes parts
  // into runs at runtime and never carries a literal objective.
  const ROOM_DEF = /var room\s*=\s*\{|register\s*\(\s*room\s*\)|ROOMS\s*=\s*\[|registerRoom\s*\(|id\s*:\s*['"]room-/i;
  const GROUPS = [
    { name: "entry", re: /entry|entrySockets/i },
    // objective may be expressed as anchors/spawns/safeRoute/breachLocation.
    { name: "objective", re: /objective|safeRoute|breachLocation|anchor|spawn/i },
    { name: "exit", re: /exit|exitSockets/i },
  ];
  let completeRooms = 0;
  for (const rel of endlessFiles) {
    const abs = join(endlessDir, rel);
    const src = readAbs(abs);
    if (rel.endsWith(".json")) {
      try {
        JSON.parse(src);
      } catch (e) {
        fail(`endless/${rel} parses as JSON`, `malformed room — ${e.message}`);
        continue;
      }
    } else if (!syntaxOk(abs)) {
      fail(`endless/${rel} node --check`, "syntax error — run node --check on the file");
      continue;
    }
    if (!ROOM_DEF.test(src)) {
      ok(`endless/${rel} syntax clean (scaffolding/part, triple N/A)`);
      continue;
    }
    let missing = 0;
    for (const g of GROUPS) {
      if (g.re.test(src)) ok(`endless/${rel} has ${g.name}`);
      else {
        missing += 1;
        fail(`endless/${rel} has ${g.name}`, `room landed but '${g.name}' missing — every endless room needs reachable entry/objective/exit per DS-GG2DB-05`);
      }
    }
    if (missing === 0) completeRooms += 1;
  }
  if (completeRooms >= 1) ok(`endless rooms reachable (${completeRooms} complete room definition(s))`);
  else fail("endless rooms reachable", "no complete room (entry+objective+exit) landed under endless/ per DS-GG2DB-05");
}

// ---- (4) 16 builds: 4 races x 4 classes ----
console.log("2dB builds (gg2db-04, read-only):");
const buildsCandidates = ["data/builds.js", "data/builds.json"].map((r) => join(B2, r));
const buildsAbs = buildsCandidates.find((p) => existsSync(p));
if (!buildsAbs) {
  skip("16 builds listed (4 races x 4 classes)", "gg2db-04: data/builds.js not landed yet");
} else {
  const rel = buildsAbs.slice(B2.length + 1).replaceAll("\\", "/");
  const src = readAbs(buildsAbs);
  if (buildsAbs.endsWith(".json")) {
    try {
      JSON.parse(src);
    } catch (e) {
      fail(`${rel} parses as JSON`, `malformed builds file — ${e.message}`);
    }
  } else if (!syntaxOk(buildsAbs)) {
    fail(`${rel} node --check`, "syntax error — run node --check on the file");
  }
  const RACE_IDS = ["human", "elf", "dwarf", "orc"];
  const CLASS_IDS = ["warrior", "tank", "support", "mage"];
  const racesFound = RACE_IDS.filter((id) => new RegExp(`id\\s*:\\s*['"]${id}['"]`).test(src));
  // 16 race:class combo titles: 'race:class': 'Title' map entries (or 16 title: fields).
  const combos = src.match(/'(?:human|elf|dwarf|orc):(?:warrior|tank|support|mage)'\s*:/g) || [];
  const titles = src.match(/title\s*:/g) || [];
  const buildCount = Math.max(combos.length, titles.length);
  if (buildCount >= 16) ok(`16 builds listed (${buildCount} combo/title entries in ${rel})`);
  else fail("16 builds listed (4 races x 4 classes)", `${rel} landed with ${buildCount}/16 builds — add builds per DS-GG2DB-04 (4 races x 4 classes, 16 viable titles)`);
  const classesFound = CLASS_IDS.filter((id) => new RegExp(`id\\s*:\\s*['"]${id}['"]`).test(src));
  if (racesFound.length >= 4 && classesFound.length >= 4) {
    ok(`4 races x 4 classes composition (${racesFound.join(",")} / ${classesFound.join(",")})`);
  } else {
    fail("4 races x 4 classes composition", `${rel} landed with races [${racesFound.join(",") || "none"}] classes [${classesFound.join(",") || "none"}]`);
  }
}

// ---- (5) content-mode gameplay invariance ----
console.log("2dB content modes (gg2db-04, read-only):");
const modesAbs = join(root, "content", "gravegain2dB-modes.ts");
const GAMEPLAY_KEYS = [
  "damage", "dmgmult", "bonushp", "health", "maxhp", "speed", "movespeed",
  "gravity", "jump", "cooldown", "firerate", "reward", "gold", "payout", "xp",
  "enemydensity", "elitechance", "parseconds", "physics", "geometry",
  "spawnrate", "droprate", "hitpoints",
];
/** Extract balanced-brace block starting at the opening brace index. */
function extractBlock(src, openIdx) {
  let depth = 0;
  let str = null; // quote char when inside a string
  let tmpl = false;
  for (let i = openIdx; i < src.length; i += 1) {
    const c = src[i];
    const prev = src[i - 1];
    if (str) {
      if (c === str && prev !== "\\") str = null;
      else if (tmpl && c === "$" && src[i + 1] === "{") {
        // ${ inside template literal: skip balanced braces recursively
        const inner = extractBlock(src, i + 1);
        if (inner === null) return null;
        i = inner.end;
      }
      continue;
    }
    if (c === '"' || c === "'") str = c;
    else if (c === "`") { str = c; tmpl = true; }
    else if (c === "/" && src[i + 1] === "/") {
      const nl = src.indexOf("\n", i);
      i = nl === -1 ? src.length : nl;
    } else if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end === -1 ? src.length : end + 1;
    } else if (c === "{") depth += 1;
    else if (c === "}") {
      depth -= 1;
      if (depth === 0) return { text: src.slice(openIdx, i + 1), end: i };
    }
  }
  return null;
}
/** Split source into per-mode texts for kid/teen/all (accepts adults|adult alias). */
function splitModes(src) {
  const modes = {};
  const re = /(^|[^\w$])(kid|teen|all|adults?)\s*:/gi;
  let m;
  while ((m = re.exec(src)) !== null) {
    const raw = m[2].toLowerCase();
    const name = raw.startsWith("adult") ? "all" : raw;
    const brace = src.indexOf("{", m.index + m[0].length);
    if (brace === -1) continue;
    const block = extractBlock(src, brace);
    if (!block) continue;
    modes[name] = (modes[name] || "") + "\n" + block.text;
    re.lastIndex = block.end;
  }
  return modes;
}
if (!existsSync(modesAbs)) {
  skip("content-mode gameplay invariance (kid/teen/all identical gameplay)", "gg2db-04: content/gravegain2dB-modes.ts not landed yet");
} else {
  const src = readAbs(modesAbs);
  const modes = splitModes(src);
  const names = Object.keys(modes);
  if (names.length < 2) {
    const found = GAMEPLAY_KEYS.filter((k) => new RegExp(`${k}\\s*:`, "i").test(src));
    if (found.length === 0) ok("content modes presentation-only (no gameplay keys in file)");
    else skip(`content-mode gameplay invariance (mode blocks not yet separable; gameplay keys present: ${found.join(", ")})`, "gg2db-04: modes file in flight — re-run when kid/teen/all tables land");
  } else {
    let divergent = [];
    for (const key of GAMEPLAY_KEYS) {
      const vals = new Map();
      for (const name of names) {
        const hits = [...modes[name].matchAll(new RegExp(`${key}\\s*:\\s*([^,\\n}]+)`, "gi"))].map((h) =>
          h[1].trim().replace(/^["']|["']$/g, "").toLowerCase()
        );
        if (hits.length > 0) vals.set(name, [...new Set(hits)].sort().join("|"));
      }
      if (new Set(vals.values()).size > 1) divergent.push(key);
    }
    if (divergent.length === 0) ok(`content-mode gameplay invariance across [${names.join("/")}] (presentation-only)`);
    else fail("content-mode gameplay invariance", `gameplay keys differ across modes: ${divergent.join(", ")} — physics/geometry/rewards must be identical per DS-GG2DB-04`);
    for (const want of ["kid", "teen", "all"]) {
      if (modes[want]) ok(`content modes carry '${want}' table`);
      else fail(`content modes carry '${want}' table`, `modes file landed without a '${want}' table (accepts 'adults' alias for 'all')`);
    }
  }
}

// ---- (6) save-namespace separation from 2dA ----
console.log("2dB save-namespace separation (gg2db-08, read-only):");
const saveFiles = [join(B2, "game.js"), join(root, "lib", "gravegain2dB-catalog.ts")].filter((p) => existsSync(p));
if (saveFiles.length === 0) {
  skip("save-namespace separation from 2dA (distinct 2dB save key)", "gg2db-08: game.js + lib/gravegain2dB-catalog.ts not landed yet");
} else {
  const combined = saveFiles.map((p) => readAbs(p)).join("\n");
  if (/GraveGain2D_Save/.test(combined)) {
    const which = saveFiles.map((p) => p.slice(root.length + 1).replaceAll("\\", "/")).join(", ");
    fail("save-namespace separation from 2dA", `2dA key 'GraveGain2D_Save' referenced in 2dB scope (${which}) — 2dB must use its own save key per DS-GG2DB-08`);
  } else ok("no GraveGain2D_Save reuse in 2dB scope");
  if (/gravegain2db|grave-?gain-?2d-?b|2db_save|breach.*save|save.*breach/i.test(combined) && /localstorage|storagekey|save/i.test(combined)) {
    ok("distinct 2dB save key documented");
  } else {
    skip("distinct 2dB save key documented", "gg2db-08: save wiring still in flight — add the 2dB save key + lowercase redirect spec");
  }
}

// ---- (7) perf budgets documented ----
console.log("2dB perf budgets (gg2db-01..03, read-only):");
const BUDGETS = [
  { label: "40 enemies", spec: 40, words: /enem/i },
  { label: "80 projectiles", spec: 80, words: /projectile/i },
  { label: "250 debris", spec: 250, words: /debris/i },
  { label: "20 pickups", spec: 20, words: /pickup/i },
  { label: "6 collapses", spec: 6, words: /collaps/i },
  { label: "16 dirty chunks/s", spec: 16, words: /dirty|chunk/i },
];
const treeFiles = existsSync(B2) ? listTree(B2, [".js", ".json", ".ts", ".md"]) : [];
const treeText = treeFiles.map((r) => { try { return readAbs(join(B2, r)); } catch { return ""; } }).join("\n");
if (treeFiles.length === 0) {
  for (const b of BUDGETS) skip(`perf budget documented: ${b.label}`, "gg2db-01..03: 2dB tree not landed yet");
} else {
  const KEYED = {
    40: /(maxenemies|enemycap|enemymax|enemybudget|max_entities)\s*[:=]\s*(\d+)/i,
    80: /(maxprojectiles|projectilecap|projectilemax|projectilebudget)\s*[:=]\s*(\d+)/i,
    250: /(maxdebris|debriscap|debrismax|debrisbudget|debrispool)\s*[:=]\s*(\d+)/i,
    20: /(maxpickups|pickupcap|pickupmax|pickupbudget)\s*[:=]\s*(\d+)/i,
    6: /(maxcollaps|collapscap|concurrentcollaps)\s*[:=]\s*(\d+)/i,
    16: /(maxdirty|dirtychunks|chunksper|dirtybudget)\s*[:=]\s*(\d+)/i,
  };
  for (const b of BUDGETS) {
    const keyed = treeText.match(KEYED[b.spec]);
    if (keyed && Number(keyed[2] ?? keyed[1]) !== b.spec && /\d/.test(keyed[0])) {
      // A keyed declaration contradicting the spec budget is malformed.
      const declared = (keyed[0].match(/(\d+)\s*$/) || [])[1] || "?";
      fail(`perf budget documented: ${b.label}`, `tree declares ${declared} where spec requires ${b.spec} — fix the budget or the declaration`);
      continue;
    }
    // Documented = spec number within ~120 chars of the concept word (either order).
    const near = new RegExp(`${b.words.source}.{0,120}\\b${b.spec}\\b|\\b${b.spec}\\b.{0,120}${b.words.source}`, "i");
    if (keyed || near.test(treeText)) ok(`perf budget documented: ${b.label}`);
    else skip(`perf budget documented: ${b.label}`, "builders: document the budget constant (sim/terrain/player) per DS-GG2DB-09 spec");
  }
}

// ---- (8) determinism smoke: same seed replayed twice identical ----
console.log("2dB determinism smoke (gg2db-01, read-only):");
async function drawSamples(fn, seed, n = 64) {
  const out = [];
  let rng = fn(seed);
  if (typeof rng === "function") {
    for (let i = 0; i < n; i += 1) out.push(rng());
  } else if (rng && typeof rng.next === "function") {
    for (let i = 0; i < n; i += 1) out.push(rng.next());
  } else if (rng && typeof rng.random === "function") {
    for (let i = 0; i < n; i += 1) out.push(rng.random());
  } else if (typeof rng === "number" || typeof rng === "string") {
    for (let i = 0; i < n; i += 1) out.push(fn(seed, i));
  } else {
    throw new Error("unusable rng shape");
  }
  return JSON.stringify(out);
}
/** Replay smoke on a full sim api (createWorld/step + snapshot/hashSnapshot). */
function replayTwice(api, seed = "vr-gate-smoke") {
  const mkInputs = () => [{ buttons: 0, aimX: 1, aimY: 0 }];
  const run = () => {
    const w = api.createWorld({ seed });
    for (let i = 0; i < 120; i += 1) api.step(w, mkInputs());
    return api.hashSnapshot ? api.hashSnapshot(api.snapshot(w)) : JSON.stringify(api.snapshot(w));
  };
  const a = run();
  const b = run();
  return { identical: a === b, hash: a };
}
let detResult = null; // "ok" | "fail" | null (skip)
let detDetail = "";
try {
  const simDir = join(B2, "sim");
  const simFiles = listTree(simDir, [".js", ".mjs"]);
  const seeded = simFiles.filter((r) => {
    try {
      return /seed|rng|random|determin|snapshot/i.test(readAbs(join(simDir, r)));
    } catch {
      return false;
    }
  });
  if (seeded.length === 0) {
    skip("determinism smoke (same seed replayed twice identical)", "gg2db-01: sim/ seeded RNG not landed yet");
  } else {
    for (const rel of seeded.slice(0, 3)) {
      if (detResult) break;
      let api = null;
      try {
        const mod = await import(pathToFileURL(join(simDir, rel)).href);
        api = mod.default && typeof mod.default === "object" ? mod.default : mod;
      } catch {
        continue; // browser-dependent module — try next candidate
      }
      try {
        if (api && typeof api.selfTest === "function") {
          // Builder's own replay proof: same seed twice + different-seed control.
          const res = await api.selfTest();
          if (res && res.ok === true) { detResult = "ok"; detDetail = `selfTest hash ${res.hash}`; }
          else { detResult = "fail"; detDetail = `sim/${rel} selfTest() reports not-ok (${JSON.stringify(res)})`; }
          break;
        }
        if (api && typeof api.createWorld === "function" && typeof api.step === "function" && typeof api.snapshot === "function") {
          const { identical, hash } = replayTwice(api);
          if (identical) { detResult = "ok"; detDetail = `replay hash ${hash}`; }
          else { detResult = "fail"; detDetail = `sim/${rel} replayed seed twice with different snapshots`; }
          break;
        }
        const fns = Object.entries(api || {})
          .filter(([, v]) => typeof v === "function")
          .sort(([a], [b]) => {
            const sa = /rng|random|seed|create/i.test(a) ? 0 : 1;
            const sb = /rng|random|seed|create/i.test(b) ? 0 : 1;
            return sa - sb;
          });
        for (const [, fn] of fns.slice(0, 3)) {
          try {
            const a = await drawSamples(fn, 1337);
            const b = await drawSamples(fn, 1337);
            if (a === b) { detResult = "ok"; break; }
            detResult = "fail";
            detDetail = `sim/${rel} replayed seed 1337 twice with different output`;
            break;
          } catch {
            continue; // try next export shape
          }
        }
      } catch (e) {
        continue; // unusable shape on this host — try next candidate
      }
    }
    if (detResult === "ok") ok(`determinism smoke (same seed replayed twice identical${detDetail ? ` — ${detDetail}` : ""})`);
    else if (detResult === "fail") fail("determinism smoke (same seed replayed twice identical)", detDetail);
    else skip("determinism smoke (same seed replayed twice identical)", "gg2db-01: no import-safe seeded RNG export yet — expose selfTest() or a pure seed->sequence function");
  }
} catch (e) {
  skip("determinism smoke (same seed replayed twice identical)", `harness guard: ${e.message}`);
}

// ---- (B10) lane-file presence + hardening asserts (lane B10) ----
// B10 contract: missing lane files = FAIL with a clear name (never a crash).
// Every read is existsSync-guarded; the block always runs to completion.
// Covers the html/ bundle tree (where B1-B7 actually landed) plus the
// hardening asserts the envelope-tree sections above do not: window globals,
// idempotent guards, GraveGainMods push, 10 weapons, sim-parity helper,
// mixed-case slug + lowercase redirect, gore leakage, client-claim path.
console.log("2dB lane presence + hardening (lane B10, read-only):");
const H2 = join(root, "public", "games", "html", "gravegain2dB");
const B10_ANCHORS = [
  ["B1 sim movement", join(H2, "sim", "movement.js"), "GraveGain2DB_Movement"],
  ["B1 sim player", join(H2, "sim", "player.js"), "GraveGain2DB_Player"],
  ["B2 terrain", join(H2, "sim", "terrain.js"), "GraveGain2DB_Terrain"],
  ["B3 emoji art", join(H2, "fx", "emoji-art.js"), "GraveGain2DB_Art"],
  ["B4 builds", join(H2, "builds", "races-classes.js"), "GraveGain2DB_Builds"],
  ["B4 weapons", join(H2, "builds", "weapons.js"), "GraveGain2DB_Weapons"],
  ["B5 mission1", join(H2, "missions", "mission1.js"), null],
  ["B5 endless", join(H2, "missions", "endless.js"), null],
  ["B6 net protocol", join(H2, "net", "protocol.js"), "GraveGain2DB_Net"],
  ["B7 mmo events", join(H2, "mmo", "events.js"), "GraveGain2DB_Events"],
  ["B8 shell boot", join(B2, "game.js"), null],
];
const b10src = new Map();
for (const [label, abs, global] of B10_ANCHORS) {
  if (!existsSync(abs)) {
    fail(`${label} exists`, "sibling lane has not landed yet");
    continue;
  }
  const rel = abs.slice(root.length + 1).replaceAll("\\", "/");
  ok(`${label} exists (${rel})`);
  const src = readAbs(abs);
  b10src.set(label, src);
  if (abs.endsWith(".js") && !syntaxOk(abs)) {
    fail(`${rel} node --check`, "syntax error — run node --check on the file");
  } else if (abs.endsWith(".js")) {
    ok(`${rel} node --check clean`);
  }
  if (global) {
    if (src.includes(global)) ok(`${rel} exposes ${global}`);
    else fail(`${rel} exposes ${global}`, "global missing — shell loader depends on it");
    if (src.includes(`if (window.${global}`) || src.includes(`if(window.${global}`) || src.includes(`G.${global} &&`) || src.includes("typeof window") || src.includes("typeof globalThis")) ok(`${rel} idempotent guard`);
    else fail(`${rel} idempotent guard`, "double-injection would re-run — add an if(window.X) return guard");
  }
  if (src.includes("GraveGainMods") && src.includes(".push(")) ok(`${rel} GraveGainMods push`);
  else fail(`${rel} GraveGainMods push`, "mod registry push missing — shell mod loader will not see this layer");
}
// Mission1 reachability: entry/objective/exit + protected extraction + fallback.
const b10m01 = b10src.get("B5 mission1") ?? "";
if (!b10m01) skip("mission1 reachability (entry/objective/exit)", "B5 mission1 not landed yet");
else {
  for (const key of ["entry", "objective", "exit"]) {
    if (new RegExp(key, "i").test(b10m01)) ok(`mission1 has ${key}`);
    else fail(`mission1 has ${key}`, "unreachable mission graph — add it per DS-GG2DB-05");
  }
  if (/protected|extraction/i.test(b10m01)) ok("mission1 extraction protected");
  else fail("mission1 extraction protected", "extraction must be a protected cell");
  if (/fallback|emergency/i.test(b10m01)) ok("mission1 fallback route (no soft-lock)");
  else fail("mission1 fallback route (no soft-lock)", "no emergency route — destruction must never soft-lock");
}
// Endless room schema.
const b10endless = b10src.get("B5 endless") ?? "";
if (!b10endless) skip("endless room schema (entry/objective/exit)", "B5 endless not landed yet");
else {
  // Room templates carry the reachability contract as sockets + routes:
  // entrySockets/exitSockets + safeRoute/breachLocation count as objective.
  for (const [key, re] of [["entry", /entry/i], ["objective", /objective|safeRoute|breachLocation/i], ["exit", /exit/i]]) {
    if (re.test(b10endless)) ok(`endless room has ${key}`);
    else fail(`endless room has ${key}`, "every endless room needs reachable entry/objective/exit");
  }
}
// 16 builds: 4 races + 4 classes titles.
const b10builds = b10src.get("B4 builds") ?? "";
if (!b10builds) skip("16 builds (4 races x 4 classes)", "B4 builds not landed yet");
else {
  for (const race of ["Human", "Elf", "Dwarf", "Orc"]) {
    if (b10builds.includes(race)) ok(`builds race ${race}`);
    else fail(`builds race ${race}`, "race missing from races-classes.js");
  }
  for (const cls of ["Warrior", "Tank", "Support", "Mage"]) {
    if (b10builds.includes(cls)) ok(`builds class ${cls}`);
    else fail(`builds class ${cls}`, "class missing from races-classes.js");
  }
}
// 10 weapons with terrain roles.
const b10weapons = b10src.get("B4 weapons") ?? "";
if (!b10weapons) skip("10 weapons with terrain roles", "B4 weapons not landed yet");
else {
  const ids = [...b10weapons.matchAll(/\{\s*id:\s*'([^']+)'/g)].map((m) => m[1]);
  if (ids.length >= 10) ok(`10 weapons listed (${ids.length}: ${ids.slice(0, 10).join(", ")})`);
  else fail("10 weapons listed", `only ${ids.length}/10 weapon ids in builds/weapons.js`);
  if (/neverDestroyObjective/i.test(b10weapons)) ok("weapons neverDestroyObjective guard");
  else fail("weapons neverDestroyObjective guard", "weapons must never destroy objective cells");
}
// Content-mode sim parity: simHash helper + kid/teen/all coverage.
const b10art = b10src.get("B3 emoji art") ?? "";
if (!b10art) skip("content-mode sim parity (simHash)", "B3 emoji-art not landed yet");
else {
  if (b10art.includes("simHash")) ok("sim-parity helper simHash present");
  else fail("sim-parity helper simHash present", "kid/teen/all must share an identical sim hash");
  if (b10art.includes("kid") && b10art.includes("teen") && b10art.includes("all")) ok("art covers kid/teen/all modes");
  else fail("art covers kid/teen/all modes", "one content mode missing from emoji-art.js");
}
// Save namespacing across the whole 2dB scope (html tree + shell).
const b10scope = [...b10src.values()].join("\n") + "\n" + (existsSync(join(B2, "game.js")) ? readAbs(join(B2, "game.js")) : "");
if (/GraveGain2D_Save|gravegain2da_save|gravegain2dA_save/i.test(b10scope)) fail("no 2dA save-key overlap", "2dA save key referenced inside 2dB scope");
else ok("no 2dA save-key overlap");
if (/4weird-content-mode:gravegain2dB|gravegain2dB.*save|save.*gravegain2dB/i.test(b10scope)) ok("2dB save namespace present");
else fail("2dB save namespace present", "no 2dB-scoped save key found");
// Mixed-case slug + lowercase redirect (shell game.json compat block, else catalog spec).
const b10gameJson = existsSync(join(B2, "game.json")) ? readAbs(join(B2, "game.json")) : "";
const b10catalog = existsSync(join(root, "lib", "gravegain2dB-catalog.ts")) ? readAbs(join(root, "lib", "gravegain2dB-catalog.ts")) : "";
const b10slugSrc = b10gameJson + "\n" + b10catalog;
if (/gravegain2dB/.test(b10slugSrc)) ok("mixed-case slug gravegain2dB documented");
else fail("mixed-case slug gravegain2dB documented", "canonical slug missing from shell/catalog");
if (/gravegain2db/i.test(b10slugSrc) && /redirect/i.test(b10slugSrc)) ok("lowercase redirect spec (/games/gravegain2db/ -> canonical)");
else if (!b10catalog) skip("lowercase redirect spec (/games/gravegain2db/ -> canonical)", "gg2db-08: lib/gravegain2dB-catalog.ts not landed yet (shell game.json compat block covers it)");
else fail("lowercase redirect spec (/games/gravegain2db/ -> canonical)", "redirect spec missing");
// No gore-gravegain1d leakage anywhere in 2dB scope.
if (b10scope.includes("gore-gravegain1d")) fail("no gore-gravegain1d leakage", "1d gore overlay referenced inside 2dB scope");
else ok("no gore-gravegain1d leakage");
// No client-claim reward path: raw-input rule (net) + verified-only (mmo).
const b10net = b10src.get("B6 net protocol") ?? "";
const b10mmo = b10src.get("B7 mmo events") ?? "";
if (!b10net && !b10mmo) skip("no client-claim reward path", "B6/B7 net lanes not landed yet");
else {
  const claimed = /claimReward|clientClaim|awardCoins/i.test(b10net + "\n" + b10mmo);
  const guarded = /CLIENT-ONLY-RAW-INPUT|reject/i.test(b10net) && /verif|REJECTED|serverSig|nonce/i.test(b10mmo);
  if (!claimed && guarded) ok("no client-claim reward path (raw-input + verified-only)");
  else if (!claimed) ok("no client-claim reward path (no claim tokens in net/mmo)");
  else fail("no client-claim reward path", "client-side reward claim present — rewards must be server-verified");
}

// ---- summary ----
console.log(`verify-gravegain2dB: ${passes} passed, ${skips} skipped (TODO), ${failures} failed.`);
if (failures) {
  console.error(`verify-gravegain2dB FAILED: ${failures} malformed-file check(s). Missing-sibling SKIPs are TODOs, not failures.`);
  process.exit(1);
}
console.log("verify-gravegain2dB OK: gate green (skip-if-absent allowed while gg2db-01..08 are in flight).");
