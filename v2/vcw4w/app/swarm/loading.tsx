export default function SwarmLoading() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-800" />
        <div className="mt-6 h-4 w-48 animate-pulse rounded bg-slate-800" />
        <div className="mt-2 h-10 w-2/3 animate-pulse rounded bg-slate-800" />
        <div className="mt-6 h-16 animate-pulse rounded-2xl bg-slate-800/60" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="h-96 animate-pulse rounded-2xl bg-slate-800/40" />
          <div className="h-96 animate-pulse rounded-2xl bg-slate-800/40" />
        </div>
      </section>
    </main>
  );
}
