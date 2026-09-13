"use client";

import dynamic from "next/dynamic";

/**
 * Deferred SwitchScan (single-switch auto-scan overlay).
 *
 * Split out of the root-layout initial bundle via next/dynamic (client-only):
 * the scanner only activates when the visitor enables switch-scan mode, so
 * most page loads never need this code. Settings are re-read from
 * localStorage on mount and the A11Y_EVENT listener re-syncs, so deferred
 * mounting is safe.
 */
export const SwitchScanLazy = dynamic(
  () => import("@/components/a11y/switch-scan").then((mod) => mod.SwitchScan),
  { ssr: false },
);
