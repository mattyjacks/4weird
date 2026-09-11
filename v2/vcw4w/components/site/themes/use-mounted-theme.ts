"use client";

import { useEffect, useState } from "react";

/** Render-gate for theme hooks (next-themes + site theme hydrate client-side). */
export function useMountedTheme(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
