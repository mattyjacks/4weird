/**
 * fal.ai media compute — 15 magical game-dev + coding tools.
 *
 * One rule everywhere: every fal price INCLUDES the 25% platform cut
 * (FAL_COMPUTE_CUT_PCT = 25, same as SERVICE_CUT_PCT /
 * GAME_AI_COMPUTE_CUT_PCT / WORKSPACE_COMPUTE_CUT_PCT), never added on top.
 * The wallet is debited the gross; the ledger splits 25% platform /
 * 75% provider per op + game.
 *
 * Client-safe: this module never leaks the key. falKey()/falConfigured()
 * read server env only when called on the server; the catalog constants
 * below render in the browser with no credentials.
 *
 * Env (server-only, never NEXT_PUBLIC_):
 *   FAL_KEY (official fal SDK name) — FAL_API_KEY accepted as an alias.
 *   FAL_API_BASE overrides the queue base (default https://queue.fal.run).
 */

import { SERVICE_CUT_PCT } from "@/lib/economy";

/** Same 25% as every other compute surface — one rule. */
export const FAL_COMPUTE_CUT_PCT = 25;

export const FAL_OP_KEYS = [
  "concept-art",
  "sprite-edit",
  "icon-logo",
  "texture-tile",
  "upscale-hd",
  "remove-bg",
  "render-3d",
  "trailer-clip",
  "animate-sprite",
  "npc-voice",
  "sfx-burst",
  "theme-music",
  "lipsync-take",
  "playtest-notes",
  "app-promo",
] as const;
export type FalOp = (typeof FAL_OP_KEYS)[number];

export function isFalOp(value: unknown): value is FalOp {
  return typeof value === "string" && (FAL_OP_KEYS as readonly string[]).includes(value);
}

export type FalKind = "image" | "video" | "audio" | "model-3d" | "text";

export type FalOpDef = {
  op: FalOp;
  name: string;
  unit: string;
  coinsPerUnit: number;
  blurb: string;
  category: string;
  /** fal queue model endpoint, e.g. fal-ai/flux/schnell. */
  model: string;
  kind: FalKind;
  /** True when the op needs a source image_url (edits, upscale, 3D, animation). */
  needsImage: boolean;
  /** True when the op needs a prompt/text. */
  needsPrompt: boolean;
};

/**
 * 15 ways to use fal across game dev + coding. Gross Vibe Coins per unit,
 * 25% cut INCLUDED. Units match cloud-catalog style (image/clip/1k_chars/min).
 */
export const FAL_OPS: FalOpDef[] = [
  { op: "concept-art", name: "Concept Art", unit: "image", coinsPerUnit: 8, blurb: "FLUX-speed key art: levels, characters, loading screens.", category: "Game Art", model: "fal-ai/flux/schnell", kind: "image", needsImage: false, needsPrompt: true },
  { op: "sprite-edit", name: "Sprite Edit", unit: "image", coinsPerUnit: 8, blurb: "Reskin any sprite with a sentence — same pose, new vibe.", category: "Game Art", model: "fal-ai/nano-banana-2/edit", kind: "image", needsImage: true, needsPrompt: true },
  { op: "icon-logo", name: "Icon + Logo", unit: "image", coinsPerUnit: 10, blurb: "Crisp game icons, logos and clan badges with real typography.", category: "Game Art", model: "fal-ai/ideogram/v3", kind: "image", needsImage: false, needsPrompt: true },
  { op: "texture-tile", name: "Texture Tile", unit: "image", coinsPerUnit: 8, blurb: "Tileable dungeon, grass, metal and neon wall textures.", category: "Game Art", model: "fal-ai/recraft-v3", kind: "image", needsImage: false, needsPrompt: true },
  { op: "upscale-hd", name: "HD Upscale", unit: "image", coinsPerUnit: 6, blurb: "Remaster pixel art + screenshots to crisp HD, no redraw.", category: "Game Art", model: "fal-ai/topaz/upscale/image", kind: "image", needsImage: true, needsPrompt: false },
  { op: "remove-bg", name: "Sprite Cutout", unit: "image", coinsPerUnit: 3, blurb: "Clean background removal for web-game sprites + stickers.", category: "Game Art", model: "fal-ai/birefnet", kind: "image", needsImage: true, needsPrompt: false },
  { op: "render-3d", name: "3D Prop", unit: "model", coinsPerUnit: 15, blurb: "Turn one sketch into a spinnable 3D prop for 3D games.", category: "3D", model: "fal-ai/trellis/image-to-3d", kind: "model-3d", needsImage: true, needsPrompt: false },
  { op: "trailer-clip", name: "Trailer Clip", unit: "clip", coinsPerUnit: 25, blurb: "Cinematic teaser trailers from one sentence of hype.", category: "Video", model: "fal-ai/kling-video/v3/pro/text-to-video", kind: "video", needsImage: false, needsPrompt: true },
  { op: "animate-sprite", name: "Living Portrait", unit: "clip", coinsPerUnit: 20, blurb: "Breathe motion into static art — cutscenes in seconds.", category: "Video", model: "fal-ai/minimax/h3/image-to-video", kind: "video", needsImage: true, needsPrompt: true },
  { op: "npc-voice", name: "NPC Voice", unit: "1k_chars", coinsPerUnit: 4, blurb: "Quest givers that actually talk — warm HD narration.", category: "Audio", model: "fal-ai/minimax/speech-02-hd", kind: "audio", needsImage: false, needsPrompt: true },
  { op: "sfx-burst", name: "SFX Burst", unit: "clip", coinsPerUnit: 6, blurb: "Laser zaps, coin dings, dungeon booms on demand.", category: "Audio", model: "fal-ai/stable-audio-v2", kind: "audio", needsImage: false, needsPrompt: true },
  { op: "theme-music", name: "Theme Music", unit: "clip", coinsPerUnit: 10, blurb: "Menu loops + boss themes that never loop awkwardly.", category: "Audio", model: "fal-ai/musicgen/medium", kind: "audio", needsImage: false, needsPrompt: true },
  { op: "lipsync-take", name: "Lip-Sync Take", unit: "clip", coinsPerUnit: 18, blurb: "Talking NPC portraits — audio + face, perfectly synced.", category: "Video", model: "fal-ai/sync-lipsync", kind: "video", needsImage: true, needsPrompt: true },
  { op: "playtest-notes", name: "Playtest Notes", unit: "min_audio", coinsPerUnit: 3, blurb: "Transcribe playtests + coding standups straight into VCW bugs.", category: "Coding", model: "fal-ai/whisper-v3", kind: "text", needsImage: false, needsPrompt: false },
  { op: "app-promo", name: "App Promo Kit", unit: "image", coinsPerUnit: 8, blurb: "Shipped-code glow-up: OG cards, icons + promo art for web apps.", category: "Coding", model: "fal-ai/flux/dev", kind: "image", needsImage: false, needsPrompt: true },
];

export function opByKey(op: FalOp): FalOpDef {
  const found = FAL_OPS.find((o) => o.op === op);
  if (!found) throw new Error(`Unknown fal op: ${op}`);
  return found;
}

/** fal queue model endpoint for an op. */
export function modelForOp(op: FalOp): string {
  return opByKey(op).model;
}

/** Split a fal gross charge into platform cut + provider share (25% INCLUDED). */
export function falSplit(grossCoins: number): { gross: number; cut: number; provider: number } {
  const gross = Math.max(0, Math.round(Number(grossCoins) * 100) / 100);
  const cut = Math.round((gross * FAL_COMPUTE_CUT_PCT) / 100 * 100) / 100;
  return { gross, cut, provider: Math.round((gross - cut) * 100) / 100 };
}

/**
 * Quote gross coins for an op x qty. qty semantics per unit:
 * image/model/clip = runs (1), 1k_chars = chars/1000, min_audio = minutes.
 */
export function quoteFal(op: FalOp, qty: number): number {
  const rate = opByKey(op).coinsPerUnit;
  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 0) return 0;
  return Math.max(1, Math.ceil(rate * q));
}

export function quoteFalSplit(op: FalOp, qty: number): { gross: number; cut: number; provider: number } {
  return falSplit(quoteFal(op, qty));
}

/** Derive billable qty from raw inputs (chars/audio minutes fall back to 1 run). */
export function qtyForInput(op: FalOp, input: { prompt?: string; audioMinutes?: number }): number {
  if (op === "npc-voice") {
    const chars = String(input.prompt ?? "").length;
    return Math.max(0.1, Math.ceil(chars / 100) / 10);
  }
  if (op === "playtest-notes") {
    const mins = Number(input.audioMinutes ?? 0);
    return Number.isFinite(mins) && mins > 0 ? Math.min(120, mins) : 1;
  }
  return 1;
}

export function cleanFalPrompt(value: unknown): string {
  return String(value ?? "").trim().slice(0, 2000);
}

export function cleanGameSlug(value: unknown): string {
  return String(value ?? "lobby").trim().toLowerCase().slice(0, 64) || "lobby";
}

export function isValidFalGameSlug(slug: string): boolean {
  return /^[a-z0-9-]{1,64}$/.test(slug);
}

export function isHttpsUrl(value: unknown): boolean {
  const v = String(value ?? "");
  return v.startsWith("https://") && v.length <= 2048;
}

// ---------------------------------------------------------------------------
// Server key helpers. SERVER-ONLY in effect: the browser never sets these,
// so falConfigured() is false there and the GUI renders the honest
// not-configured state instead of faking a generation.
// ---------------------------------------------------------------------------

export const FAL_API_BASE_DEFAULT = "https://queue.fal.run";

export function falKey(): string {
  const raw =
    typeof process !== "undefined"
      ? String(process.env.FAL_KEY ?? process.env.FAL_API_KEY ?? "").trim()
      : "";
  return raw;
}

export function falApiBase(): string {
  const raw =
    typeof process !== "undefined"
      ? String(process.env.FAL_API_BASE ?? "").trim().replace(/\/+$/, "")
      : "";
  return raw || FAL_API_BASE_DEFAULT;
}

export function falConfigured(): boolean {
  return falKey().length > 0;
}

export const FAL_CUT_NOTE = `Includes ${FAL_COMPUTE_CUT_PCT}% platform cut (same ${SERVICE_CUT_PCT}% as all compute) — never added on top.`;

/** fal queue submit payload per op (prompt + optional image/audio passthrough). */
export function falInputFor(op: FalOp, input: { prompt: string; imageUrl?: string; audioUrl?: string }): Record<string, unknown> {
  const prompt = cleanFalPrompt(input.prompt);
  const out: Record<string, unknown> = {};
  if (prompt) out.prompt = prompt;
  if (input.imageUrl && isHttpsUrl(input.imageUrl)) {
    out.image_url = input.imageUrl;
    out.image_urls = [input.imageUrl];
  }
  if (input.audioUrl && isHttpsUrl(input.audioUrl)) out.audio_url = input.audioUrl;
  switch (op) {
    case "concept-art":
    case "icon-logo":
    case "texture-tile":
    case "app-promo":
      return { prompt, num_images: 1, output_format: "png" };
    case "upscale-hd":
    case "remove-bg":
    case "render-3d":
      return out;
    default:
      return Object.keys(out).length ? out : { prompt };
  }
}
