"use strict";
// vcwcode-log-tail.js — print last N lines (default 50) of the newest log file in:
//   1) <repo>/v2/desktop/code/.vibecodeworker-user-data (or .vibecodeworker-user-data near cwd)
//   2) %APPDATA%/vibecodeworker/logs
// Fail-open: prints a message when dirs/files are absent. Exits 0 always (exit 2 only on unexpected error).
const fs = require("fs");
const os = require("os");
const path = require("path");

function newestFile(dir) {
  try {
    const st = fs.statSync(dir);
    if (!st.isDirectory()) return null;
  } catch (_) { return null; }
  let best = null;
  let entries = [];
  try { entries = fs.readdirSync(dir); } catch (_) { return null; }
  for (const e of entries) {
    const p = path.join(dir, e);
    try {
      const s = fs.statSync(p);
      if (s.isFile() && (!best || s.mtimeMs > best.mtimeMs)) best = { path: p, mtimeMs: s.mtimeMs };
    } catch (_) {}
  }
  return best;
}

function tailLines(filePath, n) {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  // Drop trailing empty line artifact from final newline.
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines.slice(Math.max(0, lines.length - n));
}

function main() {
  try {
    const n = Math.max(1, parseInt(process.argv[2] || "50", 10) || 50);
    const dirs = [];
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    dirs.push({ label: ".vibecodeworker-user-data", dir: path.resolve(process.cwd(), ".vibecodeworker-user-data") });
    dirs.push({ label: ".vibecodeworker-user-data (code dir)", dir: path.resolve(__dirname, "..", "..", ".vibecodeworker-user-data") });
    dirs.push({ label: "%APPDATA%/vibecodeworker/logs", dir: path.join(appData, "vibecodeworker", "logs") });

    let shown = 0;
    for (const { label, dir } of dirs) {
      const best = newestFile(dir);
      if (!best) {
        console.log(`--- ${label} (${dir}): absent or empty — skipping.`);
        continue;
      }
      console.log(`--- ${label}: ${best.path} (last ${n} lines) ---`);
      try {
        const lines = tailLines(best.path, n);
        for (const l of lines) console.log(l);
      } catch (err) {
        console.log(`(unreadable: ${String((err && err.message) || err)})`);
      }
      shown += 1;
    }
    if (shown === 0) {
      console.log("VERDICT: no log files found — start the worker once to generate logs (fail-open, nothing to tail).");
    } else {
      console.log(`VERDICT: tailed ${shown} log file(s).`);
    }
    process.exit(0);
  } catch (err) {
    console.error(`ERROR: unexpected failure: ${String((err && err.message) || err)}`);
    process.exit(2);
  }
}

main();
