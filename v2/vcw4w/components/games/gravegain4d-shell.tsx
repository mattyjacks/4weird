"use client";

import { GameRuntimeFrame } from "@/components/games/game-runtime-frame";

/**
 * GraveGain4DShell — thin wrapper around the shared GameRuntimeFrame.
 * Reuses the frame's Focus / Pause / Resume / Fullscreen / Pop-out toolbar
 * contract (no fork); adds only the trippy 4D hint copy around it.
 */
export function GraveGain4DShell() {
  return (
    <div>
      <p className="mb-3 rounded-2xl border border-fuchsia-300/30 bg-fuchsia-950/40 px-4 py-2 text-xs text-fuchsia-200">
        🌀 GraveGain4DA drifts through four dimensions — drag to rotate the
        hypercube, and use Focus + Fullscreen for the full trippy descent.
      </p>
      <GameRuntimeFrame
        slug="gravegain4dA"
        title="GraveGain4DA"
        src="/games/gravegain4dA/index.html"
      />
    </div>
  );
}
