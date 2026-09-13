/**
 * lib/interop.ts — typed cross-tool event bus (Remastery Feature 09, §3.9 + axiom 5).
 *
 * USAGE (any tool team, client or server):
 *   import { interopBus } from "@/lib/interop";
 *   interopBus.emit("studio:asset-ready", { kind: "sprite", url: "/x.png", source: "dictatepic" });
 *   const off = interopBus.on("code:fix-available", ({ patchDiff }) => applyPatch(patchDiff));
 *   off(); // unsubscribe
 *
 * CONTRACT:
 * - SSR-safe: no window/BroadcastChannel touched at module top level (channel opens lazily
 *   on first emit/on in the browser; server processes use in-memory fan-out only).
 * - Fail-open: a throwing listener never breaks emit; malformed wire messages are ignored.
 * - Channel name is the README §3.9 canonical "4weird_interop_bus" (the same channel the
 *   Wave-1 tools suite emits on). A one-way INBOUND bridge also listens on "4weird-interop"
 *   (lib/remastery bus) and re-notifies local subscribers — never re-emitted outward, so no loops.
 * - This module is dependency-free: it imports nothing from lib/remastery/* so tool teams
 *   get one stable import path with zero coupling.
 */

export interface InteropEventPayload {
  "media:exported": { path: string; type: "video" | "image" | "audio" };
  "code:fix-available": { patchDiff: string; targetFile: string };
  "game:asset-imported": { assetUrl: string; assetType: string };
  "squad:task-completed": { squadId: string; taskId: string };
  "system:notification": { title: string; message: string; category: string };
  "studio:asset-ready": { kind: string; url: string; source: string };
  "pipeline:step-done": { pipeline: string; step: number; status: string };
  "tools:used": { tool: string; action?: string };
  "chat:message-received": { threadId: string };
  "vcw:code-fix-suggested": { diff: string; gameSlug?: string; bugId?: string };
}

export type InteropEventName = keyof InteropEventPayload & string;
export type InteropHandler<K extends InteropEventName> = (
  data: InteropEventPayload[K],
) => void;
type AnyHandler = (data: unknown) => void;

const PRIMARY_CHANNEL = "4weird_interop_bus";
const LEGACY_CHANNEL = "4weird-interop";

function isWireMessage(value: unknown): value is { type: string; data: unknown } {
  if (typeof value !== "object" || value === null) return false;
  return typeof (value as { type?: unknown }).type === "string";
}

function parseWireMessage(raw: unknown): { type: string; data: unknown } | null {
  let decoded: unknown = raw;
  if (typeof raw === "string") {
    try {
      decoded = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  return isWireMessage(decoded) ? { type: decoded.type, data: decoded.data } : null;
}

export class InteropBus {
  private listeners = new Map<string, Set<AnyHandler>>();
  private channels: BroadcastChannel[] = [];
  private channelsReady = false;

  private ensureChannels(): void {
    if (this.channelsReady) return;
    this.channelsReady = true;
    if (typeof window === "undefined") return;
    try {
      if (typeof BroadcastChannel === "undefined") return;
      const primary = new BroadcastChannel(PRIMARY_CHANNEL);
      primary.onmessage = (event) => this.onWireMessage(event.data);
      this.channels.push(primary);
      // One-way inbound bridge from the remastery bus name: local subscribers hear
      // those events, but we never re-post outward (no loop).
      const legacy = new BroadcastChannel(LEGACY_CHANNEL);
      legacy.onmessage = (event) => {
        const msg = parseWireMessage(event.data);
        if (!msg) return;
        const payloadKey = msg.data !== undefined ? msg.data : (msg as { payload?: unknown }).payload;
        this.notify(msg.type, payloadKey);
      };
      this.channels.push(legacy);
    } catch {
      this.channels = [];
    }
  }

  private onWireMessage(raw: unknown): void {
    const msg = parseWireMessage(raw);
    if (!msg) return;
    this.notify(msg.type, msg.data);
  }

  private notify(type: string, data: unknown): void {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const cb of set) {
      try {
        cb(data);
      } catch {
        // Fail-open: one bad listener must never break emit.
      }
    }
  }

  emit<K extends InteropEventName>(type: K, data: InteropEventPayload[K]): void {
    this.notify(type, data);
    if (typeof window === "undefined") return;
    this.ensureChannels();
    const primary = this.channels[0];
    if (!primary) return;
    try {
      primary.postMessage({ type, data });
    } catch {
      // Fail-open: cross-tab fan-out is best-effort.
    }
  }

  on<K extends InteropEventName>(type: K, callback: InteropHandler<K>): () => void {
    this.ensureChannels();
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    const handler = callback as AnyHandler;
    set.add(handler);
    return () => {
      this.listeners.get(type)?.delete(handler);
    };
  }
}

/** Shared singleton. Server-safe to import (no channel opens until first use in a browser). */
export const interopBus = new InteropBus();
