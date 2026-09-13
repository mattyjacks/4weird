// Cross-tool typed event bus (remastery 3.9, axiom 5: Universal Event Interop).
// SSR-safe: no window/BroadcastChannel at module top level; cross-tab channel is lazy.

export interface InteropEventMap {
  "code:fix-available": { diff: string; gameSlug?: string };
  "vcw:code-fix-suggested": { diff: string; gameSlug?: string; bugId?: string };
  "squad:task-completed": { squadId: string; taskId: string };
  "studio:asset-ready": { kind: string; url: string; source: string };
  "pipeline:step-done": { pipeline: string; step: number; status: string };
  "chat:message-received": { threadId: string };
  // Legacy README 3.9 events kept for compat.
  "media:exported": { path: string; type: "video" | "image" | "audio" };
  "game:asset-imported": { assetUrl: string; assetType: string };
  "system:notification": { title: string; message: string; category: string };
  // Generic fallback for future tools.
  [event: string]: unknown;
}

export type InteropEventName = keyof InteropEventMap & string;
export type InteropHandler<T = unknown> = (payload: T) => void;

const CHANNEL_NAME = "4weird-interop";

// In-memory subscribers: works server-side within one process.
const listeners = new Map<string, Set<InteropHandler<unknown>>>();

let channel: BroadcastChannel | null = null;
let channelInitAttempted = false;

function isWireMessage(value: unknown): value is { type: string; payload: unknown } {
  if (typeof value !== "object" || value === null) return false;
  const type = (value as { type?: unknown }).type;
  return typeof type === "string";
}

function parseWireMessage(data: unknown): { type: string; payload: unknown } | null {
  let decoded: unknown = data;
  if (typeof data === "string") {
    try {
      decoded = JSON.parse(data) as unknown;
    } catch {
      return null; // Ignore malformed messages.
    }
  }
  return isWireMessage(decoded) ? decoded : null;
}

function handleChannelMessage(event: MessageEvent): void {
  const msg = parseWireMessage(event.data as unknown);
  if (msg === null) return;
  notifyLocal(msg.type, msg.payload);
}

// Lazy cross-tab fan-out; null on SSR or when BroadcastChannel is unavailable.
function getChannel(): BroadcastChannel | null {
  if (channelInitAttempted) return channel;
  channelInitAttempted = true;
  if (typeof window === "undefined") return null;
  try {
    if (typeof BroadcastChannel === "undefined") return null;
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = handleChannelMessage;
  } catch {
    channel = null;
  }
  return channel;
}

function notifyLocal(type: string, payload: unknown): void {
  const set = listeners.get(type);
  if (!set) return;
  for (const listener of set) {
    try {
      listener(payload);
    } catch {
      // Fail-open: one bad listener must never break emit.
    }
  }
}

export function emit<K extends InteropEventName>(type: K, payload: InteropEventMap[K]): void {
  notifyLocal(type, payload);
  try {
    getChannel()?.postMessage(JSON.stringify({ type, payload }));
  } catch {
    // Fail-open: cross-tab delivery is best-effort.
  }
}

export function subscribe<K extends InteropEventName>(
  type: K,
  handler: InteropHandler<InteropEventMap[K]>,
): () => void {
  getChannel(); // Attach cross-tab listener before first event can arrive.
  let set = listeners.get(type);
  if (!set) {
    set = new Set<InteropHandler<unknown>>();
    listeners.set(type, set);
  }
  const wrapped = handler as InteropHandler<unknown>;
  set.add(wrapped);
  return () => {
    listeners.get(type)?.delete(wrapped);
  };
}

export function once<K extends InteropEventName>(
  type: K,
  handler: InteropHandler<InteropEventMap[K]>,
): () => void {
  const unsubscribe = subscribe(type, (payload) => {
    unsubscribe();
    handler(payload);
  });
  return unsubscribe;
}

// Object form matching the README's `interopBus` naming.
export const interopBus = { emit, subscribe, once };
