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

const rentPerSecond = read("../supabase/migrations/20260913000000_game_rentals_per_second.sql");

// Play-metering economics: proportional load (1 MiB reference) + per-second
// running (quoted per hour), dev cap 100.
for (const token of ["GAME_LOAD_COINS_DEFAULT = 1", "GAME_HOURLY_COINS_DEFAULT = 1", "GAME_RATE_MAX = 100", "GAME_INCLUDED_SECONDS = 0", "GAME_LOAD_REFERENCE_BYTES", "GAME_HEARTBEAT_SECONDS = 60", "GAME_STILL_PLAYING_SECONDS", "loadFeeForBytes", "runningOwed", "perSecondCenticentcoins"]) {
  if (!rent.includes(token)) throw new Error(`game-rent lib missing ${token}.`);
}
if (!rent.includes("GUEST_FREE_LOADS_PER_DAY") || !rent.includes("GUEST_AD_INTERVAL_MS")) {
  throw new Error("game-rent lib must define guest quotas + ad cadence.");
}
// Per-second default math: 1 coin/hr = 100 centicentcoins over 3600 s, and a
// day-1 daily bonus (5 coins) covers a full 5-hour session on its own.
if (!read("../lib/economy.ts").includes("dailyBonusForStreak")) throw new Error("Economy must keep the daily bonus (5h/day math depends on it).");
if (!rent.includes("100 centicentcoins")) throw new Error("game-rent lib must document the 100-centicentcoin hourly spread.");

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
// Per-second migration: numeric ledger + proportional load + per-second run.
for (const token of ["numeric(12, 2)", "game_ai_compute_split_numeric", "least(v_bytes, 1048576)", "3600.0", "for update", "free_load = false"]) {
  if (!rentPerSecond.includes(token)) throw new Error(`Per-second migration missing ${token}.`);
}
if (!rentPerSecond.includes("IF NOT EXISTS") && !rentPerSecond.includes("if not exists") && !rentPerSecond.includes("if exists")) throw new Error("Per-second migration must be rerunnable.");
if (!migration.includes("IF NOT EXISTS") && !migration.includes("if not exists")) throw new Error("Migration must be rerunnable.");
// FK discipline: start_game_session must insert the parent game_sessions row
// BEFORE any game_play_usage child row — placeholder session ids violate
// game_play_usage_session_id_fkey on every paid load (live prod incident).
if (migration.includes("00000000-0000-0000-0000-000000000000")) {
  throw new Error("Migration must not insert placeholder session ids (FK violation).");
}
{
  const startFn = migration.slice(migration.indexOf("start_game_session(p_game"));
  const sessionPos = startFn.indexOf("insert into public.game_sessions");
  const usagePos = startFn.indexOf("insert into public.game_play_usage");
  if (sessionPos < 0 || usagePos < 0 || sessionPos > usagePos) {
    throw new Error("start_game_session must insert game_sessions before game_play_usage.");
  }
}
// RPC errors: P0001 (our raise exception) maps to client statuses; anything
// else is a DB fault → logged 500, never raw PG text with a 400.
const respond = read("../lib/api-respond.ts");
if (!respond.includes("dbFail") || !respond.includes("rpcFail") || !respond.includes("P0001")) {
  throw new Error("api-respond must export dbFail + rpcFail (P0001 mapping).");
}
for (const [name, src] of [["session", session], ["meter", read("../app/api/game-ai/meter/route.ts")], ["buddy-session", read("../app/api/buddy/session/route.ts")]]) {
  if (!src.includes("rpcFail")) throw new Error(`${name} API must route RPC errors through rpcFail.`);
}

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

// Play shell: gate + badge + bridge byte reports + 5-hour still-playing check.
if (!gate.includes("guest-pass") || !gate.includes("fourweird-metering") || !gate.includes("heartbeat") || !gate.includes("keepalive")) {
  throw new Error("PlayGate must gate guests, meter bytes, heartbeat, and end sessions.");
}
if (!gate.includes("GAME_STILL_PLAYING_SECONDS") || !gate.includes("Still playing")) {
  throw new Error("PlayGate must ask a still-playing check every 5 hours.");
}
if (!badge.includes("billed per second") || !badge.includes("perSecondCenticentcoins")) {
  throw new Error("PlayRateBadge must show the per-second rate in centicentcoins.");
}
// The frame must mount during "metering": the byte report comes from the
// bridge inside the frame, so blocking the frame forced every load down the
// unmeasured-fallback path (full fee even for cached loads).
if (gate.includes('gate.kind === "checking" || gate.kind === "metering"')) {
  throw new Error("PlayGate must mount the frame during metering (no metering deadlock).");
}
if (!migration.includes("for update")) throw new Error("Heartbeat must lock the session row (no double-bill on retries).");
if (!bundle.includes("for update")) throw new Error("Runbook bundle copy of the migration is stale.");
for (const [name, src] of [["rates", rates], ["chat", read("../app/api/buddy/chat/route.ts")], ["tts", read("../app/api/buddy/tts/route.ts")]]) {
  if (!src.includes("rpcFail")) throw new Error(`${name} API must route RPC errors through rpcFail (no raw PG leaks).`);
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
for (const token of ["Game rentals", "gameRent", "per second"]) {
  if (!usageClient.includes(token)) throw new Error(`Usage client missing ${token}.`);
}
if (!read("../components/account/account-dashboard.tsx").includes("centicentcoins")) {
  throw new Error("Account dashboard must show the centicentcoin balance.");
}

// Pricing + skill + bundle honesty.
for (const token of ["Renting games", "$0.01 per hour", "Guests play free", "100 coins/hour", "5-hour session", "billed per second"]) {
  if (!pricing.includes(token)) throw new Error(`Pricing missing "${token}".`);
}
for (const token of ["guest-pass", "set_game_rate", "AdSlot", "free loads"]) {
  if (!skill.includes(token)) throw new Error(`skill.md missing "${token}".`);
}
if (!bundle.includes("BUNDLE FILE: 20260910170000_game_rentals.sql")) throw new Error("Runbook bundle must include the rentals migration.");
if (!bundle.includes("BUNDLE FILE: 20260913000000_game_rentals_per_second.sql")) throw new Error("Runbook bundle must include the per-second rentals migration.");
console.log("Game rentals integrity OK.");
