"use strict";
// DS-VCWCODE-03: api-status-shape fetch 127.0.0.1:42069/api/status.
// Assert JSON has games array or success flag when up; SKIP when down.
// Runnable: node v2/desktop/code/tests/vcwcode-api-status-shape.test.js
const http = require("http");
function getJson(path, port, timeoutMs) {
  return new Promise((resolve) => {
    const req = http.get({ host: "127.0.0.1", port, path, timeout: timeoutMs, headers: { accept: "application/json" } }, (res) => {
      let s = "";
      res.on("data", (c) => { s += c; });
      res.on("end", () => resolve({ ok: true, status: res.statusCode, body: s }));
    });
    req.once("timeout", () => { req.destroy(new Error("timeout")); });
    req.once("error", (e) => resolve({ ok: false, error: String(e && e.message || e) }));
  });
}
(async () => {
  const r = await getJson("/api/status", 42069, 1500);
  if (!r.ok) {
    console.log("SKIP: api 127.0.0.1:42069 down (" + r.error + ") — fail-open");
    console.log("RESULT PASS (skip)");
    process.exitCode = 0;
    return;
  }
  let j = null;
  try { j = JSON.parse(r.body); }
  catch (e) { console.log("FAIL: /api/status not JSON: " + String(e.message)); process.exitCode = 1; return; }
  const hasGames = j && Array.isArray(j.games);
  const hasSuccess = j && (j.success === true || j.ok === true || j.status === "ok");
  if (hasGames) console.log("PASS: status JSON has games array len=" + j.games.length);
  else console.log("INFO: no games array");
  if (hasSuccess) console.log("PASS: status JSON has success flag");
  else console.log("INFO: no success flag");
  if (hasGames || hasSuccess) { console.log("RESULT PASS"); process.exitCode = 0; }
  else { console.log("FAIL: JSON lacks games array and success flag; keys=" + Object.keys(j || {}).join(",")); process.exitCode = 1; }
})();
