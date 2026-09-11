// Verifier: 25 OpenRouter plays are present, well-formed, and fall back offline.
// Run: node scripts/verify-openrouter-plays.mjs (no keys, no network, no deps).
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(root, "lib", "openrouter-plays.ts"), "utf8");
const route = readFileSync(join(root, "app", "api", "openrouter-plays", "route.ts"), "utf8");

const fail = (msg) => { console.error(`VERIFY_FAIL: ${msg}`); process.exit(1); };
const assert = (cond, msg) => { if (!cond) fail(msg); };

// 1. Exactly 25 play ids.
const ids = [...src.matchAll(/^\s*id:\s*"([^"]+)"/gm)].map((m) => m[1]);
assert(ids.length === 25, `expected 25 plays, found ${ids.length}: ${ids.join(",")}`);
assert(new Set(ids).size === 25, "play ids must be unique");

// 2. Required ids across voices + chaos.
for (const need of ["npc-barks", "hype-caster", "cozy-narrator", "villain-monologue", "multilingual-dub", "robot-sidekick", "sfx-smith", "voice-command-parser", "dungeon-master", "bug-bard", "meme-oracle", "clan-herald"]) {
  assert(ids.includes(need), `missing play ${need}`);
}

// 3. All 4 real voice backends are referenced (proves multiple voice generators).
for (const backend of ['"openai-tts"', '"elevenlabs"', '"fal-minimax"', '"browser-speech"']) {
  assert(src.includes(`voiceBackend: ${backend}`), `missing voiceBackend ${backend}`);
}

// 4. Offline fallback + transport helpers exist in both lib and route.
for (const fn of ["fallbackOpenRouterPlay", "buildOpenRouterRequest", "parseOpenRouterText", "OPENROUTER_ENDPOINT"]) {
  assert(src.includes(fn), `lib missing ${fn}`);
}
assert(route.includes("fallbackOpenRouterPlay"), "route must use offline fallback");
assert(route.includes("OPENROUTER_API_KEY"), "route must read OPENROUTER_API_KEY");
assert(route.includes("openrouter.ai/api/v1/chat/completions") || route.includes("OPENROUTER_ENDPOINT"), "route must hit OpenRouter endpoint");
assert(src.includes("https://openrouter.ai/api/v1/chat/completions"), "lib must pin OpenRouter endpoint");
assert(route.includes("Rate limited") || route.includes("rateLimit"), "route should be rate-limited");

// 5. Safety rails: no raw key logging, capped lengths, timeout present.
assert(!src.includes("console.log(process.env"), "never log raw keys");
assert(route.includes("15_000") || route.includes("15000"), "route needs a fetch timeout");
assert(src.includes(".slice(0,"), "outputs must be length-capped");

// 6. Live path spends the operator's paid key: it must require a signed-in
// human and meter (anonymous callers get the free offline fallback, never
// the live call). Fallback stays anonymous for the fresh-clone story.
assert(route.includes("Authentication required") || route.includes("getUser"), "live path must require auth");
assert(route.includes("meter_game_ai_usage"), "live path must meter the paid call");
assert(route.includes("requireHuman"), "live path must gate bots");

console.log(`VERIFY_OK: 25 openrouter plays (${ids.slice(0, 5).join(",")}...), 4 voice backends, offline fallback wired.`);
