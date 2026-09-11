"use client";

import { useEffect } from "react";
import { applyA11y, loadA11y } from "@/lib/a11y";

/**
 * Applies stored accessibility classes to <html> on first paint and keeps
 * them applied across client-side navigations (layout remounts don't reset
 * documentElement classes, but a fresh load would flash unstyled defaults).
 */
export function A11yProvider() {
  useEffect(() => {
    applyA11y(loadA11y());
  }, []);
  return null;
}
