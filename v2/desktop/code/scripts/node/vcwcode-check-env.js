"use strict";
// vcwcode-check-env.js — compare .env.example keys vs .env presence (NAMES ONLY, never values).
// Reports how many of the documented keys (first 10) are set. Always exits 0 with a checklist.
const fs = require("fs");
const path = require("path");

function candidateDirs() {
  const here = __dirname;
  return [
    process.cwd(),
    path.resolve(here, "..", ".."),
    path.resolve(here, "..", "..", ".."),
    path.resolve(here, ".."),
    here,
  ];
}

function findFile(name) {
  for (const d of candidateDirs()) {
    const p = path.join(d, name);
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
    } catch (_) {}
  }
  return null;
}

function parseKeys(filePath) {
  // Returns ordered unique KEY names from KEY=... lines; ignores comments/blank lines.
  // Never returns values.
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const keys = [];
    const seen = new Set();
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const m = t.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
      // Also accept bare `export KEY=...`
      const m2 = t.match(/^export\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/);
      const k = m ? m[1] : (m2 ? m2[1] : null);
      if (k && !seen.has(k)) { seen.add(k); keys.push(k); }
    }
    return keys;
  } catch (_) {
    return [];
  }
}

function envHas(name) {
  return Object.prototype.hasOwnProperty.call(process.env, name) && process.env[name] !== "";
}

function main() {
  const examplePath = findFile(".env.example");
  const dotEnvPath = findFile(".env");
  if (!examplePath) {
    console.log("CHECKLIST: .env.example not found (searched cwd + script ancestors) — cannot compare; create one listing required keys.");
    console.log("VERDICT: 0/10 documented keys verifiable (no .env.example).");
    process.exit(0);
  }
  const docKeys = parseKeys(examplePath).slice(0, 10);
  const envFileKeys = dotEnvPath ? parseKeys(dotEnvPath) : [];
  const envFileSet = new Set(envFileKeys);
  console.log(`CHECKLIST: using example ${examplePath}`);
  console.log(`CHECKLIST: .env ${dotEnvPath ? `found at ${dotEnvPath}` : "not found — falling back to process environment only"}`);
  let set = 0;
  for (const k of docKeys) {
    const present = envHas(k) || envFileSet.has(k);
    if (present) set += 1;
    console.log(`  [${present ? "x" : " "}] ${k}: ${present ? "set" : "missing"}`);
  }
  console.log(`VERDICT: ${set}/${docKeys.length} documented keys set (names only, values never shown).`);
  if (dotEnvPath === null) console.log("HINT: copy .env.example to .env and fill required keys.");
  process.exit(0);
}

main();
