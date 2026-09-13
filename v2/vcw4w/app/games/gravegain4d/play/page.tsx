import type { Metadata } from "next";
import { GraveGain4DShell } from "@/components/games/gravegain4d-shell";

export const metadata: Metadata = {
  title: "Play GraveGain4D | 4weird Games",
  description:
    "Play GraveGain4D: a trippy 4D grave-diving arcade run through shifting hypercube crypts.",
  robots: { index: false, follow: false },
};

export default function GraveGain4DPlayPage() {
  return (
    <div className="bg-black text-white" data-theme-lock="dark">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-5">
        <nav
          aria-label="Game breadcrumb"
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          <a
            href="/games"
            className="font-semibold text-cyan-300 hover:underline"
          >
            ← All games
          </a>
          <span aria-hidden="true" className="text-white/30">
            /
          </span>
          <span className="font-semibold text-white">GraveGain4D</span>
        </nav>
        <h1 className="mt-3 text-2xl font-black sm:text-3xl">
          🪦 Play GraveGain4D
        </h1>
        <div className="mt-4">
          <GraveGain4DShell />
        </div>
      </div>
    </div>
  );
}
