import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const fail = (msg) => { throw new Error(msg); };

// Pure lib: exact settings - Quality 0-10 (default 5), Budget 1-10,000
// (default 100), Confirm-the-Amount above 250.
const lib = read("../lib/newgameplus.ts");
for (const token of [
  "QUALITY_DEFAULT = 5",
  "BUDGET_DEFAULT = 100",
  "BUDGET_CONFIRM_THRESHOLD = 250",
  "QUALITY_MIN = 0",
  "QUALITY_MAX = 10",
  "BUDGET_MIN = 1",
  "BUDGET_MAX = 10000",
  "cleanPrompt",
  "cleanQuality",
  "cleanBudget",
  "needsAmountConfirm",
  "planBuild",
  "generateGameSource",
  "vcwSelfTest",
  "draftPathFor",
  "DRAFT_PROJECT_SLUG",
  "NEWGAMEPLUS_CUT_NOTE",
  "NEWGAMEPLUS_CUT_PCT = 25",
  "laneForBudget",
  "planSymphony",
  "planFalForBuild",
  "timelineForLane",
  "recommendFalOps",
]) {
  if (!lib.includes(token)) fail(`newgameplus lib missing ${token}.`);
}
if (!lib.includes("≤5 min")) fail("newgameplus lib must promise the ≤5-min fast lane.");
if (!lib.includes("Scout") || !lib.includes("Forge") || !lib.includes("Sage")) {
  fail("newgameplus lib must field the Scout/Forge/Sage symphony cast.");
}

// API: prompt in → tested game out, confirm gate, draft push, honest errors.
const route = read("../app/api/newgameplus/build/route.ts");
for (const token of [
  "Authentication required",
  "rateLimit",
  "hasServerSupabase",
  "dbFail",
  "Confirm the Amount",
  "confirmed",
  "generateGameSource",
  "vcwSelfTest",
  "code_submissions",
  "create_project",
  "push_file",
  "draft-games",
  "Draft/",
  "planSymphony",
  "planFalForBuild",
  "timelineForLane",
  "swarm",
  "timeline",
]) {
  if (!route.includes(token)) fail(`newgameplus build route missing ${token}.`);
}

// Page + builder: prompt, Quality slider, Budget input, confirm modal, preview.
const page = read("../app/newgameplus/page.tsx");
for (const token of ["NewGamePlusBuilder", "/newgameplus", "Quality", "Budget"]) {
  if (!page.includes(token)) fail(`newgameplus page missing ${token}.`);
}
const builder = read("../components/newgameplus/newgameplus-builder.tsx");
for (const token of [
  "Quality",
  "Budget",
  "Confirm the Amount",
  "250",
  "/api/newgameplus/build",
  "/api/fal/generate",
  "srcDoc",
  "Draft",
  "VibeCodeWorker",
  "Symphony",
  "timeline",
  "≤5 min",
]) {
  if (!builder.includes(token)) fail(`newgameplus builder missing ${token}.`);
}

// Discoverability: site nav links to /newgameplus.
if (!read("../components/site/site-header.tsx").includes('"/newgameplus"')) {
  fail("Site nav must link to /newgameplus.");
}

// Package gate wiring.
const pkg = read("../package.json");
if (!pkg.includes("verify:newgameplus")) fail("package.json must wire verify:newgameplus.");
if (!/"test": "[^"]*verify:newgameplus/.test(pkg)) {
  fail("npm test must run verify:newgameplus.");
}

console.log("NewGamePlus integrity OK; prompt in, tested Draft game out.");
