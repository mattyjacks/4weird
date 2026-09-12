import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");

const swarm = read("../lib/swarm.ts");
const brain = read("../lib/swarm-brain.ts");
const createRoute = read("../app/api/swarm/sessions/route.ts");
const detailRoute = read("../app/api/swarm/sessions/[id]/route.ts");
const chatRoute = read("../app/api/swarm/sessions/[id]/chat/route.ts");
const endRoute = read("../app/api/swarm/sessions/[id]/end/route.ts");
const brainRoute = read("../app/api/swarm/brain/route.ts");
const docsRoute = read("../app/api/swarm/docs/route.ts");
const page = read("../app/swarm/page.tsx");
const widget = read("../components/swarm/swarm-chat.tsx");
const mig = read("../supabase/migrations/20260927000000_swarm_chat.sql");
const brainMig = read("../supabase/migrations/20261022000100_swarm_brain.sql");
const sitemap = read("../app/sitemap.ts");

// One rule everywhere: the swarm cut is 25%, included never on top.
if (!swarm.includes("SWARM_COMPUTE_CUT_PCT = 25")) throw new Error("Swarm lib must pin SWARM_COMPUTE_CUT_PCT = 25.");
if (!swarm.includes("SWARM_COMPUTE_CUT_PCT") || !swarm.includes("never added on top")) {
  throw new Error("Swarm lib must document the 25%-included rule.");
}
if (!swarm.includes("quoteSwarmTurn") || !swarm.includes("gameAiSplit")) {
  throw new Error("Swarm lib must quote turns through the 25/75 split.");
}

// All tools: VCW + code export/heal + harness orchestration + fal + buddy + delegation.
for (const tool of ["vcw.open_run", "vcw.file_finding", "vcw.handoff", "opencode.export", "opencode.heal", "deepseek.orchestrate", "fal.generate", "buddy.tts", "swarm.delegate"]) {
  if (!swarm.includes(tool)) throw new Error(`Swarm tool registry missing ${tool}.`);
}
if (!swarm.includes("code-export bridge")) throw new Error("Swarm lib must name the code-export bridge.");
if (!swarm.includes("deepseek") || !swarm.includes("planSwarmTurn") || !swarm.includes("OBSERVE")) {
  throw new Error("Swarm lib must self-orchestrate with the built-in harness observe→reason→act pattern.");
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

// UI: hire + chat with system prompts, streaming, export, voice, trace.
for (const token of ["Hire an agent swarm", "system prompt", "Streaming", "Export MD", "harness orchestration trace", "25%"]) {
  const hay = `${page} ${widget}`;
  if (!hay.includes(token)) throw new Error(`Swarm UI missing ${token}.`);
}
// Replies must thread quoted context into the turn (the API only sees
// message text), never merge into the wrong session after a switch, and
// offer a working regenerate; pins persist on-device; per-message voice.
for (const token of ["Replying to", "activeIdRef", "Regenerate", "lastSent", "swarm-pins", "aria-label"]) {
  if (!widget.includes(token)) throw new Error(`Swarm widget missing reply/regen/pins/a11y: ${token}.`);
}
// Turn gross is split across reply rows (truthful per-message cost).
if (!chatRoute.includes("shares") || !chatRoute.includes("turnGross")) {
  throw new Error("Swarm chat must split the turn gross across reply rows.");
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

// Internal brain (OpenClaw-style): per-user memory, token-cheap by budget.
for (const token of ["compactBrainContext", "extractBrainBullets", "mergeBrainMemory", "rollMemorySummary", "SWARM_BRAIN_CONTEXT_CHARS", "resolveExecMode", "retrieveTxtChunks", "renderRagBlock", "planSpawn", "SWARM_MAX_CHILDREN"]) {
  if (!brain.includes(token)) throw new Error(`Swarm brain lib missing ${token}.`);
}
if (!brain.includes("25% cut INCLUDED")) throw new Error("Swarm brain lib must document the 25%-included rule.");
// Brain + docs APIs: auth-gated, rate-limited, same-origin on writes.
for (const [name, src] of [["brain", brainRoute], ["docs", docsRoute]]) {
  if (!src.includes("Authentication required")) throw new Error(`Swarm ${name} route must require auth.`);
  if (!src.includes("rateLimit")) throw new Error(`Swarm ${name} route must rate-limit.`);
}
if (!brainRoute.includes("swarm_brains")) throw new Error("Swarm brain route must read/write swarm_brains.");
if (!docsRoute.includes("swarm_docs")) throw new Error("Swarm docs route must read/write swarm_docs.");
if (!docsRoute.includes("20 KB") && !docsRoute.includes("20KB")) throw new Error("Swarm docs route must enforce the .txt size cap.");
// Chat must load the brain + RAG, route exec mode, spawn children, and
// write memory back — all best-effort, never failing the metered turn.
for (const token of ["swarm_brains", "swarm_docs", "compactBrainContext", "retrieveTxtChunks", "resolveExecMode", "planSpawn", "parent_session_id", "extractBrainBullets", "rollMemorySummary"]) {
  if (!chatRoute.includes(token)) throw new Error(`Swarm chat missing brain wiring: ${token}.`);
}
if (!chatRoute.includes("never a faked provision") && !chatRoute.includes("never faked")) {
  throw new Error("Swarm chat must mark serverful routing as never-faked.");
}
if (!createRoute.includes("exec_mode") || !createRoute.includes("parent_session_id")) {
  throw new Error("Swarm create must accept exec_mode + parent_session_id.");
}
if (!detailRoute.includes("children")) throw new Error("Swarm detail must return child instances.");
// Brain migration: rerunnable brain + docs tables, session columns, RLS.
for (const token of ["swarm_brains", "swarm_docs", "parent_session_id", "exec_mode", "memory_summary"]) {
  if (!brainMig.includes(token)) throw new Error(`Swarm brain migration missing ${token}.`);
}
if (!brainMig.includes("if not exists") && !brainMig.includes("IF NOT EXISTS")) throw new Error("Swarm brain migration must be rerunnable.");
if (!brainMig.includes("meter_game_ai_usage")) throw new Error("Swarm brain migration must document metering via meter_game_ai_usage.");
// UI: brain panel + .txt docs + exec mode + child links.
for (const token of ["Internal brain", "/api/swarm/brain", "/api/swarm/docs", "Serverless", "child"]) {
  if (!widget.includes(token)) throw new Error(`Swarm widget missing brain UI: ${token}.`);
}

console.log("Swarm chat integrity OK.");
