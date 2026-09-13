import Link from "next/link";
import { getGameA11y } from "@/lib/game-a11y";

/**
 * Per-game accessibility optimization summary shown above the play shell.
 * Featured games get tailored controls + assist notes; every other game
 * gets the generic shell-assist line so the panel never lies.
 */
export function GameA11yPanel({ slug }: { slug: string }) {
  const meta = getGameA11y(slug);
  return (
    <section
      aria-label={`Accessibility options for this game`}
      className="mt-4 rounded-2xl border border-white/15 bg-slate-950 p-4 text-sm sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-black text-white">♿ Play your way</h2>
        <span className="flex flex-wrap gap-1 text-[11px]">
          {meta.keyboardOnly && (
            <span className="rounded-full border border-emerald-300/50 px-2 py-0.5 font-bold text-emerald-200">⌨️ keyboard-only OK</span>
          )}
          {!meta.colorDependent && (
            <span className="rounded-full border border-cyan-300/50 px-2 py-0.5 font-bold text-cyan-200">🎨 color-independent</span>
          )}
          {meta.colorDependent && (
            <span className="rounded-full border border-amber-300/50 px-2 py-0.5 font-bold text-amber-200">🎨 color matters; use a filter</span>
          )}
          {meta.photosensitive && (
            <span className="rounded-full border border-fuchsia-300/50 px-2 py-0.5 font-bold text-fuchsia-200">⚠️ flashes; reduce motion</span>
          )}
          {meta.readingHeavy && (
            <span className="rounded-full border border-violet-300/50 px-2 py-0.5 font-bold text-violet-200">📖 reading-heavy; dyslexia font</span>
          )}
        </span>
        <Link href="/accessibility" className="ml-auto rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10">
          All settings →
        </Link>
      </div>
      <dl className="mt-3 grid gap-2 text-slate-300 sm:grid-cols-2">
        <div className="rounded-xl bg-white/[.04] p-3">
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Controls</dt>
          <dd className="mt-1 text-white">{meta.controls}</dd>
        </div>
        <div className="rounded-xl bg-white/[.04] p-3">
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Assists for this game</dt>
          <dd className="mt-1">{meta.assist}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-slate-500">
        Below the game you&apos;ll find the face + head controller (nose aims, wink clicks), dwell-to-click for eye
        trackers, and single-switch scanning; all applied inside the game frame, not just the site.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Fullscreen respects reduced motion: it appears instantly with no animation.
      </p>
    </section>
  );
}
