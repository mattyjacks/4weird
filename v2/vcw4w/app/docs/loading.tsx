// Segment streaming fallback for /docs/**. Sits below app/docs/layout.tsx
// (loading.js wraps page + nested layouts, not the same-segment layout),
// so the docs sidebar stays interactive while the article streams.
export default function Loading() {
  return (
    <article aria-busy="true" aria-label="Loading docs article" className="min-w-0">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-2/3 rounded bg-white/10" />
        <div className="h-4 w-full rounded bg-white/[.07]" />
        <div className="h-4 w-full rounded bg-white/[.07]" />
        <div className="h-4 w-5/6 rounded bg-white/[.07]" />
        <div className="h-40 rounded-2xl border border-white/10 bg-white/[.04]" />
        <div className="h-4 w-full rounded bg-white/[.07]" />
        <div className="h-4 w-4/6 rounded bg-white/[.07]" />
      </div>
      <p role="status" className="mt-6 text-sm text-slate-400">
        Loading article…
      </p>
    </article>
  );
}
