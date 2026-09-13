/**
 * OpenRouter account/model-plane meta services - 8 operator tools.
 *
 * One rule everywhere: every OpenRouter meta price INCLUDES the 25% platform
 * cut (OPENROUTER_META_CUT_PCT = 25, same as SERVICE_CUT_PCT /
 * GAME_AI_COMPUTE_CUT_PCT / WORKSPACE_COMPUTE_CUT_PCT), never added on top.
 * The wallet is debited the gross; the ledger splits 25% platform /
 * 75% provider per op + game.
 *
 * These are PLANE ops, not generations: they sync catalogs, mirror wallets,
 * rotate keys, audit receipts, and pick router defaults. They use no model
 * (model "n/a"); generation traffic itself is metered elsewhere.
 *
 * Real endpoints under https://openrouter.ai/api/v1 per the OpenAPI spec at
 * https://openrouter.ai/openapi.json.
 *
 * Client-safe: this module never leaks the key. openrouterMetaKey() /
 * openrouterMetaConfigured() read server env only when called on the server;
 * the catalog constants below render in the browser with no credentials.
 *
 * Env (server-only, never NEXT_PUBLIC_):
 *   OPENROUTER_API_KEY - operator key for the account/model plane.
 *   OPENROUTER_API_BASE overrides the base (default https://openrouter.ai/api/v1).
 *
 * VibeCodeWorker meld: the agent main loop (observe → reason → act) can
 * call any op from inside a run via VCW_OPENROUTER_META_HOWTO; emit
 * `[tool: openrouter-meta.sync; op=<op>]` in an actions step, or POST
 * /api/openrouter-meta/sync with source "vcw".
 */

import { SERVICE_CUT_PCT } from "@/lib/economy";

/** Same 25% as every other compute surface; one rule. */
export const OPENROUTER_META_CUT_PCT = 25;

export const OPENROUTER_META_OP_KEYS = [
  "models-list",
  "model-detail",
  "endpoints-list",
  "credits-balance",
  "key-manage",
  "generation-stats",
  "activity-feed",
  "model-router",
] as const;
export type OpenRouterMetaOp = (typeof OPENROUTER_META_OP_KEYS)[number];

export function isOpenRouterMetaOp(value: unknown): value is OpenRouterMetaOp {
  return typeof value === "string" && (OPENROUTER_META_OP_KEYS as readonly string[]).includes(value);
}

export type OpenRouterMetaOpDef = {
  op: OpenRouterMetaOp;
  name: string;
  unit: string;
  coinsPerUnit: number;
  blurb: string;
  /** Plane ops use no model; always "n/a". */
  model: string;
  /** Real method + path, e.g. "GET /models". */
  api: string;
  /** True when the op needs a prompt/text. Always false on this plane. */
  needsPrompt: boolean;
  /** True when the op needs a source image. Always false on this plane. */
  needsImage: boolean;
};

/**
 * 8 OpenRouter account/model-plane services. Gross Vibe Coins per unit,
 * 25% cut INCLUDED. Units are "sync" for lists, "lookup" for detail/stats,
 * "generation" for the router op.
 */
export const OPENROUTER_META_OPS: OpenRouterMetaOpDef[] = [
  { op: "models-list", name: "Models List", unit: "sync", coinsPerUnit: 1, blurb: "Supported models catalog sync for the 4weird model picker (GET /models).", model: "n/a", api: "GET /models", needsPrompt: false, needsImage: false },
  { op: "model-detail", name: "Model Detail", unit: "lookup", coinsPerUnit: 1, blurb: "Single model card: context length, pricing, supported params (GET /models/{id}).", model: "n/a", api: "GET /models/{id}", needsPrompt: false, needsImage: false },
  { op: "endpoints-list", name: "Endpoints List", unit: "sync", coinsPerUnit: 2, blurb: "Model endpoints/providers inventory: who serves what (GET /models/{id}/endpoints).", model: "n/a", api: "GET /models/{id}/endpoints", needsPrompt: false, needsImage: false },
  { op: "credits-balance", name: "Credits Balance", unit: "lookup", coinsPerUnit: 1, blurb: "Account credits + usage mirror for the operator wallet (GET /credits).", model: "n/a", api: "GET /credits", needsPrompt: false, needsImage: false },
  { op: "key-manage", name: "Key Manage", unit: "lookup", coinsPerUnit: 2, blurb: "Provision/rotate scoped API keys, e.g. per-game keys (POST /keys).", model: "n/a", api: "POST /keys", needsPrompt: false, needsImage: false },
  { op: "generation-stats", name: "Generation Stats", unit: "lookup", coinsPerUnit: 1, blurb: "Post-hoc token/cost audit receipts for one generation (GET /generation?id=).", model: "n/a", api: "GET /generation?id={id}", needsPrompt: false, needsImage: false },
  { op: "activity-feed", name: "Activity Feed", unit: "sync", coinsPerUnit: 2, blurb: "Generations/activity history spend-ledger mirror (GET /activity).", model: "n/a", api: "GET /activity", needsPrompt: false, needsImage: false },
  { op: "model-router", name: "Model Router", unit: "generation", coinsPerUnit: 4, blurb: "Auto-router default-model selection: omit model for the payer default, cheapest GPU pick (POST /chat/completions).", model: "n/a", api: "POST /chat/completions", needsPrompt: false, needsImage: false },
];

export function opByKey(op: OpenRouterMetaOp): OpenRouterMetaOpDef {
  const found = OPENROUTER_META_OPS.find((o) => o.op === op);
  if (!found) throw new Error(`Unknown openrouter-meta op: ${op}`);
  return found;
}

/** Split an OpenRouter meta gross charge into platform cut + provider share (25% INCLUDED). */
export function openRouterMetaSplit(grossCoins: number): { gross: number; cut: number; provider: number } {
  const gross = Math.max(0, Math.round(Number(grossCoins) * 100) / 100);
  const cut = Math.round((gross * OPENROUTER_META_CUT_PCT) / 100 * 100) / 100;
  return { gross, cut, provider: Math.round((gross - cut) * 100) / 100 };
}

/**
 * Quote gross coins for an op x qty. qty semantics per unit:
 * sync/lookup = runs (1), generation = generations (1).
 */
export function quoteOpenRouterMeta(op: OpenRouterMetaOp, qty: number): number {
  const rate = opByKey(op).coinsPerUnit;
  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 0) return 0;
  return Math.max(1, Math.ceil(rate * q));
}

export function quoteOpenRouterMetaSplit(op: OpenRouterMetaOp, qty: number): { gross: number; cut: number; provider: number } {
  return openRouterMetaSplit(quoteOpenRouterMeta(op, qty));
}

export function cleanOpenRouterMetaModelId(value: unknown): string {
  return String(value ?? "").trim().slice(0, 256);
}

export function cleanOpenRouterMetaGenerationId(value: unknown): string {
  return String(value ?? "").trim().slice(0, 128);
}

export function cleanGameSlug(value: unknown): string {
  return String(value ?? "lobby").trim().toLowerCase().slice(0, 64) || "lobby";
}

export function isValidOpenRouterMetaGameSlug(slug: string): boolean {
  return /^[a-z0-9-]{1,64}$/.test(slug);
}

export function isHttpsUrl(value: unknown): boolean {
  const v = String(value ?? "");
  return v.startsWith("https://") && v.length <= 2048;
}

// ---------------------------------------------------------------------------
// Server key helpers. SERVER-ONLY in effect: the browser never sets these,
// so openrouterMetaConfigured() is false there and the GUI renders the honest
// not-configured state instead of faking a sync.
// ---------------------------------------------------------------------------

export const OPENROUTER_META_API_BASE_DEFAULT = "https://openrouter.ai/api/v1";

export function openrouterMetaKey(): string {
  const raw =
    typeof process !== "undefined"
      ? String(process.env.OPENROUTER_API_KEY ?? "").trim()
      : "";
  return raw;
}

export function openrouterMetaApiBase(): string {
  const raw =
    typeof process !== "undefined"
      ? String(process.env.OPENROUTER_API_BASE ?? "").trim().replace(/\/+$/, "")
      : "";
  if (!raw) return OPENROUTER_META_API_BASE_DEFAULT;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return OPENROUTER_META_API_BASE_DEFAULT;
    if (u.hostname !== "openrouter.ai") return OPENROUTER_META_API_BASE_DEFAULT;
    return raw;
  } catch {
    return OPENROUTER_META_API_BASE_DEFAULT;
  }
}

export function openrouterMetaConfigured(): boolean {
  return openrouterMetaKey().length > 0;
}

export const OPENROUTER_META_CUT_NOTE = `Includes ${OPENROUTER_META_CUT_PCT}% platform cut (same ${SERVICE_CUT_PCT}% as all compute); never added on top.`;

/**
 * How a VibeCodeWorker agent calls openrouter-meta from inside the main
 * observe → reason → act loop. Emitted as a step tag the actions route
 * understands, e.g.:
 *   [tool: openrouter-meta.sync; op=models-list]
 * or equivalently POST /api/openrouter-meta/sync { op, game_slug, source: "vcw" }.
 */
export const VCW_OPENROUTER_META_HOWTO =
  "VCW loop openrouter-meta call: log an actions step with kind=action and text containing " +
  "[tool: openrouter-meta.sync; op=<op>] (source vcw, metered via meter_openrouter_meta_usage, " +
  "25% cut included). Observe first, then reason which op fits, then act with the cheapest viable op.";
