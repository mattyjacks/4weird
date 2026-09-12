import Link from "next/link";

/**
 * Native demo section (replaces the framed demo/index.html).
 * Same safe-preview content, rewritten natively. The real capture
 * screenshots are plain <img> assets — no iframe involved.
 */
export function VcwDemo() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <p className="inline-block rounded-full border border-emerald-300/40 px-3 py-1 text-xs font-black tracking-widest text-emerald-300">
          SAFE DEMO · NO ACTIONS RUN
        </p>
        <p className="mt-3 text-sm text-slate-300">
          This is a visual preview. Targets are not loaded, no agents run, and nothing is sent anywhere.
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-black/40 p-6">
        <p className="text-xs font-bold tracking-widest text-cyan-300">PLAYTEST WORKSPACE</p>
        <h2 className="mt-2 text-2xl font-black text-white">
          Choose a target.<br />Tell the agent what matters.
        </h2>
        <div className="mt-4 space-y-3">
          <label className="block text-sm text-slate-400">
            Target
            <input
              readOnly
              value="orbitaldrift — playtest run"
              aria-label="Preview target"
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/[.04] px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-slate-400">
            Test focus
            <input
              readOnly
              value="Menu flow, controls & visual issues"
              aria-label="Preview test focus"
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/[.04] px-3 py-2 text-white"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled
            title="Disabled in the demo"
            className="cursor-not-allowed rounded-full border border-white/15 px-5 py-2 text-sm font-bold text-slate-500"
          >
            Load preview
          </button>
          <button
            type="button"
            disabled
            title="Disabled in the demo"
            className="cursor-not-allowed rounded-full bg-cyan-300/30 px-5 py-2 text-sm font-black text-slate-900"
          >
            Run playtest →
          </button>
        </div>
      </section>

      <section aria-labelledby="captures-title">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-bold tracking-widest text-cyan-300">REAL LOCAL CAPTURES</p>
            <h2 id="captures-title" className="text-xl font-black text-white">
              VibeCodeWorker running Orbital Drift
            </h2>
          </div>
          <span className="text-xs text-slate-500">Captured from the desktop app</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <figure className="overflow-hidden rounded-xl border border-white/10 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/vibecodeworker/demo/images/workspace-loaded.png"
              alt="VibeCodeWorker with the Orbital Drift target loaded and a playtest goal entered"
              loading="lazy"
              className="w-full"
            />
            <figcaption className="p-3 text-sm text-slate-400">
              <b className="block text-white">Target loaded</b>A real local game, a test focus, and the evidence stream ready.
            </figcaption>
          </figure>
          <figure className="overflow-hidden rounded-xl border border-white/10 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/vibecodeworker/demo/images/playtest-running.png"
              alt="Orbital Drift launched inside a running VibeCodeWorker workspace"
              loading="lazy"
              className="w-full"
            />
            <figcaption className="p-3 text-sm text-slate-400">
              <b className="block text-white">Game running</b>The live target after its launch action inside VibeCodeWorker.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.02] p-5">
        <p className="text-xs font-bold tracking-widest text-cyan-300">
          EVIDENCE STREAM <span className="text-slate-500">· STATIC EXAMPLE</span>
        </p>
        <div className="mt-2 space-y-1 font-mono text-xs text-slate-400">
          <p><time className="text-slate-500">00:00:00</time> Workspace ready. Choose a target to begin.</p>
          <p>
            <time className="text-slate-500">00:00:00</time> This page is a visual demo; no operation is available
            here. Try the live surfaces: <Link href="/vibecodeworker/run" className="text-cyan-300 hover:underline">Cloud Run</Link>
            {" · "}
            <Link href="/vibecodeworker/full" className="text-cyan-300 hover:underline">Full Web</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
