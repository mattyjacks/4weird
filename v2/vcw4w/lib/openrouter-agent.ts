/**
 * OpenRouter agentic/capability services - 12 real OpenRouter API features.
 *
 * One rule everywhere: every OpenRouter agent price INCLUDES the 25%
 * platform cut (OPENROUTER_AGENT_CUT_PCT = 25, same as SERVICE_CUT_PCT /
 * FAL_COMPUTE_CUT_PCT / GAME_AI_COMPUTE_CUT_PCT), never added on top.
 * The wallet is debited the gross; the ledger splits 25% platform /
 * 75% provider per op + game.
 *
 * Client-safe: this module never leaks the key. openrouterAgentKey() /
 * openrouterAgentConfigured() read server env only when called on the
 * server; the catalog constants below render in the browser with no
 * credentials.
 *
 * Env (server-only, never NEXT_PUBLIC_):
 *   OPENROUTER_API_KEY - bearer token sent as Authorization on every call.
 *
 * Docs: https://openrouter.ai/docs/api-reference/overview
 * All calls are POST /api/v1/chat/completions unless the api field says
 * otherwise; blurbs name the real param / plugin id each op meters.
 *
 * VibeCodeWorker meld: the agent main loop (observe → reason → act) can
 * call any op from inside a run via VCW_OPENROUTER_AGENT_HOWTO; emit
 * `[tool: openrouter-agent.run; op=<op> prompt="..."]` in an actions step,
 * or POST /api/openrouter-agent/run with source "vcw".
 */

import { SERVICE_CUT_PCT } from "@/lib/economy";

/** Same 25% as every other compute surface; one rule. */
export const OPENROUTER_AGENT_CUT_PCT = 25;

export const OPENROUTER_AGENT_OP_KEYS = [
  "tool-calling",
  "structured-json",
  "structured-schema",
  "web-search",
  "file-parse",
  "response-healing",
  "context-compress",
  "fallback-route",
  "provider-pin",
  "audio-input",
  "usage-metered",
  "debug-echo",
] as const;
export type OpenRouterAgentOp = (typeof OPENROUTER_AGENT_OP_KEYS)[number];

export function isOpenRouterAgentOp(value: unknown): value is OpenRouterAgentOp {
  return (
    typeof value === "string" &&
    (OPENROUTER_AGENT_OP_KEYS as readonly string[]).includes(value)
  );
}

export type OpenRouterAgentOpDef = {
  op: OpenRouterAgentOp;
  name: string;
  unit: string;
  coinsPerUnit: number;
  blurb: string;
  /** Real OpenRouter model id, e.g. anthropic/claude-sonnet-4. */
  model: string;
  /** Endpoint + key params, e.g. POST /api/v1/chat/completions ... */
  api: string;
  /** True when the op needs a prompt/text. */
  needsPrompt: boolean;
  /** True when the op needs a source image_url. Always false here. */
  needsImage: boolean;
};

/**
 * 12 ways to use OpenRouter agentic features across game dev + coding.
 * Gross Vibe Coins per unit, 25% cut INCLUDED. Units are 1k_tokens except
 * usage-metered + debug-echo (per-generation accounting/diagnosis).
 */
export const OPENROUTER_AGENT_OPS: OpenRouterAgentOpDef[] = [
  { op: "tool-calling", name: "Tool Calling", unit: "1k_tokens", coinsPerUnit: 5, blurb: "Function calling via tools + tool_choice bridge for VCW actions.", model: "anthropic/claude-sonnet-4", api: "POST /api/v1/chat/completions tools + tool_choice", needsPrompt: true, needsImage: false },
  { op: "structured-json", name: "Structured JSON", unit: "1k_tokens", coinsPerUnit: 4, blurb: "response_format {type: json_object} for quest JSON + bug JSON.", model: "openai/gpt-4o-mini", api: "POST /api/v1/chat/completions response_format=json_object", needsPrompt: true, needsImage: false },
  { op: "structured-schema", name: "Structured Schema", unit: "1k_tokens", coinsPerUnit: 6, blurb: "response_format {type: json_schema, strict: true} for typed game entities.", model: "openai/gpt-4o-2024-11-20", api: "POST /api/v1/chat/completions response_format=json_schema strict", needsPrompt: true, needsImage: false },
  { op: "web-search", name: "Web Search", unit: "1k_tokens", coinsPerUnit: 7, blurb: "plugins [{id: web}] real-time web search grounding for live facts.", model: "google/gemini-2.0-flash-001", api: "POST /api/v1/chat/completions plugins=[{id: web}]", needsPrompt: true, needsImage: false },
  { op: "file-parse", name: "File Parse", unit: "1k_tokens", coinsPerUnit: 6, blurb: "plugins [{id: file-parser}] PDF processing for design docs.", model: "anthropic/claude-sonnet-4", api: "POST /api/v1/chat/completions plugins=[{id: file-parser}]", needsPrompt: true, needsImage: false },
  { op: "response-healing", name: "Response Healing", unit: "1k_tokens", coinsPerUnit: 3, blurb: "plugins [{id: response-healing}] auto JSON repair on malformed output.", model: "meta-llama/llama-3.3-70b-instruct", api: "POST /api/v1/chat/completions plugins=[{id: response-healing}]", needsPrompt: true, needsImage: false },
  { op: "context-compress", name: "Context Compress", unit: "1k_tokens", coinsPerUnit: 8, blurb: "plugins [{id: context-compression}] middle-out compression for long runs.", model: "google/gemini-2.0-flash-001", api: "POST /api/v1/chat/completions plugins=[{id: context-compression}]", needsPrompt: true, needsImage: false },
  { op: "fallback-route", name: "Fallback Route", unit: "1k_tokens", coinsPerUnit: 5, blurb: "models[] + route: fallback cheapest-viable auto failover across models.", model: "openai/gpt-4o-mini", api: "POST /api/v1/chat/completions models[] route=fallback", needsPrompt: true, needsImage: false },
  { op: "provider-pin", name: "Provider Pin", unit: "1k_tokens", coinsPerUnit: 4, blurb: "provider prefs pin (order/allow/deny) latency-first routing control.", model: "mistralai/mistral-large", api: "POST /api/v1/chat/completions provider={order,allow,deny}", needsPrompt: true, needsImage: false },
  { op: "audio-input", name: "Audio Input", unit: "1k_tokens", coinsPerUnit: 10, blurb: "Audio content parts with audio_tokens usage for voice-command games.", model: "openai/gpt-4o-audio-preview", api: "POST /api/v1/chat/completions modalities=[text,audio]", needsPrompt: true, needsImage: false },
  { op: "usage-metered", name: "Usage Metered", unit: "generation", coinsPerUnit: 2, blurb: "usage + cost + cost_details accounting per generation for wallet metering.", model: "openai/gpt-4o-mini", api: "POST /api/v1/chat/completions usage include cost_details", needsPrompt: false, needsImage: false },
  { op: "debug-echo", name: "Debug Echo", unit: "generation", coinsPerUnit: 2, blurb: "debug.echo_upstream_body streaming diagnosis for broken-play triage.", model: "meta-llama/llama-3.3-70b-instruct", api: "POST /api/v1/chat/completions debug.echo_upstream_body", needsPrompt: false, needsImage: false },
];

export function opByKey(op: OpenRouterAgentOp): OpenRouterAgentOpDef {
  const found = OPENROUTER_AGENT_OPS.find((o) => o.op === op);
  if (!found) throw new Error(`Unknown openrouter-agent op: ${op}`);
  return found;
}

/** OpenRouter model id for an op. */
export function modelForOp(op: OpenRouterAgentOp): string {
  return opByKey(op).model;
}

/** Split an openrouter-agent gross charge into platform cut + provider share (25% INCLUDED). */
export function openRouterAgentSplit(grossCoins: number): { gross: number; cut: number; provider: number } {
  const gross = Math.max(0, Math.round(Number(grossCoins) * 100) / 100);
  const cut = Math.round((gross * OPENROUTER_AGENT_CUT_PCT) / 100 * 100) / 100;
  return { gross, cut, provider: Math.round((gross - cut) * 100) / 100 };
}

/**
 * Quote gross coins for an op x qty. qty semantics per unit:
 * 1k_tokens = tokens/1000, generation = generations (1).
 */
export function quoteOpenRouterAgent(op: OpenRouterAgentOp, qty: number): number {
  const rate = opByKey(op).coinsPerUnit;
  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 0) return 0;
  return Math.max(1, Math.ceil(rate * q));
}

export function quoteOpenRouterAgentSplit(op: OpenRouterAgentOp, qty: number): { gross: number; cut: number; provider: number } {
  return openRouterAgentSplit(quoteOpenRouterAgent(op, qty));
}

/** Derive billable qty from raw inputs (tokens fall back to 1 generation). */
export function qtyForInput(op: OpenRouterAgentOp, input: { prompt?: string; tokens?: number }): number {
  if (op === "usage-metered" || op === "debug-echo") return 1;
  const tokens = Number(input.tokens ?? 0);
  if (Number.isFinite(tokens) && tokens > 0) return Math.max(0.1, Math.ceil(tokens / 100) / 10);
  const chars = String(input.prompt ?? "").length;
  if (chars > 0) return Math.max(0.1, Math.ceil(chars / 400) / 10);
  return 1;
}

export function cleanOpenRouterAgentPrompt(value: unknown): string {
  return String(value ?? "").trim().slice(0, 8000);
}

export function cleanGameSlug(value: unknown): string {
  return String(value ?? "lobby").trim().toLowerCase().slice(0, 64) || "lobby";
}

export function isValidOpenRouterAgentGameSlug(slug: string): boolean {
  return /^[a-z0-9-]{1,64}$/.test(slug);
}

export function isHttpsUrl(value: unknown): boolean {
  const v = String(value ?? "");
  return v.startsWith("https://") && v.length <= 2048;
}

// ---------------------------------------------------------------------------
// Server key helpers. SERVER-ONLY in effect: the browser never sets these,
// so openrouterAgentConfigured() is false there and the GUI renders the
// honest not-configured state instead of faking a generation.
// ---------------------------------------------------------------------------

export function openrouterAgentKey(): string {
  const raw =
    typeof process !== "undefined"
      ? String(process.env.OPENROUTER_API_KEY ?? "").trim()
      : "";
  return raw;
}

export function openrouterAgentConfigured(): boolean {
  return openrouterAgentKey().length > 0;
}

export const OPENROUTER_AGENT_CUT_NOTE = `Includes ${OPENROUTER_AGENT_CUT_PCT}% platform cut (same ${SERVICE_CUT_PCT}% as all compute); never added on top.`;

/** Chat-completions request body extras per op (model + feature params). */
export function openRouterAgentParamsFor(op: OpenRouterAgentOp, input: { prompt: string; models?: string[] }): Record<string, unknown> {
  const prompt = cleanOpenRouterAgentPrompt(input.prompt);
  const base: Record<string, unknown> = { model: modelForOp(op) };
  switch (op) {
    case "tool-calling":
      return { ...base, messages: [{ role: "user", content: prompt }], tools: [], tool_choice: "auto" };
    case "structured-json":
      return { ...base, messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } };
    case "structured-schema":
      return { ...base, messages: [{ role: "user", content: prompt }], response_format: { type: "json_schema", json_schema: { name: "game_entity", strict: true, schema: {} } } };
    case "web-search":
      return { ...base, messages: [{ role: "user", content: prompt }], plugins: [{ id: "web" }] };
    case "file-parse":
      return { ...base, messages: [{ role: "user", content: prompt }], plugins: [{ id: "file-parser" }] };
    case "response-healing":
      return { ...base, messages: [{ role: "user", content: prompt }], plugins: [{ id: "response-healing" }] };
    case "context-compress":
      return { ...base, messages: [{ role: "user", content: prompt }], plugins: [{ id: "context-compression" }] };
    case "fallback-route":
      return { models: input.models?.length ? input.models : [modelForOp(op), "meta-llama/llama-3.3-70b-instruct"], route: "fallback", messages: [{ role: "user", content: prompt }] };
    case "provider-pin":
      return { ...base, messages: [{ role: "user", content: prompt }], provider: { order: [], allow: [], deny: [] } };
    case "audio-input":
      return { ...base, messages: [{ role: "user", content: prompt }], modalities: ["text", "audio"] };
    case "usage-metered":
      return { ...base, messages: [{ role: "user", content: prompt }], usage: { include: true }, stream: false };
    case "debug-echo":
      return { ...base, messages: [{ role: "user", content: prompt }], debug: { echo_upstream_body: true } };
    default:
      return { ...base, messages: [{ role: "user", content: prompt }] };
  }
}

/**
 * How a VibeCodeWorker agent calls openrouter-agent from inside the main
 * observe → reason → act loop. Emitted as a step tag the actions route
 * understands, e.g.:
 *   [tool: openrouter-agent.run; op=tool-calling prompt="spawn quest NPC"]
 * or equivalently POST /api/openrouter-agent/run { op, prompt, game_slug, source: "vcw" }.
 */
export const VCW_OPENROUTER_AGENT_HOWTO =
  "VCW loop openrouter-agent call: log an actions step with kind=action and text containing " +
  "[tool: openrouter-agent.run; op=<op> prompt=\"...\"] (source vcw, metered via meter_openrouter_agent_usage, " +
  "25% cut included). Observe first, then reason which op fits, then act with the cheapest viable op.";
