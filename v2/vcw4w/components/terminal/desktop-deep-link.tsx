"use client";

/**
 * Desktop deep-link nav for the /terminal web view (DS-OPENCODE-02, web lane).
 *
 * Client component rendering deep-link nav from the /terminal web view into
 * the desktop app: a custom-protocol link with a web fallback, fail-open when
 * the desktop app is absent, no secrets in markup.
 *
 * SSR-safe: all browser APIs (`window`, `document`, timers) live inside the
 * click handler only — nothing at module scope or during render.
 * Fail-open: any error (or an absent desktop handler) leaves the reviewer on
 * the graceful web fallback; the desktop app is never required.
 *
 * Scope note: page/layout shells belong to DS-DTOP-03 and attach logic to
 * DS-DTOP-04. This file renders nav only; the mount point is requested via a
 * QUEUE wiring line (no existing web files modified here).
 */

import { useCallback, useState } from "react";

export interface DesktopDeepLinkProps {
  /** Custom-protocol scheme the desktop app registers (overridable by desktop lane). */
  scheme?: string;
  /** Deep-link path inside the desktop app. */
  path?: string;
  /** Web fallback when the desktop app is absent. */
  fallbackHref?: string;
  /** Visible label for the open-in-desktop action. */
  label?: string;
}

const DEFAULT_SCHEME = "vcw4w";
const DEFAULT_PATH = "terminal";
const DEFAULT_FALLBACK_HREF = "/terminal";
const FALLBACK_DELAY_MS = 1200;

function buildDeepLink(scheme: string, path: string): string {
  const cleanScheme = scheme.replace(/[^a-z0-9+.-]/gi, "").toLowerCase() || DEFAULT_SCHEME;
  const cleanPath = path.replace(/^\/+/, "");
  return `${cleanScheme}://${cleanPath}`;
}

export default function DesktopDeepLink({
  scheme = DEFAULT_SCHEME,
  path = DEFAULT_PATH,
  fallbackHref = DEFAULT_FALLBACK_HREF,
  label = "Open in desktop app",
}: DesktopDeepLinkProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const deepLink = buildDeepLink(scheme, path);

  const handleOpen = useCallback(() => {
    // Fail-open: any failure below falls through to the web fallback link.
    try {
      // Hidden iframe attempt avoids navigating the web view away when no
      // desktop handler is registered.
      const frame = document.createElement("iframe");
      frame.setAttribute("aria-hidden", "true");
      frame.style.display = "none";
      frame.src = deepLink;
      document.body.appendChild(frame);
      window.setTimeout(() => {
        try {
          frame.remove();
          // If the page is still visible, the desktop app likely did not
          // take over — point the reviewer at the graceful web fallback.
          if (document.visibilityState === "visible") {
            setNotice("Desktop app not detected — staying in the web terminal.");
          }
        } catch {
          // Fail-open: stale frame cleanup must never break the web view.
        }
      }, FALLBACK_DELAY_MS);
    } catch {
      setNotice("Desktop app unavailable — use the web terminal below.");
    }
  }, [deepLink]);

  return (
    <nav aria-label="Desktop app">
      <a
        href={deepLink}
        onClick={(event) => {
          event.preventDefault();
          handleOpen();
        }}
        style={{
          fontFamily: "sans-serif",
          fontSize: "0.9rem",
          display: "inline-block",
          borderRadius: 8,
          padding: "0.5rem 0.75rem",
          background: "#14202e",
          color: "#cfe8ff",
          textDecoration: "none",
        }}
      >
        {label}
      </a>{" "}
      <a
        href={fallbackHref}
        style={{
          fontFamily: "sans-serif",
          fontSize: "0.9rem",
          display: "inline-block",
          borderRadius: 8,
          padding: "0.5rem 0.75rem",
          background: "#1a1a1a",
          color: "#d7ffd7",
          textDecoration: "none",
        }}
      >
        Continue in web terminal
      </a>
      {notice !== null ? (
        <p aria-live="polite" style={{ fontFamily: "sans-serif", fontSize: "0.85rem", color: "#d7ffd7" }}>
          {notice} <a href={fallbackHref}>Stay here</a>.
        </p>
      ) : null}
    </nav>
  );
}
