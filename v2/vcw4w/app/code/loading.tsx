// Segment streaming fallback for /code/[id] (submission review).
// The private submission streams in Suspense below this shell.
export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 text-white">
      <section aria-busy="true" aria-label="Loading submission">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Code review</p>
        <h1 className="mt-1 text-2xl font-black">Loading submission…</h1>
        <div className="mt-5 animate-pulse space-y-3">
          <div className="h-24 rounded-2xl border border-white/10 bg-white/[.04]" />
          <div className="h-36 rounded-2xl border border-white/10 bg-white/[.04]" />
        </div>
        <p role="status" className="mt-4 text-sm text-slate-400">
          Verdict, findings, and audit stream in privately.
        </p>
      </section>
    </main>
  );
}
