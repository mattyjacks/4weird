// Shared autosave defaults for 4weird playable games.
//
// Single source of truth for the per-game autosave affordance so the play
// shell, the save panel, and individual game routes agree on:
//   - whether autosave is on when the player has never toggled it,
//   - how often the autosave tick fires,
//   - which local slot autosave writes to,
//   - which localStorage keys hold the toggle + slot payloads,
//   - which window event names request an out-of-band save.
//
// Importing this module has no side effects and changes no behavior on its
// own: callers opt in by importing the constants/helpers. All localStorage
// access is SSR-safe (typeof window guard) and fail-open: when storage is
// unavailable or the stored value is unparseable, autosave reads as enabled
// (AUTOSAVE_ENABLED_DEFAULT) so a broken toggle never silently eats saves.
//
// No imports needed; keep it that way so game routes can pull this in
// without dragging client-only dependencies into server components.

/** Autosave is ON unless the player explicitly turned it off. */
export const AUTOSAVE_ENABLED_DEFAULT = true as const;

/** Default delay between autosave ticks. */
export const AUTOSAVE_INTERVAL_MS = 60000 as const;

/** Local slot autosave writes to (slot 0; manual saves use slots >= 1). */
export const AUTOSAVE_SLOT = 0 as const;

/**
 * Window event a game route dispatches (or listens for) to request an
 * out-of-band save, e.g. before the tab hides or the player navigates away.
 */
export const REQUEST_SAVE_EVENT = "fourweird-request-save" as const;

/**
 * Window event the play shell listens for to trigger a shell-level save
 * (IndexedDB snapshot, cloud sync) independently of the in-game saver.
 */
export const SHELL_REQUEST_SAVE_EVENT = "fourweird-shell-request-save" as const;

/** localStorage key for the per-game autosave toggle. */
export function autosaveEnabledKey(slug: string): string {
  return `fourweird:autosave-enabled:${slug}`;
}

/** localStorage key for a per-game manual/autosave slot payload. */
export function localSlotKey(slug: string, slot: number): string {
  return `fourweird:save:${slug}:${slot}`;
}

/**
 * Read whether autosave is enabled for a game.
 *
 * Pass `explicit` to override storage (e.g. a controlled toggle prop);
 * otherwise reads localStorage and falls back to AUTOSAVE_ENABLED_DEFAULT
 * when unset, unparseable, or when running on the server / storage throws.
 */
export function isAutosaveEnabled(
  slug: string,
  explicit?: boolean,
): boolean {
  if (typeof explicit === "boolean") return explicit;
  if (typeof window === "undefined") return AUTOSAVE_ENABLED_DEFAULT;
  try {
    const raw = window.localStorage.getItem(autosaveEnabledKey(slug));
    if (raw === null) return AUTOSAVE_ENABLED_DEFAULT;
    if (raw === "1" || raw === "true") return true;
    if (raw === "0" || raw === "false") return false;
    return AUTOSAVE_ENABLED_DEFAULT;
  } catch {
    return AUTOSAVE_ENABLED_DEFAULT;
  }
}

/**
 * Persist the per-game autosave toggle. No-op on the server; swallows
 * storage errors (private mode / quota) so saving the toggle never throws
 * into the play UI.
 */
export function setAutosaveEnabled(slug: string, enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      autosaveEnabledKey(slug),
      enabled ? "1" : "0",
    );
  } catch {
    // Fail-open: a toggle write failing must not break gameplay.
  }
}
