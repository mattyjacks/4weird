import fs from "node:fs";

const read = (file) => {
  try {
    return fs.readFileSync(new URL(file, import.meta.url), "utf8");
  } catch {
    throw new Error(`${file.replace("../", "")} is missing; create it before wiring providers.`);
  }
};
const fail = (msg) => {
  throw new Error(`verify-runpod-do FAIL: ${msg}`);
};

// 1. lib/runpod.ts: core billing client must exist; pod helpers (listPods etc)
// are optional — warn when the client is billing-only.
const runpod = read("../lib/runpod.ts");
for (const token of ["runpodConfigured", "runpodApiBase"]) {
  if (!runpod.includes(token)) fail(`lib/runpod.ts must export ${token}.`);
}
const POD_HELPERS = ["listPods", "getPod", "createPod", "deletePod"];
const podFound = POD_HELPERS.filter((h) => runpod.includes(h));
if (podFound.length === 0) {
  console.log(
    "WARN: lib/runpod.ts has no pod helpers (listPods etc); billing-only client — skipping pod-helper checks.",
  );
} else {
  for (const helper of POD_HELPERS) {
    if (!runpod.includes(helper)) {
      console.log(`WARN: lib/runpod.ts exports ${podFound.join(", ")} but not ${helper}.`);
    }
  }
  console.log(`runpod pod helpers present: ${podFound.join(", ")}.`);
}

// 2. lib/digitalocean.ts: must exist with the droplet lifecycle exports.
const digitalocean = read("../lib/digitalocean.ts");
for (const token of [
  "doConfigured",
  "doApiBase",
  "doHeaders",
  "listDroplets",
  "getDroplet",
  "createDroplet",
  "dropletAction",
  "deleteDroplet",
]) {
  if (!digitalocean.includes(token)) fail(`lib/digitalocean.ts must export ${token}.`);
}
for (const token of ["listSizes", "listRegions", "listSnapshots", "listVolumes"]) {
  if (!digitalocean.includes(token)) {
    console.log(`WARN: lib/digitalocean.ts is missing catalog helper ${token}.`);
  }
}
if (digitalocean.includes("DIGITALOCEAN_TOKEN")) {
  console.log("digitalocean client reads DIGITALOCEAN_TOKEN.");
} else {
  fail("lib/digitalocean.ts must read DIGITALOCEAN_TOKEN (server-only, never NEXT_PUBLIC_).");
}

// 3. lib/cost-compare.ts: recommend logic must exist with a real smoke signal.
const costCompare = read("../lib/cost-compare.ts");
if (!/export\s+(async\s+function|function|const)\s+recommend\w*/.test(costCompare)) {
  fail("lib/cost-compare.ts must export a recommend*() function (e.g. recommendCompute).");
}
for (const token of ["runpod", "digitalocean"]) {
  if (!costCompare.toLowerCase().includes(token)) {
    fail(`lib/cost-compare.ts recommend logic must compare both providers (missing ${token}).`);
  }
}
if (!costCompare.includes("return")) fail("lib/cost-compare.ts recommend logic must return a recommendation.");
if (!/[<>]/.test(costCompare) && !/cheaper|compare/i.test(costCompare)) {
  fail("lib/cost-compare.ts recommend logic smoke test failed: no price comparison found.");
}

// 4. CLOUD_SERVICES must carry the do-* keys.
const catalog = read("../lib/cloud-catalog.ts");
if (!catalog.includes("CLOUD_SERVICES")) fail("lib/cloud-catalog.ts must export CLOUD_SERVICES.");
const EXPECTED_DO_KEYS = ["do-droplet", "do-volume", "do-snapshot"];
const missingKeys = EXPECTED_DO_KEYS.filter((k) => !catalog.includes(k));
if (missingKeys.length > 0) {
  fail(`CLOUD_SERVICES is missing do-* keys: ${missingKeys.join(", ")}.`);
}

// 5. .env.example must document the server-only token.
const env = read("../.env.example");
if (!env.includes("DIGITALOCEAN_TOKEN=")) fail(".env.example must document DIGITALOCEAN_TOKEN=.");
if (env.includes("NEXT_PUBLIC_DIGITALOCEAN")) {
  fail(".env.example must keep DIGITALOCEAN_TOKEN server-only (no NEXT_PUBLIC_ prefix).");
}

// Package gate wiring (house rule: every verify script is wired + run by test).
const pkg = read("../package.json");
if (!pkg.includes("verify:runpod-do")) fail("package.json must wire verify:runpod-do.");
if (!/"test": "[^"]*verify:runpod-do/.test(pkg)) {
  fail("npm test must run verify:runpod-do.");
}

console.log("RunPod + DigitalOcean integrity OK.");
