/**
 * Buddy chat SSE helpers (client-safe, no imports).
 *
 * Client protocol for POST /api/buddy/chat with { "stream": true }:
 *   Request: same JSON body as the JSON turn plus `"stream": true`.
 *   Response: `text/event-stream` (`Cache-Control: no-cache`,
 *     `Connection: keep-alive`), UTF-8 `data:` frames separated by `\n\n`:
 *     - `data: {"delta":"..."}` - one per OpenAI
 *       `response.output_text.delta` payload while the model writes.
 *     - `data: {"done":true,"reply":...,"brain":...,"intent":...,"model":...,
 *       "estimate":...,"cost":{...},"falHint":...}` - terminal success.
 *       `estimate` is `{chatCoins,ttsCoins,gross}` and `cost` carries the
 *       same shape as the JSON turn (`grossCoins,grossCenticentcoins,cut,
 *       provider,usdProvider,usdGross,parts,display`). Metering runs BEFORE
 *       this frame is emitted, so a `done` frame means the turn was metered.
 *     - `data: {"error":"..."}` - terminal failure (upstream error or
 *       `Unable to meter this turn.` when metering fails). No `done` follows.
 *   Fallback (no brain): a single `done` frame with the local reply and
 *   `cost: null`, same semantics as the JSON fallback turn.
 *   Without `"stream": true` the route keeps its exact JSON behavior.
 */

export const BUDDY_SSE_HEADERS: Record<string, string> = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

/** Encode one SSE frame (`data: <json>\n\n`). */
export function sseEncode(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

/** True when the client asked for SSE (`"stream": true` in the JSON body). */
export function isBuddyStreamRequested(input: Record<string, unknown>): boolean {
  return (input as { stream?: unknown }).stream === true;
}

/**
 * Pull the text delta out of one OpenAI Responses stream event.
 * Returns the delta string, or null when this event carries no text.
 */
export function responsesDeltaFromEvent(event: string, data: unknown): string | null {
  const d = (data ?? {}) as { delta?: unknown; type?: unknown };
  if (event === "response.output_text.delta" || d.type === "response.output_text.delta") {
    return typeof d.delta === "string" && d.delta ? d.delta : null;
  }
  return null;
}

/** True when this Responses stream event ends the turn with a full payload. */
export function isResponsesCompleted(event: string, data: unknown): boolean {
  const d = (data ?? {}) as { type?: unknown };
  return event === "response.completed" || d.type === "response.completed";
}

/** True when this Responses stream event is a terminal upstream failure. */
export function isResponsesFailed(event: string, data: unknown): boolean {
  const d = (data ?? {}) as { type?: unknown };
  return event === "response.failed" || event === "error" || d.type === "response.failed" || d.type === "error";
}
