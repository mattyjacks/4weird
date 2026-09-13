// Universal typed cross-tool clipboard (remastery 5.1).
// SSR-safe: no storage access at module scope or in the constructor.

export interface ClipboardItemData {
  type: "code" | "image" | "audio" | "prompt" | "asset_url";
  sourceProgram: string;
  data: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

const STORAGE_KEY = "4weird_cross_clipboard_history";
const MAX_HISTORY = 50;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Minimal shape check: keep entries with string type + data, drop the rest.
function isValidEntry(value: unknown): value is ClipboardItemData {
  if (!isRecord(value)) return false;
  return typeof value["type"] === "string" && typeof value["data"] === "string";
}

function readHistory(key: string): ClipboardItemData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEntry);
  } catch {
    return [];
  }
}

function writeHistory(key: string, history: ClipboardItemData[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(history));
  } catch {
    // Quota / access errors fail open: in-memory state is unaffected.
  }
}

export class CrossClipboard {
  copy(item: Omit<ClipboardItemData, "createdAt">): void {
    if (typeof window === "undefined") return;
    const fullItem: ClipboardItemData = { ...item, createdAt: Date.now() };
    const next = [fullItem, ...readHistory(STORAGE_KEY).slice(0, MAX_HISTORY - 1)];
    writeHistory(STORAGE_KEY, next);
  }

  getLatest(typeFilter?: ClipboardItemData["type"]): ClipboardItemData | null {
    const history = this.getHistory();
    if (!typeFilter) return history[0] ?? null;
    return history.find((i) => i.type === typeFilter) ?? null;
  }

  getHistory(): ClipboardItemData[] {
    return readHistory(STORAGE_KEY);
  }

  clear(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Fail open on storage errors.
    }
  }
}

// Lazy singleton: null on the server, one shared instance in the browser.
// Construction is side-effect free (no storage touched until a method runs).
let cached: CrossClipboard | null = null;

function getShared(): CrossClipboard | null {
  if (typeof window === "undefined") return null;
  if (cached === null) cached = new CrossClipboard();
  return cached;
}

export const crossClipboard: CrossClipboard | null =
  typeof window === "undefined" ? null : getShared();
