import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const fail = (msg) => {
  throw new Error(msg);
};

const mig = read("../supabase/migrations/20260926000000_timer_ghost_cash.sql");
const ghostLib = read("../lib/ghost.ts");
const timerWidget = read("../components/time/TimerWidget.tsx");
const screenTracker = read("../components/time/ScreenTracker.tsx");
const terms = read("../app/terms/page.tsx");
const header = read("../components/site/site-header.tsx");
const sitemap = read("../app/sitemap.ts");

// 1. Database Migration: tables
for (const table of [
  "timer_projects",
  "timer_entries",
  "timer_debts",
  "timer_screenshots",
]) {
  if (!mig.includes(`create table if not exists public.${table}`)) {
    fail(`Migration must create table public.${table}.`);
  }
}

// 2. Database Migration: RPCs
for (const rpc of ["start_timer", "stop_timer"]) {
  if (!mig.includes(`create or replace function public.${rpc}`)) {
    fail(`Migration must declare RPC public.${rpc}.`);
  }
}

// 3. Ghost tracking-unit symbol & calculations (ghost emoji ONLY; never paired with a cash emoji)
if (!ghostLib.includes("👻")) fail("Ghost lib must define 👻 symbol.");
if (ghostLib.includes("Ghost Cash")) fail("Ghost lib must not use the retired 'Ghost Cash' name.");
if (!ghostLib.includes("calculateGhostOwed")) fail("Ghost lib must calculate owed amount down to the second.");
if (!ghostLib.includes("GHOST_DISCLAIMER")) fail("Ghost lib must export legal disclaimer.");

// 4. Timer Widget & Screen Tracker
if (!timerWidget.includes("ScreenTracker")) fail("TimerWidget must integrate work-diary ScreenTracker.");
if (!timerWidget.includes("upworkSyncMode")) fail("TimerWidget must support external dual-timer companion mode.");
if (!screenTracker.includes("getDisplayMedia")) fail("ScreenTracker must use getDisplayMedia for display capture.");
if (!screenTracker.includes("blurSensitive")) fail("ScreenTracker must support privacy blur.");

// 5. Legal Terms
if (!terms.includes("8C. Timer, Work Diary, and Ghosts")) fail("Terms must include Section 8C covering Ghosts.");
if (terms.includes("Ghost Cash")) fail("Terms must not use the retired 'Ghost Cash' name.");
if (!terms.includes("NO MONETARY VALUE OR LEGAL TENDER")) fail("Terms must explicitly state Ghosts have no monetary value.");

// 6. Navigation and Sitemap
if (!header.includes('href: "/timer"')) fail("SiteHeader must include link to /timer.");
if (!sitemap.includes('path: "/timer"')) fail("Sitemap must list /timer.");

console.log("Timer, external companion mode, and Ghost (👻) verification passed successfully!");
