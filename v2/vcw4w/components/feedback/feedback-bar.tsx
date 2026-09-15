"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FeedbackButton } from "@/components/feedback/feedback-button";

/**
 * Sticky secondary FeedbackBar header (layout lane only).
 *
 * Mobile top of screen ALWAYS (except in-game) shows one row:
 *   Menu 2 | Give Feedback | Menu 1 | X
 * Menu 2 and Menu 1 stay visible at ALL widths (including desktop): both
 * lanes must be one tap away from the top bar everywhere. The dismissed
 * slim fallback keeps compact Menu 2 / Menu 1 buttons for the same reason.
 * - Menu 2 / Menu 1 buttons are the SINGLE entry points for their lanes:
 *   they dispatch "fw:open-menu2" / "fw:open-menu1" to open the existing
 *   MenuSidebar drawer / SiteHeader sheet — no duplicate nav trees here,
 *   and no extra menu buttons (the sidebar reveal pill stays removed).
 * - Corner contract (mirrors app/theme-css/blue-boy.css single-corner
 *   radii, applied inline so every theme matches): Menu 2 (left) rounds
 *   ONLY bottom-right (0 0 12px 0); Menu 1 rounds ONLY bottom-left
 *   (0 0 0 12px). Inline style wins over the .rounded-lg blue-boy
 *   override, so the values stay in sync by construction.
 * - Give Feedback reuses <FeedbackButton /> as-is (dialog + API untouched).
 * - X dismisses gracefully to a slim inline fallback; dismissal persists
 *   in localStorage (fail-open when storage is unavailable).
 *
 * Sticky vs anchored: chosen client-side via usePathname().startsWith("/games/")
 * - in-game (/games/<slug>, /games/<slug>/play, …): relative/static at page
 *   top, scrolls away with the page (never covers gameplay).
 * - everywhere else: sticky top-0 secondary header.
 */
export const FEEDBACK_BAR_DISMISS_KEY = "fw-feedback-bar-dismissed";
export const OPEN_MENU1_EVENT = "fw:open-menu1";
export const OPEN_MENU2_EVENT = "fw:open-menu2";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(FEEDBACK_BAR_DISMISS_KEY) === "1";
  } catch {
    // Private mode / blocked storage: fail-open (bar stays visible).
    return false;
  }
}

const TOUCH = "min-h-[44px] min-w-[44px]";

// Single-corner radii (TL TR BR BL): Menu 2 (left lane) rounds ONLY
// bottom-right; Menu 1 (right lane) mirrors with ONLY bottom-left.
// Values match the blue-boy.css "MENU 1 / MENU 2" overrides; inline
// style beats the .rounded-lg override so all themes agree.
const MENU2_RADIUS = "0 0 12px 0";
const MENU1_RADIUS = "0 0 0 12px";

export function FeedbackBar() {
  const pathname = usePathname();
  // Fail-open initial state (bar visible) so SSR/first paint matches;
  // the persisted dismissal syncs post-hydration.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage restore must run post-hydration to avoid an SSR mismatch.
    setDismissed(readDismissed());
  }, []);

  const openMenu1 = useCallback(() => {
    window.dispatchEvent(new CustomEvent(OPEN_MENU1_EVENT));
  }, []);
  const openMenu2 = useCallback(() => {
    window.dispatchEvent(new CustomEvent(OPEN_MENU2_EVENT));
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(FEEDBACK_BAR_DISMISS_KEY, "1");
    } catch {
      /* fail-open: in-memory dismissal still applies for this visit */
    }
  }, []);

  const restore = useCallback(() => {
    setDismissed(false);
    try {
      localStorage.setItem(FEEDBACK_BAR_DISMISS_KEY, "0");
    } catch {
      /* fail-open: in-memory restore still applies for this visit */
    }
  }, []);

  // In-game = any /games/ game route (detail + /play + sub-routes).
  // The /games index itself (no trailing slash) stays sticky.
  const inGame = pathname?.startsWith("/games/") ?? false;

  if (dismissed) {
    // Slim inline fallback at page top: menu lanes stay one tap away
    // (compact icon+number buttons), Give Feedback stays reachable and
    // a restore control brings the full bar back. Always non-sticky.
    return (
      <div
        role="region"
        aria-label="Feedback bar (dismissed)"
        className="relative z-30 border-b border-border bg-background/85 backdrop-blur dark:border-white/10 dark:bg-black/85"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="mx-auto flex min-h-[44px] max-w-6xl items-center justify-center gap-2 px-4 py-1">
          <button
            type="button"
            onClick={openMenu2}
            aria-label="Open menu 2"
            title="Open menu 2"
            style={{ borderRadius: MENU2_RADIUS }}
            className={`${TOUCH} inline-flex shrink-0 items-center justify-center rounded-lg border border-border px-2.5 py-2 text-sm font-bold text-foreground transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 motion-reduce:transition-none`}
          >
            <span aria-hidden="true">☰</span>
            <span aria-hidden="true" className="ml-0.5 text-[10px] font-black">2</span>
          </button>
          <FeedbackButton className={`${TOUCH} motion-reduce:transition-none`} />
          <button
            type="button"
            onClick={openMenu1}
            aria-label="Open menu 1"
            title="Open menu 1"
            style={{ borderRadius: MENU1_RADIUS }}
            className={`${TOUCH} inline-flex shrink-0 items-center justify-center rounded-lg border border-border px-2.5 py-2 text-sm font-bold text-foreground transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 motion-reduce:transition-none`}
          >
            <span aria-hidden="true">☰</span>
            <span aria-hidden="true" className="ml-0.5 text-[10px] font-black">1</span>
          </button>
          <button
            type="button"
            onClick={restore}
            aria-label="Show feedback bar"
            title="Show the feedback bar"
            className={`${TOUCH} inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-sm font-bold text-foreground transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 motion-reduce:transition-none`}
          >
            <span aria-hidden="true">▲</span>
            <span className="sr-only sm:not-sr-only sm:ml-1.5">Show bar</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Feedback bar"
      className={
        inGame
          ? "relative z-30 border-b border-border bg-background/85 backdrop-blur motion-reduce:transition-none dark:border-white/10 dark:bg-black/85"
          : "sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur motion-reduce:transition-none dark:border-white/10 dark:bg-black/85"
      }
      // Safe-area: env() with a 0px fallback — unsupported browsers drop
      // the declaration and keep the py classes (fail-open).
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {/* Clearance for the header's fixed mobile Menu 1 toggle
          (max-lg:fixed right-3 top-3 z-50): the bar sits at z-40 so the
          toggle stays on top, and this right padding keeps the bar's own
          Menu 1 / X targets from sliding underneath it. Desktop (lg+)
          removes the clearance — the toggle is in-flow there. */}
      <div className="mx-auto flex max-w-6xl items-center gap-1.5 py-1.5 pl-3 pr-[136px] sm:gap-2 sm:pl-4 sm:pr-[144px] lg:pr-4">
        <button
          type="button"
          onClick={openMenu2}
          aria-label="Open menu 2"
          title="Open menu 2"
          style={{ borderRadius: MENU2_RADIUS }}
          className={`${TOUCH} inline-flex shrink-0 items-center justify-center gap-1 border border-border px-2.5 py-2 text-sm font-bold text-foreground transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 motion-reduce:transition-none`}
        >
          <span aria-hidden="true">☰</span>
          menu&nbsp;2
        </button>
        <div className="flex min-w-0 flex-1 justify-center">
          <FeedbackButton
            className={`${TOUCH} w-full min-w-0 justify-center truncate motion-reduce:transition-none sm:w-auto`}
          />
        </div>
        {/* Menu 1 opens the header sheet at every width — desktop included:
            both menu lanes stay one tap away in the top bar. On desktop the
            sheet expands in-flow below the header (no scroll lock); the same
            button toggles it back closed, and Escape / picking a link works
            everywhere. */}
        <button
          type="button"
          onClick={openMenu1}
          aria-label="Open menu 1"
          title="Open menu 1"
          style={{ borderRadius: MENU1_RADIUS }}
          className={`${TOUCH} inline-flex shrink-0 items-center justify-center gap-1 border border-border px-2.5 py-2 text-sm font-bold text-foreground transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 motion-reduce:transition-none`}
        >
          <span aria-hidden="true">☰</span>
          menu&nbsp;1
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss feedback bar"
          title="Dismiss"
          className={`${TOUCH} inline-flex shrink-0 items-center justify-center rounded-lg border border-border px-3 py-2 text-sm font-bold text-muted-foreground transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 motion-reduce:transition-none`}
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
    </div>
  );
}

export default FeedbackBar;
