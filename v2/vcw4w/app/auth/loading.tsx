// Segment streaming fallback for the auth group (login / sign-up /
// forgot-password / update-password). Server Component — no params.
export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section
        className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[.04] p-8"
        aria-busy="true"
        aria-label="Loading sign-in"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-7 w-40 rounded bg-white/10" />
          <div className="h-11 rounded-lg bg-white/10" />
          <div className="h-11 rounded-lg bg-white/10" />
          <div className="h-11 rounded-full bg-cyan-300/20" />
        </div>
        <p role="status" className="mt-6 text-center text-sm text-slate-400">
          Loading sign-in…
        </p>
      </section>
    </main>
  );
}
