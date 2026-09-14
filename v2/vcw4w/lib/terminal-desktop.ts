/**
 * Terminal → Desktop helpers (A3, append-only lane).
 *
 * Pure, SSR-safe string builders only — no browser APIs at module top
 * (no `window`, `document`, `navigator`, `localStorage`). Safe to import
 * from both server and client components.
 */

export const TERMINAL_DESKTOP_ROUTE = "/desktop";
export const TERMINAL_DOCS_ROUTE = "/docs/terminal-desktop";

export type TerminalDesktopKind = "virtual" | "local" | "opencode";

/** Deep-link from /terminal into /desktop. Pure string building. */
export function desktopDeepLink(kind: TerminalDesktopKind | string): string {
  const normalized = String(kind ?? "").trim().toLowerCase();
  const safe =
    normalized === "virtual" || normalized === "local" || normalized === "opencode"
      ? normalized
      : "virtual";
  return `${TERMINAL_DESKTOP_ROUTE}?from=terminal&kind=${encodeURIComponent(safe)}`;
}

/** Printable guidance for the `desktop` terminal command. */
export function desktopTerminalGuide(): string {
  return [
    "Desktop from /terminal (guidance only — nothing is launched from here):",
    `  virtual desktop → ${desktopDeepLink("virtual")} (RunPod pods in the browser)`,
    `  local desktop app → ${desktopDeepLink("local")} (native app under v2/desktop/code)`,
    "What /terminal CAN do: print this guidance + link. What it CANNOT do: no server exec, no fetch, no pod control.",
    `Full guide: ${TERMINAL_DOCS_ROUTE}`,
  ].join("\n");
}

/** Printable guidance for the `opencode` terminal command. */
export function opencodeDesktopGuide(): string {
  return [
    "OpenCode → desktop bridge (guidance only — nothing is launched from here):",
    "  1) Open the desktop surface first: /desktop?from=terminal&kind=opencode",
    "  2) In the local desktop app (v2/desktop/code), sign in and attach your workspace.",
    "  3) Run OpenCode there — /terminal never executes it for you (allow-list only, no server exec).",
    `Deep-link: ${desktopDeepLink("opencode")}`,
    `Full guide: ${TERMINAL_DOCS_ROUTE}`,
  ].join("\n");
}
