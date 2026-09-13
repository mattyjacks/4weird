// Segment streaming fallback for /timer/** (ghost timer, pro tracker).
// The drift-free clock is a client island; this static shell streams first.
export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section
        className="mx-auto max-w-4xl px-5 py-10 sm:py-16"
        aria-busy="true"
        aria-label="Loading timer"
      >
        <p className="text-sm font-bold uppercase tracking-widest text-cyan-300">4weird timer</p>
        <h1 className="mt-2 text-4xl font-black">Loading clock…</h1>
        <div className="mt-8 animate-pulse space-y-3">
          <div className="h-40 rounded-2xl border border-white/10 bg-white/[.04]" />
          <div className="h-24 rounded-2xl border border-white/10 bg-white/[.04]" />
        </div>
        <p role="status" className="mt-6 text-sm text-slate-400">
          Loading timer…
        </p>
      </section>
    </main>
  );
}
