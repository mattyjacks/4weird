/**
 * Game AI compute; one rule everywhere: every AI price INCLUDES the 25%
 * platform cut (GAME_AI_COMPUTE_CUT_PCT), never added on top.
 *
 * Games may declare AI features as `required` (core loop needs it: an
 * OpenAI dialogue bot, an AI game director) or `optional` (enhancement the
 * player can toggle). Either way the meter is identical:
 *   gross (debited) -> cut = round(gross*25/100) -> provider = gross - cut.
 *
 * Providers behind the meter: rented RunPods (GPU dialogue/director
 * workers), hosted inference endpoints, and AI APIs (OpenAI chat + TTS).
 * The wallet pays gross coins (100 coins = $1.00); the ledger attributes
 * the 25% per game + feature kind so /my/usage can show it.
 */

import { SERVICE_CUT_PCT } from "@/lib/economy";

/** Same 25% as SERVICE_CUT_PCT / WORKSPACE_COMPUTE_CUT_PCT; one rule. */
export const GAME_AI_COMPUTE_CUT_PCT = 25;

export const GAME_AI_KINDS = [
  "dialogue",
  "director",
  "tts",
  "runpod-gpu",
  "inference",
  "buddy-chat",
  "buddy-tts",
  "buddy-avatar",
  "buddy-camera",
] as const;
export type GameAiKind = (typeof GAME_AI_KINDS)[number];

export const GAME_AI_MODES = ["required", "optional"] as const;
export type GameAiMode = (typeof GAME_AI_MODES)[number];

export function isGameAiKind(value: unknown): value is GameAiKind {
  return typeof value === "string" && (GAME_AI_KINDS as readonly string[]).includes(value);
}

export function isGameAiMode(value: unknown): value is GameAiMode {
  return typeof value === "string" && (GAME_AI_MODES as readonly string[]).includes(value);
}

/** Gross coin price per unit, cut INCLUDED. Units match cloud-catalog style. */
export type GameAiRate = { kind: GameAiKind; unit: string; coinsPerUnit: number; blurb: string };
export const GAME_AI_RATES: GameAiRate[] = [
  { kind: "dialogue", unit: "1k_tokens", coinsPerUnit: 3, blurb: "OpenAI dialogue bot (NPC chat, quests)" },
  { kind: "director", unit: "decision", coinsPerUnit: 2, blurb: "AI game director ( pacing, spawns, difficulty)" },
  { kind: "tts", unit: "1k_chars", coinsPerUnit: 2, blurb: "In-game voice lines (OpenAI TTS)" },
  { kind: "runpod-gpu", unit: "gpu_min", coinsPerUnit: 12, blurb: "Rented RunPod GPU backing game AI" },
  { kind: "inference", unit: "worker_min", coinsPerUnit: 6, blurb: "Hosted inference endpoint for game AI" },
  { kind: "buddy-chat", unit: "1k_tokens", coinsPerUnit: 3, blurb: "Gaming Buddy conversation (screen-aware)" },
  { kind: "buddy-tts", unit: "1k_chars", coinsPerUnit: 2, blurb: "Gaming Buddy voice output (9 OpenAI voices)" },
  { kind: "buddy-avatar", unit: "min", coinsPerUnit: 0.08, blurb: "Buddy 3D avatar presence (optional, 8 centicentcoins/min)" },
  { kind: "buddy-camera", unit: "frame", coinsPerUnit: 0.03, blurb: "Camera emotion/body-language frame (optional, 3 centicentcoins/frame)" },
];

export function rateForKind(kind: GameAiKind): GameAiRate | undefined {
  return GAME_AI_RATES.find((r) => r.kind === kind);
}

/** Split a game-AI gross charge into platform cut + provider share. */
export function gameAiSplit(grossCoins: number): { gross: number; cut: number; provider: number } {
  // Mirror SQL meter: round(gross,2), cut=round(gross*25/100,2), provider=gross-cut.
  const gross = Math.max(0, Math.round(Number(grossCoins) * 100) / 100);
  const cut = Math.round((gross * GAME_AI_COMPUTE_CUT_PCT) / 100 * 100) / 100;
  return { gross, cut, provider: Math.round((gross - cut) * 100) / 100 };
}

/** Quote gross coins for a kind x qty (qty = tokens/1000, chars/1000, minutes, decisions). */
export function quoteGameAi(kind: GameAiKind, qty: number): number {
  const rate = rateForKind(kind);
  if (!rate || !Number.isFinite(qty) || qty <= 0) return 0;
  return Math.max(1, Math.ceil(rate.coinsPerUnit * qty));
}

export function quoteGameAiSplit(kind: GameAiKind, qty: number): { gross: number; cut: number; provider: number } {
  return gameAiSplit(quoteGameAi(kind, qty));
}

/** The 9 OpenAI TTS voices the Gaming Buddy (and game TTS) can use. */
export type BuddyVoice = {
  id: string;
  label: string;
  tone: string;
  blurb: string;
};
export const BUDDY_VOICES: BuddyVoice[] = [
  { id: "alloy", label: "Alloy", tone: "Neutral", blurb: "Balanced default voice. Works across most use cases without drawing attention." },
  { id: "ash", label: "Ash", tone: "Warm", blurb: "Approachable and friendly. Good for chatbots and casual interactions." },
  { id: "coral", label: "Coral", tone: "Clear", blurb: "Clean and polished. Suited for business, education, and formal content." },
  { id: "echo", label: "Echo", tone: "Deep", blurb: "Low and authoritative. Natural fit for narration and documentary content." },
  { id: "fable", label: "Fable", tone: "Animated", blurb: "Energetic character. Works for audiobooks and personality-driven reads." },
  { id: "onyx", label: "Onyx", tone: "Bold", blurb: "Strong presence. Good for announcements and high-impact messaging." },
  { id: "nova", label: "Nova", tone: "Bright", blurb: "Upbeat without overdoing it. Works for apps, tutorials, and customer-facing use." },
  { id: "sage", label: "Sage", tone: "Calm", blurb: "Steady pacing, no rush. Fits meditation, education, and instructional guides." },
  { id: "shimmer", label: "Shimmer", tone: "Soft", blurb: "Most intimate tone. Suited for personal content and quiet moments." },
];

export function isBuddyVoice(value: unknown): value is string {
  const v = String(value ?? "").toLowerCase();
  return BUDDY_VOICES.some((b) => b.id === v);
}

/** Default Buddy voice: Nova (bright). Alloy stays valid, just not default. */
export const BUDDY_DEFAULT_VOICE = "nova";

export function cleanBuddyVoice(value: unknown): string {
  const v = String(value ?? "").toLowerCase();
  return isBuddyVoice(v) ? v : BUDDY_DEFAULT_VOICE;
}

export const BUDDY_TTS_MODELS = ["tts-1", "tts-1-hd"] as const;
export function isBuddyModel(value: unknown): boolean {
  return typeof value === "string" && (BUDDY_TTS_MODELS as readonly string[]).includes(value);
}

export function cleanBuddySpeed(value: unknown): number {
  const v = Number(value);
  if (!Number.isFinite(v)) return 1.0;
  return Math.min(2.0, Math.max(0.5, Math.round(v * 4) / 4));
}

export type GameAiFeature = {
  gameSlug: string;
  kind: GameAiKind;
  mode: GameAiMode;
  provider: "runpod" | "openai" | "inference-api" | "custom";
  label: string;
  blurb: string;
};

/**
 * Static registry of games shipping AI features. Games not listed here are
 * treated as "no AI" (free). Keeping it static means the play shell can
 * render the 25% disclosure without a DB round-trip; operators promote a
 * row into public.game_ai_features (migration) when they wire real
 * providers; the API merges both sources.
 */
export const GAME_AI_FEATURES: GameAiFeature[] = [
  { gameSlug: "gravegain2d", kind: "dialogue", mode: "optional", provider: "openai", label: "NPC dialogue bot", blurb: "Procedural-dungeon NPCs talk back via an OpenAI dialogue bot." },
  { gameSlug: "gravegain2d", kind: "director", mode: "optional", provider: "runpod", label: "AI game director", blurb: "RunPod-backed director paces spawns and loot." },
  { gameSlug: "gravegain3d", kind: "dialogue", mode: "optional", provider: "openai", label: "NPC dialogue bot", blurb: "Dungeon NPCs talk back via an OpenAI dialogue bot." },
  { gameSlug: "gravegain3d", kind: "director", mode: "optional", provider: "runpod", label: "AI game director", blurb: "RunPod-backed director paces encounters." },
  { gameSlug: "lastwordszombies", kind: "director", mode: "optional", provider: "runpod", label: "AI game director", blurb: "Director tunes cyber-unit waves to your typing speed." },
  { gameSlug: "lastwordszombies", kind: "tts", mode: "optional", provider: "openai", label: "Unit voice lines", blurb: "Rogue cyber-units taunt you in any of 9 voices." },
  { gameSlug: "assassinanimals", kind: "director", mode: "optional", provider: "inference-api", label: "AI game director", blurb: "Facility layouts and patrols adapt to your stealth." },
  { gameSlug: "battlesharks2", kind: "tts", mode: "optional", provider: "openai", label: "Mutation announcer", blurb: "Cybernetic upgrade callouts in 9 voices." },
  { gameSlug: "serversavershield", kind: "director", mode: "required", provider: "runpod", label: "AI attack director (required)", blurb: "This game requires AI directing: attack waves are generated on rented RunPods." },
  { gameSlug: "platform-wars", kind: "director", mode: "optional", provider: "runpod", label: "AI arena director", blurb: "Arena events and balancing from a rented GPU director." },
];

export function featuresForGame(slug: string): GameAiFeature[] {
  return GAME_AI_FEATURES.filter((f) => f.gameSlug === slug);
}

export function gameRequiresAi(slug: string): boolean {
  return featuresForGame(slug).some((f) => f.mode === "required");
}

export const GAME_AI_CUT_NOTE = `Includes ${GAME_AI_COMPUTE_CUT_PCT}% platform cut (same ${SERVICE_CUT_PCT}% as all compute); never added on top.`;

/* ---------------------------------------------------------------------------
 * Accurate Buddy cost table; true upstream USD -> gross Vibe Coins.
 *
 * Every Buddy turn touches real paid APIs plus real database writes:
 *   - OpenAI chat (BUDDY_MODEL, default gpt-4o-mini): input + output tokens.
 *   - OpenAI TTS (tts-1 / tts-1-hd): characters spoken.
 *   - Optional screen snapshot: billed as image input tokens on the chat leg.
 *   - Supabase: 1-2 metered writes + session update + reads per turn.
 *
 * Rule: gross (debited) = provider_USD * 100 coins/$ / 0.75, rounded to the
 * centicentcoin (0.01 coins). The 25% cut stays INCLUDED, never on top.
 * The meter_game_ai_usage RPC recomputes gross from qty at fixed kind rates
 * (buddy-chat 3/1k, buddy-tts 2/1k), so callers pass a derived qty
 * (gross / rate) to land the ledger on the true-cost gross. Minimum 0.01
 * coins (1 centicentcoin) per metered leg.
 *
 * Upstream prices are pinned below and overridable via env for ops without
 * a code change (see .env.example). Update them when OpenAI/Supabase move.
 * ------------------------------------------------------------------------- */

import { coinsToCenticentcoins } from "@/lib/economy";

/** USD per 1M tokens for the buddy chat model (gpt-4o-mini, 2026 list). */
export const BUDDY_CHAT_USD_PER_1M_INPUT = 0.15;
export const BUDDY_CHAT_USD_PER_1M_OUTPUT = 0.6;
/** USD per 1M chars for Buddy TTS models (2026 list). */
export const BUDDY_TTS_USD_PER_1M_CHARS: Record<string, number> = {
  "tts-1": 15,
  "tts-1-hd": 30,
};
/** One downscaled screen snapshot ≈ this many chat input tokens (low-res). */
export const BUDDY_SCREENSHOT_INPUT_TOKENS = 1000;
/** Amortized Supabase cost per metered leg (writes + session update + reads). */
export const BUDDY_DB_USD_PER_LEG = 0.00002;

function envNum(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

export function buddyChatUsdPer1M(): { input: number; output: number } {
  return {
    input: envNum("BUDDY_CHAT_USD_PER_1M_INPUT", BUDDY_CHAT_USD_PER_1M_INPUT),
    output: envNum("BUDDY_CHAT_USD_PER_1M_OUTPUT", BUDDY_CHAT_USD_PER_1M_OUTPUT),
  };
}

export function buddyTtsUsdPer1M(model: string): number {
  const env = Number(process.env[`BUDDY_TTS_USD_PER_1M_${model.replace(/-/g, "_").toUpperCase()}`]);
  if (Number.isFinite(env) && env >= 0) return env;
  return BUDDY_TTS_USD_PER_1M_CHARS[model] ?? BUDDY_TTS_USD_PER_1M_CHARS["tts-1"];
}

export function buddyDbUsdPerLeg(): number {
  return envNum("BUDDY_DB_USD_PER_LEG", BUDDY_DB_USD_PER_LEG);
}

export type BuddyCostBreakdown = {
  /** Gross coins debited (rounded to centicentcoin, min 0.01). */
  grossCoins: number;
  /** Same gross in integer centicentcoins (1 coin = 100). */
  grossCenticentcoins: number;
  cut: number;
  provider: number;
  /** Provider-side USD before the cut (what OpenAI/Supabase actually cost). */
  usdProvider: number;
  /** Gross USD equivalent at 100 coins = $1.00. */
  usdGross: number;
  parts: Record<string, number>;
  /** qty to pass to meter_game_ai_usage so the ledger lands on grossCoins. */
  rpcQty: number;
};

function toGross(providerUsd: number, ratePerQty: number): BuddyCostBreakdown {
  const grossRaw = (providerUsd * 100) / (1 - GAME_AI_COMPUTE_CUT_PCT / 100);
  const gross = Math.max(0.01, Math.round(grossRaw * 100) / 100);
  const split = gameAiSplit(gross);
  return {
    grossCoins: split.gross,
    grossCenticentcoins: coinsToCenticentcoins(split.gross),
    cut: split.cut,
    provider: split.provider,
    usdProvider: Math.round(providerUsd * 1000000) / 1000000,
    usdGross: Math.round(split.gross * 100) / 10000,
    parts: {},
    rpcQty: Math.max(0.0001, split.gross / ratePerQty),
  };
}

/** Accurate chat-leg cost: tokens + attached frames + one DB leg. */
export function quoteBuddyChatLeg(input: {
  promptChars: number;
  replyChars: number;
  hasScreenshot?: boolean;
  /** Distinct frames attached this turn (screen + camera). Defaults to hasScreenshot ? 1 : 0. */
  imageCount?: number;
}): BuddyCostBreakdown {
  const rate = buddyChatUsdPer1M();
  const inTokens = Math.max(1, Math.ceil(input.promptChars / 4));
  const outTokens = Math.max(1, Math.ceil(input.replyChars / 4));
  const chatUsd = (inTokens / 1_000_000) * rate.input + (outTokens / 1_000_000) * rate.output;
  const units = Number.isFinite(input.imageCount)
    ? Math.max(0, Math.floor(Number(input.imageCount)))
    : input.hasScreenshot ? 1 : 0;
  const imageUsd = (units * BUDDY_SCREENSHOT_INPUT_TOKENS / 1_000_000) * rate.input;
  const dbUsd = buddyDbUsdPerLeg();
  const out = toGross(chatUsd + imageUsd + dbUsd, 3);
  out.parts = {
    chatUsd: Math.round(chatUsd * 1000000) / 1000000,
    imageUsd: Math.round(imageUsd * 1000000) / 1000000,
    imageUnits: units,
    dbUsd,
    inTokens,
    outTokens,
  };
  return out;
}

/** Accurate TTS-leg cost: chars at the selected model rate + one DB leg. */
export function quoteBuddyTtsLeg(input: { chars: number; model: string }): BuddyCostBreakdown {
  const per1M = buddyTtsUsdPer1M(input.model);
  const ttsUsd = (Math.max(1, input.chars) / 1_000_000) * per1M;
  const dbUsd = buddyDbUsdPerLeg();
  const out = toGross(ttsUsd + dbUsd, 2);
  out.parts = { ttsUsd: Math.round(ttsUsd * 1000000) / 1000000, dbUsd, chars: Math.max(1, input.chars) };
  return out;
}

/** Human line for the widget: "2.15 coins (215 centicentcoins) ≈ $0.0215". */
export function formatBuddyCost(cost: Pick<BuddyCostBreakdown, "grossCoins" | "grossCenticentcoins" | "usdGross">): string {
  return `${cost.grossCoins} coins (${cost.grossCenticentcoins} centicentcoins) ≈ $${cost.usdGross.toFixed(4)}`;
}

/* ---------------------------------------------------------------------------
 * Presence metering; avatar minutes + camera frames, in centicentcoins.
 *
 * Fixed per-unit rates mirror the meter_game_ai_usage RPC case arms
 * (buddy-avatar 0.08 coins/min = 8 centicentcoins/min, buddy-camera 0.03
 * coins/frame = 3 centicentcoins/frame, 0.01-coin floor). Same 25%-included
 * split as every other kind via gameAiSplit. Dedicated fns (not
 * quoteGameAi) so fractional qty keeps centicentcoin accuracy instead of
 * ceil-ing to whole coins.
 * ------------------------------------------------------------------------- */

export const AVATAR_COINS_PER_MIN = 0.08;
export const CAMERA_COINS_PER_FRAME = 0.03;

export type PresenceQuote = {
  grossCoins: number;
  grossCenticentcoins: number;
  cut: number;
  provider: number;
  display: string;
};

function presenceQuote(gross: number): PresenceQuote {
  const split = gameAiSplit(gross);
  return {
    grossCoins: split.gross,
    grossCenticentcoins: coinsToCenticentcoins(split.gross),
    cut: split.cut,
    provider: split.provider,
    display: `${split.gross} coins (${coinsToCenticentcoins(split.gross)} centicentcoins)`,
  };
}

/** Gross quote for avatar presence (qty in minutes, fractional ok). */
export function quoteAvatarMinutes(minutes: number): PresenceQuote {
  const m = Number(minutes);
  if (!Number.isFinite(m) || m <= 0) return presenceQuote(0.01);
  return presenceQuote(Math.max(0.01, Math.round(AVATAR_COINS_PER_MIN * m * 100) / 100));
}

/** Gross quote for camera frames (qty in frames). */
export function quoteCameraFrames(frames: number): PresenceQuote {
  const n = Number(frames);
  if (!Number.isFinite(n) || n <= 0) return presenceQuote(0.01);
  return presenceQuote(Math.max(0.01, Math.round(CAMERA_COINS_PER_FRAME * n * 100) / 100));
}
