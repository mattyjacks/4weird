// Segment streaming fallback for /tools/** (SEO, image, writing, counter).
// Tool islands are client-side and fail-open; this shell streams first.
export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-10 sm:py-16 text-white">
      <section aria-busy="true" aria-label="Loading tool">
        <p className="text-sm font-bold uppercase tracking-widest text-cyan-300">4weird tools</p>
        <h1 className="mt-2 text-4xl font-black">Loading tool…</h1>
        <div className="mt-8 animate-pulse space-y-3">
          <div className="h-24 rounded-2xl border border-white/10 bg-white/[.04]" />
          <div className="h-48 rounded-2xl border border-white/10 bg-white/[.04]" />
        </div>
        <p role="status" className="mt-6 text-sm text-slate-400">
          Loading tool…
        </p>
      </section>
    </main>
  );
}
