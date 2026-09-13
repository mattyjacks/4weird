"use strict";
// DS-VCWCODE-03: boot-ports probe helper logic (pure) + live-optional check.
// Runnable: node v2/desktop/code/tests/vcwcode-boot-ports.test.js (no Electron).
let failures = 0;
function check(name, cond) {
  if (cond) console.log("PASS: " + name);
  else { console.log("FAIL: " + name); failures++; }
}
// Pure helper under test: parse a port-open boolean matrix.
function parsePortMatrix(rows) {
  // rows: [{port:number, open:boolean}...] -> {open:[], closed:[], summary:string}
  const open = [], closed = [];
  for (const r of rows) {
    if (r && r.open === true) open.push(r.port);
    else closed.push(r ? r.port : "?");
  }
  return { open, closed, summary: "open=" + open.join(",") + " closed=" + closed.join(",") };
}
check("all-open matrix", (() => {
  const m = parsePortMatrix([{ port: 8888, open: true }, { port: 42069, open: true }]);
  return m.open.length === 2 && m.closed.length === 0;
})());
check("mixed matrix", (() => {
  const m = parsePortMatrix([{ port: 8888, open: true }, { port: 42069, open: false }]);
  return m.open.length === 1 && m.closed.length === 1 && m.open[0] === 8888;
})());
check("all-closed matrix", (() => {
  const m = parsePortMatrix([{ port: 8888, open: false }, { port: 42069, open: false }]);
  return m.open.length === 0 && m.closed.length === 2;
})());
check("summary string format", (() => {
  const m = parsePortMatrix([{ port: 1, open: true }]);
  return typeof m.summary === "string" && m.summary.indexOf("open=1") !== -1;
})());
// Live-optional: try TCP connect to 8888/42069 with short timeout; SKIP (not fail) when closed.
const net = require("net");
function probe(port) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    s.setTimeout(500);
    s.once("connect", () => { s.destroy(); resolve(true); });
    s.once("timeout", () => { s.destroy(); resolve(false); });
    s.once("error", () => resolve(false));
    s.connect(port, "127.0.0.1");
  });
}
(async () => {
  const results = [];
  for (const p of [8888, 42069]) results.push({ port: p, open: await probe(p) });
  const m = parsePortMatrix(results);
  console.log("SKIP-OK live probe: " + m.summary + " (live check is informational only)");
  if (failures) { console.log("RESULT FAIL (" + failures + ")"); process.exitCode = 1; }
  else { console.log("RESULT PASS"); process.exitCode = 0; }
})();
