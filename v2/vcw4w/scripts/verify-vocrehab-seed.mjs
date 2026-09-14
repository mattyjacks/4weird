#!/usr/bin/env node
// DS-VOCREHAB-SEED — read-only seed determinism checker (CHEAP lane, R10 infra/docs).
// Sibling to scripts/verify-vocrehab-arcade.mjs — never touches it or any source file.
// Read-only: only fs reads + stdout; exits 0 all green, 1 listing gaps.
// No dependencies (node builtins only), ESM.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const SEED_LIB = "lib/vocrehab-seed.ts";
// Canonical 7 named in the lib's own Usage line: parse, make, hash, prng,
// shuffle, pick, sample (sameSeed/SEED_RE are bonus helpers, not required).
const SEED_EXPORTS = [
  "parseSeed",
  "makeSeed",
  "xmur3",
  "mulberry32",
  "shuffle",
  "pick",
  "sample",
];

const POOLS_FILES = [
  "lib/vocrehab-seed-pools.ts",
  "lib/vocrehab-seed-pools2.ts",
  "lib/vocrehab-seed-pools3.ts",
];

// Minimum bank sizes per pool (items / variants / sets).
const POOL_MINIMUMS = [
  { key: "file-sort", aliases: ["file-sort", "filesort", "file_sort"], min: 24, unit: "items" },
  { key: "inbox", aliases: ["inbox"], min: 20, unit: "items" },
  { key: "focus", aliases: ["focus-shift", "focus"], min: 16, unit: "items" },
  { key: "phone", aliases: ["phone-greeting", "phone"], min: 12, unit: "items" },
  { key: "time", aliases: ["time-punch", "time"], min: 12, unit: "items" },
  { key: "tool", aliases: ["tool-match", "tool"], min: 16, unit: "items" },
  { key: "resume", aliases: ["resume-rescue", "resume"], min: 16, unit: "items" },
  { key: "energy", aliases: ["energy-budget", "energy"], min: 12, unit: "items" },
  { key: "paycheck", aliases: ["paycheck-plan", "paycheck"], min: 8, unit: "items" },
  { key: "barrier", aliases: ["barrier-run", "barrier"], min: 3, unit: "variants" },
  { key: "juggle", aliases: ["schedule-juggle", "juggle"], min: 3, unit: "sets" },
];

const FRAME_FILE = "components/vocrehab/vocrehab-game-frame.tsx";
const SEED_BAR_FILE = "components/vocrehab/vocrehab-seed-badge.tsx";

const RANDOM_TOKENS = ["Math.random", "Date.now", "getRandomValues"];

const gaps = [];
const notes = [];
let exportsPresent = 0;
let poolsFilesPresent = 0;
let poolsOk = 0;
let frameOk = false;
let seedBarOk = false;

function read(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function checkSecrets(src, file) {
  const bad = [];
  if (/sk-[A-Za-z0-9]{8,}/.test(src)) bad.push(`${file}: contains sk- literal`);
  if (/bot4weird_/.test(src)) bad.push(`${file}: contains bot4weird_ literal`);
  if (/BEGIN (?:RSA )?PRIVATE KEY/.test(src)) bad.push(`${file}: holds a private key`);
  return bad;
}

// Pull every `export const NAME = [...]` array literal out of a source file
// with a bracket-depth scan (string- and comment-aware). Heuristic, read-only.
function extractExportedArrays(src) {
  const out = [];
  // NOTE: the `[` is located from the `=` assignment (not by regex) so a
  // `readonly Foo[]` type annotation between name and `=` cannot misanchor.
  const re = /export\s+const\s+([A-Za-z0-9_]+)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1];
    const eq = src.indexOf("=", m.index + m[0].length);
    if (eq === -1) continue;
    const open = src.indexOf("[", eq);
    if (open === -1) continue;
    let depth = 1;
    let i = open + 1;
    let quote = null;
    for (; i < src.length && depth > 0; i++) {
      const ch = src[i];
      const next = src[i + 1];
      if (quote) {
        if (ch === "\\") { i++; continue; }
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === "/" && next === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
      if (ch === "/" && next === "*") {
        i += 2;
        while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
        i++;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === "`") quote = ch;
      else if (ch === "[") depth++;
      else if (ch === "]") depth--;
    }
    out.push({ name, body: src.slice(open + 1, i - 1) });
  }
  return out;
}

// Data-row heuristic: object literals opening with a stable id-ish key
// (covers { id: } banks plus caller/job-shaped pool rows).
function countRows(body) {
  const hits = body.match(/\{\s*(?:"id"|'id'|id|sender|caller|job)\s*:/g);
  return hits ? hits.length : 0;
}

function countHits(haystack, needle) {
  let n = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) { n++; i = haystack.indexOf(needle, i + needle.length); }
  return n;
}

// ---- 1. seed lib exports ----
if (!existsSync(join(ROOT, SEED_LIB))) {
  gaps.push(`missing seed lib: ${SEED_LIB}`);
} else {
  const src = read(SEED_LIB);
  for (const name of SEED_EXPORTS) {
    if (new RegExp(`export\\s+(function|const)\\s+${name}\\b`).test(src)) exportsPresent += 1;
    else gaps.push(`seed lib gap in ${SEED_LIB}: missing export ${name}`);
  }
  // Randomness may live ONLY inside the makeSeed random fn (incl. its default
  // rand param); anywhere else in the lib breaks seeded determinism.
  const fnAt = src.indexOf("function makeSeed");
  if (fnAt !== -1) {
    const braceAt = src.indexOf("{", fnAt);
    let depth = 1;
    let i = braceAt + 1;
    let quote = null;
    for (; i < src.length && depth > 0; i++) {
      const ch = src[i];
      if (quote) {
        if (ch === "\\") { i++; continue; }
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === "`") quote = ch;
      else if (ch === "{") depth++;
      else if (ch === "}") depth--;
    }
    const rest = src.slice(0, fnAt) + src.slice(i);
    for (const tok of RANDOM_TOKENS) {
      if (rest.includes(tok)) gaps.push(`determinism gap in ${SEED_LIB}: ${tok} outside makeSeed`);
    }
  }
  gaps.push(...checkSecrets(src, SEED_LIB));
}

// ---- 2. pools files + minimum sizes ----
const poolsSources = [];
for (const rel of POOLS_FILES) {
  if (existsSync(join(ROOT, rel))) {
    poolsFilesPresent += 1;
    poolsSources.push({ rel, src: read(rel) });
  } else {
    gaps.push(`missing pools file: ${rel} (sibling wave file — absent counts as a gap)`);
  }
}
const combined = poolsSources.map((p) => p.src).join("\n").toLowerCase();
const allBlocks = poolsSources.flatMap((p) =>
  extractExportedArrays(p.src).map((b) => ({ ...b, rel: p.rel })),
);
const normKey = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
for (const pool of POOL_MINIMUMS) {
  // Name-attributed blocks first: the const name must carry the pool key
  // (camelCase/PREFIX agnostic via normKey), so a "phone" word inside resume
  // lines can never inflate the phone count. Body/keyword signals are only
  // the fallback when no name-attributed block exists at all.
  const named = allBlocks.filter((b) =>
    pool.aliases.some((a) => normKey(b.name).includes(normKey(a))),
  );
  let score = 0;
  let how = "";
  if (named.length > 0) {
    for (const b of named) {
      const rows = countRows(b.body);
      if (rows > score) { score = rows; how = `rows in ${b.rel}#${b.name}`; }
    }
  } else {
    let bodyBest = 0;
    let bodyName = "";
    for (const b of allBlocks) {
      const hay = `${b.name}\n${b.body}`.toLowerCase();
      if (!pool.aliases.some((a) => hay.includes(a))) continue;
      const rows = countRows(b.body);
      if (rows > bodyBest) { bodyBest = rows; bodyName = `${b.rel}#${b.name}`; }
    }
    let hits = 0;
    for (const a of pool.aliases) hits += countHits(combined, a);
    if (bodyBest >= hits) { score = bodyBest; how = `rows in ${bodyName || "n/a"}`; }
    else { score = hits; how = "keyword hits"; }
  }
  if (poolsSources.length === 0) {
    console.log(`pool ${pool.key}: n/a/${pool.min} ${pool.unit} (no pools files on disk)`);
  } else if (score >= pool.min) {
    poolsOk += 1;
    console.log(`pool ${pool.key}: ${score}/${pool.min} ${pool.unit} ok (${how})`);
  } else {
    console.log(`pool ${pool.key}: ${score}/${pool.min} ${pool.unit} short (${how})`);
    gaps.push(`pool gap: ${pool.key} has ${score}/${pool.min} ${pool.unit} across ${POOLS_FILES.join(", ")}`);
  }
}
// No raw randomness inside selector homes (pools files); seeded rand comes from the seed lib.
for (const p of poolsSources) {
  for (const tok of RANDOM_TOKENS) {
    if (p.src.includes(tok)) gaps.push(`determinism gap in ${p.rel}: ${tok} inside pools/selectors (use the seeded rand from ${SEED_LIB})`);
  }
  gaps.push(...checkSecrets(p.src, p.rel));
}

// ---- 3. frame carries seed ----
if (!existsSync(join(ROOT, FRAME_FILE))) {
  gaps.push(`missing frame: ${FRAME_FILE}`);
} else {
  const src = read(FRAME_FILE);
  if (/vocrehabSeed/.test(src)) frameOk = true;
  else gaps.push(`frame gap in ${FRAME_FILE}: no vocrehabSeed (seed must ride the run)`);
  gaps.push(...checkSecrets(src, FRAME_FILE));
  // Import drift is sibling-owned: note (never gap) when the frame/seed-bar
  // names a seed helper the lib does not export.
  if (existsSync(join(ROOT, SEED_LIB))) {
    const libSrc = read(SEED_LIB);
    const seen = new Set();
    for (const f of [FRAME_FILE, SEED_BAR_FILE]) {
      if (!existsSync(join(ROOT, f))) continue;
      const s = read(f);
      const ids = s.match(/vocrehab[A-Z][A-Za-z0-9]*Seed[A-Za-z0-9]*/g) || [];
      for (const id of ids) {
        if (id === "vocrehabSeed" || seen.has(id)) continue;
        seen.add(id);
        if (!libSrc.includes(id)) {
          notes.push(`note: ${id} used in ${f} but not exported from ${SEED_LIB} (sibling-owned drift)`);
        }
      }
    }
  }
}

// ---- 4. seed bar exists ----
if (!existsSync(join(ROOT, SEED_BAR_FILE))) {
  gaps.push(`missing seed bar: ${SEED_BAR_FILE}`);
} else {
  const src = read(SEED_BAR_FILE);
  const hasSeed = /seed/i.test(src);
  const hasCopyLoad = /seed=|replay|Copy/i.test(src);
  if (hasSeed && hasCopyLoad) seedBarOk = true;
  else gaps.push(`seed-bar gap in ${SEED_BAR_FILE}: needs seed display + copy/load affordance`);
  gaps.push(...checkSecrets(src, SEED_BAR_FILE));
}

console.log(`vocrehab-seed: exports=${exportsPresent}/${SEED_EXPORTS.length} pools_files=${poolsFilesPresent}/${POOLS_FILES.length} pools_ok=${poolsOk}/${POOL_MINIMUMS.length} frame=${frameOk ? 1 : 0}/1 seedbar=${seedBarOk ? 1 : 0}/1`);
for (const n of notes) console.log(n);
if (gaps.length === 0) {
  console.log("vocrehab-seed: GREEN — seed lib, pool minimums, determinism, frame seed, and seed bar all hold.");
  process.exit(0);
} else {
  console.log(`vocrehab-seed: GAPS (${gaps.length}) — sibling wave files may land same-wave; absent counts as reported gaps:`);
  for (const g of gaps) console.log(`  GAP: ${g}`);
  process.exit(1);
}
