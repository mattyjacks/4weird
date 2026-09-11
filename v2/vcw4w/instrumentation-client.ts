import { initBotId } from "botid/client/core";

/**
 * BotID invisible CAPTCHA — client-side challenge injector (Next 15.3+ path).
 *
 * This patches fetch/XHR so every same-origin call to a protected path+method
 * carries the `x-is-human` / `x-path` / `x-method` headers that checkBotId()
 * classifies server-side. Missing entries fail CLOSED in production (humans get
 * 403), so this list is intentionally BROAD: over-protecting a read-only GET is
 * harmless (extra headers, server ignores them), under-protecting a mutation is
 * a bot hole.
 *
 * Method "*" covers POST/PUT/PATCH/DELETE in one entry (verified in
 * botid/dist/client/core). checkLevel deepAnalysis forces Kasada Deep Analysis
 * per route; the dashboard Firewall → Rules → BotID Deep Analysis switch must
 * also be ON for the classification to run.
 *
 * Deliberately NOT protected (server-to-server, no browser session):
 * - /api/cron/* (Vercel Cron, Bearer CRON_SECRET)
 * - /api/meshy/webhook (HMAC-signed provider push)
 * - /api/blender/progress (64-hex job-token callback from the render pod)
 * - /api/health, /api/vcw/health (public liveness probes)
 * Those routes never call checkBotId — see lib/botid.ts.
 */
initBotId({
  protect: [
    // Tier 0 — identity, Sybil, free-money abuse surface.
    { path: "/api/auth/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/family/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/games/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/coins/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/referrals", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/verification", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    // Tier 1 — money movement (tips, subs, fundraisers, clan economy).
    { path: "/api/support/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/fundraisers/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/clans/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/love/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/parties/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    // Tier 2 — coin-metered AI / compute (the expensive-to-serve surface).
    { path: "/api/fal/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/meshy/generate", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/buddy/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/game-ai/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/swarm/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/newgameplus/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/code/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/ai/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/vault/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/agents/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/desktop/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/blender/jobs*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/cloud/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    // Tier 3 — social / teams / writes that cost upkeep, XP, or moderation.
    { path: "/api/bot/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/unitunite/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/orgs/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/squads/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/time/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/ghost/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/saves", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/me/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/my/rights", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/vcw/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/cosmetics/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/lobbies/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/matches/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/social/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
    { path: "/api/projects/*", method: "*", advancedOptions: { checkLevel: "deepAnalysis" } },
  ],
});
