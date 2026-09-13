// Route-transition skeleton shell (DS-SPEED-02).
// Server Component by default: no hooks, no data fetch, no dynamic APIs,
// so the PPR shell prerenders instantly and streams real content over it.
export default function Loading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto w-full max-w-6xl flex-1 px-6 py-10"
    >
      <p
        role="status"
        className="mb-6 inline-block rounded-full border border-cyan-300/30 px-5 py-2 text-sm text-cyan-200"
      >
        Loading 4weird…
      </p>
      {/* Decorative skeleton mirror of the page shell; hidden from AT. */}
      <div aria-hidden="true" className="animate-pulse space-y-6">
        <div className="space-y-3">
          <div className="h-8 w-2/3 rounded-lg bg-white/10" />
          <div className="h-4 w-1/2 rounded bg-white/10" />
        </div>
        <div className="h-40 rounded-2xl border border-white/10 bg-white/5" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-28 rounded-2xl border border-white/10 bg-white/5" />
          <div className="h-28 rounded-2xl border border-white/10 bg-white/5" />
          <div className="h-28 rounded-2xl border border-white/10 bg-white/5" />
        </div>
      </div>
    </main>
  );
}
