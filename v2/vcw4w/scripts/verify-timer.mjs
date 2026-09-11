import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const fail = (msg) => {
  throw new Error(msg);
};

const mig = read("../supabase/migrations/20260926000000_timer_ghost_cash.sql");
const timeTypes = read("../types/time.ts");
const ghostCash = read("../lib/ghost-cash.ts");
const timeRoute = read("../app/api/time/route.ts");
const timerRoute = read("../app/api/time/timer/route.ts");
const projectsRoute = read("../app/api/time/projects/route.ts");
const debtsRoute = read("../app/api/time/debts/route.ts");
const screenshotsRoute = read("../app/api/time/screenshots/route.ts");
const timerPage = read("../app/timer/page.tsx");
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

// 3. Ghost Cash currency symbol & calculations
if (!ghostCash.includes("👻💵")) fail("Ghost cash lib must define 👻💵 symbol.");
if (!ghostCash.includes("calculateGhostCashOwed")) fail("Ghost cash lib must calculate owed amount down to the second.");
if (!ghostCash.includes("GHOST_CASH_DISCLAIMER")) fail("Ghost cash lib must export legal disclaimer.");

// 4. Timer Widget & Screen Tracker
if (!timerWidget.includes("ScreenTracker")) fail("TimerWidget must integrate Upwork-style ScreenTracker.");
if (!screenTracker.includes("getDisplayMedia")) fail("ScreenTracker must use getDisplayMedia for display capture.");
if (!screenTracker.includes("blurSensitive")) fail("ScreenTracker must support privacy blur.");

// 5. Legal Terms
if (!terms.includes("8C. Timer, Work Diary, and Ghost Cash")) fail("Terms must include Section 8C covering Ghost Cash.");
if (!terms.includes("NO CASH VALUE OR LEGAL TENDER")) fail("Terms must explicitly state Ghost Cash has no cash value.");

// 6. Navigation and Sitemap
if (!header.includes('href: "/timer"')) fail("SiteHeader must include link to /timer.");
if (!sitemap.includes('path: "/timer"')) fail("Sitemap must list /timer.");

console.log("Timer and Ghost Cash (👻💵) verification passed successfully!");
