"use client";

import { GameRuntimeFrame } from "@/components/games/game-runtime-frame";

const SLUG = "fridgesimulator";
const TITLE = "Fridge Simulator";
// Original HTML runtime bundle (read-only, owned by the bundle sync — this
// shell never reimplements game logic, it only frames the runtime).
const SRC = "/games/fridgesimulator/index.html";

/**
 * Play-extras shell for Fridge Simulator: the untouched runtime iframe plus
 * the save panel explainer, food-catalog tour, and mobile hints around it.
 */
export function PlayExtras() {
  return (
    <div>
      {/* Keep the game inside the shared viewport budget on short screens. */}
      <div id="game-frame" className="play-frame-height min-h-0 w-full">
        <GameRuntimeFrame slug={SLUG} title={TITLE} src={SRC} />
      </div>

      <section
        aria-label="Save and resume"
        className="mt-4 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6"
      >
        <h2 className="text-lg font-bold sm:text-xl">Save &amp; resume</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-300">
          <li>
            Your fridge progress autosaves while you play — come back and the runtime picks up
            where you left off.
          </li>
          <li>
            <b className="text-white">Signed in?</b> Your save syncs to the cloud, so the same
            fridge follows you across devices.
          </li>
          <li>
            <b className="text-white">Playing as a guest?</b> Progress stays on this device only
            (local saves) — sign in to back it up to the cloud.
          </li>
          <li>
            If cloud saves are ever unreachable, the game keeps running on local progress and says
            so — nothing you stocked is lost.
          </li>
        </ul>
      </section>

      <section
        aria-label="Food catalog"
        className="mt-4 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6"
      >
        <h2 className="text-lg font-bold sm:text-xl">Food catalog</h2>
        <p className="mt-2 text-sm text-slate-300">
          The heart of the game is the in-game food catalog: browse what&apos;s stockable, watch
          nutrition values, and balance meals so every family stays fed and healthy. Stocking the
          right mix — not just the most food — is what keeps everyone alive.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Tip: open the catalog early in a run, plan around nutrition gaps first, then fill the
          remaining shelf space with staples.
        </p>
      </section>

      <section
        aria-label="Mobile hints"
        className="mt-4 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6"
      >
        <h2 className="text-lg font-bold sm:text-xl">Mobile hints</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-300">
          <li>Touch controls appear automatically on phones and tablets — no setup needed.</li>
          <li>Rotate to landscape for the roomiest view of the fridge shelves.</li>
          <li>
            Use the frame&apos;s <b className="text-white">Fullscreen</b> button for the
            biggest play area.
          </li>
          <li>
            On a small screen, the <b className="text-white">Pop out</b> control opens the runtime
            in its own tab.
          </li>
        </ul>
      </section>
    </div>
  );
}
