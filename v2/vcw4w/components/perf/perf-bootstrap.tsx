"use client";

import { useEffect } from "react";
import { getPerfTier, onIdle, warmPerfWorkers } from "@/lib/perf-client";

/**
 * PerfBootstrap — one tiny client component mounted in the root layout.
 * Runs once per page load, entirely idle-deferred so it never blocks paint:
 * - profiles hardware (cores / WebGL GPU / save-data / reduced motion),
 * - stamps <html> with data-gpu + data-low-power for CSS to adapt,
 * - warms the /workers/* pool so first real use never pays construction,
 * - pauses CSS motion + video decode pressure on low-power devices.
 */
export function PerfBootstrap() {
  useEffect(() => {
    const cancel = onIdle(
      () => {
        try {
          const tier = getPerfTier();
          const root = document.documentElement;
          root.dataset.gpu = tier.gpu;
          root.dataset.cores = String(tier.cores);
          if (tier.lowPower) root.dataset.lowPower = "1";
          // Low-power: kill ambient animation loops that burn GPU/CPU.
          if (tier.lowPower) {
            root.classList.add("perf-low-power");
          }
          warmPerfWorkers();
        } catch {
          /* perf hints are best-effort */
        }
      },
      1500,
    );
    return cancel;
  }, []);
  return null;
}
