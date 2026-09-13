/**
 * OpenRouter chat completions - 12 dialogue + reasoning services for games.
 *
 * One rule everywhere: every OpenRouter chat price INCLUDES the 25% platform
 * cut (OPENROUTER_CHAT_CUT_PCT = 25, same as SERVICE_CUT_PCT), never added on
 * top. The wallet is debited the gross; the ledger splits 25% platform /
 * 75% provider per op + game.
 *
 * Client-safe: this module never leaks the key. openrouterChatKey() /
 * openrouterChatConfigured() read server env only when called on the server;
 * the catalog constants below render in the browser with no credentials.
 *
 * Env (server-only, never NEXT_PUBLIC_):
 *   OPENROUTER_API_KEY (server-only bearer token).
 *   OPENROUTER_API_BASE overrides the base (default https://openrouter.ai/api/v1).
 *   Requests send HTTP-Referer https://github.com/mattyjacks/4weird and
 *   X-Title "4weird VibeCodeWorker" per OpenRouter attribution headers.
 *
 * Docs: https://openrouter.ai/docs/api-reference/overview
 * Base: https://openrouter.ai/api/v1
 *
 * VibeCodeWorker meld: the agent main loop (observe → reason → act) can
 * call any op from inside a run via OPENROUTER_CHAT_HOWTO; emit
 * `[tool: openrouter-chat.generate; op=<op> prompt="..."]` in an actions
 * step, or POST /api/openrouter-chat/generate with source "vcw".
 */

import { SERVICE_CUT_PCT } from "@/lib/economy";

/** Same 25% as every other compute surface; one rule. */
export const OPENROUTER_CHAT_CUT_PCT = 25;

export const OPENROUTER_CHAT_OP_KEYS = [
  "chat",
  "chat-stream",
  "prompt-completion",
  "vision-chat",
  "assistant-prefill",
  "reasoning",
  "max-tokens",
  "seeded",
  "stop-sequences",
  "logit-bias",
  "prediction",
  "multi-turn",
] as const;
export type OpenRouterChatOp = (typeof OPENROUTER_CHAT_OP_KEYS)[number];

export function isOpenRouterChatOp(value: unknown): value is OpenRouterChatOp {
  return (
    typeof value === "string" &&
    (OPENROUTER_CHAT_OP_KEYS as readonly string[]).includes(value)
  );
}

export type OpenRouterChatOpDef = {
  op: OpenRouterChatOp;
  name: string;
  unit: string;
  coinsPerUnit: number;
  blurb: string;
  /** Real OpenRouter model id, e.g. meta-llama/llama-4-scout-17b-16e-instruct. */
  model: string;
  /** Real OpenRouter endpoint, e.g. POST /chat/completions. */
  api: string;
  /** True when the op needs a prompt/text. */
  needsPrompt: boolean;
  /** True when the op needs a source image_url (vision only). */
  needsImage: boolean;
};

/**
 * 12 OpenRouter chat-completion services. Gross Vibe Coins per 1k tokens,
 * 25% cut INCLUDED. Every blurb names the real endpoint or param it uses.
 */
export const OPENROUTER_CHAT_OPS: OpenRouterChatOpDef[] = [
  {
    op: "chat",
    name: "Chat Completion",
    unit: "1k_tokens",
    coinsPerUnit: 4,
    blurb: "POST /chat/completions with model + messages + temperature for NPC dialogue.",
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    api: "POST /chat/completions",
    needsPrompt: true,
    needsImage: false,
  },
  {
    op: "chat-stream",
    name: "Streaming Chat",
    unit: "1k_tokens",
    coinsPerUnit: 4,
    blurb: "POST /chat/completions with stream:true SSE chunks for live-typed quest text.",
    model: "openai/gpt-5.2",
    api: "POST /chat/completions",
    needsPrompt: true,
    needsImage: false,
  },
  {
    op: "prompt-completion",
    name: "Prompt Completion",
    unit: "1k_tokens",
    coinsPerUnit: 2,
    blurb: "POST /chat/completions legacy prompt field for single-shot tavern signs.",
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    api: "POST /chat/completions",
    needsPrompt: true,
    needsImage: false,
  },
  {
    op: "vision-chat",
    name: "Vision Chat",
    unit: "1k_tokens",
    coinsPerUnit: 8,
    blurb: "POST /chat/completions with image_url content parts (URL or base64) to riff on screenshots.",
    model: "openai/gpt-5.2",
    api: "POST /chat/completions",
    needsPrompt: true,
    needsImage: true,
  },
  {
    op: "assistant-prefill",
    name: "Assistant Prefill",
    unit: "1k_tokens",
    coinsPerUnit: 3,
    blurb: "POST /chat/completions with a trailing assistant message that prefills the reply style.",
    model: "anthropic/claude-opus-4.6",
    api: "POST /chat/completions",
    needsPrompt: true,
    needsImage: false,
  },
  {
    op: "reasoning",
    name: "Deep Reasoning",
    unit: "1k_tokens",
    coinsPerUnit: 8,
    blurb: "POST /chat/completions on reasoning models; reasoning_tokens usage for deep game logic.",
    model: "openai/gpt-5.2",
    api: "POST /chat/completions",
    needsPrompt: true,
    needsImage: false,
  },
  {
    op: "max-tokens",
    name: "Bounded Barks",
    unit: "1k_tokens",
    coinsPerUnit: 2,
    blurb: "POST /chat/completions with bounded max_tokens for short cheap NPC barks.",
    model: "google/gemini-2.5-flash",
    api: "POST /chat/completions",
    needsPrompt: true,
    needsImage: false,
  },
  {
    op: "seeded",
    name: "Seeded Quests",
    unit: "1k_tokens",
    coinsPerUnit: 3,
    blurb: "POST /chat/completions with the seed param for deterministic reproducible quests.",
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    api: "POST /chat/completions",
    needsPrompt: true,
    needsImage: false,
  },
  {
    op: "stop-sequences",
    name: "Stop Sequences",
    unit: "1k_tokens",
    coinsPerUnit: 3,
    blurb: "POST /chat/completions with the stop param for controlled multi-line dialogue pack cutoffs.",
    model: "anthropic/claude-opus-4.6",
    api: "POST /chat/completions",
    needsPrompt: true,
    needsImage: false,
  },
  {
    op: "logit-bias",
    name: "Logit Bias Guard",
    unit: "1k_tokens",
    coinsPerUnit: 3,
    blurb: "POST /chat/completions with logit_bias steering to ban/force tokens (no-slur guard).",
    model: "openai/gpt-5.2",
    api: "POST /chat/completions",
    needsPrompt: true,
    needsImage: false,
  },
  {
    op: "prediction",
    name: "Predicted Output",
    unit: "1k_tokens",
    coinsPerUnit: 5,
    blurb: "POST /chat/completions with prediction predicted-outputs for fast lobby replies.",
    model: "google/gemini-2.5-flash",
    api: "POST /chat/completions",
    needsPrompt: true,
    needsImage: false,
  },
  {
    op: "multi-turn",
    name: "Multi-Turn Session",
    unit: "1k_tokens",
    coinsPerUnit: 6,
    blurb: "POST /chat/completions with system+user+assistant+tool message chains for branching quest sessions.",
    model: "anthropic/claude-opus-4.6",
    api: "POST /chat/completions",
    needsPrompt: true,
    needsImage: false,
  },
];

export function opByKey(op: OpenRouterChatOp): OpenRouterChatOpDef {
  const found = OPENROUTER_CHAT_OPS.find((o) => o.op === op);
  if (!found) throw new Error(`Unknown OpenRouter chat op: ${op}`);
  return found;
}

/** Split an OpenRouter chat gross charge into platform cut + provider share (25% INCLUDED). */
export function openRouterChatSplit(grossCoins: number): {
  gross: number;
  cut: number;
  provider: number;
} {
  const gross = Math.max(0, Math.round(Number(grossCoins) * 100) / 100);
  const cut = Math.round(((gross * OPENROUTER_CHAT_CUT_PCT) / 100) * 100) / 100;
  return { gross, cut, provider: Math.round((gross - cut) * 100) / 100 };
}

/**
 * Quote gross coins for an op x qty. qty is 1k-token units
 * (tokens / 1000), minimum 0.1.
 */
export function quoteOpenRouterChat(op: OpenRouterChatOp, qtyTokensInK: number): number {
  const rate = opByKey(op).coinsPerUnit;
  const q = Number(qtyTokensInK);
  if (!Number.isFinite(q) || q <= 0) return 0;
  return Math.max(1, Math.ceil(rate * q));
}

export function quoteOpenRouterChatSplit(
  op: OpenRouterChatOp,
  qtyTokensInK: number,
): { gross: number; cut: number; provider: number } {
  return openRouterChatSplit(quoteOpenRouterChat(op, qtyTokensInK));
}

export function cleanPrompt(value: unknown): string {
  return String(value ?? "").trim().slice(0, 4000);
}

export function cleanGameSlug(value: unknown): string {
  return String(value ?? "lobby").trim().toLowerCase().slice(0, 64) || "lobby";
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]{1,64}$/.test(slug);
}

export function isHttpsUrl(value: unknown): boolean {
  const v = String(value ?? "");
  return v.startsWith("https://") && v.length <= 2048;
}

// ---------------------------------------------------------------------------
// Server key helpers. SERVER-ONLY in effect: the browser never sets these,
// so openrouterChatConfigured() is false there and the GUI renders the
// honest not-configured state instead of faking a generation.
// ---------------------------------------------------------------------------

export const OPENROUTER_API_BASE_DEFAULT = "https://openrouter.ai/api/v1";
export const OPENROUTER_REFERER = "https://github.com/mattyjacks/4weird";
export const OPENROUTER_TITLE = "4weird VibeCodeWorker";

export function openrouterChatKey(): string {
  const raw =
    typeof process !== "undefined"
      ? String(process.env.OPENROUTER_API_KEY ?? "").trim()
      : "";
  return raw;
}

export function openrouterChatApiBase(): string {
  const raw =
    typeof process !== "undefined"
      ? String(process.env.OPENROUTER_API_BASE ?? "").trim().replace(/\/+$/, "")
      : "";
  if (!raw) return OPENROUTER_API_BASE_DEFAULT;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return OPENROUTER_API_BASE_DEFAULT;
    if (u.hostname !== "openrouter.ai") return OPENROUTER_API_BASE_DEFAULT;
    return raw;
  } catch {
    return OPENROUTER_API_BASE_DEFAULT;
  }
}

/** Attribution headers OpenRouter asks for on every request. */
export function openrouterChatHeaders(): Record<string, string> {
  return {
    "HTTP-Referer": OPENROUTER_REFERER,
    "X-Title": OPENROUTER_TITLE,
  };
}

export function openrouterChatConfigured(): boolean {
  return openrouterChatKey().length > 0;
}

export const OPENROUTER_CUT_NOTE = `Includes ${OPENROUTER_CHAT_CUT_PCT}% platform cut (same ${SERVICE_CUT_PCT}% as all compute); never added on top.`;

export const OPENROUTER_CHAT_HOWTO =
  "VCW loop openrouter-chat call: log an actions step with kind=action and text containing " +
  '[tool: openrouter-chat.generate; op=<op> prompt="..."] (source vcw, metered per 1k tokens, ' +
  "25% cut included). Observe first, then reason which op fits, then act with the cheapest viable op.";
