// 4weird free-utilities interop helpers (Remastery Feature 20, Wave 1).
//
// Fail-open + client-guarded by design (axioms 1.2.3 / 1.2.4): this module is
// safe to import from Server Components — every browser touch sits behind a
// `typeof window` guard and a try/catch, so a missing BroadcastChannel,
// clipboard, or localStorage degrades silently instead of bricking the page.
//
// Events published here use the shared `4weird_interop_bus` channel name so
// future tools can subscribe without any change to this file.

export const INTEROP_CHANNEL = "4weird_interop_bus";

const CLIPBOARD_HISTORY_KEY = "4weird_cross_clipboard_history";

export type FreeToolId = "seo" | "image" | "writing" | "counter";

export interface ToolEventPayload {
  tool: FreeToolId;
  action: string;
  detail?: string;
}

interface InteropEnvelope extends ToolEventPayload {
  source: "4weird-tools";
  at: number;
}

export function emitToolEvent(payload: ToolEventPayload): void {
  if (typeof window === "undefined") return;
  try {
    const envelope: InteropEnvelope = {
      ...payload,
      source: "4weird-tools",
      at: Date.now(),
    };
    // In-page listeners (same tab) via CustomEvent.
    window.dispatchEvent(new CustomEvent("4weird:interop", { detail: envelope }));
    // Cross-tab listeners via the shared BroadcastChannel bus.
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(INTEROP_CHANNEL);
      try {
        channel.postMessage({ type: "tools:used", data: envelope });
      } finally {
        channel.close();
      }
    }
  } catch {
    // Fail-open: telemetry-style events must never break the tool itself.
  }
}

export function stashClipboardText(text: string, label: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(CLIPBOARD_HISTORY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed : [];
    const entry = {
      type: "text",
      sourceProgram: "4weird-tools",
      data: text,
      label,
      createdAt: Date.now(),
    };
    window.localStorage.setItem(
      CLIPBOARD_HISTORY_KEY,
      JSON.stringify([entry, ...list].slice(0, 50)),
    );
    return true;
  } catch {
    return false;
  }
}

export async function copyText(text: string, label: string): Promise<boolean> {
  stashClipboardText(text, label);
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  try {
    if (!navigator.clipboard) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
