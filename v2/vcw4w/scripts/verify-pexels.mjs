import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const fail = (msg) => { throw new Error(msg); };

const lib = read("../lib/pexels.ts");
const status = read("../app/api/pexels/status/route.ts");
const search = read("../app/api/pexels/search/route.ts");
const curated = read("../app/api/pexels/curated/route.ts");
const studio = read("../components/stock/stock-studio.tsx");
const page = read("../app/stock/page.tsx");
const env = read("../.env.example");

// Lib: free (0 coins), key helpers, attribution-safe normalization.
for (const token of ["pexelsConfigured", "pexelsKey", "PEXELS_API_KEY", "PEXELS_CREDIT_NOTE", "normalizePexelsPhoto", "normalizePexelsVideo", "normalizePexelsPayload", "pexelsSearchPath", "pexelsCuratedPath"]) {
  if (!lib.includes(token)) fail(`pexels lib missing ${token}.`);
}
if (!lib.includes("api.pexels.com")) fail("pexels lib must pin the api.pexels.com base.");
if (!lib.includes("Authorization")) fail("pexels lib must use the Authorization header.");
if (!lib.includes("credit")) fail("pexels lib must carry attribution (credit) on every item.");
// Abuse armor: layered buckets (memory/min + shared/day) guard the shared key.
for (const token of ["PEXELS_ABUSE_SCOPE", "PEXELS_MINUTE_LIMIT", "PEXELS_DAILY_LIMIT", "PEXELS_DAILY_WINDOW_SECS"]) {
  if (!lib.includes(token)) fail(`pexels lib missing abuse armor ${token}.`);
}
// Fun layer: presets, colors, dice, paste-ready credit snippets.
for (const token of ["PEXELS_PRESETS", "PEXELS_COLORS", "rollPexelsDice", "pexelsCreditLine", "pexelsCreditHtml"]) {
  if (!lib.includes(token)) fail(`pexels lib missing fun layer ${token}.`);
}
for (const preset of ["Dungeon Backdrop", "Neon City", "Boss Arena", "Trailer B-Roll", "Chill Menu Loop"]) {
  if (!lib.includes(preset)) fail(`pexels lib missing preset ${preset}.`);
}

// Upstream paths mirror the official Pexels surface (images + video).
for (const path of ["/v1/search", "/v1/curated", "/videos/search", "/videos/popular"]) {
  if (!lib.includes(path)) fail(`pexels lib missing upstream path ${path}.`);
}
// Free means free: no coin metering, no wallet RPC in the routes.
for (const route of [search, curated]) {
  if (/meter_|coin_balance|get_my_coin_balance/.test(route)) fail("pexels routes must not meter coins (provider is free).");
}
if (!search.includes("Authentication required")) fail("search API must require auth (protects the server key).");
if (!search.includes("pexelsConfigured")) fail("search API must degrade honestly without PEXELS_API_KEY.");
if (!search.includes("Rate limited")) fail("search API must rate-limit per user.");
if (!search.includes("globalBucket") || !search.includes("acctBucketKey")) fail("search API must layer the shared daily bucket (abuse armor).");
if (!curated.includes("Authentication required")) fail("curated API must require auth.");
if (!curated.includes("pexelsConfigured")) fail("curated API must honor pexelsConfigured.");
if (!curated.includes("globalBucket")) fail("curated API must layer the shared daily bucket (abuse armor).");
if (!status.includes("pexelsConfigured")) fail("status API must report pexelsConfigured.");
// Never synthesize: items come only from normalized upstream payloads.
if (!search.includes("normalizePexelsPayload") || !curated.includes("normalizePexelsPayload")) {
  fail("pexels routes must normalize upstream payloads (never synthesize URLs).");
}
if (/picsum|placehold\.it|placeholder\.com|unsplash\.source|dummyimage|loremflickr/i.test(search + curated + studio)) {
  fail("pexels must never fall back to placeholder image services.");
}

// GUI: stock browser with attribution on every card; page + nav exist.
// (The badge learns configured from search/curated responses; no mount fetch.)
for (const token of ["/api/pexels/search", "/api/pexels/curated", "credit", "PEXELS_PRESETS", "rollPexelsDice", "pexelsCreditHtml", "Surprise me"]) {
  if (!studio.includes(token)) fail(`Stock studio must use ${token}.`);
}
if (!page.includes("StockStudio") || !page.includes("/stock")) fail("stock page must render the studio.");
if (!read("../components/site/site-header.tsx").includes('"/stock"')) fail("Site nav must link to /stock.");
if (!read("../components/site/site-footer.tsx").includes('"/stock"')) fail("Site footer must link to /stock.");
if (!env.includes("PEXELS_API_KEY=")) fail(".env.example must document PEXELS_API_KEY.");

// Package gate wiring.
const pkg = read("../package.json");
if (!pkg.includes("verify:pexels")) fail("package.json must wire verify:pexels.");
if (!/"test": "[^"]*verify:pexels/.test(pkg)) fail("npm test must run verify:pexels.");

console.log("Pexels free-stock integrity OK - images + video, attribution always, 0 coins.");
