"use client";
import Link from "next/link";
// Segment error boundary (DS-SPEED-02). Must stay a Client Component per
// Next docs, and must never render error.message/stack/digest (server errors
// forward a generic message in production to avoid leaking internals — the
// digest matches server logs). Static panel only: no hooks, no data fetch,
// so it renders instantly over the prerendered shell. Uses the stable
// `retry` prop (Next 16.3+) with a `reset` fallback for older runtimes.
export default function GlobalError({ retry, reset }: { error: Error & { digest?: string }; retry?: () => void; reset?: () => void }) {
  const recover = retry ?? reset;
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <div
        role="alert"
        className="w-full rounded-2xl border border-white/10 bg-white/5 p-8"
      >
        <h1 className="text-3xl font-black">Something went sideways</h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-300">
          The 4weird page could not finish loading. Your saved game data is
          preserved — give it another shot.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {recover ? (
            <button
              type="button"
              onClick={recover}
              className="rounded-full bg-cyan-300 px-6 py-3 font-bold text-slate-950"
            >
              Try again
            </button>
          ) : null}
          <Link
            href="/"
            className="rounded-full border border-white/20 px-6 py-3 font-semibold"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
