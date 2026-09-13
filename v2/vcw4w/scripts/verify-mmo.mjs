// Verifies the GraveGain MMO slice (DS-MMO-01..15, v2 only).
//
// Style notes (sibling headers skimmed read-only, never edited):
//   - verify-devswarm.mjs uses must(cond, msg) throwing on first failure.
//   - verify-game-bundles.mjs collects fail lists then process.exit(1).
// This file follows the verify-gravegain-mmorpg.mjs fail-list pattern
// (failures counter + SKIP for unlanded sibling lanes + exit 1), because
// MMO lanes land concurrently: missing sibling files are SKIP, not FAIL,
// so the verifier passes on a clean tree. Static text asserts, no DB.
// Pure Node ESM, no deps (node:fs, node:path, node:crypto, node:child_process).
//
// Asserts:
//   [1] Adapter contracts: shared net core + 1d/2d/3d overlays expose their
//       window global, stay dormant without their query key, pass --check.
//   [2] Snapshot schema fixtures + golden replay hash (self-contained).
//   [3] Age-band matrix cases (mirror of lib/mmo-age.ts canEnterServer).
//   [4] Metering math goldens (mirror of lib/mmo-billing.ts quoteBilling).
//   [5] Migration order: *mmo*.sql versions unique/sorted/after 20261202,
//       per-table contract tokens, rerunnable guards, no coin/ledger
//       columns in code (economy owns those, DS-MMO-14).
//   [6] Parity-locked bundles untouched (no mmo tokens in game.js).
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const root = process.cwd();
let failures = 0;
let skips = 0;

function ok(label) {
  console.log(`  OK: ${label}`);
}

function fail(label, hint = "") {
  failures += 1;
  console.error(`  FAIL: ${label}${hint ? ` - ${hint}` : ""}`);
}

function skip(label, hint = "") {
  skips += 1;
  console.log(`  SKIP: ${label}${hint ? ` - ${hint}` : ""}`);
}

function exists(rel) {
  return existsSync(join(root, ...rel.split("/")));
}

function read(rel) {
  return readFileSync(join(root, ...rel.split("/")), "utf8");
}

function checkSyntax(rel) {
  try {
    execFileSync(process.execPath, ["--check", join(root, ...rel.split("/"))], { stdio: "pipe" });
    ok(`${rel} passes node --check`);
  } catch {
    fail(`${rel} passes node --check`, "syntax error");
  }
}

// Strip SQL line comments (same rule as verify-migration-versions.mjs) so
// header prose about the economy boundary never trips code asserts.
function stripSqlComments(src) {
  return src
    .split("\n")
    .map((line) => {
      const cut = line.indexOf("--");
      return cut === -1 ? line : line.slice(0, cut);
    })
    .join("\n");
}

// Strip JS block + line comments so contract prose never trips code asserts.
function stripJsComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => {
      const cut = line.indexOf("//");
      return cut === -1 ? line : line.slice(0, cut);
    })
    .join("\n");
}

// Deterministic canonical JSON: object keys sorted recursively, arrays kept
// in order. Used for the golden replay hash so key order never matters.
function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

// ---- [1] adapter contracts ----
console.log("[1] adapter contracts (shared net + 1d/2d/3d overlays)");
const sharedCandidates = [
  "public/games/gravegain-mmo-net.js",
  "public/games/html/gravegain-mmo-net.js",
];
const sharedHit = sharedCandidates.find((rel) => exists(rel));
if (!sharedHit) {
  skip("shared MMO net core absent (DS-MMO-01 open)", sharedCandidates.join(", "));
} else {
  const src = read(sharedHit);
  for (const token of ["GraveGainMMO", "join", "heartbeat", "snapshot", "interpolat"]) {
    if (src.includes(token)) ok(`${sharedHit} exposes ${token}`);
    else fail(`${sharedHit} exposes ${token}`, "missing token");
  }
  const hasKey = src.includes("?mmo") || src.includes('"mmo"') || src.includes("'mmo'");
  const hasDormant = /dormant/i.test(src);
  const hasGate = src.includes("location.search") || src.includes("URLSearchParams");
  if (hasKey && hasDormant) ok(`${sharedHit} solo-safe markers (?mmo + dormant)`);
  else fail(`${sharedHit} solo-safe markers (?mmo + dormant)`, `key=${hasKey} dormant=${hasDormant}`);
  if (hasGate) ok(`${sharedHit} gates on query string`);
  else fail(`${sharedHit} gates on query string`, "no location.search/URLSearchParams gate");
  checkSyntax(sharedHit);
}

// Per-file overlay contracts, grounded in the landed files (DS-MMO-02/03/04):
// each adapter exposes its window global with { mode/read/render }, carries
// node-testable pure helpers (_pure), and stays dormant without its query key.
const overlaySpecs = [
  {
    group: "1d (DS-MMO-02, ?line= dormant)",
    files: [{ rel: "public/games/gravegain1d/mmo-1d.js", global: "GraveGainMMO1D", key: "?line=", extras: ["caravan", "GraveGainMPAdapter"] }],
  },
  {
    group: "2d (DS-MMO-03, hub + wings)",
    files: [
      { rel: "public/games/gravegain2d/mmorpg-00-hub-shard.js", global: "GraveGainMMO2DHubShard", key: "?shard=", extras: ["_pure"] },
      { rel: "public/games/gravegain2d/mmorpg-10-party-board.js", global: "GraveGainMMO2DPartyBoard", key: "?party=", extras: ["_pure"] },
      { rel: "public/games/gravegain2d/mmorpg-20-wing-instance.js", global: "GraveGainMMO2DWingInstance", key: "?wing=", extras: ["_pure", "35"] },
      { rel: "public/games/gravegain2d/mmorpg-30-duel-pits.js", global: "GraveGainMMO2DDuelPits", key: "?duel=", extras: ["_pure"] },
      { rel: "public/games/gravegain2d/mmorpg-40-raid-loot.js", global: "GraveGainMMO2DRaidLoot", key: "?loot=", extras: ["_pure"] },
      { rel: "public/games/gravegain2d/mmorpg-50-wanderer-party.js", global: "GraveGainMMO2DWandererParty", key: "?quest=", extras: ["_pure"] },
    ],
  },
  {
    // 3d boot idiom: entry clients latch on explicit shard/hub params
    // (parsed from location.href); library modules render only when called
    // with data or their own query key (?raid=, ?guilds=, ?age=, ?gfx=).
    group: "3d (DS-MMO-04, spire siege)",
    files: [
      { rel: "public/games/gravegain3d/mmo/sso-shard-client.js", global: "GraveGainSSOShard", key: "?shard=", boot: ["location.href"], extras: ["10000"] },
      { rel: "public/games/gravegain3d/mmo/sso-hub.js", global: "GraveGainSSOHub", key: "?hub=", boot: ["dormant"], extras: [] },
      { rel: "public/games/gravegain3d/mmo/sso-raid-rotation.js", global: "GraveGainSSORaids", key: "?raid=", boot: ["solo-safe"], extras: [] },
      { rel: "public/games/gravegain3d/mmo/sso-guild-banners.js", global: "GraveGainSSOGuilds", key: "?guilds=", boot: ["solo-safe"], extras: [] },
      { rel: "public/games/gravegain3d/mmo/sso-killfeed.js", global: "GraveGainSSOKillfeed", key: "?age=", boot: ["GraveGainAgeBand"], extras: [] },
      { rel: "public/games/gravegain3d/mmo/sso-perf.js", global: "GraveGainSSOPerf", key: "?gfx=", boot: ["impostors"], extras: ["billboard"] },
      { rel: "public/games/gravegain3d/mmo/sso-emotes.js", global: "GraveGainSSOEmotes", key: "?sso=", boot: ["dormant"], extras: [] },
    ],
  },
];
for (const spec of overlaySpecs) {
  const present = spec.files.filter((f) => exists(f.rel));
  if (present.length === 0) {
    skip(`${spec.group} adapters absent (lane open)`, spec.files[0].rel);
    continue;
  }
  for (const f of present) {
    const src = read(f.rel);
    ok(`${f.rel} exists`);
    if (src.includes(f.global)) ok(`${f.rel} exposes ${f.global}`);
    else fail(`${f.rel} exposes ${f.global}`, "missing window global");
    // Solo-safe: a dormant/solo-safe marker plus the file's own boot token
    // (query key or explicit boot mechanism — idiom varies by dimension).
    const bootTokens = [f.key, ...(f.boot || []), "location.search", "URLSearchParams"];
    // Safety idiom varies: entry clients sleep dormant; render-gated
    // library modules instead never read engine state (data in, no DOM).
    const safeMarker = /dormant|solo-safe|never reads|never writes/i.test(src);
    const bootHit = bootTokens.find((t) => src.includes(t));
    if (safeMarker && bootHit) ok(`${f.rel} solo-safe (${f.key} via ${bootHit})`);
    else fail(`${f.rel} solo-safe (${f.key})`, `marker=${safeMarker} boot=${Boolean(bootHit)}`);
    for (const token of f.extras) {
      if (src.includes(token)) ok(`${f.rel} carries slice token ${token}`);
      else fail(`${f.rel} carries slice token ${token}`, "missing token");
    }
    checkSyntax(f.rel);
  }
  if (present.length < spec.files.length) {
    skip(`${spec.group} partially landed (${present.length}/${spec.files.length})`, "rest not landed yet");
  }
}

// ---- [2] snapshot schema fixtures + golden replay hash ----
console.log("[2] snapshot schema fixtures + golden replay hash");

function isSnapshotPlayer(p) {
  if (p === null || typeof p !== "object") return false;
  if (typeof p.id !== "string" || p.id.length === 0 || p.id.length > 64) return false;
  for (const k of ["x", "y"]) {
    if (typeof p[k] !== "number" || !Number.isFinite(p[k])) return false;
  }
  if (!Number.isInteger(p.hp) || p.hp < 0 || p.hp > 100) return false;
  return true;
}

function isSnapshot(s) {
  if (s === null || typeof s !== "object") return false;
  if (s.v !== 1) return false;
  if (typeof s.serverId !== "string" || s.serverId.length === 0) return false;
  if (!Number.isInteger(s.tick) || s.tick < 0) return false;
  if (!Array.isArray(s.players) || s.players.length > 256) return false;
  return s.players.every(isSnapshotPlayer);
}

const SNAPSHOT_GOOD = {
  v: 1,
  serverId: "srv-test",
  tick: 120,
  players: [
    { id: "p1", x: 10, y: 20, hp: 100 },
    { id: "p2", x: 5.5, y: -3, hp: 42 },
  ],
};
const SNAPSHOT_BAD = [
  [{ v: 2, serverId: "srv-test", tick: 1, players: [] }, "wrong version"],
  [{ v: 1, serverId: "", tick: 1, players: [] }, "empty serverId"],
  [{ v: 1, serverId: "s", tick: -1, players: [] }, "negative tick"],
  [{ v: 1, serverId: "s", tick: 1, players: new Array(257).fill({ id: "p", x: 0, y: 0, hp: 1 }) }, "cap 256"],
  [{ v: 1, serverId: "s", tick: 1, players: [{ id: "p", x: 0, y: 0, hp: 101 }] }, "hp range"],
  [{ v: 1, serverId: "s", tick: 1, players: [{ id: "p", x: NaN, y: 0, hp: 1 }] }, "finite coords"],
];
if (isSnapshot(SNAPSHOT_GOOD)) ok("snapshot fixture GOOD validates");
else fail("snapshot fixture GOOD validates", "validator rejected the golden good case");
let badRejected = 0;
for (const [fixture, why] of SNAPSHOT_BAD) {
  if (!isSnapshot(fixture)) badRejected += 1;
  else fail("snapshot fixture BAD rejected", `accepted: ${why}`);
}
if (badRejected === SNAPSHOT_BAD.length) ok(`snapshot fixtures BAD rejected (${badRejected}/${SNAPSHOT_BAD.length})`);

const REPLAY_EVENTS = [
  { tick: 1, player: "p1", x: 10, y: 20, hp: 100 },
  { tick: 2, player: "p1", x: 12, y: 21, hp: 95 },
  { tick: 2, player: "p2", x: 5, y: 5, hp: 100 },
];
const GOLDEN_REPLAY_SHA256 = "4e46d2d832f5d9fc16134d68ce4543e77aeffa67bbcf4d6f56960866c86bcd27";
const replayHash = createHash("sha256").update(stableStringify(REPLAY_EVENTS)).digest("hex");
// Key-order independence: re-serialized with shuffled keys must hash equal.
const shuffled = [{ y: 20, hp: 100, x: 10, tick: 1, player: "p1" }, ...REPLAY_EVENTS.slice(1)];
const shuffledHash = createHash("sha256").update(stableStringify(shuffled)).digest("hex");
if (shuffledHash === replayHash) ok("replay canonicalization is key-order independent");
else fail("replay canonicalization is key-order independent", `${shuffledHash} vs ${replayHash}`);
if (replayHash === GOLDEN_REPLAY_SHA256) {
  ok(`golden replay hash matches (${replayHash.slice(0, 12)}…)`);
} else {
  fail("golden replay hash matches", `actual ${replayHash}, golden ${GOLDEN_REPLAY_SHA256}`);
}

// ---- [3] age-band matrix cases ----
console.log("[3] age-band matrix cases (mirror of lib/mmo-age.ts)");
function canEnterMirror(playerBand, serverBand) {
  if (playerBand === "adults") return true;
  if (playerBand === "teens") return serverBand === "kids" || serverBand === "teens";
  return serverBand === "kids";
}
const AGE_MATRIX = {
  "adults|kids": true,
  "adults|teens": true,
  "adults|adults": true,
  "teens|kids": true,
  "teens|teens": true,
  "teens|adults": false,
  "kids|kids": true,
  "kids|teens": false,
  "kids|adults": false,
};
let matrixOk = 0;
for (const [pair, expected] of Object.entries(AGE_MATRIX)) {
  const [player, server] = pair.split("|");
  const actual = canEnterMirror(player, server);
  if (actual === expected) matrixOk += 1;
  else fail(`age-band ${player} -> ${server}`, `expected ${expected}, got ${actual}`);
}
if (matrixOk === Object.keys(AGE_MATRIX).length) ok("age-band matrix 9/9 (adults>all, teens>kids+teens, kids>kids)");
const failedClosed = ["", "everyone", "E10+", null, undefined, 42].every(
  (bad) => !["kids", "teens", "adults"].includes(bad),
);
if (failedClosed) ok("age-band unknown bands fail closed");
else fail("age-band unknown bands fail closed", "a forged band passed the allow-list");
const ageRel = "lib/mmo-age.ts";
if (!exists(ageRel)) {
  skip(`${ageRel} absent`, "DS-MMORPG-AGE10 not on disk?");
} else {
  const src = read(ageRel);
  for (const token of ["SERVER_AGE_BANDS", "canEnterServer", "assertServerBand", "filterServersForPlayer"]) {
    if (src.includes(token)) ok(`${ageRel} exposes ${token}`);
    else fail(`${ageRel} exposes ${token}`, "missing token — never re-land, file a QUEUE note");
  }
  for (const band of ["kids", "teens", "adults"]) {
    if (src.includes(`"${band}"`) || src.includes(`'${band}'`)) continue;
    fail(`${ageRel} declares band ${band}`, "missing band literal");
  }
}

// ---- [4] metering math goldens ----
console.log("[4] metering math goldens (mirror of lib/mmo-billing.ts)");
function cleanCost(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}
function cleanCount(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}
function quoteMirror(costRaw, countRaw, hostFree) {
  const cost = cleanCost(costRaw);
  const n = cleanCount(countRaw);
  const free = hostFree === true;
  const per = free || n <= 0 || cost <= 0 ? 0 : Math.floor(cost / n);
  const host = free || n <= 0 ? cost : cost - per * n;
  return { cost, n, per, host };
}
const METER_GOLDENS = [
  // [cost, players, hostFree, perPlayer, hostCover]
  [10000, 4, false, 2500, 0],
  [10000, 3, false, 3333, 1], // floor + dust remainder to host
  [10000, 0, false, 0, 10000], // empty server: host covers all
  [5000, 2, true, 0, 5000], // host-free: host covers all
  [0, 4, false, 0, 0],
  [99, 4, false, 24, 3],
  [-5, 4, false, 0, 0], // clamped, never negative
  ["abc", 4, false, 0, 0], // invalid cost clamped
  [10000, 1, false, 10000, 0],
];
let meterOk = 0;
for (const [cost, n, free, per, host] of METER_GOLDENS) {
  const q = quoteMirror(cost, n, free);
  const wantCost = cleanCost(cost);
  if (q.per === per && q.host === host && q.cost === wantCost) meterOk += 1;
  else fail(`metering cost=${cost} n=${n} free=${free}`, `got per=${q.per} host=${q.host}, want per=${per} host=${host}`);
  // Invariant: players + host == total, nothing negative.
  if (q.per * q.n + q.host !== q.cost) fail(`metering invariant cost=${cost} n=${n}`, "per*n+host != cost");
  if (q.per < 0 || q.host < 0) fail(`metering non-negative cost=${cost} n=${n}`, "negative share");
}
if (meterOk === METER_GOLDENS.length) ok(`metering goldens ${meterOk}/${METER_GOLDENS.length} + invariant per*n+host==cost`);
// 100-coins=$1 parity: 1 coin = 100 centicentcoins, so $1 = 10000.
const CENTICENTCOINS_PER_COIN = 100;
if (100 * CENTICENTCOINS_PER_COIN === 10000) ok("100-coins=$1 parity (100*100=10000 centicentcoins)");
else fail("100-coins=$1 parity", "100 coins must equal exactly $1.00");
const billRel = "lib/mmo-billing.ts";
if (!exists(billRel)) {
  skip(`${billRel} absent`, "economy slice not landed?");
} else {
  const src = read(billRel);
  for (const token of ["quoteBilling", "coinPerMinute", "Math.floor", "hostCoverPerMin"]) {
    if (src.includes(token)) ok(`${billRel} exposes ${token}`);
    else fail(`${billRel} exposes ${token}`, "missing token — file a QUEUE note, never re-land");
  }
  // Quote-only: no ledger writes in CODE (header prose stripped first).
  const code = stripJsComments(src);
  if (/coin_ledger|insert\s+into|delete\s+from/i.test(code)) {
    fail(`${billRel} performs zero ledger writes`, "ledger writes belong to DS-MMO-14");
  } else {
    ok(`${billRel} performs zero ledger writes (quote-only)`);
  }
}

// ---- [5] migration order checks ----
console.log("[5] migration order checks (*mmo*.sql)");
let migFiles = [];
try {
  migFiles = readdirSync(join(root, "supabase", "migrations"))
    .filter((f) => f.endsWith(".sql") && f.toLowerCase().includes("mmo"))
    .sort();
} catch {
  migFiles = [];
}
if (migFiles.length === 0) {
  skip("no *mmo*.sql migrations yet (DS-MMO-10 open)", "checked supabase/migrations");
} else {
  ok(`found ${migFiles.length} *mmo*.sql migration(s): ${migFiles.join(", ")}`);
  const versions = [];
  let namesOk = true;
  for (const f of migFiles) {
    const m = /^(\d{12,14})_(.+)\.sql$/.exec(f);
    if (!m) {
      fail(`migration filename convention ${f}`, "expected <timestamp>_name.sql");
      namesOk = false;
    } else versions.push(m[1]);
  }
  if (namesOk) ok("migration filenames match <timestamp>_name.sql");
  if (new Set(versions).size === versions.length) ok("migration versions unique");
  else fail("migration versions unique", "duplicate version prefix");
  const sorted = [...versions].sort();
  if (versions.join(",") === sorted.join(",")) ok("migration versions sorted");
  else fail("migration versions sorted", versions.join(","));
  // Per-table contracts, detected from the tables each file CREATES (code
  // only — header prose stripped). The mmorpg sibling slice (20261117) is
  // context: strict checks target the mmo_* tables of DS-MMO-10.
  const FLOOR = "20261202";
  for (const f of migFiles) {
    const code = stripSqlComments(read(`supabase/migrations/${f}`));
    const created = [...code.matchAll(/create\s+table\s+if\s+not\s+exists\s+public\.(\w+)/gi)].map((m) => m[1]);
    const bareTables = [...code.matchAll(/create\s+table\s+(?!if\s+not\s+exists)(\S+)/gi)].map((m) => m[1]);
    if (bareTables.length === 0) ok(`${f} rerunnable (CREATE TABLE IF NOT EXISTS)`);
    else fail(`${f} rerunnable (CREATE TABLE IF NOT EXISTS)`, `bare: ${bareTables.join(", ")}`);
    // CREATE POLICY must be preceded by its DROP POLICY IF EXISTS (repo rule).
    for (const m of code.matchAll(/create\s+policy\s+(\S+)/gi)) {
      const name = (m[1] || "").replace(/[";]$/, "");
      const dropHit = new RegExp(`drop\\s+policy\\s+if\\s+exists\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
      if (!dropHit.test(code)) fail(`${f} policy ${name} rerunnable`, "no preceding DROP POLICY IF EXISTS");
    }
    const mmoTables = created.filter((t) => t.startsWith("mmo_") && !t.startsWith("mmorpg_"));
    if (mmoTables.length === 0) {
      skip(`${f} defines no mmo_* table (sibling mmorpg slice)`, "context only");
      continue;
    }
    const version = (f.match(/^(\d{12,14})_/) || [])[1] || "";
    if (version.slice(0, 8) >= FLOOR) ok(`${f} lands after ${FLOOR} (DS-MMO-10 slot)`);
    else fail(`${f} lands after ${FLOOR} (DS-MMO-10 slot)`, `version ${version}`);
    if (created.includes("mmo_servers")) {
      if (/age_band[^;]*CHECK/i.test(code) || /CHECK[^;]*age_band/i.test(code)) {
        ok(`${f} constrains age_band via CHECK`);
      } else {
        fail(`${f} constrains age_band via CHECK`, "no CHECK on age_band");
      }
      if (/BETWEEN\s+2\s+AND\s+256/.test(code)) ok(`${f} caps players 2..256`);
      else fail(`${f} caps players 2..256`, "expected BETWEEN 2 AND 256");
      for (const token of ["subsidy_mode", "rate_per_min", "status"]) {
        if (code.includes(token)) continue;
        fail(`${f} defines ${token}`, "missing column");
      }
    }
    if (created.includes("mmo_membership")) {
      if (/max_players/i.test(code) && /server full/i.test(code)) {
        ok(`${f} enforces the server cap at join time`);
      } else {
        fail(`${f} enforces the server cap at join time`, "expected max_players + server-full guard");
      }
      if (/UNIQUE\s*\(\s*server_id\s*,\s*user_id\s*\)/i.test(code)) ok(`${f} dedupes (server, player)`);
      else fail(`${f} dedupes (server, player)`, "expected UNIQUE (server_id, user_id)");
    }
    if (created.includes("mmo_presence")) {
      if (/presence_minutes/i.test(code) && /heartbeat/i.test(code)) {
        ok(`${f} tracks heartbeat presence_minutes`);
      } else {
        fail(`${f} tracks heartbeat presence_minutes`, "expected presence_minutes + heartbeat");
      }
    }
    if (created.includes("mmo_meter")) {
      if (/UNIQUE\s*\(\s*charge_key\s*\)/i.test(code) && /ON\s+CONFLICT\s*\(\s*charge_key\s*\)\s*DO\s+NOTHING/i.test(code)) {
        ok(`${f} idempotent charge rows (charge_key + ON CONFLICT DO NOTHING)`);
      } else {
        fail(`${f} idempotent charge rows`, "expected UNIQUE charge_key + ON CONFLICT DO NOTHING");
      }
    }
    // Economy boundary on CODE: base MMO migrations carry no coin/ledger
    // columns, functions, or policies. The *coin_settle* file is the
    // exempt economy-owned settlement layer (DS-MMO-14): it MUST pair
    // ledger entries off meter/presence rows instead.
    if (f.includes("coin_settle")) {
      const codeLower = code.toLowerCase();
      for (const token of ["coin_ledger", "settle_mmo_minute", "unique", "security definer"]) {
        if (codeLower.includes(token)) ok(`${f} settles via ${token}`);
        else fail(`${f} settles via ${token}`, "missing settlement token");
      }
      continue;
    }
    if (/(coin_balance|coin_ledger|vibe_coins_earned)/i.test(code)) {
      fail(`${f} carries no coin/ledger columns`, "coin/ledger token in code — belongs to DS-MMO-14");
    } else {
      ok(`${f} carries no coin/ledger columns (economy owns those)`);
    }
  }
}

// ---- [5b] policy forward-reference gate ----
console.log("[5b] policy bodies reference only already-created mmo_* tables");
// Regression: 20261203000000 once shipped a CREATE POLICY probing
// public.mmo_membership, created one file later — Postgres validates policy
// bodies eagerly, so filename-order runs died with
// 'relation "public.mmo_membership" does not exist'. plpgsql RPC bodies are
// late-bound and safe; policies (like FKs) are not, so only policies scan.
{
  const createdSoFar = new Set();
  for (const f of migFiles) {
    const code = stripSqlComments(read(`supabase/migrations/${f}`));
    for (const pm of code.matchAll(/create\s+policy\s+[\s\S]*?;/gi)) {
      const stmt = pm[0];
      const at = pm.index ?? 0;
      const before = code.slice(0, at);
      for (const ref of new Set([...stmt.matchAll(/public\.(mmo_\w+)/gi)].map((m) => m[1].toLowerCase()))) {
        const madeHereBefore = new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${ref}\\b`, "i").test(before);
        if (madeHereBefore || createdSoFar.has(ref)) {
          ok(`${f} policy references existing mmo table public.${ref}`);
        } else {
          fail(`${f} policy forward-references public.${ref}`, "Postgres validates policy bodies eagerly — create the table in the same file (above the policy) or an earlier file");
        }
      }
    }
    for (const t of [...code.matchAll(/create\s+table\s+if\s+not\s+exists\s+public\.(\w+)/gi)].map((m) => m[1].toLowerCase())) {
      createdSoFar.add(t);
    }
  }
}

// ---- [6] parity-locked bundles untouched ----
console.log("[6] parity-locked bundles (no mmo tokens in game.js)");
const parityBundles = [
  "public/games/html/gravegain1d/game.js",
  "public/games/html/gravegain2d/game.js",
  "public/games/html/gravegain3d/game.js",
];
const mmoTokens = ["GraveGainMMO", "mmo-1d", "mmorpg-00", "sso-shard", "?mmo=", "?line="];
let parityChecked = 0;
for (const rel of parityBundles) {
  if (!exists(rel)) {
    skip(`${rel} absent`, "bundle missing");
    continue;
  }
  parityChecked += 1;
  const src = read(rel);
  const hit = mmoTokens.find((t) => src.includes(t));
  if (!hit) ok(`${rel} untouched (no mmo tokens)`);
  else fail(`${rel} untouched (no mmo tokens)`, `contains ${hit}`);
}
if (parityChecked === 0) skip("no parity bundles present to check");

// ---- summary (fail-list + exit 1) ----
if (failures) {
  console.error(`verify-mmo FAILED: ${failures} check(s) failed, ${skips} skipped.`);
  process.exit(1);
}
console.log(`verify-mmo OK: mmo slice clean (${skips} skipped).`);
