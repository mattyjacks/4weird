"use client";

import dynamic from "next/dynamic";

/**
 * Deferred UsaFireworks (USA-theme canvas fireworks + bombing run).
 *
 * Split out of the root-layout initial bundle via next/dynamic (client-only):
 * this is the heaviest theme overlay (~27KB source: capped particle systems,
 * rAF loop, emoji actors) and it renders nothing until the theme-usa palette
 * is active. The effect gate re-checks the theme on mount and bails on
 * prefers-reduced-motion, so deferred mounting preserves all behavior while
 * keeping the canvas runtime out of every non-USA page load.
 */
export const UsaFireworksLazy = dynamic(
  () =>
    import("@/components/site/themes/usa-fireworks").then(
      (mod) => mod.UsaFireworks,
    ),
  { ssr: false },
);
