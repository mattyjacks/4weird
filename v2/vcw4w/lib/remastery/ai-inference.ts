// Wave-2 AI infrastructure pure helpers (remastery README Wave 2 + axiom 3 fail-open).
// Edge-safe: no fetch, no window/DOM, no secrets/keys, zero runtime deps.
// Pure validation may throw (buildOpenRouterPayload, buildFalJob); everything
// network-facing is fail-open by construction — no fetch lives in this module.
// Callers must catch AI failures and fall back to heuristicFallback so
// navigation/tools keep working.

export type AIModel = "openai/gpt-4o-mini" | "anthropic/claude-3-5-sonnet" | string;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface InferenceRequest {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}

const MAX_TOKENS_MIN = 1;
const MAX_TOKENS_MAX = 128000;
const TEMPERATURE_MIN = 0;
const TEMPERATURE_MAX = 2;

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function buildOpenRouterPayload(req: InferenceRequest): Record<string, unknown> {
  if (typeof req.model !== "string" || req.model.trim() === "") {
    throw new Error("InferenceRequest.model must be a non-empty string");
  }
  if (!Array.isArray(req.messages) || req.messages.length === 0) {
    throw new Error("InferenceRequest.messages must be a non-empty array");
  }
  const payload: Record<string, unknown> = {
    model: req.model.trim(),
    messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
  };
  if (req.maxTokens !== undefined) {
    payload["max_tokens"] = Math.floor(clamp(req.maxTokens, MAX_TOKENS_MIN, MAX_TOKENS_MAX));
  }
  if (req.temperature !== undefined) {
    payload["temperature"] = clamp(req.temperature, TEMPERATURE_MIN, TEMPERATURE_MAX);
  }
  if (req.jsonMode === true) {
    payload["response_format"] = { type: "json_object" };
  }
  return payload;
}

export function safeParseJson<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export interface FalJob {
  app: string;
  input: Record<string, unknown>;
}

export function buildFalJob(app: string, input: Record<string, unknown>): FalJob {
  if (typeof app !== "string" || app.trim() === "") {
    throw new Error("Fal app id must be a non-empty string");
  }
  return { app: app.trim(), input };
}

export function heuristicFallback(prompt: string): string {
  const p = (prompt ?? "").toLowerCase();
  if (p.includes("image") || p.includes("picture") || p.includes("draw") || p.includes("photo")) {
    return "AI image service is unreachable, so no image was generated. Your canvas layers and tools remain available — try again later.";
  }
  if (p.includes("video") || p.includes("clip") || p.includes("timeline")) {
    return "AI video service is unreachable, so no clip was produced. Your timeline and studio tools remain available — try again later.";
  }
  if (p.includes("audio") || p.includes("music") || p.includes("sound")) {
    return "AI audio service is unreachable, so no audio was produced. Playback and editing tools remain available — try again later.";
  }
  if (p.includes("code") || p.includes("fix") || p.includes("bug") || p.includes("error")) {
    return "AI code assist is unreachable, so no fix was suggested. Navigation, editing, and debug tools remain available — try again later.";
  }
  if (
    p.includes("invoice") ||
    p.includes("coin") ||
    p.includes("cost") ||
    p.includes("price") ||
    p.includes("bill")
  ) {
    return "AI billing help is unreachable, so no estimate was computed. Invoices, timers, and project tools remain available — try again later.";
  }
  return "AI is unreachable right now, so this answer is a local fallback. Navigation and tools keep working — try your request again later.";
}

// 100 coins = $1 parity (mirrors VIBE_COINS_PER_USD in remastery-types.ts).
const COINS_PER_USD = 100;

interface ModelCharRates {
  inputUsdPer1kChars: number;
  outputUsdPer1kChars: number;
}

const MODEL_CHAR_RATES: Record<string, ModelCharRates> = {
  "openai/gpt-4o-mini": { inputUsdPer1kChars: 0.00015, outputUsdPer1kChars: 0.0006 },
  "anthropic/claude-3-5-sonnet": { inputUsdPer1kChars: 0.003, outputUsdPer1kChars: 0.015 },
};

const DEFAULT_CHAR_RATES: ModelCharRates = { inputUsdPer1kChars: 0.001, outputUsdPer1kChars: 0.003 };

function ratesForModel(model: string): ModelCharRates {
  const direct = MODEL_CHAR_RATES[model];
  if (direct) return direct;
  const lower = (model ?? "").toLowerCase();
  if (lower.includes("gpt-4o-mini")) return MODEL_CHAR_RATES["openai/gpt-4o-mini"];
  if (lower.includes("claude-3-5-sonnet") || lower.includes("claude")) {
    return MODEL_CHAR_RATES["anthropic/claude-3-5-sonnet"];
  }
  return DEFAULT_CHAR_RATES;
}

export function estimateCostCoins(
  model: string,
  inputChars: number,
  outputChars: number,
): number {
  const rates = ratesForModel(model);
  const safeInput = Number.isFinite(inputChars) && inputChars > 0 ? inputChars : 0;
  const safeOutput = Number.isFinite(outputChars) && outputChars > 0 ? outputChars : 0;
  const usd =
    (safeInput / 1000) * rates.inputUsdPer1kChars +
    (safeOutput / 1000) * rates.outputUsdPer1kChars;
  return Math.max(0, Math.floor(usd * COINS_PER_USD));
}
