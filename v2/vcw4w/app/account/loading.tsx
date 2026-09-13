// Segment streaming fallback: wraps page.js + nested layouts in Suspense so
// the account shell streams instantly while session-bound reads resolve.
// Server Component by default — no "use client", no params, no data fetch.
export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section
        className="mx-auto max-w-4xl px-5 py-20"
        aria-busy="true"
        aria-label="Loading your account"
      >
        <h1 className="text-4xl font-black">Your account</h1>
        <p className="mt-4 text-slate-300">Your saves, coins, and settings live here.</p>
        <div className="mt-10 animate-pulse space-y-8">
          <div className="h-6 w-48 rounded bg-white/10" />
          <div className="h-40 rounded-2xl border border-white/10 bg-white/[.04]" />
          <div className="h-40 rounded-2xl border border-white/10 bg-white/[.04]" />
        </div>
        <p role="status" className="mt-6 text-sm text-slate-400">
          Loading your account…
        </p>
      </section>
    </main>
  );
}
