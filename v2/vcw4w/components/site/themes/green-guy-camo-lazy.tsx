"use client";

import dynamic from "next/dynamic";

/**
 * Deferred GreenGuyCamo (full-viewport camo SVG overlay).
 *
 * Split out of the root-layout initial bundle via next/dynamic (client-only):
 * the layer renders nothing until the theme-green-guy palette is active, and
 * it pulls in lib/camo/green-guy-camo (SVG builder) with it. The component
 * observes documentElement class mutations on mount, so deferred mounting
 * still activates correctly when the theme is already selected.
 */
export const GreenGuyCamoLazy = dynamic(
  () =>
    import("@/components/site/themes/green-guy-camo").then(
      (mod) => mod.GreenGuyCamo,
    ),
  { ssr: false },
);
