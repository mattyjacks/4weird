// Segment streaming fallback for /my/** (privacy rights, compute usage).
// Per-user ledger reads stream in Suspense and are never cached.
export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section
        className="mx-auto max-w-6xl px-5 py-14 sm:py-20"
        aria-busy="true"
        aria-label="Loading your data"
      >
        <div className="animate-pulse space-y-3">
          <div className="h-8 w-64 rounded bg-white/10" />
          <div className="h-24 rounded-2xl border border-white/10 bg-white/[.04]" />
          <div className="h-24 rounded-2xl border border-white/10 bg-white/[.04]" />
        </div>
        <p role="status" className="mt-6 text-sm text-slate-400">
          Loading your data privately after sign-in…
        </p>
      </section>
    </main>
  );
}
