import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");

const swarm = read("../lib/swarm.ts");
const createRoute = read("../app/api/swarm/sessions/route.ts");
const detailRoute = read("../app/api/swarm/sessions/[id]/route.ts");
const chatRoute = read("../app/api/swarm/sessions/[id]/chat/route.ts");
const endRoute = read("../app/api/swarm/sessions/[id]/end/route.ts");
const page = read("../app/swarm/page.tsx");
const widget = read("../components/swarm/swarm-chat.tsx");
const mig = read("../supabase/migrations/20260927000000_swarm_chat.sql");
const sitemap = read("../app/sitemap.ts");

// One rule everywhere: the swarm cut is 25%, included never on top.
if (!swarm.includes("SWARM_COMPUTE_CUT_PCT = 25")) throw new Error("Swarm lib must pin SWARM_COMPUTE_CUT_PCT = 25.");
if (!swarm.includes("SWARM_COMPUTE_CUT_PCT") || !swarm.includes("never added on top")) {
  throw new Error("Swarm lib must document the 25%-included rule.");
}
if (!swarm.includes("quoteSwarmTurn") || !swarm.includes("gameAiSplit")) {
  throw new Error("Swarm lib must quote turns through the 25/75 split.");
}

// All tools: VCW + opencode.ai + deepseek harness + fal + buddy + delegation.
for (const tool of ["vcw.open_run", "vcw.file_finding", "vcw.handoff", "opencode.export", "opencode.heal", "deepseek.orchestrate", "fal.generate", "buddy.tts", "swarm.delegate"]) {
  if (!swarm.includes(tool)) throw new Error(`Swarm tool registry missing ${tool}.`);
}
if (!swarm.includes("opencode.ai")) throw new Error("Swarm lib must name opencode.ai.");
if (!swarm.includes("deepseek") || !swarm.includes("planSwarmTurn") || !swarm.includes("OBSERVE")) {
  throw new Error("Swarm lib must self-orchestrate with the DeepSeek harness observe→reason→act pattern.");
}

// Custom system prompts: global + per-agent, sized 1..5.
for (const token of ["cleanSystemPrompt", "cleanAgentPrompt", "SWARM_MAX_AGENTS = 5", "swarmSystemPrompt", "cleanTemperature", "isSwarmOrchestration"]) {
  if (!swarm.includes(token)) throw new Error(`Swarm lib missing ${token}.`);
}

// APIs: auth-gated, rate-limited, meter through the existing RPC (no new ledger).
for (const [name, src] of [["create", createRoute], ["detail", detailRoute], ["chat", chatRoute], ["end", endRoute]]) {
  if (!src.includes("Authentication required")) throw new Error(`Swarm ${name} route must require auth.`);
}
if (!createRoute.includes("rateLimit") || !chatRoute.includes("rateLimit")) throw new Error("Swarm create/chat must rate-limit.");
if (!chatRoute.includes("meter_game_ai_usage")) throw new Error("Swarm chat must meter via meter_game_ai_usage.");
if (!chatRoute.includes("rpcFail") || !chatRoute.includes("Unable to meter this turn")) {
  throw new Error("Swarm chat must fail the turn when metering fails (no free live replies).");
}
if (!chatRoute.includes("localSwarmReply") || !chatRoute.toLowerCase().includes("local swarm reply is free")) {
  throw new Error("Swarm chat must label free local-engine fallbacks.");
}
if (!chatRoute.includes("OPENAI_API_KEY") || !chatRoute.includes("OPENROUTER")) {
  throw new Error("Swarm chat must reason via OpenAI/OpenRouter keys with local fallback.");
}
if (!chatRoute.includes("parseToolCalls") || !chatRoute.includes("[tool:")) {
  throw new Error("Swarm chat must parse automatic tool-call tags.");
}
if (!chatRoute.includes("swarm_sessions") || !chatRoute.includes("swarm_messages")) {
  throw new Error("Swarm chat must persist the trail in swarm tables.");
}
if (!createRoute.includes("swarm_sessions")) throw new Error("Swarm create must write swarm_sessions.");
if (!endRoute.includes("ended")) throw new Error("Swarm end must retire the session.");

// Migration: rerunnable swarm tables, coins move only in meter_game_ai_usage.
for (const token of ["swarm_sessions", "swarm_messages", "orchestration", "system_prompt", "agent_prompts"]) {
  if (!mig.includes(token)) throw new Error(`Swarm migration missing ${token}.`);
}
if (!mig.includes("if not exists") && !mig.includes("IF NOT EXISTS")) throw new Error("Swarm migration must be rerunnable.");
if (!mig.includes("meter_game_ai_usage")) throw new Error("Swarm migration must document metering via meter_game_ai_usage.");

// UI: Spark-like hire + chat with system prompts, streaming, export, voice, trace.
for (const token of ["Hire an agent swarm", "system prompt", "Streaming", "Export MD", "deepseek-harness orchestration trace", "25%"]) {
  const hay = `${page} ${widget}`;
  if (!hay.includes(token)) throw new Error(`Swarm UI missing ${token}.`);
}
if (!widget.includes("SWARM_TOOLS") || !widget.includes("Orchestration")) {
  throw new Error("Swarm widget must expose the tool registry + orchestration picker.");
}
if (!widget.includes("/reset") || !widget.includes("/persona") || !widget.includes("/export")) {
  throw new Error("Swarm widget must document slash commands.");
}
if (!page.includes('canonical: "/swarm"') && !page.includes('canonical: \'/swarm\'')) {
  throw new Error("Swarm page must set its canonical.");
}
if (!sitemap.includes('"/swarm"')) throw new Error("Sitemap must list /swarm.");

console.log("Swarm chat integrity OK.");
