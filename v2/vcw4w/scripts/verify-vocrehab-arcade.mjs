#!/usr/bin/env node
// DS-VOCREHAB-D6 — read-only arcade union checker (RUN-MU0MDHMR, VocRehab wave).
// Disjoint filename from C7's live scripts/verify-vocrehab.mjs — never touches it.
// Read-only: only fs reads + stdout; exits 0 all green, 1 listing gaps.
// No dependencies (node builtins only), ESM.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const GAME_IDS = [
  "file-sort",
  "inbox-sprint",
  "focus-shift",
  "barrier-run",
  "schedule-juggle",
  "phone-greeting",
  "time-punch",
  "tool-match",
  "paycheck-plan",
];

const FRAME_TOKENS = ["intro", "practice", "countdown", "results", "t_ms"];

const gaps = [];
const notes = [];
let componentsPresent = 0;
let routesPresent = 0;
let frameOk = 0;
let prefixOk = 0;

function hasOnClickWithoutOnKeyDown(src, file) {
  // File-level heuristic: if the file uses onClick anywhere but never
  // uses onKeyDown, flag it. (Per-file, no cross-file inference.)
  const usesClick = /onClick\s*=/.test(src);
  const usesKey = /onKeyDown\s*=/.test(src);
  return usesClick && !usesKey;
}

function checkSecrets(src, file) {
  const bad = [];
  if (/sk-/.test(src)) bad.push(`${file}: contains sk- literal`);
  if (/bot4weird_/.test(src)) bad.push(`${file}: contains bot4weird_ literal`);
  return bad;
}

for (const id of GAME_IDS) {
  const compRel = `components/vocrehab/vocrehab-game-${id}.tsx`;
  const routeRel = `app/vocrehab/play/${id}/page.tsx`;
  const compAbs = join(ROOT, compRel);
  const routeAbs = join(ROOT, routeRel);
  const compExists = existsSync(compAbs);
  const routeExists = existsSync(routeAbs);
  if (compExists) componentsPresent += 1;
  else gaps.push(`missing component: ${compRel}`);
  if (routeExists) routesPresent += 1;
  else gaps.push(`missing route: ${routeRel}`);

  if (compExists) {
    const src = readFileSync(compAbs, "utf8");
    const missingTokens = FRAME_TOKENS.filter((t) => !src.includes(t));
    if (missingTokens.length === 0) frameOk += 1;
    else gaps.push(`frame-contract gap in ${compRel}: missing ${missingTokens.join(", ")}`);
    if (src.includes("vocrehab-")) prefixOk += 1;
    else gaps.push(`prefix gap in ${compRel}: no vocrehab- string`);
    if (hasOnClickWithoutOnKeyDown(src, compRel))
      gaps.push(`a11y gap in ${compRel}: onClick without onKeyDown`);
    gaps.push(...checkSecrets(src, compRel));
  }
  if (routeExists) {
    const src = readFileSync(routeAbs, "utf8");
    gaps.push(...checkSecrets(src, routeRel));
  }
}

// Sweep all components/vocrehab game files for onClick-without-onKeyDown
// (union check across the dir, read-only).
try {
  const dir = join(ROOT, "components/vocrehab");
  const entries = readdirSync(dir).filter((f) => f.startsWith("vocrehab-game-") && f.endsWith(".tsx"));
  for (const f of entries) {
    if (GAME_IDS.some((id) => f === `vocrehab-game-${id}.tsx`)) continue; // already checked
    const src = readFileSync(join(dir, f), "utf8");
    if (hasOnClickWithoutOnKeyDown(src, `components/vocrehab/${f}`))
      gaps.push(`a11y gap in components/vocrehab/${f}: onClick without onKeyDown`);
    gaps.push(...checkSecrets(src, `components/vocrehab/${f}`));
  }
} catch {
  notes.push("note: components/vocrehab dir unreadable — skipped sweep");
}

console.log(`vocrehab-arcade union: games=${GAME_IDS.length} components=${componentsPresent}/${GAME_IDS.length} routes=${routesPresent}/${GAME_IDS.length} frame_ok=${frameOk}/${componentsPresent} prefix_ok=${prefixOk}/${componentsPresent}`);
for (const n of notes) console.log(n);
if (gaps.length === 0) {
  console.log("vocrehab-arcade: GREEN — all 9 component + route pairs present, contracts hold.");
  process.exit(0);
} else {
  console.log(`vocrehab-arcade: GAPS (${gaps.length}) — pack-2/C files may land same-wave; absent counts as reported gaps:`);
  for (const g of gaps) console.log(`  GAP: ${g}`);
  process.exit(1);
}
