import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const economy = read("../lib/economy.ts");
const gameAi = read("../lib/game-ai.ts");
const catalog = read("../lib/cloud-catalog.ts");
const buddyEngine = read("../lib/buddy-engine.ts");
const migration = read("../supabase/migrations/20260910160000_game_ai_compute.sql");
const meter = read("../app/api/game-ai/meter/route.ts");
const features = read("../app/api/game-ai/features/route.ts");
const chat = read("../app/api/buddy/chat/route.ts");
const tts = read("../app/api/buddy/tts/route.ts");
const usage = read("../app/api/my/usage/route.ts");
const usagePage = read("../app/my/usage/page.tsx");
const buddyPage = read("../app/buddy/page.tsx");
const widget = read("../components/buddy/gaming-buddy.tsx");

// One rule everywhere: the game-AI cut is 25%, same constant in both libs.
if (!economy.includes("GAME_AI_COMPUTE_CUT_PCT = 25")) throw new Error("Economy must define GAME_AI_COMPUTE_CUT_PCT = 25.");
if (!economy.includes("gameAiComputeSplit")) throw new Error("Economy must export gameAiComputeSplit.");
if (!gameAi.includes("GAME_AI_COMPUTE_CUT_PCT = 25")) throw new Error("Game AI lib must pin the 25% cut.");
if (!gameAi.includes("gameAiSplit")) throw new Error("Game AI lib must export gameAiSplit.");
if (!gameAi.includes("GAME_AI_FEATURES")) throw new Error("Game AI lib must declare required/optional features.");

// All 9 OpenAI voices present (Alloy -> Shimmer).
for (const voice of ["alloy", "ash", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer"]) {
  if (!gameAi.includes(`id: "${voice}"`)) throw new Error(`Voice ${voice} missing from game-ai lib.`);
}
if (!gameAi.includes("tts-1-hd") || !gameAi.includes("tts-1")) throw new Error("Buddy TTS models tts-1/tts-1-hd missing.");
if (!buddyEngine.includes("OBSERVE") || !buddyEngine.includes("VibeCodeWorker")) {
  throw new Error("Buddy engine must reuse the VibeCodeWorker observe->reason->act loop.");
}

// Catalog carries the game-AI + buddy services with the 25% note.
for (const key of ["game-ai-dialogue", "game-ai-director", "game-ai-tts", "buddy-chat", "buddy-voice"]) {
  if (!catalog.includes(key)) throw new Error(`Cloud catalog missing ${key}.`);
}
if (!catalog.includes("Game AI")) throw new Error("Cloud catalog must have a Game AI category.");

// Migration meters with the 25% cut and never fakes a provision.
for (const token of ["meter_game_ai_usage", "start_buddy_session", "end_buddy_session", "my_compute_usage", "game_ai_usage", "buddy_sessions", "round(", "25 / 100"]) {
  if (!migration.includes(token)) throw new Error(`Migration missing ${token}.`);
}
if (!migration.includes("IF NOT EXISTS") && !migration.includes("if not exists")) throw new Error("Migration must be rerunnable.");

// APIs exist, require auth (features is public by design so play shells
// render the 25% disclosure without login), and meter through the RPC.
for (const [name, src] of [["meter", meter], ["chat", chat], ["tts", tts], ["usage", usage]]) {
  if (!src.includes("Authentication required")) throw new Error(`${name} API must require auth.`);
}
if (!features.includes("game_ai_features")) throw new Error("features API must read game_ai_features.");
if (!meter.includes("meter_game_ai_usage")) throw new Error("Meter API must call meter_game_ai_usage.");
if (!chat.includes("meter_game_ai_usage") || !chat.includes("OPENAI_API_KEY")) throw new Error("Buddy chat must meter + honor OPENAI_API_KEY.");
if (!chat.includes("/v1/responses") || !chat.includes("output_text") || !chat.includes('part.type === "output_text"')) {
  throw new Error("Buddy chat must use the OpenAI Responses API and read its output message text.");
}
if (chat.includes('p_kind: "buddy-tts"')) {
  throw new Error("Buddy chat must not meter voice; the TTS endpoint owns that charge.");
}
// Metering gates the goods: a failed meter must fail the turn/audio, never
// serve a free reply (each would also leak real OpenAI spend).
if (!chat.includes("rpcFail") || !chat.includes("Unable to meter this turn")) {
  throw new Error("Buddy chat must fail the turn when metering fails (no free replies).");
}
if (!tts.includes("rpcFail") || tts.indexOf("meter_game_ai_usage") > tts.indexOf("audio/speech")) {
  throw new Error("Buddy TTS must meter before calling OpenAI.");
}
if (!tts.includes("audio/speech") || !tts.includes("speechSynthesis") && !tts.includes("fallback")) {
  throw new Error("Buddy TTS must proxy OpenAI speech with a browser fallback.");
}
if (!tts.includes('if (!key) return ok({ fallback: true') || tts.indexOf('if (!key)') > tts.indexOf("meter_game_ai_usage")) {
  throw new Error("Buddy browser-speech fallback must return before metering.");
}
if (!usage.includes("my_compute_usage") || !usage.includes("lastHour") || !usage.includes("last24h")) {
  throw new Error("Usage API must return session/total/last-hour/last-24h via my_compute_usage.");
}
if (!usage.includes("serverless-worker") || !usage.includes("functions")) throw new Error("Usage API must break out function runs.");
// Centicentcoin accuracy: rollups stay numeric (no ::integer truncation of
// fractional coins like 0.41), and clan fees are a first-class section.
const usageNumericMig = read("../supabase/migrations/20260917000000_usage_numeric_and_clan_breakout.sql");
if (!usageNumericMig.includes("my_compute_usage") || !usageNumericMig.includes("numeric(12, 2)")) {
  throw new Error("Usage numeric migration must redefine my_compute_usage with numeric sums.");
}
if (!usageNumericMig.includes("my_clan_usage") || !usageNumericMig.includes("Clan %")) {
  throw new Error("Usage numeric migration must define my_clan_usage over Clan ledger reasons.");
}
if (!usage.includes("my_clan_usage") || !usage.includes("clanTotalGross")) {
  throw new Error("Usage API must include the clan personal-spend section in combined totals.");
}

// Pages: usage shows all four windows + functions; buddy + widget cover 9 voices + spend.
for (const token of ["Current session", "Total (all time)", "Last 24 hours", "Last hour", "Functions", "byKind", "byGame", "recentGameAi"]) {
  if (!read("../app/my/usage/usage-client.tsx").includes(token)) throw new Error(`Usage client missing ${token}.`);
}
if (!usagePage.includes("/my/usage")) throw new Error("Usage page must be the /my/usage/ route.");
if (!buddyPage.includes("Gaming Buddy") || !buddyPage.includes("9")) throw new Error("Buddy page must present the universal buddy.");
if (!widget.includes("BUDDY_VOICES") && !widget.includes("9")) throw new Error("Buddy widget must offer the 9 voices.");
if (!widget.includes("/api/my/usage")) throw new Error("Buddy widget must show live session/total/24h/1h spend from /api/my/usage.");
for (const token of ["Ask for tactics", "Hail enemy AI", "counter-tactic"]) {
  if (!widget.includes(token)) throw new Error(`Buddy widget missing playable AI action: ${token}.`);
}
if (!buddyEngine.includes("Never claim you can see hidden game state")) {
  throw new Error("Buddy tactics must not invent unseen game state.");
}
// Widget hardening: score feed must be origin-checked (ad iframes share the
// page), turns must be busy-guarded (no double-metering), voice must stop on
// unmount/end.
for (const token of ["TRUSTED_GAME_ORIGINS", "stopVoice", "!text.trim() || busy"]) {
  if (!widget.includes(token)) throw new Error(`Widget missing hardening: ${token}.`);
}
if (!widget.includes("if (r.fallback) {") || !widget.includes("} else {\n        try {\n          const t = await post")) {
  throw new Error("Fallback Buddy replies must use browser speech without calling billable TTS.");
}
if (buddyEngine.includes("BuddyAct") || buddyEngine.includes("buddyConfigured")) {
  throw new Error("buddy-engine must not carry dead/unusable exports.");
}

// Nova is the default voice everywhere (Alloy stays valid, not default).
if (!gameAi.includes('BUDDY_DEFAULT_VOICE = "nova"')) throw new Error("Game AI lib must pin Nova as BUDDY_DEFAULT_VOICE.");
if (!widget.includes("BUDDY_DEFAULT_VOICE") || !widget.includes('useState(BUDDY_DEFAULT_VOICE)')) {
  throw new Error("Buddy widget must default its voice to BUDDY_DEFAULT_VOICE (Nova).");
}
const session = read("../app/api/buddy/session/route.ts");
if (!session.includes("BUDDY_DEFAULT_VOICE") || !session.includes("cleanBuddyVoice")) {
  throw new Error("Buddy session API must default + validate the voice as Nova.");
}
if (!buddyEngine.includes("BUDDY_DEFAULT_VOICE")) throw new Error("Buddy engine fallback persona must follow the Nova default.");

// Screen share: explicit opt-in, tab-isolated option, snapshot-only.
for (const token of ["getDisplayMedia", "preferCurrentTab", "Share this tab only", "Stop sharing", "screen_image", "captureSnapshot", "stopSharing"]) {
  if (!widget.includes(token)) throw new Error(`Widget missing screen-share flow: ${token}.`);
}
if (!buddyEngine.includes("cleanScreenImage") || !buddyEngine.includes("hasScreenshot")) {
  throw new Error("Buddy engine must validate screen snapshots (cleanScreenImage + hasScreenshot).");
}
if (!chat.includes("screen_image") || !chat.includes("input_image") || !chat.includes("cleanScreenImage")) {
  throw new Error("Buddy chat must accept a screen snapshot and forward it as Responses API image input.");
}
// No silent capture: snapshots only ride on an explicit user message turn.
if (!widget.includes("shareMode === \"off\" ? null : captureSnapshot()")) {
  throw new Error("Widget must only capture a snapshot while sharing is on.");
}
// Echo-bug guard: the widget must not quote its own transcript into prompts.
if (!widget.includes("data-buddy") || !widget.includes('closest("[data-buddy]")')) {
  throw new Error("Widget must exclude its own UI (data-buddy) from screen-text observation.");
}

// True-cost metering: USD rates + DB leg + Coins/CentiCentCoins breakdown.
for (const token of ["quoteBuddyChatLeg", "quoteBuddyTtsLeg", "BUDDY_DB_USD_PER_LEG", "grossCenticentcoins", "rpcQty", "formatBuddyCost"]) {
  if (!gameAi.includes(token)) throw new Error(`Game AI lib missing true-cost metering: ${token}.`);
}
if (!chat.includes("quoteBuddyChatLeg") || !chat.includes("grossCenticentcoins")) {
  throw new Error("Buddy chat must meter true cost with a Coins/CentiCentCoins breakdown.");
}
if (!tts.includes("quoteBuddyTtsLeg") || !tts.includes("grossCenticentcoins")) {
  throw new Error("Buddy TTS must meter true per-model cost with a Coins/CentiCentCoins breakdown.");
}
if (!widget.toLowerCase().includes("centicentcoins") || !widget.includes("lastCost")) {
  throw new Error("Widget must show the per-turn Coins + CentiCentCoins cost.");
}
console.log("Game AI + Buddy integrity OK.");
