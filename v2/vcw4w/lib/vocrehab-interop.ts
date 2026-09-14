/**
 * VocRehab interop thin wrapper (plan §11.1.9, §2.1.8).
 *
 * Emit-only: VocRehab publishes `vocrehab:*` events on the canonical
 * `4weird_interop_bus` BroadcastChannel and never subscribes to another
 * module's private channel. SSR-safe — no `window` access at module top
 * level; everything browser-specific is guarded inside `vocrehabEmit`.
 */

export const vocrehabInteropChannel = "4weird_interop_bus";

/** Event names this module may emit. All start with `vocrehab:`. */
export type VocrehabInteropEvent =
  | "vocrehab:game:completed"
  | "vocrehab:course:module-done"
  | "vocrehab:export:ready";

/**
 * Post a `vocrehab:`-prefixed event on the shared bus. Returns true when
 * the event was posted, false on server / unsupported runtimes or for
 * non-`vocrehab:` names (never forwards foreign events). Fail-open: a
 * missing BroadcastChannel never throws.
 */
export function vocrehabEmit(event: VocrehabInteropEvent | string, detail: unknown): boolean {
  if (typeof event !== "string" || !event.startsWith("vocrehab:")) return false;
  if (typeof window === "undefined") return false;
  try {
    const Bus = (window as unknown as Record<string, unknown>).BroadcastChannel as
      | (new (name: string) => { postMessage: (msg: unknown) => void; close: () => void })
      | undefined;
    if (typeof Bus === "undefined") return false;
    const channel = new Bus(vocrehabInteropChannel);
    channel.postMessage({ event, detail: detail ?? null });
    channel.close();
    return true;
  } catch {
    return false;
  }
}
