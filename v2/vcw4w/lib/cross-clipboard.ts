/**
 * lib/cross-clipboard.ts — universal typed cross-tool clipboard (Remastery §5.1 + axiom 5).
 *
 * USAGE (client components only — browser APIs live behind guards):
 *   import { copyToClipboard, readLatest, readHistory } from "@/lib/cross-clipboard";
 *   copyToClipboard({ type: "code", sourceProgram: "commander", data: "const x = 1;" });
 *   const latestSprite = readLatest("image"); // newest image item or null
 *
 * CONTRACT:
 * - SSR-safe: every browser touch is guarded by `typeof window !== "undefined"`; all
 *   helpers return safe fallbacks (null / []) on the server. Never construct at module top.
 * - Fail-open: corrupt localStorage JSON, quota errors, or missing BroadcastChannel degrade
 *   to in-memory-only history — copy() never throws.
 * - History cap 50, storage key "4weird_cross_clipboard_history" (README §5.1).
 * - Cross-tab sync is best-effort via a lazy BroadcastChannel; same-tab subscribers get
 *   synchronous notify through subscribe().
 */

export type ClipboardItemType = "code" | "image" | "audio" | "prompt" | "asset_url";

export interface ClipboardItemData {
  type: ClipboardItemType;
  sourceProgram: string;
  data: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export type ClipboardListener = (item: ClipboardItemData) => void;

const STORAGE_KEY = "4weird_cross_clipboard_history";
const SYNC_CHANNEL = "4weird_cross_clipboard";
const HISTORY_CAP = 50;
const MAX_ITEM_CHARS = 500_000;

const memoryFallback: ClipboardItemData[] = [];
const listeners = new Set<ClipboardListener>();
let syncChannel: BroadcastChannel | null = null;
let syncReady = false;

function isClipboardItem(value: unknown): value is ClipboardItemData {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v["type"] === "code" ||
      v["type"] === "image" ||
      v["type"] === "audio" ||
      v["type"] === "prompt" ||
      v["type"] === "asset_url") &&
    typeof v["sourceProgram"] === "string" &&
    typeof v["data"] === "string" &&
    typeof v["createdAt"] === "number"
  );
}

function ensureSyncChannel(): void {
  if (syncReady) return;
  syncReady = true;
  if (typeof window === "undefined") return;
  try {
    if (typeof BroadcastChannel === "undefined") return;
    syncChannel = new BroadcastChannel(SYNC_CHANNEL);
    syncChannel.onmessage = (event) => {
      const item = event.data as unknown;
      if (!isClipboardItem(item)) return;
      notifyLocal(item);
    };
  } catch {
    syncChannel = null;
  }
}

function notifyLocal(item: ClipboardItemData): void {
  for (const cb of listeners) {
    try {
      cb(item);
    } catch {
      // Fail-open.
    }
  }
}

function readStored(): ClipboardItemData[] {
  if (typeof window === "undefined") return [...memoryFallback];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...memoryFallback];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...memoryFallback];
    const valid = parsed.filter(isClipboardItem).slice(0, HISTORY_CAP);
    return [...valid, ...memoryFallback].slice(0, HISTORY_CAP);
  } catch {
    return [...memoryFallback];
  }
}

function writeStored(history: ClipboardItemData[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, HISTORY_CAP)));
  } catch {
    // Fail-open: quota or privacy mode — memory fallback already holds the item.
  }
}

/** Copy one typed item. Never throws; returns the stored item (or null on oversize/empty). */
export function copyToClipboard(
  item: Omit<ClipboardItemData, "createdAt">,
): ClipboardItemData | null {
  const data = String(item.data ?? "");
  if (!data || data.length > MAX_ITEM_CHARS) return null;
  const full: ClipboardItemData = { ...item, data, createdAt: Date.now() };
  memoryFallback.unshift(full);
  if (memoryFallback.length > HISTORY_CAP) memoryFallback.length = HISTORY_CAP;
  try {
    const next = [full, ...readStored().filter((i) => i !== full)].slice(0, HISTORY_CAP);
    writeStored(next);
  } catch {
    // Fail-open.
  }
  notifyLocal(full);
  ensureSyncChannel();
  try {
    syncChannel?.postMessage(full);
  } catch {
    // Cross-tab fan-out is best-effort.
  }
  return full;
}

/** Newest item overall, or newest of one type. Null on server / when empty. */
export function readLatest(typeFilter?: ClipboardItemType): ClipboardItemData | null {
  const history = readStored();
  if (!typeFilter) return history[0] ?? null;
  return history.find((i) => i.type === typeFilter) ?? null;
}

/** Full history, newest first (max 50). Empty array on server. */
export function readHistory(): ClipboardItemData[] {
  return readStored();
}

/** Subscribe to same-tab copies. Returns an unsubscribe function. */
export function subscribeClipboard(listener: ClipboardListener): () => void {
  ensureSyncChannel();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Class wrapper matching the README §5.1 sketch (browser-only methods, fail-open). */
export class CrossClipboard {
  copy(item: Omit<ClipboardItemData, "createdAt">): ClipboardItemData | null {
    return copyToClipboard(item);
  }
  getLatest(typeFilter?: ClipboardItemType): ClipboardItemData | null {
    return readLatest(typeFilter);
  }
  getHistory(): ClipboardItemData[] {
    return readHistory();
  }
}
