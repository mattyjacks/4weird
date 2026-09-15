// Segment streaming fallback: wraps page.js + nested layouts in Suspense so
// the account shell streams instantly while session-bound reads resolve.
// Server Component by default — no "use client", no params, no data fetch.
export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section
        className="mx-auto max-w-5xl px-4 py-6"
        aria-busy="true"
        aria-label="Loading your account"
      >
        <h1 className="text-2xl font-black">Your account</h1>
        <p className="mt-1 text-xs text-slate-400">Your saves, coins, and settings live here.</p>
        <div className="mt-4 animate-pulse space-y-3">
          <div className="h-5 w-40 rounded bg-white/10" />
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="h-24 rounded-xl border border-white/10 bg-white/[.04]" />
            <div className="h-24 rounded-xl border border-white/10 bg-white/[.04]" />
          </div>
        </div>
        <p role="status" className="mt-4 text-xs text-slate-400">
          Loading your account…
        </p>
      </section>
    </main>
  );
}
