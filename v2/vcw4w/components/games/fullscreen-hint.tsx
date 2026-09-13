"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "fw-fullscreen-hint-dismissed";

export function FullscreenHint() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      dismissed = false;
    }
    if (!dismissed) setVisible(true);
    return () => {
      try {
        document.body.style.overflow = "auto";
      } catch {
        /* noop */
      }
    };
  }, []);
  if (!visible) return null;
  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* noop */
    }
    try {
      document.body.style.overflow = "auto";
    } catch {
      /* noop */
    }
    setVisible(false);
  };
  return (
    <p className="mt-2 text-xs text-slate-500">
      Press F for fullscreen · Esc to exit · double-click game for fullscreen{" "}
      <button type="button" onClick={dismiss} className="ml-2 underline hover:no-underline">
        Dismiss
      </button>
    </p>
  );
}
