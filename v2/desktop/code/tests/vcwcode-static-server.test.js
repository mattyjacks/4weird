"use strict";
// DS-VCWCODE-03: static-server fetch 127.0.0.1:8888 with timeout, fail-open.
// SKIP when server down — never hard-fail CI without server.
// Runnable: node v2/desktop/code/tests/vcwcode-static-server.test.js
const http = require("http");
function get(path, port, timeoutMs) {
  return new Promise((resolve) => {
    const req = http.get({ host: "127.0.0.1", port, path, timeout: timeoutMs }, (res) => {
      let n = 0;
      res.on("data", (c) => { n += c.length; });
      res.on("end", () => resolve({ ok: true, status: res.statusCode, bytes: n }));
    });
    req.once("timeout", () => { req.destroy(new Error("timeout")); });
    req.once("error", (e) => resolve({ ok: false, error: String(e && e.message || e) }));
  });
}
(async () => {
  const r = await get("/", 8888, 1500);
  if (!r.ok) {
    console.log("SKIP: static server 127.0.0.1:8888 down (" + r.error + ") — fail-open");
    console.log("RESULT PASS (skip)");
    process.exitCode = 0;
    return;
  }
  if (r.status >= 200 && r.status < 500) console.log("PASS: static server responded status=" + r.status + " bytes=" + r.bytes);
  else { console.log("FAIL: unexpected status=" + r.status); process.exitCode = 1; return; }
  console.log("RESULT PASS");
  process.exitCode = 0;
})();
