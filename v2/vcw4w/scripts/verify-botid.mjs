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
// on verifier outage, exempting only valid bot keys + Vercel Cron.
if (!exists("../lib/botid.ts")) fail("lib/botid.ts is missing (requireHuman gate).");
const gate = read("../lib/botid.ts");
for (const token of ["export async function requireHuman", "checkBotId", "deepAnalysis", "isTrustedMachine"]) {
  if (!gate.includes(token)) fail(`lib/botid.ts must contain '${token}'.`);
}

// 4. Every enforced high-value mutation must call requireHuman.
const enforced = [
  "../app/api/auth/signup/route.ts",
  "../app/api/auth/login/route.ts",
  "../app/api/family/kid-login/route.ts",
  "../app/api/games/guest-pass/route.ts",
  "../app/api/games/session/route.ts",
  "../app/api/coins/daily/route.ts",
  "../app/api/coins/claim/route.ts",
  "../app/api/coins/checkout/route.ts",
  "../app/api/coins/refund/route.ts",
  "../app/api/referrals/route.ts",
  "../app/api/fal/generate/route.ts",
  "../app/api/buddy/chat/route.ts",
  "../app/api/support/tip/route.ts",
  "../app/api/fundraisers/[id]/contribute/route.ts",
  "../app/api/bot/keys/route.ts",
  "../app/api/newgameplus/build/route.ts",
  "../app/api/code/zip/route.ts",
  "../app/api/clans/[slug]/post/route.ts",
  "../app/api/meshy/generate/route.ts",
  "../app/api/game-ai/meter/route.ts",
  "../app/api/swarm/sessions/[id]/chat/route.ts",
  "../app/api/my/rights/route.ts",
  "../app/api/desktop/provision/route.ts",
  "../app/api/verification/route.ts",
];
for (const file of enforced) {
  if (!exists(file)) fail(`enforced route missing: ${file}`);
  const src = read(file);
  if (!src.includes("requireHuman")) fail(`${file} must call requireHuman() (BotID gate).`);
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

console.log(`verify-botid: OK (${enforced.length} enforced, ${exempt.length} exempt, client+config wired)`);
