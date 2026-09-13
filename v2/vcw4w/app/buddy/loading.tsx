// Segment streaming fallback for /buddy (Gaming Buddy live session).
// The voice/screen session is a client island; this shell streams first.
export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-16 text-white">
      <section aria-busy="true" aria-label="Loading Gaming Buddy">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">Gaming Buddy</p>
        <h1 className="mt-2 text-4xl font-black">Waking your buddy…</h1>
        <div className="mt-8 animate-pulse space-y-3">
          <div className="h-48 rounded-2xl border border-white/10 bg-white/[.04]" />
          <div className="h-14 rounded-full border border-white/10 bg-white/[.04]" />
        </div>
        <p role="status" className="mt-6 text-sm text-slate-400">
          Loading Gaming Buddy…
        </p>
      </section>
    </main>
  );
}
