/**
 * verify-vocrehab-seeds.mjs — VOCSEED banks/seeds verifier (DS-VOCSEED-09).
 *
 * Four slices (source-scan only — NEVER imports TS, no build step):
 *  (a) bank counts: regex/source scan counting entry `id:` lines per
 *      section (filesort>=60, inbox>=40, pack2 callers>=30/windows>=24/
 *      tools>=32, pack3 pairs>=40/nodes>=12/constraints>=8/lines>=40).
 *      Multi-section banks attribute each entry to the nearest preceding
 *      `export const` whose name carries the section keyword; entry lines
 *      are `id:` lines containing `{` or a quote (interface fields like
 *      `id: string;` are excluded).
 *      SKIP (warn, not fail) when a bank file is absent — a sibling lane
 *      may still be in flight.
 *  (b) seed-core tokens (mulberry32, VRHB-) present in vocrehab-seed.ts —
 *      SKIP with warning when the file or a token is absent.
 *  (c) no secrets: scans all 9 VOCSEED files for an sk- key pattern plus
 *      credential literals in assignment shape (e.g. a key name followed
 *      by : or =). Prose mentions inside drill content (a phish bank that
 *      teaches "never share" phrasing) are NOT leaks, so bare words in
 *      sentences do not fail — FAIL on any hit.
 *  (d) seed-bar tokens (Practice seed, ?seed) — SKIP with warning when
 *      the file or a token is absent.
 *
 * Exit codes: 0 = all PASS, no skips. 1 = any FAIL. 2 = no FAIL but at
 * least one SKIP (sibling banks/tokens still unlanded — RED until then).
 * This script owns ONLY itself; it never edits other verifiers.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, ".."); // v2/vcw4w

let passes = 0;
let fails = 0;
let skips = 0;

function pass(name, note) {
  passes += 1;
  console.log(`[vocrehab-seeds] PASS ${name}: ${note}`);
}
function fail(name, note) {
  fails += 1;
  console.log(`[vocrehab-seeds] FAIL ${name}: ${note}`);
}
function skip(name, note) {
  skips += 1;
  console.log(`[vocrehab-seeds] SKIP ${name}: ${note}`);
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

/** True for lines that look like bank entries (not interface fields). */
function isEntryLine(line) {
  return /\bid\s*:/.test(line) && (line.includes("{") || line.includes('"') || line.includes("'"));
}

/** Split an identifier into stemmed lowercase words (camel/digit aware). */
function stem(w) {
  return w.toLowerCase().replace(/s$/, "");
}
function splitWords(ident) {
  return ident
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(stem);
}

/**
 * Attribute each entry-id line to the nearest preceding `export const`
 * whose name contains the section keyword (stem-compared, so
 * `vocrehabPack2Callers` anchors the `callers` section). Returns per-
 * section counts plus unattributed stragglers.
 */
function attributeEntries(src, sections) {
  const lines = src.split(/\r?\n/);
  const anchors = [];
  lines.forEach((line, idx) => {
    const m = line.match(/export\s+const\s+([A-Za-z0-9_]+)/);
    if (!m) return;
    const words = new Set(splitWords(m[1]));
    const sec = sections.find((s) => words.has(stem(s.name)));
    if (sec) anchors.push({ idx, name: sec.name });
  });
  const counts = Object.fromEntries(sections.map((s) => [s.name, 0]));
  let unattributed = 0;
  lines.forEach((line, idx) => {
    if (!isEntryLine(line)) return;
    let owner = null;
    for (const a of anchors) {
      if (a.idx <= idx) owner = a.name;
      else break;
    }
    if (owner) counts[owner] += 1;
    else unattributed += 1;
  });
  return { counts, unattributed, anchored: anchors.length };
}

// ---------- Slice (a): bank counts ----------
const BANKS = [
  {
    file: "lib/vocrehab-bank-filesort.ts",
    sections: [{ name: "cards", min: 60 }],
  },
  {
    file: "lib/vocrehab-bank-inbox.ts",
    sections: [{ name: "scenarios", min: 40 }],
  },
  {
    file: "lib/vocrehab-bank-pack2.ts",
    sections: [
      { name: "callers", min: 30 },
      { name: "windows", min: 24 },
      { name: "tools", min: 32 },
    ],
  },
  {
    file: "lib/vocrehab-bank-pack3.ts",
    sections: [
      { name: "pairs", min: 40 },
      { name: "nodes", min: 12 },
      { name: "constraints", min: 8 },
      { name: "lines", min: 40 },
    ],
  },
];

for (const bank of BANKS) {
  if (!exists(bank.file)) {
    skip(`bank:${bank.file}`, "file absent — sibling lane still in flight");
    continue;
  }
  const src = read(bank.file);
  if (bank.sections.length === 1) {
    const { name, min } = bank.sections[0];
    const n = src.split(/\r?\n/).filter(isEntryLine).length;
    if (n >= min) pass(`bank:${bank.file}#${name}`, `${n} entries >= ${min}`);
    else fail(`bank:${bank.file}#${name}`, `${n} entries < ${min}`);
    continue;
  }
  // Multi-section bank: export-anchored attribution (see attributeEntries).
  const { counts, unattributed, anchored } = attributeEntries(src, bank.sections);
  if (anchored === 0) {
    for (const s of bank.sections) {
      skip(`bank:${bank.file}#${s.name}`, "no recognizable export anchors — bank shape unrecognized, sibling may be in flight");
    }
    continue;
  }
  for (const s of bank.sections) {
    const n = counts[s.name];
    const extra = unattributed > 0 ? ` (${unattributed} unattributed id-line(s))` : "";
    if (n >= s.min) pass(`bank:${bank.file}#${s.name}`, `${n} entries >= ${s.min}${extra}`);
    else fail(`bank:${bank.file}#${s.name}`, `${n} entries < ${s.min}${extra}`);
  }
}

// ---------- Slice (b): seed-core tokens ----------
{
  const f = "lib/vocrehab-seed.ts";
  const tokens = ["mulberry32", "VRHB-"];
  if (!exists(f)) {
    skip("seed-core", `${f} absent — sibling lane still in flight`);
  } else {
    const src = read(f);
    for (const t of tokens) {
      if (src.includes(t)) pass(`seed-core:${t}`, `${f} contains token`);
      else skip(`seed-core:${t}`, `${f} present but token absent — sibling may be in flight`);
    }
  }
}

// ---------- Slice (c): no secrets ----------
// NOTE: sensitive literal fragments below are assembled by concatenation so
// this verifier's own source never contains a contiguous match for them.
const KEY_RE = /(?<![A-Za-z0-9_-])sk-[A-Za-z0-9-_]{20,}/;
// Assignment-shaped credential literals, assembled by concatenation so this
// verifier's own source never contains a contiguous match for them.
const SENSITIVE_RES = [
  new RegExp("\\b" + "api[_-]?key" + "\\s*[:=]", "i"),
  new RegExp("\\b" + "pass" + "word" + "\\s*[:=]", "i"),
];
const VOCSEED_FILES = [
  "lib/vocrehab-seed.ts",
  "lib/vocrehab-bank-filesort.ts",
  "lib/vocrehab-bank-inbox.ts",
  "lib/vocrehab-bank-pack2.ts",
  "lib/vocrehab-bank-pack3.ts",
  "components/vocrehab/vocrehab-seed-bar.tsx",
  "lib/vocrehab-seed-admin.ts",
  "app/docs/vocrehab/seeds/page.tsx",
  "scripts/verify-vocrehab-seeds.mjs",
];
{
  const problems = [];
  let scanned = 0;
  for (const f of VOCSEED_FILES) {
    if (!exists(f)) continue;
    scanned += 1;
    const src = read(f);
    const keyHit = src.match(KEY_RE);
    if (keyHit) problems.push(`${f} looks like an sk- key (${keyHit[0].slice(0, 8)}...)`);
    for (const re of SENSITIVE_RES) {
      if (re.test(src)) problems.push(`${f} holds a credential literal (${re.source.slice(0, 24)}...)`);
    }
  }
  if (problems.length > 0) fail("secrets", problems.join("; "));
  else pass("secrets", `scan clean over ${scanned}/${VOCSEED_FILES.length} VOCSEED file(s) present`);
}

// ---------- Slice (d): seed-bar tokens ----------
{
  const f = "components/vocrehab/vocrehab-seed-bar.tsx";
  const tokens = ["Practice seed", "?seed"];
  if (!exists(f)) {
    skip("seed-bar", `${f} absent — sibling lane still in flight`);
  } else {
    const src = read(f);
    for (const t of tokens) {
      if (src.includes(t)) pass(`seed-bar:${t}`, `${f} contains token`);
      else skip(`seed-bar:${t}`, `${f} present but token absent — sibling may be in flight`);
    }
  }
}

// ---------- Summary ----------
console.log(`[vocrehab-seeds] summary: ${passes} pass, ${fails} fail, ${skips} skip`);
if (fails > 0) {
  console.log("[vocrehab-seeds] RED: failing slice(s) above");
  process.exit(1);
}
if (skips > 0) {
  console.log("[vocrehab-seeds] RED (pending): sibling banks/tokens unlanded — re-run after they land");
  process.exit(2);
}
console.log("[vocrehab-seeds] GREEN: all VOCSEED checks pass");
process.exit(0);
