/**
 * Cloud service catalog — client-safe mirror of public.cloud_services.
 * Prices are in Vibe Coins (100 coins = $1.00).
 *
 * Pricing rule (one rule everywhere): every price INCLUDES the 25%
 * UnitUnite workspace compute cut (WORKSPACE_COMPUTE_CUT_PCT) — and the
 * game-AI catalog below includes the same 25% game-AI cut
 * (GAME_AI_COMPUTE_CUT_PCT). The wallet is
 * debited the gross; the ledger splits it 25% platform / 75% provider per
 * individual workspace / game. The cut is never added on top.
 * The org wallet pays; fund it from personal coins via fund_org_wallet.
 * Game AI pays from personal coins via meter_game_ai_usage.
 *
 * Cost/version policy: everything defaults to the CHEAPEST tier that can do
 * the job and the NEWEST viable runtime (see CHEAPEST_DEFAULTS /
 * NEWEST_VIABLE below). No new npm deps were added for this — cheapest for
 * the user, newest that still runs on the current stack.
 */

import { WORKSPACE_COMPUTE_CUT_PCT, workspaceComputeSplit } from "@/lib/economy";

export type CloudService = {
  key: string;
  name: string;
  unit: string;
  coinsPerUnit: number;
  blurb: string;
  category: string;
  /** Cheapest viable tier for this service (default selection in UI). */
  tier: string;
  /** Newest viable runtime/image this service runs on. */
  runtime: string;
};

export const CLOUD_SERVICES: CloudService[] = [
  { key: "gpu-pod", name: "GPU Pod", unit: "gpu_min", coinsPerUnit: 12, blurb: "Dedicated GPU, billed per minute", category: "Compute", tier: "cheapest-gpu", runtime: "cuda-newest-viable" },
  { key: "serverless-worker", name: "Serverless Worker", unit: "worker_min", coinsPerUnit: 4, blurb: "Autoscaled endpoint workers", category: "Compute", tier: "eco-128mb", runtime: "node-lts-newest" },
  { key: "serverless-cron", name: "Scheduled Jobs", unit: "worker_min", coinsPerUnit: 2, blurb: "Cron-triggered workers", category: "Compute", tier: "eco-128mb", runtime: "node-lts-newest" },
  { key: "object-storage", name: "Object Storage", unit: "gb_mo", coinsPerUnit: 3, blurb: "S3-style buckets + CDN origin", category: "Storage", tier: "standard", runtime: "s3-compat-v4" },
  { key: "volume-storage", name: "Volumes", unit: "gb_mo", coinsPerUnit: 5, blurb: "Persistent team volumes", category: "Storage", tier: "standard-10gb", runtime: "ext4-newest" },
  { key: "managed-postgres", name: "Managed Postgres", unit: "db_hr", coinsPerUnit: 9, blurb: "Backups + point-in-time restore", category: "Data", tier: "micro-256mb", runtime: "postgres-newest-viable" },
  { key: "kv-store", name: "KV Store", unit: "kv_m writes", coinsPerUnit: 1, blurb: "Edge key-value reads/writes", category: "Data", tier: "pay-per-use", runtime: "kv-newest-api" },
  { key: "job-queue", name: "Job Queue", unit: "queue_k", coinsPerUnit: 1, blurb: "Queues + webhooks + retries", category: "Data", tier: "shared", runtime: "queue-v2-newest" },
  { key: "edge-cdn", name: "Edge CDN", unit: "cdn_gb", coinsPerUnit: 2, blurb: "Global cache + custom domains", category: "Network", tier: "shared-edge", runtime: "http3-newest" },
  { key: "container-builds", name: "Builds", unit: "build_min", coinsPerUnit: 3, blurb: "Image + static site builds", category: "DevOps", tier: "eco-builder", runtime: "buildkit-newest" },
  { key: "ci-actions", name: "Project Actions", unit: "action_min", coinsPerUnit: 2, blurb: "CI runs for the Code tab", category: "DevOps", tier: "eco-runner", runtime: "node-lts-newest" },
  { key: "vector-db", name: "Vector DB", unit: "db_hr", coinsPerUnit: 11, blurb: "Embeddings + ANN search", category: "AI", tier: "micro-256mb", runtime: "hnsw-newest" },
  { key: "realtime-relay", name: "Realtime Relay", unit: "worker_min", coinsPerUnit: 2, blurb: "Sync + presence fan-out", category: "Network", tier: "shared", runtime: "ws-newest" },
  { key: "inference-api", name: "Inference API", unit: "worker_min", coinsPerUnit: 6, blurb: "Hosted model endpoints", category: "AI", tier: "spot-cheapest", runtime: "models-newest-viable" },
  { key: "game-ai-dialogue", name: "Game AI Dialogue", unit: "1k_tokens", coinsPerUnit: 3, blurb: "OpenAI NPC dialogue bots (required or optional per game)", category: "Game AI", tier: "cheapest-model", runtime: "openai-newest-viable" },
  { key: "game-ai-director", name: "Game AI Director", unit: "decision", coinsPerUnit: 2, blurb: "AI game directing on rented RunPods", category: "Game AI", tier: "cheapest-gpu", runtime: "cuda-newest-viable" },
  { key: "game-ai-tts", name: "Game AI Voice", unit: "1k_chars", coinsPerUnit: 2, blurb: "In-game voice lines in 9 OpenAI voices", category: "Game AI", tier: "cheapest-tts", runtime: "tts-newest-viable" },
  { key: "buddy-chat", name: "Gaming Buddy Chat", unit: "1k_tokens", coinsPerUnit: 3, blurb: "Universal screen-aware buddy conversation", category: "Game AI", tier: "cheapest-model", runtime: "openai-newest-viable" },
  { key: "buddy-voice", name: "Gaming Buddy Voice", unit: "1k_chars", coinsPerUnit: 2, blurb: "Buddy speech in 9 OpenAI voices (Alloy→Shimmer)", category: "Game AI", tier: "cheapest-tts", runtime: "tts-newest-viable" },
  { key: "vcw-autoplay-cpu", name: "VCW Autoplay (CPU remote)", unit: "remote_min", coinsPerUnit: 0.14, blurb: "RunPod CPU remote plays 4weird games on-site only, ~$0.08/hr gross (browser locked)", category: "Game AI", tier: "cheapest-cpu", runtime: "ubuntu-newest-viable" },
  { key: "vcw-autoplay-gpu", name: "VCW Autoplay (GPU remote)", unit: "remote_min", coinsPerUnit: 0.63, blurb: "RunPod GPU remote plays 4weird games on-site only, ~$0.37/hr gross (browser locked)", category: "Game AI", tier: "cheapest-gpu", runtime: "cuda-newest-viable" },
  { key: "vcw-autoplay-gpu-boosted", name: "VCW Autoplay (GPU boosted)", unit: "remote_min", coinsPerUnit: 2.2, blurb: "Pinned RTX 4090 (5090 fallback): fastest 4weird on-site vision; required for Xonotic off-site, ~$1.32/hr gross ceiling quoted exactly at start (desktop app required)", category: "Game AI", tier: "rtx-4090-pinned", runtime: "cuda-newest-viable" },
  { key: "fal-concept-art", name: "fal Concept Art", unit: "image", coinsPerUnit: 8, blurb: "FLUX-speed key art: levels, characters, loading screens (fal-ai/flux/schnell)", category: "fal.ai Media", tier: "turbo", runtime: "flux-schnell" },
  { key: "fal-sprite-edit", name: "fal Sprite Edit", unit: "image", coinsPerUnit: 8, blurb: "Reskin any sprite with a sentence — same pose, new vibe (nano-banana-2/edit)", category: "fal.ai Media", tier: "turbo", runtime: "nano-banana-2" },
  { key: "fal-icon-logo", name: "fal Icon + Logo", unit: "image", coinsPerUnit: 10, blurb: "Game icons, logos + clan badges with real typography (ideogram/v3)", category: "fal.ai Media", tier: "turbo", runtime: "ideogram-v3" },
  { key: "fal-texture-tile", name: "fal Texture Tile", unit: "image", coinsPerUnit: 8, blurb: "Tileable dungeon, grass, metal + neon textures (recraft-v3)", category: "fal.ai Media", tier: "turbo", runtime: "recraft-v3" },
  { key: "fal-upscale-hd", name: "fal HD Upscale", unit: "image", coinsPerUnit: 6, blurb: "Remaster pixel art + screenshots to crisp HD (topaz/upscale)", category: "fal.ai Media", tier: "turbo", runtime: "topaz-upscale" },
  { key: "fal-remove-bg", name: "fal Sprite Cutout", unit: "image", coinsPerUnit: 3, blurb: "Clean background removal for web-game sprites (birefnet)", category: "fal.ai Media", tier: "turbo", runtime: "birefnet" },
  { key: "fal-render-3d", name: "fal 3D Prop", unit: "model", coinsPerUnit: 15, blurb: "One sketch into a spinnable 3D prop (trellis/image-to-3d)", category: "fal.ai Media", tier: "turbo", runtime: "trellis-3d" },
  { key: "fal-trailer-clip", name: "fal Trailer Clip", unit: "clip", coinsPerUnit: 25, blurb: "Cinematic teaser trailers from one sentence (kling-video/v3)", category: "fal.ai Media", tier: "pro", runtime: "kling-v3-pro" },
  { key: "fal-animate-sprite", name: "fal Living Portrait", unit: "clip", coinsPerUnit: 20, blurb: "Breathe motion into static art — cutscenes in seconds (minimax/h3)", category: "fal.ai Media", tier: "pro", runtime: "minimax-h3" },
  { key: "fal-npc-voice", name: "fal NPC Voice", unit: "1k_chars", coinsPerUnit: 4, blurb: "Quest givers that talk — warm HD narration (minimax/speech-02-hd)", category: "fal.ai Media", tier: "turbo", runtime: "minimax-speech-hd" },
  { key: "fal-sfx-burst", name: "fal SFX Burst", unit: "clip", coinsPerUnit: 6, blurb: "Laser zaps, coin dings, dungeon booms on demand (stable-audio-v2)", category: "fal.ai Media", tier: "turbo", runtime: "stable-audio-v2" },
  { key: "fal-theme-music", name: "fal Theme Music", unit: "clip", coinsPerUnit: 10, blurb: "Menu loops + boss themes that never loop awkwardly (musicgen)", category: "fal.ai Media", tier: "turbo", runtime: "musicgen-medium" },
  { key: "fal-lipsync-take", name: "fal Lip-Sync Take", unit: "clip", coinsPerUnit: 18, blurb: "Talking NPC portraits — audio + face synced (sync-lipsync)", category: "fal.ai Media", tier: "pro", runtime: "sync-lipsync" },
  { key: "fal-playtest-notes", name: "fal Playtest Notes", unit: "min_audio", coinsPerUnit: 3, blurb: "Transcribe playtests + standups into VCW bugs (whisper-v3)", category: "fal.ai Media", tier: "turbo", runtime: "whisper-v3" },
  { key: "fal-app-promo", name: "fal App Promo Kit", unit: "image", coinsPerUnit: 8, blurb: "Shipped-code glow-up: OG cards + icons for web apps (flux/dev)", category: "fal.ai Media", tier: "turbo", runtime: "flux-dev" },
];

/** Cheapest viable default per category (what the UI preselects). */
export const CHEAPEST_DEFAULTS: Record<string, string> = {
  Compute: "serverless-cron",
  Storage: "object-storage",
  Data: "kv-store",
  Network: "edge-cdn",
  DevOps: "ci-actions",
  AI: "inference-api",
  "Game AI": "game-ai-director",
  "fal.ai Media": "fal-remove-bg",
};

/**
 * Newest viable runtimes — newest that still runs on this stack (Next 15 /
 * React 19 / Supabase, no new deps). Pinned as labels, not floating tags,
 * so a deploy is reproducible and stays on the cheapest tier above.
 */
export const NEWEST_VIABLE = {
  node: "node-lts-newest",
  cuda: "cuda-newest-viable",
  postgres: "postgres-newest-viable",
  next: "next-15-viable",
  react: "react-19-viable",
} as const;

export const WORKSPACE_CUT_NOTE = `Includes ${WORKSPACE_COMPUTE_CUT_PCT}% workspace compute cut — never added on top.`;

/** Game-AI cut note (same 25%, scoped per game + feature kind). */
export const GAME_AI_CUT_NOTE = `Includes 25% game-AI compute cut — never added on top.`;

export function serviceByKey(key: string): CloudService | undefined {
  return CLOUD_SERVICES.find((s) => s.key === key);
}

export function quoteCost(key: string, qty: number): number {
  const s = serviceByKey(key);
  if (!s || !Number.isInteger(qty) || qty < 1) return 0;
  return s.coinsPerUnit * qty;
}

/** Gross quote + per-workspace 25% split for display ("12 coins = 9 provider + 3 cut"). */
export function workspaceQuote(key: string, qty: number): { gross: number; cut: number; provider: number } {
  return workspaceComputeSplit(quoteCost(key, qty));
}
