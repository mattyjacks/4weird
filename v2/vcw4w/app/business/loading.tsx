// Segment streaming fallback for /business/** (CRM, invoices).
// Server Component — no "use client", no params, no data fetch.
export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-16 text-white">
      <section aria-busy="true" aria-label="Loading business tools">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">4weird business</p>
        <h1 className="mt-2 text-4xl font-black">Loading…</h1>
        <div className="mt-8 animate-pulse space-y-3">
          <div className="h-28 rounded-2xl border border-white/10 bg-white/[.04]" />
          <div className="h-28 rounded-2xl border border-white/10 bg-white/[.04]" />
          <div className="h-28 rounded-2xl border border-white/10 bg-white/[.04]" />
        </div>
        <p role="status" className="mt-6 text-sm text-slate-400">
          Loading business tools…
        </p>
      </section>
    </main>
  );
}
