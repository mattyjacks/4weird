"use client";

/**
 * Desktop link status card for /terminal (DS-OCT-04, web lane).
 *
 * Client-only data: fetches GET /api/terminal/session inside an effect
 * (SSR-safe, fail-open offline). Refreshes when the terminal page
 * dispatches `terminal-desktop-changed` after pair/link/unlink.
 */

import { useCallback, useEffect, useState } from "react";

export const DESKTOP_CHANGED_EVENT = "terminal-desktop-changed";

interface SessionState {
  linked: boolean;
  target?: string;
  kind?: string;
  checked: boolean;
  offline: boolean;
}

const INITIAL: SessionState = { linked: false, checked: false, offline: false };

export default function DesktopStatus() {
  const [state, setState] = useState<SessionState>(INITIAL);

  const refresh = useCallback(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/terminal/session", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setState({ linked: false, checked: true, offline: false });
          return;
        }
        const body = (await res.json()) as { linked?: boolean; target?: string; kind?: string };
        if (!cancelled) {
          setState({
            linked: body.linked === true,
            target: typeof body.target === "string" ? body.target : undefined,
            kind: typeof body.kind === "string" ? body.kind : undefined,
            checked: true,
            offline: false,
          });
        }
      } catch {
        // Fail-open offline: keep local terminal usable, show cached state.
        if (!cancelled) setState((prev) => ({ ...prev, checked: true, offline: true }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cancel = refresh();
    const onChange = () => refresh();
    window.addEventListener(DESKTOP_CHANGED_EVENT, onChange);
    return () => {
      cancel();
      window.removeEventListener(DESKTOP_CHANGED_EVENT, onChange);
    };
  }, [refresh]);

  const text = !state.checked
    ? "Desktop link: checking…"
    : state.linked
      ? `Desktop link: connected (${state.target ?? state.kind ?? "desktop"})`
      : state.offline
        ? "Desktop link: offline (local commands still work)"
        : "Desktop link: not paired — type: desktop pair <code>";

  return (
    <p
      aria-live="polite"
      style={{
        fontFamily: "sans-serif",
        fontSize: "0.9rem",
        background: state.linked ? "#0f2a14" : "#1a1a1a",
        color: state.linked ? "#b8f5c6" : "#d7ffd7",
        borderRadius: 8,
        padding: "0.5rem 0.75rem",
        margin: "0 0 0.75rem",
      }}
    >
      {text}
    </p>
  );
}
