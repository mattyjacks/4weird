import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const rent = read("../lib/game-rent.ts");
const ads = read("../lib/ads.ts");
const migration = read("../supabase/migrations/20260910170000_game_rentals.sql");
const rates = read("../app/api/games/rates/route.ts");
const session = read("../app/api/games/session/route.ts");
const guest = read("../app/api/games/guest-pass/route.ts");
const adSlot = read("../components/ads/AdSlot.tsx");
const gate = read("../components/games/play-gate.tsx");
const badge = read("../components/games/play-rate-badge.tsx");
const bridge = read("../public/games/html/runtime-bridge.js");
const usage = read("../app/api/my/usage/route.ts");
const usageClient = read("../app/my/usage/usage-client.tsx");
const pricing = read("../app/pricing/page.tsx");
const skill = read("../../../skill.md");
const bundle = read("../../../supabase-migrations-2026-10-9-A.txt");

// Play-metering economics: 1/load (first hour included) + 1/hr, dev cap 100.
for (const token of ["GAME_LOAD_COINS_DEFAULT = 1", "GAME_HOURLY_COINS_DEFAULT = 1", "GAME_RATE_MAX = 100", "GAME_INCLUDED_SECONDS = 3600", "GAME_CACHE_FREE_BYTES = 1024 * 1024"]) {
  if (!rent.includes(token)) throw new Error(`game-rent lib missing ${token}.`);
}
if (!rent.includes("GUEST_FREE_LOADS_PER_DAY") || !rent.includes("GUEST_AD_INTERVAL_MS")) {
  throw new Error("game-rent lib must define guest quotas + ad cadence.");
}
// 5-hour default session = 1 load (incl. hour 1) + 4 extra hours = 5 coins,
// covered by the day-1 daily bonus (5 coins): average users get 5h/day free.
if (!read("../lib/economy.ts").includes("dailyBonusForStreak")) throw new Error("Economy must keep the daily bonus (5h/day math depends on it).");

// Exactly 10 house ads spanning every required property.
const adCount = (ads.match(/id: "/g) ?? []).length;
if (adCount !== 10) throw new Error(`House ads must be exactly 10 (found ${adCount}).`);
for (const topic of ["VibeCodeWorker", "MediaMogul", "mattyjacks.com", "shop.mattyjacks.com", "clans", "leaderboards", "agents", "Buddy", "Vibe Coins", "Functions"]) {
  if (!ads.includes(topic)) throw new Error(`House ads missing topic: ${topic}.`);
}
if (/mediamogul\.com|shop\.mattyjacks\.net|example\.com/i.test(ads)) throw new Error("House ads must not guess URLs.");

// Migration: tables + gated RPCs + 25% split + rerunnable guards.
for (const token of ["game_rates", "game_developers", "game_sessions", "game_play_usage", "set_game_rate", "add_game_developer", "start_game_session", "heartbeat_game_session", "end_game_session", "my_game_play_usage", "between 0 and 100", "game_ai_compute_split", "1048576", "not authorized"]) {
  if (!migration.includes(token)) throw new Error(`Migration missing ${token}.`);
}
if (!migration.includes("IF NOT EXISTS") && !migration.includes("if not exists")) throw new Error("Migration must be rerunnable.");

// APIs: coin sessions need auth; guest-pass must stay public + IP-throttled.
for (const [name, src] of [["session", session], ["rates-put", rates]]) {
  if (!src.includes("Authentication required")) throw new Error(`${name} API must require auth.`);
}
if (!session.includes("start_game_session") || !session.includes("heartbeat_game_session") || !session.includes("end_game_session")) {
  throw new Error("Session API must call start/heartbeat/end RPCs.");
}
if (!rates.includes("set_game_rate")) throw new Error("Rates API must call set_game_rate.");
if (guest.includes("Authentication required")) throw new Error("guest-pass must stay public (guests have no accounts).");
for (const token of ["ad_required", "rateLimit", "clientIp", "GUEST_FREE_LOADS_PER_DAY", "pickHouseAd"]) {
  if (!guest.includes(token)) throw new Error(`guest-pass missing ${token}.`);
}

// Play shell: gate + badge + bridge byte reports.
if (!gate.includes("guest-pass") || !gate.includes("fourweird-metering") || !gate.includes("heartbeat") || !gate.includes("keepalive")) {
  throw new Error("PlayGate must gate guests, meter bytes, heartbeat, and end sessions.");
}
if (!adSlot.includes("Skip") || !adSlot.includes("NEXT_PUBLIC_AD_PROVIDER_URL") || !adSlot.includes("pickHouseAd")) {
  throw new Error("AdSlot must be instantly skippable with provider-first + house fallback.");
}
if (!gate.includes("AdSlot")) throw new Error("PlayGate must show skippable ads to guests.");
if (!badge.includes("/api/games/rates")) throw new Error("PlayRateBadge must read public rates.");
if (!bridge.includes('type: "metering"') || !bridge.includes("transferSize")) {
  throw new Error("Runtime bridge must report cache-aware transfer bytes.");
}

// Usage ledger folds rentals into combined totals.
if (!usage.includes("my_game_play_usage") || !usage.includes("gameRent")) throw new Error("Usage API must include game rentals.");
for (const token of ["Game rentals", "gameRent", "first hour"]) {
  if (!usageClient.includes(token)) throw new Error(`Usage client missing ${token}.`);
}

// Pricing + skill + bundle honesty.
for (const token of ["Renting games", "$0.01 per hour", "Guests play free", "100 coins/hour", "5-hour session"]) {
  if (!pricing.includes(token)) throw new Error(`Pricing missing "${token}".`);
}
for (const token of ["guest-pass", "set_game_rate", "AdSlot", "free loads"]) {
  if (!skill.includes(token)) throw new Error(`skill.md missing "${token}".`);
}
if (!bundle.includes("BUNDLE FILE: 20260910170000_game_rentals.sql")) throw new Error("Runbook bundle must include the rentals migration.");
console.log("Game rentals integrity OK.");
