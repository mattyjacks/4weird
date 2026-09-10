/**
 * Game AI compute — one rule everywhere: every AI price INCLUDES the 25%
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

/** Same 25% as SERVICE_CUT_PCT / WORKSPACE_COMPUTE_CUT_PCT — one rule. */
export const GAME_AI_COMPUTE_CUT_PCT = 25;

export const GAME_AI_KINDS = [
  "dialogue",
  "director",
  "tts",
  "runpod-gpu",
  "inference",
  "buddy-chat",
  "buddy-tts",
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
];

export function rateForKind(kind: GameAiKind): GameAiRate | undefined {
  return GAME_AI_RATES.find((r) => r.kind === kind);
}

/** Split a game-AI gross charge into platform cut + provider share. */
export function gameAiSplit(grossCoins: number): { gross: number; cut: number; provider: number } {
  const gross = Math.max(0, Math.floor(grossCoins));
  const cut = Math.round((gross * GAME_AI_COMPUTE_CUT_PCT) / 100);
  return { gross, cut, provider: gross - cut };
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

export function cleanBuddyVoice(value: unknown): string {
  const v = String(value ?? "").toLowerCase();
  return isBuddyVoice(v) ? v : "alloy";
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
 * providers — the API merges both sources.
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

export const GAME_AI_CUT_NOTE = `Includes ${GAME_AI_COMPUTE_CUT_PCT}% platform cut (same ${SERVICE_CUT_PCT}% as all compute) — never added on top.`;
