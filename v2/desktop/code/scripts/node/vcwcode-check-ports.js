"use strict";
// vcwcode-check-ports.js — probe TCP 42069 and 8888, print FREE/IN-USE per port.
// Fail-open: exit 0 when ports are free OR in-use-with-explanation; exit 2 only on unexpected error.
const net = require("net");

const PORTS = [42069, 8888];
const TIMEOUT_MS = 1000;

function probe(port) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      try { sock.destroy(); } catch (_) {}
      resolve(result);
    };
    sock.setTimeout(TIMEOUT_MS);
    sock.once("connect", () => done({ port, state: "IN-USE" }));
    sock.once("timeout", () => done({ port, state: "FREE", note: "timeout=free" }));
    sock.once("error", (err) => {
      if (err && (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT")) {
        done({ port, state: "FREE" });
      } else {
        done({ port, state: "UNKNOWN", note: (err && err.code) || String(err) });
      }
    });
    try {
      sock.connect(port, "127.0.0.1");
    } catch (err) {
      done({ port, state: "UNKNOWN", note: String(err && err.message || err) });
    }
  });
}

async function main() {
  try {
    const results = [];
    for (const p of PORTS) {
      // eslint-disable-next-line no-await-in-loop
      results.push(await probe(p));
    }
    let unexpected = false;
    for (const r of results) {
      if (r.state === "FREE") {
        console.log(`PORT ${r.port}: FREE — nothing listening on 127.0.0.1:${r.port}.`);
      } else if (r.state === "IN-USE") {
        console.log(`PORT ${r.port}: IN-USE — 127.0.0.1:${r.port} answered TCP connect (another instance or app owns it; stop it or reuse it).`);
      } else {
        unexpected = true;
        console.log(`PORT ${r.port}: UNKNOWN — probe inconclusive (${r.note || "no detail"}).`);
      }
    }
    if (unexpected) {
      console.log("VERDICT: probe inconclusive on at least one port — investigate manually.");
      process.exit(2);
    }
    console.log("VERDICT: ports checked (free or in-use-with-explanation above).");
    process.exit(0);
  } catch (err) {
    console.error(`ERROR: unexpected failure: ${(err && err.message) || err}`);
    process.exit(2);
  }
}

main();
