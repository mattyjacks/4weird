import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const exists = (file) => fs.existsSync(new URL(file, import.meta.url));

const fail = (msg) => {
  throw new Error(`verify-botid: ${msg}`);
};

// 1. next.config.ts must wrap the config with withBotId (proxy rewrites for
// ad-blocker resistance). A bare `export default nextConfig` is a hole.
const nextConfig = read("../next.config.ts");
if (!nextConfig.includes("botid/next/config")) fail("next.config.ts must import { withBotId } from 'botid/next/config'.");
if (!/withBotId\s*\(/.test(nextConfig)) fail("next.config.ts must wrap the config: export default withBotId(nextConfig).");

// 2. instrumentation-client.ts must initBotId with the high-value protect list
// (Next 15.3+ path). Missing entries fail CLOSED in production (humans 403),
// so the list must cover every route in section 4.
if (!exists("../instrumentation-client.ts")) fail("instrumentation-client.ts is missing (initBotId protect list).");
const client = read("../instrumentation-client.ts");
if (!client.includes("initBotId")) fail("instrumentation-client.ts must call initBotId().");
for (const path of [
  "/api/auth/*",
  "/api/games/*",
  "/api/coins/*",
  "/api/fal/*",
  "/api/buddy/*",
  "/api/clans/*",
  "/api/bot/*",
  "/api/code/*",
  "/api/newgameplus/*",
]) {
  if (!client.includes(path)) fail(`instrumentation-client.ts must protect '${path}'.`);
}

// 3. lib/botid.ts is the single server gate: fail-closed on bots, fail-open
// on verifier outage, exempting only valid bot keys + Vercel Cron + opted-in
// signed-in spenders (paid work must survive BotID false-positives).
if (!exists("../lib/botid.ts")) fail("lib/botid.ts is missing (requireHuman gate).");
const gate = read("../lib/botid.ts");
for (const token of ["export async function requireHuman", "checkBotId", "deepAnalysis", "isTrustedMachine", "allowAuthenticated", "isAuthenticatedUser"]) {
  if (!gate.includes(token)) fail(`lib/botid.ts must contain '${token}'.`);
}

// 4. Every enforced high-value mutation must call requireHuman.
// NOTE: POST /api/games/session is intentionally NOT in this list:
// signed-in bot/automation play is welcome and still meters + pays coins
// (anti-cheat via the cheat_mode save invariant + rate limits). Anonymous
// free-play abuse stays gated via guest-pass below.
//
// Two tiers:
// - strict: identity + free-money + social writes. Must call requireHuman
//   WITHOUT allowAuthenticated (logged-in bots stay blocked so farmed
//   accounts cannot mint free coins or spam).
// - spend: coin-metered compute/AI that already requires login. Must call
//   requireHuman WITH { allowAuthenticated: true } so a valid session
//   survives BotID false-positives and legitimate automation can pay + play.
const strict = [
  "../app/api/auth/signup/route.ts",
  "../app/api/auth/login/route.ts",
  "../app/api/family/kid-login/route.ts",
  "../app/api/games/guest-pass/route.ts",
  "../app/api/coins/daily/route.ts",
  "../app/api/coins/claim/route.ts",
  "../app/api/coins/checkout/route.ts",
  "../app/api/coins/refund/route.ts",
  "../app/api/coins/alpha/route.ts",
  "../app/api/referrals/route.ts",
  "../app/api/support/tip/route.ts",
  "../app/api/support/subscribe/route.ts",
  "../app/api/support/tiers/route.ts",
  "../app/api/fundraisers/route.ts",
  "../app/api/fundraisers/[id]/contribute/route.ts",
  "../app/api/fundraisers/[id]/close/route.ts",
  "../app/api/bot/keys/route.ts",
  "../app/api/clans/[slug]/post/route.ts",
  "../app/api/clans/post/[id]/comment/route.ts",
  "../app/api/clans/post/[id]/vote/route.ts",
  "../app/api/clans/comment/[id]/vote/route.ts",
  "../app/api/clans/post/[id]/flair/route.ts",
  "../app/api/clans/post/[id]/board/route.ts",
  "../app/api/my/rights/route.ts",
  "../app/api/verification/route.ts",
];
const spend = [
  "../app/api/newgameplus/build/route.ts",
  "../app/api/fal/generate/route.ts",
  "../app/api/buddy/chat/route.ts",
  "../app/api/game-ai/meter/route.ts",
  "../app/api/swarm/sessions/[id]/chat/route.ts",
  "../app/api/meshy/generate/route.ts",
  "../app/api/code/zip/route.ts",
  "../app/api/desktop/provision/route.ts",
];
const enforced = [...strict, ...spend];
for (const file of strict) {
  if (!exists(file)) fail(`enforced route missing: ${file}`);
  const src = read(file);
  if (!src.includes("requireHuman")) fail(`${file} must call requireHuman() (BotID gate).`);
  if (src.includes("allowAuthenticated")) {
    fail(`${file} must NOT opt into allowAuthenticated (free-money/identity gate stays strict).`);
  }
}
for (const file of spend) {
  if (!exists(file)) fail(`enforced route missing: ${file}`);
  const src = read(file);
  if (!src.includes("requireHuman")) fail(`${file} must call requireHuman() (BotID gate).`);
  if (!src.includes("allowAuthenticated")) {
    fail(`${file} must pass { allowAuthenticated: true } so logged-in spenders survive BotID false-positives.`);
  }
}

// 5. Machine-to-machine routes must NEVER call the gate: they carry no
// browser session, so checkBotId would 403 every legitimate delivery.
const exempt = [
  "../app/api/cron/clan-upkeep/route.ts",
  "../app/api/cron/support-renewals/route.ts",
  "../app/api/cron/scale-sweep/route.ts",
  "../app/api/cron/clan-tribute/route.ts",
  "../app/api/meshy/webhook/route.ts",
  "../app/api/blender/progress/route.ts",
  "../app/api/health/route.ts",
  "../app/api/vcw/health/route.ts",
];
for (const file of exempt) {
  if (!exists(file)) continue;
  const src = read(file);
  if (src.includes("requireHuman") || src.includes("botid/server") || src.includes("lib/botid")) {
    fail(`${file} must NOT call the BotID gate (server-to-server route).`);
  }
}

// 6. Signed-in play metering must NEVER call the gate: AI/automation playing
// through a real signed-in session is welcome and still pays coins.
{
  const src = read("../app/api/games/session/route.ts");
  if (src.includes("requireHuman") || src.includes("lib/botid")) {
    fail("app/api/games/session/route.ts must NOT call the BotID gate (signed-in AI play meters + pays).");
  }
}

console.log(`verify-botid: OK (${enforced.length} enforced, ${exempt.length} exempt, client+config wired)`);
