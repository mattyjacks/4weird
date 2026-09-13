"use client";

import dynamic from "next/dynamic";

/**
 * Deferred EyeDwell (dwell-to-click overlay).
 *
 * Split out of the root-layout initial bundle via next/dynamic (client-only):
 * the overlay renders nothing until the visitor enables dwell mode, so most
 * page loads never need this code. Settings are re-read from localStorage on
 * mount and the A11Y_EVENT listener re-syncs, so deferred mounting is safe.
 */
export const EyeDwellLazy = dynamic(
  () => import("@/components/a11y/eye-dwell").then((mod) => mod.EyeDwell),
  { ssr: false },
);
