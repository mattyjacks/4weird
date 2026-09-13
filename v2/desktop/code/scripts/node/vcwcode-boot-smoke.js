"use strict";
// vcwcode-boot-smoke.js — smoke-test the desktop worker + static probe.
// GET http://127.0.0.1:42069/api/status (expect 200 + games list) and
// GET http://127.0.0.1:8888/ with a short timeout. Prints PASS/FAIL per check.
// Exit 0 if /api/status is ok, else exit 1.
const http = require("http");

const TIMEOUT_MS = 3000;

function getJson(url) {
  return new Promise((resolve) => {
    let req;
    try {
      req = http.get(url, { timeout: TIMEOUT_MS }, (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (c) => { body += c; if (body.length > 256 * 1024) { try { req.destroy(); } catch (_) {} } });
        res.on("end", () => resolve({ ok: res.statusCode, body }));
      });
    } catch (err) {
      resolve({ error: String((err && err.message) || err) });
      return;
    }
    req.setTimeout(TIMEOUT_MS, () => { try { req.destroy(new Error("timeout")); } catch (_) {} });
    req.on("timeout", () => { try { req.destroy(new Error("timeout")); } catch (_) {} });
    req.on("error", (err) => resolve({ error: String((err && err.message) || err) }));
  });
}

async function main() {
  const statusUrl = "http://127.0.0.1:42069/api/status";
  const staticUrl = "http://127.0.0.1:8888/";
  let statusPass = false;

  const s = await getJson(statusUrl);
  if (s.error) {
    console.log(`FAIL status ${statusUrl} — ${s.error}`);
  } else if (s.ok !== 200) {
    console.log(`FAIL status ${statusUrl} — HTTP ${s.ok}`);
  } else {
    let games = null;
    try {
      const parsed = JSON.parse(s.body);
      games = parsed.games || parsed.data?.games || parsed.result?.games || null;
    } catch (_) { games = null; }
    if (Array.isArray(games)) {
      statusPass = true;
      console.log(`PASS status ${statusUrl} — 200 with games list (${games.length} entries).`);
    } else {
      console.log(`FAIL status ${statusUrl} — 200 but no games list in JSON body.`);
    }
  }

  const t = await getJson(staticUrl);
  if (t.error) {
    console.log(`FAIL static ${staticUrl} — ${t.error} (start the static/probe server on 8888 if expected).`);
  } else if (t.ok >= 200 && t.ok < 500) {
    console.log(`PASS static ${staticUrl} — HTTP ${t.ok}.`);
  } else {
    console.log(`FAIL static ${staticUrl} — HTTP ${t.ok}.`);
  }

  if (statusPass) {
    console.log("VERDICT: PASS — worker status ok.");
    process.exit(0);
  }
  console.log("VERDICT: FAIL — worker status not ok; start the 42069 worker then re-run.");
  process.exit(1);
}

main();
