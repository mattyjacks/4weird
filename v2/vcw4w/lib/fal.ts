/**
 * fal.ai media compute - 30 magical game-dev + coding tools.
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
 *   FAL_KEY (official fal SDK name) - FAL_API_KEY accepted as an alias.
 *   FAL_API_BASE overrides the queue base (default https://queue.fal.run).
 *
 * VibeCodeWorker meld: the agent main loop (observe → reason → act) can
 * call any op from inside a run via VCW_FAL_HOWTO; emit
 * `[tool: fal.generate; op=<op> prompt="..."]` in an actions step, or POST
 * /api/fal/generate with source "vcw". NewGamePlus plans its fal picks
 * with recommendFalOps() so the symphony only pays for assets the prompt
 * actually needs.
 */

import { SERVICE_CUT_PCT } from "@/lib/economy";

/** Same 25% as every other compute surface; one rule. */
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
  "sprite-sheet",
  "backdrop-wide",
  "character-turn",
  "level-inpaint",
  "depth-map",
  "voxel-prop",
  "text-to-3d",
  "cutscene-veo",
  "motion-loop",
  "monster-voice",
  "ambient-bed",
  "chiptune-loop",
  "quest-dialogue",
  "code-review",
  "capsule-art",
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
 * 30 ways to use fal across game dev + coding. Gross Vibe Coins per unit,
 * 25% cut INCLUDED. Units match cloud-catalog style (image/clip/1k_chars/min).
 */
export const FAL_OPS: FalOpDef[] = [
  { op: "concept-art", name: "Concept Art", unit: "image", coinsPerUnit: 8, blurb: "FLUX-speed key art: levels, characters, loading screens.", category: "Game Art", model: "fal-ai/flux/schnell", kind: "image", needsImage: false, needsPrompt: true },
  { op: "sprite-edit", name: "Sprite Edit", unit: "image", coinsPerUnit: 8, blurb: "Reskin any sprite with a sentence; same pose, new vibe.", category: "Game Art", model: "fal-ai/nano-banana-2/edit", kind: "image", needsImage: true, needsPrompt: true },
  { op: "icon-logo", name: "Icon + Logo", unit: "image", coinsPerUnit: 10, blurb: "Crisp game icons, logos and clan badges with real typography.", category: "Game Art", model: "fal-ai/ideogram/v3", kind: "image", needsImage: false, needsPrompt: true },
  { op: "texture-tile", name: "Texture Tile", unit: "image", coinsPerUnit: 8, blurb: "Tileable dungeon, grass, metal and neon wall textures.", category: "Game Art", model: "fal-ai/recraft-v3", kind: "image", needsImage: false, needsPrompt: true },
  { op: "upscale-hd", name: "HD Upscale", unit: "image", coinsPerUnit: 6, blurb: "Remaster pixel art + screenshots to crisp HD, no redraw.", category: "Game Art", model: "fal-ai/topaz/upscale/image", kind: "image", needsImage: true, needsPrompt: false },
  { op: "remove-bg", name: "Sprite Cutout", unit: "image", coinsPerUnit: 3, blurb: "Clean background removal for web-game sprites + stickers.", category: "Game Art", model: "fal-ai/birefnet", kind: "image", needsImage: true, needsPrompt: false },
  { op: "render-3d", name: "3D Prop", unit: "model", coinsPerUnit: 15, blurb: "Turn one sketch into a spinnable 3D prop for 3D games.", category: "3D", model: "fal-ai/trellis/image-to-3d", kind: "model-3d", needsImage: true, needsPrompt: false },
  { op: "trailer-clip", name: "Trailer Clip", unit: "clip", coinsPerUnit: 25, blurb: "Cinematic teaser trailers from one sentence of hype.", category: "Video", model: "fal-ai/kling-video/v3/pro/text-to-video", kind: "video", needsImage: false, needsPrompt: true },
  { op: "animate-sprite", name: "Living Portrait", unit: "clip", coinsPerUnit: 20, blurb: "Breathe motion into static art; cutscenes in seconds.", category: "Video", model: "fal-ai/minimax/h3/image-to-video", kind: "video", needsImage: true, needsPrompt: true },
  { op: "npc-voice", name: "NPC Voice", unit: "1k_chars", coinsPerUnit: 4, blurb: "Quest givers that actually talk; warm HD narration.", category: "Audio", model: "fal-ai/minimax/speech-02-hd", kind: "audio", needsImage: false, needsPrompt: true },
  { op: "sfx-burst", name: "SFX Burst", unit: "clip", coinsPerUnit: 6, blurb: "Laser zaps, coin dings, dungeon booms on demand.", category: "Audio", model: "fal-ai/stable-audio-v2", kind: "audio", needsImage: false, needsPrompt: true },
  { op: "theme-music", name: "Theme Music", unit: "clip", coinsPerUnit: 10, blurb: "Menu loops + boss themes that never loop awkwardly.", category: "Audio", model: "fal-ai/musicgen/medium", kind: "audio", needsImage: false, needsPrompt: true },
  { op: "lipsync-take", name: "Lip-Sync Take", unit: "clip", coinsPerUnit: 18, blurb: "Talking NPC portraits; audio + face, perfectly synced.", category: "Video", model: "fal-ai/sync-lipsync", kind: "video", needsImage: true, needsPrompt: true },
  { op: "playtest-notes", name: "Playtest Notes", unit: "min_audio", coinsPerUnit: 3, blurb: "Transcribe playtests + coding standups straight into VCW bugs.", category: "Coding", model: "fal-ai/whisper-v3", kind: "text", needsImage: false, needsPrompt: false },
  { op: "app-promo", name: "App Promo Kit", unit: "image", coinsPerUnit: 8, blurb: "Shipped-code glow-up: OG cards, icons + promo art for web apps.", category: "Coding", model: "fal-ai/flux/dev", kind: "image", needsImage: false, needsPrompt: true },
  { op: "sprite-sheet", name: "Sprite Sheet", unit: "image", coinsPerUnit: 9, blurb: "Full pixel-art sheets: idle, run, jump frames on one canvas.", category: "Game Art", model: "fal-ai/flux-pro/v1.1", kind: "image", needsImage: false, needsPrompt: true },
  { op: "backdrop-wide", name: "World Backdrop", unit: "image", coinsPerUnit: 9, blurb: "Ultra-wide parallax backdrops: skies, dungeons, neon cities.", category: "Game Art", model: "fal-ai/imagen4/preview", kind: "image", needsImage: false, needsPrompt: true },
  { op: "character-turn", name: "Character Turnaround", unit: "image", coinsPerUnit: 9, blurb: "Front/side/back turnaround sheets for heroes + NPCs.", category: "Game Art", model: "fal-ai/hidream-i1-full", kind: "image", needsImage: false, needsPrompt: true },
  { op: "level-inpaint", name: "Level Inpaint", unit: "image", coinsPerUnit: 8, blurb: "Repaint part of a level or sprite; masked edits that blend in.", category: "Game Art", model: "fal-ai/flux-pro/fill", kind: "image", needsImage: true, needsPrompt: true },
  { op: "depth-map", name: "Depth Map", unit: "image", coinsPerUnit: 6, blurb: "Depth maps from one screenshot for 2.5D lighting + parallax.", category: "3D", model: "fal-ai/depth-anything-v2", kind: "image", needsImage: true, needsPrompt: false },
  { op: "voxel-prop", name: "Voxel Prop 3D", unit: "model", coinsPerUnit: 15, blurb: "Chunky voxel props from one sketch for stylized 3D games.", category: "3D", model: "fal-ai/hunyuan3d-v21/image-to-3d", kind: "model-3d", needsImage: true, needsPrompt: false },
  { op: "text-to-3d", name: "Text 3D Prop", unit: "model", coinsPerUnit: 16, blurb: "Type a prop, get a spinnable 3D model; no sketch needed.", category: "3D", model: "fal-ai/trellis/text-to-3d", kind: "model-3d", needsImage: false, needsPrompt: true },
  { op: "cutscene-veo", name: "Cutscene Clip", unit: "clip", coinsPerUnit: 22, blurb: "Fast cinematic cutscenes from one line of story.", category: "Video", model: "fal-ai/veo3/fast/text-to-video", kind: "video", needsImage: false, needsPrompt: true },
  { op: "motion-loop", name: "Motion Loop", unit: "clip", coinsPerUnit: 20, blurb: "Turn any sprite or portrait into a looping motion clip.", category: "Video", model: "fal-ai/kling-video/v2.5-turbo/image-to-video", kind: "video", needsImage: true, needsPrompt: true },
  { op: "monster-voice", name: "Monster Voice", unit: "1k_chars", coinsPerUnit: 4, blurb: "Growls, goblins + bosses that actually talk back.", category: "Audio", model: "fal-ai/dia-tts", kind: "audio", needsImage: false, needsPrompt: true },
  { op: "ambient-bed", name: "Ambient Bed", unit: "clip", coinsPerUnit: 7, blurb: "Rain, tavern hum, spaceship drones; looping ambience.", category: "Audio", model: "fal-ai/mmaudio-v2/text-to-audio", kind: "audio", needsImage: false, needsPrompt: true },
  { op: "chiptune-loop", name: "Chiptune Loop", unit: "clip", coinsPerUnit: 8, blurb: "8-bit chiptune loops that never loop awkwardly.", category: "Audio", model: "fal-ai/yue/text-to-music", kind: "audio", needsImage: false, needsPrompt: true },
  { op: "quest-dialogue", name: "Quest Dialogue", unit: "quest", coinsPerUnit: 3, blurb: "Branching quest dialogue trees from one story beat.", category: "Coding", model: "fal-ai/openai/gpt-oss-120b", kind: "text", needsImage: false, needsPrompt: true },
  { op: "code-review", name: "Code Review", unit: "review", coinsPerUnit: 3, blurb: "Instant gameplay code review; balance, bugs + fix list.", category: "Coding", model: "fal-ai/moonshotai/kimi-k2-instruct", kind: "text", needsImage: false, needsPrompt: true },
  { op: "capsule-art", name: "Store Capsule", unit: "image", coinsPerUnit: 9, blurb: "Store capsules + OG cards that make the game impossible not to click.", category: "Coding", model: "fal-ai/fast-sdxl", kind: "image", needsImage: false, needsPrompt: true },
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
  if (op === "npc-voice" || op === "monster-voice") {
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
  if (!raw) return FAL_API_BASE_DEFAULT;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return FAL_API_BASE_DEFAULT;
    if (u.hostname !== "queue.fal.run" && !u.hostname.endsWith(".fal.run")) return FAL_API_BASE_DEFAULT;
    return raw;
  } catch {
    return FAL_API_BASE_DEFAULT;
  }
}

export function falConfigured(): boolean {
  return falKey().length > 0;
}

export const FAL_CUT_NOTE = `Includes ${FAL_COMPUTE_CUT_PCT}% platform cut (same ${SERVICE_CUT_PCT}% as all compute); never added on top.`;

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
    case "sprite-sheet":
    case "backdrop-wide":
    case "character-turn":
    case "capsule-art":
      return { prompt, num_images: 1, output_format: "png" };
    case "level-inpaint":
      return { prompt, image_url: input.imageUrl && isHttpsUrl(input.imageUrl) ? input.imageUrl : undefined };
    case "upscale-hd":
    case "remove-bg":
    case "depth-map":
      return out;
    case "render-3d":
    case "voxel-prop":
      return out;
    case "text-to-3d":
      return { prompt };
    case "trailer-clip":
    case "cutscene-veo":
      return { prompt };
    case "animate-sprite":
    case "motion-loop":
    case "lipsync-take":
      return out;
    case "npc-voice":
    case "monster-voice":
      // Speech models take raw text, not a "prompt" wrapper.
      return { text: prompt || "Hello, adventurer." };
    case "sfx-burst":
    case "theme-music":
    case "ambient-bed":
    case "chiptune-loop":
      return { prompt };
    case "playtest-notes":
      return out;
    case "quest-dialogue":
    case "code-review":
      return { prompt };
    default:
      return Object.keys(out).length ? out : { prompt };
  }
}

/** Cheap + fast ops safe for the ≤5-minute NewGamePlus fast lane. */
export const FAL_FAST_OPS: FalOp[] = [
  "remove-bg",
  "playtest-notes",
  "quest-dialogue",
  "code-review",
  "npc-voice",
  "monster-voice",
  "upscale-hd",
  "depth-map",
  "sfx-burst",
  "ambient-bed",
  "concept-art",
  "texture-tile",
  "level-inpaint",
  "app-promo",
  "capsule-art",
];

/**
 * How a VibeCodeWorker agent calls fal from inside the main
 * observe → reason → act loop. Emitted as a step tag the actions route
 * understands, e.g.:
 *   [tool: fal.generate; op=concept-art prompt="neon dungeon key art"]
 * or equivalently POST /api/fal/generate { op, prompt, game_slug, source: "vcw" }.
 */
export const VCW_FAL_HOWTO =
  "VCW loop fal call: log an actions step with kind=action and text containing " +
  "[tool: fal.generate; op=<op> prompt=\"...\"] (source vcw, metered via meter_fal_usage, " +
  "25% cut included). Observe first, then reason which op fits, then act with the cheapest viable op.";

/** Recommended fal ops per VCW loop phase (cheapest viable first). */
export function falOpsForVcwPhase(phase: "observe" | "reason" | "act"): FalOp[] {
  if (phase === "observe") return ["playtest-notes", "code-review", "upscale-hd"];
  if (phase === "reason") return ["quest-dialogue", "code-review", "concept-art"];
  return ["sprite-edit", "sfx-burst", "npc-voice", "concept-art", "remove-bg"];
}

export type FalRecommendation = { op: FalOp; why: string; coins: number };

/**
 * Intelligent fal picker shared by NewGamePlus + VCW: keyword-scan the
 * prompt, cap by budget, cheapest viable first. Pure + deterministic.
 */
export function recommendFalOps(prompt: string, budget: number, maxOps = 3): FalRecommendation[] {
  const p = String(prompt ?? "").toLowerCase();
  const picks: FalRecommendation[] = [];
  const push = (op: FalOp, why: string) => {
    if (picks.some((r) => r.op === op)) return;
    if (picks.length >= Math.max(1, Math.min(5, maxOps))) return;
    picks.push({ op, why, coins: quoteFal(op, 1) });
  };
  if (/voice|talk|speak|npc|quest giver|dialogue|narrat/.test(p)) push("npc-voice", "prompt names voices/dialogue");
  if (/monster|boss|growl|goblin|dragon|demon/.test(p)) push("monster-voice", "prompt names a monster/boss voice");
  if (/music|theme|soundtrack|chiptune|8-bit|8bit/.test(p)) push("chiptune-loop", "prompt names music/chiptune");
  else if (/music|theme|soundtrack|song/.test(p)) push("theme-music", "prompt names music");
  if (/sfx|sound|laser|zap|explosion|coin ding/.test(p)) push("sfx-burst", "prompt names sound effects");
  if (/ambient|rain|tavern|hum|drone|atmosphere/.test(p)) push("ambient-bed", "prompt names ambience");
  if (/sprite|pixel|character|hero|enemy/.test(p)) push("sprite-sheet", "prompt names sprites/characters");
  if (/world|backdrop|sky|city|dungeon|parallax|background/.test(p)) push("backdrop-wide", "prompt names a world/backdrop");
  if (/3d|voxel|model|spinnable/.test(p)) {
    if (/voxel|chunky|stylized/.test(p)) push("voxel-prop", "prompt names voxel 3D");
    else push("text-to-3d", "prompt names 3D");
  }
  if (/cutscene|story|cinematic|intro/.test(p)) {
    if (budget > 250) push("cutscene-veo", "big-budget prompt names cutscenes");
  } else if (/trailer|hype|teaser/.test(p) && budget > 250) push("trailer-clip", "big-budget prompt names a trailer");
  if (/quest|story|branch|mission/.test(p)) push("quest-dialogue", "prompt names quests/story");
  if (/logo|icon|badge/.test(p)) push("icon-logo", "prompt names a logo/icon");
  if (!picks.length) {
    push("concept-art", "default key art for the loading screen");
    if (/collect|catch|shooter|dodge|race|maze|shooter/.test(p)) push("sfx-burst", "action games need SFX");
    else push("capsule-art", "default store capsule for launch");
  }
  // Budget cap: keep the fal shortlist inside ~1/4 of the coin budget.
  const cap = Math.max(6, Math.floor(Number(budget) / 4));
  let total = picks.reduce((s, r) => s + r.coins, 0);
  while (picks.length > 1 && total > cap) {
    const dropped = picks.pop();
    total -= dropped?.coins ?? 0;
  }
  return picks;
}
