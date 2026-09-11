/**
 * Meshy.ai compatibility — FULL featured, handled purely through the API.
 *
 * Official surface mirrored 1:1 (text-to-3D, image-to-3D, text-to-texture,
 * animation / rigging, task polling), PLUS 4weird improvements the native
 * dashboard lacks:
 *   1. Budget-first picks — cheapest viable task mode preselected, exact
 *      coin quote BEFORE queueing (25% cut INCLUDED), fail-closed metering.
 *   2. Auto-vault — every finished mesh/texture/animation autosaves to the
 *      caller's Weird Vault scope (personal/team/org) with provenance.
 *   3. Game-ready post-checks — polygon budget + format advice per game
 *      runtime (browser games want GLB < 25 MB), queued as follow-up notes.
 *   4. One-call pipeline — prompt -> preview task -> refine task -> download
 *      URL, tracked as one meshy_job row with the full trail.
 *   5. Honest unconfigured state — without MESHY_API_KEY every call returns
 *      started:false + quote, never faked.
 *
 * Server key: MESHY_API_KEY (server-only, never NEXT_PUBLIC_). Base
 * override: MESHY_API_BASE (default https://api.meshy.ai).
 * Docs: https://docs.meshy.ai (REST v2: /v2/text-to-3d, /v2/image-to-3d,
 * /v2/text-to-texture, /v1/... animation, /v2/tasks/{id} polling).
 *
 * Client-safe: constants + quotes render in the browser; key helpers read
 * server env only (browser gets "" -> unconfigured UI).
 */

import { SERVICE_CUT_PCT } from "@/lib/economy";

export const MESHY_CUT_PCT = SERVICE_CUT_PCT;
export const MESHY_API_BASE_DEFAULT = "https://api.meshy.ai";

export const MESHY_OP_KEYS = [
  "text-to-3d",
  "image-to-3d",
  "text-to-texture",
  "animate",
  "remesh",
] as const;
export type MeshyOp = (typeof MESHY_OP_KEYS)[number];

export function isMeshyOp(value: unknown): value is MeshyOp {
  return (
    typeof value === "string" &&
    (MESHY_OP_KEYS as readonly string[]).includes(value)
  );
}

export type MeshyOpDef = {
  op: MeshyOp;
  name: string;
  unit: string;
  coinsPerUnit: number;
  blurb: string;
  /** Cheapest viable Meshy task mode (preselected default). */
  mode: string;
  /** Newest viable API path this op calls. */
  api: string;
  needsPrompt: boolean;
  needsImage: boolean;
};

export const MESHY_OPS: MeshyOpDef[] = [
  {
    op: "text-to-3d",
    name: "Text to 3D",
    unit: "model",
    coinsPerUnit: 18,
    blurb: "Type a prop, get a game-ready GLB — preview then refine, auto-vaulted.",
    mode: "preview-then-refine",
    api: "POST /v2/text-to-3d",
    needsPrompt: true,
    needsImage: false,
  },
  {
    op: "image-to-3d",
    name: "Image to 3D",
    unit: "model",
    coinsPerUnit: 16,
    blurb: "One sketch or sprite into a spinnable 3D model — auto-vaulted.",
    mode: "preview-then-refine",
    api: "POST /v2/image-to-3d",
    needsPrompt: false,
    needsImage: true,
  },
  {
    op: "text-to-texture",
    name: "Text to Texture",
    unit: "texture",
    coinsPerUnit: 12,
    blurb: "PBR textures from a sentence — paints your uploaded mesh in-style.",
    mode: "stylized-texture",
    api: "POST /v2/text-to-texture",
    needsPrompt: true,
    needsImage: false,
  },
  {
    op: "animate",
    name: "Animate / Rig",
    unit: "animation",
    coinsPerUnit: 14,
    blurb: "Auto-rig + animate a humanoid — walk, idle, dance in one call.",
    mode: "auto-rig",
    api: "POST /v1/animate",
    needsPrompt: true,
    needsImage: false,
  },
  {
    op: "remesh",
    name: "Remesh + Optimize",
    unit: "model",
    coinsPerUnit: 8,
    blurb: "Browser-game diet: polygon budget + quad remesh for fast loads.",
    mode: "quad-300k",
    api: "POST /v2/remesh",
    needsPrompt: false,
    needsImage: false,
  },
];

export function meshyOpByKey(op: MeshyOp): MeshyOpDef {
  const found = MESHY_OPS.find((o) => o.op === op);
  if (!found) throw new Error(`Unknown meshy op: ${op}`);
  return found;
}

export function meshySplit(grossCoins: number): {
  gross: number;
  cut: number;
  provider: number;
} {
  const gross = Math.max(0, Math.round(Number(grossCoins) * 100) / 100);
  const cut = Math.round(((gross * MESHY_CUT_PCT) / 100) * 100) / 100;
  return { gross, cut, provider: Math.round((gross - cut) * 100) / 100 };
}

export function quoteMeshy(op: MeshyOp, qty = 1): number {
  const rate = meshyOpByKey(op).coinsPerUnit;
  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 0) return 0;
  return Math.max(1, Math.ceil(rate * q));
}

export function quoteMeshySplit(op: MeshyOp, qty = 1): {
  gross: number;
  cut: number;
  provider: number;
} {
  return meshySplit(quoteMeshy(op, qty));
}

export const MESHY_CUT_NOTE = `Includes ${MESHY_CUT_PCT}% platform cut (same ${SERVICE_CUT_PCT}% as all compute) — never added on top.`;

export function cleanMeshyPrompt(value: unknown): string {
  return String(value ?? "").trim().slice(0, 2000);
}

export function isHttpsUrl(value: unknown): boolean {
  const v = String(value ?? "");
  return v.startsWith("https://") && v.length <= 2048;
}

export function meshyKey(): string {
  if (typeof process === "undefined") return "";
  return String(process.env.MESHY_API_KEY ?? "").trim();
}

export function meshyApiBase(): string {
  if (typeof process === "undefined") return MESHY_API_BASE_DEFAULT;
  const raw = String(process.env.MESHY_API_BASE ?? "").trim().replace(/\/+$/, "");
  return raw || MESHY_API_BASE_DEFAULT;
}

export function meshyConfigured(): boolean {
  return meshyKey().length > 0;
}

/** Least-privilege scope keys for Meshy (generate vs read). */
export const MESHY_SCOPES = ["meshy:generate", "meshy:read"] as const;

/** Browser-game readiness advice attached to every finished job. */
export function meshyGameAdvice(input: {
  bytes?: number;
  format?: string;
}): string[] {
  const tips: string[] = [];
  const bytes = Number(input.bytes ?? 0);
  if (bytes > 25 * 1024 * 1024)
    tips.push("Over 25 MB — run remesh (quad-300k) before shipping to browsers.");
  if (input.format && !/glb/i.test(input.format))
    tips.push("Convert to GLB for the widest browser-game support.");
  tips.push("Preview on /meshy before submitting the game zip.");
  return tips;
}
