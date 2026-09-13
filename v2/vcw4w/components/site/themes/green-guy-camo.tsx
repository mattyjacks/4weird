"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildCamoSVG,
  randomSeed,
  type CamoMode,
} from "@/lib/camo/green-guy-camo";

function readMode(): CamoMode {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

function isGreenGuy(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("theme-green-guy");
}

/**
 * Full-viewport randomized Green Guy camo. One giant viewport-sized inline SVG
 * per page load (fresh crypto seed each mount) — covers the whole display with
 * `slice`, never repeats, so there is no tile grid by construction.
 * Fixed + pointer-events-none + aria-hidden: behind content, never over text.
 */
export function GreenGuyCamo() {
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<CamoMode>("dark");
  const [viewport, setViewport] = useState({ w: 1920, h: 1080 });

  useEffect(() => {
    const sync = () => {
      setActive(isGreenGuy());
      setMode(readMode());
    };
    sync();
    setViewport({
      w: Math.min(window.innerWidth || 1920, 2560),
      h: Math.min(window.innerHeight || 1080, 1440),
    });
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // Fresh seed once per mount = randomized every page load, stable for session.
  const seed = useMemo(() => randomSeed(), []);
  const lightSvg = useMemo(
    () => buildCamoSVG({ width: viewport.w, height: viewport.h, seed, mode: "light" }),
    [viewport.w, viewport.h, seed],
  );
  const darkSvg = useMemo(
    () => buildCamoSVG({ width: viewport.w, height: viewport.h, seed, mode: "dark" }),
    [viewport.w, viewport.h, seed],
  );

  if (!active) return null;
  const svg = mode === "light" ? lightSvg : darkSvg;
  return (
    <div
      id="green-guy-camo-layer"
      aria-hidden="true"
      className="is-ready"
      // Static per-load artwork: safe to inject once.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
